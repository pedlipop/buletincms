import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Copy,
  GripVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  BulletListBlock,
  ContentBlock,
  CustomColumnsBlock,
  DatedEventBlock,
  FeatureCalloutGridBlock,
  FooterBannerBlock,
  FreeformAssetBlock,
  HighlightsBarBlock,
  IntroQuoteBoxBlock,
  KpiBannerCardBlock,
  KpiStatRowBlock,
  MastheadBlock,
  PhotoLayoutPreset,
  RootBlock,
  SectionContainerBlock,
  SectionTheme,
  SimpleTextBlock,
  SplitMediaTextBlock,
  TwoColumnCardsBlock,
} from '../types/bulletin';
import { createImageSlot, SECTION_THEMES } from '../data/presets';
import { DragPayload, useBulletinStore } from '../store/useBulletinStore';
import { EditableText } from './EditableText';
import { ImageSlot } from './ImageSlot';
import { resolveLayoutRows } from '../utils/photoLayout';

// =======================================================
// INLINE SUB-ELEMENT DELETE WRAPPER
// Allows deleting any inner text, bullet, title, or item
// inside a prebuilt container or block with 1 click!
// =======================================================

interface DeletablePartProps {
  onDelete: () => void;
  title?: string;
  children: React.ReactNode;
  inline?: boolean;
  style?: React.CSSProperties;
}

const DeletablePart: React.FC<DeletablePartProps> = ({
  onDelete,
  title = '删除此元素 (可在右侧面板恢复)',
  children,
  inline = false,
  style,
}) => {
  const previewMode = useBulletinStore((s) => s.previewMode);
  const [isNear, setIsNear] = useState(false);

  if (previewMode) {
    return inline ? <span style={style}>{children}</span> : <div style={style}>{children}</div>;
  }

  const Tag = inline ? 'span' : 'div';

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Calculate distance between mouse cursor and top-right delete button corner
    const targetX = rect.right;
    const targetY = rect.top;
    const dist = Math.hypot(e.clientX - targetX, e.clientY - targetY);
    // Button only appears when mouse gets close (within 40px)
    setIsNear(dist <= 40);
  };

  return (
    <Tag
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setIsNear(false)}
      style={{
        display: inline ? 'inline-flex' : 'block',
        ...style,
      }}
    >
      {children}
      <button
        type="button"
        contentEditable={false}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title={title}
        className={`transition-all duration-150 transform ${
          isNear
            ? 'opacity-100 scale-100 pointer-events-auto shadow-md'
            : 'opacity-0 scale-75 pointer-events-none'
        }`}
        style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          zIndex: 30,
          width: '16px',
          height: '16px',
          borderRadius: '9999px',
          backgroundColor: '#dc2626',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '1.5px solid #ffffff',
        }}
      >
        <X size={9} strokeWidth={3} />
      </button>
    </Tag>
  );
};

// =======================================================
// FLOATING BLOCK ACTION BAR (WITH DRAG HANDLE)
// =======================================================

interface FloatingToolbarProps {
  label: string;
  dragPayload: DragPayload;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onSaveTemplate?: () => void;
  onDelete: () => void;
  isInner?: boolean;
}

const FloatingBlockBar: React.FC<FloatingToolbarProps> = ({
  label,
  dragPayload,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onSaveTemplate,
  onDelete,
  isInner = false,
}) => {
  const setActiveDrag = useBulletinStore((s) => s.setActiveDrag);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: isInner ? '-26px' : '-28px',
        right: '0px',
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        backgroundColor: isInner ? '#2563eb' : '#18181b',
        color: '#ffffff',
        padding: '2px 6px',
        borderRadius: '4px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
        fontSize: '10px',
        fontWeight: 600,
      }}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setActiveDrag(dragPayload);
          e.dataTransfer.setData('application/x-buletincms', JSON.stringify(dragPayload));
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setActiveDrag(null)}
        title="按住拖拽此模块到任意容器或位置 (Drag to any container)"
        className="flex items-center gap-1 cursor-grab active:cursor-grabbing pr-1.5 mr-1 border-r border-white/20 hover:text-amber-300"
      >
        <GripVertical size={12} />
        <span>拖拽 · {label}</span>
      </div>
      <button
        type="button"
        onClick={onMoveUp}
        title="上移 (Move Up)"
        className="p-1 hover:bg-white/20 rounded"
      >
        <ArrowUp size={11} />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        title="下移 (Move Down)"
        className="p-1 hover:bg-white/20 rounded"
      >
        <ArrowDown size={11} />
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        title="复制 (Duplicate)"
        className="p-1 hover:bg-white/20 rounded"
      >
        <Copy size={11} />
      </button>
      {onSaveTemplate && (
        <button
          type="button"
          onClick={onSaveTemplate}
          title="保存到我的模板 (Save to My Templates)"
          className="p-1 hover:bg-white/20 rounded"
        >
          <BookmarkPlus size={11} />
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        title="删除模块 (Delete)"
        className="p-1 hover:bg-red-500/80 rounded"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
};

// =======================================================
// INNER CONTENT BLOCK RENDERER
// =======================================================

interface InnerBlockProps {
  block: ContentBlock;
  section: SectionContainerBlock;
  sectionId: string;
  childIndex: number;
  theme: SectionTheme;
}

const InnerContentBlockView: React.FC<InnerBlockProps> = ({
  block,
  section,
  sectionId,
  childIndex,
  theme,
}) => {
  const [isDragOverTop, setIsDragOverTop] = useState(false);

  const selectedChildBlockId = useBulletinStore((s) => s.selectedChildBlockId);
  const previewMode = useBulletinStore((s) => s.previewMode);
  const activeDrag = useBulletinStore((s) => s.activeDrag);
  const setActiveDrag = useBulletinStore((s) => s.setActiveDrag);
  const selectBlock = useBulletinStore((s) => s.selectBlock);
  const updateContentBlock = useBulletinStore((s) => s.updateContentBlock);
  const moveContentBlock = useBulletinStore((s) => s.moveContentBlock);
  const duplicateContentBlock = useBulletinStore((s) => s.duplicateContentBlock);
  const deleteContentBlock = useBulletinStore((s) => s.deleteContentBlock);
  const handleDropIntoContainer = useBulletinStore((s) => s.handleDropIntoContainer);
  const saveTemplate = useBulletinStore((s) => s.saveTemplate);

  const isSelected = !previewMode && selectedChildBlockId === block.id;

  const updateSelf = (patch: Partial<ContentBlock>) => {
    updateContentBlock(sectionId, block.id, (prev) => ({
      ...prev,
      ...patch,
    } as ContentBlock));
  };

  const renderBulletSquare = (
    onDeleteBullet?: () => void,
    overrideCustomUrl?: string | null
  ) => {
    const shape = section.bulletShape || 'square';
    const sz = section.bulletSize || 8;
    const customUrl = overrideCustomUrl || section.bulletCustomUrl;

    let bulletNode: React.ReactNode;

    if (customUrl) {
      const bScale = section.bulletAssetScale ?? 1;
      const bx = section.bulletAssetX || 0;
      const by = section.bulletAssetY || 0;
      bulletNode = (
        <img
          src={customUrl}
          alt=""
          style={{
            display: 'inline-block',
            width: `${sz + 4}px`,
            height: `${sz + 4}px`,
            objectFit: 'contain',
            marginRight: '6px',
            flexShrink: 0,
            transform: `translate(${bx}px, ${by + 2}px) scale(${bScale})`,
            transformOrigin: 'center center',
          }}
        />
      );
    } else if (shape === 'circle') {
      bulletNode = (
        <span
          style={{
            display: 'inline-block',
            width: `${sz}px`,
            height: `${sz}px`,
            borderRadius: '9999px',
            backgroundColor: theme.primaryColor,
            marginRight: '6px',
            flexShrink: 0,
            transform: 'translateY(1px)',
          }}
        />
      );
    } else if (shape === 'diamond') {
      bulletNode = (
        <span
          style={{
            display: 'inline-block',
            width: `${Math.max(6, sz - 1)}px`,
            height: `${Math.max(6, sz - 1)}px`,
            backgroundColor: theme.primaryColor,
            marginRight: '7px',
            flexShrink: 0,
            transform: 'translateY(1px) rotate(45deg)',
          }}
        />
      );
    } else if (shape === 'ring') {
      bulletNode = (
        <span
          style={{
            display: 'inline-block',
            width: `${sz + 1}px`,
            height: `${sz + 1}px`,
            borderRadius: '9999px',
            border: `2px solid ${theme.primaryColor}`,
            backgroundColor: 'transparent',
            marginRight: '6px',
            flexShrink: 0,
            transform: 'translateY(1px)',
          }}
        />
      );
    } else if (shape === 'bar') {
      bulletNode = (
        <span
          style={{
            display: 'inline-block',
            width: '4px',
            height: `${sz + 4}px`,
            borderRadius: '2px',
            backgroundColor: theme.primaryColor,
            marginRight: '6px',
            flexShrink: 0,
            transform: 'translateY(2px)',
          }}
        />
      );
    } else if (shape === 'arrow') {
      bulletNode = (
        <svg
          width={sz + 2}
          height={sz + 2}
          viewBox="0 0 12 12"
          style={{
            display: 'inline-block',
            marginRight: '5px',
            flexShrink: 0,
            transform: 'translateY(1px)',
          }}
        >
          <polygon points="2,1 11,6 2,11" fill={theme.primaryColor} />
        </svg>
      );
    } else if (shape === 'star') {
      bulletNode = (
        <svg
          width={sz + 3}
          height={sz + 3}
          viewBox="0 0 24 24"
          style={{
            display: 'inline-block',
            marginRight: '5px',
            flexShrink: 0,
            transform: 'translateY(2px)',
          }}
        >
          <polygon
            points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3"
            fill={theme.primaryColor}
          />
        </svg>
      );
    } else {
      bulletNode = (
        <span
          style={{
            display: 'inline-block',
            width: `${sz}px`,
            height: `${sz}px`,
            backgroundColor: theme.primaryColor,
            marginRight: '6px',
            flexShrink: 0,
            transform: 'translateY(1px)',
          }}
        />
      );
    }

    if (!onDeleteBullet || previewMode) return bulletNode;
    return (
      <DeletablePart
        inline
        onDelete={onDeleteBullet}
        title="删除要点符号"
      >
        {bulletNode}
      </DeletablePart>
    );
  };

  const renderInnerContent = () => {
    switch (block.type) {
      case 'simple_text_block': {
        const b = block as SimpleTextBlock;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {b.showHeading && (
              <DeletablePart
                onDelete={() => updateSelf({ showHeading: false })}
                title="删除标题行"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent:
                      b.textAlign === 'center'
                        ? 'center'
                        : b.textAlign === 'justify'
                        ? 'flex-start'
                        : 'flex-start',
                  }}
                >
                  {b.showBullet &&
                    renderBulletSquare(() => updateSelf({ showBullet: false }))}
                  <EditableText
                    value={b.heading}
                    onChange={(heading) => updateSelf({ heading })}
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: theme.textColor,
                      lineHeight: 1.4,
                    }}
                  />
                </div>
              </DeletablePart>
            )}
            {b.showBody && (
              <DeletablePart
                onDelete={() => updateSelf({ showBody: false })}
                title="删除正文段落"
              >
                <EditableText
                  value={b.bodyText}
                  onChange={(bodyText) => updateSelf({ bodyText })}
                  style={{
                    fontSize: '11.5px',
                    lineHeight: 1.6,
                    color: theme.mutedTextColor,
                    textAlign: b.textAlign,
                  }}
                />
              </DeletablePart>
            )}
          </div>
        );
      }

      case 'freeform_asset_block': {
        const b = block as FreeformAssetBlock;
        const padMap = { none: '0px', sm: '6px', md: '12px' };
        return (
          <div
            style={{
              padding: padMap[b.padding],
              backgroundColor: b.bordered ? theme.cardBg : 'transparent',
              border: b.bordered ? `1px solid ${theme.containerBorder}` : 'none',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <ImageSlot
              slot={b.image}
              rootBlockId={sectionId}
              childBlockId={b.id}
              shape={b.padding === 'none' ? 'rect' : 'rounded'}
            />
            {b.showCaption && (
              <DeletablePart
                onDelete={() => updateSelf({ showCaption: false })}
                title="删除图片说明文字"
              >
                <EditableText
                  value={b.caption}
                  onChange={(caption) => updateSelf({ caption })}
                  style={{
                    fontSize: '11px',
                    color: theme.mutedTextColor,
                    textAlign: 'center',
                  }}
                />
              </DeletablePart>
            )}
          </div>
        );
      }

      case 'custom_columns_block': {
        const b = block as CustomColumnsBlock;
        const gapMap = { sm: '6px', md: '10px', lg: '14px' };
        let gridTemplate = `repeat(${b.columns}, minmax(0, 1fr))`;
        if (b.columns === 2 && b.columnRatio !== 'equal') {
          const [l, r] = b.columnRatio.split(':');
          gridTemplate = `${l}fr ${r}fr`;
        }

        const updateColItem = (
          idx: number,
          patch: Partial<CustomColumnsBlock['items'][0]>
        ) => {
          const next = [...b.items];
          next[idx] = { ...next[idx], ...patch };
          updateSelf({ items: next });
        };

        return (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridTemplate,
              gap: gapMap[b.gap],
              alignItems: 'start',
              transition: 'grid-template-columns 0.35s cubic-bezier(0.16, 1, 0.3, 1), gap 0.25s ease',
            }}
          >
            {b.items.slice(0, b.columns).map((col, idx) => (
              <div
                key={col.id}
                className="animate-column-change"
                style={{
                  backgroundColor:
                    b.cardStyle === 'white_card'
                      ? theme.cardBg
                      : b.cardStyle === 'bordered'
                      ? theme.cardBg
                      : 'transparent',
                  border:
                    b.cardStyle === 'bordered'
                      ? `1px solid ${theme.containerBorder}`
                      : 'none',
                  borderRadius: b.cardStyle === 'plain' ? '0px' : '6px',
                  padding: b.cardStyle === 'plain' ? '0px' : '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {col.showImage && (
                  <ImageSlot
                    slot={col.image}
                    rootBlockId={sectionId}
                    childBlockId={b.id}
                    onRemoveSlot={() => updateColItem(idx, { showImage: false })}
                  />
                )}

                {col.showKpi && (
                  <DeletablePart
                    onDelete={() => updateColItem(idx, { showKpi: false })}
                    title="删除此列大数字指标"
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        color: theme.primaryColor,
                      }}
                    >
                      <EditableText
                        value={col.kpiValue}
                        onChange={(kpiValue) => updateColItem(idx, { kpiValue })}
                        style={{ fontSize: '22px', fontWeight: 900, lineHeight: 1 }}
                      />
                      <EditableText
                        value={col.kpiUnit}
                        onChange={(kpiUnit) => updateColItem(idx, { kpiUnit })}
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          marginLeft: '2px',
                        }}
                      />
                    </div>
                  </DeletablePart>
                )}

                {col.showHeading && (
                  <DeletablePart
                    onDelete={() => updateColItem(idx, { showHeading: false })}
                    title="删除此列标题"
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      {col.showBullet &&
                        renderBulletSquare(() =>
                          updateColItem(idx, { showBullet: false })
                        )}
                      <EditableText
                        value={col.heading}
                        onChange={(heading) => updateColItem(idx, { heading })}
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: theme.textColor,
                          lineHeight: 1.35,
                          flex: 1,
                        }}
                      />
                    </div>
                  </DeletablePart>
                )}

                {col.showBody && (
                  <DeletablePart
                    onDelete={() => updateColItem(idx, { showBody: false })}
                    title="删除此列正文段落"
                  >
                    <EditableText
                      value={col.bodyText}
                      onChange={(bodyText) => updateColItem(idx, { bodyText })}
                      style={{
                        fontSize: '11px',
                        lineHeight: 1.55,
                        color: theme.mutedTextColor,
                        textAlign: 'justify',
                      }}
                    />
                  </DeletablePart>
                )}
              </div>
            ))}
          </div>
        );
      }

      case 'intro_quote_box': {
        const b = block as IntroQuoteBoxBlock;
        return (
          <div
            style={{
              backgroundColor: theme.cardBg,
              border:
                b.borderStyle === 'none'
                  ? 'none'
                  : `1.5px ${b.borderStyle} ${theme.primaryColor}`,
              borderRadius: '6px',
              padding: '12px 14px',
            }}
          >
            <EditableText
              value={b.text}
              onChange={(text) => updateSelf({ text })}
              style={{
                fontSize: '12px',
                lineHeight: 1.65,
                color: theme.textColor,
                textAlign: b.textAlign,
                fontWeight: 500,
              }}
            />
          </div>
        );
      }

      case 'dated_event_block': {
        const b = block as DatedEventBlock;
        const showHeading = b.showHeading !== false;
        const showBody = b.showBody !== false;
        const showImages = b.showImages !== false;

        const dateEl = b.showDate && (
          <DeletablePart
            onDelete={() => updateSelf({ showDate: false })}
            title="删除日期标签"
          >
            <EditableText
              value={b.dateText}
              onChange={(dateText) => updateSelf({ dateText })}
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: theme.primaryColor,
                letterSpacing: '0.01em',
                lineHeight: 1.2,
              }}
            />
          </DeletablePart>
        );

        const headingEl = showHeading && (
          <DeletablePart
            onDelete={() => updateSelf({ showHeading: false })}
            title="删除标题行"
          >
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              {b.showBullet &&
                renderBulletSquare(() => updateSelf({ showBullet: false }))}
              <EditableText
                value={b.heading}
                onChange={(heading) => updateSelf({ heading })}
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: theme.textColor,
                  lineHeight: 1.4,
                  flex: 1,
                }}
              />
            </div>
          </DeletablePart>
        );

        const bodyEl = showBody && (
          <DeletablePart
            onDelete={() => updateSelf({ showBody: false })}
            title="删除正文段落"
          >
            <EditableText
              value={b.bodyText}
              onChange={(bodyText) => updateSelf({ bodyText })}
              style={{
                fontSize: '11.5px',
                lineHeight: 1.6,
                color: theme.mutedTextColor,
                textAlign: 'justify',
              }}
            />
          </DeletablePart>
        );

        const count = b.images.length;
        const layoutRows = resolveLayoutRows(
          count,
          b.layoutPreset,
          b.gridColumns,
          b.fitLastToMargin !== false
        );

        const handleAddPhoto = () => {
          const demoUrls = [
            '/demo/hero_industrial_park.jpg',
            '/demo/csr_community_event.jpg',
            '/demo/csr_community_support.jpg',
            '/demo/employee_team_sports.jpg',
          ];
          const nextUrl = demoUrls[b.images.length % demoUrls.length];
          const nextImgs = [
            ...b.images,
            createImageSlot(b.imageAspectRatio || '4:3', `PHOTO ${b.images.length + 1}`, nextUrl),
          ];
          let nextPreset = b.layoutPreset;
          if (nextImgs.length === 4 && (!nextPreset || nextPreset === 'auto')) {
            nextPreset = '2x2';
          } else if (nextImgs.length === 6 && (!nextPreset || nextPreset === 'auto')) {
            nextPreset = '3x2';
          }
          updateSelf({
            images: nextImgs,
            showImages: true,
            layoutPreset: nextPreset,
          });
        };

        const imageGridSection = showImages && (
          <div className="space-y-1.5" style={{ width: '100%' }}>
            {count > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  width: '100%',
                }}
              >
                {layoutRows.map((rowIndices, rowIdx) => (
                  <div
                    key={`row-${rowIdx}`}
                    style={{
                      display: 'flex',
                      gap: '6px',
                      width: '100%',
                      alignItems: 'stretch',
                    }}
                  >
                    {rowIndices.map((idx) => {
                      const imgSlot = b.images[idx];
                      if (!imgSlot) return null;
                      return (
                        <div
                          key={imgSlot.id}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <ImageSlot
                            slot={imgSlot}
                            rootBlockId={sectionId}
                            childBlockId={b.id}
                            onRemoveSlot={() => {
                              const nextImgs = b.images.filter((_, i) => i !== idx);
                              updateSelf({
                                images: nextImgs,
                                showImages: nextImgs.length > 0,
                              });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {!previewMode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddPhoto();
                }}
                className={`w-full flex items-center justify-center gap-1.5 py-1 px-2.5 rounded border border-dashed transition text-xs font-semibold ${
                  count === 0
                    ? 'p-4 border-zinc-300 hover:border-blue-500 bg-zinc-50/60 hover:bg-blue-50/60 text-zinc-600 hover:text-blue-600'
                    : 'border-zinc-200 hover:border-blue-400 bg-white/70 hover:bg-blue-50/50 text-zinc-400 hover:text-blue-600'
                }`}
                title="手动添加图片"
              >
                <Plus size={12} />
                <span>{count === 0 ? '添加配图网格' : '添加图片 (+)'}</span>
              </button>
            )}
          </div>
        );

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {b.textPosition === 'above_images' ? (
              <>
                {dateEl}
                {headingEl}
                {bodyEl}
                {imageGridSection}
              </>
            ) : (
              <>
                {dateEl}
                {headingEl}
                {imageGridSection}
                {bodyEl}
              </>
            )}
          </div>
        );
      }

      case 'split_media_text': {
        const b = block as SplitMediaTextBlock;
        const showHeading = b.showHeading !== false;
        const showBody = b.showBody !== false;

        const textWidth =
          b.textWidthRatio === '45:55'
            ? '45%'
            : b.textWidthRatio === '60:40'
            ? '60%'
            : '50%';
        const mediaWidth =
          b.textWidthRatio === '45:55'
            ? '55%'
            : b.textWidthRatio === '60:40'
            ? '40%'
            : '50%';

        const textCol = (showHeading || showBody) && (
          <div
            style={{
              width: textWidth,
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
            }}
          >
            {showHeading && (
              <DeletablePart
                onDelete={() => updateSelf({ showHeading: false })}
                title="删除标题"
              >
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  {b.showBullet &&
                    renderBulletSquare(() => updateSelf({ showBullet: false }))}
                  <EditableText
                    value={b.heading}
                    onChange={(heading) => updateSelf({ heading })}
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: theme.textColor,
                      lineHeight: 1.35,
                      flex: 1,
                    }}
                  />
                </div>
              </DeletablePart>
            )}
            {showBody && (
              <DeletablePart
                onDelete={() => updateSelf({ showBody: false })}
                title="删除正文"
              >
                <EditableText
                  value={b.bodyText}
                  onChange={(bodyText) => updateSelf({ bodyText })}
                  style={{
                    fontSize: '11px',
                    lineHeight: 1.6,
                    color: theme.mutedTextColor,
                    textAlign: 'justify',
                  }}
                />
              </DeletablePart>
            )}
          </div>
        );

        const activeImages = b.images.slice(0, b.imageCount);
        const mediaCol = (
          <div
            style={{
              width: showHeading || showBody ? mediaWidth : '100%',
              display: 'grid',
              gridTemplateColumns:
                b.imageCount === 2 && b.imageLayout === 'side_by_side'
                  ? 'repeat(2, minmax(0, 1fr))'
                  : '1fr',
              gap: '5px',
              alignContent: 'start',
            }}
          >
            {activeImages.map((slot) => (
              <ImageSlot
                key={slot.id}
                slot={slot}
                rootBlockId={sectionId}
                childBlockId={b.id}
                onRemoveSlot={
                  b.imageCount > 1
                    ? () => updateSelf({ imageCount: 1 })
                    : undefined
                }
              />
            ))}
          </div>
        );

        return (
          <div
            style={{
              display: 'flex',
              flexDirection: b.layout === 'text_left' ? 'row' : 'row-reverse',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            {textCol}
            {mediaCol}
          </div>
        );
      }

      case 'two_column_cards': {
        const b = block as TwoColumnCardsBlock;
        const renderCard = (
          card: TwoColumnCardsBlock['leftCard'],
          side: 'leftCard' | 'rightCard'
        ) => {
          const updateCard = (patch: Partial<typeof card>) => {
            updateSelf({ [side]: { ...card, ...patch } });
          };

          const showHeading = card.showHeading !== false;
          const showImage = card.showImage !== false;

          const titleEl = showHeading && (
            <DeletablePart
              onDelete={() => updateCard({ showHeading: false })}
              title="删除此卡片标题"
            >
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                {card.showBullet &&
                  renderBulletSquare(() => updateCard({ showBullet: false }))}
                <EditableText
                  value={card.heading}
                  onChange={(heading) => updateCard({ heading })}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: theme.textColor,
                    lineHeight: 1.35,
                    flex: 1,
                  }}
                />
              </div>
            </DeletablePart>
          );

          const bodyEl = card.showBody && (
            <DeletablePart
              onDelete={() => updateCard({ showBody: false })}
              title="删除此卡片说明文字"
            >
              <EditableText
                value={card.bodyText}
                onChange={(bodyText) => updateCard({ bodyText })}
                style={{
                  fontSize: '11px',
                  lineHeight: 1.55,
                  color: theme.mutedTextColor,
                  textAlign: 'justify',
                }}
              />
            </DeletablePart>
          );

          const imageEl = showImage && (
            <ImageSlot
              slot={card.image}
              rootBlockId={sectionId}
              childBlockId={b.id}
              onRemoveSlot={() => updateCard({ showImage: false })}
            />
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {b.textPosition === 'top' && (
                <>
                  {titleEl}
                  {bodyEl}
                  {imageEl}
                </>
              )}
              {b.textPosition === 'bottom' && (
                <>
                  {imageEl}
                  {titleEl}
                  {bodyEl}
                </>
              )}
              {b.textPosition === 'title_top_body_bottom' && (
                <>
                  {titleEl}
                  {imageEl}
                  {bodyEl}
                </>
              )}
            </div>
          );
        };

        return (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '10px',
            }}
          >
            {renderCard(b.leftCard, 'leftCard')}
            {renderCard(b.rightCard, 'rightCard')}
          </div>
        );
      }

      case 'kpi_stat_row': {
        const b = block as KpiStatRowBlock;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {b.showLeadMetric && (
              <DeletablePart
                onDelete={() => updateSelf({ showLeadMetric: false })}
                title="删除顶部主指标行"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingBottom: '8px',
                    borderBottom: `1px dashed ${theme.containerBorder}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      color: theme.primaryColor,
                      flexShrink: 0,
                      minWidth: '72px',
                    }}
                  >
                    <EditableText
                      value={b.leadValue}
                      onChange={(leadValue) => updateSelf({ leadValue })}
                      style={{
                        fontSize: '30px',
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    />
                    <EditableText
                      value={b.leadUnit}
                      onChange={(leadUnit) => updateSelf({ leadUnit })}
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        marginLeft: '2px',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    {b.showLeadHeading !== false && (
                      <DeletablePart
                        onDelete={() => updateSelf({ showLeadHeading: false })}
                        title="删除主指标标题"
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                          {b.showLeadBullet !== false &&
                            renderBulletSquare(() =>
                              updateSelf({ showLeadBullet: false })
                            )}
                          <EditableText
                            value={b.leadHeading}
                            onChange={(leadHeading) => updateSelf({ leadHeading })}
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: theme.textColor,
                            }}
                          />
                        </div>
                      </DeletablePart>
                    )}
                    {b.showLeadDescription !== false && (
                      <DeletablePart
                        onDelete={() => updateSelf({ showLeadDescription: false })}
                        title="删除主指标说明文字"
                      >
                        <EditableText
                          value={b.leadDescription}
                          onChange={(leadDescription) =>
                            updateSelf({ leadDescription })
                          }
                          style={{
                            fontSize: '11px',
                            lineHeight: 1.5,
                            color: theme.mutedTextColor,
                          }}
                        />
                      </DeletablePart>
                    )}
                  </div>
                </div>
              </DeletablePart>
            )}

            {b.showSubHeading && (
              <DeletablePart
                onDelete={() => updateSelf({ showSubHeading: false })}
                title="删除分栏小标题"
              >
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  {renderBulletSquare()}
                  <EditableText
                    value={b.subHeading}
                    onChange={(subHeading) => updateSelf({ subHeading })}
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: theme.textColor,
                    }}
                  />
                </div>
              </DeletablePart>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${b.columns}, minmax(0, 1fr))`,
                gap: '8px',
              }}
            >
              {b.items.map((item, idx) => (
                <DeletablePart
                  key={item.id}
                  onDelete={() => {
                    if (b.items.length <= 1) return;
                    updateSelf({
                      items: b.items.filter((_, i) => i !== idx),
                    });
                  }}
                  title="删除此项数据卡"
                >
                  <div
                    style={{
                      backgroundColor: theme.cardBg,
                      border: `1px solid ${theme.containerBorder}`,
                      borderRadius: '6px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      height: '100%',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        color: theme.primaryColor,
                      }}
                    >
                      <EditableText
                        value={item.value}
                        onChange={(val) => {
                          const nextItems = [...b.items];
                          nextItems[idx] = { ...item, value: val };
                          updateSelf({ items: nextItems });
                        }}
                        style={{
                          fontSize: '20px',
                          fontWeight: 800,
                          lineHeight: 1.1,
                        }}
                      />
                      {item.showUnit !== false && (
                        <EditableText
                          value={item.unit}
                          onChange={(unit) => {
                            const nextItems = [...b.items];
                            nextItems[idx] = { ...item, unit };
                            updateSelf({ items: nextItems });
                          }}
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            marginLeft: '3px',
                          }}
                        />
                      )}
                    </div>
                    {item.showDescription !== false && (
                      <DeletablePart
                        onDelete={() => {
                          const nextItems = [...b.items];
                          nextItems[idx] = { ...item, showDescription: false };
                          updateSelf({ items: nextItems });
                        }}
                        title="删除此卡底部说明文字"
                      >
                        <EditableText
                          value={item.description}
                          onChange={(description) => {
                            const nextItems = [...b.items];
                            nextItems[idx] = { ...item, description };
                            updateSelf({ items: nextItems });
                          }}
                          style={{
                            fontSize: '10.5px',
                            lineHeight: 1.45,
                            color: theme.mutedTextColor,
                          }}
                        />
                      </DeletablePart>
                    )}
                  </div>
                </DeletablePart>
              ))}
            </div>
          </div>
        );
      }

      case 'kpi_banner_card': {
        const b = block as KpiBannerCardBlock;
        const showImages = b.showImages !== false;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {b.variant === 'split_metric_photos' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <div
                  style={{
                    width: showImages ? '48%' : '100%',
                    backgroundColor: theme.primaryColor,
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  {b.showMetricLabel !== false && (
                    <DeletablePart
                      onDelete={() => updateSelf({ showMetricLabel: false })}
                      title="删除指标小标题"
                    >
                      <EditableText
                        value={b.metricLabel}
                        onChange={(metricLabel) => updateSelf({ metricLabel })}
                        style={{
                          fontSize: '11px',
                          opacity: 0.9,
                          fontWeight: 600,
                          marginBottom: '4px',
                        }}
                      />
                    </DeletablePart>
                  )}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <EditableText
                      value={b.metricValue}
                      onChange={(metricValue) => updateSelf({ metricValue })}
                      style={{
                        fontSize: '28px',
                        fontWeight: 900,
                        lineHeight: 1.05,
                      }}
                    />
                    {b.showMetricUnit !== false && (
                      <EditableText
                        value={b.metricUnit}
                        onChange={(metricUnit) => updateSelf({ metricUnit })}
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </div>
                </div>
                {showImages && (
                  <div
                    style={{
                      width: '52%',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '6px',
                    }}
                  >
                    {b.images.slice(0, 2).map((slot) => (
                      <ImageSlot
                        key={slot.id}
                        slot={slot}
                        rootBlockId={sectionId}
                        childBlockId={b.id}
                        onRemoveSlot={() => updateSelf({ showImages: false })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {b.variant === 'centered_big_metric' && (
              <div
                style={{
                  backgroundColor: theme.cardBg,
                  border: `1.5px solid ${theme.primaryColor}`,
                  borderRadius: '8px',
                  padding: '14px',
                  textAlign: 'center',
                }}
              >
                {b.showMetricLabel !== false && (
                  <DeletablePart
                    onDelete={() => updateSelf({ showMetricLabel: false })}
                    title="删除上方小标题"
                  >
                    <EditableText
                      value={b.metricLabel}
                      onChange={(metricLabel) => updateSelf({ metricLabel })}
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: theme.textColor,
                      }}
                    />
                  </DeletablePart>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'baseline',
                    gap: '4px',
                    color: theme.primaryColor,
                    margin: '4px 0',
                  }}
                >
                  <EditableText
                    value={b.metricValue}
                    onChange={(metricValue) => updateSelf({ metricValue })}
                    style={{ fontSize: '34px', fontWeight: 900, lineHeight: 1.1 }}
                  />
                  {b.showMetricUnit !== false && (
                    <EditableText
                      value={b.metricUnit}
                      onChange={(metricUnit) => updateSelf({ metricUnit })}
                      style={{ fontSize: '14px', fontWeight: 700 }}
                    />
                  )}
                </div>
              </div>
            )}

            {b.showSubDescription !== false && (
              <DeletablePart
                onDelete={() => updateSelf({ showSubDescription: false })}
                title="删除底部横幅文字条"
              >
                <div
                  style={{
                    backgroundColor: theme.cardBg,
                    border: `1px solid ${theme.containerBorder}`,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    textAlign: 'center',
                  }}
                >
                  <EditableText
                    value={b.subDescription}
                    onChange={(subDescription) => updateSelf({ subDescription })}
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: theme.primaryColor,
                    }}
                  />
                </div>
              </DeletablePart>
            )}
          </div>
        );
      }

      case 'bullet_list_block': {
        const b = block as BulletListBlock;
        const mode = b.listStyleMode || 'inherit_bullet';

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {b.showGroupTitle && (
              <DeletablePart
                onDelete={() => updateSelf({ showGroupTitle: false })}
                title="删除列表组标题"
              >
                <EditableText
                  value={b.groupTitle}
                  onChange={(groupTitle) => updateSelf({ groupTitle })}
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: theme.textColor,
                    marginBottom: '2px',
                  }}
                />
              </DeletablePart>
            )}
            {b.items.map((item, idx) => {
              const renderItemMarker = () => {
                if (b.showBullets === false) return null;
                if (mode === 'numbered_badge') {
                  return (
                    <DeletablePart
                      inline
                      onDelete={() => updateSelf({ showBullets: false })}
                      title="隐藏数字序号徽章"
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '17px',
                          height: '17px',
                          padding: '0 4px',
                          borderRadius: '4px',
                          backgroundColor: theme.primaryColor,
                          color: theme.headerTextColor || '#ffffff',
                          fontSize: '10px',
                          fontWeight: 800,
                          marginRight: '7px',
                          flexShrink: 0,
                          transform: 'translateY(1px)',
                        }}
                      >
                        {idx + 1}
                      </span>
                    </DeletablePart>
                  );
                }
                if (mode === 'custom_icon' && b.customBulletUrl) {
                  return renderBulletSquare(
                    () => updateSelf({ showBullets: false }),
                    b.customBulletUrl
                  );
                }
                return renderBulletSquare(() =>
                  updateSelf({ showBullets: false })
                );
              };

              return (
                <DeletablePart
                  key={item.id}
                  onDelete={() => {
                    if (b.items.length <= 1) return;
                    updateSelf({ items: b.items.filter((_, i) => i !== idx) });
                  }}
                  title="删除此行要点"
                >
                  <div
                    style={
                      mode === 'card_rows'
                        ? {
                            display: 'flex',
                            alignItems: 'baseline',
                            backgroundColor: theme.cardBg,
                            border: `1px solid ${theme.containerBorder}`,
                            borderLeft: `3.5px solid ${theme.primaryColor}`,
                            borderRadius: '5px',
                            padding: '6px 9px',
                          }
                        : { display: 'flex', alignItems: 'baseline' }
                    }
                  >
                    {renderItemMarker()}
                    <EditableText
                      value={item.text}
                      onChange={(text) => {
                        const nextItems = [...b.items];
                        nextItems[idx] = { ...item, text };
                        updateSelf({ items: nextItems });
                      }}
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: theme.textColor,
                        lineHeight: 1.5,
                        flex: 1,
                      }}
                    />
                  </div>
                </DeletablePart>
              );
            })}
          </div>
        );
      }

      case 'feature_callout_grid': {
        const b = block as FeatureCalloutGridBlock;
        return (
          <div
            style={{
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.containerBorder}`,
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {b.showHeading !== false && (
              <DeletablePart
                onDelete={() => updateSelf({ showHeading: false })}
                title="删除展示卡顶部标题"
              >
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  {b.showBullet &&
                    renderBulletSquare(() => updateSelf({ showBullet: false }))}
                  <EditableText
                    value={b.heading}
                    onChange={(heading) => updateSelf({ heading })}
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: theme.textColor,
                    }}
                  />
                </div>
              </DeletablePart>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${b.items.length}, minmax(0, 1fr))`,
                gap: '10px',
              }}
            >
              {b.items.map((item, idx) => (
                <DeletablePart
                  key={item.id}
                  onDelete={() => {
                    if (b.items.length <= 1) return;
                    updateSelf({
                      items: b.items.filter((_, i) => i !== idx),
                    });
                  }}
                  title="删除此列展示项"
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '4px',
                    }}
                  >
                    {item.showImage !== false && (
                      <div style={{ width: '82%' }}>
                        <ImageSlot
                          slot={item.image}
                          rootBlockId={sectionId}
                          childBlockId={b.id}
                          shape={b.imageShape === 'circle' ? 'circle' : 'rounded'}
                          onRemoveSlot={() => {
                            const next = [...b.items];
                            next[idx] = { ...item, showImage: false };
                            updateSelf({ items: next });
                          }}
                        />
                      </div>
                    )}
                    {item.showTitle !== false && (
                      <DeletablePart
                        onDelete={() => {
                          const next = [...b.items];
                          next[idx] = { ...item, showTitle: false };
                          updateSelf({ items: next });
                        }}
                        title="删除品名标题"
                      >
                        <EditableText
                          value={item.title}
                          onChange={(title) => {
                            const next = [...b.items];
                            next[idx] = { ...item, title };
                            updateSelf({ items: next });
                          }}
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: theme.textColor,
                            marginTop: '2px',
                          }}
                        />
                      </DeletablePart>
                    )}
                    {item.showSubtitle !== false && (
                      <DeletablePart
                        onDelete={() => {
                          const next = [...b.items];
                          next[idx] = { ...item, showSubtitle: false };
                          updateSelf({ items: next });
                        }}
                        title="删除副标题"
                      >
                        <EditableText
                          value={item.subtitle}
                          onChange={(subtitle) => {
                            const next = [...b.items];
                            next[idx] = { ...item, subtitle };
                            updateSelf({ items: next });
                          }}
                          style={{
                            fontSize: '10px',
                            color: theme.mutedTextColor,
                            lineHeight: 1.3,
                          }}
                        />
                      </DeletablePart>
                    )}
                  </div>
                </DeletablePart>
              ))}
            </div>
            {b.showFooterNote !== false && b.footerNote && (
              <DeletablePart
                onDelete={() => updateSelf({ showFooterNote: false })}
                title="删除底部备注行"
              >
                <EditableText
                  value={b.footerNote}
                  onChange={(footerNote) => updateSelf({ footerNote })}
                  style={{
                    fontSize: '10.5px',
                    color: theme.mutedTextColor,
                    textAlign: 'center',
                    borderTop: `1px dashed ${theme.containerBorder}`,
                    paddingTop: '6px',
                  }}
                />
              </DeletablePart>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (!previewMode) {
          selectBlock(sectionId, block.id);
        }
      }}
      onDragOver={(e) => {
        if (previewMode || e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverTop(true);
      }}
      onDragLeave={() => setIsDragOverTop(false)}
      onDrop={(e) => {
        if (previewMode || e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverTop(false);
        let parsed: DragPayload | null = activeDrag;
        try {
          const raw = e.dataTransfer.getData('application/x-buletincms');
          if (raw) parsed = JSON.parse(raw);
        } catch {}
        handleDropIntoContainer(sectionId, childIndex, parsed);
      }}
      style={{
        position: 'relative',
        borderRadius: '6px',
        padding: '4px',
        outline: isSelected ? '2px solid #2563eb' : '1px solid transparent',
        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.03)' : 'transparent',
        borderTop: isDragOverTop ? '3px solid #2563eb' : undefined,
        transition: 'outline-color 0.12s ease',
      }}
      className={!previewMode ? 'group/innerblk hover:outline-zinc-400/70' : ''}
    >
      {/* Left Hover Drag Handle for quick drag-and-drop without needing to select first */}
      {!previewMode && (
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            const payload: DragPayload = {
              source: 'canvas_child',
              sectionId,
              childBlockId: block.id,
            };
            setActiveDrag(payload);
            e.dataTransfer.setData('application/x-buletincms', JSON.stringify(payload));
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => setActiveDrag(null)}
          title="按住拖拽此组件到任意容器或位置"
          className="opacity-0 group-hover/innerblk:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          style={{
            position: 'absolute',
            left: '-14px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 35,
            backgroundColor: '#27272a',
            color: '#e4e4e7',
            borderRadius: '3px',
            padding: '3px 1px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        >
          <GripVertical size={11} />
        </div>
      )}

      {isSelected && (
        <FloatingBlockBar
          isInner
          label={block.type.replace(/_/g, ' ').toUpperCase()}
          dragPayload={{
            source: 'canvas_child',
            sectionId,
            childBlockId: block.id,
          }}
          onMoveUp={() => moveContentBlock(sectionId, block.id, 'up')}
          onMoveDown={() => moveContentBlock(sectionId, block.id, 'down')}
          onDuplicate={() => duplicateContentBlock(sectionId, block.id)}
          onSaveTemplate={() => {
            const name = window.prompt('保存组件到【我的模板】名称:', block.type);
            if (name) saveTemplate(name, block);
          }}
          onDelete={() => deleteContentBlock(sectionId, block.id)}
        />
      )}
      {renderInnerContent()}
    </div>
  );
};

// =======================================================
// ROOT CANVAS RENDERER
// =======================================================

interface CanvasRendererProps {
  exportRef: React.RefObject<HTMLDivElement>;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({ exportRef }) => {
  const [dragOverRootIdx, setDragOverRootIdx] = useState<number | null>(null);
  const [dragOverContainerEndId, setDragOverContainerEndId] = useState<string | null>(
    null
  );
  const [contentHeight, setContentHeight] = useState<number>(0);
  const internalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeight(Math.round(entry.contentRect.height));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const lang = useBulletinStore((s) => s.lang);
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  const doc = useBulletinStore((s) => s.getActiveDoc());
  const selectedRootBlockId = useBulletinStore((s) => s.selectedRootBlockId);
  const selectedChildBlockId = useBulletinStore((s) => s.selectedChildBlockId);
  const previewMode = useBulletinStore((s) => s.previewMode);
  const zoomPercent = useBulletinStore((s) => s.zoomPercent);
  const activeDrag = useBulletinStore((s) => s.activeDrag);
  const setActiveDrag = useBulletinStore((s) => s.setActiveDrag);

  const selectBlock = useBulletinStore((s) => s.selectBlock);
  const updateRootBlock = useBulletinStore((s) => s.updateRootBlock);
  const moveRootBlock = useBulletinStore((s) => s.moveRootBlock);
  const duplicateRootBlock = useBulletinStore((s) => s.duplicateRootBlock);
  const deleteRootBlock = useBulletinStore((s) => s.deleteRootBlock);
  const insertContentBlock = useBulletinStore((s) => s.insertContentBlock);
  const handleDropAtRootIndex = useBulletinStore((s) => s.handleDropAtRootIndex);
  const handleDropIntoContainer = useBulletinStore((s) => s.handleDropIntoContainer);
  const saveTemplate = useBulletinStore((s) => s.saveTemplate);

  const renderRootBlock = (block: RootBlock, rootIndex: number) => {
    const isRootSelected =
      !previewMode &&
      selectedRootBlockId === block.id &&
      selectedChildBlockId === null;

    const wrapRoot = (
      label: string,
      content: React.ReactNode,
      canSaveSection = false
    ) => (
      <div
        key={block.id}
        onClick={(e) => {
          e.stopPropagation();
          if (!previewMode) {
            selectBlock(block.id, null);
          }
        }}
        onDragOver={(e) => {
          if (previewMode || e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setDragOverRootIdx(rootIndex);
        }}
        onDragLeave={() => {
          if (dragOverRootIdx === rootIndex) setDragOverRootIdx(null);
        }}
        onDrop={(e) => {
          if (previewMode || e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOverRootIdx(null);
          let parsed: DragPayload | null = activeDrag;
          try {
            const raw = e.dataTransfer.getData('application/x-buletincms');
            if (raw) parsed = JSON.parse(raw);
          } catch {}
          handleDropAtRootIndex(rootIndex, parsed);
        }}
        style={{
          position: 'relative',
          outline: isRootSelected ? '2px solid #18181b' : 'none',
          outlineOffset: '-1px',
          borderTop:
            dragOverRootIdx === rootIndex ? '4px solid #2563eb' : undefined,
        }}
        className={`animate-container-enter transition-all duration-300 ease-out ${
          !previewMode ? 'group/rootblk' : ''
        }`}
      >
        {/* Left Root Drag Handle */}
        {!previewMode && (
          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              const payload: DragPayload = {
                source: 'canvas_root',
                rootBlockId: block.id,
              };
              setActiveDrag(payload);
              e.dataTransfer.setData(
                'application/x-buletincms',
                JSON.stringify(payload)
              );
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => setActiveDrag(null)}
            title="按住拖拽此主模块/容器排序或合并"
            className="opacity-0 group-hover/rootblk:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            style={{
              position: 'absolute',
              left: '-20px',
              top: '16px',
              zIndex: 40,
              backgroundColor: '#18181b',
              color: '#ffffff',
              borderRadius: '4px 0 0 4px',
              padding: '5px 3px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
            }}
          >
            <GripVertical size={13} />
          </div>
        )}

        {isRootSelected && (
          <FloatingBlockBar
            label={label}
            dragPayload={{ source: 'canvas_root', rootBlockId: block.id }}
            onMoveUp={() => moveRootBlock(block.id, 'up')}
            onMoveDown={() => moveRootBlock(block.id, 'down')}
            onDuplicate={() => duplicateRootBlock(block.id)}
            onSaveTemplate={
              canSaveSection && block.type === 'section_container'
                ? () => {
                    const name = window.prompt(
                      '保存整章容器到【我的模板】名称:',
                      block.title || '自定义容器'
                    );
                    if (name) saveTemplate(name, block);
                  }
                : undefined
            }
            onDelete={() => deleteRootBlock(block.id)}
          />
        )}
        {content}
      </div>
    );

    switch (block.type) {
      case 'masthead': {
        const b = block as MastheadBlock;
        const barColor = doc.wireframeMode
          ? '#3f3f46'
          : b.accentColor || '#3f3f46';
        return wrapRoot(
          'MASTHEAD HEADER',
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {b.showTopBar !== false && (
              <DeletablePart
                onDelete={() =>
                  updateRootBlock(b.id, (prev) => ({
                    ...prev,
                    showTopBar: false,
                  } as MastheadBlock))
                }
                title="删除顶部铭牌栏"
              >
                <div
                  style={{
                    backgroundColor: barColor,
                    color: '#ffffff',
                    padding: '6px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10.5px',
                    fontWeight: 600,
                  }}
                >
                  <EditableText
                    value={b.orgNameLeft}
                    onChange={(orgNameLeft) =>
                      updateRootBlock(b.id, (prev) => ({
                        ...prev,
                        orgNameLeft,
                      } as MastheadBlock))
                    }
                  />
                  <EditableText
                    value={b.issueMetaRight}
                    onChange={(issueMetaRight) =>
                      updateRootBlock(b.id, (prev) => ({
                        ...prev,
                        issueMetaRight,
                      } as MastheadBlock))
                    }
                  />
                </div>
              </DeletablePart>
            )}

            <ImageSlot
              slot={b.heroImage}
              rootBlockId={b.id}
              shape="rect"
              overlayChildren={
                b.showHeroOverlay !== false ? (
                  <div
                    style={{
                      marginTop: 'auto',
                      background:
                        'linear-gradient(to top, rgba(24,24,27,0.88) 0%, rgba(24,24,27,0.45) 65%, transparent 100%)',
                      padding: '24px 16px 12px 16px',
                      color: '#ffffff',
                    }}
                  >
                    <DeletablePart
                      onDelete={() =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showHeroOverlay: false,
                        } as MastheadBlock))
                      }
                      title="删除封面悬浮标题层 (纯享封面图)"
                    >
                      <EditableText
                        value={b.heroTitleEn}
                        onChange={(heroTitleEn) =>
                          updateRootBlock(b.id, (prev) => ({
                            ...prev,
                            heroTitleEn,
                          } as MastheadBlock))
                        }
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          opacity: 0.9,
                        }}
                      />
                      <EditableText
                        value={b.heroTitleMain}
                        onChange={(heroTitleMain) =>
                          updateRootBlock(b.id, (prev) => ({
                            ...prev,
                            heroTitleMain,
                          } as MastheadBlock))
                        }
                        style={{
                          fontSize: '21px',
                          fontWeight: 900,
                          letterSpacing: '0.03em',
                          lineHeight: 1.25,
                          marginTop: '2px',
                        }}
                      />
                    </DeletablePart>
                  </div>
                ) : undefined
              }
            />

            {b.showSubBanner !== false && (
              <DeletablePart
                onDelete={() =>
                  updateRootBlock(b.id, (prev) => ({
                    ...prev,
                    showSubBanner: false,
                  } as MastheadBlock))
                }
                title="删除底部副横幅条"
              >
                <div
                  style={{
                    backgroundColor: barColor,
                    color: '#ffffff',
                    padding: '8px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    <EditableText
                      value={b.subBannerLeft}
                      onChange={(subBannerLeft) =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          subBannerLeft,
                        } as MastheadBlock))
                      }
                    />
                    <EditableText
                      value={b.subBannerRight}
                      onChange={(subBannerRight) =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          subBannerRight,
                        } as MastheadBlock))
                      }
                      style={{ fontSize: '11px', fontWeight: 600, opacity: 0.92 }}
                    />
                  </div>
                  {b.showSubBannerDesc !== false && (
                    <DeletablePart
                      onDelete={() =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showSubBannerDesc: false,
                        } as MastheadBlock))
                      }
                      title="删除副标题描述"
                    >
                      <EditableText
                        value={b.subBannerDesc}
                        onChange={(subBannerDesc) =>
                          updateRootBlock(b.id, (prev) => ({
                            ...prev,
                            subBannerDesc,
                          } as MastheadBlock))
                        }
                        style={{
                          fontSize: '10px',
                          opacity: 0.8,
                        }}
                      />
                    </DeletablePart>
                  )}
                </div>
              </DeletablePart>
            )}
          </div>
        );
      }

      case 'highlights_bar': {
        const b = block as HighlightsBarBlock;
        const activeItems = b.items.slice(0, b.columns);
        return wrapRoot(
          'HIGHLIGHTS ROW',
          <div
            style={{
              padding: '12px 14px 6px 14px',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {b.showHeading !== false && (
              <DeletablePart
                onDelete={() =>
                  updateRootBlock(b.id, (prev) => ({
                    ...prev,
                    showHeading: false,
                  } as HighlightsBarBlock))
                }
                title="删除看点标题行"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {b.showBullet && (
                    <DeletablePart
                      inline
                      onDelete={() =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showBullet: false,
                        } as HighlightsBarBlock))
                      }
                      title="删除方块图标"
                    >
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          backgroundColor: '#3f3f46',
                          display: 'inline-block',
                        }}
                      />
                    </DeletablePart>
                  )}
                  <EditableText
                    value={b.heading}
                    onChange={(heading) =>
                      updateRootBlock(b.id, (prev) => ({
                        ...prev,
                        heading,
                      } as HighlightsBarBlock))
                    }
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#27272a',
                    }}
                  />
                </div>
              </DeletablePart>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${activeItems.length}, minmax(0, 1fr))`,
                gap: '6px',
              }}
            >
              {activeItems.map((item, idx) => {
                const cardBg = doc.wireframeMode
                  ? '#52525b'
                  : item.bgColor || '#52525b';
                return (
                  <DeletablePart
                    key={item.id}
                    onDelete={() => {
                      if (activeItems.length <= 1) return;
                      const nextItems = b.items.filter((_, i) => i !== idx);
                      updateRootBlock(b.id, (prev) => ({
                        ...prev,
                        columns: Math.max(1, nextItems.length) as 1 | 2 | 3 | 4,
                        items: nextItems,
                      } as HighlightsBarBlock));
                    }}
                    title="删除此看点卡片"
                  >
                    <div
                      style={{
                        backgroundColor: cardBg,
                        color: '#ffffff',
                        borderRadius: '5px',
                        padding: '8px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        minHeight: '48px',
                      }}
                    >
                      <EditableText
                        value={item.title}
                        onChange={(title) => {
                          const nextItems = [...b.items];
                          nextItems[idx] = { ...item, title };
                          updateRootBlock(b.id, (prev) => ({
                            ...prev,
                            items: nextItems,
                          } as HighlightsBarBlock));
                        }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          lineHeight: 1.25,
                        }}
                      />
                      {item.showSubtitle !== false && (
                        <DeletablePart
                          onDelete={() => {
                            const nextItems = [...b.items];
                            nextItems[idx] = { ...item, showSubtitle: false };
                            updateRootBlock(b.id, (prev) => ({
                              ...prev,
                              items: nextItems,
                            } as HighlightsBarBlock));
                          }}
                          title="删除看点副标题"
                        >
                          <EditableText
                            value={item.subtitle}
                            onChange={(subtitle) => {
                              const nextItems = [...b.items];
                              nextItems[idx] = { ...item, subtitle };
                              updateRootBlock(b.id, (prev) => ({
                                ...prev,
                                items: nextItems,
                              } as HighlightsBarBlock));
                            }}
                            style={{
                              fontSize: '9.5px',
                              opacity: 0.85,
                              marginTop: '2px',
                            }}
                          />
                        </DeletablePart>
                      )}
                    </div>
                  </DeletablePart>
                );
              })}
            </div>
          </div>
        );
      }

      case 'section_container': {
        const sec = block as SectionContainerBlock;
        const effectiveTheme: SectionTheme = doc.wireframeMode
          ? SECTION_THEMES.grey_wireframe
          : sec.theme || SECTION_THEMES.grey_wireframe;

        const padPx =
          typeof sec.customPadding === 'number'
            ? `${sec.customPadding}px`
            : sec.padding === 'none'
            ? '0px'
            : sec.padding === 'sm'
            ? '10px'
            : sec.padding === 'lg'
            ? '18px'
            : '14px';

        const showHeader = sec.showHeader !== false;
        const showBadge = sec.showBadge !== false;
        const hasBgImage = Boolean(sec.bgImage?.url) && !doc.wireframeMode;
        const bgFit = sec.bgImageFit || 'cover';
        const bgOpacity =
          typeof sec.bgImageOpacity === 'number' ? sec.bgImageOpacity : 1;

        // Background Pattern CSS
        const pattern = sec.bgPattern || 'solid';
        let patternBgImage: string | undefined;
        let patternBgSize: string | undefined;
        if (pattern === 'gradient') {
          patternBgImage = `linear-gradient(180deg, ${effectiveTheme.containerBg} 0%, ${
            sec.bgGradientEnd || '#ffffff'
          } 100%)`;
        } else if (pattern === 'dots') {
          patternBgImage = `radial-gradient(${effectiveTheme.containerBorder} 1.25px, transparent 1.25px)`;
          patternBgSize = '12px 12px';
        } else if (pattern === 'grid') {
          patternBgImage = `linear-gradient(to right, ${effectiveTheme.containerBorder}55 1px, transparent 1px), linear-gradient(to bottom, ${effectiveTheme.containerBorder}55 1px, transparent 1px)`;
          patternBgSize = '16px 16px';
        } else if (pattern === 'stripes') {
          patternBgImage = `repeating-linear-gradient(45deg, transparent, transparent 8px, ${effectiveTheme.containerBorder}35 8px, ${effectiveTheme.containerBorder}35 12px)`;
        }

        // Container Border CSS
        const bStyle =
          sec.bordered === false ? 'none' : sec.borderStyle || 'solid';
        const bWidth = sec.borderWidth ?? 1;
        const bColor = effectiveTheme.containerBorder;

        // Header Divider CSS
        const divType = sec.headerDivider || 'solid';
        const headerBorderBottom =
          divType === 'none'
            ? 'none'
            : divType === 'dashed'
            ? `1.5px dashed ${effectiveTheme.primaryColor}`
            : divType === 'double'
            ? `3px double ${effectiveTheme.primaryColor}`
            : divType === 'thick_accent'
            ? `2.5px solid ${effectiveTheme.primaryColor}`
            : `1.5px solid ${effectiveTheme.containerBorder}`;

        // Section Number Badge Renderer
        const renderSectionBadge = () => {
          const bShape = sec.badgeShape || 'rounded_square';
          const bSize = sec.badgeSize || 26;
          const customBadgeUrl = sec.badgeCustomUrl;
          const numColor = sec.badgeTextColor || effectiveTheme.headerTextColor;

          const numberInput = (
            <EditableText
              key={`sec-num-${sec.id}`}
              value={sec.sectionNumber || '1'}
              onChange={(sectionNumber) =>
                updateRootBlock(sec.id, (prev) => ({
                  ...prev,
                  sectionNumber,
                } as SectionContainerBlock))
              }
            />
          );

          // Custom uploaded badge asset behind the editable number text
          if (customBadgeUrl) {
            const assetScale = sec.badgeAssetScale ?? 1;
            const assetX = sec.badgeAssetX || 0;
            const assetY = sec.badgeAssetY || 0;
            return (
              <div
                style={{
                  position: 'relative',
                  minWidth: `${bSize + 6}px`,
                  height: `${bSize + 6}px`,
                  padding: '0 6px',
                  color: numColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: `${Math.round(bSize * 0.54)}px`,
                }}
              >
                <img
                  src={customBadgeUrl}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    zIndex: 1,
                    transform: `translate(${assetX}px, ${assetY}px) scale(${assetScale})`,
                    transformOrigin: 'center center',
                  }}
                />
                <span style={{ position: 'relative', zIndex: 2 }}>
                  {numberInput}
                </span>
              </div>
            );
          }

          // Flower / Starburst Seal (like Sample 3!)
          if (bShape === 'flower') {
            return (
              <div
                style={{
                  position: 'relative',
                  width: `${bSize + 6}px`,
                  height: `${bSize + 6}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: numColor,
                  fontWeight: 900,
                  fontSize: `${Math.round(bSize * 0.52)}px`,
                }}
              >
                <svg
                  viewBox="0 0 40 40"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <path
                    d="M20,1 L24.5,5.2 L30.5,3.7 L32.3,9.6 L38.1,11.6 L36.4,17.5 L39.8,22.5 L35.2,26.6 L35.5,32.8 L29.5,34.1 L26.6,39.5 L20,37.2 L13.4,39.5 L10.5,34.1 L4.5,32.8 L4.8,26.6 L0.2,22.5 L3.6,17.5 L1.9,11.6 L7.7,9.6 L9.5,3.7 L15.5,5.2 Z"
                    fill={effectiveTheme.primaryColor}
                  />
                </svg>
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {numberInput}
                </span>
              </div>
            );
          }

          // Hexagon Badge
          if (bShape === 'hexagon') {
            return (
              <div
                style={{
                  position: 'relative',
                  width: `${bSize + 4}px`,
                  height: `${bSize + 4}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: numColor,
                  fontWeight: 900,
                  fontSize: `${Math.round(bSize * 0.52)}px`,
                }}
              >
                <svg
                  viewBox="0 0 36 36"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <polygon
                    points="18,1 33,9.5 33,26.5 18,35 3,26.5 3,9.5"
                    fill={effectiveTheme.primaryColor}
                  />
                </svg>
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {numberInput}
                </span>
              </div>
            );
          }

          // Diamond Badge
          if (bShape === 'diamond') {
            return (
              <div
                style={{
                  width: `${bSize}px`,
                  height: `${bSize}px`,
                  backgroundColor: effectiveTheme.primaryColor,
                  color: numColor,
                  borderRadius: '4px',
                  transform: 'rotate(45deg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: `${Math.round(bSize * 0.52)}px`,
                  margin: '2px 4px',
                }}
              >
                <span style={{ transform: 'rotate(-45deg)' }}>{numberInput}</span>
              </div>
            );
          }

          // Outline Badge
          if (bShape === 'outline') {
            return (
              <div
                style={{
                  backgroundColor: effectiveTheme.cardBg,
                  color: sec.badgeTextColor || effectiveTheme.primaryColor,
                  border: `2px solid ${effectiveTheme.primaryColor}`,
                  minWidth: `${bSize}px`,
                  height: `${bSize}px`,
                  padding: '0 6px',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: `${Math.round(bSize * 0.54)}px`,
                }}
              >
                {numberInput}
              </div>
            );
          }

          // Rounded Square, Circle, or Pill
          return (
            <div
              style={{
                backgroundColor: effectiveTheme.primaryColor,
                color: numColor,
                minWidth: bShape === 'pill' ? `${bSize + 10}px` : `${bSize}px`,
                height: `${bSize}px`,
                padding: bShape === 'pill' ? '0 10px' : '0 6px',
                borderRadius:
                  bShape === 'circle' || bShape === 'pill' ? '9999px' : '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: `${Math.round(bSize * 0.54)}px`,
              }}
            >
              {numberInput}
            </div>
          );
        };

        return wrapRoot(
          showHeader ? `CONTAINER [${sec.sectionNumber || '章'}]` : 'BLANK CONTAINER',
          <div
            onDragOver={(e) => {
              if (previewMode || e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              e.stopPropagation();
              setDragOverContainerEndId(sec.id);
            }}
            onDragLeave={() => {
              if (dragOverContainerEndId === sec.id) {
                setDragOverContainerEndId(null);
              }
            }}
            onDrop={(e) => {
              if (previewMode || e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              e.stopPropagation();
              setDragOverContainerEndId(null);
              let parsed: DragPayload | null = activeDrag;
              try {
                const raw = e.dataTransfer.getData('application/x-buletincms');
                if (raw) parsed = JSON.parse(raw);
              } catch {}
              handleDropIntoContainer(sec.id, sec.children.length, parsed);
            }}
            style={{
              padding: sec.padding === 'none' ? '4px 0px' : '8px 12px',
            }}
          >
            <div
              style={{
                position: 'relative',
                backgroundColor: effectiveTheme.containerBg,
                border:
                  dragOverContainerEndId === sec.id
                    ? '2px dashed #2563eb'
                    : bStyle === 'none'
                    ? 'none'
                    : bStyle === 'top_thick'
                    ? `1px solid ${bColor}`
                    : `${bWidth}px ${
                        bStyle === 'double'
                          ? 'double'
                          : bStyle === 'dashed'
                          ? 'dashed'
                          : 'solid'
                      } ${
                        bStyle === 'double' || bStyle === 'dashed'
                          ? effectiveTheme.primaryColor
                          : bColor
                      }`,
                borderTop:
                  dragOverContainerEndId !== sec.id && bStyle === 'top_thick'
                    ? `4px solid ${effectiveTheme.primaryColor}`
                    : undefined,
                borderRadius: `${sec.borderRadius}px`,
                padding: padPx,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                overflow: 'visible',
              }}
            >
              {/* Clipped Decorative Background & Corner Sticker Layer */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'inherit',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  zIndex: 0,
                  backgroundImage: patternBgImage,
                  backgroundSize: patternBgSize,
                }}
              >
                {hasBgImage && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${sec.bgImage!.url})`,
                      backgroundSize:
                        bgFit === 'top_banner'
                          ? '100% auto'
                          : bgFit === 'repeat'
                          ? '120px auto'
                          : bgFit,
                      backgroundRepeat:
                        bgFit === 'repeat' ? 'repeat' : 'no-repeat',
                      backgroundPosition:
                        bgFit === 'top_banner'
                          ? 'top center'
                          : sec.bgImage
                          ? `${sec.bgImage.focalPoint.x}% ${sec.bgImage.focalPoint.y}%`
                          : 'center',
                      opacity: bgOpacity,
                    }}
                  />
                )}
                {sec.cornerStickerUrl && !doc.wireframeMode && (
                  <img
                    src={sec.cornerStickerUrl}
                    alt=""
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '8px',
                      maxHeight: '46px',
                      maxWidth: '96px',
                      objectFit: 'contain',
                    }}
                  />
                )}
              </div>

              {/* Section Header Bar (Can be deleted with 1 click to turn into a Blank Container!) */}
              {showHeader && (
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <DeletablePart
                    onDelete={() =>
                      updateRootBlock(sec.id, (prev) => ({
                        ...prev,
                        showHeader: false,
                      } as SectionContainerBlock))
                    }
                    title="删除章节标题栏 (变为无标题空白容器)"
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderBottom: headerBorderBottom,
                        paddingBottom: divType === 'none' ? '2px' : '8px',
                      }}
                    >
                      {showBadge && (
                        <DeletablePart
                          inline
                          onDelete={() =>
                            updateRootBlock(sec.id, (prev) => ({
                              ...prev,
                              showBadge: false,
                            } as SectionContainerBlock))
                          }
                          title="删除章节数字编号框"
                        >
                          {renderSectionBadge()}
                        </DeletablePart>
                      )}
                      <EditableText
                        key={`sec-title-${sec.id}`}
                        value={sec.title}
                        onChange={(title) =>
                          updateRootBlock(sec.id, (prev) => ({
                            ...prev,
                            title,
                          } as SectionContainerBlock))
                        }
                        style={{
                          fontSize: '17px',
                          fontWeight: 900,
                          color: effectiveTheme.primaryColor,
                          letterSpacing: '0.02em',
                          flex: 1,
                        }}
                      />
                    </div>
                  </DeletablePart>
                </div>
              )}

              {/* Inner Child Blocks */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {sec.children.map((child, cIdx) => (
                  <InnerContentBlockView
                    key={child.id}
                    block={child}
                    section={sec}
                    sectionId={sec.id}
                    childIndex={cIdx}
                    theme={effectiveTheme}
                  />
                ))}
              </div>

              {/* Drop zone / Quick + Add Block bar at bottom of container */}
              {!previewMode && (
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    gap: '6px',
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      insertContentBlock('custom_columns_block', sec.id, undefined, '2col');
                    }}
                    style={{
                      flex: 1,
                      border: '1px dashed #a1a1aa',
                      borderRadius: '5px',
                      padding: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      color: '#52525b',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255,255,255,0.6)',
                    }}
                    className="hover:bg-white hover:text-zinc-900 transition-colors"
                  >
                    <Plus size={12} />
                    <span>+ 加分栏/多列</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      insertContentBlock('freeform_asset_block', sec.id);
                    }}
                    style={{
                      flex: 1,
                      border: '1px dashed #a1a1aa',
                      borderRadius: '5px',
                      padding: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      color: '#52525b',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255,255,255,0.6)',
                    }}
                    className="hover:bg-white hover:text-zinc-900 transition-colors"
                  >
                    <Plus size={12} />
                    <span>+ 加自定义图/素材</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      insertContentBlock('simple_text_block', sec.id);
                    }}
                    style={{
                      flex: 1,
                      border: '1px dashed #a1a1aa',
                      borderRadius: '5px',
                      padding: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      color: '#52525b',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255,255,255,0.6)',
                    }}
                    className="hover:bg-white hover:text-zinc-900 transition-colors"
                  >
                    <Plus size={12} />
                    <span>+ 加文本/标题</span>
                  </button>
                </div>
              )}
            </div>
          </div>,
          true
        );
      }

      case 'footer_banner': {
        const b = block as FooterBannerBlock;
        return wrapRoot(
          'FOOTER BANNER',
          <div style={{ marginTop: '6px' }}>
            <ImageSlot
              slot={b.bannerImage}
              rootBlockId={b.id}
              shape="rect"
              overlayChildren={
                b.showOverlayText !== false ? (
                  <div
                    style={{
                      marginTop: 'auto',
                      background:
                        'linear-gradient(to top, rgba(24,24,27,0.9) 0%, rgba(24,24,27,0.4) 70%, transparent 100%)',
                      padding: '20px 16px 14px 16px',
                      color: '#ffffff',
                      textAlign: 'center',
                    }}
                  >
                    <DeletablePart
                      onDelete={() =>
                        updateRootBlock(b.id, (prev) => ({
                          ...prev,
                          showOverlayText: false,
                        } as FooterBannerBlock))
                      }
                      title="删除底部标语文字层 (保留纯尾图)"
                    >
                      {b.showBrandLabel !== false && (
                        <EditableText
                          value={b.brandLabel}
                          onChange={(brandLabel) =>
                            updateRootBlock(b.id, (prev) => ({
                              ...prev,
                              brandLabel,
                            } as FooterBannerBlock))
                          }
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            opacity: 0.85,
                          }}
                        />
                      )}
                      {b.showSloganMain !== false && (
                        <EditableText
                          value={b.sloganMain}
                          onChange={(sloganMain) =>
                            updateRootBlock(b.id, (prev) => ({
                              ...prev,
                              sloganMain,
                            } as FooterBannerBlock))
                          }
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            marginTop: '2px',
                          }}
                        />
                      )}
                      {b.showSloganSub !== false && (
                        <EditableText
                          value={b.sloganSub}
                          onChange={(sloganSub) =>
                            updateRootBlock(b.id, (prev) => ({
                              ...prev,
                              sloganSub,
                            } as FooterBannerBlock))
                          }
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            opacity: 0.9,
                            marginTop: '2px',
                          }}
                        />
                      )}
                    </DeletablePart>
                  </div>
                ) : undefined
              }
            />
          </div>
        );
      }
    }
  };

  const scale = zoomPercent / 100;
  const scaledWidth = Math.round(doc.canvasWidth * scale);
  const scaledHeight = contentHeight > 0 ? Math.round(contentHeight * scale) : undefined;

  return (
    <div
      style={{
        width: `${scaledWidth}px`,
        height: scaledHeight ? `${scaledHeight}px` : undefined,
        margin: '0 auto',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'width 0.12s ease, height 0.12s ease',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          transition: 'transform 0.12s ease',
          width: `${doc.canvasWidth}px`,
          position: 'absolute',
          top: 0,
          left: '50%',
          marginLeft: `-${doc.canvasWidth / 2}px`,
        }}
      >
        <div
          ref={(node) => {
            internalRef.current = node;
            if (exportRef) {
              (exportRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }
          }}
          style={{
            width: `${doc.canvasWidth}px`,
          minHeight: doc.rootBlocks.length === 0 ? '560px' : undefined,
          backgroundColor: '#ffffff',
          color: '#18181b',
          fontFamily: doc.fontFamily || 'inherit',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom:
            doc.rootBlocks.length > 0 &&
            doc.rootBlocks[doc.rootBlocks.length - 1]?.type !== 'footer_banner'
              ? '16px'
              : '0px',
          backgroundImage: doc.showGridGuides
            ? 'linear-gradient(to right, rgba(24,24,27,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(24,24,27,0.05) 1px, transparent 1px)'
            : undefined,
          backgroundSize: doc.showGridGuides ? '16px 16px' : undefined,
        }}
      >
        {doc.rootBlocks.length === 0 ? (
          <div
            onDragOver={(e) => {
              if (previewMode || e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              setDragOverRootIdx(0);
            }}
            onDragLeave={() => {
              if (dragOverRootIdx === 0) setDragOverRootIdx(null);
            }}
            onDrop={(e) => {
              if (previewMode || e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              e.stopPropagation();
              setDragOverRootIdx(null);
              let parsed: DragPayload | null = activeDrag;
              try {
                const raw = e.dataTransfer.getData('application/x-buletincms');
                if (raw) parsed = JSON.parse(raw);
              } catch {}
              handleDropAtRootIndex(0, parsed);
            }}
            style={{
              flex: 1,
              margin: '20px',
              borderRadius: '12px',
              border:
                dragOverRootIdx === 0
                  ? '2px dashed #2563eb'
                  : '2px dashed #d4d4d8',
              backgroundColor:
                dragOverRootIdx === 0 ? 'rgba(37, 99, 235, 0.04)' : '#fafafa',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 28px',
              textAlign: 'center',
              gap: '14px',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#f4f4f5',
                border: '1px solid #e4e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#52525b',
              }}
            >
              <Plus size={22} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#18181b',
                }}
              >
                {t(
                  '空白简报画布 — 请添加第一个容器',
                  'Empty Bulletin Canvas — Add a Container to Start'
                )}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#71717a',
                  lineHeight: 1.6,
                  maxWidth: '340px',
                }}
              >
                {t(
                  '点击下方快捷按钮添加容器，或直接从左侧「组件库」拖拽任意容器与图文模块到此处开始排版。',
                  'Click a button below to add your first container, or drag any container or content block from the Left Library onto this canvas.'
                )}
              </div>
            </div>

            {!previewMode && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDropAtRootIndex(0, {
                      source: 'library_root',
                      rootFactory: 'numbered_section',
                    });
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '7px',
                    backgroundColor: '#18181b',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    border: '1px solid #18181b',
                  }}
                >
                  <Plus size={13} />
                  <span>
                    {t('添加章节容器', 'Add Section Container')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDropAtRootIndex(0, {
                      source: 'library_root',
                      rootFactory: 'blank_container',
                    });
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '7px',
                    backgroundColor: '#ffffff',
                    color: '#27272a',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    border: '1px solid #d4d4d8',
                  }}
                >
                  <Plus size={13} />
                  <span>
                    {t('添加空白自由容器', 'Add Blank Container')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDropAtRootIndex(0, {
                      source: 'library_root',
                      rootFactory: 'masthead',
                    });
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '7px',
                    backgroundColor: '#ffffff',
                    color: '#27272a',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    border: '1px solid #d4d4d8',
                  }}
                >
                  <Plus size={13} />
                  <span>
                    {t('添加顶部刊头', 'Add Masthead')}
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          doc.rootBlocks.map((b, idx) => renderRootBlock(b, idx))
        )}
      </div>
    </div>
  </div>
  );
};
