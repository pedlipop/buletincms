import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  EyeOff,
  Grid,
  Minus,
  Plus,
  Table as TableIcon,
  Trash2,
  X,
} from 'lucide-react';
import { TableBlock, TableCell } from '../types/bulletin';
import { uid } from '../data/presets';
import { useBulletinStore } from '../store/useBulletinStore';

export type BorderSideKey =
  | 'all'
  | 'outer'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'horizontal'
  | 'vertical';

interface CellPos {
  rowIdx: number;
  colIdx: number;
}

interface TableBlockViewProps {
  block: TableBlock;
  sectionId: string;
  theme: any;
  isSelected: boolean;
  previewMode: boolean;
  updateSelf: (patch: Partial<TableBlock>) => void;
  t: (zh: string, en: string) => string;
}

export const TableBlockView: React.FC<TableBlockViewProps> = ({
  block: b,
  sectionId,
  theme,
  isSelected,
  previewMode,
  updateSelf,
  t,
}) => {
  const selectBlock = useBulletinStore((s) => s.selectBlock);

  // Single row/column selection (via clicking row/col tabs)
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);

  // Active single cell (when focused or clicked for text editing)
  const [activeCell, setActiveCell] = useState<CellPos | null>(null);

  // Multi-cell drag selection range (when cursor moves towards other cells)
  const [dragOrigin, setDragOrigin] = useState<CellPos | null>(null);
  const [selectionRange, setSelectionRange] = useState<{
    start: CellPos;
    end: CellPos;
  } | null>(null);
  const [isMouseDownOnCell, setIsMouseDownOnCell] = useState(false);

  // Border Side selector panel
  const [activeSide, setActiveSide] = useState<BorderSideKey>('all');
  const [showSidePanel, setShowSidePanel] = useState<boolean>(false);

  const tableRef = useRef<HTMLDivElement>(null);

  const rowCount = (b.rows || []).length;
  const colCount = Math.max(1, (b.headers || []).length || (b.rows?.[0]?.length ?? 1));

  // Font size: default 12px for compact, beautiful reading in bulletin
  const effectiveFontSize = b.fontSize || 12;

  const effectiveBorderColor = b.borderColor || theme.containerBorder || '#e4e4e7';
  const effectiveBorderWidth = `${b.borderWidth ?? 1}px`;
  const effectiveBorderStyle = b.borderStyle || 'solid';
  const fullBorderRule = `${effectiveBorderWidth} ${effectiveBorderStyle} ${effectiveBorderColor}`;

  // Compact padding so 4 columns in 480px width fit text cleanly without awkward wraps!
  const cellPaddingMap = {
    compact: '3px 4px',
    normal: '5px 6px',
    relaxed: '8px 10px',
  };
  const paddingValue = cellPaddingMap[b.cellPadding || 'normal'];

  // Global mouseup to finalize drag selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsMouseDownOnCell(false);
      setDragOrigin(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Click outside listener: deselect cell/row/col/range when clicking anywhere outside table
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setActiveCell(null);
        setSelectedRow(null);
        setSelectedCol(null);
        setSelectionRange(null);
        setShowSidePanel(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // When block is deselected, clear cell/row/col/range selections immediately
  useEffect(() => {
    if (!isSelected) {
      setActiveCell(null);
      setSelectedRow(null);
      setSelectedCol(null);
      setSelectionRange(null);
      setShowSidePanel(false);
    }
  }, [isSelected]);

  // Pressing Escape deselects active cell, row, column, range, and side panel
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveCell(null);
        setSelectedRow(null);
        setSelectedCol(null);
        setSelectionRange(null);
        setShowSidePanel(false);
      }
    };
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, []);

  // Keyboard shortcut for deleting cell content in selected range
  useEffect(() => {
    if (!selectionRange) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const target = e.target as HTMLElement;
        // Only if not actively typing inside a contentEditable text node
        if (target.isContentEditable) return;
        e.preventDefault();
        clearRangeContent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionRange]);

  // -------------------------------------------------------------
  // Range selection helpers
  // -------------------------------------------------------------
  const isCellInRange = (r: number, c: number): boolean => {
    if (selectedRow === r) return true;
    if (selectedCol === c) return true;
    if (!selectionRange) return false;
    const minR = Math.min(selectionRange.start.rowIdx, selectionRange.end.rowIdx);
    const maxR = Math.max(selectionRange.start.rowIdx, selectionRange.end.rowIdx);
    const minC = Math.min(selectionRange.start.colIdx, selectionRange.end.colIdx);
    const maxC = Math.max(selectionRange.start.colIdx, selectionRange.end.colIdx);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const clearRangeContent = () => {
    if (!selectionRange) return;
    const minR = Math.min(selectionRange.start.rowIdx, selectionRange.end.rowIdx);
    const maxR = Math.max(selectionRange.start.rowIdx, selectionRange.end.rowIdx);
    const minC = Math.min(selectionRange.start.colIdx, selectionRange.end.colIdx);
    const maxC = Math.max(selectionRange.start.colIdx, selectionRange.end.colIdx);

    const nextRows = b.rows.map((row, r) =>
      row.map((cell, c) => {
        if (r >= minR && r <= maxR && c >= minC && c <= maxC) {
          return { ...cell, content: '' };
        }
        return cell;
      })
    );
    updateSelf({ rows: nextRows });
  };

  // -------------------------------------------------------------
  // Content update helpers
  // -------------------------------------------------------------
  const updateCellContent = (rowIdx: number, colIdx: number, newHtml: string) => {
    const nextRows = b.rows.map((row, r) =>
      row.map((cell, c) => (r === rowIdx && c === colIdx ? { ...cell, content: newHtml } : cell))
    );
    updateSelf({ rows: nextRows });
  };

  const updateHeaderContent = (colIdx: number, newHtml: string) => {
    const nextHeaders = [...b.headers];
    nextHeaders[colIdx] = newHtml;
    updateSelf({ headers: nextHeaders });
  };

  // -------------------------------------------------------------
  // Row Operations
  // -------------------------------------------------------------
  const addRowAbove = (targetIdx?: number) => {
    const idx = targetIdx ?? selectedRow ?? (selectionRange ? Math.min(selectionRange.start.rowIdx, selectionRange.end.rowIdx) : (activeCell?.rowIdx ?? 0));
    const newRow: TableCell[] = Array.from({ length: colCount }, () => ({
      id: uid('cell'),
      content: '',
    }));
    const nextRows = [...b.rows];
    nextRows.splice(idx, 0, newRow);
    updateSelf({ rows: nextRows });
    setSelectedRow(idx);
    setSelectionRange(null);
  };

  const addRowBelow = (targetIdx?: number) => {
    const idx = targetIdx ?? selectedRow ?? (selectionRange ? Math.max(selectionRange.start.rowIdx, selectionRange.end.rowIdx) : (activeCell?.rowIdx ?? (rowCount - 1)));
    const newRow: TableCell[] = Array.from({ length: colCount }, () => ({
      id: uid('cell'),
      content: '',
    }));
    const nextRows = [...b.rows];
    nextRows.splice(idx + 1, 0, newRow);
    updateSelf({ rows: nextRows });
    setSelectedRow(idx + 1);
    setSelectionRange(null);
  };

  const deleteRow = (targetIdx?: number) => {
    if (rowCount <= 1) return;
    const idx = targetIdx ?? selectedRow ?? (selectionRange ? Math.min(selectionRange.start.rowIdx, selectionRange.end.rowIdx) : (activeCell?.rowIdx ?? (rowCount - 1)));
    const nextRows = b.rows.filter((_, r) => r !== idx);
    updateSelf({ rows: nextRows });
    setSelectedRow(null);
    setSelectionRange(null);
    if (activeCell?.rowIdx === idx) setActiveCell(null);
  };

  const appendRow = () => {
    const newRow: TableCell[] = Array.from({ length: colCount }, () => ({
      id: uid('cell'),
      content: '',
    }));
    updateSelf({ rows: [...b.rows, newRow] });
  };

  // -------------------------------------------------------------
  // Column Operations
  // -------------------------------------------------------------
  const addColLeft = (targetIdx?: number) => {
    const idx = targetIdx ?? selectedCol ?? (selectionRange ? Math.min(selectionRange.start.colIdx, selectionRange.end.colIdx) : (activeCell?.colIdx ?? 0));
    const nextHeaders = [...b.headers];
    nextHeaders.splice(idx, 0, `${t('列', 'Col')} ${nextHeaders.length + 1}`);
    const nextRows = b.rows.map((row) => {
      const copy = [...row];
      copy.splice(idx, 0, { id: uid('cell'), content: '' });
      return copy;
    });
    updateSelf({ headers: nextHeaders, rows: nextRows });
    setSelectedCol(idx);
    setSelectionRange(null);
  };

  const addColRight = (targetIdx?: number) => {
    const idx = targetIdx ?? selectedCol ?? (selectionRange ? Math.max(selectionRange.start.colIdx, selectionRange.end.colIdx) : (activeCell?.colIdx ?? (colCount - 1)));
    const nextHeaders = [...b.headers];
    nextHeaders.splice(idx + 1, 0, `${t('列', 'Col')} ${nextHeaders.length + 1}`);
    const nextRows = b.rows.map((row) => {
      const copy = [...row];
      copy.splice(idx + 1, 0, { id: uid('cell'), content: '' });
      return copy;
    });
    updateSelf({ headers: nextHeaders, rows: nextRows });
    setSelectedCol(idx + 1);
    setSelectionRange(null);
  };

  const deleteCol = (targetIdx?: number) => {
    if (colCount <= 1) return;
    const idx = targetIdx ?? selectedCol ?? (selectionRange ? Math.min(selectionRange.start.colIdx, selectionRange.end.colIdx) : (activeCell?.colIdx ?? (colCount - 1)));
    const nextHeaders = b.headers.filter((_, c) => c !== idx);
    const nextRows = b.rows.map((row) => row.filter((_, c) => c !== idx));
    updateSelf({ headers: nextHeaders, rows: nextRows });
    setSelectedCol(null);
    setSelectionRange(null);
    if (activeCell?.colIdx === idx) setActiveCell(null);
  };

  const appendCol = () => {
    const nextHeaders = [...b.headers, `${t('列', 'Col')} ${b.headers.length + 1}`];
    const nextRows = b.rows.map((row) => [
      ...row,
      { id: uid('cell'), content: '' },
    ]);
    updateSelf({ headers: nextHeaders, rows: nextRows });
  };

  // -------------------------------------------------------------
  // Side Border Operations (Selecting the side tab)
  // -------------------------------------------------------------
  const isSideActive = (side: BorderSideKey) => {
    switch (side) {
      case 'top':
        return b.borderTop;
      case 'bottom':
        return b.borderBottom;
      case 'left':
        return b.borderLeft;
      case 'right':
        return b.borderRight;
      case 'horizontal':
        return b.innerBorderHorizontal;
      case 'vertical':
        return b.innerBorderVertical;
      case 'outer':
        return b.borderTop && b.borderBottom && b.borderLeft && b.borderRight;
      case 'all':
        return (
          b.borderTop &&
          b.borderBottom &&
          b.borderLeft &&
          b.borderRight &&
          b.innerBorderHorizontal &&
          b.innerBorderVertical
        );
      default:
        return false;
    }
  };

  const setSideState = (side: BorderSideKey, enabled: boolean) => {
    switch (side) {
      case 'top':
        updateSelf({ borderTop: enabled });
        break;
      case 'bottom':
        updateSelf({ borderBottom: enabled });
        break;
      case 'left':
        updateSelf({ borderLeft: enabled });
        break;
      case 'right':
        updateSelf({ borderRight: enabled });
        break;
      case 'horizontal':
        updateSelf({ innerBorderHorizontal: enabled });
        break;
      case 'vertical':
        updateSelf({ innerBorderVertical: enabled });
        break;
      case 'outer':
        updateSelf({
          borderTop: enabled,
          borderBottom: enabled,
          borderLeft: enabled,
          borderRight: enabled,
        });
        break;
      case 'all':
        updateSelf({
          borderTop: enabled,
          borderBottom: enabled,
          borderLeft: enabled,
          borderRight: enabled,
          innerBorderHorizontal: enabled,
          innerBorderVertical: enabled,
        });
        break;
    }
  };

  const alignSelection = (align: 'left' | 'center' | 'right') => {
    if (selectionRange) {
      const minR = Math.min(selectionRange.start.rowIdx, selectionRange.end.rowIdx);
      const maxR = Math.max(selectionRange.start.rowIdx, selectionRange.end.rowIdx);
      const minC = Math.min(selectionRange.start.colIdx, selectionRange.end.colIdx);
      const maxC = Math.max(selectionRange.start.colIdx, selectionRange.end.colIdx);

      const nextRows = b.rows.map((row, r) =>
        row.map((cell, c) => {
          if (r >= minR && r <= maxR && c >= minC && c <= maxC) {
            return { ...cell, align };
          }
          return cell;
        })
      );
      updateSelf({ rows: nextRows });
    } else if (selectedCol !== null) {
      const nextHeaders = [...b.headers];
      const nextRows = b.rows.map((row) =>
        row.map((cell, c) => (c === selectedCol ? { ...cell, align } : cell))
      );
      updateSelf({ headers: nextHeaders, rows: nextRows });
    } else if (selectedRow !== null) {
      const nextRows = b.rows.map((row, r) =>
        r === selectedRow ? row.map((cell) => ({ ...cell, align })) : row
      );
      updateSelf({ rows: nextRows });
    } else if (activeCell && activeCell.rowIdx >= 0) {
      const nextRows = b.rows.map((row, r) =>
        r === activeCell.rowIdx
          ? row.map((cell, c) => (c === activeCell.colIdx ? { ...cell, align } : cell))
          : row
      );
      updateSelf({ rows: nextRows });
    } else {
      updateSelf({ textAlign: align, headerAlign: align });
    }
  };

  const changeFontSize = (delta: number) => {
    const cur = b.fontSize || 12;
    const next = Math.min(16, Math.max(10, cur + delta));
    updateSelf({ fontSize: next });
  };

  const showFloatingTools =
    !previewMode &&
    isSelected &&
    (selectedRow !== null ||
      selectedCol !== null ||
      activeCell !== null ||
      selectionRange !== null ||
      showSidePanel);

  const hasRangeSelection = selectionRange !== null;

  return (
    <div
      ref={tableRef}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        backgroundColor: theme.cardBg || 'transparent',
        borderRadius: '6px',
        padding: '2px 0',
        position: 'relative',
      }}
      onClick={() => {
        if (!previewMode) {
          selectBlock(sectionId, b.id);
        }
      }}
    >
      {/* ========================================================= */}
      {/* 1. COMPACT ULTRA-SLEEK FLOATING TOOLBAR                   */}
      {/* ========================================================= */}
      {showFloatingTools && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-pop-in select-none"
          style={{
            position: 'absolute',
            top: '-32px',
            left: '0px',
            zIndex: 48,
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            backgroundColor: 'rgba(24, 24, 27, 0.96)',
            backdropFilter: 'blur(8px)',
            color: '#f4f4f5',
            padding: '2px 6px',
            height: '28px',
            borderRadius: '6px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            border: '1px solid rgba(63, 63, 70, 0.8)',
            fontSize: '11px',
          }}
        >
          {/* Active selection badge */}
          <div className="flex items-center gap-1 pr-1.5 mr-0.5 border-r border-zinc-700/80 text-blue-400 font-bold text-[10px]">
            <TableIcon size={11} className="text-blue-400 shrink-0" />
            <span className="font-mono text-[9px] text-zinc-300">
              {hasRangeSelection
                ? t('已选区域', 'Range')
                : selectedRow !== null
                ? `${t('第', 'Row ')}${selectedRow + 1}${t('行', '')}`
                : selectedCol !== null
                ? `${t('第', 'Col ')}${String.fromCharCode(65 + selectedCol)}${t('列', '')}`
                : activeCell !== null
                ? `${t('单元格', 'Cell')} R${activeCell.rowIdx + 1}C${String.fromCharCode(65 + activeCell.colIdx)}`
                : `${rowCount}×${colCount}`}
            </span>
            {(selectedRow !== null || selectedCol !== null || hasRangeSelection || activeCell !== null) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRow(null);
                  setSelectedCol(null);
                  setSelectionRange(null);
                  setActiveCell(null);
                  setShowSidePanel(false);
                }}
                title={t('取消选中 (Esc)', 'Deselect (Esc)')}
                className="hover:text-red-400 text-zinc-400 p-0.5 ml-0.5 transition-colors"
              >
                <X size={10} />
              </button>
            )}
          </div>

          {/* Row Actions: Clean Icons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => addRowAbove()}
              title={t('在上方插入一行 (Insert Row Above)', 'Insert Row Above')}
              className="p-1 hover:bg-zinc-800 active:scale-90 text-zinc-300 hover:text-emerald-400 rounded transition-colors"
            >
              <ArrowUp size={11} />
            </button>
            <button
              type="button"
              onClick={() => addRowBelow()}
              title={t('在下方插入一行 (Insert Row Below)', 'Insert Row Below')}
              className="p-1 hover:bg-zinc-800 active:scale-90 text-zinc-300 hover:text-emerald-400 rounded transition-colors"
            >
              <ArrowDown size={11} />
            </button>
            <button
              type="button"
              onClick={() => deleteRow()}
              disabled={rowCount <= 1}
              title={t('删除选定行 (Delete Row)', 'Delete Row')}
              className="p-1 hover:bg-zinc-800 active:scale-90 text-zinc-400 hover:text-red-400 disabled:opacity-25 rounded transition-colors"
            >
              <Trash2 size={11} />
            </button>
          </div>

          <div className="h-3 w-px bg-zinc-700 mx-0.5" />

          {/* Column Actions: Clean Icons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => addColLeft()}
              title={t('在左侧插入一列 (Insert Column Left)', 'Insert Column Left')}
              className="p-1 hover:bg-zinc-800 active:scale-90 text-zinc-300 hover:text-blue-400 rounded transition-colors"
            >
              <ArrowLeft size={11} />
            </button>
            <button
              type="button"
              onClick={() => addColRight()}
              title={t('在右侧插入一列 (Insert Column Right)', 'Insert Column Right')}
              className="p-1 hover:bg-zinc-800 active:scale-90 text-zinc-300 hover:text-blue-400 rounded transition-colors"
            >
              <ArrowRight size={11} />
            </button>
            <button
              type="button"
              onClick={() => deleteCol()}
              disabled={colCount <= 1}
              title={t('删除选定列 (Delete Column)', 'Delete Column')}
              className="p-1 hover:bg-zinc-800 active:scale-90 text-zinc-400 hover:text-red-400 disabled:opacity-25 rounded transition-colors"
            >
              <Trash2 size={11} />
            </button>
          </div>

          <div className="h-3 w-px bg-zinc-700 mx-0.5" />

          {/* Font Size Stepper */}
          <div className="flex items-center gap-0.5 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800">
            <button
              type="button"
              onClick={() => changeFontSize(-1)}
              disabled={effectiveFontSize <= 10}
              title={t('缩小文字字号 (Smaller Font)', 'Smaller Font')}
              className="text-[10px] text-zinc-400 hover:text-white px-0.5 disabled:opacity-30"
            >
              A-
            </button>
            <span className="font-mono text-[9px] font-bold text-zinc-200 min-w-[22px] text-center">
              {effectiveFontSize}p
            </span>
            <button
              type="button"
              onClick={() => changeFontSize(1)}
              disabled={effectiveFontSize >= 16}
              title={t('放大文字字号 (Larger Font)', 'Larger Font')}
              className="text-[10px] text-zinc-400 hover:text-white px-0.5 disabled:opacity-30"
            >
              A+
            </button>
          </div>

          <div className="h-3 w-px bg-zinc-700 mx-0.5" />

          {/* Alignment */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => alignSelection('left')}
              title={t('靠左对齐 (Align Left)', 'Align Left')}
              className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded"
            >
              <AlignLeft size={11} />
            </button>
            <button
              type="button"
              onClick={() => alignSelection('center')}
              title={t('居中对齐 (Align Center)', 'Align Center')}
              className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded"
            >
              <AlignCenter size={11} />
            </button>
            <button
              type="button"
              onClick={() => alignSelection('right')}
              title={t('靠右对齐 (Align Right)', 'Align Right')}
              className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded"
            >
              <AlignRight size={11} />
            </button>
          </div>

          <div className="h-3 w-px bg-zinc-700 mx-0.5" />

          {/* Border Side Selector Button */}
          <button
            type="button"
            onClick={() => setShowSidePanel(!showSidePanel)}
            title={t('选择边线进行样式调整 (Border Side Settings)', 'Border Side Settings')}
            className={`p-1 rounded transition-colors ${
              showSidePanel
                ? 'bg-blue-600 text-white'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Grid size={11} />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. FLOATING BORDER SIDE SELECTOR PANEL                    */}
      {/* ========================================================= */}
      {showFloatingTools && showSidePanel && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-pop-in select-none bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 shadow-xl text-xs space-y-2"
          style={{
            position: 'absolute',
            top: '4px',
            right: '0px',
            zIndex: 49,
            width: '260px',
          }}
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
            <span className="text-[11px] font-bold text-zinc-200">
              {t('选择要编辑的边 (Select Side)', 'Select Border Side')}
            </span>
            <button
              type="button"
              onClick={() => setShowSidePanel(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X size={12} />
            </button>
          </div>

          {/* Side Selector Tabs with Clean Icons */}
          <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold">
            {[
              {
                id: 'all',
                name: t('全框', 'All'),
                fullName: t('全部边线 (All Borders)', 'All Borders'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <rect x="2" y="2" width="12" height="12" rx="1" />
                    <line x1="8" y1="2" x2="8" y2="14" />
                    <line x1="2" y1="8" x2="14" y2="8" />
                  </svg>
                ),
              },
              {
                id: 'outer',
                name: t('外框', 'Outer'),
                fullName: t('四周外框 (Outer Box)', 'Outer Box'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="2" y="2" width="12" height="12" rx="1" />
                  </svg>
                ),
              },
              {
                id: 'top',
                name: t('上边', 'Top'),
                fullName: t('顶部上边 (Top Border)', 'Top Border'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round">
                    <line x1="2" y1="3" x2="14" y2="3" stroke="currentColor" strokeWidth="2.2" />
                    <rect x="2" y="3" width="12" height="10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
                  </svg>
                ),
              },
              {
                id: 'bottom',
                name: t('下边', 'Bottom'),
                fullName: t('底部下边 (Bottom Border)', 'Bottom Border'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round">
                    <line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="2.2" />
                    <rect x="2" y="3" width="12" height="10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
                  </svg>
                ),
              },
              {
                id: 'left',
                name: t('左边', 'Left'),
                fullName: t('左侧边线 (Left Border)', 'Left Border'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round">
                    <line x1="3" y1="2" x2="3" y2="14" stroke="currentColor" strokeWidth="2.2" />
                    <rect x="3" y="2" width="10" height="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
                  </svg>
                ),
              },
              {
                id: 'right',
                name: t('右边', 'Right'),
                fullName: t('右侧边线 (Right Border)', 'Right Border'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round">
                    <line x1="13" y1="2" x2="13" y2="14" stroke="currentColor" strokeWidth="2.2" />
                    <rect x="3" y="2" width="10" height="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
                  </svg>
                ),
              },
              {
                id: 'horizontal',
                name: t('横线', 'H-Line'),
                fullName: t('行间横线 (H-Lines)', 'H-Lines'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round">
                    <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2.2" />
                    <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
                  </svg>
                ),
              },
              {
                id: 'vertical',
                name: t('竖线', 'V-Line'),
                fullName: t('列间竖线 (V-Lines)', 'V-Lines'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round">
                    <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="2.2" />
                    <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
                  </svg>
                ),
              },
            ].map((s) => {
              const isSelectedSide = activeSide === s.id;
              const active = isSideActive(s.id as any);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSide(s.id as any)}
                  title={`${s.fullName} · ${active ? t('已开启 (Active)', 'Active') : t('已隐藏 (Hidden)', 'Hidden')}`}
                  className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg border transition-all relative ${
                    isSelectedSide
                      ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm ring-1 ring-blue-400/50'
                      : active
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-700 hover:border-zinc-500'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800/80 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-center h-4 w-4">
                    {s.icon}
                  </div>
                  <span className="text-[9px] mt-0.5 font-medium leading-none">
                    {s.name}
                  </span>
                  <span
                    className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                      active
                        ? isSelectedSide
                          ? 'bg-white'
                          : 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]'
                        : 'bg-zinc-700'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Controls for the currently selected side tab */}
          <div className="bg-zinc-950 p-2 rounded border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400">
                {t('选定边状态', 'Selected Side State')}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSideState(activeSide, true)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 ${
                    isSideActive(activeSide)
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Eye size={10} />
                  <span>{t('开启', 'On')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSideState(activeSide, false)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 ${
                    !isSideActive(activeSide)
                      ? 'bg-red-600/80 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <EyeOff size={10} />
                  <span>{t('隐藏', 'Off')}</span>
                </button>
              </div>
            </div>

            {/* Color, Width, Style */}
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-800 text-[10px]">
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={b.borderColor || '#e4e4e7'}
                  onChange={(e) => updateSelf({ borderColor: e.target.value })}
                  className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="font-mono text-zinc-400">{b.borderColor || '#e4e4e7'}</span>
              </div>

              <div className="flex items-center gap-0.5 bg-zinc-900 p-0.5 rounded border border-zinc-800">
                {[1, 2, 3].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => updateSelf({ borderWidth: w })}
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      (b.borderWidth ?? 1) === w
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {w}p
                  </button>
                ))}
              </div>

              <select
                value={b.borderStyle || 'solid'}
                onChange={(e) => updateSelf({ borderStyle: e.target.value as any })}
                className="py-0.5 px-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200"
              >
                <option value="solid">{t('实线', 'Solid')}</option>
                <option value="dashed">{t('虚线', 'Dashed')}</option>
                <option value="dotted">{t('点线', 'Dotted')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. OPTIONAL TABLE TITLE                                    */}
      {/* ========================================================= */}
      {b.showTitle && (
        <div
          contentEditable={!previewMode}
          suppressContentEditableWarning
          onBlur={(e) => updateSelf({ title: e.currentTarget.textContent || '' })}
          style={{
            fontSize: `${Math.max(16, effectiveFontSize + 6)}px`,
            fontWeight: 900,
            letterSpacing: '0.12em',
            color: b.borderColor && b.borderColor !== '#e4e4e7' ? b.borderColor : theme.primaryColor,
            textAlign: b.titleAlign || 'center',
            padding: '4px 8px',
            outline: 'none',
          }}
        >
          {b.title || t('战报汇总', 'Tournament Results')}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TABLE CONTAINER WITH SLEEK SIDE TABS & CELL SELECTION */}
      {/* ========================================================= */}
      <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
        {/* Sleek Top Column Tabs Bar */}
        {!previewMode && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '22px', // offset for the sleek left row tabs
              marginBottom: '2px',
              gap: '0px',
            }}
          >
            {Array.from({ length: colCount }).map((_, c) => {
              const isColSelected = selectedCol === c;
              return (
                <div
                  key={c}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectBlock(sectionId, b.id);
                      setSelectedCol(isColSelected ? null : c);
                      setSelectedRow(null);
                      setSelectionRange(null);
                    }}
                    title={t(
                      `点击选中第 ${c + 1} 列 (Click to select Column ${c + 1})`,
                      `Click to select Column ${c + 1}`
                    )}
                    className={`h-4 min-w-[20px] px-1 rounded text-[9px] font-mono flex items-center justify-center transition-all border ${
                      isColSelected
                        ? 'bg-blue-600 text-white font-bold border-blue-500 shadow-sm'
                        : 'bg-zinc-800/60 hover:bg-zinc-700 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{String.fromCharCode(65 + c)}</span>
                  </button>
                </div>
              );
            })}

            {/* Subtle Add Column Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectBlock(sectionId, b.id);
                appendCol();
              }}
              title={t('在右侧追加新列 (+ Add Column)', 'Append Column')}
              className="w-4 h-4 ml-1 rounded bg-zinc-800/80 hover:bg-blue-600 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shadow-sm shrink-0"
            >
              <Plus size={10} />
            </button>
          </div>
        )}

        {/* Table & Left Row Tabs Flex Container */}
        <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
          {/* Sleek Left Row Tabs Bar */}
          {!previewMode && (
            <div
              style={{
                width: '18px',
                display: 'flex',
                flexDirection: 'column',
                marginRight: '4px',
                paddingTop: b.hasHeader ? '28px' : '0px', // offset if header exists
              }}
            >
              {b.rows.map((_, r) => {
                const isRowSelected = selectedRow === r;
                return (
                  <div
                    key={r}
                    style={{
                      flex: 1,
                      minHeight: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectBlock(sectionId, b.id);
                        setSelectedRow(isRowSelected ? null : r);
                        setSelectedCol(null);
                        setSelectionRange(null);
                      }}
                      title={t(
                        `点击选中第 ${r + 1} 行 (Click to select Row ${r + 1})`,
                        `Click to select Row ${r + 1}`
                      )}
                      className={`w-4 h-4 rounded text-[9px] font-mono flex items-center justify-center transition-all border ${
                        isRowSelected
                          ? 'bg-blue-600 text-white font-bold border-blue-500 shadow-sm'
                          : 'bg-zinc-800/60 hover:bg-zinc-700 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>{r + 1}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* The Table Element */}
          <table
            style={{
              flex: 1,
              width: '100%',
              borderCollapse: 'collapse',
              borderTop: b.borderTop ? fullBorderRule : 'none',
              borderBottom: b.borderBottom ? fullBorderRule : 'none',
              borderLeft: b.borderLeft ? fullBorderRule : 'none',
              borderRight: b.borderRight ? fullBorderRule : 'none',
              tableLayout: 'fixed',
            }}
          >
            {/* Table Header */}
            {b.hasHeader && b.headers && b.headers.length > 0 && (
              <thead>
                <tr
                  style={{
                    backgroundColor: b.headerBg || 'transparent',
                    borderBottom: b.innerBorderHorizontal || b.borderTop ? fullBorderRule : 'none',
                  }}
                >
                  {b.headers.map((h, colIdx) => {
                    const isColActive = selectedCol === colIdx;
                    return (
                      <th
                        key={colIdx}
                        onClick={() => {
                          if (!previewMode) {
                            selectBlock(sectionId, b.id);
                            setSelectedCol(selectedCol === colIdx ? null : colIdx);
                            setSelectedRow(null);
                            setSelectionRange(null);
                          }
                        }}
                        style={{
                          padding: paddingValue,
                          textAlign: b.headerAlign || 'center',
                          color: b.headerTextColor || theme.headerTextColor || theme.textColor,
                          fontWeight: 700,
                          fontSize: `${effectiveFontSize + 1}px`,
                          letterSpacing: '0.04em',
                          borderRight:
                            b.innerBorderVertical && colIdx < colCount - 1
                              ? fullBorderRule
                              : 'none',
                          backgroundColor: isColActive ? 'rgba(59, 130, 246, 0.08)' : undefined,
                          outline: isColActive ? '1px solid #3b82f6' : 'none',
                          outlineOffset: '-1px',
                          cursor: !previewMode ? 'pointer' : 'default',
                        }}
                      >
                        <div
                          contentEditable={!previewMode}
                          suppressContentEditableWarning
                          onFocus={() => {
                            setActiveCell({ rowIdx: -1, colIdx });
                          }}
                          onBlur={(e) => updateHeaderContent(colIdx, e.currentTarget.innerText)}
                          style={{
                            outline: 'none',
                            minHeight: '1.2em',
                            fontSize: `${effectiveFontSize + 1}px`,
                            wordBreak: 'break-word',
                            lineHeight: 1.35,
                          }}
                        >
                          {h}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
            )}

            {/* Table Body */}
            <tbody>
              {b.rows.map((row, rowIdx) => {
                const isLastRow = rowIdx === b.rows.length - 1;
                const isRowActive = selectedRow === rowIdx;
                const isZebra = b.zebraStriping && rowIdx % 2 === 1;

                return (
                  <tr
                    key={rowIdx}
                    style={{
                      backgroundColor: isRowActive
                        ? 'rgba(37, 99, 235, 0.12)'
                        : isZebra
                        ? b.zebraBg || 'rgba(0,0,0,0.03)'
                        : 'transparent',
                      borderBottom:
                        b.innerBorderHorizontal && !isLastRow ? fullBorderRule : 'none',
                      outline: isRowActive ? '1px solid #3b82f6' : 'none',
                      outlineOffset: '-1px',
                    }}
                  >
                    {row.map((cell, colIdx) => {
                      const isColActive = selectedCol === colIdx;
                      const inRange = isCellInRange(rowIdx, colIdx);
                      const isCellFocused =
                        activeCell?.rowIdx === rowIdx &&
                        activeCell?.colIdx === colIdx &&
                        !hasRangeSelection;

                      return (
                        <td
                          key={cell.id || colIdx}
                          onMouseDown={(e) => {
                            if (previewMode) return;
                            selectBlock(sectionId, b.id);
                            setIsMouseDownOnCell(true);
                            setDragOrigin({ rowIdx, colIdx });
                            setActiveCell({ rowIdx, colIdx });
                            // Don't clear immediately if already in range, allow click
                          }}
                          onMouseEnter={() => {
                            if (previewMode || !isMouseDownOnCell || !dragOrigin) return;
                            // When cursor moves towards another cell: activate multi-cell range selection!
                            if (rowIdx !== dragOrigin.rowIdx || colIdx !== dragOrigin.colIdx) {
                              window.getSelection()?.removeAllRanges();
                              setSelectionRange({
                                start: dragOrigin,
                                end: { rowIdx, colIdx },
                              });
                              setSelectedRow(null);
                              setSelectedCol(null);
                            }
                          }}
                          onClick={() => {
                            if (!previewMode) {
                              selectBlock(sectionId, b.id);
                              setActiveCell({ rowIdx, colIdx });
                              // If single click without drag, clear range
                              if (!selectionRange) {
                                setSelectedRow(null);
                                setSelectedCol(null);
                              }
                            }
                          }}
                          style={{
                            padding: paddingValue,
                            textAlign: cell.align || b.textAlign || 'center',
                            fontSize: `${effectiveFontSize}px`,
                            lineHeight: 1.35,
                            borderRight:
                              b.innerBorderVertical && colIdx < colCount - 1
                                ? fullBorderRule
                                : 'none',
                            backgroundColor: inRange
                              ? 'rgba(37, 99, 235, 0.18)'
                              : isColActive
                              ? 'rgba(37, 99, 235, 0.08)'
                              : cell.bgColor || undefined,
                            outline: inRange
                              ? '1px solid #3b82f6'
                              : isCellFocused
                              ? '1px solid #3b82f6'
                              : isColActive
                              ? '1px dashed #3b82f6'
                              : 'none',
                            outlineOffset: '-1px',
                            verticalAlign: 'middle',
                            cursor: !previewMode ? 'text' : 'default',
                            transition: 'background-color 0.08s ease',
                          }}
                        >
                          <div
                            contentEditable={!previewMode}
                            suppressContentEditableWarning
                            onFocus={() => {
                              setActiveCell({ rowIdx, colIdx });
                            }}
                            onBlur={(e) =>
                              updateCellContent(rowIdx, colIdx, e.currentTarget.innerHTML)
                            }
                            dangerouslySetInnerHTML={{ __html: cell.content }}
                            style={{
                              outline: 'none',
                              minHeight: '1.2em',
                              fontSize: `${effectiveFontSize}px`,
                              lineHeight: 1.35,
                              wordBreak: 'break-word',
                              userSelect: hasRangeSelection ? 'none' : 'text',
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Sleek Bottom Add Row Strip */}
        {!previewMode && (
          <div
            style={{
              paddingLeft: '22px',
              marginTop: '3px',
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectBlock(sectionId, b.id);
                appendRow();
              }}
              title={t('在末尾追加新行 (+ Add Row)', 'Append Row')}
              className="w-full py-0.5 rounded bg-zinc-800/40 hover:bg-zinc-700/60 text-zinc-500 hover:text-zinc-200 text-[9px] font-semibold flex items-center justify-center gap-1 transition-colors border border-dashed border-zinc-800 hover:border-zinc-700"
            >
              <Plus size={10} className="text-emerald-400" />
              <span>{t('添加新行', 'Add Row')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
