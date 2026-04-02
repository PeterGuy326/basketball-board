import {
  BASKET_DIST, BOARD_DIST, TP_RADIUS, TP_CORNER, PAINT_L, PAINT_W,
  FT_RADIUS, CENTER_R, RA_RADIUS, LINE_COLOR, PAINT_FILL,
  PLAYER_R, BALL_R, courtToCanvas,
} from './court';
import { Layout, Position, Stroke, PassAnim } from '../types';

function m2px(layout: Layout, m: number): number { return m * layout.scale; }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawHalf(ctx: CanvasRenderingContext2D, layout: Layout, right: boolean): void {
  const { courtX, courtW, courtH, courtY, scale } = layout;
  const midY = courtY + courtH / 2;
  const basketX = right ? courtX + courtW - m2px(layout, BASKET_DIST) : courtX + m2px(layout, BASKET_DIST);
  const baseX = right ? courtX + courtW : courtX;
  const inward = right ? -1 : 1;

  ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = 2;
  const tpR = m2px(layout, TP_RADIUS), cornerDist = m2px(layout, TP_CORNER);
  const cornerY_top = courtY + cornerDist, cornerY_bot = courtY + courtH - cornerDist;
  const sinA = (7.5 - TP_CORNER) / TP_RADIUS, cosA = Math.sqrt(1 - sinA * sinA), A = Math.asin(sinA);
  const arcEndX = basketX + inward * cosA * tpR;

  ctx.beginPath(); ctx.moveTo(baseX, cornerY_top); ctx.lineTo(arcEndX, cornerY_top); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(baseX, cornerY_bot); ctx.lineTo(arcEndX, cornerY_bot); ctx.stroke();

  ctx.beginPath();
  if (right) ctx.arc(basketX, midY, tpR, Math.PI - A, Math.PI + A);
  else ctx.arc(basketX, midY, tpR, -A, A);
  ctx.stroke();

  const paintPx = m2px(layout, PAINT_L), paintHPx = m2px(layout, PAINT_W);
  ctx.strokeRect(right ? baseX - paintPx : baseX, midY - paintHPx / 2, paintPx, paintHPx);

  const ftX = right ? baseX - paintPx : baseX + paintPx;
  ctx.beginPath(); ctx.arc(ftX, midY, m2px(layout, FT_RADIUS), 0, Math.PI * 2); ctx.stroke();

  const raR = m2px(layout, RA_RADIUS);
  ctx.beginPath();
  if (right) ctx.arc(basketX, midY, raR, Math.PI * 0.5, Math.PI * 1.5);
  else ctx.arc(basketX, midY, raR, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();

  ctx.beginPath(); ctx.moveTo(basketX, midY - raR); ctx.lineTo(baseX, midY - raR); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(basketX, midY + raR); ctx.lineTo(baseX, midY + raR); ctx.stroke();

  const bbX = right ? baseX - m2px(layout, BOARD_DIST) : baseX + m2px(layout, BOARD_DIST);
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(bbX, midY - m2px(layout, 0.9)); ctx.lineTo(bbX, midY + m2px(layout, 0.9)); ctx.stroke();
  ctx.lineWidth = 2;

  // rim
  ctx.beginPath(); ctx.arc(basketX, midY, m2px(layout, 0.225), 0, Math.PI * 2);
  ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(basketX, midY, m2px(layout, 0.12), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
  ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = 2;
}

export function drawCourt(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const { courtX, courtY, courtW, courtH } = layout;
  const midX = courtX + courtW / 2, midY = courtY + courtH / 2;

  // wood floor
  const floorA = '#c8955a', floorB = '#c08e52';
  for (let i = 0; i < courtW; i += 28) {
    ctx.fillStyle = (Math.floor(i / 28) % 2 === 0) ? floorA : floorB;
    ctx.fillRect(courtX + i, courtY, 28, courtH);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 1;
  for (let i = 0; i < courtW; i += 10) {
    ctx.beginPath(); ctx.moveTo(courtX + i, courtY); ctx.lineTo(courtX + i, courtY + courtH); ctx.stroke();
  }

  // paint fill
  const paintPx = m2px(layout, PAINT_L), paintHPx = m2px(layout, PAINT_W);
  ctx.fillStyle = PAINT_FILL;
  ctx.fillRect(courtX, midY - paintHPx / 2, paintPx, paintHPx);
  ctx.fillRect(courtX + courtW - paintPx, midY - paintHPx / 2, paintPx, paintHPx);

  // outer lines
  ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.strokeRect(courtX, courtY, courtW, courtH);
  ctx.beginPath(); ctx.moveTo(midX, courtY); ctx.lineTo(midX, courtY + courtH); ctx.stroke();
  ctx.beginPath(); ctx.arc(midX, midY, m2px(layout, CENTER_R), 0, Math.PI * 2); ctx.stroke();

  drawHalf(ctx, layout, false);
  drawHalf(ctx, layout, true);
}

export function drawPlayer(ctx: CanvasRenderingContext2D, layout: Layout, team: string, index: number, pos: Position): void {
  const { x, y } = courtToCanvas(layout, pos.x, pos.y);
  const r = PLAYER_R * layout.scale;
  const isA = team === 'teamA';

  // shadow
  ctx.beginPath(); ctx.arc(x + 1.5, y + 2, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();

  // body
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  if (isA) { g.addColorStop(0, '#ff6b6b'); g.addColorStop(1, '#c0392b'); }
  else { g.addColorStop(0, '#74b9ff'); g.addColorStop(1, '#2d6dbf'); }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();

  // number
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${r * 1.05}px -apple-system, "SF Pro", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(index + 1), x, y + 0.5);
}

export function drawBall(ctx: CanvasRenderingContext2D, layout: Layout, pos: Position): void {
  const { x, y } = courtToCanvas(layout, pos.x, pos.y);
  const r = BALL_R * layout.scale;

  ctx.beginPath(); ctx.arc(x + 1, y + 1.5, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();

  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, '#f5a623'); g.addColorStop(1, '#d4800e');
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

  ctx.strokeStyle = 'rgba(120,60,0,0.4)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
}

export function drawStrokes(ctx: CanvasRenderingContext2D, drawings: Stroke[], currentStroke: Stroke | null): void {
  const all = currentStroke ? [...drawings, currentStroke] : drawings;
  for (const s of all) {
    if (s.points.length < 2) continue;
    ctx.beginPath(); ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.strokeStyle = s.color; ctx.lineWidth = 3;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
}

export function drawPassTrail(ctx: CanvasRenderingContext2D, layout: Layout, passAnim: PassAnim | null): void {
  if (!passAnim || passAnim.progress <= 0) return;
  const from = courtToCanvas(layout, passAnim.from.x, passAnim.from.y);
  const to = courtToCanvas(layout, passAnim.to.x, passAnim.to.y);
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = 'rgba(255,200,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawTacticOverlay(ctx: CanvasRenderingContext2D, layout: Layout, tacticName: string, tacticDesc: string): void {
  if (!tacticName) return;
  const { courtX, courtY, courtW, courtH, scale } = layout;

  // name - top right
  ctx.save();
  const fontSize = Math.max(16, scale * 0.8);
  ctx.font = `bold ${fontSize}px -apple-system, "SF Pro", sans-serif`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  const nameX = courtX + courtW - 8, nameY = courtY + 8;
  const nm = ctx.measureText(tacticName);
  const pad = 8;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  roundRect(ctx, nameX - nm.width - pad, nameY - pad + 2, nm.width + pad * 2, fontSize + pad * 2, 6);
  ctx.fill();
  ctx.fillStyle = '#ffcc00';
  ctx.fillText(tacticName, nameX, nameY);
  ctx.restore();

  // step desc - bottom center
  if (tacticDesc) {
    ctx.save();
    const descFontSize = Math.max(13, scale * 0.6);
    ctx.font = `${descFontSize}px -apple-system, "SF Pro", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const descX = courtX + courtW / 2, descY = courtY + courtH - 10;
    const dm = ctx.measureText(tacticDesc);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, descX - dm.width / 2 - 10, descY - descFontSize - 6, dm.width + 20, descFontSize + 12, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(tacticDesc, descX, descY);
    ctx.restore();
  }
}
