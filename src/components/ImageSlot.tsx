import React, { useRef, useState } from 'react';
import {
  GripVertical,
  Image as ImageIcon,
  Move,
  RotateCcw,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { AspectRatioType, ImageSlotData } from '../types/bulletin';
import { useBulletinStore } from '../store/useBulletinStore';

interface ImageSlotProps {
  slot: ImageSlotData;
  rootBlockId: string;
  childBlockId?: string;
  overrideAspectRatio?: AspectRatioType;
  shape?: 'rect' | 'rounded' | 'circle';
  minHeight?: number;
  className?: string;
  overlayChildren?: React.ReactNode;
  onRemoveSlot?: () => void;
}

const ASPECT_PADDING_MAP: Record<Exclude<AspectRatioType, 'free'>, string> = {
  '16:9': '56.25%',
  '4:3': '75%',
  '3:2': '66.66%',
  '1:1': '100%',
  '3:4': '133.33%',
};

const ASPECT_NUMERIC_MAP: Record<Exclude<AspectRatioType, 'free'>, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '1:1': 1,
  '3:4': 3 / 4,
};

export async function compressImageFile(file: File, maxDim = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(ev.target?.result as string);
          return;
        }
        const isPng = file.type === 'image/png';
        if (!isPng) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(
          isPng
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.88)
        );
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const ImageSlot: React.FC<ImageSlotProps> = ({
  slot,
  rootBlockId,
  childBlockId,
  overrideAspectRatio,
  shape = 'rounded',
  minHeight,
  className = '',
  overlayChildren,
  onRemoveSlot,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingDims, setResizingDims] = useState<{ width: number; height: number } | null>(null);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const panStartRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);

  const lang = useBulletinStore((s) => s.lang);
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);

  const selectedImageSlotId = useBulletinStore((s) => s.selectedImageSlotId);
  const previewMode = useBulletinStore((s) => s.previewMode);
  const wireframeMode = useBulletinStore((s) => s.getActiveDoc().wireframeMode);
  const selectImageSlot = useBulletinStore((s) => s.selectImageSlot);
  const updateImageSlotById = useBulletinStore((s) => s.updateImageSlotById);
  const reorderBlockImages = useBulletinStore((s) => s.reorderBlockImages);

  const [isReorderDragOver, setIsReorderDragOver] = useState(false);
  const [isDraggingSelf, setIsDraggingSelf] = useState(false);
  const lastClickTimeRef = useRef<number>(0);

  const isSelected = !previewMode && selectedImageSlotId === slot.id;
  const effectiveRatio: AspectRatioType =
    slot.aspectRatio || overrideAspectRatio || '4:3';
  const isFreeRatio = effectiveRatio === 'free';
  const paddingBottom = isFreeRatio
    ? undefined
    : ASPECT_PADDING_MAP[effectiveRatio] || '75%';
  const slotNumericRatio = isFreeRatio
    ? 1
    : ASPECT_NUMERIC_MAP[effectiveRatio] || 4 / 3;

  // Frame width calculation
  const widthMode = slot.frameWidthMode || 'full';
  let frameWidthStyle = '100%';
  if (widthMode === '75%') {
    frameWidthStyle = '75%';
  } else if (widthMode === '50%') {
    frameWidthStyle = '50%';
  } else if (widthMode === 'custom_pct' && slot.frameCustomWidthPct) {
    frameWidthStyle = `${slot.frameCustomWidthPct}%`;
  } else if (widthMode === 'custom_px' && slot.frameCustomWidthPx) {
    frameWidthStyle = `${slot.frameCustomWidthPx}px`;
  }

  // Frame height calculation
  const isCustomHeight = slot.frameHeightMode === 'custom_px' && !!slot.frameCustomHeightPx;
  const customHeightPx = slot.frameCustomHeightPx;

  // Frame alignment margin
  const frameAlign = slot.frameAlign || 'center';
  const alignMargin =
    frameWidthStyle === '100%'
      ? undefined
      : frameAlign === 'center'
      ? '0 auto'
      : frameAlign === 'right'
      ? '0 0 0 auto'
      : '0 auto 0 0';

  // Interactive frame resize drag handler
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!frameRef.current) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = frameRef.current.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;

    setIsResizing(true);
    setResizingDims({ width: Math.round(startWidth), height: Math.round(startHeight) });

    const onMouseMove = (moveEv: MouseEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      const newWidth = Math.max(80, Math.min(800, Math.round(startWidth + dx)));
      const newHeight = Math.max(60, Math.min(800, Math.round(startHeight + dy)));

      setResizingDims({ width: newWidth, height: newHeight });

      updateImageSlotById(slot.id, {
        frameWidthMode: 'custom_px',
        frameCustomWidthPx: newWidth,
        frameHeightMode: 'custom_px',
        frameCustomHeightPx: newHeight,
      });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      setResizingDims(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Compute custom frame radius, border, mat padding, and shadow
  const computedRadius =
    slot.frameRadius !== undefined
      ? `${slot.frameRadius}px`
      : shape === 'circle'
      ? '9999px'
      : shape === 'rounded'
      ? '4px'
      : '0px';

  const hasCustomBorder = (slot.frameBorderWidth ?? 0) > 0;
  const customBorderCss = hasCustomBorder
    ? `${slot.frameBorderWidth}px ${slot.frameBorderStyle || 'solid'} ${
        slot.frameBorderColor || '#3f3f46'
      }`
    : undefined;

  const matPadding = slot.frameMatPadding || 0;
  const matColor = slot.frameMatColor || '#ffffff';

  const shadowMap: Record<NonNullable<ImageSlotData['frameShadow']>, string | undefined> = {
    none: undefined,
    sm: '0 2px 6px rgba(0,0,0,0.12)',
    md: '0 6px 16px rgba(0,0,0,0.18)',
    hard: `3px 3px 0px ${slot.frameBorderColor || '#3f3f46'}`,
  };
  const boxShadowCss = slot.frameShadow ? shadowMap[slot.frameShadow] : undefined;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImageFile(file);
    updateImageSlotById(slot.id, { url: dataUrl });
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    setIsReorderDragOver(false);

    // 1. Reorder dropped photo from within the bulletin
    const sourceSlotId =
      e.dataTransfer.getData('application/buletin-slot-id') ||
      e.dataTransfer.getData('text/plain');
    if (sourceSlotId && sourceSlotId.startsWith('img_') && sourceSlotId !== slot.id) {
      reorderBlockImages(sourceSlotId, slot.id);
      selectImageSlot(slot.id, rootBlockId, childBlockId);
      return;
    }

    // 2. Local image file dropped from system
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      return;
    }
    if (previewMode) return;
    const dataUrl = await compressImageFile(file);
    updateImageSlotById(slot.id, { url: dataUrl });
    selectImageSlot(slot.id, rootBlockId, childBlockId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (previewMode) return;
    if (e.dataTransfer.types.includes('application/buletin-slot-id')) {
      e.preventDefault();
      e.stopPropagation();
      setIsReorderDragOver(true);
    } else if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
    }
  };

  const handleSlotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewMode) return;
    const now = Date.now();
    if (now - lastClickTimeRef.current < 350) {
      // Rapid double click opens upload window directly!
      fileInputRef.current?.click();
      lastClickTimeRef.current = 0;
      return;
    }
    lastClickTimeRef.current = now;
    selectImageSlot(slot.id, rootBlockId, childBlockId);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewMode) return;
    fileInputRef.current?.click();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (previewMode) return;

    // Pan image focal point when mouse 1 is clicked on a loaded image that is zoomed
    if (slot.url && !wireframeMode && e.button === 0 && slot.zoom > 1) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        fx: slot.focalPoint.x,
        fy: slot.focalPoint.y,
      };

      const onMouseMove = (moveEv: MouseEvent) => {
        if (!panStartRef.current) return;
        const dx = moveEv.clientX - panStartRef.current.x;
        const dy = moveEv.clientY - panStartRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          lastClickTimeRef.current = 0;
        }
        const nextX = Math.max(0, Math.min(100, Math.round(panStartRef.current.fx - dx * 0.35)));
        const nextY = Math.max(0, Math.min(100, Math.round(panStartRef.current.fy - dy * 0.35)));
        updateImageSlotById(slot.id, {
          focalPoint: { x: nextX, y: nextY },
        });
      };

      const onMouseUp = () => {
        setIsPanning(false);
        panStartRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
  };

  const showActualImage = Boolean(slot.url) && !wireframeMode;

  // Offset translation so dragging/moving works smoothly at any zoom level & ratio
  const offsetXPercent = (50 - slot.focalPoint.x) * 1.1;
  const offsetYPercent = (50 - slot.focalPoint.y) * 1.1;
  const freeImageTransform =
    slot.zoom !== 1 || slot.focalPoint.x !== 50 || slot.focalPoint.y !== 50
      ? `translate(${offsetXPercent}%, ${offsetYPercent}%) scale(${slot.zoom})`
      : undefined;

  // For ratio slots: never crop the <img> element itself with object-fit: cover!
  // Instead, size the uncropped <img> naturally and let ONLY the outer frame mask it.
  const isWiderThanSlot =
    naturalRatio !== null && naturalRatio > slotNumericRatio;
  const maskedImageTransform = `translate(calc(-50% + ${offsetXPercent}%), calc(-50% + ${offsetYPercent}%)) scale(${slot.zoom})`;

  const hasCustomFrameAsset = Boolean(slot.frameOverlayUrl) && !wireframeMode;
  const frameLayer = slot.frameAssetLayer || 'behind';
  const frameScale = slot.frameAssetScale ?? 1;
  const frameX = slot.frameAssetX || 0;
  const frameY = slot.frameAssetY || 0;
  const frameAssetTransform =
    frameScale !== 1 || frameX !== 0 || frameY !== 0
      ? `translate(${frameX}%, ${frameY}%) scale(${frameScale})`
      : undefined;

  const isMaskLayer = hasCustomFrameAsset && frameLayer === 'mask';
  const customMaskStyle: React.CSSProperties = isMaskLayer
    ? {
        WebkitMaskImage: `url(${slot.frameOverlayUrl})`,
        maskImage: `url(${slot.frameOverlayUrl})`,
        WebkitMaskSize: `${Math.round(frameScale * 100)}%`,
        maskSize: `${Math.round(frameScale * 100)}%`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: `${50 + frameX}% ${50 + frameY}%`,
        maskPosition: `${50 + frameX}% ${50 + frameY}%`,
      }
    : {};

  return (
    <div
      ref={frameRef}
      draggable={!previewMode && !isPanning && !isResizing}
      onDragStart={(e) => {
        if (previewMode || isPanning || isResizing) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('application/buletin-slot-id', slot.id);
        e.dataTransfer.setData('text/plain', slot.id);
        e.dataTransfer.effectAllowed = 'move';
        setIsDraggingSelf(true);
      }}
      onDragEnd={() => setIsDraggingSelf(false)}
      onDragOver={handleDragOver}
      onDragLeave={() => {
        setIsDraggingOver(false);
        setIsReorderDragOver(false);
      }}
      onDrop={handleDrop}
      onClick={handleSlotClick}
      onDoubleClick={handleDoubleClick}
      style={{
        padding: matPadding > 0 ? `${matPadding}px` : undefined,
        backgroundColor:
          matPadding > 0
            ? hasCustomFrameAsset && (frameLayer === 'behind' || frameLayer === 'mask')
              ? 'transparent'
              : matColor
            : undefined,
        borderRadius: computedRadius,
        border: isSelected
          ? '2px solid #2563eb'
          : isReorderDragOver
          ? '2px dashed #2563eb'
          : isDraggingOver
          ? '2px dashed #2563eb'
          : customBorderCss || (!showActualImage ? '1px solid #a1a1aa' : 'none'),
        boxShadow: boxShadowCss,
        position: 'relative',
        width: frameWidthStyle,
        maxWidth: '100%',
        margin: alignMargin,
        overflow: 'visible',
        opacity: isDraggingSelf ? 0.45 : 1,
      }}
      className={`group/imgslot ${className}`}
    >
      {/* Visual Drop to Reorder Overlay */}
      {isReorderDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 35,
            backgroundColor: 'rgba(37, 99, 235, 0.28)',
            border: '2px dashed #3b82f6',
            borderRadius: computedRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              backgroundColor: '#1d4ed8',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '9999px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}
          >
            {t('释放以互换/重排顺序', 'Drop to Reorder')}
          </span>
        </div>
      )}

      {/* Top-Left Drag Reorder Handle */}
      {!previewMode && (
        <div
          draggable
          title={t('按住拖拽互换/重排图片顺序', 'Drag to reorder photos')}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData('application/buletin-slot-id', slot.id);
            e.dataTransfer.setData('text/plain', slot.id);
            e.dataTransfer.effectAllowed = 'move';
            setIsDraggingSelf(true);
          }}
          onDragEnd={() => setIsDraggingSelf(false)}
          className={`absolute top-1 left-1 z-20 p-0.5 rounded bg-black/60 hover:bg-blue-600 text-white/90 hover:text-white cursor-grab active:cursor-grabbing transition-opacity shadow-xs ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover/imgslot:opacity-100'
          }`}
        >
          <GripVertical size={11} />
        </div>
      )}

      {/* Custom Frame Asset BEHIND the Picture Frame (Default) */}
      {hasCustomFrameAsset && frameLayer === 'behind' && (
        <img
          src={slot.frameOverlayUrl!}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            zIndex: 0,
            transform: frameAssetTransform,
            transformOrigin: 'center center',
          }}
        />
      )}

      <div
        onClick={handleSlotClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onDragOver={handleDragOver}
        onDragLeave={() => {
          setIsDraggingOver(false);
          setIsReorderDragOver(false);
        }}
        onDrop={handleDrop}
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: isCustomHeight ? `${customHeightPx}px` : undefined,
          paddingBottom: isCustomHeight
            ? undefined
            : isFreeRatio && showActualImage
            ? undefined
            : paddingBottom,
          minHeight:
            minHeight
              ? `${minHeight}px`
              : isFreeRatio && !showActualImage
              ? '92px'
              : undefined,
          borderRadius:
            matPadding > 0
              ? `${Math.max(0, (slot.frameRadius ?? 4) - 2)}px`
              : computedRadius,
          overflow: 'hidden',
          backgroundColor: showActualImage
            ? 'transparent'
            : hasCustomFrameAsset
            ? 'rgba(212, 212, 216, 0.45)'
            : '#d4d4d8',
          cursor: previewMode
            ? 'default'
            : showActualImage
            ? isPanning
              ? 'grabbing'
              : 'grab'
            : 'pointer',
          userSelect: 'none',
          backgroundImage: !showActualImage && !previewMode
            ? 'linear-gradient(135deg, rgba(161,161,170,0.22) 25%, transparent 25%, transparent 50%, rgba(161,161,170,0.22) 50%, rgba(161,161,170,0.22) 75%, transparent 75%, transparent)'
            : undefined,
          backgroundSize: !showActualImage && !previewMode ? '16px 16px' : undefined,
          ...customMaskStyle,
        }}
        title={
          previewMode
            ? undefined
            : showActualImage
            ? t(
                '双击更换图片 · 拖拽左上角把手重排顺序 · 按住放大可平移画面',
                'Double-click to replace · Drag top-left handle to reorder · Pan when zoomed'
              )
            : t(
                '点击设置画框 · 双击或拖入图片上传',
                'Click to customize frame · Double-click or drop image to upload'
              )
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {showActualImage ? (
          isFreeRatio ? (
            <img
              src={slot.url!}
              alt={slot.label || 'Custom asset'}
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalWidth && naturalHeight) {
                  setNaturalRatio(naturalWidth / naturalHeight);
                }
              }}
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                transform: freeImageTransform,
                transformOrigin: 'center center',
              }}
            />
          ) : (
            <img
              src={slot.url!}
              alt={slot.label || 'Bulletin media'}
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalWidth && naturalHeight) {
                  setNaturalRatio(naturalWidth / naturalHeight);
                }
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: isWiderThanSlot ? 'auto' : '100%',
                height: isWiderThanSlot ? '100%' : 'auto',
                maxWidth: 'none',
                maxHeight: 'none',
                transform: maskedImageTransform,
                transformOrigin: 'center center',
              }}
            />
          )
        ) : !previewMode ? (
          <div
            style={{
              position: isFreeRatio ? 'relative' : 'absolute',
              inset: isFreeRatio ? undefined : 0,
              minHeight: isFreeRatio ? '92px' : undefined,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              color: '#52525b',
              textAlign: 'center',
            }}
          >
            <ImageIcon
              size={16}
              strokeWidth={1.75}
              style={{ opacity: 0.75, marginBottom: '2px' }}
            />
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                lineHeight: 1.2,
                color: '#3f3f46',
              }}
            >
              {slot.label || 'IMAGE ASSET'}
            </span>
            <span
              style={{
                fontSize: '8px',
                fontWeight: 600,
                color: '#71717a',
                marginTop: '2px',
                backgroundColor: 'rgba(255,255,255,0.7)',
                padding: '0px 4px',
                borderRadius: '2px',
              }}
            >
              {isFreeRatio ? t('自由比例', 'FREE RATIO') : effectiveRatio}
              {slot.url && wireframeMode ? ' · LOADED' : ''}
            </span>
          </div>
        ) : null}

        {/* Custom Frame Asset IN FRONT OF the Picture Frame (Optional) */}
        {hasCustomFrameAsset && frameLayer === 'front' && (
          <img
            src={slot.frameOverlayUrl!}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              zIndex: 12,
              transform: frameAssetTransform,
              transformOrigin: 'center center',
            }}
          />
        )}

        {overlayChildren && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 15,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {overlayChildren}
          </div>
        )}

        {/* On-Canvas Floating Mini Controls when Selected - CENTERED IN THE MIDDLE */}
        {isSelected && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              pointerEvents: 'auto',
              maxWidth: 'calc(100% - 16px)',
              whiteSpace: 'nowrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'rgba(15, 23, 42, 0.94)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '9999px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }}
            >
              {showActualImage && (
                <>
                  <span
                    title={t('按住拖拽图片平移画面 (放大时生效)', 'Drag image to pan when zoomed')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: '#60a5fa',
                      marginRight: '2px',
                    }}
                  >
                    <Move size={10} />
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateImageSlotById(slot.id, {
                        zoom: Math.max(0.5, Number((slot.zoom - 0.1).toFixed(2))),
                      })
                    }
                    title={t('缩小画面', 'Zoom Out')}
                    style={{
                      padding: '1px 3px',
                      cursor: 'pointer',
                      color: '#e4e4e7',
                      background: 'none',
                      border: 'none',
                    }}
                  >
                    <ZoomOut size={10} />
                  </button>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      minWidth: '28px',
                      textAlign: 'center',
                      fontSize: '9px',
                    }}
                  >
                    {Math.round(slot.zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateImageSlotById(slot.id, {
                        zoom: Math.min(3, Number((slot.zoom + 0.1).toFixed(2))),
                      })
                    }
                    title={t('放大画面', 'Zoom In')}
                    style={{
                      padding: '1px 3px',
                      cursor: 'pointer',
                      color: '#e4e4e7',
                      background: 'none',
                      border: 'none',
                    }}
                  >
                    <ZoomIn size={10} />
                  </button>

                  {(slot.zoom !== 1 ||
                    slot.focalPoint.x !== 50 ||
                    slot.focalPoint.y !== 50) && (
                    <button
                      type="button"
                      onClick={() =>
                        updateImageSlotById(slot.id, {
                          zoom: 1,
                          focalPoint: { x: 50, y: 50 },
                        })
                      }
                      title={t('重置缩放与位置', 'Reset Zoom & Position')}
                      style={{
                        padding: '1px 3px',
                        cursor: 'pointer',
                        color: '#fbbf24',
                        background: 'none',
                        border: 'none',
                        marginLeft: '2px',
                      }}
                    >
                      <RotateCcw size={9} />
                    </button>
                  )}

                  <div
                    style={{
                      width: '1px',
                      height: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      margin: '0 4px',
                    }}
                  />
                </>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={t('双击图片或点击换图', 'Double click image or click to replace')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <Upload size={9} />
                <span>
                  {showActualImage
                    ? t('换图', 'Replace')
                    : t('上传图片', 'Upload')}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Frame Resize Handle (bottom-right corner) */}
      {!previewMode && isSelected && (
        <div
          title={t('拖拽调整画框尺寸', 'Drag to resize picture frame')}
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            right: '-5px',
            bottom: '-5px',
            width: '12px',
            height: '12px',
            backgroundColor: '#2563eb',
            border: '2px solid #ffffff',
            borderRadius: '2px',
            cursor: 'nwse-resize',
            zIndex: 30,
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        />
      )}

      {/* Live Dimension Badge during resize or when selected */}
      {!previewMode && (isResizing || (isSelected && (slot.frameWidthMode === 'custom_px' || slot.frameHeightMode === 'custom_px'))) && (
        <div
          style={{
            position: 'absolute',
            bottom: '-22px',
            right: '0',
            backgroundColor: '#18181b',
            color: '#f4f4f5',
            fontSize: '10px',
            fontFamily: 'monospace',
            padding: '1px 6px',
            borderRadius: '3px',
            pointerEvents: 'none',
            zIndex: 35,
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          {resizingDims
            ? `${resizingDims.width} × ${resizingDims.height}px`
            : `${frameWidthStyle} × ${isCustomHeight ? `${customHeightPx}px` : effectiveRatio}`}
        </div>
      )}

      {/* Delete Slot Button */}
      {!previewMode && onRemoveSlot && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveSlot();
          }}
          title={t('删除此图片槽', 'Delete this image slot')}
          className="opacity-0 group-hover/imgslot:opacity-100 transition-opacity"
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            zIndex: 25,
            backgroundColor: 'rgba(220, 38, 38, 0.9)',
            color: '#ffffff',
            borderRadius: '3px',
            padding: '2px',
            cursor: 'pointer',
          }}
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
};
