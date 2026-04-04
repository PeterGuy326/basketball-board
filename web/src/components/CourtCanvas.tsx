import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, MutableRefObject, MouseEvent, TouchEvent } from 'react';
import { calcLayout, courtToCanvas, canvasToCourt, PLAYER_R, BALL_R } from '../utils/court';
import { drawCourt, drawPlayer, drawBall, drawStrokes, drawArrows, drawPassTrail, drawMovementTrails, drawTacticOverlay } from '../utils/draw';
import { GameState, Overlay, Stroke, Arrow, AnimState, Layout, HitResult, CourtCanvasHandle, ToolMode, LineStyle, UndoEntry } from '../types';

interface CourtCanvasProps {
  stateRef: MutableRefObject<GameState>;
  animRef: MutableRefObject<AnimState>;
  overlay: Overlay;
  penColor: string;
  toolMode: ToolMode;
  lineStyle: LineStyle;
  halfCourt: boolean;
  drawingsRef: MutableRefObject<Stroke[]>;
  arrowsRef: MutableRefObject<Arrow[]>;
  undoStackRef: MutableRefObject<UndoEntry[]>;
  onDrawingsChange: () => void;
}

const CourtCanvas = forwardRef<CourtCanvasHandle, CourtCanvasProps>(function CourtCanvas(
  { stateRef, animRef, overlay, penColor, toolMode, lineStyle, halfCourt, drawingsRef, arrowsRef, undoStackRef, onDrawingsChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<Layout | null>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const currentArrowRef = useRef<Arrow | null>(null);
  const draggingRef = useRef<HitResult | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // For curved arrows: phase 0 = drawing line, phase 1 = adjusting control point
  const curvedPhaseRef = useRef<number>(0);
  const hoverRef = useRef<HitResult | null>(null);

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
    drawArrows(ctx, arrowsRef.current, currentArrowRef.current);

    const anim = animRef.current;
    const pa = anim.passAnim;

    // Draw movement trails during animation (lines appear under players)
    if (anim.running && anim.prevStep && anim.nextStep) {
      const elapsed = performance.now() - anim.stepStartTime;
      const duration = anim.nextStep.duration || 1000;
      const t = Math.max(0, Math.min(1, elapsed / duration));
      drawMovementTrails(ctx, layout, anim.prevStep, anim.nextStep, t, pa);
    }

    drawPassTrail(ctx, layout, pa);

    const s = stateRef.current;
    for (let i = 0; i < 5; i++) drawPlayer(ctx, layout, 'teamA', i, s.teamA[i]);
    for (let i = 0; i < 5; i++) drawPlayer(ctx, layout, 'teamB', i, s.teamB[i]);
    drawBall(ctx, layout, s.ball);

    // Hover highlight ring
    const h = hoverRef.current;
    if (h && !anim.running) {
      const pos = h.type === 'ball' ? s.ball : s[h.type][h.index];
      const { x, y } = courtToCanvas(layout, pos.x, pos.y);
      const r = (h.type === 'ball' ? BALL_R : PLAYER_R) * layout.scale;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawTacticOverlay(ctx, layout, overlay.name, overlay.desc);
  }, [stateRef, animRef, overlay, drawingsRef, arrowsRef]);

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
    const layout = calcLayout(ww, wh, halfCourt);
    canvas.style.width = layout.W + 'px';
    canvas.style.height = layout.H + 'px';
    canvas.width = layout.W * dpr;
    canvas.height = layout.H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutRef.current = layout;
    draw();
  }, [draw, halfCourt]);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  useEffect(() => { draw(); }, [overlay, draw]);

  const hitTest = useCallback((px: number, py: number): HitResult | null => {
    const layout = layoutRef.current;
    if (!layout) return null;
    const { x, y } = canvasToCourt(layout, px, py);
    const s = stateRef.current;
    // Larger hit area for touch (2x radius for ball, 1.8x for players)
    if (Math.hypot(x - s.ball.x, y - s.ball.y) < BALL_R * 2) return { type: 'ball', index: 0 };
    for (let i = 0; i < 5; i++) if (Math.hypot(x - s.teamA[i].x, y - s.teamA[i].y) < PLAYER_R * 1.8) return { type: 'teamA', index: i };
    for (let i = 0; i < 5; i++) if (Math.hypot(x - s.teamB[i].x, y - s.teamB[i].y) < PLAYER_R * 1.8) return { type: 'teamB', index: i };
    return null;
  }, [stateRef]);

  const getPos = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } => {
    const r = canvasRef.current!.getBoundingClientRect();
    if ('touches' in e) {
      const te = e as unknown as globalThis.TouchEvent;
      const touch = te.touches.length > 0 ? te.touches[0] : te.changedTouches[0];
      if (touch) return { x: touch.clientX - r.left, y: touch.clientY - r.top };
    }
    const me = e as MouseEvent;
    return { x: me.clientX - r.left, y: me.clientY - r.top };
  }, []);

  const onDown = useCallback((e: MouseEvent | TouchEvent) => {
    if (animRef.current.running) return;
    e.preventDefault();
    const p = getPos(e);

    // Curved arrow phase 1: clicking sets control point, finalize arrow
    if (toolMode === 'curvedArrow' && curvedPhaseRef.current === 1 && currentArrowRef.current) {
      currentArrowRef.current.controlPoint = { x: p.x, y: p.y };
      arrowsRef.current = [...arrowsRef.current, currentArrowRef.current];
      undoStackRef.current.push({ kind: 'arrow' });
      currentArrowRef.current = null;
      curvedPhaseRef.current = 0;
      onDrawingsChange();
      draw();
      return;
    }

    const hit = hitTest(p.x, p.y);
    if (hit) {
      draggingRef.current = hit;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      // Haptic feedback on touch devices
      if (navigator.vibrate) navigator.vibrate(10);
    } else if (toolMode === 'pen') {
      currentStrokeRef.current = { points: [p], color: penColor };
    } else {
      // Arrow tool: start drawing
      currentArrowRef.current = {
        start: { x: p.x, y: p.y },
        end: { x: p.x, y: p.y },
        color: penColor,
        lineStyle,
        type: toolMode === 'curvedArrow' ? 'curved' : 'straight',
      };
      if (toolMode === 'curvedArrow') {
        // Default control point at midpoint
        currentArrowRef.current.controlPoint = { x: p.x, y: p.y };
      }
      curvedPhaseRef.current = 0;
    }
  }, [animRef, getPos, hitTest, penColor, toolMode, lineStyle, arrowsRef, onDrawingsChange, draw]);

  const onMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (animRef.current.running) return;
    e.preventDefault();
    const p = getPos(e);

    // Hover detection (only when not dragging/drawing)
    if (!draggingRef.current && !currentStrokeRef.current && !currentArrowRef.current) {
      const hit = hitTest(p.x, p.y);
      const prev = hoverRef.current;
      if (hit?.type !== prev?.type || hit?.index !== prev?.index) {
        hoverRef.current = hit;
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = hit ? 'grab' : 'crosshair';
        draw();
      }
    }

    if (draggingRef.current) {
      const layout = layoutRef.current;
      if (!layout) return;
      const m = canvasToCourt(layout, p.x, p.y);
      const maxX = halfCourt ? 14 : 28;
      m.x = Math.max(0, Math.min(maxX, m.x));
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
    } else if (currentArrowRef.current) {
      if (toolMode === 'curvedArrow' && curvedPhaseRef.current === 1) {
        // Adjusting control point
        currentArrowRef.current.controlPoint = { x: p.x, y: p.y };
      } else {
        // Drawing the line
        currentArrowRef.current.end = { x: p.x, y: p.y };
        if (toolMode === 'curvedArrow') {
          // Auto control point at midpoint
          const s = currentArrowRef.current.start;
          const e = currentArrowRef.current.end;
          currentArrowRef.current.controlPoint = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
        }
      }
      draw();
    }
  }, [animRef, getPos, stateRef, draw, toolMode]);

  const onUp = useCallback(() => {
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
      drawingsRef.current = [...drawingsRef.current, currentStrokeRef.current];
      undoStackRef.current.push({ kind: 'stroke' });
      onDrawingsChange();
    }
    currentStrokeRef.current = null;
    draggingRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';

    if (currentArrowRef.current) {
      const a = currentArrowRef.current;
      const dist = Math.hypot(a.end.x - a.start.x, a.end.y - a.start.y);
      if (dist < 5) {
        currentArrowRef.current = null;
        curvedPhaseRef.current = 0;
        return;
      }

      if (toolMode === 'curvedArrow' && curvedPhaseRef.current === 0) {
        curvedPhaseRef.current = 1;
        return;
      }

      // Finalize straight arrow
      arrowsRef.current = [...arrowsRef.current, a];
      undoStackRef.current.push({ kind: 'arrow' });
      currentArrowRef.current = null;
      curvedPhaseRef.current = 0;
      onDrawingsChange();
    }
  }, [drawingsRef, arrowsRef, undoStackRef, onDrawingsChange, toolMode]);

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
