import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  FileJson,
  FilePlus2,
  FolderKanban,
  FolderPlus,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  BulletinDocument,
  MastheadBlock,
  SectionContainerBlock,
} from '../types/bulletin';
import { useBulletinStore } from '../store/useBulletinStore';
const GithubIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const HomeDashboard: React.FC = () => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIssue, setEditIssue] = useState('');
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<BulletinDocument | null>(null);

  const lang = useBulletinStore((s) => s.lang);
  const setLang = useBulletinStore((s) => s.setLang);
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);

  const documents = useBulletinStore((s) => s.documents);
  const activeDocId = useBulletinStore((s) => s.activeDocId);
  const savedTemplates = useBulletinStore((s) => s.savedTemplates);

  const openDocumentInEditor = useBulletinStore((s) => s.openDocumentInEditor);
  const createNewDocument = useBulletinStore((s) => s.createNewDocument);
  const duplicateDocumentById = useBulletinStore((s) => s.duplicateDocumentById);
  const toggleDocumentStatus = useBulletinStore((s) => s.toggleDocumentStatus);
  const renameDocument = useBulletinStore((s) => s.renameDocument);
  const deleteDocument = useBulletinStore((s) => s.deleteDocument);
  const deleteAllDocuments = useBulletinStore((s) => s.deleteAllDocuments);
  const importDocumentJson = useBulletinStore((s) => s.importDocumentJson);
  const deleteTemplate = useBulletinStore((s) => s.deleteTemplate);
  const setCurrentView = useBulletinStore((s) => s.setCurrentView);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.issueNumber.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    const docStatus = doc.status || 'draft';
    if (statusFilter === 'all') return true;
    return docStatus === statusFilter;
  });

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed && Array.isArray(parsed.rootBlocks)) {
          importDocumentJson(parsed as BulletinDocument);
        } else {
          window.alert(t('无效的简报 JSON 文件格式。', 'Invalid Bulletin JSON format.'));
        }
      } catch {
        window.alert(t('解析 JSON 文件失败。', 'Failed to parse JSON file.'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportDocJson = (doc: BulletinDocument, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const startRename = (doc: BulletinDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDocId(doc.id);
    setEditTitle(doc.title);
    setEditIssue(doc.issueNumber);
  };

  const saveRename = (docId: string, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    renameDocument(docId, editTitle, editIssue);
    setEditingDocId(null);
  };

  // Renders a realistic miniature wireframe/theme preview of a BulletinDocument
  const renderMiniBulletinThumbnail = (doc: BulletinDocument) => {
    const masthead = doc.rootBlocks.find(
      (b): b is MastheadBlock => b.type === 'masthead'
    );
    const sections = doc.rootBlocks.filter(
      (b): b is SectionContainerBlock => b.type === 'section_container'
    );

    return (
      <div className="w-[168px] bg-white rounded-t shadow-md border border-zinc-300 overflow-hidden flex flex-col shrink-0 select-none">
        {/* Mini Masthead */}
        {masthead ? (
          <div
            style={{ backgroundColor: masthead.accentColor || '#3f3f46' }}
            className="h-9 p-1.5 flex flex-col justify-between text-white relative overflow-hidden"
          >
            {masthead.heroImage.url && (
              <img
                src={masthead.heroImage.url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-55"
              />
            )}
            <div className="relative z-10 text-[6px] opacity-80 truncate">
              {masthead.orgNameLeft}
            </div>
            <div className="relative z-10 text-[8px] font-black truncate">
              {masthead.heroTitleMain}
            </div>
          </div>
        ) : (
          <div className="h-4 bg-zinc-700" />
        )}

        {/* Mini Sections Stack */}
        <div className="p-1.5 space-y-1.5 bg-zinc-50 flex-1">
          {sections.slice(0, 4).map((sec) => (
            <div
              key={sec.id}
              style={{
                backgroundColor: sec.theme?.containerBg || '#f4f4f5',
                borderColor: sec.theme?.containerBorder || '#d4d4d8',
              }}
              className="border rounded-[3px] p-1 space-y-1"
            >
              {sec.showHeader !== false && (
                <div className="flex items-center gap-1 border-b border-black/10 pb-0.5">
                  {sec.showBadge !== false && (
                    <span
                      style={{
                        backgroundColor: sec.theme?.primaryColor || '#3f3f46',
                      }}
                      className="w-2.5 h-2.5 rounded-[1px] text-[6px] text-white font-bold flex items-center justify-center shrink-0"
                    >
                      {sec.sectionNumber || '1'}
                    </span>
                  )}
                  <span
                    style={{ color: sec.theme?.primaryColor || '#3f3f46' }}
                    className="text-[7px] font-black truncate"
                  >
                    {sec.title}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-0.5">
                <div className="h-2.5 bg-zinc-300/90 rounded-[1px]" />
                <div className="h-2.5 bg-zinc-300/90 rounded-[1px]" />
                <div className="h-2.5 bg-zinc-300/90 rounded-[1px]" />
              </div>
            </div>
          ))}
          {sections.length > 4 && (
            <div className="text-[7px] text-center text-zinc-400 font-semibold">
              + {sections.length - 4} {t('个章节...', 'more sections...')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-y-auto">
      {/* ========================================================= */}
      {/* TOP NAVIGATION HEADER                                     */}
      {/* ========================================================= */}
      <header className="min-h-14 py-2.5 px-3 sm:px-6 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-950 font-black text-base flex items-center justify-center shadow">
            B
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                TheBulletin
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              made by Morowali Brand Team
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Language Switcher Pill */}
          <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-md p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLang('zh')}
              className={`px-2.5 py-1 rounded transition-colors ${
                lang === 'zh'
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              中文
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded transition-colors ${
                lang === 'en'
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              EN
            </button>
          </div>

          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJsonFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Upload size={13} />
            <span className="hidden xs:inline">{t('导入 JSON', 'Import JSON')}</span>
            <span className="xs:hidden">{t('导入', 'Import')}</span>
          </button>

          <a
            href="https://github.com/pedlipop/buletincms"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors shadow-xs"
            title="GitHub Repository"
          >
            <GithubIcon size={13} />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          <button
            type="button"
            onClick={() => {
              if (documents.length === 0) {
                createNewDocument('blank', true);
              } else {
                setCurrentView('editor');
              }
            }}
            className="px-3 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span>{documents.length === 0 ? t('新建简报', 'New Bulletin') : t('继续编辑', 'Continue')}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN DASHBOARD BODY                                       */}
      {/* ========================================================= */}
      <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-8 sm:space-y-10">
        {/* SECTION 1: START A NEW BULLETIN */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Sparkles size={14} className="text-zinc-300" />
              <span>{t('新建简报工程', 'Start a New Bulletin')}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Starter 1: Blank Custom Container Layout */}
            <button
              type="button"
              onClick={() => createNewDocument('blank', true)}
              className="group bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-blue-500/60 rounded-xl p-4 text-left transition-all flex items-start gap-4 shadow-sm card-lift btn-press"
            >
              <div className="w-11 h-11 rounded-lg bg-blue-950/60 group-hover:bg-blue-900/60 border border-blue-700/50 flex items-center justify-center shrink-0 text-blue-300 group-hover:scale-110 transition-transform">
                <Plus size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                  {t('新建自由空白画布', 'Blank Custom Canvas')}
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {t(
                    '从空白无标题容器与自由分栏开始，适合直接上传自有设计图与灵活多列排版。',
                    'Start from a blank container and multi-column grid for custom visual assets.'
                  )}
                </p>
              </div>
            </button>

            {/* Starter 2: Clone Current Issue or Import Existing JSON */}
            {documents.length > 0 ? (
              <button
                type="button"
                onClick={() => createNewDocument('clone_current', true)}
                className="group bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-500 rounded-xl p-4 text-left transition-all flex items-start gap-4 shadow-sm card-lift btn-press"
              >
                <div className="w-11 h-11 rounded-lg bg-zinc-800 group-hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center shrink-0 text-zinc-100 group-hover:scale-110 transition-transform">
                  <FilePlus2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                    {t('克隆当前期简报', 'Clone Current Issue')}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {t(
                      '一键复制最近一期的版式、配色与模块结构，只需替换当月照片与文字即可出图。',
                      'Duplicate the active bulletin layout and theme to quickly produce the next issue.'
                    )}
                  </p>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="group bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 text-left transition-all flex items-start gap-4 shadow-sm card-lift btn-press"
              >
                <div className="w-11 h-11 rounded-lg bg-zinc-800 group-hover:bg-zinc-750 border border-zinc-700 flex items-center justify-center shrink-0 text-zinc-200 group-hover:scale-110 transition-transform">
                  <Upload size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                    {t('导入已有 JSON 简报', 'Import JSON Bulletin')}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {t(
                      '从本地加载先前导出的 JSON 工程文件，立即恢复所有排版与自定义样式。',
                      'Load previously exported JSON project file to instantly restore layout and custom styles.'
                    )}
                  </p>
                </div>
              </button>
            )}
          </div>
        </section>

        {/* SECTION 2: ALL BULLETINS LIBRARY */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderKanban size={16} className="text-blue-400" />
                <span>{t('我的简报作品库', 'My Bulletin Library')}</span>
                <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                  {documents.length}
                </span>
              </h2>

              {/* Clear / Delete All Button */}
              {documents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAllOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 rounded-lg transition-colors cursor-pointer"
                  title={t('清空全部简报', 'Delete all bulletins')}
                >
                  <Trash2 size={12} />
                  <span>{t('清空全部作品', 'Delete All')}</span>
                </button>
              )}

              {/* Filter Pills */}
              {documents.length > 0 && (
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
                  {(
                    [
                      { id: 'all', zh: '全部', en: 'All' },
                      { id: 'draft', zh: '草稿箱', en: 'Drafts' },
                      { id: 'published', zh: '已定稿', en: 'Published' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        statusFilter === tab.id
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t(tab.zh, tab.en)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Input */}
            {documents.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  placeholder={t('搜索简报标题或期号...', 'Search title or issue...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Bulletin Cards Grid or Hero Empty State */}
          {documents.length === 0 ? (
            /* HERO EMPTY STATE */
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 via-zinc-900/50 to-zinc-950 p-8 sm:p-14 text-center shadow-2xl backdrop-blur-sm transition-all">
              {/* Subtle radiant background glow */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-64 w-96 rounded-full bg-blue-600/10 blur-3xl" />
                <div className="h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />
              </div>

              <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto">
                {/* Glowing Icon Badge */}
                <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600/20 via-blue-500/10 to-indigo-600/20 border border-blue-500/30 shadow-[0_0_35px_rgba(37,99,235,0.25)]">
                  <FolderPlus className="text-blue-400" size={38} strokeWidth={1.75} />
                </div>

                {/* Hero Headings */}
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2.5">
                  {t('还没有任何简报作品', 'No Bulletins Yet')}
                </h3>
                <p className="text-sm text-zinc-400 mb-8 leading-relaxed max-w-md">
                  {t(
                    '作品库当前已完全清空。立即点击下方按钮创建第一份专属简报，开启自由图文排版！',
                    'Your bulletin library is empty. Click below to create your first bulletin and start publishing!'
                  )}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full justify-center">
                  <button
                    type="button"
                    onClick={() => createNewDocument('blank', true)}
                    className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-[0_0_25px_rgba(37,99,235,0.45)] hover:shadow-[0_0_35px_rgba(37,99,235,0.65)] flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    <Plus size={18} strokeWidth={2.5} />
                    <span>{t('新建空白简报', 'Create New Bulletin')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => jsonInputRef.current?.click()}
                    className="w-full sm:w-auto px-5 py-3.5 bg-zinc-800/90 hover:bg-zinc-750 text-zinc-200 hover:text-white border border-zinc-700/80 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:border-zinc-600"
                  >
                    <Upload size={16} className="text-zinc-300" />
                    <span>{t('导入已有 JSON 简报', 'Import JSON Bulletin')}</span>
                  </button>
                </div>

                {/* Auxiliary Import Link */}
                <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
                  <span>{t('或者：', 'or:')}</span>
                  <button
                    type="button"
                    onClick={() => jsonInputRef.current?.click()}
                    className="text-zinc-400 hover:text-zinc-200 underline underline-offset-4 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Upload size={12} />
                    <span>{t('从 JSON 备份文件导入', 'Import from JSON file')}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl py-16 text-center space-y-3">
              <p className="text-sm text-zinc-400 font-semibold">
                {t('没有找到匹配的简报文档', 'No matching bulletins found')}
              </p>
              <p className="text-xs text-zinc-500">
                {t('清除搜索或筛选条件以查看全部简报', 'Clear your search or filter to see all bulletins')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="mt-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>{t('重置搜索与筛选', 'Reset Search & Filter')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocs.map((doc, index) => {
                const isCurrentActive = doc.id === activeDocId;
                const isPublished = doc.status === 'published';
                const sectionCount = doc.rootBlocks.filter(
                  (b) => b.type === 'section_container'
                ).length;
                const totalInnerBlocks = doc.rootBlocks.reduce(
                  (acc, b) =>
                    b.type === 'section_container' ? acc + b.children.length : acc + 1,
                  0
                );

                return (
                  <div
                    key={doc.id}
                    onClick={() => openDocumentInEditor(doc.id)}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className={`group bg-zinc-900 hover:bg-zinc-900/90 border rounded-xl overflow-hidden flex flex-col cursor-pointer transition-all card-lift animate-spring-in shadow-lg ${
                      isCurrentActive
                        ? 'border-blue-500/70 ring-1 ring-blue-500/30'
                        : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {/* Top Visual Thumbnail Preview Area */}
                    <div className="h-48 bg-zinc-950/90 border-b border-zinc-800/80 pt-4 px-4 flex justify-center overflow-hidden relative">
                      <div className="transform group-hover:scale-[1.04] transition-transform duration-300 ease-out origin-top">
                        {renderMiniBulletinThumbnail(doc)}
                      </div>

                      {/* Status Badge (Top Left) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDocumentStatus(doc.id);
                        }}
                        title={t('点击切换状态', 'Toggle Draft / Published')}
                        className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border shadow-sm transition-colors ${
                          isPublished
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900'
                            : 'bg-zinc-800/90 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        {isPublished ? (
                          <>
                            <CheckCircle2 size={10} />
                            <span>{t('已定稿', 'Published')}</span>
                          </>
                        ) : (
                          <>
                            <Clock size={10} />
                            <span>{t('草稿', 'Draft')}</span>
                          </>
                        )}
                      </button>

                      {/* Issue Badge (Top Right) */}
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-700 text-[10px] font-mono text-zinc-300">
                        {doc.issueNumber}
                      </span>

                      {/* Hover Quick Enter Overlay */}
                      <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg">
                          <span>{t('打开编辑器', 'Open in Editor')}</span>
                          <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>

                    {/* Card Metadata & Actions */}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      {editingDocId === doc.id ? (
                        <form
                          onSubmit={(e) => saveRename(doc.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="space-y-2"
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder={t('简报标题', 'Bulletin Title')}
                            autoFocus
                            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editIssue}
                              onChange={(e) => setEditIssue(e.target.value)}
                              placeholder={t('期号', 'Issue No.')}
                              className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                            />
                            <button
                              type="submit"
                              className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-semibold"
                            >
                              {t('保存', 'Save')}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                              {doc.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                            <span>
                              {sectionCount} {t('个容器', 'sections')}
                            </span>
                            <span>·</span>
                            <span>
                              {totalInnerBlocks} {t('个模块', 'blocks')}
                            </span>
                            <span>·</span>
                            <span>{doc.canvasWidth}px</span>
                          </div>
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>
                          {t('更新于', 'Updated')}{' '}
                          {new Date(doc.updatedAt).toLocaleString(
                            lang === 'zh' ? 'zh-CN' : 'en-US',
                            {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </span>

                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1"
                        >
                          <button
                            type="button"
                            onClick={(e) => startRename(doc, e)}
                            title={t('重命名', 'Rename')}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateDocumentById(doc.id);
                            }}
                            title={t('复制简报', 'Duplicate')}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleExportDocJson(doc, e)}
                            title={t('导出 JSON', 'Export JSON')}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                          >
                            <FileJson size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteDoc(doc);
                            }}
                            title={t('删除简报', 'Delete')}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 3: SAVED REUSABLE TEMPLATES LIBRARY */}
        {savedTemplates.length > 0 && (
          <section className="space-y-3 pt-4 border-t border-zinc-900">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Bookmark size={14} className="text-zinc-300" />
              <span>
                {t('我的已存章节与组件模板', 'Saved Custom Templates')} (
                {savedTemplates.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {savedTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {tpl.category === 'section'
                        ? t('整章容器模板', 'Section')
                        : t('图文组件模板', 'Block')}
                    </span>
                    <div className="text-xs font-semibold text-white truncate mt-1.5">
                      {tpl.name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(tpl.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded"
                    title={t('删除模板', 'Delete')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ========================================================= */}
      {/* GLOBAL FOOTER                                             */}
      {/* ========================================================= */}
      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-md py-6 sm:py-8 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 text-xs text-zinc-400">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-300 text-zinc-950 font-black text-sm flex items-center justify-center shadow-md">
              B
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="font-bold text-sm tracking-tight text-white">TheBulletin CMS</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  v0.1.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {t(
                  '专为园区与品牌团队打造的自由排版企业简报 CMS · 持续单页矢量渲染',
                  'Enterprise newsletter & visual bulletin designer · Continuous vector layout'
                )}
              </p>
            </div>
          </div>

          {/* Right: GitHub Links & Profile */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4">
            <a
              href="https://github.com/pedlipop/buletincms"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all shadow-sm group cursor-pointer"
              title={t('在 GitHub 上查看源码与文档', 'View source and docs on GitHub')}
            >
              <GithubIcon size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
              <span className="font-semibold text-xs">buletincms</span>
              <span className="text-zinc-600">/</span>
              <span className="text-[11px] text-zinc-400 group-hover:text-blue-400 font-mono transition-colors">GitHub</span>
            </a>

            <a
              href="https://github.com/pedlipop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
              title={t('访问作者 GitHub 主页', "Visit author's GitHub profile")}
            >
              <span>{t('开发者', 'Author')}:</span>
              <span className="text-zinc-200 font-bold underline underline-offset-4 decoration-zinc-700 hover:decoration-blue-400 transition-colors">
                @pedlipop
              </span>
            </a>
          </div>
        </div>
      </footer>

      {/* CONFIRM DELETE ALL MODAL */}
      {confirmDeleteAllOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-base font-bold text-white">
                {t('确认彻底清空全部简报？', 'Delete All Bulletins?')}
              </h3>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {t(
                `您即将彻底清空作品库中的全部 ${documents.length} 份简报。清空后作品库将进入空白状态，此操作无法撤销！`,
                `You are about to permanently delete all ${documents.length} bulletins in your workspace. This cannot be undone!`
              )}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteAllOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('取消', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAllDocuments();
                  setConfirmDeleteAllOpen(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                {t(`确认清空全部 (${documents.length})`, `Delete All (${documents.length})`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SINGLE DOC MODAL */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <h3 className="text-base font-bold text-white truncate">
                {t('确认删除此简报？', 'Delete Bulletin?')}
              </h3>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {t(
                `确定要删除简报《${confirmDeleteDoc.title}》吗？此操作无法撤销。`,
                `Are you sure you want to delete "${confirmDeleteDoc.title}"? This cannot be undone.`
              )}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('取消', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteDocument(confirmDeleteDoc.id);
                  setConfirmDeleteDoc(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                {t('确认删除', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
