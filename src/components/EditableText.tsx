import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  Italic,
  MoveVertical,
  Palette,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { useBulletinStore } from '../store/useBulletinStore';

export function stripHtmlTags(html: string): string {
  if (!html || !html.includes('<')) return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

interface EditableTextProps {
  value: string;
  onChange: (nextVal: string) => void;
  tagName?: 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'p';
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
}

const TEXT_COLOR_PRESETS = [
  '#18181b',
  '#52525b',
  '#ffffff',
  '#1d4ed8',
  '#0284c7',
  '#15803d',
  '#b45309',
  '#dc2626',
  '#be123c',
  '#7c3aed',
];

const HIGHLIGHT_COLOR_PRESETS = [
  'transparent',
  '#fef08a',
  '#bbf7d0',
  '#bae6fd',
  '#fecdd3',
  '#fed7aa',
  '#e9d5ff',
  '#e4e4e7',
];

const FONT_SIZE_OPTIONS = [
  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32, 36, 42, 48,
];

const LINE_HEIGHT_OPTIONS = ['1.15', '1.35', '1.5', '1.65', '1.85', '2.1'];

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  tagName = 'div',
  style,
  className = '',
  placeholder = '',
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const previewMode = useBulletinStore((s) => s.previewMode);
  const lang = useBulletinStore((s) => s.lang);
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);

  const [isFocused, setIsFocused] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<{
    top: number;
    left: number;
    placeBelow: boolean;
  } | null>(null);
  const [currentFontSize, setCurrentFontSize] = useState<number>(12);
  const [activePopover, setActivePopover] = useState<
    'color' | 'highlight' | 'lineHeight' | null
  >(null);

  // Sync external value into DOM without clobbering active typing
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement !== el) {
      if (el.innerHTML !== value) {
        el.innerHTML = value;
      }
    }
  }, [value]);

  const updateToolbarPosition = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const toolbarWidth = Math.min(430, window.innerWidth - 24);
    const halfWidth = toolbarWidth / 2;
    const centerX = rect.left + rect.width / 2;
    const clampedLeft = Math.max(
      halfWidth + 12,
      Math.min(window.innerWidth - halfWidth - 12, centerX)
    );
    const placeBelow = rect.top < 95;
    const top = placeBelow ? rect.bottom + 8 : rect.top - 8;

    setToolbarPos({
      top,
      left: clampedLeft,
      placeBelow,
    });

    // Detect computed font size at selection or element
    let targetNode: Node | null = el;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      targetNode = sel.anchorNode;
    }
    const elem =
      targetNode && targetNode.nodeType === Node.ELEMENT_NODE
        ? (targetNode as HTMLElement)
        : targetNode?.parentElement || el;
    if (elem) {
      const computed = window.getComputedStyle(elem);
      const parsed = Math.round(parseFloat(computed.fontSize));
      if (!Number.isNaN(parsed) && parsed > 0) {
        setCurrentFontSize(parsed);
      }
    }
  }, []);

  const saveSelection = useCallback(() => {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (el.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const restoreOrSelectAll = useCallback((): boolean => {
    const el = ref.current;
    if (!el) return false;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return false;

    if (
      savedRangeRef.current &&
      el.contains(savedRangeRef.current.commonAncestorContainer)
    ) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }

    // If selection is collapsed (nothing highlighted), select all contents of this EditableText
    // so clicking Bold / Size / Color formats the whole text box intuitively!
    if (sel.rangeCount === 0 || sel.isCollapsed) {
      const fullRange = document.createRange();
      fullRange.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(fullRange);
      savedRangeRef.current = fullRange.cloneRange();
      return true;
    }
    return false;
  }, []);

  const commitDomChange = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const nextHtml = el.innerHTML;
    if (nextHtml !== value) {
      onChange(nextHtml);
    }
    saveSelection();
    updateToolbarPosition();
  }, [onChange, saveSelection, updateToolbarPosition, value]);

  useEffect(() => {
    if (!isFocused) {
      setActivePopover(null);
      return;
    }
    updateToolbarPosition();

    const handleScrollOrResize = () => {
      updateToolbarPosition();
    };
    const handleSelectionChange = () => {
      const el = ref.current;
      const sel = window.getSelection();
      if (el && sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
        saveSelection();
        updateToolbarPosition();
      }
    };
    const handleMouseDownOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        toolbarRef.current &&
        !toolbarRef.current.contains(target)
      ) {
        setIsFocused(false);
        setActivePopover(null);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleMouseDownOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleMouseDownOutside);
    };
  }, [isFocused, saveSelection, updateToolbarPosition]);

  // Execute standard inline command (bold, italic, underline, strikeThrough, foreColor, hiliteColor)
  const applyExecCommand = (cmd: string, arg?: string) => {
    restoreOrSelectAll();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(cmd, false, arg);
    commitDomChange();
  };

  // Apply exact pixel font size (A-, A+, or dropdown)
  const applyFontSizePx = (px: number) => {
    const clamped = Math.max(8, Math.min(72, Math.round(px)));
    const el = ref.current;
    if (!el) return;

    restoreOrSelectAll();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('fontSize', false, '7');

    // Convert any <font size="7"> created by execCommand into clean <span style="font-size: Xpx">
    const fonts = el.querySelectorAll('font[size="7"]');
    fonts.forEach((fontEl) => {
      const span = document.createElement('span');
      span.style.fontSize = `${clamped}px`;
      span.innerHTML = fontEl.innerHTML;
      fontEl.parentNode?.replaceChild(span, fontEl);
    });

    // Reselect the newly formatted content so repeated A+/A- clicks work smoothly
    const sel = window.getSelection();
    if (sel && fonts.length > 0) {
      const fullRange = document.createRange();
      fullRange.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(fullRange);
      savedRangeRef.current = fullRange.cloneRange();
    }

    setCurrentFontSize(clamped);
    commitDomChange();
  };

  // Apply block-level style (text-align or line-height) inside the EditableText
  const applyBlockStyle = (
    prop: 'textAlign' | 'lineHeight',
    val: string
  ) => {
    const el = ref.current;
    if (!el) return;

    let wrapper = el.querySelector(
      ':scope > div[data-fmt-block="1"]'
    ) as HTMLDivElement | null;

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.setAttribute('data-fmt-block', '1');
      while (el.firstChild) {
        wrapper.appendChild(el.firstChild);
      }
      el.appendChild(wrapper);
    }

    wrapper.style[prop] = val;
    commitDomChange();
  };

  // Clear all formatting back to plain text
  const handleClearFormatting = () => {
    const el = ref.current;
    if (!el) return;
    const plain = el.innerText || el.textContent || '';
    el.innerText = plain;
    onChange(plain);
    setActivePopover(null);
    updateToolbarPosition();
  };

  const Tag = tagName as any;

  if (previewMode) {
    return (
      <Tag
        style={{ whiteSpace: 'pre-wrap', ...style }}
        className={className}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return (
    <>
      <Tag
        ref={(node: HTMLElement | null) => {
          ref.current = node;
          if (node && node.innerHTML !== value && document.activeElement !== node) {
            node.innerHTML = value;
          }
        }}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onFocus={() => {
          setIsFocused(true);
          saveSelection();
          updateToolbarPosition();
        }}
        onKeyUp={() => {
          saveSelection();
          updateToolbarPosition();
        }}
        onMouseUp={() => {
          saveSelection();
          updateToolbarPosition();
        }}
        onBlur={(e: React.FocusEvent<HTMLElement>) => {
          const nextHtml = e.currentTarget.innerHTML;
          if (nextHtml !== value) {
            onChange(nextHtml);
          }
          // Delay blur check so toolbar interactions keep toolbar open
          setTimeout(() => {
            const active = document.activeElement;
            if (
              active !== ref.current &&
              (!toolbarRef.current || !toolbarRef.current.contains(active))
            ) {
              setIsFocused(false);
              setActivePopover(null);
            }
          }, 150);
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
          e.stopPropagation();
        }}
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          lineHeight: '1.4',
          cursor: 'text',
          outline: isFocused ? '1.5px dashed rgba(37, 99, 235, 0.65)' : undefined,
          outlineOffset: '2px',
          borderRadius: isFocused ? '2px' : undefined,
          ...style,
        }}
        className={className}
      />

      {isFocused &&
        toolbarPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={toolbarRef}
            onMouseDown={(e) => {
              // Prevent focus loss on contentEditable unless clicking native select/color input
              const tag = (e.target as HTMLElement).tagName;
              if (tag !== 'SELECT' && tag !== 'INPUT') {
                e.preventDefault();
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${toolbarPos.top}px`,
              left: `${toolbarPos.left}px`,
              transform: toolbarPos.placeBelow
                ? 'translate(-50%, 0)'
                : 'translate(-50%, -100%)',
              zIndex: 9999,
            }}
            className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 text-zinc-100 rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.45)] px-2 py-1.5 flex items-center gap-1 select-none max-w-[calc(100vw-24px)] overflow-x-auto"
          >
            {/* 1. Font Size Controls (A- | Size Select | A+) */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => applyFontSizePx(currentFontSize - 1)}
                title={t('缩小字号 (A-)', 'Decrease Font Size (A-)')}
                className="px-1.5 py-0.5 text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded"
              >
                A-
              </button>
              <select
                value={
                  FONT_SIZE_OPTIONS.includes(currentFontSize)
                    ? currentFontSize
                    : 12
                }
                onChange={(e) => applyFontSizePx(Number(e.target.value))}
                title={t('选择字号', 'Font Size')}
                className="bg-transparent text-[11px] font-mono font-bold text-blue-400 focus:outline-none cursor-pointer px-0.5"
              >
                {FONT_SIZE_OPTIONS.map((sz) => (
                  <option key={sz} value={sz} className="bg-zinc-900 text-zinc-100">
                    {sz}px
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => applyFontSizePx(currentFontSize + 1)}
                title={t('放大字号 (A+)', 'Increase Font Size (A+)')}
                className="px-1.5 py-0.5 text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded"
              >
                A+
              </button>
            </div>

            <div className="w-[1px] h-4 bg-zinc-700/80 mx-0.5" />

            {/* 2. Bold, Italic, Underline, Strikethrough */}
            <button
              type="button"
              onClick={() => applyExecCommand('bold')}
              title={t('加粗 (Bold)', 'Bold')}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyExecCommand('italic')}
              title={t('斜体 (Italic)', 'Italic')}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyExecCommand('underline')}
              title={t('下划线 (Underline)', 'Underline')}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
            >
              <Underline size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyExecCommand('strikeThrough')}
              title={t('删除线 (Strikethrough)', 'Strikethrough')}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
            >
              <Strikethrough size={13} />
            </button>

            <div className="w-[1px] h-4 bg-zinc-700/80 mx-0.5" />

            {/* 3. Text Color Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActivePopover(activePopover === 'color' ? null : 'color')
                }
                title={t('文字颜色', 'Text Color')}
                className={`p-1.5 rounded flex items-center gap-0.5 transition-colors ${
                  activePopover === 'color'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-zinc-800 text-zinc-200'
                }`}
              >
                <Palette size={13} />
              </button>

              {activePopover === 'color' && (
                <div
                  style={{
                    position: 'absolute',
                    top: toolbarPos.placeBelow ? '100%' : undefined,
                    bottom: toolbarPos.placeBelow ? undefined : '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: toolbarPos.placeBelow ? '6px' : undefined,
                    marginBottom: toolbarPos.placeBelow ? undefined : '6px',
                  }}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 shadow-xl flex items-center gap-1.5 z-50 max-w-[calc(100vw-32px)] overflow-x-auto"
                >
                  {TEXT_COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        applyExecCommand('foreColor', c);
                        setActivePopover(null);
                      }}
                      style={{ backgroundColor: c }}
                      className="w-4 h-4 rounded-full border border-white/30 hover:scale-110 transition-transform shrink-0"
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    defaultValue="#1d4ed8"
                    onChange={(e) => applyExecCommand('foreColor', e.target.value)}
                    title={t('自定义文字颜色', 'Custom Color')}
                    className="w-5 h-5 bg-transparent border-0 cursor-pointer shrink-0"
                  />
                </div>
              )}
            </div>

            {/* 4. Highlight Background Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActivePopover(
                    activePopover === 'highlight' ? null : 'highlight'
                  )
                }
                title={t('文字背景高亮', 'Highlight Background')}
                className={`p-1.5 rounded flex items-center gap-0.5 transition-colors ${
                  activePopover === 'highlight'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-zinc-800 text-zinc-200'
                }`}
              >
                <Highlighter size={13} />
              </button>

              {activePopover === 'highlight' && (
                <div
                  style={{
                    position: 'absolute',
                    top: toolbarPos.placeBelow ? '100%' : undefined,
                    bottom: toolbarPos.placeBelow ? undefined : '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: toolbarPos.placeBelow ? '6px' : undefined,
                    marginBottom: toolbarPos.placeBelow ? undefined : '6px',
                  }}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 shadow-xl flex items-center gap-1.5 z-50 max-w-[calc(100vw-32px)] overflow-x-auto"
                >
                  {HIGHLIGHT_COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        applyExecCommand(
                          'hiliteColor',
                          c === 'transparent' ? 'transparent' : c
                        );
                        setActivePopover(null);
                      }}
                      style={{
                        backgroundColor: c === 'transparent' ? '#27272a' : c,
                      }}
                      className="w-4 h-4 rounded border border-white/30 hover:scale-110 transition-transform shrink-0 flex items-center justify-center text-[9px] text-zinc-300"
                      title={c === 'transparent' ? t('无高亮', 'None') : c}
                    >
                      {c === 'transparent' ? '×' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-[1px] h-4 bg-zinc-700/80 mx-0.5" />

            {/* 5. Text Alignment */}
            <button
              type="button"
              onClick={() => applyBlockStyle('textAlign', 'left')}
              title={t('左对齐', 'Align Left')}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyBlockStyle('textAlign', 'center')}
              title={t('居中对齐', 'Align Center')}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyBlockStyle('textAlign', 'right')}
              title={t('右对齐', 'Align Right')}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
            >
              <AlignRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => applyBlockStyle('textAlign', 'justify')}
              title={t('两端对齐', 'Justify')}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
            >
              <AlignJustify size={13} />
            </button>

            {/* 6. Line Height Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActivePopover(
                    activePopover === 'lineHeight' ? null : 'lineHeight'
                  )
                }
                title={t('行距 (Line Height)', 'Line Spacing')}
                className={`p-1.5 rounded transition-colors ${
                  activePopover === 'lineHeight'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-zinc-800 text-zinc-200'
                }`}
              >
                <MoveVertical size={13} />
              </button>

              {activePopover === 'lineHeight' && (
                <div
                  style={{
                    position: 'absolute',
                    top: toolbarPos.placeBelow ? '100%' : undefined,
                    bottom: toolbarPos.placeBelow ? undefined : '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: toolbarPos.placeBelow ? '6px' : undefined,
                    marginBottom: toolbarPos.placeBelow ? undefined : '6px',
                  }}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-1.5 shadow-xl flex items-center gap-1 z-50 max-w-[calc(100vw-32px)] overflow-x-auto"
                >
                  {LINE_HEIGHT_OPTIONS.map((lh) => (
                    <button
                      key={lh}
                      type="button"
                      onClick={() => {
                        applyBlockStyle('lineHeight', lh);
                        setActivePopover(null);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-800 hover:bg-blue-600 text-zinc-200 hover:text-white"
                    >
                      {lh}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-[1px] h-4 bg-zinc-700/80 mx-0.5" />

            {/* 7. Clear Formatting */}
            <button
              type="button"
              onClick={handleClearFormatting}
              title={t('清除文字格式', 'Clear Formatting')}
              className="p-1.5 rounded hover:bg-red-950/80 text-zinc-400 hover:text-red-300 transition-colors"
            >
              <Eraser size={13} />
            </button>
          </div>,
          document.body
        )}
    </>
  );
};
