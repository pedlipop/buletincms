import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FileText,
  Grid,
  Layers,
  Layout,
  Pencil,
  Printer,
  Redo2,
  Share2,
  Sliders,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { domToCanvas, domToPng } from 'modern-screenshot';
import { CanvasRenderer } from './components/CanvasRenderer';
import { HomeDashboard } from './components/HomeDashboard';
import { LeftLibrary } from './components/LeftLibrary';
import { RightInspector } from './components/RightInspector';
import { useBulletinStore } from './store/useBulletinStore';

/**
 * Builds a standards-compliant single-page PDF 1.4 binary embedding a high-DPI JPEG
 * rendered from the bulletin canvas so the entire vertical bulletin is preserved as
 * one continuous page without mid-card page breaks.
 */
function buildSinglePagePdfFromCanvas(
  canvas: HTMLCanvasElement,
  renderScale: number = 3
): Blob {
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.98);
  const base64 = jpegDataUrl.split(',')[1] || '';
  const binaryStr = window.atob(base64);
  const jpegBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    jpegBytes[i] = binaryStr.charCodeAt(i);
  }

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  // Scale canvas pixels back to 1x points (72pt = 96px -> * 0.75 / renderScale)
  const pageWidthPt = Number(((imgWidth / renderScale) * 0.75).toFixed(2));
  const pageHeightPt = Number(((imgHeight / renderScale) * 0.75).toFixed(2));

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0]; // index 0 unused, 1..5 for PDF objects
  let currentOffset = 0;

  const pushStr = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  // PDF 1.4 Header (with binary comment marker)
  pushBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xff, 0xff, 0xff, 0xff, 0x0a]));

  // 1 0 obj: Catalog
  offsets[1] = currentOffset;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2 0 obj: Pages
  offsets[2] = currentOffset;
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3 0 obj: Page
  offsets[3] = currentOffset;
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 4 0 R >> >> /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Contents 5 0 R >>\nendobj\n`
  );

  // 4 0 obj: Image XObject (DCTDecode)
  offsets[4] = currentOffset;
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushStr('\nendstream\nendobj\n');

  // 5 0 obj: Page Content Stream
  const contentStream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im0 Do\nQ\n`;
  offsets[5] = currentOffset;
  pushStr(
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
  );

  // Cross-reference table
  const xrefOffset = currentOffset;
  pushStr('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) {
    const padded = String(offsets[i]).padStart(10, '0');
    pushStr(`${padded} 00000 n \n`);
  }

  // Trailer
  pushStr(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

export const App: React.FC = () => {
  const exportCanvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'canvas' | 'library' | 'inspector'>('canvas');
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  const lang = useBulletinStore((s) => s.lang);
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  const selectedRootId = useBulletinStore((s) => s.selectedRootBlockId);
  const selectedChildId = useBulletinStore((s) => s.selectedChildBlockId);

  // Close share dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        shareDropdownRef.current &&
        !shareDropdownRef.current.contains(e.target as Node)
      ) {
        setIsShareOpen(false);
      }
    };
    if (isShareOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isShareOpen]);

  // Restore and register custom uploaded fonts
  const customFonts = useBulletinStore((s) => s.customFonts);
  useEffect(() => {
    customFonts.forEach((f) => {
      if (f.url) {
        try {
          const font = new FontFace(f.family, `url(${f.url})`);
          font.load().then((loaded) => {
            document.fonts.add(loaded);
          }).catch(console.error);
        } catch (e) {
          console.error('Failed to load font:', e);
        }
      }
    });
  }, [customFonts]);

  const currentView = useBulletinStore((s) => s.currentView);
  const setCurrentView = useBulletinStore((s) => s.setCurrentView);

  const doc = useBulletinStore((s) => s.getActiveDoc());
  const pastCount = useBulletinStore((s) => s.past.length);
  const futureCount = useBulletinStore((s) => s.future.length);
  const previewMode = useBulletinStore((s) => s.previewMode);
  const zoomPercent = useBulletinStore((s) => s.zoomPercent);

  const undo = useBulletinStore((s) => s.undo);
  const redo = useBulletinStore((s) => s.redo);
  const setPreviewMode = useBulletinStore((s) => s.setPreviewMode);
  const setZoomPercent = useBulletinStore((s) => s.setZoomPercent);
  const selectBlock = useBulletinStore((s) => s.selectBlock);
  const updateDocumentMeta = useBulletinStore((s) => s.updateDocumentMeta);
  const toggleDocumentStatus = useBulletinStore((s) => s.toggleDocumentStatus);
  const syncRemoteDatabase = useBulletinStore((s) => s.syncRemoteDatabase);

  // Initial sync with Railway PostgreSQL / backend database on startup
  useEffect(() => {
    syncRemoteDatabase();
  }, [syncRemoteDatabase]);

  // Global keyboard shortcuts for Undo / Redo in Editor
  useEffect(() => {
    if (currentView !== 'editor') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditingText =
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!isEditingText) {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isEditingText) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, undo, redo]);

  // Render Home Screen / Bulletin Library first before entering the Editor
  if (currentView === 'home') {
    return <HomeDashboard />;
  }

  // High-DPI Long-Image Export (2x Retina PNG)
  const handleExportLongImage = async () => {
    if (!exportCanvasRef.current || isExporting) return;
    setIsExporting(true);
    const prevPreview = previewMode;
    const prevZoom = zoomPercent;

    try {
      setPreviewMode(true);
      setZoomPercent(100);
      await new Promise((r) => setTimeout(r, 180));

      const dataUrl = await domToPng(exportCanvasRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `${doc.title || 'bulletin'}_${doc.issueNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export long image:', err);
      window.alert(
        t(
          '导出长图失败，请检查是否有跨域外链图片。',
          'Failed to export long image. Please check cross-origin images.'
        )
      );
    } finally {
      setPreviewMode(prevPreview);
      setZoomPercent(prevZoom);
      setIsExporting(false);
    }
  };

  // High-DPI Continuous Single-Page PDF Export (300+ DPI Retina)
  const handleExportPdf = async () => {
    if (!exportCanvasRef.current || isExporting) return;
    setIsExporting(true);
    const prevPreview = previewMode;
    const prevZoom = zoomPercent;

    try {
      setPreviewMode(true);
      setZoomPercent(100);
      await new Promise((r) => setTimeout(r, 200));

      // Scale: 3 generates razor-sharp 300+ DPI bitmap render
      const canvas = await domToCanvas(exportCanvasRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
      });

      const pdfBlob = buildSinglePagePdfFromCanvas(canvas, 3);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.download = `${doc.title || 'bulletin'}_${doc.issueNumber}.pdf`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      window.alert(
        t(
          '导出 PDF 失败，请检查是否有跨域外链图片。',
          'Failed to export PDF. Please check cross-origin images.'
        )
      );
    } finally {
      setPreviewMode(prevPreview);
      setZoomPercent(prevZoom);
      setIsExporting(false);
    }
  };

  // True Vector PDF Printing (100% Vector Fonts & SVG curves, Zero Rasterization)
  const handlePrintVectorPdf = () => {
    const prevPreview = previewMode;
    const prevZoom = zoomPercent;
    setPreviewMode(true);
    setZoomPercent(100);
    setTimeout(() => {
      window.print();
      setPreviewMode(prevPreview);
      setZoomPercent(prevZoom);
    }, 250);
  };

  // Export structured JSON backup
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${doc.title || 'bulletin'}_${doc.issueNumber}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isPublished = doc.status === 'published';

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* ========================================================= */}
      {/* TOP WORKSPACE HEADER BAR                                  */}
      {/* ========================================================= */}
      <header className="h-12 bg-zinc-900 border-b border-zinc-800 px-2.5 sm:px-3 flex items-center justify-between shrink-0 select-none gap-1 sm:gap-2">
        {/* Left: Back to Home Library & Active Document Title */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className="px-2 sm:px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-xs font-semibold text-zinc-100 flex items-center gap-1 sm:gap-1.5 transition-colors shrink-0"
            title={t('返回简报作品库首页', 'Back to Bulletin Library')}
          >
            <ArrowLeft size={13} />
            <span className="hidden xs:inline">{t('作品库', 'Library')}</span>
          </button>

          <span className="text-zinc-700 hidden xs:inline">/</span>

          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <div className="relative flex items-center group">
              <input
                type="text"
                value={doc.title}
                onChange={(e) => updateDocumentMeta({ title: e.target.value })}
                placeholder={t('未命名简报', 'Untitled Bulletin')}
                title={t('点击直接修改项目名称', 'Click to edit project name')}
                className="text-xs font-semibold text-zinc-100 bg-transparent hover:bg-zinc-800/80 focus:bg-zinc-800 focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-0.5 border border-transparent hover:border-zinc-700 focus:border-zinc-600 transition-colors max-w-[90px] xs:max-w-[130px] sm:max-w-[200px] truncate outline-none cursor-text"
              />
              <Pencil
                size={10}
                className="absolute right-1 text-zinc-500 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
              />
            </div>

            <span className="hidden sm:inline-block text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 shrink-0">
              {doc.issueNumber}
            </span>
            <button
              type="button"
              onClick={() => toggleDocumentStatus(doc.id)}
              title={t('点击切换状态', 'Toggle Draft / Published')}
              className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-colors shrink-0 ${
                isPublished
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {isPublished ? <CheckCircle2 size={10} /> : <Clock size={10} />}
              <span className="hidden sm:inline">
                {isPublished ? t('已定稿', 'Published') : t('草稿', 'Draft')}
              </span>
            </button>
          </div>
        </div>

        {/* Center: Desktop-only controls (Grey Wireframe, Grid, Desktop Undo/Redo, Zoom) */}
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              updateDocumentMeta({ wireframeMode: !doc.wireframeMode })
            }
            className={`px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
              doc.wireframeMode
                ? 'bg-zinc-200 text-zinc-900 border-white'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
            }`}
            title={t(
              '强制将全篇渲染为结构灰模与占位框',
              'Force grey wireframe mode across the whole bulletin'
            )}
          >
            <Layers size={13} />
            <span>
              {doc.wireframeMode
                ? t('灰模: 开启', 'Wireframe: ON')
                : t('灰模模式', 'Wireframe')}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              updateDocumentMeta({ showGridGuides: !doc.showGridGuides })
            }
            className={`p-1.5 rounded border transition-colors ${
              doc.showGridGuides
                ? 'bg-zinc-200 text-zinc-900 border-white'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
            }`}
            title={t('显示 16px 结构网格线', 'Toggle 16px Grid Guides')}
          >
            <Grid size={14} />
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          {/* Undo / Redo */}
          <div className="flex items-center bg-zinc-800/90 border border-zinc-700 rounded overflow-hidden">
            <button
              type="button"
              onClick={undo}
              disabled={pastCount === 0}
              className="px-2 py-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-35 disabled:pointer-events-none"
              title={t('撤销 (Ctrl+Z)', 'Undo (Ctrl+Z)')}
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={futureCount === 0}
              className="px-2 py-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-35 disabled:pointer-events-none border-l border-zinc-700"
              title={t('重做 (Ctrl+Y)', 'Redo (Ctrl+Y)')}
            >
              <Redo2 size={14} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-zinc-800/90 border border-zinc-700 rounded overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setZoomPercent(zoomPercent - 10)}
              className="px-2 py-1.5 text-zinc-300 hover:bg-zinc-700"
              title={t('缩小画布', 'Zoom Out')}
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoomPercent(100)}
              className="px-2 py-1 font-mono text-[11px] text-zinc-200 hover:bg-zinc-700"
              title={t('重置为 100%', 'Reset to 100%')}
            >
              {zoomPercent}%
            </button>
            <button
              type="button"
              onClick={() => setZoomPercent(zoomPercent + 10)}
              className="px-2 py-1.5 text-zinc-300 hover:bg-zinc-700"
              title={t('放大画布', 'Zoom In')}
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>

        {/* Right: Preview & Unified Share/Export Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Undo / Redo */}
          <div className="flex md:hidden items-center bg-zinc-800/90 border border-zinc-700 rounded overflow-hidden">
            <button
              type="button"
              onClick={undo}
              disabled={pastCount === 0}
              className="p-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-35 disabled:pointer-events-none"
              title={t('撤销', 'Undo')}
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={futureCount === 0}
              className="p-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-35 disabled:pointer-events-none border-l border-zinc-700"
              title={t('重做', 'Redo')}
            >
              <Redo2 size={13} />
            </button>
          </div>

          {/* Icon-only Preview Button */}
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={`p-1.5 rounded border transition-colors ${
              previewMode
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-100'
            }`}
            title={
              previewMode
                ? t('退出全屏预览 (Eye)', 'Exit Preview (Eye)')
                : t('进入全屏预览 (Eye)', 'Preview Bulletin (Eye)')
            }
          >
            {previewMode ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          {/* Share / Export Unified Menu */}
          <div className="relative" ref={shareDropdownRef}>
            <button
              type="button"
              onClick={() => setIsShareOpen(!isShareOpen)}
              disabled={isExporting}
              className="px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-sm transition-colors"
              title={t('分享与导出简报', 'Share & Export Bulletin')}
            >
              <Share2 size={13} />
              <span className="hidden xs:inline">
                {isExporting
                  ? t('正在生成...', 'Exporting...')
                  : t('分享 / 导出', 'Share / Export')}
              </span>
              <span className="xs:hidden">
                {isExporting ? '...' : t('导出', 'Export')}
              </span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-150 ${
                  isShareOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isShareOpen && (
              <div className="absolute right-0 mt-1.5 w-64 max-w-[calc(100vw-24px)] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs select-none">
                {/* 1. Long Image PNG */}
                <button
                  type="button"
                  onClick={() => {
                    setIsShareOpen(false);
                    handleExportLongImage();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-zinc-800 flex items-start gap-2.5 transition-colors group"
                >
                  <Download size={15} className="text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-zinc-100 group-hover:text-blue-300">
                      {t('导出长图 (PNG)', 'Export Image (PNG)')}
                    </div>
                    <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                      {t('Retina 高清位图，适合微信、朋友圈分享', 'High-res image for chat & social media')}
                    </div>
                  </div>
                </button>

                {/* 2. Continuous PDF */}
                <button
                  type="button"
                  onClick={() => {
                    setIsShareOpen(false);
                    handleExportPdf();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-zinc-800 flex items-start gap-2.5 transition-colors group"
                >
                  <FileText size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-zinc-100 group-hover:text-emerald-300">
                      {t('导出单页 PDF (高清下载)', 'Export Single-Page PDF')}
                    </div>
                    <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                      {t('300+ DPI 高清单页长图 PDF，无断卡分割', '300+ DPI continuous single-page PDF')}
                    </div>
                  </div>
                </button>

                {/* 3. True Vector PDF Print */}
                <button
                  type="button"
                  onClick={() => {
                    setIsShareOpen(false);
                    handlePrintVectorPdf();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-zinc-800 flex items-start gap-2.5 transition-colors group"
                >
                  <Printer size={15} className="text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-zinc-100 group-hover:text-amber-300">
                      {t('矢量 PDF (浏览器打印 / 保存)', 'Vector PDF (Print / Save)')}
                    </div>
                    <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                      {t('真实矢量字形与图形，文字可选中且永不模糊', '100% crisp vector shapes & selectable text')}
                    </div>
                  </div>
                </button>

                <div className="h-px bg-zinc-800 my-0.5" />

                {/* 4. JSON Structure */}
                <button
                  type="button"
                  onClick={() => {
                    setIsShareOpen(false);
                    handleExportJson();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-zinc-300 hover:text-zinc-100"
                >
                  <FileJson size={14} className="text-zinc-400 shrink-0" />
                  <span className="font-medium text-[11px]">
                    {t('导出工程备份 (JSON)', 'Export JSON Backup')}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 3-PANE WORKSPACE / MOBILE TABS                            */}
      {/* ========================================================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Library: on desktop always visible unless previewMode. On mobile, visible when mobileTab === 'library' */}
        {!previewMode && (
          <div
            className={`${
              mobileTab === 'library' ? 'flex' : 'hidden'
            } md:flex flex-col h-full shrink-0 z-30 md:static absolute inset-0 md:inset-auto bg-zinc-950 md:bg-transparent`}
          >
            {/* Mobile Header Bar for Library */}
            <div className="md:hidden flex items-center justify-between px-3.5 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-bold shrink-0">
              <span className="flex items-center gap-1.5 text-zinc-200">
                <Layers size={14} className="text-blue-400" />
                {t('组件与素材库', 'Blocks & Assets')}
              </span>
              <button
                type="button"
                onClick={() => setMobileTab('canvas')}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <span>{t('返回画布', 'Back to Canvas')}</span>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex">
              <LeftLibrary />
            </div>
          </div>
        )}

        {/* Center Canvas: on desktop flex-1, on mobile shown when mobileTab === 'canvas' */}
        <main
          onClick={() => selectBlock(null, null)}
          className={`${
            mobileTab === 'canvas' ? 'flex' : 'hidden'
          } md:flex flex-1 overflow-y-auto overflow-x-auto bg-zinc-950 items-start justify-center py-4 px-2 sm:py-12 sm:px-6 relative`}
          style={{
            backgroundImage:
              'radial-gradient(rgba(161, 161, 170, 0.14) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <div className="h-fit pb-20 md:pb-16 flex justify-center">
            <CanvasRenderer exportRef={exportCanvasRef} />
          </div>

          {/* Floating Pill on mobile when a block is selected to jump to inspector */}
          {!previewMode && (selectedRootId || selectedChildId) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMobileTab('inspector');
              }}
              className="md:hidden fixed bottom-16 right-4 z-30 px-3.5 py-2 rounded-full bg-blue-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 animate-bounce"
            >
              <Sliders size={13} />
              <span>{t('编辑选中组件', 'Edit Block')}</span>
            </button>
          )}
        </main>

        {/* Right Inspector: on desktop always visible unless previewMode. On mobile, visible when mobileTab === 'inspector' */}
        {!previewMode && (
          <div
            className={`${
              mobileTab === 'inspector' ? 'flex' : 'hidden'
            } md:flex flex-col h-full shrink-0 z-30 md:static absolute inset-0 md:inset-auto bg-zinc-950 md:bg-transparent`}
          >
            {/* Mobile Header Bar for Inspector */}
            <div className="md:hidden flex items-center justify-between px-3.5 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-bold shrink-0">
              <span className="flex items-center gap-1.5 text-zinc-200">
                <Sliders size={14} className="text-blue-400" />
                {t('属性面板与排版调节', 'Inspector & Typography')}
              </span>
              <button
                type="button"
                onClick={() => setMobileTab('canvas')}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <span>{t('返回画布', 'Back to Canvas')}</span>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex">
              <RightInspector />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR                              */}
      {/* ========================================================= */}
      {!previewMode && (
        <nav className="md:hidden h-14 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 px-4 flex items-center justify-around shrink-0 select-none z-40">
          <button
            type="button"
            onClick={() => setMobileTab('canvas')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-lg text-xs font-bold transition-colors ${
              mobileTab === 'canvas'
                ? 'text-blue-400 bg-blue-950/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layout size={17} />
            <span>{t('画布', 'Canvas')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('library')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-lg text-xs font-bold transition-colors ${
              mobileTab === 'library'
                ? 'text-blue-400 bg-blue-950/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers size={17} />
            <span>{t('组件库', 'Blocks')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('inspector')}
            className={`relative flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-lg text-xs font-bold transition-colors ${
              mobileTab === 'inspector'
                ? 'text-blue-400 bg-blue-950/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders size={17} />
            <span>{t('属性', 'Inspector')}</span>
            {(selectedRootId || selectedChildId) && (
              <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-zinc-900 animate-pulse" />
            )}
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
