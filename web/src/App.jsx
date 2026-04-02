import { useState, useRef, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import CourtCanvas from './components/CourtCanvas';
import { useTacticAnimation } from './hooks/useTacticAnimation';
import { tactics, defaultPositions } from './data/tactics';

export default function App() {
  const [penColor, setPenColor] = useState('#ffffff');
  const [selectedTactic, setSelectedTactic] = useState('');
  const [overlay, setOverlay] = useState({ name: '', desc: '' });
  const stateRef = useRef(defaultPositions());
  const drawingsRef = useRef([]);
  const canvasRef = useRef(null);

  const requestDraw = useCallback(() => {
    canvasRef.current?.draw();
  }, []);

  const { start, stop, animRef } = useTacticAnimation(stateRef, setOverlay, requestDraw);

  const [, setDrawTick] = useState(0);
  const onDrawingsChange = useCallback(() => setDrawTick(t => t + 1), []);

  const handleUndo = useCallback(() => {
    drawingsRef.current = drawingsRef.current.slice(0, -1);
    onDrawingsChange();
    requestDraw();
  }, [requestDraw, onDrawingsChange]);

  const handleClear = useCallback(() => {
    drawingsRef.current = [];
    onDrawingsChange();
    requestDraw();
  }, [requestDraw, onDrawingsChange]);

  const handleReset = useCallback(() => {
    stop();
    stateRef.current = defaultPositions();
    drawingsRef.current = [];
    setSelectedTactic('');
    onDrawingsChange();
    requestDraw();
  }, [stop, requestDraw, onDrawingsChange]);

  const handlePlay = useCallback(() => {
    if (selectedTactic === '') return;
    drawingsRef.current = [];
    onDrawingsChange();
    start(tactics[parseInt(selectedTactic)]);
  }, [selectedTactic, start, onDrawingsChange]);

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

  return (
    <div className="app">
      <Toolbar
        penColor={penColor}
        setPenColor={setPenColor}
        onUndo={handleUndo}
        onClear={handleClear}
        onReset={handleReset}
        onPlay={handlePlay}
        onStop={handleStop}
        onScreenshot={handleScreenshot}
        selectedTactic={selectedTactic}
        setSelectedTactic={setSelectedTactic}
      />
      <CourtCanvas
        ref={canvasRef}
        stateRef={stateRef}
        animRef={animRef}
        overlay={overlay}
        penColor={penColor}
        drawingsRef={drawingsRef}
        onDrawingsChange={onDrawingsChange}
      />
    </div>
  );
}
