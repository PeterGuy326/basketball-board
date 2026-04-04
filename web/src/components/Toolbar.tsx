import { memo } from 'react';
import { tactics } from '../data/tactics';
import { ToolMode, LineStyle, Tactic } from '../types';

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
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  lineStyle: LineStyle;
  setLineStyle: (style: LineStyle) => void;
  onUndo: () => void;
  onClear: () => void;
  onReset: () => void;
  onPlay: () => void;
  onStop: () => void;
  onScreenshot: () => void;
  selectedTactic: string;
  setSelectedTactic: (value: string) => void;
  customTactics: Tactic[];
  editMode: boolean;
  onToggleEditMode: () => void;
  onRecordStep: () => void;
  onSaveTactic: () => void;
  editStepCount: number;
}

type DrawTool = `${ToolMode}-${LineStyle}`;

const DRAW_TOOLS: { value: DrawTool; label: string }[] = [
  { value: 'pen-solid', label: '✏️ 画笔' },
  { value: 'straightArrow-solid', label: '→ 传球（直线）' },
  { value: 'straightArrow-dashed', label: '⇢ 跑位（直线）' },
  { value: 'straightArrow-wavy', label: '〰 运球（直线）' },
  { value: 'curvedArrow-solid', label: '↪ 传球（曲线）' },
  { value: 'curvedArrow-dashed', label: '⤳ 跑位（曲线）' },
  { value: 'curvedArrow-wavy', label: '↝ 运球（曲线）' },
];

function Toolbar({
  penColor, setPenColor,
  toolMode, setToolMode, lineStyle, setLineStyle,
  onUndo, onClear, onReset, onPlay, onStop, onScreenshot,
  selectedTactic, setSelectedTactic, customTactics,
  editMode, onToggleEditMode, onRecordStep, onSaveTactic, editStepCount,
}: ToolbarProps) {
  const currentDrawTool: DrawTool = `${toolMode}-${lineStyle}`;

  const handleDrawToolChange = (value: string) => {
    const [mode, style] = value.split('-') as [ToolMode, LineStyle];
    setToolMode(mode);
    setLineStyle(style);
  };

  return (
    <div className="toolbar">
      {/* Draw tool selector */}
      <select
        value={currentDrawTool}
        onChange={e => handleDrawToolChange(e.target.value)}
        className="draw-tool-select"
      >
        {DRAW_TOOLS.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Colors */}
      {COLORS.map(c => (
        <div
          key={c.color}
          className={`color-dot${penColor === c.color ? ' active' : ''}`}
          style={{ background: c.color }}
          onClick={() => setPenColor(c.color)}
        />
      ))}

      <button onClick={onUndo}>↩ 撤销</button>
      <button onClick={onClear}>🗑 清除</button>

      <div className="sep" />

      {/* Tactics */}
      <select value={selectedTactic} onChange={e => setSelectedTactic(e.target.value)}>
        <option value="">选择战术</option>
        <optgroup label="预置">
          {tactics.map((t, i) => (
            <option key={`preset-${i}`} value={`preset-${i}`}>{t.name}</option>
          ))}
        </optgroup>
        {customTactics.length > 0 && (
          <optgroup label="自定义">
            {customTactics.map((t, i) => (
              <option key={`custom-${i}`} value={`custom-${i}`}>{t.name}</option>
            ))}
          </optgroup>
        )}
      </select>
      <button onClick={onPlay}>▶ 播放</button>
      <button onClick={onStop}>⏹ 停止</button>

      <div className="sep" />

      {/* Edit mode - compact */}
      <button
        className={editMode ? 'active edit-btn' : ''}
        onClick={onToggleEditMode}
        title={editMode ? '退出编辑模式' : '进入编辑模式，录制自定义战术'}
      >
        {editMode ? '✕ 退出编辑' : '＋ 录制战术'}
      </button>
      {editMode && (
        <>
          <button onClick={onRecordStep} title="记录当前球员位置为一个步骤">
            📌 记录 ({editStepCount})
          </button>
          <button onClick={onSaveTactic} disabled={editStepCount < 2}>
            💾 保存
          </button>
        </>
      )}

      <div className="sep" />
      <button onClick={onReset} title="重置球员位置和所有标注">⟲ 重置</button>
      <button onClick={onScreenshot} title="导出为PNG图片">📷</button>
    </div>
  );
}

export default memo(Toolbar);
