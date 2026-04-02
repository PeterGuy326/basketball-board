// FIBA court dimensions (meters)
export const COURT_M = { w: 28, h: 15 };
export const BASKET_DIST = 1.575;
export const BOARD_DIST = 1.2;
export const TP_RADIUS = 6.75;
export const TP_CORNER = 0.9;
export const PAINT_L = 5.8;
export const PAINT_W = 4.9;
export const FT_RADIUS = 1.8;
export const CENTER_R = 1.8;
export const RA_RADIUS = 1.25;

export const LINE_COLOR = 'rgba(255,255,255,0.82)';
export const PAINT_FILL = 'rgba(50,30,15,0.32)';
export const PLAYER_R = 0.44; // meters
export const BALL_R = 0.30;

export function calcLayout(containerW, containerH) {
  const aspect = COURT_M.w / COURT_M.h;
  const pad = 50;
  let cw, ch;
  if ((containerW - pad * 2) / (containerH - pad * 2) > aspect) {
    ch = containerH - pad * 2;
    cw = ch * aspect;
  } else {
    cw = containerW - pad * 2;
    ch = cw / aspect;
  }
  return {
    W: containerW,
    H: containerH,
    courtW: cw,
    courtH: ch,
    courtX: (containerW - cw) / 2,
    courtY: (containerH - ch) / 2,
    scale: cw / COURT_M.w,
  };
}

export function courtToCanvas(layout, mx, my) {
  return { x: layout.courtX + mx * layout.scale, y: layout.courtY + my * layout.scale };
}

export function canvasToCourt(layout, px, py) {
  return { x: (px - layout.courtX) / layout.scale, y: (py - layout.courtY) / layout.scale };
}
