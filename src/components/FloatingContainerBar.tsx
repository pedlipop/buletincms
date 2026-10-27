import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  Plus,
  SquareDashed,
} from 'lucide-react';
import {
  createBlankContainer,
  createSectionContainer,
} from '../data/presets';
import { DragPayload, useBulletinStore } from '../store/useBulletinStore';

interface FloatingContainerBarProps {
  onOpenLibraryTab?: () => void;
}

export const FloatingContainerBar: React.FC<FloatingContainerBarProps> = ({
  onOpenLibraryTab,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const lang = useBulletinStore((s) => s.lang);
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);

  const previewMode = useBulletinStore((s) => s.previewMode);
  const insertRootBlock = useBulletinStore((s) => s.insertRootBlock);
  const setActiveDrag = useBulletinStore((s) => s.setActiveDrag);
  const openBlocksDrawer = useBulletinStore((s) => s.openBlocksDrawer);

  // Hidden in preview / export presentation mode
  if (previewMode) return null;

  const bindDrag = (payload: DragPayload) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      setActiveDrag(payload);
      e.dataTransfer.setData('application/x-buletincms', JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'copyMove';
    },
    onDragEnd: () => setActiveDrag(null),
  });

  // 1. Blank Container
  const handleAddBlank = () => {
    insertRootBlock(createBlankContainer('freeform_asset_block'));
  };

  // 2. Numbered Section Container
  const handleAddNumbered = () => {
    const doc = useBulletinStore.getState().getActiveDoc();
    const existingSections = doc.rootBlocks.filter(
      (b) => b.type === 'section_container' && b.showHeader !== false
    ).length;
    const newSec = createSectionContainer(
      String(existingSections + 1),
      t('新增章节篇', 'New Section'),
      'grey_wireframe',
      []
    );
    insertRootBlock(newSec);
  };

  // 3. Simple Header Container
  const handleAddSimpleHeader = () => {
    const newSec = createSectionContainer(
      '',
      t('极简无编号标题容器', 'Simple Title Container'),
      'grey_wireframe',
      [],
      {
        showHeader: true,
        showBadge: false,
      }
    );
    insertRootBlock(newSec);
  };

  // 4. Open Containers & Blocks Library Drawer
  const handleOpenLibrary = () => {
    openBlocksDrawer();
    if (onOpenLibraryTab) {
      onOpenLibraryTab();
    }
  };

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-25 select-none animate-spring-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/95 hover:bg-zinc-800 backdrop-blur-xl border border-zinc-700/90 hover:border-blue-500/60 rounded-full text-xs font-bold text-zinc-200 hover:text-white shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title={t('展开快捷容器插入工具栏', 'Expand Quick Container Bar')}
        >
          <Layers size={13} className="text-blue-400" />
          <span>{t('+ 添加常用容器', '+ Add Container')}</span>
          <ChevronUp size={13} className="text-zinc-400" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-25 select-none animate-spring-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl p-1.5 shadow-2xl text-xs">
        {/* Label badge */}
        <div className="hidden sm:flex items-center gap-1 px-2 text-zinc-400 font-semibold text-[11px]">
          <Layers size={13} className="text-blue-400 shrink-0" />
          <span>{t('快捷容器', 'Containers')}:</span>
        </div>

        {/* Option 1: Blank Container */}
        <button
          type="button"
          onClick={handleAddBlank}
          {...bindDrag({
            source: 'library_root',
            rootFactory: 'blank_container',
          })}
          className="group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 active:bg-zinc-700 border border-blue-500/30 hover:border-blue-400 text-zinc-200 hover:text-white transition-all active:scale-95 cursor-grab active:cursor-grabbing shadow-xs"
          title={t('点击插入或拖拽到画布：空白自由容器', 'Click to add or drag: Blank Container')}
        >
          <SquareDashed size={14} className="text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-[11px] leading-tight text-blue-300 group-hover:text-white">
              {t('空白容器', 'Blank')}
            </span>
          </div>
        </button>

        {/* Option 2: Numbered Section Container */}
        <button
          type="button"
          onClick={handleAddNumbered}
          {...bindDrag({
            source: 'library_root',
            rootFactory: 'numbered_section',
          })}
          className="group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white transition-all active:scale-95 cursor-grab active:cursor-grabbing shadow-xs"
          title={t('点击插入或拖拽到画布：编号章节容器 (带数字角标)', 'Click to add or drag: Numbered Section')}
        >
          <span className="w-4 h-4 rounded bg-zinc-700 group-hover:bg-blue-600 text-white font-black text-[9px] flex items-center justify-center transition-colors shrink-0">
            1
          </span>
          <div className="flex flex-col text-left">
            <span className="font-bold text-[11px] leading-tight text-zinc-200 group-hover:text-white">
              {t('编号章节', 'Numbered')}
            </span>
          </div>
        </button>

        {/* Option 3: Simple Header Box */}
        <button
          type="button"
          onClick={handleAddSimpleHeader}
          {...bindDrag({
            source: 'library_root',
            rootFactory: 'simple_header_section',
          })}
          className="group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white transition-all active:scale-95 cursor-grab active:cursor-grabbing shadow-xs"
          title={t('点击插入或拖拽到画布：极简无编号容器', 'Click to add or drag: Simple Header Box')}
        >
          <LayoutTemplate size={14} className="text-zinc-400 group-hover:text-white group-hover:scale-110 transition-transform shrink-0" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-[11px] leading-tight text-zinc-200 group-hover:text-white">
              {t('极简框架', 'Header Box')}
            </span>
          </div>
        </button>

        {/* Subtle Vertical Divider */}
        <div className="h-5 w-px bg-zinc-700/80 mx-0.5" />

        {/* Option 4: Open Containers & Blocks Library Drawer */}
        <button
          type="button"
          onClick={handleOpenLibrary}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/25 to-indigo-600/25 hover:from-blue-600 hover:to-indigo-600 active:from-blue-700 active:to-indigo-700 border border-blue-500/40 hover:border-blue-400 text-blue-300 hover:text-white font-bold text-[11px] transition-all active:scale-95 cursor-pointer shadow-xs"
          title={t('展开左侧查看全部容器与组件库', 'Open Full Containers & Blocks Library')}
        >
          <LayoutGrid size={13} className="text-blue-400 group-hover:text-white transition-colors shrink-0" />
          <span className="whitespace-nowrap">{t('容器库', 'Library')}</span>
          <ArrowRight size={11} className="text-blue-400/80 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Minimize Button */}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 rounded-lg transition-colors ml-0.5"
          title={t('收起快捷工具栏', 'Minimize')}
        >
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  );
};
