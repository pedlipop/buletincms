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
  Indent,
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

const TEXT_INDENT_OPTIONS = [
  { val: '0px', zh: '无 (0)', en: 'None' },
  { val: '1em', zh: '1字', en: '1em' },
  { val: '2em', zh: '2字', en: '2em' },
  { val: '3em', zh: '3字', en: '3em' },
  { val: '4em', zh: '4字', en: '4em' },
];

const BLOCK_PADDING_LEFT_OPTIONS = [
  { val: '0px', zh: '0px', en: '0px' },
  { val: '8px', zh: '8px', en: '8px' },
  { val: '14px', zh: '14px(对齐符号)', en: '14px(Icon)' },
  { val: '20px', zh: '20px', en: '20px' },
  { val: '28px', zh: '28px', en: '28px' },
];

const LETTER_SPACING_OPTIONS = [
  { val: '0px', zh: '标准', en: '0' },
  { val: '0.5px', zh: '0.5px', en: '0.5px' },
  { val: '1px', zh: '1px', en: '1px' },
  { val: '1.5px', zh: '1.5px', en: '1.5px' },
  { val: '2px', zh: '2px', en: '2px' },
  { val: '3px', zh: '3px', en: '3px' },
];

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
  const [currentTextIndent, setCurrentTextIndent] = useState<string>('0px');
  const [currentPaddingLeft, setCurrentPaddingLeft] = useState<string>('0px');
  const [currentLineHeight, setCurrentLineHeight] = useState<string>('1.6');
  const [currentLetterSpacing, setCurrentLetterSpacing] = useState<string>('0px');
  const [activePopover, setActivePopover] = useState<
    'color' | 'highlight' | 'lineHeight' | 'indent' | null
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
    const toolbarWidth = Math.min(480, window.innerWidth - 24);
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

    // Detect block wrapper styles
    const wrapper = el.querySelector(
      ':scope > div[data-fmt-block="1"]'
    ) as HTMLDivElement | null;
    const blockTarget = wrapper || el;
    setCurrentTextIndent(blockTarget.style.textIndent || (style?.textIndent as string) || '0px');
    setCurrentPaddingLeft(blockTarget.style.paddingLeft || (style?.paddingLeft as string) || '0px');
    setCurrentLineHeight(blockTarget.style.lineHeight || String(style?.lineHeight || '1.6'));
    setCurrentLetterSpacing(blockTarget.style.letterSpacing || (style?.letterSpacing as string) || '0px');
  }, [style?.letterSpacing, style?.lineHeight, style?.paddingLeft, style?.textIndent]);

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

  // Apply block-level style (text-align, line-height, text-indent, letter-spacing, padding-left) inside the EditableText
  const applyBlockStyle = (
    prop: 'textAlign' | 'lineHeight' | 'textIndent' | 'letterSpacing' | 'paddingLeft',
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
    // Also propagate to any inner paragraph divs so multi-paragraph blocks stay consistent
    const innerBlocks = wrapper.querySelectorAll('div, p');
    innerBlocks.forEach((child) => {
      (child as HTMLElement).style[prop] = val;
    });

    if (prop === 'textIndent') setCurrentTextIndent(val);
    if (prop === 'paddingLeft') setCurrentPaddingLeft(val);
    if (prop === 'lineHeight') setCurrentLineHeight(val);
    if (prop === 'letterSpacing') setCurrentLetterSpacing(val);

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
  const isNowrap = style?.whiteSpace === 'nowrap';

  if (previewMode) {
    const displayHtml = isNowrap
      ? value.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?(div|p)[^>]*>/gi, '')
      : value;

    return (
      <Tag
        style={{
          lineHeight: style?.lineHeight || '1.4',
          ...style,
          whiteSpace: isNowrap ? 'nowrap' : (style?.whiteSpace || 'pre-wrap'),
          wordBreak: isNowrap ? 'keep-all' : (style?.wordBreak || 'break-word'),
          overflowWrap: isNowrap ? 'normal' : (style?.overflowWrap || 'break-word'),
        }}
        className={className}
        dangerouslySetInnerHTML={{ __html: displayHtml }}
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
        onInput={(e: React.FormEvent<HTMLElement>) => {
          let nextHtml = e.currentTarget.innerHTML;
          if (isNowrap) {
            nextHtml = nextHtml.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?(div|p)[^>]*>/gi, '').trim();
          }
          if (nextHtml !== value) {
            onChange(nextHtml);
          }
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
        onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
          if (isNowrap) {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain').replace(/[\r\n]+/g, ' ');
            document.execCommand('insertText', false, text);
          }
        }}
        onBlur={(e: React.FocusEvent<HTMLElement>) => {
          let nextHtml = e.currentTarget.innerHTML;
          if (isNowrap) {
            nextHtml = nextHtml.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?(div|p)[^>]*>/gi, '').trim();
          }
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
          if (isNowrap && e.key === 'Enter') {
            e.preventDefault();
            return;
          }
          e.stopPropagation();
        }}
        style={{
          lineHeight: '1.4',
          cursor: 'text',
          caretColor: '#2563eb',
          outline: isFocused ? '1.5px dashed rgba(37, 99, 235, 0.75)' : undefined,
          outlineOffset: '2px',
          borderRadius: isFocused ? '2px' : undefined,
          ...style,
          whiteSpace: isNowrap ? 'nowrap' : (style?.whiteSpace || 'pre-wrap'),
          wordBreak: isNowrap ? 'keep-all' : (style?.wordBreak || 'break-word'),
          overflowWrap: isNowrap ? 'normal' : (style?.overflowWrap || 'break-word'),
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
            className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 text-zinc-100 rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.45)] px-2 py-1.5 flex items-center flex-wrap gap-1 select-none max-w-[calc(100vw-24px)]"
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
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 shadow-xl flex items-center gap-1.5 z-50"
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
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 shadow-xl flex items-center gap-1.5 z-50"
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

            <div className="w-[1px] h-4 bg-zinc-700/80 mx-0.5" />

            {/* 6. Quick First-Line Indent 2em + Paragraph Indent Popover */}
            <button
              type="button"
              onClick={() =>
                applyBlockStyle(
                  'textIndent',
                  currentTextIndent === '2em' ? '0px' : '2em'
                )
              }
              title={t('一键首行缩进 2字符 (2em)', 'Toggle 2-Char First-Line Indent (2em)')}
              className={`px-1.5 py-1 rounded flex items-center gap-0.5 text-[10px] font-bold transition-colors ${
                currentTextIndent === '2em'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-zinc-800 text-zinc-200 hover:text-white'
              }`}
            >
              <Indent size={12} />
              <span>{t('缩进2字', '2em')}</span>
            </button>

            {/* 7. Paragraph & Spacing Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActivePopover(
                    activePopover === 'lineHeight' ? null : 'lineHeight'
                  )
                }
                title={t('段落缩进、行距与字距设置', 'Paragraph Indent, Line & Letter Spacing')}
                className={`px-1.5 py-1 rounded flex items-center gap-0.5 text-[10px] font-bold transition-colors ${
                  activePopover === 'lineHeight'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-zinc-800 text-zinc-200 hover:text-white'
                }`}
              >
                <MoveVertical size={12} />
                <span>{t('段落', 'Para')}</span>
              </button>

              {activePopover === 'lineHeight' && (
                <div
                  style={{
                    position: 'absolute',
                    top: toolbarPos.placeBelow ? '100%' : undefined,
                    bottom: toolbarPos.placeBelow ? undefined : '100%',
                    right: 0,
                    marginTop: toolbarPos.placeBelow ? '6px' : undefined,
                    marginBottom: toolbarPos.placeBelow ? undefined : '6px',
                  }}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 shadow-2xl flex flex-col gap-2 z-50 w-[235px]"
                >
                  {/* First-line indent */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-zinc-400 flex justify-between">
                      <span>{t('首行缩进 (First-Line Indent)', 'First-Line Indent')}</span>
                      <span className="font-mono text-blue-400">{currentTextIndent}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {TEXT_INDENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => applyBlockStyle('textIndent', opt.val)}
                          className={`py-1 rounded text-[10px] font-semibold transition-colors ${
                            currentTextIndent === opt.val
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          }`}
                        >
                          {t(opt.zh, opt.en)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Block Left Indent */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-zinc-400 flex justify-between">
                      <span>{t('整段左缩进 (Block Indent)', 'Left Indent')}</span>
                      <span className="font-mono text-blue-400">{currentPaddingLeft}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {BLOCK_PADDING_LEFT_OPTIONS.map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => applyBlockStyle('paddingLeft', opt.val)}
                          className={`py-1 rounded text-[9.5px] font-semibold truncate px-0.5 transition-colors ${
                            currentPaddingLeft === opt.val
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          }`}
                          title={t(opt.zh, opt.en)}
                        >
                          {opt.val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Line Height */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-zinc-400 flex justify-between">
                      <span>{t('行距 (Line Height)', 'Line Spacing')}</span>
                      <span className="font-mono text-blue-400">{currentLineHeight}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1">
                      {LINE_HEIGHT_OPTIONS.map((lh) => (
                        <button
                          key={lh}
                          type="button"
                          onClick={() => applyBlockStyle('lineHeight', lh)}
                          className={`py-1 rounded text-[10px] font-mono font-semibold transition-colors ${
                            currentLineHeight === lh
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          }`}
                        >
                          {lh}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Letter Spacing */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-zinc-400 flex justify-between">
                      <span>{t('字间距 (Letter Spacing)', 'Letter Spacing')}</span>
                      <span className="font-mono text-blue-400">{currentLetterSpacing}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1">
                      {LETTER_SPACING_OPTIONS.map((ls) => (
                        <button
                          key={ls.val}
                          type="button"
                          onClick={() => applyBlockStyle('letterSpacing', ls.val)}
                          className={`py-1 rounded text-[9.5px] font-mono font-semibold transition-colors ${
                            currentLetterSpacing === ls.val
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          }`}
                        >
                          {t(ls.zh, ls.en)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-[1px] h-4 bg-zinc-700/80 mx-0.5" />

            {/* 8. Clear Formatting */}
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
