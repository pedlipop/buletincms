import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bold,
  FlipHorizontal,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Layers,
  LayoutGrid,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Upload,
} from 'lucide-react';
import {
  AspectRatioType,
  BadgeShapeType,
  BulletListBlock,
  BulletShapeType,
  ContainerBorderStyleType,
  ContainerPatternType,
  ContentBlock,
  CustomColumnsBlock,
  CustomFontItem,
  DatedEventBlock,
  FeatureCalloutGridBlock,
  FooterBannerBlock,
  FreeformAssetBlock,
  HighlightsBarBlock,
  ImageSlotData,
  IntroQuoteBoxBlock,
  KpiBannerCardBlock,
  KpiStatRowBlock,
  MastheadBlock,
  PhotoLayoutPreset,
  SectionContainerBlock,
  SimpleTextBlock,
  SplitMediaTextBlock,
  TwoColumnCardsBlock,
} from '../types/bulletin';
import {
  createCustomColumnItem,
  createImageSlot,
  SECTION_THEMES,
  uid,
} from '../data/presets';
import {
  findImageSlotInDocument,
  findImageSlotContext,
  useBulletinStore,
} from '../store/useBulletinStore';
import { compressImageFile } from './ImageSlot';
import { getPresetsForCount } from '../utils/photoLayout';

const ASPECT_RATIOS: AspectRatioType[] = [
  'free',
  '16:9',
  '4:3',
  '3:2',
  '1:1',
  '3:4',
];

const PRESET_FONTS = [
  { id: 'default', name: '系统默认 (Inter / 苹方)', family: "'Inter', system-ui, sans-serif" },
  { id: 'outfit', name: 'Outfit 几何现代标题', family: "'Outfit', sans-serif" },
  { id: 'playfair', name: 'Playfair 典雅衬线体', family: "'Playfair Display', serif" },
  { id: 'noto_sans', name: '思源黑体 (Noto Sans)', family: "'Noto Sans SC', sans-serif" },
  { id: 'noto_serif', name: '思源宋体 (Noto Serif)', family: "'Noto Serif SC', serif" },
  { id: 'roboto', name: 'Roboto 清爽黑体', family: "'Roboto', sans-serif" },
  { id: 'zcool', name: '站酷快乐体 (Artistic)', family: "'ZCOOL KuaiLe', cursive" },
  { id: 'fira', name: 'Fira Code 代码等宽', family: "'Fira Code', monospace" },
];

interface RangeSliderWithDefaultProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  defaultValue: number;
  onChange: (value: number) => void;
  unit?: string;
  className?: string;
  lang?: 'zh' | 'en';
}

const RangeSliderWithDefault: React.FC<RangeSliderWithDefaultProps> = ({
  min,
  max,
  step = 1,
  value,
  defaultValue,
  onChange,
  unit = '',
  className = 'flex-1',
  lang = 'zh',
}) => {
  const pct = Math.max(
    0,
    Math.min(100, ((defaultValue - min) / (max - min)) * 100)
  );
  const isAtDefault = Math.abs(value - defaultValue) < step * 0.4;

  return (
    <div
      className={`relative flex items-center py-1.5 select-none ${className}`}
      title={
        lang === 'zh'
          ? `默认值: ${defaultValue}${unit}（双击滑块或点击刻度线重置）`
          : `Default: ${defaultValue}${unit} (Double-click or click line to reset)`
      }
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onDoubleClick={() => onChange(defaultValue)}
        className="w-full accent-blue-500 cursor-pointer relative z-10"
      />
      {/* Default Value Vertical Line Indicator */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange(defaultValue);
        }}
        style={{
          left: `calc(${pct}% + ${7 - pct * 0.14}px)`,
        }}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group/tick flex flex-col items-center pointer-events-auto cursor-pointer focus:outline-none"
        title={
          lang === 'zh'
            ? `点击恢复默认值 (${defaultValue}${unit})`
            : `Reset to default (${defaultValue}${unit})`
        }
      >
        <span
          className={`w-[2px] h-4 rounded-full transition-colors ${
            isAtDefault
              ? 'bg-amber-400/90 shadow-[0_0_4px_rgba(251,191,36,0.8)]'
              : 'bg-zinc-300/80 group-hover/tick:bg-amber-400'
          }`}
        />
      </button>
    </div>
  );
};

export const RightInspector: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameOverlayInputRef = useRef<HTMLInputElement>(null);
  const listCustomBulletInputRef = useRef<HTMLInputElement>(null);
  const sectionBadgeAssetInputRef = useRef<HTMLInputElement>(null);
  const sectionBulletAssetInputRef = useRef<HTMLInputElement>(null);
  const containerBgInputRef = useRef<HTMLInputElement>(null);
  const cornerStickerInputRef = useRef<HTMLInputElement>(null);
  const fontReaderInputRef = useRef<HTMLInputElement>(null);
  const [isTextToolOpen, setIsTextToolOpen] = useState(false);
  const [manualFontSize, setManualFontSize] = useState<number>(14);
  const [customTextColor, setCustomTextColor] = useState<string>('#2563eb');
  const [customHiliteColor, setCustomHiliteColor] = useState<string>('#fef08a');
  const lastActiveEditableRef = useRef<HTMLElement | null>(null);
  const lastRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      const active = document.activeElement as HTMLElement | null;
      if (active && active.isContentEditable) {
        lastActiveEditableRef.current = active;
      }
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const el = (container.nodeType === 1 ? container : container.parentElement) as HTMLElement | null;
        if (el && el.closest('[contenteditable="true"]')) {
          lastRangeRef.current = range.cloneRange();
          lastActiveEditableRef.current = el.closest('[contenteditable="true"]') as HTMLElement;
        }
      }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const [imageSlotTab, setImageSlotTab] = useState<'size' | 'frame' | 'crop'>('size');
  const [isFrameDetailsOpen, setIsFrameDetailsOpen] = useState(false);

  const customFonts = useBulletinStore((s) => s.customFonts);
  const addCustomFont = useBulletinStore((s) => s.addCustomFont);

  const [containerTab, setContainerTab] = useState<'style' | 'icons' | 'bg'>(
    'style'
  );

  const lang = useBulletinStore((s) => s.lang);
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);

  const doc = useBulletinStore((s) => s.getActiveDoc());
  const selectedRootBlockId = useBulletinStore((s) => s.selectedRootBlockId);
  const selectedChildBlockId = useBulletinStore((s) => s.selectedChildBlockId);
  const selectedImageSlotId = useBulletinStore((s) => s.selectedImageSlotId);

  const updateDocumentMeta = useBulletinStore((s) => s.updateDocumentMeta);
  const updateRootBlock = useBulletinStore((s) => s.updateRootBlock);
  const updateContentBlock = useBulletinStore((s) => s.updateContentBlock);
  const updateImageSlotById = useBulletinStore((s) => s.updateImageSlotById);
  const selectImageSlot = useBulletinStore((s) => s.selectImageSlot);
  const selectBlock = useBulletinStore((s) => s.selectBlock);
  const addCustomAsset = useBulletinStore((s) => s.addCustomAsset);
  const applyAllGreyWireframeTheme = useBulletinStore(
    (s) => s.applyAllGreyWireframeTheme
  );
  const applySampleColorPalettes = useBulletinStore(
    (s) => s.applySampleColorPalettes
  );
  const applyFrameSettingsToGroup = useBulletinStore(
    (s) => s.applyFrameSettingsToGroup
  );

  const [syncAllFramesInBlock, setSyncAllFramesInBlock] = useState(true);

  const selectedRoot =
    doc.rootBlocks.find((b) => b.id === selectedRootBlockId) || null;

  const selectedChild: ContentBlock | null =
    selectedRoot &&
    selectedRoot.type === 'section_container' &&
    selectedChildBlockId
      ? selectedRoot.children.find((c) => c.id === selectedChildBlockId) || null
      : null;

  const selectedImageSlot = findImageSlotInDocument(doc, selectedImageSlotId);
  const slotContext = findImageSlotContext(doc, selectedImageSlotId);
  const effectiveParentBlock = selectedChild || slotContext.childBlock;
  const effectiveRootBlock = selectedRoot || slotContext.rootBlock;

  const updateSelectedSlotWithSync = (patch: Partial<ImageSlotData>) => {
    if (!selectedImageSlot) return;
    updateImageSlotById(selectedImageSlot.id, patch);
    if (syncAllFramesInBlock) {
      applyFrameSettingsToGroup(selectedImageSlot.id, 'block', patch);
    }
  };

  const cleanFileName = (file: File, fallback: string) =>
    file.name.replace(/\.[^/.]+$/, '').slice(0, 24) || fallback;

  const handleUploadForSelectedSlot = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedImageSlot) return;
    const dataUrl = await compressImageFile(file);
    addCustomAsset(cleanFileName(file, 'Photo'), 'photo', dataUrl);
    updateImageSlotById(selectedImageSlot.id, { url: dataUrl });
    e.target.value = '';
  };

  const handleUploadFrameOverlay = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedImageSlot) return;
    const dataUrl = await compressImageFile(file);
    addCustomAsset(cleanFileName(file, 'Frame PNG'), 'frame', dataUrl);
    updateImageSlotById(selectedImageSlot.id, {
      frameOverlayUrl: dataUrl,
      frameAssetLayer: selectedImageSlot.frameAssetLayer || 'behind',
    });
    e.target.value = '';
  };

  const handleUploadContainerBg = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoot || selectedRoot.type !== 'section_container') return;
    const dataUrl = await compressImageFile(file);
    addCustomAsset(cleanFileName(file, 'Container Bg'), 'background', dataUrl);
    updateRootBlock(selectedRoot.id, (prev) => {
      const sec = prev as SectionContainerBlock;
      const existingSlot =
        sec.bgImage || createImageSlot('free', 'CONTAINER BG ASSET');
      return {
        ...sec,
        bgImage: { ...existingSlot, url: dataUrl },
      };
    });
    e.target.value = '';
  };

  const handleUploadSectionBadgeAsset = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoot || selectedRoot.type !== 'section_container') return;
    const dataUrl = await compressImageFile(file);
    addCustomAsset(cleanFileName(file, 'Badge Icon'), 'badge', dataUrl);
    updateRootBlock(selectedRoot.id, (prev) => {
      const sec = prev as SectionContainerBlock;
      return {
        ...sec,
        badgeCustomUrl: dataUrl,
        badgeShape: 'custom_only',
        sectionNumber: sec.sectionNumber || '1',
      };
    });
    e.target.value = '';
  };

  const handleUploadSectionBulletAsset = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoot || selectedRoot.type !== 'section_container') return;
    const dataUrl = await compressImageFile(file);
    addCustomAsset(cleanFileName(file, 'Bullet Icon'), 'bullet', dataUrl);
    updateRootBlock(selectedRoot.id, (prev) => ({
      ...prev,
      bulletCustomUrl: dataUrl,
      bulletShape: 'custom',
    } as SectionContainerBlock));
    e.target.value = '';
  };

  const handleUploadCornerSticker = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoot || selectedRoot.type !== 'section_container') return;
    const dataUrl = await compressImageFile(file);
    addCustomAsset(cleanFileName(file, 'Corner Sticker'), 'sticker', dataUrl);
    updateRootBlock(selectedRoot.id, (prev) => ({
      ...prev,
      cornerStickerUrl: dataUrl,
    } as SectionContainerBlock));
    e.target.value = '';
  };

  const handleFontFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fontName = file.name.replace(/\.[^/.]+$/, '').trim() || 'CustomFont';
      const buffer = await file.arrayBuffer();
      const fontFace = new FontFace(fontName, buffer);
      const loadedFont = await fontFace.load();
      document.fonts.add(loadedFont);

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        addCustomFont({
          id: 'font_' + Date.now(),
          name: fontName,
          family: fontName,
          source: 'custom',
          url: dataUrl,
        });
        updateDocumentMeta({ fontFamily: fontName });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to load font file:', err);
      window.alert(
        t(
          '字体文件解析失败，请上传标准的 .ttf / .otf / .woff 格式。',
          'Failed to load font. Please use standard .ttf, .otf, or .woff.'
        )
      );
    }
    e.target.value = '';
  };

  const restoreTextSelection = (): HTMLElement | null => {
    const el = lastActiveEditableRef.current;
    if (!el || !document.body.contains(el)) return null;
    el.focus();
    const sel = window.getSelection();
    if (sel) {
      if (
        lastRangeRef.current &&
        el.contains(lastRangeRef.current.commonAncestorContainer)
      ) {
        sel.removeAllRanges();
        sel.addRange(lastRangeRef.current);
      } else {
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    return el;
  };

  const execCmd = (command: string, value: string = '') => {
    restoreTextSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, value);
    const activeEl =
      lastActiveEditableRef.current ||
      (document.activeElement as HTMLElement | null);
    if (activeEl && activeEl.isContentEditable) {
      activeEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const formatFontSize = (px: number) => {
    const clamped = Math.max(8, Math.min(96, Math.round(px)));
    setManualFontSize(clamped);

    const activeEl =
      restoreTextSelection() || (document.activeElement as HTMLElement | null);
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const isEditable = activeEl && activeEl.isContentEditable;
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('fontSize', false, '7');

    const container = isEditable ? activeEl : document.body;
    const fonts = container.querySelectorAll('font[size="7"]');
    fonts.forEach((fontEl) => {
      const span = document.createElement('span');
      span.style.fontSize = `${clamped}px`;
      span.innerHTML = fontEl.innerHTML;
      fontEl.parentNode?.replaceChild(span, fontEl);
    });

    if (isEditable) {
      activeEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return (
    <aside className="w-full md:w-[310px] bg-zinc-900 border-l border-zinc-800 flex flex-col h-full select-none shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
          <Sliders size={13} className="text-zinc-400" />
          <span>{t('属性面板', 'Inspector')}</span>
        </div>
        {selectedImageSlot ? (
          <button
            type="button"
            onClick={() => selectImageSlot(null)}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
          >
            <ArrowLeft size={12} />
            <span>{t('返回组件', 'Back')}</span>
          </button>
        ) : selectedChild && selectedRoot ? (
          <button
            type="button"
            onClick={() => selectBlock(selectedRoot.id, null)}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
          >
            <ArrowLeft size={12} />
            <span>{t('容器设置', 'Container')}</span>
          </button>
        ) : null}
      </div>

      <div className="p-3 space-y-4">
        {/* ========================================================= */}
        {/* TEXT ADJUSTMENT TOOL & FONT READER (Hidden when Photo Selected) */}
        {/* ========================================================= */}
        {!selectedImageSlot && (
          <div className="bg-zinc-800/90 border border-zinc-700/80 rounded-xl p-3.5 space-y-3.5 shadow-md">
            {/* Header: Foldable Title + Import Font */}
            <div className="flex items-center justify-between border-b border-zinc-700/70 pb-2.5">
              <button
                type="button"
                onClick={() => setIsTextToolOpen(!isTextToolOpen)}
                className="flex items-center gap-2 text-xs font-bold text-white hover:text-amber-300 transition-colors"
              >
                <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-serif text-xs font-bold">
                  T
                </div>
                <span>{t('文本排版调节与字库', 'Text & Typography')}</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  {isTextToolOpen ? '▾' : '▸'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => fontReaderInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-700/80 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold border border-zinc-600 shadow-sm transition-all hover:scale-105 active:scale-95"
                title={t('导入本地字体文件 (.ttf / .otf / .woff)', 'Import Font File (.ttf/.otf/.woff)')}
              >
                <Upload size={12} />
                <span>{t('导入字体', 'Import Font')}</span>
              </button>
            </div>

            <input
              ref={fontReaderInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={handleFontFileUpload}
              className="hidden"
            />

            {isTextToolOpen && (
              <div className="space-y-3.5 pt-0.5">
                {/* 1. Global Font Family */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                    <span>{t('全局排版字体', 'Font Family')}</span>
                    <span className="font-mono text-[10px] text-zinc-500 truncate max-w-[130px]">
                      {doc.fontFamily || t('系统默认', 'Default')}
                    </span>
                  </div>
                  <select
                    value={doc.fontFamily || ''}
                    onChange={(e) => updateDocumentMeta({ fontFamily: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 hover:border-zinc-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-amber-400 transition-colors cursor-pointer"
                  >
                    <option value="">{t('系统默认黑体 (Inter / 苹方)', 'System Default (Inter)')}</option>
                    <optgroup label={t('精选字体预设', 'Curated Web Fonts')}>
                      {PRESET_FONTS.map((f) => (
                        <option key={f.id} value={f.family}>
                          {f.name}
                        </option>
                      ))}
                    </optgroup>
                    {customFonts.length > 0 && (
                      <optgroup label={t('已导入字库 (Font Reader)', 'Imported Custom Fonts')}>
                        {customFonts.map((f) => (
                          <option key={f.id} value={f.family}>
                            ★ {f.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* 2. Style & Alignment Toolbar */}
                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400 font-medium">
                    {t('快捷文字样式与对齐', 'Style & Alignment')}
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCmd('bold');
                      }}
                      className="flex-1 h-8 rounded-md bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center font-bold text-xs transition-colors"
                      title={t('加粗 (Bold)', 'Bold')}
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCmd('italic');
                      }}
                      className="flex-1 h-8 rounded-md bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center text-xs transition-colors"
                      title={t('斜体 (Italic)', 'Italic')}
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCmd('underline');
                      }}
                      className="flex-1 h-8 rounded-md bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center text-xs transition-colors"
                      title={t('下划线 (Underline)', 'Underline')}
                    >
                      <Underline size={13} />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCmd('strikeThrough');
                      }}
                      className="flex-1 h-8 rounded-md bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center text-xs transition-colors"
                      title={t('删除线', 'Strikethrough')}
                    >
                      <Strikethrough size={13} />
                    </button>

                    <div className="h-5 w-px bg-zinc-800 mx-0.5" />

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCmd('justifyLeft');
                      }}
                      className="h-8 w-8 rounded-md bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                      title={t('左对齐', 'Align Left')}
                    >
                      <AlignLeft size={13} />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCmd('justifyCenter');
                      }}
                      className="h-8 w-8 rounded-md bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                      title={t('居中对齐', 'Align Center')}
                    >
                      <AlignCenter size={13} />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCmd('justifyRight');
                      }}
                      className="h-8 w-8 rounded-md bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                      title={t('右对齐', 'Align Right')}
                    >
                      <AlignRight size={13} />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCmd('justifyFull');
                      }}
                      className="h-8 w-8 rounded-md bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                      title={t('两端对齐', 'Justify')}
                    >
                      <AlignJustify size={13} />
                    </button>
                  </div>
                </div>

                {/* 3. Manual Font Size Setting & Quick Presets */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                    <span>{t('选区字号精确调节', 'Font Size (Manual & Quick)')}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">px</span>
                  </div>

                  {/* Stepper + Manual Input */}
                  <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg p-1.5">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const next = Math.max(8, manualFontSize - 1);
                        formatFontSize(next);
                      }}
                      className="w-7 h-7 rounded bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                      title={t('字号减小 (-1px)', 'Decrease Size (-1px)')}
                    >
                      <Minus size={13} />
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min={8}
                        max={96}
                        value={manualFontSize}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setManualFontSize(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            formatFontSize(manualFontSize);
                          }
                        }}
                        onBlur={() => {
                          formatFontSize(manualFontSize);
                        }}
                        className="w-14 h-7 text-center font-mono font-bold bg-zinc-900 border border-zinc-700 rounded text-amber-300 focus:border-amber-400 outline-none text-xs"
                        title={t('输入任意字号数值，回车即时生效', 'Type exact size & press Enter')}
                      />
                      <span className="text-[10px] text-zinc-500 font-mono">px</span>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const next = Math.min(96, manualFontSize + 1);
                        formatFontSize(next);
                      }}
                      className="w-7 h-7 rounded bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                      title={t('字号增大 (+1px)', 'Increase Size (+1px)')}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="grid grid-cols-8 gap-1">
                    {[12, 14, 16, 18, 20, 24, 28, 32].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          formatFontSize(s);
                        }}
                        className={`h-6 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                          manualFontSize === s
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 shadow-sm'
                            : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Text Color - Large Swatches + Custom Picker */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                    <span>{t('文字颜色', 'Text Color')}</span>
                    <span className="text-[10px] text-zinc-500">
                      {t('选中文字后点击', 'Select text to apply')}
                    </span>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2">
                    {[
                      { color: '#18181b', name: 'Black' },
                      { color: '#64748b', name: 'Slate' },
                      { color: '#ffffff', name: 'White' },
                      { color: '#2563eb', name: 'Blue' },
                      { color: '#0284c7', name: 'Cyan' },
                      { color: '#16a34a', name: 'Green' },
                      { color: '#ea580c', name: 'Orange' },
                      { color: '#dc2626', name: 'Red' },
                      { color: '#7c3aed', name: 'Purple' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          execCmd('foreColor', c.color);
                        }}
                        style={{ backgroundColor: c.color }}
                        className="w-6 h-6 rounded-full border border-zinc-600 hover:border-white hover:scale-110 active:scale-95 transition-all shadow-sm cursor-pointer relative"
                        title={`${c.name}: ${c.color}`}
                      />
                    ))}

                    {/* Custom Color Trigger */}
                    <label
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 hover:border-amber-400 cursor-pointer transition-colors"
                      title={t('自选任意颜色', 'Custom Color Picker')}
                    >
                      <input
                        type="color"
                        value={customTextColor}
                        onChange={(e) => {
                          setCustomTextColor(e.target.value);
                          execCmd('foreColor', e.target.value);
                        }}
                        className="w-4 h-4 rounded-full border-0 bg-transparent cursor-pointer p-0"
                      />
                      <span className="text-[10px] text-zinc-300 font-medium">{t('自选', 'Custom')}</span>
                    </label>
                  </div>
                </div>

                {/* 5. Highlight Background */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                    <span>{t('荧光高亮背景', 'Highlight Background')}</span>
                  </div>

                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCmd('hiliteColor', 'transparent');
                      }}
                      className="h-6 px-2 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      title={t('清除高亮背景', 'Clear Highlight')}
                    >
                      <span>✕</span>
                      <span>{t('清除', 'Clear')}</span>
                    </button>

                    {[
                      { color: '#fef08a', name: 'Yellow' },
                      { color: '#bbf7d0', name: 'Mint' },
                      { color: '#bae6fd', name: 'Sky' },
                      { color: '#fecdd3', name: 'Rose' },
                      { color: '#e9d5ff', name: 'Lavender' },
                    ].map((hc) => (
                      <button
                        key={hc.color}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          execCmd('hiliteColor', hc.color);
                        }}
                        style={{ backgroundColor: hc.color }}
                        className="w-6 h-6 rounded-md border border-zinc-600 hover:border-white hover:scale-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                        title={`Highlight: ${hc.name}`}
                      />
                    ))}

                    <label
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 hover:border-amber-400 cursor-pointer transition-colors"
                      title={t('自定义高亮色', 'Custom Highlight')}
                    >
                      <input
                        type="color"
                        value={customHiliteColor}
                        onChange={(e) => {
                          setCustomHiliteColor(e.target.value);
                          execCmd('hiliteColor', e.target.value);
                        }}
                        className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer p-0"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 1. SELECTED IMAGE SLOT & PHOTO FRAME INSPECTOR            */}
        {/* ========================================================= */}
        {selectedImageSlot ? (
          <div className="bg-zinc-800/80 border border-blue-500/40 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-700/70 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <ImageIcon size={14} className="text-blue-400" />
                <span>{t('图片与画框设置', 'Photo & Frame')}</span>
              </div>
              <span className="text-[10px] text-zinc-400 truncate max-w-[110px]">
                {selectedImageSlot.label || 'IMAGE'}
              </span>
            </div>

            {/* Photo Layout Presets & Add Photo (Displayed when clicking the photo!) */}
            {effectiveParentBlock && effectiveParentBlock.type === 'dated_event_block' && (() => {
              const b = effectiveParentBlock as DatedEventBlock;
              const photoCount = b.images.length;
              const availablePresets = getPresetsForCount(photoCount);
              let effectivePreset: PhotoLayoutPreset = b.layoutPreset || 'auto';
              if (effectivePreset === 'auto') {
                if (photoCount === 6) {
                  effectivePreset = b.gridColumns === 4 ? '4_plus_2' : b.gridColumns === 2 ? '2x3' : '3x2';
                } else if (photoCount === 4) {
                  effectivePreset = b.fitLastToMargin || b.gridColumns === 3 ? '3_plus_1' : b.gridColumns === 2 ? '2x2' : '3_plus_1';
                } else if (photoCount === 3) {
                  effectivePreset = b.fitLastToMargin || b.gridColumns === 2 ? '2_plus_1' : '3_cols';
                } else if (photoCount === 5) {
                  effectivePreset = '3_plus_2';
                } else if (availablePresets[0]) {
                  effectivePreset = availablePresets[0].id;
                }
              }

              const handleAddPhotoFromSlot = () => {
                if (!effectiveRootBlock) return;
                updateContentBlock(effectiveRootBlock.id, b.id, (prev) => {
                  const cur = prev as DatedEventBlock;
                  const nextImgs = [
                    ...cur.images,
                    createImageSlot(
                      selectedImageSlot.aspectRatio || cur.imageAspectRatio || '4:3',
                      `PHOTO ${cur.images.length + 1}`,
                      null
                    ),
                  ];
                  let nextPreset = cur.layoutPreset;
                  if (nextImgs.length === 4 && (!nextPreset || nextPreset === 'auto')) {
                    nextPreset = '2x2';
                  } else if (nextImgs.length === 6 && (!nextPreset || nextPreset === 'auto')) {
                    nextPreset = '3x2';
                  }
                  return {
                    ...cur,
                    images: nextImgs,
                    showImages: true,
                    layoutPreset: nextPreset,
                    fitLastToMargin: true,
                  };
                });
              };

              return (
                <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <LayoutGrid size={13} className="text-blue-400" />
                      <span>{t('配图排版方案预设', 'Photo Layout Presets')}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                        {photoCount} {t('图', 'pics')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPhotoFromSlot}
                      className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold transition"
                    >
                      <Plus size={11} />
                      <span>{t('添加图片', 'Add Photo')}</span>
                    </button>
                  </div>

                  {availablePresets.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {availablePresets.map((preset) => {
                        const isCur = effectivePreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              if (!effectiveRootBlock) return;
                              let targetCols: 1 | 2 | 3 | 4 = 3;
                              let fitMargin = false;
                              if (preset.id === '1_col') targetCols = 1;
                              else if (preset.id === '2_cols' || preset.id === '2x2' || preset.id === '2x3' || preset.id === '2_plus_1' || preset.id === '2_plus_3') targetCols = 2;
                              else if (preset.id === '3_cols' || preset.id === '3x2' || preset.id === '3_plus_1' || preset.id === '3_plus_2') targetCols = 3;
                              else if (preset.id === '4_cols' || preset.id === '4_plus_2' || preset.id === '4_plus_1') targetCols = 4;
                              if (preset.rows.length > 1 && preset.rows[preset.rows.length - 1] < preset.rows[0]) {
                                fitMargin = true;
                              }
                              updateContentBlock(effectiveRootBlock.id, b.id, (prev) => ({
                                ...prev,
                                layoutPreset: preset.id,
                                gridColumns: targetCols,
                                fitLastToMargin: fitMargin,
                                showImages: true,
                              } as DatedEventBlock));
                            }}
                            className={`p-1.5 rounded-md border text-left flex flex-col justify-between transition-all duration-150 active:scale-95 hover:scale-[1.02] ${
                              isCur
                                ? 'bg-blue-950/70 border-blue-500 shadow-md ring-1 ring-blue-500/50 text-white'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80 text-zinc-300'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span className="font-bold text-[10.5px] truncate">{t(preset.labelZh, preset.labelEn)}</span>
                              {preset.isRecommended && (
                                <span className="text-[8px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded border border-blue-500/30">
                                  {t('推荐', 'Fit')}
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-zinc-950 p-1 rounded border border-zinc-800/80 space-y-0.5">
                              {preset.rows.map((rowCols, rIdx) => (
                                <div key={rIdx} className="flex gap-0.5 w-full">
                                  {Array.from({ length: rowCols }).map((_, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className={`h-1.5 rounded-xs flex-1 ${isCur ? 'bg-blue-400' : 'bg-zinc-600'}`}
                                    />
                                  ))}
                                </div>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Batch Sync Toolbar (Applies frame settings to all frames) */}
            <div className="bg-zinc-950/90 p-2 rounded-lg border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-200 select-none">
                  <input
                    type="checkbox"
                    checked={syncAllFramesInBlock}
                    onChange={(e) => setSyncAllFramesInBlock(e.target.checked)}
                    className="rounded accent-blue-500"
                  />
                  <span>{t('同步修改本组所有画框', 'Sync style to all photos in block')}</span>
                </label>
              </div>
              <div className="flex items-center gap-1 pt-1 border-t border-zinc-800/80 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    applyFrameSettingsToGroup(selectedImageSlot.id, 'block', selectedImageSlot);
                  }}
                  className="flex-1 py-1 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-blue-300 hover:text-blue-200 border border-zinc-700/80 rounded font-medium transition text-center"
                  title={t('应用当前选中的画框风格与比例到本模块所有图片', 'Apply frame style to all images in block')}
                >
                  {t('应用到本模块所有画框', 'Apply to Block')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyFrameSettingsToGroup(selectedImageSlot.id, 'container', selectedImageSlot);
                  }}
                  className="flex-1 py-1 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 rounded font-medium transition text-center"
                  title={t('应用当前选中的画框风格与比例到本容器所有图片', 'Apply frame style to all images in container')}
                >
                  {t('应用到本容器', 'To Container')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyFrameSettingsToGroup(selectedImageSlot.id, 'doc', selectedImageSlot);
                  }}
                  className="py-1 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/80 rounded font-medium transition text-center"
                  title={t('应用当前选中的画框风格与比例到全简报所有图片', 'Apply frame style to all images in bulletin')}
                >
                  {t('全简报', 'All')}
                </button>
              </div>
            </div>

            {/* 3 Tab Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setImageSlotTab('size')}
                className={`py-1 rounded text-center transition-colors ${
                  imageSlotTab === 'size'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t('尺寸比例', 'Size & Ratio')}
              </button>
              <button
                type="button"
                onClick={() => setImageSlotTab('frame')}
                className={`py-1 rounded text-center transition-colors ${
                  imageSlotTab === 'frame'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t('画框预设', 'Frame Style')}
              </button>
              <button
                type="button"
                onClick={() => setImageSlotTab('crop')}
                className={`py-1 rounded text-center transition-colors ${
                  imageSlotTab === 'crop'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t('画面调节', 'Crop & Pan')}
              </button>
            </div>

            {/* TAB 1: SIZE & RATIO */}
            {imageSlotTab === 'size' && (
              <div className="space-y-3">
                {/* Upload & Clear Actions */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadForSelectedSlot}
                  className="hidden"
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Upload size={12} />
                    <span>
                      {selectedImageSlot.url
                        ? t('更换图片', 'Replace Photo')
                        : t('上传图片', 'Upload Photo')}
                    </span>
                  </button>
                  {selectedImageSlot.url && (
                    <button
                      type="button"
                      onClick={() =>
                        updateImageSlotById(selectedImageSlot.id, {
                          url: null,
                          zoom: 1,
                          focalPoint: { x: 50, y: 50 },
                        })
                      }
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-700 rounded text-xs transition-colors"
                    >
                      {t('清除', 'Clear')}
                    </button>
                  )}
                </div>

                {/* Aspect Ratio */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-zinc-400">
                      {t('画幅比例', 'Aspect Ratio')}
                    </label>
                    {syncAllFramesInBlock && (
                      <span className="text-[9px] text-blue-400 font-medium">
                        {t('同步应用于本组', 'Syncing to block')}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-6 gap-0.5 bg-zinc-950 p-0.5 rounded border border-zinc-800">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() =>
                          updateSelectedSlotWithSync({
                            aspectRatio: ratio,
                          })
                        }
                        className={`py-1 rounded text-[10px] font-bold transition-colors ${
                          selectedImageSlot.aspectRatio === ratio
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {ratio === 'free' ? t('自由', 'Free') : ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Picture Frame Size & Alignment */}
                <div className="bg-zinc-900/90 border border-zinc-700/80 rounded p-2.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-200">
                      {t('画框尺寸与对齐', 'Frame Size & Alignment')}
                    </span>
                    {((selectedImageSlot.frameWidthMode && selectedImageSlot.frameWidthMode !== 'full') ||
                      selectedImageSlot.frameHeightMode === 'custom_px' ||
                      (selectedImageSlot.frameAlign && selectedImageSlot.frameAlign !== 'center')) && (
                      <button
                        type="button"
                        onClick={() =>
                          updateImageSlotById(selectedImageSlot.id, {
                            frameWidthMode: 'full',
                            frameHeightMode: 'aspect',
                            frameAlign: 'center',
                            frameCustomWidthPx: undefined,
                            frameCustomHeightPx: undefined,
                          })
                        }
                        className="flex items-center gap-1 text-[9px] text-amber-300 hover:text-amber-200 font-semibold"
                      >
                        <RotateCcw size={9} />
                        <span>{t('重置尺寸', 'Reset')}</span>
                      </button>
                    )}
                  </div>

                  {/* Frame Width Modes */}
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                      {t('画框宽度', 'Frame Width')}
                    </label>
                    <div className="grid grid-cols-4 gap-0.5 bg-zinc-950 p-0.5 rounded border border-zinc-800">
                      {(
                        [
                          { mode: 'full', label: '100%' },
                          { mode: '75%', label: '75%' },
                          { mode: '50%', label: '50%' },
                          { mode: 'custom_px', label: t('自定', 'Custom') },
                        ] as const
                      ).map((item) => {
                        const isSelectedMode =
                          (selectedImageSlot.frameWidthMode || 'full') === item.mode;
                        return (
                          <button
                            key={item.mode}
                            type="button"
                            onClick={() =>
                              updateImageSlotById(selectedImageSlot.id, {
                                frameWidthMode: item.mode,
                                frameCustomWidthPx:
                                  item.mode === 'custom_px'
                                    ? selectedImageSlot.frameCustomWidthPx || 320
                                    : selectedImageSlot.frameCustomWidthPx,
                              })
                            }
                            className={`py-1 rounded text-[10px] font-bold transition-colors ${
                              isSelectedMode
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    {selectedImageSlot.frameWidthMode === 'custom_px' && (
                      <div className="mt-2 flex items-center gap-2 bg-zinc-950 p-1.5 rounded border border-zinc-800 text-xs">
                        <span className="text-[10px] text-zinc-400 shrink-0">W:</span>
                        <input
                          type="range"
                          min={80}
                          max={800}
                          step={10}
                          value={selectedImageSlot.frameCustomWidthPx || 320}
                          onChange={(e) =>
                            updateImageSlotById(selectedImageSlot.id, {
                              frameWidthMode: 'custom_px',
                              frameCustomWidthPx: Number(e.target.value),
                            })
                          }
                          className="flex-1 h-1.5 bg-zinc-800 rounded accent-blue-500 cursor-pointer"
                        />
                        <span className="font-mono text-[10px] text-zinc-200 min-w-[40px] text-right">
                          {selectedImageSlot.frameCustomWidthPx || 320}px
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Frame Height Mode */}
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                      {t('画框高度', 'Frame Height')}
                    </label>
                    <div className="grid grid-cols-2 gap-0.5 bg-zinc-950 p-0.5 rounded border border-zinc-800">
                      <button
                        type="button"
                        onClick={() =>
                          updateImageSlotById(selectedImageSlot.id, {
                            frameHeightMode: 'aspect',
                          })
                        }
                        className={`py-1 rounded text-[10px] font-bold transition-colors ${
                          (selectedImageSlot.frameHeightMode || 'aspect') === 'aspect'
                            ? 'bg-blue-600 text-white'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {t('画幅比例联动', 'By Ratio')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateImageSlotById(selectedImageSlot.id, {
                            frameHeightMode: 'custom_px',
                            frameCustomHeightPx: selectedImageSlot.frameCustomHeightPx || 200,
                          })
                        }
                        className={`py-1 rounded text-[10px] font-bold transition-colors ${
                          selectedImageSlot.frameHeightMode === 'custom_px'
                            ? 'bg-blue-600 text-white'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {t('固定像素高度', 'Fixed (px)')}
                      </button>
                    </div>

                    {selectedImageSlot.frameHeightMode === 'custom_px' && (
                      <div className="mt-2 flex items-center gap-2 bg-zinc-950 p-1.5 rounded border border-zinc-800 text-xs">
                        <span className="text-[10px] text-zinc-400 shrink-0">H:</span>
                        <input
                          type="range"
                          min={60}
                          max={600}
                          step={10}
                          value={selectedImageSlot.frameCustomHeightPx || 200}
                          onChange={(e) =>
                            updateImageSlotById(selectedImageSlot.id, {
                              frameHeightMode: 'custom_px',
                              frameCustomHeightPx: Number(e.target.value),
                            })
                          }
                          className="flex-1 h-1.5 bg-zinc-800 rounded accent-blue-500 cursor-pointer"
                        />
                        <span className="font-mono text-[10px] text-zinc-200 min-w-[40px] text-right">
                          {selectedImageSlot.frameCustomHeightPx || 200}px
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Frame Alignment */}
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                      {t('画框对齐方式', 'Alignment')}
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { align: 'left', icon: AlignLeft, label: t('居左', 'Left') },
                          { align: 'center', icon: AlignCenter, label: t('居中', 'Center') },
                          { align: 'right', icon: AlignRight, label: t('居右', 'Right') },
                        ] as const
                      ).map((item) => {
                        const isSelectedAlign =
                          (selectedImageSlot.frameAlign || 'center') === item.align;
                        const IconComp = item.icon;
                        return (
                          <button
                            key={item.align}
                            type="button"
                            onClick={() =>
                              updateImageSlotById(selectedImageSlot.id, {
                                frameAlign: item.align,
                              })
                            }
                            className={`py-1 flex items-center justify-center gap-1 rounded text-[10px] font-bold border transition-colors ${
                              isSelectedAlign
                                ? 'bg-blue-600 border-blue-400 text-white'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <IconComp size={11} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FRAME PRESETS & STYLING */}
            {imageSlotTab === 'frame' && (
              <div className="space-y-3">
                {/* Quick Frame Presets */}
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                    {t('画框预设风格', 'Frame Presets')}
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        {
                          zh: '无框',
                          en: 'None',
                          patch: {
                            frameRadius: 4,
                            frameBorderWidth: 0,
                            frameMatPadding: 0,
                            frameShadow: 'none' as const,
                          },
                        },
                        {
                          zh: '圆角',
                          en: 'Rounded',
                          patch: {
                            frameRadius: 12,
                            frameBorderWidth: 0,
                            frameMatPadding: 0,
                            frameShadow: 'sm' as const,
                          },
                        },
                        {
                          zh: '拍立得',
                          en: 'Polaroid',
                          patch: {
                            frameRadius: 8,
                            frameBorderWidth: 1,
                            frameBorderColor: '#d4d4d8',
                            frameBorderStyle: 'solid' as const,
                            frameMatPadding: 6,
                            frameMatColor: '#ffffff',
                            frameShadow: 'md' as const,
                          },
                        },
                        {
                          zh: '邮票虚线',
                          en: 'Stamp',
                          patch: {
                            frameRadius: 6,
                            frameBorderWidth: 2,
                            frameBorderColor: '#71717a',
                            frameBorderStyle: 'dashed' as const,
                            frameMatPadding: 5,
                            frameMatColor: '#fafafa',
                            frameShadow: 'sm' as const,
                          },
                        },
                        {
                          zh: '古典双线',
                          en: 'Double',
                          patch: {
                            frameRadius: 4,
                            frameBorderWidth: 4,
                            frameBorderColor: '#52525b',
                            frameBorderStyle: 'double' as const,
                            frameMatPadding: 4,
                            frameMatColor: '#ffffff',
                            frameShadow: 'none' as const,
                          },
                        },
                        {
                          zh: '正圆画框',
                          en: 'Circle',
                          patch: {
                            frameRadius: 999,
                            frameBorderWidth: 3,
                            frameBorderColor: '#ffffff',
                            frameBorderStyle: 'solid' as const,
                            frameMatPadding: 0,
                            frameShadow: 'md' as const,
                          },
                        },
                      ]
                    ).map((preset) => (
                      <button
                        key={preset.en}
                        type="button"
                        onClick={() =>
                          updateSelectedSlotWithSync(preset.patch)
                        }
                        className="py-1 px-1.5 rounded text-[10px] font-semibold bg-zinc-950 hover:bg-zinc-700 text-zinc-200 border border-zinc-800 transition-colors"
                      >
                        {t(preset.zh, preset.en)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collapsible Details */}
                <div className="border border-zinc-700/60 rounded-md bg-zinc-950/40 p-2 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFrameDetailsOpen(!isFrameDetailsOpen)}
                    className="w-full flex items-center justify-between text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors"
                  >
                    <span>{t('自定义细节调节 (圆角/边框/阴影)', 'Custom Radius, Border & Shadow')}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">
                      {isFrameDetailsOpen ? '▾' : '▸'}
                    </span>
                  </button>

                  {isFrameDetailsOpen && (
                    <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
                      {/* Radius & Mat Padding */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                            {t('圆角', 'Radius')}
                          </label>
                          <div className="grid grid-cols-5 gap-0.5">
                            {[0, 6, 12, 20, 999].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() =>
                                  updateSelectedSlotWithSync({
                                    frameRadius: r,
                                  })
                                }
                                className={`py-1 rounded text-[10px] font-bold border ${
                                  (selectedImageSlot.frameRadius ?? 4) === r
                                    ? 'bg-zinc-100 text-zinc-900 border-white'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                                }`}
                              >
                                {r === 999 ? '●' : r}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                            {t('白边留白', 'Mat Pad')}
                          </label>
                          <div className="grid grid-cols-4 gap-0.5">
                            {[0, 4, 8, 12].map((mp) => (
                              <button
                                key={mp}
                                type="button"
                                onClick={() =>
                                  updateSelectedSlotWithSync({
                                    frameMatPadding: mp,
                                  })
                                }
                                className={`py-1 rounded text-[10px] font-bold border ${
                                  (selectedImageSlot.frameMatPadding ?? 0) === mp
                                    ? 'bg-zinc-100 text-zinc-900 border-white'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                                }`}
                              >
                                {mp}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Border Width, Color & Shadow */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                            {t('外框粗细与颜色', 'Border')}
                          </label>
                          <div className="flex items-center gap-1">
                            {[0, 1, 2, 4].map((bw) => (
                              <button
                                key={bw}
                                type="button"
                                onClick={() =>
                                  updateSelectedSlotWithSync({
                                    frameBorderWidth: bw,
                                  })
                                }
                                className={`flex-1 py-1 rounded text-[10px] font-bold border ${
                                  (selectedImageSlot.frameBorderWidth ?? 0) === bw
                                    ? 'bg-zinc-100 text-zinc-900 border-white'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                                }`}
                              >
                                {bw}
                              </button>
                            ))}
                            <input
                              type="color"
                              value={selectedImageSlot.frameBorderColor || '#d4d4d8'}
                              onChange={(e) =>
                                updateSelectedSlotWithSync({
                                  frameBorderColor: e.target.value,
                                })
                              }
                              className="w-5 h-5 bg-transparent border-0 cursor-pointer shrink-0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                            {t('阴影效果', 'Shadow')}
                          </label>
                          <div className="grid grid-cols-4 gap-1">
                            {(
                              [
                                { id: 'none', zh: '无', en: '0' },
                                { id: 'sm', zh: '浅', en: 'S' },
                                { id: 'md', zh: '深', en: 'M' },
                                { id: 'hard', zh: '立体', en: '3D' },
                              ] as const
                            ).map((sh) => (
                              <button
                                key={sh.id}
                                type="button"
                                onClick={() =>
                                  updateSelectedSlotWithSync({
                                    frameShadow: sh.id,
                                  })
                                }
                                className={`py-1 rounded text-[10px] font-semibold border ${
                                  (selectedImageSlot.frameShadow || 'none') === sh.id
                                    ? 'bg-zinc-100 text-zinc-900 border-white'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                                }`}
                              >
                                {t(sh.zh, sh.en)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: IMAGE CROP & OVERLAY */}
            {imageSlotTab === 'crop' && (
              <div className="space-y-3">
                {/* Arrange Picture Inside Frame (Zoom & Pan) */}
                <div className="bg-zinc-900/90 border border-zinc-700/80 rounded p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-200">
                      {t('框内画面缩放与移动', 'Arrange Picture in Frame')}
                    </span>
                    {(selectedImageSlot.zoom !== 1 ||
                      selectedImageSlot.focalPoint.x !== 50 ||
                      selectedImageSlot.focalPoint.y !== 50) && (
                      <button
                        type="button"
                        onClick={() =>
                          updateImageSlotById(selectedImageSlot.id, {
                            zoom: 1,
                            focalPoint: { x: 50, y: 50 },
                          })
                        }
                        className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 font-semibold"
                      >
                        <RotateCcw size={10} />
                        <span>{t('居中复原', 'Reset')}</span>
                      </button>
                    )}
                  </div>

                  {/* Zoom Slider */}
                  <div>
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>{t('画面缩放 (Zoom)', 'Zoom In / Out')}</span>
                      <span className="font-mono text-zinc-200">
                        {Math.round(selectedImageSlot.zoom * 100)}%
                      </span>
                    </div>
                    <RangeSliderWithDefault
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      value={selectedImageSlot.zoom}
                      defaultValue={1}
                      unit="x"
                      lang={lang}
                      onChange={(val) =>
                        updateImageSlotById(selectedImageSlot.id, { zoom: val })
                      }
                    />
                  </div>

                  {/* Pan X & Pan Y */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>{t('左右移动 (X)', 'Move Left/Right')}</span>
                        <span className="font-mono text-zinc-200">
                          {selectedImageSlot.focalPoint.x - 50 > 0
                            ? `+${selectedImageSlot.focalPoint.x - 50}`
                            : selectedImageSlot.focalPoint.x - 50}
                        </span>
                      </div>
                      <RangeSliderWithDefault
                        min={0}
                        max={100}
                        step={1}
                        value={selectedImageSlot.focalPoint.x}
                        defaultValue={50}
                        unit="%"
                        lang={lang}
                        onChange={(val) =>
                          updateImageSlotById(selectedImageSlot.id, {
                            focalPoint: {
                              ...selectedImageSlot.focalPoint,
                              x: Math.round(val),
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>{t('上下移动 (Y)', 'Move Up/Down')}</span>
                        <span className="font-mono text-zinc-200">
                          {selectedImageSlot.focalPoint.y - 50 > 0
                            ? `+${selectedImageSlot.focalPoint.y - 50}`
                            : selectedImageSlot.focalPoint.y - 50}
                        </span>
                      </div>
                      <RangeSliderWithDefault
                        min={0}
                        max={100}
                        step={1}
                        value={selectedImageSlot.focalPoint.y}
                        defaultValue={50}
                        unit="%"
                        lang={lang}
                        onChange={(val) =>
                          updateImageSlotById(selectedImageSlot.id, {
                            focalPoint: {
                              ...selectedImageSlot.focalPoint,
                              y: Math.round(val),
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-zinc-500">
                    {t(
                      '💡 提示：也可直接在画布上拖拽图片位置',
                      '💡 Tip: Drag image directly on canvas to pan'
                    )}
                  </div>
                </div>

                {/* Decorative Frame Overlay / Sticker */}
                <div className="space-y-2 pt-1 border-t border-zinc-700/60">
                  <input
                    ref={frameOverlayInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFrameOverlay}
                    className="hidden"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => frameOverlayInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2 bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Upload size={11} />
                      <span>
                        {selectedImageSlot.frameOverlayUrl
                          ? t('更换自定义相框素材', 'Change Frame Asset')
                          : t('上传相框贴纸素材 (PNG)', 'Upload Frame Sticker')}
                      </span>
                    </button>
                    {selectedImageSlot.frameOverlayUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          updateImageSlotById(selectedImageSlot.id, {
                            frameOverlayUrl: null,
                            frameAssetScale: 1,
                            frameAssetX: 0,
                            frameAssetY: 0,
                          })
                        }
                        className="px-2 py-1 bg-zinc-950 text-zinc-400 hover:text-red-300 border border-zinc-700 rounded text-[11px]"
                      >
                        {t('清除', 'Clear')}
                      </button>
                    )}
                  </div>

                  {selectedImageSlot.frameOverlayUrl && (
                    <div className="bg-zinc-900/90 border border-zinc-700/80 rounded p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-300">
                          {t('相框贴纸图层与位置', 'Frame Layer & Position')}
                        </span>
                        {((selectedImageSlot.frameAssetScale ?? 1) !== 1 ||
                          (selectedImageSlot.frameAssetX || 0) !== 0 ||
                          (selectedImageSlot.frameAssetY || 0) !== 0) && (
                          <button
                            type="button"
                            onClick={() =>
                              updateImageSlotById(selectedImageSlot.id, {
                                frameAssetScale: 1,
                                frameAssetX: 0,
                                frameAssetY: 0,
                              })
                            }
                            className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 font-semibold"
                          >
                            <RotateCcw size={10} />
                            <span>{t('重置', 'Reset')}</span>
                          </button>
                        )}
                      </div>

                      {/* Layer Toggle */}
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            { id: 'behind', zh: '画框后方', en: 'Behind' },
                            { id: 'mask', zh: '形状遮罩', en: 'Mask' },
                            { id: 'front', zh: '画面前方', en: 'In Front' },
                          ] as const
                        ).map((lyr) => (
                          <button
                            key={lyr.id}
                            type="button"
                            onClick={() =>
                              updateImageSlotById(selectedImageSlot.id, {
                                frameAssetLayer: lyr.id,
                              })
                            }
                            className={`py-1 rounded text-[10px] font-semibold border ${
                              (selectedImageSlot.frameAssetLayer || 'behind') === lyr.id
                                ? 'bg-blue-600 border-blue-400 text-white'
                                : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {t(lyr.zh, lyr.en)}
                          </button>
                        ))}
                      </div>

                      {/* Scale */}
                      <div>
                        <div className="flex justify-between text-[10px] text-zinc-400">
                          <span>{t('贴纸缩放 (Scale)', 'Scale')}</span>
                          <span className="font-mono text-zinc-200">
                            {Math.round((selectedImageSlot.frameAssetScale ?? 1) * 100)}%
                          </span>
                        </div>
                        <RangeSliderWithDefault
                          min={0.5}
                          max={2.5}
                          step={0.05}
                          value={selectedImageSlot.frameAssetScale ?? 1}
                          defaultValue={1}
                          unit="x"
                          lang={lang}
                          onChange={(val) =>
                            updateImageSlotById(selectedImageSlot.id, {
                              frameAssetScale: val,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : selectedChild && selectedRoot ? (
          /* ========================================================= */
          /* 2. SELECTED INNER CONTENT BLOCK INSPECTOR                 */
          /* ========================================================= */
          <div className="bg-zinc-800/70 border border-zinc-700 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-700/80 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100">
                <Layers size={14} className="text-blue-400" />
                <span>{t('内部组件设置', 'Component Settings')}</span>
              </div>
              <button
                type="button"
                onClick={() => selectBlock(selectedRoot.id, null)}
                className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-700 text-blue-400 border border-zinc-700"
              >
                {t('切换至外层容器', 'Edit Container')}
              </button>
            </div>

            {/* Split Media + Text */}
            {selectedChild.type === 'split_media_text' && (() => {
              const b = selectedChild as SplitMediaTextBlock;
              return (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateContentBlock(selectedRoot.id, b.id, (prev) => {
                        const cur = prev as SplitMediaTextBlock;
                        return {
                          ...cur,
                          layout:
                            cur.layout === 'text_left'
                              ? 'text_right'
                              : 'text_left',
                        };
                      })
                    }
                    className="w-full py-1.5 px-2.5 bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 rounded text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5"
                  >
                    <FlipHorizontal size={13} />
                    <span>
                      {t('左右互换', 'Swap Side')} (
                      {b.layout === 'text_left'
                        ? t('左文右图', 'Text Left')
                        : t('左图右文', 'Text Right')}
                      )
                    </span>
                  </button>

                  {/* Sub-element toggles */}
                  <div className="bg-zinc-900/90 border border-zinc-700/80 rounded p-2 space-y-1.5 text-xs text-zinc-200">
                    <div className="text-[10px] font-semibold text-zinc-400">
                      {t('显示内容开关', 'Visible Elements')}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={b.showBullet !== false}
                          onChange={(e) =>
                            updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                              ...prev,
                              showBullet: e.target.checked,
                            } as SplitMediaTextBlock))
                          }
                          className="rounded accent-blue-500"
                        />
                        <span>{t('符号', 'Icon')}</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={b.showHeading !== false}
                          onChange={(e) =>
                            updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                              ...prev,
                              showHeading: e.target.checked,
                            } as SplitMediaTextBlock))
                          }
                          className="rounded accent-blue-500"
                        />
                        <span>{t('标题', 'Title')}</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={b.showBody !== false}
                          onChange={(e) =>
                            updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                              ...prev,
                              showBody: e.target.checked,
                            } as SplitMediaTextBlock))
                          }
                          className="rounded accent-blue-500"
                        />
                        <span>{t('正文', 'Body')}</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                        {t('图文宽度比', 'Width Ratio')}
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {(['45:55', '50:50', '60:40'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() =>
                              updateContentBlock(
                                selectedRoot.id,
                                b.id,
                                (prev) => ({
                                  ...prev,
                                  textWidthRatio: r,
                                } as SplitMediaTextBlock)
                              )
                            }
                            className={`py-1 rounded text-[10px] font-bold border ${
                              b.textWidthRatio === r
                                ? 'bg-zinc-100 text-zinc-900 border-white'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                        {t('图片数量', 'Photos')}
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {([1, 2] as const).map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() =>
                              updateContentBlock(
                                selectedRoot.id,
                                b.id,
                                (prev) => {
                                  const cur = prev as SplitMediaTextBlock;
                                  const nextImgs = [...cur.images];
                                  while (nextImgs.length < cnt) {
                                    nextImgs.push(
                                      createImageSlot(
                                        cur.imageAspectRatio,
                                        `PHOTO ${nextImgs.length + 1}`
                                      )
                                    );
                                  }
                                  return {
                                    ...cur,
                                    imageCount: cnt,
                                    images: nextImgs,
                                  };
                                }
                              )
                            }
                            className={`py-1 rounded text-[10px] font-bold border ${
                              b.imageCount === cnt
                                ? 'bg-zinc-100 text-zinc-900 border-white'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {cnt} {t('张', 'Pic')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Custom Columns Block */}
            {selectedChild.type === 'custom_columns_block' && (() => {
              const b = selectedChild as CustomColumnsBlock;
              return (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                      {t('分栏列数', 'Columns')}
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {([1, 2, 3, 4] as const).map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() =>
                            updateContentBlock(selectedRoot.id, b.id, (prev) => {
                              const cur = prev as CustomColumnsBlock;
                              const nextItems = [...cur.items];
                              while (nextItems.length < cnt) {
                                nextItems.push(
                                  createCustomColumnItem(nextItems.length + 1)
                                );
                              }
                              return {
                                ...cur,
                                columns: cnt,
                                items: nextItems.slice(0, cnt),
                              };
                            })
                          }
                          className={`py-1 rounded text-xs font-bold border ${
                            b.columns === cnt
                              ? 'bg-zinc-100 text-zinc-900 border-white'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {cnt} {t('列', 'Col')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                        {t('卡片底纹', 'Card Style')}
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            { id: 'plain', zh: '透明', en: 'Plain' },
                            { id: 'white_card', zh: '白卡', en: 'Card' },
                            { id: 'bordered', zh: '线框', en: 'Border' },
                          ] as const
                        ).map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() =>
                              updateContentBlock(
                                selectedRoot.id,
                                b.id,
                                (prev) => ({
                                  ...prev,
                                  cardStyle: st.id,
                                } as CustomColumnsBlock)
                              )
                            }
                            className={`py-1 rounded text-[10px] font-semibold border ${
                              b.cardStyle === st.id
                                ? 'bg-zinc-100 text-zinc-900 border-white'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {t(st.zh, st.en)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                        {t('间距', 'Gap')}
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {(['sm', 'md', 'lg'] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() =>
                              updateContentBlock(
                                selectedRoot.id,
                                b.id,
                                (prev) => ({
                                  ...prev,
                                  gap: g,
                                } as CustomColumnsBlock)
                              )
                            }
                            className={`py-1 rounded text-[10px] font-bold border ${
                              b.gap === g
                                ? 'bg-zinc-100 text-zinc-900 border-white'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {g.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Freeform Asset Block */}
            {selectedChild.type === 'freeform_asset_block' && (() => {
              const b = selectedChild as FreeformAssetBlock;
              return (
                <div className="space-y-2 text-xs text-zinc-300">
                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.showCaption}
                        onChange={(e) =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            showCaption: e.target.checked,
                          } as FreeformAssetBlock))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>{t('显示图注', 'Show Caption')}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.bordered}
                        onChange={(e) =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            bordered: e.target.checked,
                          } as FreeformAssetBlock))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>{t('显示边框', 'Bordered')}</span>
                    </label>
                  </div>
                </div>
              );
            })()}

            {/* Simple Text Block */}
            {selectedChild.type === 'simple_text_block' && (() => {
              const b = selectedChild as SimpleTextBlock;
              return (
                <div className="space-y-2 text-xs text-zinc-300">
                  <div className="grid grid-cols-3 gap-1.5">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.showBullet}
                        onChange={(e) =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            showBullet: e.target.checked,
                          } as SimpleTextBlock))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>{t('符号', 'Icon')}</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.showHeading}
                        onChange={(e) =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            showHeading: e.target.checked,
                          } as SimpleTextBlock))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>{t('小标题', 'Heading')}</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.showBody}
                        onChange={(e) =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            showBody: e.target.checked,
                          } as SimpleTextBlock))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>{t('正文', 'Body')}</span>
                    </label>
                  </div>
                </div>
              );
            })()}

            {/* Bullet List Block */}
            {selectedChild.type === 'bullet_list_block' && (() => {
              const b = selectedChild as BulletListBlock;
              return (
                <div className="space-y-2.5 text-xs text-zinc-300">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                      {t('列表样式', 'List Mode')}
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {(
                        [
                          { id: 'inherit_bullet', zh: '跟随章节符号', en: 'Section Symbol' },
                          { id: 'numbered_badge', zh: '数字序号圆标', en: 'Numbered Badge' },
                          { id: 'card_rows', zh: '左彩条卡片行', en: 'Accent Cards' },
                          { id: 'custom_icon', zh: '自定义小图标', en: 'Custom Icon' },
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() =>
                            updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                              ...prev,
                              listStyleMode: st.id,
                            } as BulletListBlock))
                          }
                          className={`py-1 rounded text-[10px] font-semibold border ${
                            (b.listStyleMode || 'inherit_bullet') === st.id
                              ? 'bg-zinc-100 text-zinc-900 border-white'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {t(st.zh, st.en)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Icon Upload */}
                  <div>
                    <input
                      ref={listCustomBulletInputRef}
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await compressImageFile(file);
                        addCustomAsset(
                          cleanFileName(file, 'List Bullet'),
                          'bullet',
                          dataUrl
                        );
                        updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                          ...prev,
                          customBulletUrl: dataUrl,
                          listStyleMode: 'custom_icon',
                        } as BulletListBlock));
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => listCustomBulletInputRef.current?.click()}
                        className="flex-1 py-1 px-2 bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded text-[11px] flex items-center justify-center gap-1"
                      >
                        <Upload size={11} />
                        <span>
                          {b.customBulletUrl
                            ? t('更换列表图标', 'Change Icon')
                            : t('上传自定义列表图标', 'Upload Custom Icon')}
                        </span>
                      </button>
                      {b.customBulletUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                              ...prev,
                              customBulletUrl: null,
                              listStyleMode: 'inherit_bullet',
                            } as BulletListBlock))
                          }
                          className="px-2 py-1 bg-zinc-950 text-zinc-400 hover:text-red-300 border border-zinc-700 rounded text-[11px]"
                        >
                          {t('清除', 'Clear')}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.showGroupTitle}
                        onChange={(e) =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            showGroupTitle: e.target.checked,
                          } as BulletListBlock))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>{t('显示组标题', 'Group Title')}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateContentBlock(selectedRoot.id, b.id, (prev) => {
                          const cur = prev as BulletListBlock;
                          return {
                            ...cur,
                            items: [
                              ...cur.items,
                              {
                                id: uid('bl'),
                                text: t(
                                  '点击输入条目内容。',
                                  'Click to edit item.'
                                ),
                              },
                            ],
                          };
                        })
                      }
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Plus size={11} />
                      <span>{t('新增条目', 'Add Item')}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Dated Event Block */}
            {selectedChild.type === 'dated_event_block' && (() => {
              const b = selectedChild as DatedEventBlock;
              return (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-zinc-200">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.showDate !== false}
                        onChange={(e) =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            showDate: e.target.checked,
                          } as DatedEventBlock))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>{t('日期角标', 'Date Tag')}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.showHeading !== false}
                        onChange={(e) =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            showHeading: e.target.checked,
                          } as DatedEventBlock))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>{t('事件标题', 'Heading')}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.showBody !== false}
                        onChange={(e) =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            showBody: e.target.checked,
                          } as DatedEventBlock))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>{t('正文段落', 'Body')}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.showImages !== false}
                        onChange={(e) =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            showImages: e.target.checked,
                          } as DatedEventBlock))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>{t('配图网格', 'Photos')}</span>
                    </label>
                  </div>

                  {b.showImages !== false && (() => {
                    const photoCount = b.images.length;
                    const availablePresets = getPresetsForCount(photoCount);
                    let effectivePreset: PhotoLayoutPreset = b.layoutPreset || 'auto';
                    if (effectivePreset === 'auto') {
                      if (photoCount === 6) {
                        effectivePreset = b.gridColumns === 4 ? '4_plus_2' : b.gridColumns === 2 ? '2x3' : '3x2';
                      } else if (photoCount === 4) {
                        effectivePreset = b.fitLastToMargin || b.gridColumns === 3 ? '3_plus_1' : b.gridColumns === 2 ? '2x2' : '3_plus_1';
                      } else if (photoCount === 3) {
                        effectivePreset = b.fitLastToMargin || b.gridColumns === 2 ? '2_plus_1' : '3_cols';
                      } else if (photoCount === 5) {
                        effectivePreset = '3_plus_2';
                      } else if (availablePresets[0]) {
                        effectivePreset = availablePresets[0].id;
                      }
                    }

                    const handleAddPhoto = () => {
                      updateContentBlock(selectedRoot.id, b.id, (prev) => {
                        const cur = prev as DatedEventBlock;
                        const nextImgs = [
                          ...cur.images,
                          createImageSlot(
                            cur.imageAspectRatio || '4:3',
                            `PHOTO ${cur.images.length + 1}`,
                            null
                          ),
                        ];
                        let nextPreset = cur.layoutPreset;
                        if (nextImgs.length === 4 && (!nextPreset || nextPreset === 'auto')) {
                          nextPreset = '2x2';
                        } else if (nextImgs.length === 6 && (!nextPreset || nextPreset === 'auto')) {
                          nextPreset = '3x2';
                        }
                        return {
                          ...cur,
                          images: nextImgs,
                          showImages: true,
                          layoutPreset: nextPreset,
                          fitLastToMargin: true,
                        };
                      });
                    };

                    return (
                      <div className="space-y-3 pt-1 border-t border-zinc-800">
                        {/* Top bar: Photo count and Add Photo button */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <ImageIcon size={13} className="text-blue-400" />
                            <span>{t('配图设置', 'Photo Settings')}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                              {photoCount} {t('图', 'pics')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddPhoto}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold transition shadow-xs"
                          >
                            <Plus size={12} />
                            <span>{t('添加图片', 'Add Photo')}</span>
                          </button>
                        </div>

                        {/* Compact Photo & Layout Info Bar in Block Settings */}
                        <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                            <span className="flex items-center gap-1.5 text-zinc-300">
                              <LayoutGrid size={13} className="text-blue-400" />
                              <span>{t('当前排版', 'Layout')}:</span>
                              <span className="font-bold text-white text-[11px]">
                                {lang === 'zh'
                                  ? (availablePresets.find((p) => p.id === effectivePreset)?.labelZh || effectivePreset)
                                  : (availablePresets.find((p) => p.id === effectivePreset)?.labelEn || effectivePreset)}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (b.images[0]) {
                                  selectImageSlot(b.images[0].id, selectedRoot.id, b.id);
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold transition"
                              title={t('点击直接打开排版方案与画框细节工具', 'Click to open layout presets & frame styles')}
                            >
                              <ImageIcon size={11} />
                              <span>{t('调整排版与画框', 'Layout & Frame')}</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-normal">
                            {t(
                              '💡 点击画报中的任意图片，即可在右侧直接切换排版方案（3+1、2×2、通栏等）并统一调节画框风格。',
                              '💡 Click any photo on canvas to switch multi-photo layouts (3+1, 2x2, full width) and unify frame styles.'
                            )}
                          </p>
                        </div>

                        {/* Standard Grid Columns (Kept intact with 1图 2图 3图 4图) */}
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                            {t('图片列数', 'Grid Columns')}
                          </label>
                          <div className="grid grid-cols-4 gap-1">
                            {([1, 2, 3, 4] as const).map((cols) => (
                              <button
                                key={cols}
                                type="button"
                                onClick={() =>
                                  updateContentBlock(selectedRoot.id, b.id, (prev) => {
                                    const cur = prev as DatedEventBlock;
                                    const nextImgs = [...cur.images];
                                    while (nextImgs.length < cols) {
                                      nextImgs.push(
                                        createImageSlot(
                                          cur.imageAspectRatio,
                                          `PHOTO ${nextImgs.length + 1}`,
                                          null
                                        )
                                      );
                                    }
                                    let nextPreset = cur.layoutPreset;
                                    if (cols === 3 && nextImgs.length === 4) {
                                      nextPreset = '3_plus_1';
                                    } else if (cols === 2 && nextImgs.length === 4) {
                                      nextPreset = '2x2';
                                    }
                                    return {
                                      ...cur,
                                      gridColumns: cols,
                                      images: nextImgs,
                                      layoutPreset: nextPreset,
                                    };
                                  })
                                }
                                className={`py-1 rounded text-[11px] font-bold border transition ${
                                  b.gridColumns === cols
                                    ? 'bg-zinc-100 text-zinc-900 border-white shadow-xs'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                                }`}
                              >
                                {cols} {t('图', 'Pic')}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Fit Last To Margin Switch */}
                        <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer pt-1 bg-zinc-900/60 p-2 rounded border border-zinc-800 hover:border-zinc-700 transition">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={b.fitLastToMargin !== false}
                              onChange={(e) =>
                                updateContentBlock(selectedRoot.id, b.id, (prev) => {
                                  const cur = prev as DatedEventBlock;
                                  let nextPreset = cur.layoutPreset;
                                  if (e.target.checked && cur.images.length === 4) {
                                    nextPreset = '3_plus_1';
                                  }
                                  return {
                                    ...cur,
                                    fitLastToMargin: e.target.checked,
                                    layoutPreset: nextPreset,
                                  };
                                })
                              }
                              className="rounded accent-blue-500"
                            />
                            <span className="text-[11px] font-medium">
                              {t('末尾图片自动撑满边距', 'Fit last picture to margin')}
                            </span>
                          </div>
                          <span className={`text-[10px] font-mono font-bold ${b.fitLastToMargin !== false ? 'text-blue-400' : 'text-zinc-500'}`}>
                            {b.fitLastToMargin !== false ? t('自适应', 'FIT') : t('常规', 'OFF')}
                          </span>
                        </label>

                        {/* Photos Management List */}
                        {b.images.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                              {t('图片条目列表 (点击查看详情或删除)', 'Photo List (Click to select/manage)')}
                            </label>
                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                              {b.images.map((imgSlot, idx) => (
                                <div
                                  key={imgSlot.id}
                                  className="flex items-center justify-between p-1.5 rounded bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition group"
                                >
                                  <div
                                    className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                                    onClick={() => selectImageSlot(imgSlot.id, selectedRoot.id, b.id)}
                                  >
                                    <div className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                                      {imgSlot.url ? (
                                        <img src={imgSlot.url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <ImageIcon size={12} className="text-zinc-600" />
                                      )}
                                    </div>
                                    <div className="truncate">
                                      <span className="text-[11px] font-semibold text-zinc-200 group-hover:text-white block truncate">
                                        {t('图片', 'Photo')} {idx + 1}
                                      </span>
                                      <span className="text-[9px] text-zinc-500 font-mono">
                                        {imgSlot.aspectRatio || b.imageAspectRatio || '4:3'}
                                        {idx === b.images.length - 1 && (effectivePreset === '3_plus_1' || b.fitLastToMargin) && (
                                          <span className="ml-1 text-blue-400">· {t('撑满边距', 'Fit margin')}</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Move Up */}
                                    {idx > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateContentBlock(selectedRoot.id, b.id, (prev) => {
                                            const cur = prev as DatedEventBlock;
                                            const nextImgs = [...cur.images];
                                            const temp = nextImgs[idx - 1];
                                            nextImgs[idx - 1] = nextImgs[idx];
                                            nextImgs[idx] = temp;
                                            return { ...cur, images: nextImgs };
                                          })
                                        }
                                        className="p-1 text-zinc-500 hover:text-zinc-200 transition"
                                        title="上移"
                                      >
                                        <ArrowUp size={11} />
                                      </button>
                                    )}
                                    {/* Move Down */}
                                    {idx < b.images.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateContentBlock(selectedRoot.id, b.id, (prev) => {
                                            const cur = prev as DatedEventBlock;
                                            const nextImgs = [...cur.images];
                                            const temp = nextImgs[idx + 1];
                                            nextImgs[idx + 1] = nextImgs[idx];
                                            nextImgs[idx] = temp;
                                            return { ...cur, images: nextImgs };
                                          })
                                        }
                                        className="p-1 text-zinc-500 hover:text-zinc-200 transition"
                                        title="下移"
                                      >
                                        <ArrowDown size={11} />
                                      </button>
                                    )}
                                    {/* Delete photo */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateContentBlock(selectedRoot.id, b.id, (prev) => {
                                          const cur = prev as DatedEventBlock;
                                          const nextImgs = cur.images.filter((_, i) => i !== idx);
                                          return {
                                            ...cur,
                                            images: nextImgs,
                                            showImages: nextImgs.length > 0,
                                          };
                                        })
                                      }
                                      className="p-1 text-zinc-500 hover:text-red-400 transition"
                                      title="删除此图片"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Two Column Cards */}
            {selectedChild.type === 'two_column_cards' && (() => {
              const b = selectedChild as TwoColumnCardsBlock;
              return (
                <div className="space-y-2 text-xs text-zinc-200">
                  <label className="block text-[10px] font-semibold text-zinc-400">
                    {t('文字与图片排布', 'Text Position')}
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'top', zh: '上文下图', en: 'Top' },
                        { id: 'bottom', zh: '上图下文', en: 'Bottom' },
                        { id: 'title_top_body_bottom', zh: '夹心排布', en: 'Split' },
                      ] as const
                    ).map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            textPosition: pos.id,
                          } as TwoColumnCardsBlock))
                        }
                        className={`py-1 rounded text-[10px] font-semibold border ${
                          b.textPosition === pos.id
                            ? 'bg-zinc-100 text-zinc-900 border-white'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {t(pos.zh, pos.en)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Feature Callout Grid */}
            {selectedChild.type === 'feature_callout_grid' && (() => {
              const b = selectedChild as FeatureCalloutGridBlock;
              return (
                <div className="space-y-2 text-xs text-zinc-200">
                  <div className="grid grid-cols-3 gap-1">
                    {([2, 3, 4] as const).map((cols) => (
                      <button
                        key={cols}
                        type="button"
                        onClick={() =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => {
                            const cur = prev as FeatureCalloutGridBlock;
                            const nextItems = [...cur.items];
                            while (nextItems.length < cols) {
                              nextItems.push({
                                id: uid('fc'),
                                showImage: true,
                                showTitle: true,
                                title: t('新增看点', 'Feature'),
                                showSubtitle: true,
                                subtitle: t('看点说明', 'Description'),
                                image: createImageSlot('1:1', 'ICON'),
                              });
                            }
                            return {
                              ...cur,
                              columns: cols,
                              items: nextItems.slice(0, cols),
                            };
                          })
                        }
                        className={`py-1 rounded text-[10px] font-bold border ${
                          b.columns === cols
                            ? 'bg-zinc-100 text-zinc-900 border-white'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {cols} {t('列', 'Cols')}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* KPI Banner Card */}
            {selectedChild.type === 'kpi_banner_card' && (() => {
              const b = selectedChild as KpiBannerCardBlock;
              return (
                <div className="space-y-2 text-xs text-zinc-200">
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'split_metric_photos', zh: '左数右图', en: 'Split' },
                        { id: 'centered_big_metric', zh: '居中大数', en: 'Center' },
                        { id: 'banner_strip', zh: '紧凑横幅', en: 'Strip' },
                      ] as const
                    ).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            variant: v.id,
                          } as KpiBannerCardBlock))
                        }
                        className={`py-1 rounded text-[10px] font-semibold border ${
                          b.variant === v.id
                            ? 'bg-zinc-100 text-zinc-900 border-white'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {t(v.zh, v.en)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* KPI Stat Row */}
            {selectedChild.type === 'kpi_stat_row' && (() => {
              const b = selectedChild as KpiStatRowBlock;
              return (
                <div className="space-y-2 text-xs text-zinc-200">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.showLeadMetric}
                        onChange={(e) =>
                          updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                            ...prev,
                            showLeadMetric: e.target.checked,
                          } as KpiStatRowBlock))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>{t('显示主指标导语', 'Lead Metric')}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateContentBlock(selectedRoot.id, b.id, (prev) => {
                          const cur = prev as KpiStatRowBlock;
                          return {
                            ...cur,
                            items: [
                              ...cur.items,
                              {
                                id: uid('st'),
                                value: '99+',
                                unit: '%',
                                showUnit: true,
                                showDescription: true,
                                description: t('新增指标', 'Metric'),
                              },
                            ],
                          };
                        })
                      }
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Plus size={11} />
                      <span>{t('新增数据格', 'Add Stat')}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Intro Quote Box */}
            {selectedChild.type === 'intro_quote_box' && (() => {
              const b = selectedChild as IntroQuoteBoxBlock;
              return (
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {(
                    [
                      { id: 'dashed', zh: '虚线框', en: 'Dashed' },
                      { id: 'solid', zh: '实线框', en: 'Solid' },
                      { id: 'none', zh: '无边框', en: 'None' },
                    ] as const
                  ).map((bs) => (
                    <button
                      key={bs.id}
                      type="button"
                      onClick={() =>
                        updateContentBlock(selectedRoot.id, b.id, (prev) => ({
                          ...prev,
                          borderStyle: bs.id,
                        } as IntroQuoteBoxBlock))
                      }
                      className={`py-1 rounded text-[10px] font-semibold border ${
                        b.borderStyle === bs.id
                          ? 'bg-zinc-100 text-zinc-900 border-white'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {t(bs.zh, bs.en)}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : selectedRoot?.type === 'section_container' ? (
          /* ========================================================= */
          /* 3. SECTION CONTAINER INSPECTOR (SIMPLIFIED 3-TAB LAYOUT)  */
          /* ========================================================= */
          <div className="bg-zinc-800/60 border border-zinc-800 rounded-lg p-3 space-y-3">
            {/* Title Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100 truncate">
                <Palette size={13} className="text-blue-400 shrink-0" />
                <span className="truncate">
                  {selectedRoot.showHeader === false
                    ? t('空白自由容器', 'Blank Container')
                    : `[${selectedRoot.sectionNumber}] ${selectedRoot.title}`}
                </span>
              </div>
            </div>

            {/* 3-Tab Switcher inside Container Inspector */}
            <div className="grid grid-cols-3 bg-zinc-950 p-0.5 rounded-md border border-zinc-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setContainerTab('style')}
                className={`py-1 rounded transition-colors ${
                  containerTab === 'style'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t('外观配色', 'Style')}
              </button>
              <button
                type="button"
                onClick={() => setContainerTab('icons')}
                className={`py-1 rounded transition-colors ${
                  containerTab === 'icons'
                    ? 'bg-zinc-800 text-amber-300 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t('徽章与符号', 'Icons')}
              </button>
              <button
                type="button"
                onClick={() => setContainerTab('bg')}
                className={`py-1 rounded transition-colors ${
                  containerTab === 'bg'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t('底纹与边框', 'Background')}
              </button>
            </div>

            {/* TAB 1: STYLE & STRUCTURE */}
            {containerTab === 'style' && (
              <div className="space-y-3 pt-0.5">
                {/* Structure Toggles */}
                <div className="bg-zinc-900/90 border border-zinc-700/70 rounded p-2 grid grid-cols-3 gap-1.5 text-[11px] text-zinc-200">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoot.showHeader !== false}
                      onChange={(e) =>
                        updateRootBlock(selectedRoot.id, (prev) => ({
                          ...prev,
                          showHeader: e.target.checked,
                        } as SectionContainerBlock))
                      }
                      className="rounded accent-blue-500"
                    />
                    <span>{t('标题栏', 'Header')}</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoot.showBadge !== false}
                      onChange={(e) =>
                        updateRootBlock(selectedRoot.id, (prev) => ({
                          ...prev,
                          showBadge: e.target.checked,
                        } as SectionContainerBlock))
                      }
                      className="rounded accent-blue-500"
                    />
                    <span>{t('编号框', 'Badge')}</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoot.bordered !== false}
                      onChange={(e) =>
                        updateRootBlock(selectedRoot.id, (prev) => ({
                          ...prev,
                          bordered: e.target.checked,
                        } as SectionContainerBlock))
                      }
                      className="rounded accent-blue-500"
                    />
                    <span>{t('外边框', 'Border')}</span>
                  </label>
                </div>

                {/* Theme Presets */}
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                    {t('预设配色', 'Theme Preset')}
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.values(SECTION_THEMES).map((themePreset) => {
                      const isCurrent = selectedRoot.theme.id === themePreset.id;
                      return (
                        <button
                          key={themePreset.id}
                          type="button"
                          onClick={() =>
                            updateRootBlock(selectedRoot.id, (prev) => ({
                              ...prev,
                              theme: { ...themePreset },
                            } as SectionContainerBlock))
                          }
                          className={`px-2 py-1.5 rounded border text-left flex items-center gap-1.5 text-[11px] transition-all ${
                            isCurrent
                              ? 'bg-zinc-800 border-white text-white font-semibold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-white/20 shrink-0"
                            style={{ backgroundColor: themePreset.primaryColor }}
                          />
                          <span className="truncate">
                            {themePreset.name.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Color Pickers */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                      {t('主色调', 'Accent Color')}
                    </label>
                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded px-2 py-1">
                      <input
                        type="color"
                        value={selectedRoot.theme.primaryColor}
                        onChange={(e) =>
                          updateRootBlock(selectedRoot.id, (prev) => {
                            const sec = prev as SectionContainerBlock;
                            return {
                              ...sec,
                              theme: {
                                ...sec.theme,
                                id: 'custom',
                                primaryColor: e.target.value,
                              },
                            };
                          })
                        }
                        className="w-4 h-4 bg-transparent border-0 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-zinc-300">
                        {selectedRoot.theme.primaryColor}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-1">
                      {t('容器底色', 'Background')}
                    </label>
                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded px-2 py-1">
                      <input
                        type="color"
                        value={selectedRoot.theme.containerBg}
                        onChange={(e) =>
                          updateRootBlock(selectedRoot.id, (prev) => {
                            const sec = prev as SectionContainerBlock;
                            return {
                              ...sec,
                              theme: {
                                ...sec.theme,
                                id: 'custom',
                                containerBg: e.target.value,
                              },
                            };
                          })
                        }
                        className="w-4 h-4 bg-transparent border-0 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-zinc-300">
                        {selectedRoot.theme.containerBg}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Padding & Radius */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-semibold text-zinc-400">
                        {t('内边距', 'Padding')}
                      </label>
                      <span className="text-[9px] font-mono text-zinc-500">
                        {typeof selectedRoot.customPadding === 'number'
                          ? selectedRoot.customPadding
                          : selectedRoot.padding === 'none'
                          ? 0
                          : selectedRoot.padding === 'sm'
                          ? 10
                          : selectedRoot.padding === 'lg'
                          ? 18
                          : 14}px
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {(['none', 'sm', 'md', 'lg'] as const).map((pad) => {
                        const valMap = { none: 0, sm: 10, md: 14, lg: 18 };
                        const curVal =
                          typeof selectedRoot.customPadding === 'number'
                            ? selectedRoot.customPadding
                            : valMap[selectedRoot.padding || 'md'];
                        const isActive =
                          selectedRoot.customPadding === undefined
                            ? selectedRoot.padding === pad
                            : curVal === valMap[pad];

                        return (
                          <button
                            key={pad}
                            type="button"
                            onClick={() =>
                              updateRootBlock(selectedRoot.id, (prev) => ({
                                ...prev,
                                padding: pad,
                                customPadding: valMap[pad],
                              } as SectionContainerBlock))
                            }
                            className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                              isActive
                                ? 'bg-zinc-100 text-zinc-900 border-white'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            {pad === 'none' ? '0' : pad.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-1 flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 focus-within:border-zinc-500 transition-colors">
                      <span className="text-[9px] text-zinc-500 font-medium">
                        {t('手动', 'Val')}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={160}
                        value={
                          typeof selectedRoot.customPadding === 'number'
                            ? selectedRoot.customPadding
                            : selectedRoot.padding === 'none'
                            ? 0
                            : selectedRoot.padding === 'sm'
                            ? 10
                            : selectedRoot.padding === 'lg'
                            ? 18
                            : 14
                        }
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          updateRootBlock(selectedRoot.id, (prev) => ({
                            ...prev,
                            customPadding: val,
                          } as SectionContainerBlock));
                        }}
                        className="w-full bg-transparent text-right text-[10px] font-mono font-bold text-zinc-200 outline-none"
                      />
                      <span className="text-[9px] font-mono text-zinc-500">px</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-semibold text-zinc-400">
                        {t('圆角', 'Radius')}
                      </label>
                      <span className="text-[9px] font-mono text-zinc-500">
                        {selectedRoot.borderRadius ?? 0}px
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[0, 10, 16].map((rad) => (
                        <button
                          key={rad}
                          type="button"
                          onClick={() =>
                            updateRootBlock(selectedRoot.id, (prev) => ({
                              ...prev,
                              borderRadius: rad,
                            } as SectionContainerBlock))
                          }
                          className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                            selectedRoot.borderRadius === rad
                              ? 'bg-zinc-100 text-zinc-900 border-white'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          {rad}px
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 focus-within:border-zinc-500 transition-colors">
                      <span className="text-[9px] text-zinc-500 font-medium">
                        {t('手动', 'Val')}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={160}
                        value={selectedRoot.borderRadius ?? 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          updateRootBlock(selectedRoot.id, (prev) => ({
                            ...prev,
                            borderRadius: val,
                          } as SectionContainerBlock));
                        }}
                        className="w-full bg-transparent text-right text-[10px] font-mono font-bold text-zinc-200 outline-none"
                      />
                      <span className="text-[9px] font-mono text-zinc-500">px</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BADGE [1] & BULLET ■ ICONS */}
            {containerTab === 'icons' && (
              <div className="space-y-3 pt-0.5">
                {/* 1. Section Number Badge [1] */}
                <div className="bg-zinc-900/90 border border-zinc-700/70 rounded p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-200">
                      {t('章节编号 [1] 样式', 'Section Badge [1]')}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {selectedRoot.badgeSize || 26}px
                    </span>
                  </div>

                  {/* Editable Number Text + Number Color Row */}
                  <div className="flex items-center gap-2 bg-zinc-950/90 border border-zinc-800 rounded px-2 py-1.5">
                    <span className="text-[10px] font-semibold text-zinc-400 shrink-0">
                      {t('编号数字', 'Number')}
                    </span>
                    <input
                      type="text"
                      value={selectedRoot.sectionNumber}
                      placeholder="1"
                      onChange={(e) =>
                        updateRootBlock(selectedRoot.id, (prev) => ({
                          ...prev,
                          sectionNumber: e.target.value,
                        } as SectionContainerBlock))
                      }
                      className="w-14 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs font-bold text-white text-center focus:outline-none focus:border-blue-500"
                    />
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-400">
                        {t('数字颜色', 'Text Color')}
                      </span>
                      <input
                        type="color"
                        value={
                          selectedRoot.badgeTextColor ||
                          selectedRoot.theme.headerTextColor ||
                          '#ffffff'
                        }
                        onChange={(e) =>
                          updateRootBlock(selectedRoot.id, (prev) => ({
                            ...prev,
                            badgeTextColor: e.target.value,
                          } as SectionContainerBlock))
                        }
                        className="w-4 h-4 bg-transparent border-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'rounded_square', zh: '圆角方', en: 'Square' },
                        { id: 'flower', zh: '花瓣章', en: 'Flower' },
                        { id: 'circle', zh: '圆形', en: 'Circle' },
                        { id: 'hexagon', zh: '六边形', en: 'Hex' },
                        { id: 'diamond', zh: '菱形', en: 'Diamond' },
                        { id: 'pill', zh: '胶囊', en: 'Pill' },
                        { id: 'outline', zh: '线框', en: 'Outline' },
                        { id: 'custom_only', zh: '自定义底', en: 'Custom' },
                      ] as { id: BadgeShapeType; zh: string; en: string }[]
                    ).map((sh) => {
                      const isActive = selectedRoot.badgeCustomUrl
                        ? sh.id === 'custom_only'
                        : (selectedRoot.badgeShape || 'rounded_square') === sh.id;
                      return (
                        <button
                          key={sh.id}
                          type="button"
                          onClick={() => {
                            if (sh.id === 'custom_only' && !selectedRoot.badgeCustomUrl) {
                              sectionBadgeAssetInputRef.current?.click();
                            }
                            updateRootBlock(selectedRoot.id, (prev) => ({
                              ...prev,
                              badgeShape: sh.id,
                              badgeCustomUrl:
                                sh.id === 'custom_only'
                                  ? (prev as SectionContainerBlock).badgeCustomUrl
                                  : null,
                            } as SectionContainerBlock));
                          }}
                          className={`py-1 rounded text-[10px] font-semibold border ${
                            isActive
                              ? 'bg-zinc-100 text-zinc-900 border-white'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          {t(sh.zh, sh.en)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Size + Upload Row */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <RangeSliderWithDefault
                      min={20}
                      max={38}
                      step={1}
                      value={selectedRoot.badgeSize || 26}
                      defaultValue={26}
                      unit="px"
                      lang={lang}
                      onChange={(val) =>
                        updateRootBlock(selectedRoot.id, (prev) => ({
                          ...prev,
                          badgeSize: Math.round(val),
                        } as SectionContainerBlock))
                      }
                    />
                    <input
                      ref={sectionBadgeAssetInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadSectionBadgeAsset}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => sectionBadgeAssetInputRef.current?.click()}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 rounded text-[10px] font-semibold flex items-center gap-1 shrink-0"
                    >
                      <Upload size={10} />
                      <span>
                        {selectedRoot.badgeCustomUrl
                          ? t('换底图', 'Change')
                          : t('上传底图', 'Upload')}
                      </span>
                    </button>
                    {selectedRoot.badgeCustomUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          updateRootBlock(selectedRoot.id, (prev) => ({
                            ...prev,
                            badgeCustomUrl: null,
                            badgeAssetScale: 1,
                            badgeAssetX: 0,
                            badgeAssetY: 0,
                            badgeShape:
                              (prev as SectionContainerBlock).badgeShape ===
                              'custom_only'
                                ? 'rounded_square'
                                : (prev as SectionContainerBlock).badgeShape,
                          } as SectionContainerBlock))
                        }
                        className="px-1.5 py-1 bg-zinc-950 text-zinc-400 hover:text-red-300 border border-zinc-700 rounded text-[10px]"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Custom Badge Asset Size & Position Controls (Behind Number) */}
                  {selectedRoot.badgeCustomUrl && (
                    <div className="bg-zinc-950/90 border border-amber-500/30 rounded p-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-300">
                          {t(
                            '数字后方自定义素材 · 大小与位置',
                            'Custom Badge Asset · Size & Position'
                          )}
                        </span>
                        {((selectedRoot.badgeAssetScale ?? 1) !== 1 ||
                          (selectedRoot.badgeAssetX || 0) !== 0 ||
                          (selectedRoot.badgeAssetY || 0) !== 0) && (
                          <button
                            type="button"
                            onClick={() =>
                              updateRootBlock(selectedRoot.id, (prev) => ({
                                ...prev,
                                badgeAssetScale: 1,
                                badgeAssetX: 0,
                                badgeAssetY: 0,
                              } as SectionContainerBlock))
                            }
                            className="flex items-center gap-0.5 text-[10px] text-amber-300 hover:text-amber-200 font-semibold"
                          >
                            <RotateCcw size={9} />
                            <span>{t('重置', 'Reset')}</span>
                          </button>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-zinc-400">
                          <span>{t('素材缩放 (Size)', 'Asset Scale')}</span>
                          <span className="font-mono text-zinc-200">
                            {Math.round((selectedRoot.badgeAssetScale ?? 1) * 100)}%
                          </span>
                        </div>
                        <RangeSliderWithDefault
                          min={0.5}
                          max={2.5}
                          step={0.05}
                          value={selectedRoot.badgeAssetScale ?? 1}
                          defaultValue={1}
                          unit="x"
                          lang={lang}
                          onChange={(val) =>
                            updateRootBlock(selectedRoot.id, (prev) => ({
                              ...prev,
                              badgeAssetScale: val,
                            } as SectionContainerBlock))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>{t('左右位置 (X)', 'Position X')}</span>
                            <span className="font-mono text-zinc-200">
                              {(selectedRoot.badgeAssetX || 0) > 0
                                ? `+${selectedRoot.badgeAssetX || 0}px`
                                : `${selectedRoot.badgeAssetX || 0}px`}
                            </span>
                          </div>
                          <RangeSliderWithDefault
                            min={-30}
                            max={30}
                            step={1}
                            value={selectedRoot.badgeAssetX || 0}
                            defaultValue={0}
                            unit="px"
                            lang={lang}
                            onChange={(val) =>
                              updateRootBlock(selectedRoot.id, (prev) => ({
                                ...prev,
                                badgeAssetX: Math.round(val),
                              } as SectionContainerBlock))
                            }
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>{t('上下位置 (Y)', 'Position Y')}</span>
                            <span className="font-mono text-zinc-200">
                              {(selectedRoot.badgeAssetY || 0) > 0
                                ? `+${selectedRoot.badgeAssetY || 0}px`
                                : `${selectedRoot.badgeAssetY || 0}px`}
                            </span>
                          </div>
                          <RangeSliderWithDefault
                            min={-30}
                            max={30}
                            step={1}
                            value={selectedRoot.badgeAssetY || 0}
                            defaultValue={0}
                            unit="px"
                            lang={lang}
                            onChange={(val) =>
                              updateRootBlock(selectedRoot.id, (prev) => ({
                                ...prev,
                                badgeAssetY: Math.round(val),
                              } as SectionContainerBlock))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Header Divider */}
                  <div className="pt-1 border-t border-zinc-800">
                    <label className="block text-[10px] text-zinc-400 mb-1">
                      {t('标题底部分割线', 'Header Line')}
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {(
                        [
                          { id: 'solid', zh: '细线', en: 'Solid' },
                          { id: 'thick_accent', zh: '粗线', en: 'Thick' },
                          { id: 'dashed', zh: '虚线', en: 'Dash' },
                          { id: 'double', zh: '双线', en: 'Double' },
                          { id: 'none', zh: '无', en: 'None' },
                        ] as const
                      ).map((dv) => (
                        <button
                          key={dv.id}
                          type="button"
                          onClick={() =>
                            updateRootBlock(selectedRoot.id, (prev) => ({
                              ...prev,
                              headerDivider: dv.id,
                            } as SectionContainerBlock))
                          }
                          className={`py-1 rounded text-[10px] font-semibold border ${
                            (selectedRoot.headerDivider || 'solid') === dv.id
                              ? 'bg-zinc-100 text-zinc-900 border-white'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {t(dv.zh, dv.en)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Section Bullet Icon (■) */}
                <div className="bg-zinc-900/90 border border-zinc-700/70 rounded p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-200">
                      {t('要点小符号 (■) 样式', 'Bullet Icon (■)')}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {selectedRoot.bulletSize || 8}px
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'square', zh: '■ 方块', en: '■ Box' },
                        { id: 'circle', zh: '● 圆点', en: '● Dot' },
                        { id: 'diamond', zh: '◆ 菱形', en: '◆ Gem' },
                        { id: 'ring', zh: '◎ 圆环', en: '◎ Ring' },
                        { id: 'bar', zh: '▎ 竖条', en: '▎ Bar' },
                        { id: 'arrow', zh: '▶ 箭头', en: '▶ Arrow' },
                        { id: 'star', zh: '★ 星标', en: '★ Star' },
                        { id: 'custom', zh: '★ 贴图', en: '★ PNG' },
                      ] as { id: BulletShapeType; zh: string; en: string }[]
                    ).map((bs) => (
                      <button
                        key={bs.id}
                        type="button"
                        onClick={() => {
                          if (bs.id === 'custom' && !selectedRoot.bulletCustomUrl) {
                            sectionBulletAssetInputRef.current?.click();
                          }
                          updateRootBlock(selectedRoot.id, (prev) => ({
                            ...prev,
                            bulletShape: bs.id,
                            bulletCustomUrl:
                              bs.id === 'custom'
                                ? (prev as SectionContainerBlock).bulletCustomUrl
                                : null,
                          } as SectionContainerBlock));
                        }}
                        className={`py-1 rounded text-[10px] font-semibold border ${
                          (selectedRoot.bulletShape || 'square') === bs.id
                            ? 'bg-zinc-100 text-zinc-900 border-white'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {t(bs.zh, bs.en)}
                      </button>
                    ))}
                  </div>

                  {/* Size + Upload Row */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <RangeSliderWithDefault
                      min={6}
                      max={14}
                      step={1}
                      value={selectedRoot.bulletSize || 8}
                      defaultValue={8}
                      unit="px"
                      lang={lang}
                      onChange={(val) =>
                        updateRootBlock(selectedRoot.id, (prev) => ({
                          ...prev,
                          bulletSize: Math.round(val),
                        } as SectionContainerBlock))
                      }
                    />
                    <input
                      ref={sectionBulletAssetInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadSectionBulletAsset}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => sectionBulletAssetInputRef.current?.click()}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 rounded text-[10px] font-semibold flex items-center gap-1 shrink-0"
                    >
                      <Upload size={10} />
                      <span>
                        {selectedRoot.bulletCustomUrl
                          ? t('换图标', 'Change')
                          : t('上传图标', 'Upload')}
                      </span>
                    </button>
                    {selectedRoot.bulletCustomUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          updateRootBlock(selectedRoot.id, (prev) => ({
                            ...prev,
                            bulletCustomUrl: null,
                            bulletAssetScale: 1,
                            bulletAssetX: 0,
                            bulletAssetY: 0,
                            bulletShape: 'square',
                          } as SectionContainerBlock))
                        }
                        className="px-1.5 py-1 bg-zinc-950 text-zinc-400 hover:text-red-300 border border-zinc-700 rounded text-[10px]"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Custom Bullet Asset Size & Position Controls */}
                  {selectedRoot.bulletCustomUrl && (
                    <div className="bg-zinc-950/90 border border-amber-500/30 rounded p-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-300">
                          {t(
                            '自定义要点符号 · 大小与位置',
                            'Custom Bullet Asset · Size & Position'
                          )}
                        </span>
                        {((selectedRoot.bulletAssetScale ?? 1) !== 1 ||
                          (selectedRoot.bulletAssetX || 0) !== 0 ||
                          (selectedRoot.bulletAssetY || 0) !== 0) && (
                          <button
                            type="button"
                            onClick={() =>
                              updateRootBlock(selectedRoot.id, (prev) => ({
                                ...prev,
                                bulletAssetScale: 1,
                                bulletAssetX: 0,
                                bulletAssetY: 0,
                              } as SectionContainerBlock))
                            }
                            className="flex items-center gap-0.5 text-[10px] text-amber-300 hover:text-amber-200 font-semibold"
                          >
                            <RotateCcw size={9} />
                            <span>{t('重置', 'Reset')}</span>
                          </button>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-zinc-400">
                          <span>{t('图标缩放 (Size)', 'Icon Scale')}</span>
                          <span className="font-mono text-zinc-200">
                            {Math.round((selectedRoot.bulletAssetScale ?? 1) * 100)}%
                          </span>
                        </div>
                        <RangeSliderWithDefault
                          min={0.5}
                          max={2.5}
                          step={0.05}
                          value={selectedRoot.bulletAssetScale ?? 1}
                          defaultValue={1}
                          unit="x"
                          lang={lang}
                          onChange={(val) =>
                            updateRootBlock(selectedRoot.id, (prev) => ({
                              ...prev,
                              bulletAssetScale: val,
                            } as SectionContainerBlock))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>{t('左右微调 (X)', 'Position X')}</span>
                            <span className="font-mono text-zinc-200">
                              {(selectedRoot.bulletAssetX || 0) > 0
                                ? `+${selectedRoot.bulletAssetX || 0}px`
                                : `${selectedRoot.bulletAssetX || 0}px`}
                            </span>
                          </div>
                          <RangeSliderWithDefault
                            min={-15}
                            max={15}
                            step={1}
                            value={selectedRoot.bulletAssetX || 0}
                            defaultValue={0}
                            unit="px"
                            lang={lang}
                            onChange={(val) =>
                              updateRootBlock(selectedRoot.id, (prev) => ({
                                ...prev,
                                bulletAssetX: Math.round(val),
                              } as SectionContainerBlock))
                            }
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>{t('上下微调 (Y)', 'Position Y')}</span>
                            <span className="font-mono text-zinc-200">
                              {(selectedRoot.bulletAssetY || 0) > 0
                                ? `+${selectedRoot.bulletAssetY || 0}px`
                                : `${selectedRoot.bulletAssetY || 0}px`}
                            </span>
                          </div>
                          <RangeSliderWithDefault
                            min={-15}
                            max={15}
                            step={1}
                            value={selectedRoot.bulletAssetY || 0}
                            defaultValue={0}
                            unit="px"
                            lang={lang}
                            onChange={(val) =>
                              updateRootBlock(selectedRoot.id, (prev) => ({
                                ...prev,
                                bulletAssetY: Math.round(val),
                              } as SectionContainerBlock))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: CONTAINER BACKGROUND, BORDER & STICKER */}
            {containerTab === 'bg' && (
              <div className="space-y-3 pt-0.5">
                {/* Pattern */}
                <div className="bg-zinc-900/90 border border-zinc-700/70 rounded p-2.5 space-y-2">
                  <label className="block text-[10px] font-semibold text-zinc-400">
                    {t('背景纹理', 'Background Pattern')}
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {(
                      [
                        { id: 'solid', zh: '纯色', en: 'Solid' },
                        { id: 'gradient', zh: '渐变', en: 'Grad' },
                        { id: 'dots', zh: '波点', en: 'Dots' },
                        { id: 'grid', zh: '网格', en: 'Grid' },
                        { id: 'stripes', zh: '斜纹', en: 'Stripe' },
                      ] as { id: ContainerPatternType; zh: string; en: string }[]
                    ).map((pt) => (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() =>
                          updateRootBlock(selectedRoot.id, (prev) => ({
                            ...prev,
                            bgPattern: pt.id,
                          } as SectionContainerBlock))
                        }
                        className={`py-1 rounded text-[10px] font-semibold border ${
                          (selectedRoot.bgPattern || 'solid') === pt.id
                            ? 'bg-zinc-100 text-zinc-900 border-white'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {t(pt.zh, pt.en)}
                      </button>
                    ))}
                  </div>

                  {selectedRoot.bgPattern === 'gradient' && (
                    <div className="flex items-center justify-between bg-zinc-950 border border-zinc-700 rounded px-2 py-1">
                      <span className="text-[10px] text-zinc-300">
                        {t('渐变结束色', 'Gradient End')}
                      </span>
                      <input
                        type="color"
                        value={selectedRoot.bgGradientEnd || '#ffffff'}
                        onChange={(e) =>
                          updateRootBlock(selectedRoot.id, (prev) => ({
                            ...prev,
                            bgGradientEnd: e.target.value,
                          } as SectionContainerBlock))
                        }
                        className="w-4 h-4 bg-transparent border-0 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Custom Background Image */}
                  <input
                    ref={containerBgInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadContainerBg}
                    className="hidden"
                  />
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => containerBgInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 rounded text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <Upload size={11} />
                      <span>
                        {selectedRoot.bgImage?.url
                          ? t('更换背景图片', 'Change Bg Image')
                          : t('上传容器背景图', 'Upload Bg Image')}
                      </span>
                    </button>
                    {selectedRoot.bgImage?.url && (
                      <button
                        type="button"
                        onClick={() =>
                          updateRootBlock(selectedRoot.id, (prev) => {
                            const sec = prev as SectionContainerBlock;
                            return {
                              ...sec,
                              bgImage: sec.bgImage
                                ? { ...sec.bgImage, url: null }
                                : undefined,
                            };
                          })
                        }
                        className="px-2 py-1 bg-zinc-950 text-zinc-400 hover:text-red-300 border border-zinc-700 rounded text-[11px]"
                      >
                        {t('清除', 'Clear')}
                      </button>
                    )}
                  </div>

                  {selectedRoot.bgImage?.url && (
                    <div className="space-y-1.5 pt-1">
                      <div className="grid grid-cols-4 gap-1">
                        {(
                          [
                            { id: 'cover', zh: '铺满', en: 'Cover' },
                            { id: 'top_banner', zh: '顶图', en: 'Top' },
                            { id: 'repeat', zh: '平铺', en: 'Tile' },
                            { id: 'contain', zh: '居中', en: 'Fit' },
                          ] as const
                        ).map((fit) => (
                          <button
                            key={fit.id}
                            type="button"
                            onClick={() =>
                              updateRootBlock(selectedRoot.id, (prev) => ({
                                ...prev,
                                bgImageFit: fit.id,
                              } as SectionContainerBlock))
                            }
                            className={`py-1 rounded text-[10px] font-semibold border ${
                              (selectedRoot.bgImageFit || 'cover') === fit.id
                                ? 'bg-zinc-100 text-zinc-900 border-white'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {t(fit.zh, fit.en)}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {t('透明度', 'Opacity')}
                        </span>
                        <RangeSliderWithDefault
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={selectedRoot.bgImageOpacity ?? 1}
                          defaultValue={1}
                          lang={lang}
                          onChange={(val) =>
                            updateRootBlock(selectedRoot.id, (prev) => ({
                              ...prev,
                              bgImageOpacity: val,
                            } as SectionContainerBlock))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Border Style & Corner Sticker */}
                <div className="bg-zinc-900/90 border border-zinc-700/70 rounded p-2.5 space-y-2">
                  {selectedRoot.bordered !== false && (
                    <>
                      <label className="block text-[10px] font-semibold text-zinc-400">
                        {t('外框线型与粗细', 'Border Style & Width')}
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {(
                          [
                            { id: 'solid', zh: '实线', en: 'Solid' },
                            { id: 'dashed', zh: '虚线', en: 'Dash' },
                            { id: 'double', zh: '双线', en: 'Double' },
                            { id: 'top_thick', zh: '顶粗条', en: 'Top Bar' },
                          ] as {
                            id: ContainerBorderStyleType;
                            zh: string;
                            en: string;
                          }[]
                        ).map((bs) => (
                          <button
                            key={bs.id}
                            type="button"
                            onClick={() =>
                              updateRootBlock(selectedRoot.id, (prev) => ({
                                ...prev,
                                borderStyle: bs.id,
                                borderWidth:
                                  bs.id === 'double' &&
                                  ((prev as SectionContainerBlock).borderWidth ??
                                    1) < 3
                                    ? 3
                                    : (prev as SectionContainerBlock).borderWidth,
                              } as SectionContainerBlock))
                            }
                            className={`py-1 rounded text-[10px] font-semibold border ${
                              (selectedRoot.borderStyle || 'solid') === bs.id
                                ? 'bg-zinc-100 text-zinc-900 border-white'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {t(bs.zh, bs.en)}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[1, 1.5, 2, 3].map((bw) => (
                          <button
                            key={bw}
                            type="button"
                            onClick={() =>
                              updateRootBlock(selectedRoot.id, (prev) => ({
                                ...prev,
                                borderWidth: bw,
                              } as SectionContainerBlock))
                            }
                            className={`py-0.5 rounded text-[10px] font-bold border ${
                              (selectedRoot.borderWidth ?? 1) === bw
                                ? 'bg-zinc-100 text-zinc-900 border-white'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {bw}px
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Corner Sticker */}
                  <div className="pt-1">
                    <input
                      ref={cornerStickerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCornerSticker}
                      className="hidden"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => cornerStickerInputRef.current?.click()}
                        className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 rounded text-[11px] font-semibold flex items-center justify-center gap-1"
                      >
                        <Upload size={11} />
                        <span>
                          {selectedRoot.cornerStickerUrl
                            ? t('更换右上角标贴纸', 'Change Corner Sticker')
                            : t('上传右上角标贴纸', 'Corner Sticker PNG')}
                        </span>
                      </button>
                      {selectedRoot.cornerStickerUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            updateRootBlock(selectedRoot.id, (prev) => ({
                              ...prev,
                              cornerStickerUrl: null,
                            } as SectionContainerBlock))
                          }
                          className="px-2 py-1 bg-zinc-950 text-zinc-400 hover:text-red-300 border border-zinc-700 rounded text-[11px]"
                        >
                          {t('清除', 'Clear')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : selectedRoot?.type === 'highlights_bar' ? (
          /* Highlights Bar Inspector */
          (() => {
            const b = selectedRoot as HighlightsBarBlock;
            return (
              <div className="bg-zinc-800/60 border border-zinc-800 rounded-lg p-3 space-y-2.5">
                <div className="text-xs font-bold text-white">
                  {t('看点卡片横栏', 'Highlights Bar')}
                </div>
                <div className="flex gap-3 text-xs text-zinc-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={b.showHeading !== false}
                      onChange={(e) =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showHeading: e.target.checked,
                        } as HighlightsBarBlock))
                      }
                      className="rounded accent-blue-500"
                    />
                    <span>{t('显示标题', 'Show Heading')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={b.showBullet !== false}
                      onChange={(e) =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showBullet: e.target.checked,
                        } as HighlightsBarBlock))
                      }
                      className="rounded accent-blue-500"
                    />
                    <span>{t('显示符号', 'Show Icon')}</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateRootBlock(b.id, (prev) => {
                      const cur = prev as HighlightsBarBlock;
                      return {
                        ...cur,
                        items: [
                          ...cur.items,
                          {
                            id: uid('hl'),
                            title: t('新增看点', 'NEW'),
                            subtitle: t('点击编辑标题', 'Title'),
                            showSubtitle: true,
                            image: createImageSlot('4:3', 'HIGHLIGHT'),
                            bgColor: '#52525b',
                          },
                        ],
                      };
                    })
                  }
                  className="w-full py-1.5 px-2 bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 rounded text-xs text-zinc-200 flex items-center justify-center gap-1"
                >
                  <Plus size={12} />
                  <span>{t('添加看点卡片', 'Add Highlight Card')}</span>
                </button>
              </div>
            );
          })()
        ) : selectedRoot?.type === 'masthead' ? (
          /* Masthead Banner Inspector */
          (() => {
            const b = selectedRoot as MastheadBlock;
            return (
              <div className="bg-zinc-800/60 border border-zinc-800 rounded-lg p-3 space-y-2.5">
                <div className="text-xs font-bold text-white">
                  {t('报头封面横幅', 'Masthead Banner')}
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-zinc-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={b.showTopBar !== false}
                      onChange={(e) =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showTopBar: e.target.checked,
                        } as MastheadBlock))
                      }
                      className="rounded accent-blue-500"
                    />
                    <span>{t('顶部机构与期数', 'Top Bar')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={b.showHeroOverlay !== false}
                      onChange={(e) =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showHeroOverlay: e.target.checked,
                        } as MastheadBlock))
                      }
                      className="rounded accent-blue-500"
                    />
                    <span>{t('封面大标题', 'Hero Title')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={b.showSubBanner !== false}
                      onChange={(e) =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showSubBanner: e.target.checked,
                        } as MastheadBlock))
                      }
                      className="rounded accent-blue-500"
                    />
                    <span>{t('底部副横幅', 'Sub Banner')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={b.showSubBannerDesc !== false}
                      onChange={(e) =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showSubBannerDesc: e.target.checked,
                        } as MastheadBlock))
                      }
                      className="rounded accent-blue-500"
                    />
                    <span>{t('导读寄语', 'Sub Text')}</span>
                  </label>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-400">
                    {t('报头主题色', 'Banner Accent')}
                  </span>
                  <input
                    type="color"
                    value={b.accentColor}
                    onChange={(e) =>
                      updateRootBlock(b.id, (prev) => ({
                        ...prev,
                        accentColor: e.target.value,
                      } as MastheadBlock))
                    }
                    className="w-6 h-6 bg-transparent border-0 cursor-pointer"
                  />
                </div>
              </div>
            );
          })()
        ) : selectedRoot?.type === 'footer_banner' ? (
          /* Footer Banner Inspector */
          (() => {
            const b = selectedRoot as FooterBannerBlock;
            return (
              <div className="bg-zinc-800/60 border border-zinc-800 rounded-lg p-3 space-y-2.5">
                <div className="text-xs font-bold text-white">
                  {t('页脚收尾横幅', 'Footer Banner')}
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-zinc-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={b.showOverlayText !== false}
                      onChange={(e) =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showOverlayText: e.target.checked,
                        } as FooterBannerBlock))
                      }
                      className="rounded accent-blue-500"
                    />
                    <span>{t('显示覆盖文字', 'Overlay Text')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={b.showBrandLabel !== false}
                      onChange={(e) =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showBrandLabel: e.target.checked,
                        } as FooterBannerBlock))
                      }
                      className="rounded accent-blue-500"
                    />
                    <span>{t('显示底部品牌', 'Brand Label')}</span>
                  </label>
                </div>
              </div>
            );
          })()
        ) : null}

        {/* ========================================================= */}
        {/* 4. COMPACT GLOBAL CANVAS SETTINGS                         */}
        {/* ========================================================= */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-2.5">
          <div className="text-[11px] font-bold text-zinc-400">
            {t('全局画布与一键换肤', 'Global Canvas & Theme')}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={applyAllGreyWireframeTheme}
              className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <RotateCcw size={11} />
              <span>{t('全灰模模式', 'Grey Wireframe')}</span>
            </button>
            <button
              type="button"
              onClick={applySampleColorPalettes}
              className="py-1.5 px-2 bg-gradient-to-r from-blue-600/80 to-emerald-600/80 hover:from-blue-500 hover:to-emerald-500 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
            >
              <Sparkles size={11} />
              <span>{t('一键套用彩装', 'Color Theme')}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-400 mr-1">
                {t('画布宽度', 'Width')}
              </span>
              {[440, 480, 540, 600].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => updateDocumentMeta({ canvasWidth: w })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    doc.canvasWidth === w
                      ? 'bg-zinc-100 text-zinc-900 border-white'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
