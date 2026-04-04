import { Tactic, GameState, Stroke, Arrow } from '../types';

const PREFIX = 'basketball-board:';
const VERSION = 1;

interface BoardState {
  version: number;
  gameState: GameState;
  strokes: Stroke[];
  arrows: Arrow[];
}

interface SavedTacticEntry {
  version: number;
  tactic: Tactic;
  savedAt: number;
}

// --- Board state auto-save ---

export function saveBoardState(gameState: GameState, strokes: Stroke[], arrows: Arrow[]): void {
  try {
    const data: BoardState = { version: VERSION, gameState, strokes, arrows };
    localStorage.setItem(PREFIX + 'boardState', JSON.stringify(data));
  } catch {}
}

export function loadBoardState(): BoardState | null {
  try {
    const raw = localStorage.getItem(PREFIX + 'boardState');
    if (!raw) return null;
    const data = JSON.parse(raw) as BoardState;
    if (!data.gameState || !data.gameState.teamA) return null;
    return data;
  } catch {
    return null;
  }
}

// --- Custom tactics ---

function tacticsKey(): string {
  return PREFIX + 'customTactics';
}

function loadTacticsMap(): Record<string, SavedTacticEntry> {
  try {
    const raw = localStorage.getItem(tacticsKey());
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function persistTacticsMap(map: Record<string, SavedTacticEntry>): void {
  try {
    localStorage.setItem(tacticsKey(), JSON.stringify(map));
  } catch {}
}

export function saveCustomTactic(tactic: Tactic): void {
  const map = loadTacticsMap();
  map[tactic.name] = { version: VERSION, tactic: { ...tactic, isCustom: true }, savedAt: Date.now() };
  persistTacticsMap(map);
}

export function loadCustomTactics(): Tactic[] {
  const map = loadTacticsMap();
  return Object.values(map)
    .sort((a, b) => a.savedAt - b.savedAt)
    .map(e => e.tactic);
}

export function deleteCustomTactic(name: string): void {
  const map = loadTacticsMap();
  delete map[name];
  persistTacticsMap(map);
}

export function renameCustomTactic(oldName: string, newName: string): void {
  const map = loadTacticsMap();
  const entry = map[oldName];
  if (!entry) return;
  delete map[oldName];
  entry.tactic.name = newName;
  map[newName] = entry;
  persistTacticsMap(map);
}

// --- Debounce ---

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}
