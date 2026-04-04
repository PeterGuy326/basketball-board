import { useState, useRef, useCallback, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import CourtCanvas from './components/CourtCanvas';
import { useTacticAnimation } from './hooks/useTacticAnimation';
import { tactics, defaultPositions } from './data/tactics';
import { GameState, Overlay, Stroke, Arrow, CourtCanvasHandle, ToolMode, LineStyle, Tactic, Step } from './types';
import { saveBoardState, loadBoardState, saveCustomTactic, loadCustomTactics, debounce } from './utils/storage';

export default function App() {
  const [penColor, setPenColor] = useState<string>('#ffffff');
  const [toolMode, setToolMode] = useState<ToolMode>('pen');
  const [lineStyle, setLineStyle] = useState<LineStyle>('solid');
  const [selectedTactic, setSelectedTactic] = useState<string>('');
  const [overlay, setOverlay] = useState<Overlay>({ name: '', desc: '' });
  const [customTactics, setCustomTactics] = useState<Tactic[]>([]);

  // Edit mode state
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editSteps, setEditSteps] = useState<Step[]>([]);

  const stateRef = useRef<GameState>(defaultPositions());
  const drawingsRef = useRef<Stroke[]>([]);
  const arrowsRef = useRef<Arrow[]>([]);
  const canvasRef = useRef<CourtCanvasHandle>(null);

  // Load saved data on mount
  useEffect(() => {
    const saved = loadBoardState();
    if (saved) {
      stateRef.current = saved.gameState;
      drawingsRef.current = saved.strokes || [];
      arrowsRef.current = saved.arrows || [];
    }
    setCustomTactics(loadCustomTactics());
  }, []);

  const requestDraw = useCallback(() => {
    canvasRef.current?.draw();
  }, []);

  // Auto-save with debounce
  const autoSave = useCallback(
    debounce(() => {
      saveBoardState(stateRef.current, drawingsRef.current, arrowsRef.current);
    }, 500),
    [],
  );

  const { start, stop, animRef } = useTacticAnimation(stateRef, setOverlay, requestDraw);

  const [, setDrawTick] = useState<number>(0);
  const onDrawingsChange = useCallback(() => {
    setDrawTick(t => t + 1);
    autoSave();
  }, [autoSave]);

  const handleUndo = useCallback(() => {
    // Undo arrows first if any, then strokes
    if (arrowsRef.current.length > 0) {
      arrowsRef.current = arrowsRef.current.slice(0, -1);
    } else {
      drawingsRef.current = drawingsRef.current.slice(0, -1);
    }
    onDrawingsChange();
    requestDraw();
  }, [requestDraw, onDrawingsChange]);

  const handleClear = useCallback(() => {
    drawingsRef.current = [];
    arrowsRef.current = [];
    onDrawingsChange();
    requestDraw();
  }, [requestDraw, onDrawingsChange]);

  const handleReset = useCallback(() => {
    stop();
    stateRef.current = defaultPositions();
    drawingsRef.current = [];
    arrowsRef.current = [];
    setSelectedTactic('');
    setEditMode(false);
    setEditSteps([]);
    onDrawingsChange();
    requestDraw();
  }, [stop, requestDraw, onDrawingsChange]);

  const handlePlay = useCallback(() => {
    if (selectedTactic === '') return;
    drawingsRef.current = [];
    arrowsRef.current = [];
    onDrawingsChange();

    const [type, indexStr] = selectedTactic.split('-');
    const idx = parseInt(indexStr);
    if (type === 'preset') {
      start(tactics[idx]);
    } else if (type === 'custom') {
      start(customTactics[idx]);
    }
  }, [selectedTactic, start, onDrawingsChange, customTactics]);

  const handleStop = useCallback(() => {
    stop();
    stateRef.current = defaultPositions();
    setSelectedTactic('');
    requestDraw();
  }, [stop, requestDraw]);

  const handleScreenshot = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'tactic-' + Date.now() + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }, []);

  // --- Edit mode handlers ---
  const handleToggleEditMode = useCallback(() => {
    if (editMode) {
      // Exiting edit mode, discard unsaved steps
      setEditSteps([]);
    }
    setEditMode(m => !m);
  }, [editMode]);

  const handleRecordStep = useCallback(() => {
    const s = stateRef.current;
    const desc = prompt('输入步骤描述（可选）：') || '';
    const step: Step = {
      duration: editSteps.length === 0 ? 0 : 1000,
      desc,
      teamA: s.teamA.map(p => ({ ...p })),
      teamB: s.teamB.map(p => ({ ...p })),
      ball: { ...s.ball },
    };

    // If this is not the first step, try to detect pass
    if (editSteps.length > 0) {
      const prevStep = editSteps[editSteps.length - 1];
      const prevBallHolder = prevStep.teamA.findIndex(
        p => Math.hypot(p.x - prevStep.ball.x, p.y - prevStep.ball.y) < 1
      );
      const currBallHolder = step.teamA.findIndex(
        p => Math.hypot(p.x - step.ball.x, p.y - step.ball.y) < 1
      );
      if (prevBallHolder >= 0 && currBallHolder >= 0 && prevBallHolder !== currBallHolder) {
        step.pass = [prevBallHolder, currBallHolder];
      }
    }

    setEditSteps(prev => [...prev, step]);
  }, [editSteps]);

  const handleSaveTactic = useCallback(() => {
    if (editSteps.length < 2) return;
    const name = prompt('输入战术名称：');
    if (!name || !name.trim()) return;
    const tactic: Tactic = { name: name.trim(), steps: editSteps, isCustom: true };
    saveCustomTactic(tactic);
    setCustomTactics(loadCustomTactics());
    setEditSteps([]);
    setEditMode(false);
    alert(`战术「${name.trim()}」已保存！`);
  }, [editSteps]);

  return (
    <div className="app">
      <Toolbar
        penColor={penColor}
        setPenColor={setPenColor}
        toolMode={toolMode}
        setToolMode={setToolMode}
        lineStyle={lineStyle}
        setLineStyle={setLineStyle}
        onUndo={handleUndo}
        onClear={handleClear}
        onReset={handleReset}
        onPlay={handlePlay}
        onStop={handleStop}
        onScreenshot={handleScreenshot}
        selectedTactic={selectedTactic}
        setSelectedTactic={setSelectedTactic}
        customTactics={customTactics}
        editMode={editMode}
        onToggleEditMode={handleToggleEditMode}
        onRecordStep={handleRecordStep}
        onSaveTactic={handleSaveTactic}
        editStepCount={editSteps.length}
      />
      <CourtCanvas
        ref={canvasRef}
        stateRef={stateRef}
        animRef={animRef}
        overlay={overlay}
        penColor={penColor}
        toolMode={toolMode}
        lineStyle={lineStyle}
        drawingsRef={drawingsRef}
        arrowsRef={arrowsRef}
        onDrawingsChange={onDrawingsChange}
      />
    </div>
  );
}
