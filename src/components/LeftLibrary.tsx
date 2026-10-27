import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  createBlankContainer,
  createContentBlock,
  createFooterBannerBlock,
  createHighlightsBarBlock,
  createImageSlot,
  createMastheadBlock,
  createSectionContainer,
} from '../data/presets';
import {
  cloneWithNewIds,
  DragPayload,
  useBulletinStore,
} from '../store/useBulletinStore';
import {
  BulletListBlock,
  ContentBlock,
  CustomAssetCategory,
  CustomAssetItem,
  FreeformAssetBlock,
  SectionContainerBlock,
} from '../types/bulletin';
import { compressImageFile } from './ImageSlot';

interface PendingAssetItem {
  name: string;
  url: string;
  category: CustomAssetCategory;
}

export const LeftLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'blocks' | 'assets' | 'templates'>(
    'blocks'
  );
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<{
    containers: boolean;
    columns: boolean;
    text: boolean;
    composite: boolean;
  }>({
    containers: false,
    columns: false,
    text: false,
    composite: false,
  });

  const [assetFilter, setAssetFilter] = useState<'all' | CustomAssetCategory>(
    'all'
  );
  const [pendingAssets, setPendingAssets] = useState<PendingAssetItem[]>([]);
  const assetUploadInputRef = useRef<HTMLInputElement>(null);

  const lang = useBulletinStore((s) => s.lang);
  const setLang = useBulletinStore((s) => s.setLang);
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);

  const savedTemplates = useBulletinStore((s) => s.savedTemplates);
  const customAssets = useBulletinStore((s) => s.customAssets);
  const selectedRootBlockId = useBulletinStore((s) => s.selectedRootBlockId);
  const selectedChildBlockId = useBulletinStore((s) => s.selectedChildBlockId);
  const selectedImageSlotId = useBulletinStore((s) => s.selectedImageSlotId);

  const setActiveDrag = useBulletinStore((s) => s.setActiveDrag);
  const insertRootBlock = useBulletinStore((s) => s.insertRootBlock);
  const insertContentBlock = useBulletinStore((s) => s.insertContentBlock);
  const updateRootBlock = useBulletinStore((s) => s.updateRootBlock);
  const updateContentBlock = useBulletinStore((s) => s.updateContentBlock);
  const updateImageSlotById = useBulletinStore((s) => s.updateImageSlotById);
  const deleteTemplate = useBulletinStore((s) => s.deleteTemplate);
  const addCustomAsset = useBulletinStore((s) => s.addCustomAsset);
  const deleteCustomAsset = useBulletinStore((s) => s.deleteCustomAsset);

  const toggleSection = (key: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const bindDrag = (payload: DragPayload) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      setActiveDrag(payload);
      e.dataTransfer.setData('application/x-buletincms', JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'copyMove';
    },
    onDragEnd: () => setActiveDrag(null),
  });

  // Step 1: Read uploaded files and open Confirmation Modal Window
  const handleUploadCustomAssetFiles = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const defaultCategory: CustomAssetCategory =
      assetFilter !== 'all' ? assetFilter : 'photo';
    const loaded: PendingAssetItem[] = [];
    for (const file of files) {
      const dataUrl = await compressImageFile(file);
      const cleanName =
        file.name.replace(/\.[^/.]+$/, '').slice(0, 28) || 'Custom Asset';
      loaded.push({
        name: cleanName,
        url: dataUrl,
        category: defaultCategory,
      });
    }
    setPendingAssets(loaded);
    e.target.value = '';
  };

  // Step 2: Confirm adding pending assets from the confirmation modal
  const handleConfirmPendingAssets = (applyAfterAdd = false) => {
    let lastCreated: CustomAssetItem | null = null;
    for (const item of pendingAssets) {
      lastCreated = addCustomAsset(
        item.name.trim() || 'Custom Asset',
        item.category,
        item.url
      );
    }
    setPendingAssets([]);
    if (applyAfterAdd && lastCreated) {
      handleApplyCustomAsset(lastCreated);
    }
  };

  const handleApplyCustomAsset = (asset: CustomAssetItem) => {
    const doc = useBulletinStore.getState().getActiveDoc();
    const targetRoot =
      doc.rootBlocks.find((b) => b.id === selectedRootBlockId) ||
      doc.rootBlocks.find((b) => b.type === 'section_container') ||
      null;

    // 1. Frame Asset (Behind Picture Frame by default)
    if (asset.category === 'frame') {
      if (selectedImageSlotId) {
        updateImageSlotById(selectedImageSlotId, {
          frameOverlayUrl: asset.url,
          frameAssetLayer: 'behind',
        });
        return;
      }
      const newBlock = createContentBlock(
        'freeform_asset_block'
      ) as FreeformAssetBlock;
      newBlock.image.frameOverlayUrl = asset.url;
      newBlock.image.frameAssetLayer = 'behind';
      insertContentBlock(newBlock);
      return;
    }

    // 2. Section Badge [1] (Behind the editable section number)
    if (asset.category === 'badge' && targetRoot?.type === 'section_container') {
      updateRootBlock(targetRoot.id, (prev) => {
        const sec = prev as SectionContainerBlock;
        return {
          ...sec,
          badgeCustomUrl: asset.url,
          badgeShape: 'custom_only',
          sectionNumber: sec.sectionNumber || '1',
          showHeader: true,
          showBadge: true,
        };
      });
      return;
    }

    // 3. Bullet Icon ■
    if (asset.category === 'bullet' && targetRoot?.type === 'section_container') {
      if (selectedChildBlockId) {
        const child = targetRoot.children.find(
          (c) => c.id === selectedChildBlockId
        );
        if (child?.type === 'bullet_list_block') {
          updateContentBlock(targetRoot.id, child.id, (prev) => ({
            ...prev,
            customBulletUrl: asset.url,
            listStyleMode: 'custom_icon',
          } as BulletListBlock));
          return;
        }
      }
      updateRootBlock(targetRoot.id, (prev) => ({
        ...prev,
        bulletCustomUrl: asset.url,
        bulletShape: 'custom',
      } as SectionContainerBlock));
      return;
    }

    // 4. Container Background
    if (
      asset.category === 'background' &&
      targetRoot?.type === 'section_container'
    ) {
      updateRootBlock(targetRoot.id, (prev) => {
        const sec = prev as SectionContainerBlock;
        const existingSlot =
          sec.bgImage || createImageSlot('free', 'CONTAINER BG ASSET');
        return {
          ...sec,
          bgImage: { ...existingSlot, url: asset.url },
        };
      });
      return;
    }

    // 5. Corner Sticker
    if (
      asset.category === 'sticker' &&
      targetRoot?.type === 'section_container'
    ) {
      updateRootBlock(targetRoot.id, (prev) => ({
        ...prev,
        cornerStickerUrl: asset.url,
      } as SectionContainerBlock));
      return;
    }

    // 6. Photo / Fallback: Fill selected ImageSlot or insert Freeform Asset Block
    if (selectedImageSlotId) {
      updateImageSlotById(selectedImageSlotId, { url: asset.url });
      return;
    }

    const newBlock = createContentBlock(
      'freeform_asset_block'
    ) as FreeformAssetBlock;
    newBlock.image.url = asset.url;
    insertContentBlock(newBlock);
  };

  const handleInsertAssetAsBlock = (asset: CustomAssetItem) => {
    const newBlock = createContentBlock(
      'freeform_asset_block'
    ) as FreeformAssetBlock;
    newBlock.image.url = asset.url;
    insertContentBlock(newBlock);
  };

  const handleAddNumberedSection = () => {
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

  const handleAddSimpleHeaderSection = () => {
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

  const handleAddBlankContainer = () => {
    insertRootBlock(createBlankContainer('freeform_asset_block'));
  };

  const handleSelectTab = (tab: 'blocks' | 'assets' | 'templates') => {
    if (activeTab === tab && !isDrawerCollapsed) {
      setIsDrawerCollapsed(true);
    } else {
      setActiveTab(tab);
      setIsDrawerCollapsed(false);
    }
  };

  return (
    <aside className="bg-zinc-900 border-r border-zinc-800 flex h-full select-none shrink-0 w-full md:w-auto">
      {/* ========================================================= */}
      {/* LEFT VERTICAL SIDE TAB RAIL                               */}
      {/* ========================================================= */}
      <div className="w-[64px] bg-zinc-950 border-r border-zinc-800/90 flex flex-col items-center py-2.5 justify-between shrink-0">
        <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
          {/* Collapse / Expand Drawer Button (Placed on top of Blocks button) */}
          <button
            type="button"
            onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
            className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors mb-1"
            title={
              isDrawerCollapsed
                ? t('展开侧边面板', 'Expand Panel')
                : t('收起侧边面板', 'Collapse Panel')
            }
          >
            {isDrawerCollapsed ? (
              <ChevronRight size={15} />
            ) : (
              <ChevronLeft size={15} />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('blocks')}
            className={`w-full py-2.5 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'blocks' && !isDrawerCollapsed
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
            title={t('组件库 (点击可折叠侧栏)', 'Components (Click to toggle drawer)')}
          >
            <LayoutGrid size={16} />
            <span className="text-[10px] font-bold leading-tight text-center">
              {t('组件库', 'Blocks')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('assets')}
            className={`relative w-full py-2.5 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'assets' && !isDrawerCollapsed
                ? 'bg-zinc-800 text-amber-300 shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
            title={t('素材库 (点击可折叠侧栏)', 'Assets (Click to toggle drawer)')}
          >
            <ImageIcon size={16} />
            <span className="text-[10px] font-bold leading-tight text-center">
              {t('素材库', 'Assets')}
            </span>
            {customAssets.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold">
                {customAssets.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('templates')}
            className={`relative w-full py-2.5 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'templates' && !isDrawerCollapsed
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
            title={t('模板库 (点击可折叠侧栏)', 'Templates (Click to toggle drawer)')}
          >
            <Bookmark size={16} />
            <span className="text-[10px] font-bold leading-tight text-center">
              {t('模板', 'Saved')}
            </span>
            {savedTemplates.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-zinc-200 text-[9px] font-mono font-bold">
                {savedTemplates.length}
              </span>
            )}
          </button>
        </div>

        {/* Language Switcher (Placed where collapse panel was) */}
        <div className="flex flex-col items-center gap-1 w-full px-1.5">
          <div className="flex flex-col w-full bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setLang('zh')}
              className={`py-1 w-full text-center rounded transition-colors ${
                lang === 'zh'
                  ? 'bg-zinc-100 text-zinc-900 font-extrabold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="切换为中文"
            >
              中
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`py-1 w-full text-center rounded transition-colors ${
                lang === 'en'
                  ? 'bg-zinc-100 text-zinc-900 font-extrabold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Switch to English"
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EXPANDABLE DRAWER CONTENT                                 */}
      {/* ========================================================= */}
      {!isDrawerCollapsed && (
        <div className="w-full md:w-[268px] flex-1 md:flex-initial flex flex-col h-full overflow-hidden">
          {/* Drag Hint Banner */}
          {activeTab === 'blocks' && (
            <div className="px-3 py-2 bg-zinc-950/80 border-b border-zinc-800/80 text-[10.5px] text-zinc-400 flex items-center gap-1.5 shrink-0">
              <GripVertical size={12} className="text-blue-400 shrink-0" />
              <span>
                {t(
                  '点击插入，或按住拖拽到任意容器内',
                  'Click to insert or drag into any container'
                )}
              </span>
            </div>
          )}

          {/* TAB 1: COMPONENT LIBRARY */}
          {activeTab === 'blocks' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* ===================================================== */}
              {/* 1. CONTAINERS & FRAMES (Collapsible)                  */}
              {/* ===================================================== */}
              <div className="border border-zinc-800/90 rounded-lg bg-zinc-950/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('containers')}
                  className="w-full px-2.5 py-2 bg-zinc-900/90 hover:bg-zinc-800/80 flex items-center justify-between text-left transition-colors"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
                    {t('1. 容器与框架', '1. Containers & Frames')}
                  </span>
                  {collapsedSections.containers ? (
                    <ChevronRight size={14} className="text-zinc-400" />
                  ) : (
                    <ChevronDown size={14} className="text-zinc-400" />
                  )}
                </button>
                {!collapsedSections.containers && (
                  <div className="p-2 grid grid-cols-2 gap-2 border-t border-zinc-800/70">
              {/* Blank Container */}
              <button
                type="button"
                onClick={handleAddBlankContainer}
                {...bindDrag({
                  source: 'library_root',
                  rootFactory: 'blank_container',
                })}
                className="group bg-zinc-800/90 hover:bg-zinc-800 border border-blue-500/40 hover:border-blue-400 rounded-md p-2 text-left transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
              >
                <div className="bg-zinc-200 rounded p-1.5 flex flex-col gap-1 border border-dashed border-zinc-500">
                  <div className="h-9 bg-zinc-300/80 rounded-[2px] flex items-center justify-center text-[8px] font-bold text-zinc-600">
                    BLANK
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-blue-300 group-hover:text-white">
                  {t('+ 空白自由容器', '+ Blank Container')}
                </span>
              </button>

              {/* Simple Title Container */}
              <button
                type="button"
                onClick={handleAddSimpleHeaderSection}
                {...bindDrag({
                  source: 'library_root',
                  rootFactory: 'simple_header_section',
                })}
                className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-md p-2 text-left transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
              >
                <div className="bg-zinc-200 rounded p-1.5 flex flex-col gap-1 border border-zinc-400">
                  <div className="flex items-center gap-1 border-b border-zinc-400 pb-1">
                    <div className="h-2.5 w-20 bg-zinc-700 rounded-[1px]" />
                  </div>
                  <div className="h-6 bg-zinc-300 rounded-[2px] border border-dashed border-zinc-400" />
                </div>
                <span className="text-[11px] font-semibold text-zinc-200 group-hover:text-white">
                  {t('+ 极简无编号容器', '+ Simple Header Box')}
                </span>
              </button>

              {/* Numbered Section Container */}
              <button
                type="button"
                onClick={handleAddNumberedSection}
                {...bindDrag({
                  source: 'library_root',
                  rootFactory: 'numbered_section',
                })}
                className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-md p-2 text-left transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
              >
                <div className="bg-zinc-200 rounded p-1.5 flex flex-col gap-1 border border-zinc-400">
                  <div className="flex items-center gap-1 border-b border-zinc-400 pb-1">
                    <span className="w-3.5 h-3.5 bg-zinc-700 text-white text-[8px] font-black flex items-center justify-center rounded-[2px]">
                      1
                    </span>
                    <div className="h-2 w-16 bg-zinc-700 rounded-[1px]" />
                  </div>
                  <div className="h-6 bg-zinc-300 rounded-[2px] border border-dashed border-zinc-400" />
                </div>
                <span className="text-[11px] font-semibold text-zinc-200 group-hover:text-white">
                  {t('+ 编号章节容器', '+ Numbered Section')}
                </span>
              </button>

              {/* Highlights Bar */}
              <button
                type="button"
                onClick={() => insertRootBlock(createHighlightsBarBlock())}
                {...bindDrag({
                  source: 'library_root',
                  rootFactory: 'highlights_bar',
                })}
                className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-md p-2 text-left transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
              >
                <div className="bg-zinc-200 rounded p-1.5 flex flex-col gap-1 border border-zinc-400">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-zinc-700" />
                    <div className="h-2 w-14 bg-zinc-700 rounded-[1px]" />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="h-5 bg-zinc-600 rounded-[2px]" />
                    <div className="h-5 bg-zinc-500 rounded-[2px]" />
                    <div className="h-5 bg-zinc-600 rounded-[2px]" />
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-zinc-200 group-hover:text-white">
                  {t('+ 看点卡片横栏', '+ Highlights Row')}
                </span>
              </button>

              {/* Masthead */}
              <button
                type="button"
                onClick={() => insertRootBlock(createMastheadBlock())}
                {...bindDrag({
                  source: 'library_root',
                  rootFactory: 'masthead',
                })}
                className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-md p-2 text-left transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
              >
                <div className="bg-zinc-200 rounded overflow-hidden border border-zinc-400 flex flex-col">
                  <div className="h-2 bg-zinc-700 w-full" />
                  <div className="h-7 bg-zinc-400 flex items-end p-1">
                    <div className="h-2 w-16 bg-zinc-800 rounded-[1px]" />
                  </div>
                  <div className="h-2.5 bg-zinc-700 w-full" />
                </div>
                <span className="text-[11px] font-semibold text-zinc-200 group-hover:text-white">
                  {t('+ 顶部刊头封面', '+ Masthead Header')}
                </span>
              </button>

              {/* Footer Banner */}
              <button
                type="button"
                onClick={() => insertRootBlock(createFooterBannerBlock())}
                {...bindDrag({
                  source: 'library_root',
                  rootFactory: 'footer_banner',
                })}
                className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-md p-2 text-left transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
              >
                <div className="bg-zinc-200 rounded overflow-hidden border border-zinc-400 flex flex-col justify-end h-[46px]">
                  <div className="h-6 bg-zinc-600 flex flex-col items-center justify-center gap-0.5 p-1">
                    <div className="h-1.5 w-16 bg-zinc-200 rounded-[1px]" />
                    <div className="h-1 w-10 bg-zinc-300 rounded-[1px]" />
                  </div>
                </div>
                    <span className="text-[11px] font-semibold text-zinc-200 group-hover:text-white">
                      {t('+ 底部尾图标语', '+ Footer Banner')}
                    </span>
                  </button>
                </div>
              )}
              </div>

              {/* ===================================================== */}
              {/* 2. CUSTOM ASSET & MULTI-COLUMN LAYOUTS (Collapsible)  */}
              {/* ===================================================== */}
              <div className="border border-zinc-800/90 rounded-lg bg-zinc-950/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('columns')}
                  className="w-full px-2.5 py-2 bg-zinc-900/90 hover:bg-zinc-800/80 flex items-center justify-between text-left transition-colors"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                    {t('2. 自由素材与多列分栏', '2. Custom Assets & Columns')}
                  </span>
                  {collapsedSections.columns ? (
                    <ChevronRight size={14} className="text-zinc-400" />
                  ) : (
                    <ChevronDown size={14} className="text-zinc-400" />
                  )}
                </button>
                {!collapsedSections.columns && (
                  <div className="p-2 space-y-2 border-t border-zinc-800/70">
                    {/* Custom Asset / Free Ratio Picture */}
                    <button
                      type="button"
                      onClick={() => insertContentBlock('freeform_asset_block')}
                      {...bindDrag({
                        source: 'library_child',
                        blockType: 'freeform_asset_block',
                      })}
                      className="w-full group bg-zinc-800/90 hover:bg-zinc-800 border border-blue-500/40 hover:border-blue-400 rounded-md p-2 text-left transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                    >
                      <div className="bg-zinc-200 rounded p-2 border border-dashed border-zinc-500 flex items-center justify-center h-10">
                        <span className="text-[9px] font-black text-zinc-700 tracking-wider">
                          {t('原图自适应 / FREE ASSET', 'FREE ASPECT ASSET')}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-blue-200 group-hover:text-white">
                        {t('+ 自定义图片/素材框 (不裁切)', '+ Freeform Picture / Asset')}
                      </span>
                    </button>

                    {/* 2 / 3 / 4 Column Grid Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          insertContentBlock('custom_columns_block', undefined, undefined, '2col')
                        }
                        {...bindDrag({
                          source: 'library_child',
                          blockType: 'custom_columns_block',
                          variantHint: '2col',
                        })}
                        className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-md p-2 text-left flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                      >
                        <div className="bg-zinc-200 rounded p-1.5 grid grid-cols-2 gap-1 border border-zinc-400">
                          <div className="bg-zinc-400 h-6 rounded-[2px] border border-zinc-500" />
                          <div className="bg-zinc-400 h-6 rounded-[2px] border border-zinc-500" />
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-200">
                          {t('+ 自由双列 (2列)', '+ 2 Columns Grid')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          insertContentBlock('custom_columns_block', undefined, undefined, '3col')
                        }
                        {...bindDrag({
                          source: 'library_child',
                          blockType: 'custom_columns_block',
                          variantHint: '3col',
                        })}
                        className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-md p-2 text-left flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                      >
                        <div className="bg-zinc-200 rounded p-1.5 grid grid-cols-3 gap-1 border border-zinc-400">
                          <div className="bg-zinc-400 h-6 rounded-[2px] border border-zinc-500" />
                          <div className="bg-zinc-400 h-6 rounded-[2px] border border-zinc-500" />
                          <div className="bg-zinc-400 h-6 rounded-[2px] border border-zinc-500" />
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-200">
                          {t('+ 自由三列 (3列)', '+ 3 Columns Grid')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          insertContentBlock('custom_columns_block', undefined, undefined, '4col')
                        }
                        {...bindDrag({
                          source: 'library_child',
                          blockType: 'custom_columns_block',
                          variantHint: '4col',
                        })}
                        className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-md p-2 text-left flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                      >
                        <div className="bg-zinc-200 rounded p-1.5 grid grid-cols-4 gap-1 border border-zinc-400">
                          <div className="bg-zinc-400 h-6 rounded-[2px]" />
                          <div className="bg-zinc-400 h-6 rounded-[2px]" />
                          <div className="bg-zinc-400 h-6 rounded-[2px]" />
                          <div className="bg-zinc-400 h-6 rounded-[2px]" />
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-200">
                          {t('+ 自由四列 (4列)', '+ 4 Columns Grid')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          insertContentBlock(
                            'custom_columns_block',
                            undefined,
                            undefined,
                            'pure_photos'
                          )
                        }
                        {...bindDrag({
                          source: 'library_child',
                          blockType: 'custom_columns_block',
                          variantHint: 'pure_photos',
                        })}
                        className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-md p-2 text-left flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                      >
                        <div className="bg-zinc-200 rounded p-1.5 grid grid-cols-2 gap-1 border border-zinc-400">
                          <div className="bg-zinc-500 h-6 rounded-[2px]" />
                          <div className="bg-zinc-500 h-6 rounded-[2px]" />
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-200">
                          {t('+ 纯图片并排行', '+ Photo Row Only')}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ===================================================== */}
              {/* 3. SIMPLIFIED ATOMIC TEXT BLOCKS (Collapsible)        */}
              {/* ===================================================== */}
              <div className="border border-zinc-800/90 rounded-lg bg-zinc-950/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('text')}
                  className="w-full px-2.5 py-2 bg-zinc-900/90 hover:bg-zinc-800/80 flex items-center justify-between text-left transition-colors"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                    {t('3. 极简文本与列表', '3. Text & Lists')}
                  </span>
                  {collapsedSections.text ? (
                    <ChevronRight size={14} className="text-zinc-400" />
                  ) : (
                    <ChevronDown size={14} className="text-zinc-400" />
                  )}
                </button>
                {!collapsedSections.text && (
                  <div className="p-2 grid grid-cols-2 gap-2 border-t border-zinc-800/70">
                    <button
                      type="button"
                      onClick={() => insertContentBlock('simple_text_block')}
                      {...bindDrag({
                        source: 'library_child',
                        blockType: 'simple_text_block',
                      })}
                      className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-md p-2 text-left flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                    >
                      <div className="bg-zinc-200 rounded p-1.5 border border-zinc-400 space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-zinc-800" />
                          <div className="h-2 w-16 bg-zinc-700 rounded-[1px]" />
                        </div>
                        <div className="h-1.5 w-full bg-zinc-400 rounded-[1px]" />
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-200">
                        {t('+ 标题 + 段落', '+ Heading & Body')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        insertContentBlock(
                          'simple_text_block',
                          undefined,
                          undefined,
                          'heading_only'
                        )
                      }
                      {...bindDrag({
                        source: 'library_child',
                        blockType: 'simple_text_block',
                        variantHint: 'heading_only',
                      })}
                      className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-md p-2 text-left flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                    >
                      <div className="bg-zinc-200 rounded p-2 border border-zinc-400 flex items-center gap-1">
                        <span className="w-2 h-2 bg-zinc-800" />
                        <div className="h-2.5 w-20 bg-zinc-700 rounded-[1px]" />
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-200">
                        {t('+ 纯小标题行', '+ Heading Only')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertContentBlock('intro_quote_box')}
                      {...bindDrag({
                        source: 'library_child',
                        blockType: 'intro_quote_box',
                      })}
                      className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-md p-2 text-left flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                    >
                      <div className="bg-zinc-200 rounded p-1.5 border border-zinc-400">
                        <div className="bg-white border border-dashed border-zinc-600 rounded p-1.5 space-y-1">
                          <div className="h-1.5 w-full bg-zinc-500 rounded-[1px]" />
                          <div className="h-1.5 w-4/5 bg-zinc-500 rounded-[1px]" />
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-200">
                        {t('+ 章节导语框', '+ Quote / Intro Box')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertContentBlock('bullet_list_block')}
                      {...bindDrag({
                        source: 'library_child',
                        blockType: 'bullet_list_block',
                      })}
                      className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-md p-2 text-left flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                    >
                      <div className="bg-zinc-200 rounded p-1.5 border border-zinc-400 space-y-1">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-zinc-700" />
                            <div className="h-1.5 flex-1 bg-zinc-600 rounded-[1px]" />
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-200">
                        {t('+ 要点列表组', '+ Bullet List')}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* ===================================================== */}
              {/* 4. PREBUILT COMPOSITE BLOCKS (Collapsible)            */}
              {/* ===================================================== */}
              <div className="border border-zinc-800/90 rounded-lg bg-zinc-950/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('composite')}
                  className="w-full px-2.5 py-2 bg-zinc-900/90 hover:bg-zinc-800/80 flex items-center justify-between text-left transition-colors"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                    {t('4. 复合图文与数据模块', '4. Composite Blocks')}
                  </span>
                  {collapsedSections.composite ? (
                    <ChevronRight size={14} className="text-zinc-400" />
                  ) : (
                    <ChevronDown size={14} className="text-zinc-400" />
                  )}
                </button>
                {!collapsedSections.composite && (
                  <div className="p-2 space-y-2 border-t border-zinc-800/70">
                    <button
                      type="button"
                      onClick={() => insertContentBlock('dated_event_block')}
                      {...bindDrag({
                        source: 'library_child',
                        blockType: 'dated_event_block',
                      })}
                      className="w-full group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-md p-2 text-left transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                    >
                      <div className="bg-zinc-200 rounded p-2 flex flex-col gap-1 border border-zinc-400">
                        <div className="h-2 w-12 bg-zinc-700 rounded-[1px]" />
                        <div className="grid grid-cols-3 gap-1 pt-0.5">
                          <div className="h-6 bg-zinc-400 border border-zinc-500 rounded-[2px]" />
                          <div className="h-6 bg-zinc-400 border border-zinc-500 rounded-[2px]" />
                          <div className="h-6 bg-zinc-400 border border-zinc-500 rounded-[2px]" />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                        {t('日期 + 标题正文 + 多图网格', 'Dated Event + Photo Grid')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertContentBlock('split_media_text')}
                      {...bindDrag({
                        source: 'library_child',
                        blockType: 'split_media_text',
                      })}
                      className="w-full group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-md p-2 text-left transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                    >
                      <div className="bg-zinc-200 rounded p-2 grid grid-cols-2 gap-2 border border-zinc-400 items-center">
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-zinc-700 rounded-[1px]" />
                          <div className="h-1.5 w-4/5 bg-zinc-400 rounded-[1px]" />
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <div className="h-8 bg-zinc-400 border border-zinc-500 rounded-[2px]" />
                          <div className="h-8 bg-zinc-400 border border-zinc-500 rounded-[2px]" />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                        {t('左右图文分栏', 'Split Text & Media')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertContentBlock('two_column_cards')}
                      {...bindDrag({
                        source: 'library_child',
                        blockType: 'two_column_cards',
                      })}
                      className="w-full group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-md p-2 text-left transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                    >
                      <div className="bg-zinc-200 rounded p-2 grid grid-cols-2 gap-2 border border-zinc-400">
                        <div className="h-7 bg-zinc-400 border border-zinc-500 rounded-[2px]" />
                        <div className="h-7 bg-zinc-400 border border-zinc-500 rounded-[2px]" />
                      </div>
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                        {t('双栏并列图文卡片', 'Two-Column Photo Cards')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertContentBlock('feature_callout_grid')}
                      {...bindDrag({
                        source: 'library_child',
                        blockType: 'feature_callout_grid',
                      })}
                      className="w-full group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-md p-2 text-left transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                    >
                      <div className="bg-zinc-200 rounded p-2 grid grid-cols-3 gap-2 border border-zinc-400">
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="flex flex-col items-center gap-1">
                            <div className="w-5 h-5 rounded-full bg-zinc-400 border border-zinc-500" />
                            <div className="h-1.5 w-8 bg-zinc-700 rounded-[1px]" />
                          </div>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                        {t('三栏圆图展示卡', 'Circle Showcase Grid')}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => insertContentBlock('kpi_stat_row')}
                        {...bindDrag({
                          source: 'library_child',
                          blockType: 'kpi_stat_row',
                        })}
                        className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-md p-2 text-left flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                      >
                        <div className="bg-zinc-200 rounded p-1.5 border border-zinc-400 space-y-1">
                          <div className="text-[10px] font-black text-zinc-800">7 · 14</div>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="h-3.5 bg-white rounded-[1px]" />
                            <div className="h-3.5 bg-white rounded-[1px]" />
                            <div className="h-3.5 bg-white rounded-[1px]" />
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-200">
                          {t('+ 多维数据通报', '+ KPI Stat Row')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => insertContentBlock('kpi_banner_card')}
                        {...bindDrag({
                          source: 'library_child',
                          blockType: 'kpi_banner_card',
                        })}
                        className="group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-md p-2 text-left flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                      >
                        <div className="bg-zinc-200 rounded p-1.5 border border-zinc-400 grid grid-cols-2 gap-1">
                          <div className="bg-zinc-700 text-white text-[10px] font-black flex items-center justify-center rounded-[1px] h-7">
                            1500
                          </div>
                          <div className="bg-zinc-400 rounded-[1px] h-7" />
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-200">
                          {t('+ 大数字配图卡', '+ KPI Banner Card')}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM DESIGN ASSETS LIBRARY */}
          {activeTab === 'assets' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Upload New Custom Design Box */}
              <div className="bg-zinc-800/80 border border-zinc-700/80 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-400" />
                    <span>{t('上传自定义设计素材', 'Upload Custom Asset')}</span>
                  </span>
                </div>

                <input
                  ref={assetUploadInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadCustomAssetFiles}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => assetUploadInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <Upload size={13} />
                  <span>{t('+ 上传自定义图片 / 素材...', '+ Upload Asset / Photo...')}</span>
                </button>

                <div className="text-[10px] text-zinc-400 leading-snug">
                  {t(
                    '选择文件后将弹出确认窗口，可指定作为「配图照片、章节徽章、PNG相框、要点符号、容器背景或角标」使用。',
                    'After choosing a file, a confirmation window will let you assign it as a Photo, Badge, Frame, Bullet, Background, or Sticker.'
                  )}
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'all', zh: '全部', en: 'All' },
                    { id: 'photo', zh: '配图', en: 'Photo' },
                    { id: 'frame', zh: '相框', en: 'Frame' },
                    { id: 'badge', zh: '徽章', en: 'Badge' },
                    { id: 'bullet', zh: '符号', en: 'Bullet' },
                    { id: 'background', zh: '背景', en: 'Bg' },
                    { id: 'sticker', zh: '角标', en: 'Sticker' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAssetFilter(f.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      assetFilter === f.id
                        ? 'bg-amber-400/20 border-amber-400/60 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t(f.zh, f.en)}
                  </button>
                ))}
              </div>

              {/* Assets Grid */}
              {(() => {
                const filtered =
                  assetFilter === 'all'
                    ? customAssets
                    : customAssets.filter((a) => a.category === assetFilter);

                const catLabel: Record<
                  CustomAssetCategory,
                  { zh: string; en: string; actionZh: string; actionEn: string }
                > = {
                  photo: {
                    zh: '图片',
                    en: 'Photo',
                    actionZh: selectedImageSlotId ? '填入图片槽' : '插入图片',
                    actionEn: selectedImageSlotId ? 'Fill Slot' : 'Insert',
                  },
                  frame: {
                    zh: '相框',
                    en: 'Frame',
                    actionZh: '套用相框',
                    actionEn: 'Apply Frame',
                  },
                  badge: {
                    zh: '徽章',
                    en: 'Badge',
                    actionZh: '设为章节章',
                    actionEn: 'Set Badge',
                  },
                  bullet: {
                    zh: '符号',
                    en: 'Bullet',
                    actionZh: '设为要点符',
                    actionEn: 'Set Bullet',
                  },
                  background: {
                    zh: '背景',
                    en: 'Bg',
                    actionZh: '设为容器底图',
                    actionEn: 'Set Bg',
                  },
                  sticker: {
                    zh: '角标',
                    en: 'Sticker',
                    actionZh: '设为右上角标',
                    actionEn: 'Set Sticker',
                  },
                };

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10 text-zinc-500 text-xs">
                      {t('暂无该分类的自定义素材', 'No custom assets in this category yet')}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-2">
                    {filtered.map((asset) => {
                      const meta = catLabel[asset.category] || catLabel.photo;
                      return (
                        <div
                          key={asset.id}
                          className="group bg-zinc-800/90 border border-zinc-700/80 hover:border-zinc-500 rounded-md overflow-hidden flex flex-col"
                        >
                          {/* Thumbnail Preview */}
                          <div
                            onClick={() => handleApplyCustomAsset(asset)}
                            className="relative h-24 bg-zinc-950/80 flex items-center justify-center p-2 cursor-pointer overflow-hidden"
                            style={{
                              backgroundImage:
                                'linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)',
                              backgroundSize: '12px 12px',
                              backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                            }}
                          >
                            <img
                              src={asset.url}
                              alt={asset.name}
                              className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                            />
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-zinc-900/90 border border-zinc-700 text-[9px] font-bold text-amber-300">
                              {t(meta.zh, meta.en)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCustomAsset(asset.id);
                              }}
                              title={t('删除素材', 'Delete asset')}
                              className="opacity-0 group-hover:opacity-100 absolute top-1.5 right-1.5 p-1 rounded bg-zinc-900/90 hover:bg-red-950 text-zinc-400 hover:text-red-300 transition-opacity"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>

                          {/* Name & Quick Apply Buttons */}
                          <div className="p-1.5 flex flex-col gap-1 bg-zinc-900/60">
                            <div className="text-[10px] font-semibold text-zinc-200 truncate">
                              {asset.name}
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleApplyCustomAsset(asset)}
                                className="flex-1 py-1 px-1.5 bg-blue-600/90 hover:bg-blue-500 text-white rounded text-[10px] font-semibold flex items-center justify-center gap-1"
                              >
                                <Check size={10} />
                                <span>{t(meta.actionZh, meta.actionEn)}</span>
                              </button>
                              {asset.category !== 'photo' && (
                                <button
                                  type="button"
                                  onClick={() => handleInsertAssetAsBlock(asset)}
                                  title={t('作为独立图片块插入', 'Insert as image block')}
                                  className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded text-[10px]"
                                >
                                  <Plus size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: SAVED TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="bg-zinc-800/60 border border-zinc-700/70 rounded-md p-2.5 text-xs text-zinc-300 leading-relaxed">
                {t(
                  '点击插入，或直接按住拖拽模板放入画布任意容器内。',
                  'Click to insert or drag templates directly onto the canvas.'
                )}
              </div>

              {savedTemplates.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  {t('暂无保存的自定义模板', 'No saved templates yet')}
                </div>
              ) : (
                <div className="space-y-2">
                  {savedTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      {...bindDrag({
                        source: 'library_template',
                        templateId: tpl.id,
                      })}
                      className="bg-zinc-800 border border-zinc-700 rounded-md p-2.5 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-1.5">
                        <GripVertical size={13} className="text-zinc-500 shrink-0" />
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-200 shrink-0">
                          {tpl.category === 'section'
                            ? t('整章', 'Sec')
                            : t('组件', 'Blk')}
                        </span>
                        <span className="text-xs font-semibold text-white truncate">
                          {tpl.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (tpl.category === 'section') {
                              insertRootBlock(
                                cloneWithNewIds(tpl.payload as SectionContainerBlock)
                              );
                            } else {
                              insertContentBlock(
                                cloneWithNewIds(tpl.payload as ContentBlock)
                              );
                            }
                          }}
                          className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Plus size={11} />
                          <span>{t('插入', 'Insert')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(tpl.id)}
                          className="p-1 text-zinc-400 hover:text-red-400 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ASSET UPLOAD CONFIRMATION MODAL WINDOW                    */}
      {/* ========================================================= */}
      {pendingAssets.length > 0 &&
        createPortal(
          <div
            onClick={() => setPendingAssets([])}
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    {t(
                      '确认添加自定义素材',
                      'Confirm & Categorize Custom Asset'
                    )}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingAssets([])}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal Body: Preview & Component Type Selection */}
              <div className="p-4 overflow-y-auto space-y-4">
                {pendingAssets.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-3 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-20 h-20 rounded-lg border border-zinc-700 flex items-center justify-center p-1.5 shrink-0 overflow-hidden"
                        style={{
                          backgroundImage:
                            'linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)',
                          backgroundSize: '12px 12px',
                          backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                        }}
                      >
                        <img
                          src={item.url}
                          alt={item.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <label className="block text-[11px] font-semibold text-zinc-400">
                          {t('素材名称', 'Asset Name')}
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPendingAssets((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, name: val } : p
                              )
                            );
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-blue-500 rounded-md px-2.5 py-1.5 text-xs text-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Choose Asset Component Category */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-zinc-300">
                        {t(
                          '选择该素材用于哪种组件类型：',
                          'Select which component type this asset is for:'
                        )}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(
                          [
                            {
                              id: 'photo',
                              zh: '配图照片 / 插图',
                              en: 'Photo / Image',
                              descZh: '填入图片框或作为独立图片块',
                              descEn: 'Fill photo slots or insert block',
                            },
                            {
                              id: 'badge',
                              zh: '章节数字徽章',
                              en: 'Number Badge',
                              descZh: '置于章节序号 [1] 背后的图形',
                              descEn: 'Behind section number [1]',
                            },
                            {
                              id: 'frame',
                              zh: 'PNG 相框 / 遮罩',
                              en: 'Photo Frame / Mask',
                              descZh: '照片底层相框、前景框或异形遮罩',
                              descEn: 'Frame behind/front or shape mask',
                            },
                            {
                              id: 'bullet',
                              zh: '列表要点符号',
                              en: 'Bullet Icon',
                              descZh: '替代小标题方块 ■ 或列表图标',
                              descEn: 'Custom heading or list bullet',
                            },
                            {
                              id: 'background',
                              zh: '容器背景底图',
                              en: 'Container Bg',
                              descZh: '作为章节容器的纹理或顶部横幅',
                              descEn: 'Section container background',
                            },
                            {
                              id: 'sticker',
                              zh: '容器角标贴纸',
                              en: 'Corner Sticker',
                              descZh: '装饰在章节容器右上角的贴纸',
                              descEn: 'Top-right container decoration',
                            },
                          ] as {
                            id: CustomAssetCategory;
                            zh: string;
                            en: string;
                            descZh: string;
                            descEn: string;
                          }[]
                        ).map((cat) => {
                          const isSelected = item.category === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setPendingAssets((prev) =>
                                  prev.map((p, i) =>
                                    i === idx ? { ...p, category: cat.id } : p
                                  )
                                );
                              }}
                              className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-0.5 ${
                                isSelected
                                  ? 'bg-blue-600/20 border-blue-400 text-white shadow-sm'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">
                                  {t(cat.zh, cat.en)}
                                </span>
                                {isSelected && (
                                  <Check size={12} className="text-blue-400 shrink-0" />
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 leading-tight">
                                {t(cat.descZh, cat.descEn)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer Buttons */}
              <div className="px-4 py-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingAssets([])}
                  className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                >
                  {t('取消', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmPendingAssets(false)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-bold flex items-center gap-1.5"
                >
                  <Check size={13} />
                  <span>{t('确认添加到素材库', 'Confirm & Add to Assets')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmPendingAssets(true)}
                  className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles size={13} />
                  <span>
                    {t('添加并立即应用', 'Add & Apply Now')}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
};
