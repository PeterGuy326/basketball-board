import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, MutableRefObject, MouseEvent, TouchEvent } from 'react';
import { calcLayout, canvasToCourt, PLAYER_R, BALL_R } from '../utils/court';
import { drawCourt, drawPlayer, drawBall, drawStrokes, drawPassTrail, drawTacticOverlay } from '../utils/draw';
import { GameState, Overlay, Stroke, AnimState, Layout, HitResult, CourtCanvasHandle } from '../types';

interface CourtCanvasProps {
  stateRef: MutableRefObject<GameState>;
  animRef: MutableRefObject<AnimState>;
  overlay: Overlay;
  penColor: string;
  drawingsRef: MutableRefObject<Stroke[]>;
  onDrawingsChange: () => void;
}

const CourtCanvas = forwardRef<CourtCanvasHandle, CourtCanvasProps>(function CourtCanvas(
  { stateRef, animRef, overlay, penColor, drawingsRef, onDrawingsChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<Layout | null>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const draggingRef = useRef<HitResult | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { W, H } = layout;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0e0e0e';
    ctx.fillRect(0, 0, W, H);

    drawCourt(ctx, layout);
    drawStrokes(ctx, drawingsRef.current, currentStrokeRef.current);

    const pa = animRef.current.passAnim;
    drawPassTrail(ctx, layout, pa);

    const s = stateRef.current;
    for (let i = 0; i < 5; i++) drawPlayer(ctx, layout, 'teamA', i, s.teamA[i]);
    for (let i = 0; i < 5; i++) drawPlayer(ctx, layout, 'teamB', i, s.teamB[i]);
    drawBall(ctx, layout, s.ball);
    drawTacticOverlay(ctx, layout, overlay.name, overlay.desc);
  }, [stateRef, animRef, overlay, drawingsRef]);

  useImperativeHandle(ref, () => ({
    draw,
    getCanvas: () => canvasRef.current,
  }), [draw]);

  const resize = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ww = wrap.clientWidth, wh = wrap.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    const layout = calcLayout(ww, wh);
    canvas.style.width = layout.W + 'px';
    canvas.style.height = layout.H + 'px';
    canvas.width = layout.W * dpr;
    canvas.height = layout.H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutRef.current = layout;
    draw();
  }, [draw]);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  // redraw when overlay changes
  useEffect(() => { draw(); }, [overlay, draw]);

  const hitTest = useCallback((px: number, py: number): HitResult | null => {
    const layout = layoutRef.current;
    if (!layout) return null;
    const { x, y } = canvasToCourt(layout, px, py);
    const s = stateRef.current;
    if (Math.hypot(x - s.ball.x, y - s.ball.y) < BALL_R * 1.5) return { type: 'ball', index: 0 };
    for (let i = 0; i < 5; i++) if (Math.hypot(x - s.teamA[i].x, y - s.teamA[i].y) < PLAYER_R * 1.3) return { type: 'teamA', index: i };
    for (let i = 0; i < 5; i++) if (Math.hypot(x - s.teamB[i].x, y - s.teamB[i].y) < PLAYER_R * 1.3) return { type: 'teamB', index: i };
    return null;
  }, [stateRef]);

  const getPos = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } => {
    const r = canvasRef.current!.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    }
    const me = e as MouseEvent;
    return { x: me.clientX - r.left, y: me.clientY - r.top };
  }, []);

  const onDown = useCallback((e: MouseEvent | TouchEvent) => {
    if (animRef.current.running) return;
    e.preventDefault();
    const p = getPos(e);
    const hit = hitTest(p.x, p.y);
    if (hit) draggingRef.current = hit;
    else currentStrokeRef.current = { points: [p], color: penColor };
  }, [animRef, getPos, hitTest, penColor]);

  const onMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (animRef.current.running) return;
    e.preventDefault();
    const p = getPos(e);
    if (draggingRef.current) {
      const layout = layoutRef.current;
      if (!layout) return;
      const m = canvasToCourt(layout, p.x, p.y);
      m.x = Math.max(0, Math.min(28, m.x));
      m.y = Math.max(0, Math.min(15, m.y));
      const s = stateRef.current;
      if (draggingRef.current.type === 'ball') {
        s.ball.x = m.x; s.ball.y = m.y;
      } else {
        s[draggingRef.current.type][draggingRef.current.index].x = m.x;
        s[draggingRef.current.type][draggingRef.current.index].y = m.y;
      }
      draw();
    } else if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(p);
      draw();
    }
  }, [animRef, getPos, stateRef, draw]);

  const onUp = useCallback(() => {
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
      drawingsRef.current = [...drawingsRef.current, currentStrokeRef.current];
      onDrawingsChange();
    }
    currentStrokeRef.current = null;
    draggingRef.current = null;
  }, [drawingsRef, onDrawingsChange]);

  return (
    <div ref={wrapRef} className="canvas-wrap">
      <canvas
        ref={canvasRef}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
        onTouchCancel={onUp}
      />
    </div>
  );
});

export default CourtCanvas;
