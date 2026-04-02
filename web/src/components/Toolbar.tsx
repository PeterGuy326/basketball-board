import { memo } from 'react';
import { tactics } from '../data/tactics';

interface ColorOption {
  color: string;
  label: string;
}

const COLORS: ColorOption[] = [
  { color: '#ffffff', label: '白' },
  { color: '#ff4466', label: '红' },
  { color: '#44bbff', label: '蓝' },
  { color: '#ffcc00', label: '黄' },
];

interface ToolbarProps {
  penColor: string;
  setPenColor: (color: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onReset: () => void;
  onPlay: () => void;
  onStop: () => void;
  onScreenshot: () => void;
  selectedTactic: string;
  setSelectedTactic: (value: string) => void;
}

function Toolbar({ penColor, setPenColor, onUndo, onClear, onReset, onPlay, onStop, onScreenshot, selectedTactic, setSelectedTactic }: ToolbarProps) {
  return (
    <div className="toolbar">
      <button onClick={onUndo}>↩ 撤销</button>
      <button onClick={onClear}>清除画线</button>
      <button onClick={onReset}>重置</button>
      <div className="sep" />
      <span className="label">画笔</span>
      {COLORS.map(c => (
        <div
          key={c.color}
          className={`color-dot${penColor === c.color ? ' active' : ''}`}
          style={{ background: c.color }}
          onClick={() => setPenColor(c.color)}
        />
      ))}
      <div className="sep" />
      <span className="label">战术</span>
      <select value={selectedTactic} onChange={e => setSelectedTactic(e.target.value)}>
        <option value="">-- 选择战术 --</option>
        {tactics.map((t, i) => (
          <option key={i} value={i}>{t.name}</option>
        ))}
      </select>
      <button onClick={onPlay}>▶ 播放</button>
      <button onClick={onStop}>■ 停止</button>
      <div className="sep" />
      <button onClick={onScreenshot}>截图</button>
    </div>
  );
}

export default memo(Toolbar);
