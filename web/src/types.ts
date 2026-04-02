export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  teamA: Position[];
  teamB: Position[];
  ball: Position;
}

export interface Step {
  duration: number;
  desc: string;
  teamA: Position[];
  teamB: Position[];
  ball: Position;
  pass?: [number, number];
}

export interface Tactic {
  name: string;
  steps: Step[];
}

export interface Overlay {
  name: string;
  desc: string;
}

export interface Stroke {
  points: Position[];
  color: string;
}

export interface PassAnim {
  from: Position;
  to: Position;
  progress: number;
}

export interface AnimState {
  running: boolean;
  frameId: number | null;
  tactic: Tactic | null;
  stepIndex: number;
  stepStartTime: number;
  prevStep: Step | null;
  nextStep: Step | null;
  passAnim: PassAnim | null;
}

export interface Layout {
  W: number;
  H: number;
  courtW: number;
  courtH: number;
  courtX: number;
  courtY: number;
  scale: number;
}

export interface HitResult {
  type: 'ball' | 'teamA' | 'teamB';
  index: number;
}

export interface CourtCanvasHandle {
  draw: () => void;
  getCanvas: () => HTMLCanvasElement | null;
}
