import { useState, useRef, useCallback, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import CourtCanvas from './components/CourtCanvas';
import { useTacticAnimation } from './hooks/useTacticAnimation';
import { tactics, defaultPositions } from './data/tactics';
import { GameState, Overlay, Stroke, Arrow, CourtCanvasHandle, ToolMode, LineStyle, Tactic, Step, UndoEntry } from './types';
import { saveBoardState, loadBoardState, saveCustomTactic, loadCustomTactics, deleteCustomTactic, debounce } from './utils/storage';

export default function App() {
  const [penColor, setPenColor] = useState<string>('#ffffff');
  const [toolMode, setToolMode] = useState<ToolMode>('pen');
  const [lineStyle, setLineStyle] = useState<LineStyle>('solid');
  const [selectedTactic, setSelectedTactic] = useState<string>('');
  const [overlay, setOverlay] = useState<Overlay>({ name: '', desc: '' });
  const [customTactics, setCustomTactics] = useState<Tactic[]>([]);

  const [halfCourt, setHalfCourt] = useState<boolean>(false);

  // Edit mode state
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editSteps, setEditSteps] = useState<Step[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [tacticName, setTacticName] = useState<string>('');
  const [stepDesc, setStepDesc] = useState<string>('');
  const [showStepInput, setShowStepInput] = useState<boolean>(false);
  // Temp snapshot for step recording
  const pendingStepRef = useRef<Step | null>(null);

  const stateRef = useRef<GameState>(defaultPositions());
  const drawingsRef = useRef<Stroke[]>([]);
  const arrowsRef = useRef<Arrow[]>([]);
  const undoStackRef = useRef<UndoEntry[]>([]);
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

  const [animSpeed, setAnimSpeed] = useState<number>(1);
  const { start, stop, animRef, speedRef } = useTacticAnimation(stateRef, setOverlay, requestDraw);

  const handleSpeedChange = useCallback((speed: number) => {
    setAnimSpeed(speed);
    speedRef.current = speed;
  }, [speedRef]);

  const [, setDrawTick] = useState<number>(0);
  const onDrawingsChange = useCallback(() => {
    setDrawTick(t => t + 1);
    autoSave();
  }, [autoSave]);

  const handleUndo = useCallback(() => {
    const entry = undoStackRef.current.pop();
    if (!entry) return;
    if (entry.kind === 'arrow') {
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
    undoStackRef.current = [];
    onDrawingsChange();
    requestDraw();
  }, [requestDraw, onDrawingsChange]);

  const handleReset = useCallback(() => {
    stop();
    stateRef.current = defaultPositions();
    drawingsRef.current = [];
    arrowsRef.current = [];
    undoStackRef.current = [];
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
    const step: Step = {
      duration: editSteps.length === 0 ? 0 : 1000,
      desc: '',
      teamA: s.teamA.map(p => ({ ...p })),
      teamB: s.teamB.map(p => ({ ...p })),
      ball: { ...s.ball },
    };

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

    pendingStepRef.current = step;
    setStepDesc('');
    setShowStepInput(true);
  }, [editSteps]);

  const handleConfirmStep = useCallback(() => {
    if (!pendingStepRef.current) return;
    pendingStepRef.current.desc = stepDesc;
    setEditSteps(prev => [...prev, pendingStepRef.current!]);
    pendingStepRef.current = null;
    setShowStepInput(false);
    setStepDesc('');
  }, [stepDesc]);

  const handleSaveTactic = useCallback(() => {
    if (editSteps.length < 2) return;
    setTacticName('');
    setShowSaveDialog(true);
  }, [editSteps]);

  const handleDeleteTactic = useCallback(() => {
    if (!selectedTactic.startsWith('custom-')) return;
    const idx = parseInt(selectedTactic.split('-')[1]);
    const tactic = customTactics[idx];
    if (!tactic) return;
    deleteCustomTactic(tactic.name);
    setCustomTactics(loadCustomTactics());
    setSelectedTactic('');
  }, [selectedTactic, customTactics]);

  const handleConfirmSave = useCallback(() => {
    if (!tacticName.trim()) return;
    const tactic: Tactic = { name: tacticName.trim(), steps: editSteps, isCustom: true };
    saveCustomTactic(tactic);
    setCustomTactics(loadCustomTactics());
    setEditSteps([]);
    setEditMode(false);
    setShowSaveDialog(false);
    setTacticName('');
  }, [tacticName, editSteps]);

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
        halfCourt={halfCourt}
        onToggleHalfCourt={() => setHalfCourt(h => !h)}
        animSpeed={animSpeed}
        onSpeedChange={handleSpeedChange}
        onDeleteTactic={handleDeleteTactic}
        canDeleteTactic={selectedTactic.startsWith('custom-')}
      />
      {showStepInput && (
        <div className="inline-dialog">
          <input
            autoFocus
            placeholder="步骤描述（可选，回车确认）"
            value={stepDesc}
            onChange={e => setStepDesc(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirmStep(); if (e.key === 'Escape') { setShowStepInput(false); pendingStepRef.current = null; } }}
          />
          <button onClick={handleConfirmStep}>确认</button>
          <button onClick={() => { setShowStepInput(false); pendingStepRef.current = null; }}>取消</button>
        </div>
      )}
      {showSaveDialog && (
        <div className="inline-dialog">
          <input
            autoFocus
            placeholder="输入战术名称"
            value={tacticName}
            onChange={e => setTacticName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirmSave(); if (e.key === 'Escape') setShowSaveDialog(false); }}
          />
          <button onClick={handleConfirmSave} disabled={!tacticName.trim()}>保存</button>
          <button onClick={() => setShowSaveDialog(false)}>取消</button>
        </div>
      )}
      <CourtCanvas
        ref={canvasRef}
        stateRef={stateRef}
        animRef={animRef}
        overlay={overlay}
        penColor={penColor}
        toolMode={toolMode}
        lineStyle={lineStyle}
        halfCourt={halfCourt}
        drawingsRef={drawingsRef}
        arrowsRef={arrowsRef}
        undoStackRef={undoStackRef}
        onDrawingsChange={onDrawingsChange}
      />
    </div>
  );
}
