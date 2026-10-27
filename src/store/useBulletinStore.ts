import { create } from 'zustand';
import {
  BulletinDocument,
  ContentBlock,
  CustomAssetCategory,
  CustomAssetItem,
  CustomFontItem,
  ImageSlotData,
  RootBlock,
  SavedTemplate,
  SectionContainerBlock,
} from '../types/bulletin';
import {
  createBlankContainer,
  createContentBlock,
  createDefaultGreyBulletin,
  createFooterBannerBlock,
  createHighlightsBarBlock,
  createMastheadBlock,
  createSectionContainer,
  SECTION_THEMES,
  uid,
} from '../data/presets';

const STORAGE_KEY = 'buletincms_state_v2';

export function cloneWithNewIds<T>(obj: T): T {
  const raw = JSON.parse(JSON.stringify(obj));
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.id === 'string') {
      const prefix = node.id.split('_')[0] || 'id';
      node.id = uid(prefix);
    }
    for (const key of Object.keys(node)) {
      if (Array.isArray(node[key])) {
        node[key].forEach(walk);
      } else if (typeof node[key] === 'object') {
        walk(node[key]);
      }
    }
  };
  walk(raw);
  return raw;
}

function updateImageInDocument(
  doc: BulletinDocument,
  slotId: string,
  patch: Partial<ImageSlotData>
): BulletinDocument {
  const nextDoc: BulletinDocument = JSON.parse(JSON.stringify(doc));

  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (
      typeof node.id === 'string' &&
      node.id === slotId &&
      'aspectRatio' in node &&
      'focalPoint' in node
    ) {
      Object.assign(node, patch);
      return;
    }
    if (
      patch.aspectRatio &&
      'imageAspectRatio' in node &&
      Array.isArray(node.images) &&
      node.images.some((s: any) => s && s.id === slotId)
    ) {
      node.imageAspectRatio = patch.aspectRatio;
    }
    for (const key of Object.keys(node)) {
      if (Array.isArray(node[key])) {
        node[key].forEach(walk);
      } else if (typeof node[key] === 'object') {
        walk(node[key]);
      }
    }
  };

  walk(nextDoc.rootBlocks);
  nextDoc.updatedAt = new Date().toISOString();
  return nextDoc;
}

export function findImageSlotInDocument(
  doc: BulletinDocument,
  slotId: string | null
): ImageSlotData | null {
  if (!slotId) return null;
  let found: ImageSlotData | null = null;

  const walk = (node: any) => {
    if (found || !node || typeof node !== 'object') return;
    if (
      typeof node.id === 'string' &&
      node.id === slotId &&
      'aspectRatio' in node &&
      'focalPoint' in node
    ) {
      found = node as ImageSlotData;
      return;
    }
    for (const key of Object.keys(node)) {
      if (Array.isArray(node[key])) {
        node[key].forEach(walk);
      } else if (typeof node[key] === 'object') {
        walk(node[key]);
      }
    }
  };

  walk(doc.rootBlocks);
  return found;
}

// Drag-and-drop payload transferred via HTML5 DataTransfer or store state
export type DragPayload =
  | {
      source: 'canvas_root';
      rootBlockId: string;
    }
  | {
      source: 'canvas_child';
      sectionId: string;
      childBlockId: string;
    }
  | {
      source: 'library_root';
      rootFactory: 'numbered_section' | 'blank_container' | 'simple_header_section' | 'masthead' | 'highlights_bar' | 'footer_banner';
    }
  | {
      source: 'library_child';
      blockType: ContentBlock['type'];
      variantHint?: string;
    }
  | {
      source: 'library_template';
      templateId: string;
    };

export type AppLang = 'zh' | 'en';

interface BulletinState {
  lang: AppLang;
  setLang: (lang: AppLang) => void;
  currentView: 'home' | 'editor';
  setCurrentView: (view: 'home' | 'editor') => void;
  openDocumentInEditor: (docId: string) => void;

  documents: BulletinDocument[];
  activeDocId: string;
  savedTemplates: SavedTemplate[];
  customAssets: CustomAssetItem[];
  customFonts: CustomFontItem[];
  addCustomFont: (font: CustomFontItem) => void;

  past: BulletinDocument[];
  future: BulletinDocument[];

  selectedRootBlockId: string | null;
  selectedChildBlockId: string | null;
  selectedImageSlotId: string | null;
  previewMode: boolean;
  zoomPercent: number;

  // Active Drag Payload
  activeDrag: DragPayload | null;
  setActiveDrag: (payload: DragPayload | null) => void;

  getActiveDoc: () => BulletinDocument;

  selectBlock: (rootBlockId: string | null, childBlockId?: string | null) => void;
  selectImageSlot: (slotId: string | null, rootBlockId?: string, childBlockId?: string) => void;
  setPreviewMode: (preview: boolean) => void;
  setZoomPercent: (zoom: number) => void;

  updateDocumentMeta: (
    patch: Partial<
      Pick<
        BulletinDocument,
        'title' | 'issueNumber' | 'status' | 'canvasWidth' | 'wireframeMode' | 'showGridGuides' | 'fontFamily'
      >
    >
  ) => void;
  applyAllGreyWireframeTheme: () => void;
  applySampleColorPalettes: () => void;
  undo: () => void;
  redo: () => void;

  // Root & Section Actions
  insertRootBlock: (block: RootBlock, afterRootId?: string) => void;
  updateRootBlock: (rootId: string, updater: (block: RootBlock) => RootBlock) => void;
  moveRootBlock: (rootId: string, direction: 'up' | 'down') => void;
  duplicateRootBlock: (rootId: string) => void;
  deleteRootBlock: (rootId: string) => void;

  // Inner Content Block Actions
  insertContentBlock: (
    blockOrType: ContentBlock['type'] | ContentBlock,
    targetSectionId?: string,
    afterChildId?: string,
    variantHint?: string
  ) => void;
  updateContentBlock: (
    sectionId: string,
    childId: string,
    updater: (block: ContentBlock) => ContentBlock
  ) => void;
  moveContentBlock: (sectionId: string, childId: string, direction: 'up' | 'down') => void;
  duplicateContentBlock: (sectionId: string, childId: string) => void;
  deleteContentBlock: (sectionId: string, childId: string) => void;

  // Universal Drag-and-Drop Handlers (drop onto root index OR inside any container)
  handleDropAtRootIndex: (targetRootIndex: number, payload?: DragPayload | null) => void;
  handleDropIntoContainer: (
    targetSectionId: string,
    targetChildIndex?: number,
    payload?: DragPayload | null
  ) => void;

  updateImageSlotById: (slotId: string, patch: Partial<ImageSlotData>) => void;

  saveTemplate: (name: string, payload: SectionContainerBlock | ContentBlock) => void;
  deleteTemplate: (id: string) => void;

  addCustomAsset: (
    name: string,
    category: CustomAssetCategory,
    url: string
  ) => CustomAssetItem;
  deleteCustomAsset: (id: string) => void;

  createNewDocument: (mode: 'grey_template' | 'blank' | 'clone_current', openImmediately?: boolean) => void;
  duplicateDocumentById: (docId: string) => void;
  toggleDocumentStatus: (docId: string) => void;
  renameDocument: (docId: string, title: string, issueNumber?: string) => void;
  importDocumentJson: (doc: BulletinDocument) => void;
  switchDocument: (docId: string) => void;
  deleteDocument: (docId: string) => void;
}

const CUSTOM_ASSETS_KEY = 'buletincms_custom_assets_v1';

const extractExistingAssetsFromDocs = (
  docs: BulletinDocument[]
): CustomAssetItem[] => {
  const seenUrls = new Set<string>();
  const collected: CustomAssetItem[] = [];
  const add = (name: string, category: CustomAssetCategory, url?: string | null) => {
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    collected.push({
      id: uid('asset'),
      name,
      category,
      url,
      createdAt: new Date().toISOString(),
    });
  };

  for (const doc of docs) {
    for (const rb of doc.rootBlocks) {
      if (rb.type === 'section_container') {
        add(`[${rb.sectionNumber || 'Sec'}] Badge`, 'badge', rb.badgeCustomUrl);
        add(`[${rb.sectionNumber || 'Sec'}] Bullet`, 'bullet', rb.bulletCustomUrl);
        add(`[${rb.sectionNumber || 'Sec'}] Bg`, 'background', rb.bgImage?.url);
        add(`[${rb.sectionNumber || 'Sec'}] Sticker`, 'sticker', rb.cornerStickerUrl);
        for (const cb of rb.children) {
          if (cb.type === 'bullet_list_block') {
            add('List Bullet Icon', 'bullet', cb.customBulletUrl);
          }
        }
      }
    }
    const walkSlots = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if ('aspectRatio' in node && 'focalPoint' in node) {
        if (node.frameOverlayUrl) {
          add('Photo Frame Overlay', 'frame', node.frameOverlayUrl);
        }
        if (node.url) {
          add(node.label || 'Uploaded Photo', 'photo', node.url);
        }
        return;
      }
      for (const k of Object.keys(node)) {
        if (Array.isArray(node[k])) node[k].forEach(walkSlots);
        else if (typeof node[k] === 'object') walkSlots(node[k]);
      }
    };
    walkSlots(doc.rootBlocks);
  }
  return collected;
};

const loadCustomAssets = (docs: BulletinDocument[]): CustomAssetItem[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_ASSETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as CustomAssetItem[];
      }
    }
  } catch (e) {
    console.warn('Failed to load custom assets:', e);
  }
  const initialExtracted = extractExistingAssetsFromDocs(docs);
  try {
    localStorage.setItem(CUSTOM_ASSETS_KEY, JSON.stringify(initialExtracted));
  } catch {
    // ignore quota errors
  }
  return initialExtracted;
};

const persistCustomAssets = (assets: CustomAssetItem[]) => {
  try {
    localStorage.setItem(CUSTOM_ASSETS_KEY, JSON.stringify(assets));
  } catch (e) {
    console.warn('Could not persist custom assets to localStorage:', e);
  }
};

const loadInitialState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.documents) && parsed.documents.length > 0) {
        const docs = parsed.documents as BulletinDocument[];
        // Auto-upgrade empty placeholder slots with demo photos for optimal display
        docs.forEach((doc) => {
          doc.rootBlocks.forEach((rb) => {
            if (rb.type === 'masthead' && !rb.heroImage.url) {
              rb.heroImage.url = '/demo/hero_industrial_park.jpg';
              rb.heroImage.label = '莫罗瓦利产业基地全景';
            }
            if (rb.type === 'section_container') {
              rb.children.forEach((cb) => {
                if (cb.type === 'split_media_text') {
                  if (cb.images[0] && !cb.images[0].url) {
                    cb.images[0].url = '/demo/csr_community_event.jpg';
                    cb.images[0].label = '社区交流活动';
                  }
                  if (cb.images[1] && !cb.images[1].url) {
                    cb.images[1].url = '/demo/csr_community_support.jpg';
                    cb.images[1].label = '基础设施共建';
                  }
                }
                if (cb.type === 'dated_event_block') {
                  cb.images.forEach((img, i) => {
                    if (!img.url) {
                      img.url = '/demo/employee_team_sports.jpg';
                      img.label = `员工风采 0${i + 1}`;
                    }
                  });
                }
              });
            }
            if (rb.type === 'footer_banner' && !rb.bannerImage.url) {
              rb.bannerImage.url = '/demo/hero_industrial_park.jpg';
              rb.bannerImage.label = '产业基地全景';
            }
          });
        });
        return {
          documents: docs,
          activeDocId: parsed.activeDocId || docs[0].id,
          savedTemplates: (parsed.savedTemplates || []) as SavedTemplate[],
          customAssets: loadCustomAssets(docs),
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
  }
  const initialDoc = createDefaultGreyBulletin();
  return {
    documents: [initialDoc],
    activeDocId: initialDoc.id,
    savedTemplates: [] as SavedTemplate[],
    customAssets: loadCustomAssets([initialDoc]),
  };
};

const persistState = (
  documents: BulletinDocument[],
  activeDocId: string,
  savedTemplates: SavedTemplate[]
) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ documents, activeDocId, savedTemplates })
    );
  } catch (e) {
    console.warn('Could not persist state to localStorage:', e);
  }
};

const initial = loadInitialState();

export const useBulletinStore = create<BulletinState>((set, get) => {
  const commitDocUpdate = (nextDoc: BulletinDocument) => {
    const state = get();
    const currentDoc = state.getActiveDoc();
    const nextDocs = state.documents.map((d) => (d.id === nextDoc.id ? nextDoc : d));
    const nextPast = [...state.past.slice(-29), currentDoc];
    persistState(nextDocs, state.activeDocId, state.savedTemplates);
    set({
      documents: nextDocs,
      past: nextPast,
      future: [],
    });
  };

  const materializeRootFromLibrary = (
    factory: Extract<DragPayload, { source: 'library_root' }>['rootFactory'],
    doc: BulletinDocument
  ): RootBlock => {
    const existingCount = doc.rootBlocks.filter(
      (b) => b.type === 'section_container' && b.showHeader !== false
    ).length;

    switch (factory) {
      case 'numbered_section':
        return createSectionContainer(
          String(existingCount + 1),
          '新建章节模块',
          'grey_wireframe',
          [createContentBlock('simple_text_block')]
        );
      case 'simple_header_section':
        return createSectionContainer(
          '',
          '极简无编号标题容器',
          'grey_wireframe',
          [createContentBlock('simple_text_block')],
          { showHeader: true, showBadge: false }
        );
      case 'blank_container':
        return createBlankContainer('freeform_asset_block');
      case 'masthead':
        return createMastheadBlock();
      case 'highlights_bar':
        return createHighlightsBarBlock();
      case 'footer_banner':
        return createFooterBannerBlock();
    }
  };

  const initialLang: AppLang =
    (typeof window !== 'undefined' &&
      (localStorage.getItem('buletincms_lang') as AppLang)) === 'en'
      ? 'en'
      : 'zh';

  return {
    lang: initialLang,
    setLang: (lang) => {
      try {
        localStorage.setItem('buletincms_lang', lang);
      } catch {}
      set({ lang });
    },
    currentView: 'home',
    setCurrentView: (view) => set({ currentView: view }),
    openDocumentInEditor: (docId) => {
      const state = get();
      const target = state.documents.find((d) => d.id === docId);
      if (!target) return;
      persistState(state.documents, docId, state.savedTemplates);
      set({
        activeDocId: docId,
        currentView: 'editor',
        previewMode: false,
        past: [],
        future: [],
        selectedRootBlockId: target.rootBlocks[0]?.id || null,
        selectedChildBlockId: null,
        selectedImageSlotId: null,
      });
    },

    documents: initial.documents,
    activeDocId: initial.activeDocId,
    savedTemplates: initial.savedTemplates,
    customAssets: initial.customAssets,
    customFonts: (() => {
      try {
        const stored = localStorage.getItem('buletincms_fonts');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    })(),

    addCustomFont: (font) => {
      set((prev) => {
        const next = [font, ...prev.customFonts.filter((f) => f.family !== font.family)];
        try {
          localStorage.setItem('buletincms_fonts', JSON.stringify(next));
        } catch {}
        return { customFonts: next };
      });
    },
    past: [],
    future: [],
    selectedRootBlockId: initial.documents[0]?.rootBlocks[2]?.id || null,
    selectedChildBlockId: null,
    selectedImageSlotId: null,
    previewMode: false,
    zoomPercent: 100,
    activeDrag: null,

    setActiveDrag: (payload) => set({ activeDrag: payload }),

    getActiveDoc: () => {
      const state = get();
      return (
        state.documents.find((d) => d.id === state.activeDocId) || state.documents[0]
      );
    },

    selectBlock: (rootBlockId, childBlockId = null) =>
      set({
        selectedRootBlockId: rootBlockId,
        selectedChildBlockId: childBlockId,
        selectedImageSlotId: null,
      }),

    selectImageSlot: (slotId, rootBlockId, childBlockId) =>
      set((s) => ({
        selectedImageSlotId: slotId,
        selectedRootBlockId:
          rootBlockId !== undefined ? rootBlockId : s.selectedRootBlockId,
        selectedChildBlockId:
          childBlockId !== undefined ? childBlockId : s.selectedChildBlockId,
      })),

    setPreviewMode: (preview) =>
      set({
        previewMode: preview,
        selectedImageSlotId: preview ? null : get().selectedImageSlotId,
      }),

    setZoomPercent: (zoom) => set({ zoomPercent: Math.min(150, Math.max(60, zoom)) }),

    updateDocumentMeta: (patch) => {
      const doc = get().getActiveDoc();
      commitDocUpdate({
        ...doc,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
    },

    applyAllGreyWireframeTheme: () => {
      const doc = get().getActiveDoc();
      const nextRoot = doc.rootBlocks.map((b) => {
        if (b.type === 'section_container') {
          return {
            ...b,
            theme: { ...SECTION_THEMES.grey_wireframe },
          };
        }
        if (b.type === 'masthead') {
          return { ...b, accentColor: '#3f3f46' };
        }
        if (b.type === 'highlights_bar') {
          return {
            ...b,
            items: b.items.map((it, idx) => ({
              ...it,
              bgColor: idx === 0 ? '#3f3f46' : idx === 1 ? '#52525b' : '#71717a',
            })),
          };
        }
        return b;
      });
      commitDocUpdate({
        ...doc,
        rootBlocks: nextRoot,
        updatedAt: new Date().toISOString(),
      });
    },

    applySampleColorPalettes: () => {
      const doc = get().getActiveDoc();
      const paletteCycle = [
        SECTION_THEMES.corporate_blue,
        SECTION_THEMES.sky_cyan,
        SECTION_THEMES.emerald_green,
        SECTION_THEMES.corporate_blue,
        SECTION_THEMES.corporate_blue,
      ];
      let secIdx = 0;
      const nextRoot = doc.rootBlocks.map((b) => {
        if (b.type === 'section_container') {
          const theme = paletteCycle[secIdx % paletteCycle.length];
          secIdx++;
          return {
            ...b,
            theme: { ...theme },
          };
        }
        if (b.type === 'masthead') {
          return { ...b, accentColor: '#1e3a8a' };
        }
        if (b.type === 'highlights_bar') {
          const colors = ['#1e3a8a', '#0369a1', '#0284c7'];
          return {
            ...b,
            items: b.items.map((it, idx) => ({
              ...it,
              bgColor: colors[idx % colors.length],
            })),
          };
        }
        return b;
      });
      commitDocUpdate({
        ...doc,
        wireframeMode: false,
        rootBlocks: nextRoot,
        updatedAt: new Date().toISOString(),
      });
    },

    undo: () => {
      const state = get();
      if (state.past.length === 0) return;
      const previous = state.past[state.past.length - 1];
      const current = state.getActiveDoc();
      const nextDocs = state.documents.map((d) =>
        d.id === previous.id ? previous : d
      );
      persistState(nextDocs, state.activeDocId, state.savedTemplates);
      set({
        documents: nextDocs,
        past: state.past.slice(0, -1),
        future: [current, ...state.future],
      });
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) return;
      const next = state.future[0];
      const current = state.getActiveDoc();
      const nextDocs = state.documents.map((d) => (d.id === next.id ? next : d));
      persistState(nextDocs, state.activeDocId, state.savedTemplates);
      set({
        documents: nextDocs,
        past: [...state.past, current],
        future: state.future.slice(1),
      });
    },

    insertRootBlock: (block, afterRootId) => {
      const doc = get().getActiveDoc();
      const targetId = afterRootId || get().selectedRootBlockId;
      const list = [...doc.rootBlocks];

      if (targetId) {
        const idx = list.findIndex((b) => b.id === targetId);
        if (idx !== -1) {
          list.splice(idx + 1, 0, block);
        } else {
          list.push(block);
        }
      } else {
        const footerIdx = list.findIndex((b) => b.type === 'footer_banner');
        if (footerIdx !== -1 && block.type !== 'footer_banner') {
          list.splice(footerIdx, 0, block);
        } else {
          list.push(block);
        }
      }

      commitDocUpdate({
        ...doc,
        rootBlocks: list,
        updatedAt: new Date().toISOString(),
      });
      set({
        selectedRootBlockId: block.id,
        selectedChildBlockId: null,
        selectedImageSlotId: null,
      });
    },

    updateRootBlock: (rootId, updater) => {
      const doc = get().getActiveDoc();
      const nextRoot = doc.rootBlocks.map((b) => (b.id === rootId ? updater(b) : b));
      commitDocUpdate({
        ...doc,
        rootBlocks: nextRoot,
        updatedAt: new Date().toISOString(),
      });
    },

    moveRootBlock: (rootId, direction) => {
      const doc = get().getActiveDoc();
      const list = [...doc.rootBlocks];
      const idx = list.findIndex((b) => b.id === rootId);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return;
      const [item] = list.splice(idx, 1);
      list.splice(targetIdx, 0, item);
      commitDocUpdate({
        ...doc,
        rootBlocks: list,
        updatedAt: new Date().toISOString(),
      });
    },

    duplicateRootBlock: (rootId) => {
      const doc = get().getActiveDoc();
      const list = [...doc.rootBlocks];
      const idx = list.findIndex((b) => b.id === rootId);
      if (idx === -1) return;
      const cloned = cloneWithNewIds(list[idx]);
      if (cloned.type === 'section_container' && cloned.sectionNumber) {
        const nextNum = parseInt(cloned.sectionNumber, 10);
        if (!isNaN(nextNum)) {
          cloned.sectionNumber = String(nextNum + 1);
        }
      }
      list.splice(idx + 1, 0, cloned);
      commitDocUpdate({
        ...doc,
        rootBlocks: list,
        updatedAt: new Date().toISOString(),
      });
      set({
        selectedRootBlockId: cloned.id,
        selectedChildBlockId: null,
      });
    },

    deleteRootBlock: (rootId) => {
      const doc = get().getActiveDoc();
      const list = doc.rootBlocks.filter((b) => b.id !== rootId);
      commitDocUpdate({
        ...doc,
        rootBlocks: list,
        updatedAt: new Date().toISOString(),
      });
      if (get().selectedRootBlockId === rootId) {
        set({
          selectedRootBlockId: list[0]?.id || null,
          selectedChildBlockId: null,
          selectedImageSlotId: null,
        });
      }
    },

    insertContentBlock: (blockOrType, targetSectionId, afterChildId, variantHint) => {
      const state = get();
      const doc = state.getActiveDoc();
      const newBlock: ContentBlock =
        typeof blockOrType === 'string'
          ? createContentBlock(blockOrType, variantHint)
          : cloneWithNewIds(blockOrType);

      let sectionId = targetSectionId || state.selectedRootBlockId;
      let targetSection = doc.rootBlocks.find(
        (b): b is SectionContainerBlock =>
          b.id === sectionId && b.type === 'section_container'
      );

      if (!targetSection) {
        targetSection = doc.rootBlocks.find(
          (b): b is SectionContainerBlock => b.type === 'section_container'
        );
      }

      if (!targetSection) {
        const newSection = createBlankContainer();
        newSection.children = [newBlock];
        state.insertRootBlock(newSection);
        set({
          selectedRootBlockId: newSection.id,
          selectedChildBlockId: newBlock.id,
        });
        return;
      }

      const insertAfter = afterChildId || state.selectedChildBlockId;
      const nextChildren = [...targetSection.children];
      if (insertAfter) {
        const idx = nextChildren.findIndex((c) => c.id === insertAfter);
        if (idx !== -1) {
          nextChildren.splice(idx + 1, 0, newBlock);
        } else {
          nextChildren.push(newBlock);
        }
      } else {
        nextChildren.push(newBlock);
      }

      const nextRoot = doc.rootBlocks.map((b) =>
        b.id === targetSection!.id
          ? { ...targetSection!, children: nextChildren }
          : b
      );

      commitDocUpdate({
        ...doc,
        rootBlocks: nextRoot,
        updatedAt: new Date().toISOString(),
      });

      set({
        selectedRootBlockId: targetSection.id,
        selectedChildBlockId: newBlock.id,
        selectedImageSlotId: null,
      });
    },

    updateContentBlock: (sectionId, childId, updater) => {
      const doc = get().getActiveDoc();
      const nextRoot = doc.rootBlocks.map((b) => {
        if (b.id !== sectionId || b.type !== 'section_container') return b;
        return {
          ...b,
          children: b.children.map((c) => (c.id === childId ? updater(c) : c)),
        };
      });
      commitDocUpdate({
        ...doc,
        rootBlocks: nextRoot,
        updatedAt: new Date().toISOString(),
      });
    },

    moveContentBlock: (sectionId, childId, direction) => {
      const doc = get().getActiveDoc();
      const nextRoot = doc.rootBlocks.map((b) => {
        if (b.id !== sectionId || b.type !== 'section_container') return b;
        const list = [...b.children];
        const idx = list.findIndex((c) => c.id === childId);
        if (idx === -1) return b;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= list.length) return b;
        const [item] = list.splice(idx, 1);
        list.splice(targetIdx, 0, item);
        return { ...b, children: list };
      });
      commitDocUpdate({
        ...doc,
        rootBlocks: nextRoot,
        updatedAt: new Date().toISOString(),
      });
    },

    duplicateContentBlock: (sectionId, childId) => {
      const doc = get().getActiveDoc();
      let newChildId: string | null = null;
      const nextRoot = doc.rootBlocks.map((b) => {
        if (b.id !== sectionId || b.type !== 'section_container') return b;
        const list = [...b.children];
        const idx = list.findIndex((c) => c.id === childId);
        if (idx === -1) return b;
        const cloned = cloneWithNewIds(list[idx]);
        newChildId = cloned.id;
        list.splice(idx + 1, 0, cloned);
        return { ...b, children: list };
      });
      commitDocUpdate({
        ...doc,
        rootBlocks: nextRoot,
        updatedAt: new Date().toISOString(),
      });
      if (newChildId) {
        set({
          selectedRootBlockId: sectionId,
          selectedChildBlockId: newChildId,
        });
      }
    },

    deleteContentBlock: (sectionId, childId) => {
      const doc = get().getActiveDoc();
      const nextRoot = doc.rootBlocks.map((b) => {
        if (b.id !== sectionId || b.type !== 'section_container') return b;
        return {
          ...b,
          children: b.children.filter((c) => c.id !== childId),
        };
      });
      commitDocUpdate({
        ...doc,
        rootBlocks: nextRoot,
        updatedAt: new Date().toISOString(),
      });
      if (get().selectedChildBlockId === childId) {
        set({ selectedChildBlockId: null, selectedImageSlotId: null });
      }
    },

    // =========================================================
    // UNIVERSAL DRAG & DROP HANDLERS
    // =========================================================
    handleDropAtRootIndex: (targetRootIndex, explicitPayload) => {
      const state = get();
      const payload = explicitPayload || state.activeDrag;
      if (!payload) return;
      const doc = state.getActiveDoc();
      const nextRoot = [...doc.rootBlocks];

      if (payload.source === 'canvas_root') {
        const fromIdx = nextRoot.findIndex((b) => b.id === payload.rootBlockId);
        if (fromIdx === -1) return;
        const [moved] = nextRoot.splice(fromIdx, 1);
        const adjustedIdx = fromIdx < targetRootIndex ? targetRootIndex - 1 : targetRootIndex;
        nextRoot.splice(Math.max(0, Math.min(nextRoot.length, adjustedIdx)), 0, moved);
        commitDocUpdate({ ...doc, rootBlocks: nextRoot, updatedAt: new Date().toISOString() });
        set({ activeDrag: null, selectedRootBlockId: moved.id, selectedChildBlockId: null });
        return;
      }

      if (payload.source === 'canvas_child') {
        // Extract child from its source section and wrap it in a Blank Container at root level!
        let extracted: ContentBlock | null = null;
        const updatedRoots = nextRoot.map((b) => {
          if (b.id !== payload.sectionId || b.type !== 'section_container') return b;
          const child = b.children.find((c) => c.id === payload.childBlockId);
          if (child) extracted = child;
          return {
            ...b,
            children: b.children.filter((c) => c.id !== payload.childBlockId),
          };
        });
        if (!extracted) return;
        const wrapper = createBlankContainer();
        wrapper.children = [extracted];
        updatedRoots.splice(
          Math.max(0, Math.min(updatedRoots.length, targetRootIndex)),
          0,
          wrapper
        );
        commitDocUpdate({
          ...doc,
          rootBlocks: updatedRoots,
          updatedAt: new Date().toISOString(),
        });
        set({
          activeDrag: null,
          selectedRootBlockId: wrapper.id,
          selectedChildBlockId: (extracted as ContentBlock).id,
        });
        return;
      }

      if (payload.source === 'library_root') {
        const newRoot = materializeRootFromLibrary(payload.rootFactory, doc);
        nextRoot.splice(Math.max(0, Math.min(nextRoot.length, targetRootIndex)), 0, newRoot);
        commitDocUpdate({ ...doc, rootBlocks: nextRoot, updatedAt: new Date().toISOString() });
        set({ activeDrag: null, selectedRootBlockId: newRoot.id, selectedChildBlockId: null });
        return;
      }

      if (payload.source === 'library_child') {
        // Wrap library child block in a Blank Container if dropped directly on root canvas
        const newChild = createContentBlock(payload.blockType, payload.variantHint);
        const wrapper = createBlankContainer();
        wrapper.children = [newChild];
        nextRoot.splice(Math.max(0, Math.min(nextRoot.length, targetRootIndex)), 0, wrapper);
        commitDocUpdate({ ...doc, rootBlocks: nextRoot, updatedAt: new Date().toISOString() });
        set({
          activeDrag: null,
          selectedRootBlockId: wrapper.id,
          selectedChildBlockId: newChild.id,
        });
        return;
      }

      if (payload.source === 'library_template') {
        const tpl = state.savedTemplates.find((t) => t.id === payload.templateId);
        if (!tpl) return;
        if (tpl.category === 'section') {
          const clonedSec = cloneWithNewIds(tpl.payload as SectionContainerBlock);
          nextRoot.splice(Math.max(0, Math.min(nextRoot.length, targetRootIndex)), 0, clonedSec);
          commitDocUpdate({ ...doc, rootBlocks: nextRoot, updatedAt: new Date().toISOString() });
          set({ activeDrag: null, selectedRootBlockId: clonedSec.id, selectedChildBlockId: null });
        } else {
          const clonedBlk = cloneWithNewIds(tpl.payload as ContentBlock);
          const wrapper = createBlankContainer();
          wrapper.children = [clonedBlk];
          nextRoot.splice(Math.max(0, Math.min(nextRoot.length, targetRootIndex)), 0, wrapper);
          commitDocUpdate({ ...doc, rootBlocks: nextRoot, updatedAt: new Date().toISOString() });
          set({
            activeDrag: null,
            selectedRootBlockId: wrapper.id,
            selectedChildBlockId: clonedBlk.id,
          });
        }
      }
    },

    handleDropIntoContainer: (targetSectionId, targetChildIndex, explicitPayload) => {
      const state = get();
      const payload = explicitPayload || state.activeDrag;
      if (!payload) return;
      const doc = state.getActiveDoc();

      const targetSection = doc.rootBlocks.find(
        (b): b is SectionContainerBlock =>
          b.id === targetSectionId && b.type === 'section_container'
      );
      if (!targetSection) return;

      // Case 1: Moving an inner content block (from same section OR another section container)
      if (payload.source === 'canvas_child') {
        let movedBlock: ContentBlock | null = null;
        let sourceChildIdx = -1;

        const intermediateRoots = doc.rootBlocks.map((b) => {
          if (b.id !== payload.sectionId || b.type !== 'section_container') return b;
          const idx = b.children.findIndex((c) => c.id === payload.childBlockId);
          if (idx !== -1) {
            sourceChildIdx = idx;
            movedBlock = b.children[idx];
          }
          return {
            ...b,
            children: b.children.filter((c) => c.id !== payload.childBlockId),
          };
        });

        if (!movedBlock) return;

        const finalRoots = intermediateRoots.map((b) => {
          if (b.id !== targetSectionId || b.type !== 'section_container') return b;
          const nextChildren = [...b.children];
          let insertIdx =
            targetChildIndex !== undefined ? targetChildIndex : nextChildren.length;
          if (
            payload.sectionId === targetSectionId &&
            sourceChildIdx !== -1 &&
            sourceChildIdx < insertIdx
          ) {
            insertIdx -= 1;
          }
          nextChildren.splice(
            Math.max(0, Math.min(nextChildren.length, insertIdx)),
            0,
            movedBlock!
          );
          return { ...b, children: nextChildren };
        });

        commitDocUpdate({
          ...doc,
          rootBlocks: finalRoots,
          updatedAt: new Date().toISOString(),
        });
        set({
          activeDrag: null,
          selectedRootBlockId: targetSectionId,
          selectedChildBlockId: (movedBlock as ContentBlock).id,
        });
        return;
      }

      // Case 2: Dropping a new ContentBlock from Left Library into this container
      if (payload.source === 'library_child') {
        const newBlock = createContentBlock(payload.blockType, payload.variantHint);
        const nextRoots = doc.rootBlocks.map((b) => {
          if (b.id !== targetSectionId || b.type !== 'section_container') return b;
          const nextChildren = [...b.children];
          const insertIdx =
            targetChildIndex !== undefined ? targetChildIndex : nextChildren.length;
          nextChildren.splice(
            Math.max(0, Math.min(nextChildren.length, insertIdx)),
            0,
            newBlock
          );
          return { ...b, children: nextChildren };
        });

        commitDocUpdate({
          ...doc,
          rootBlocks: nextRoots,
          updatedAt: new Date().toISOString(),
        });
        set({
          activeDrag: null,
          selectedRootBlockId: targetSectionId,
          selectedChildBlockId: newBlock.id,
        });
        return;
      }

      // Case 3: Dropping another Section Container onto this Section Container -> merge its children here!
      if (payload.source === 'canvas_root' && payload.rootBlockId !== targetSectionId) {
        const sourceRoot = doc.rootBlocks.find((b) => b.id === payload.rootBlockId);
        if (sourceRoot && sourceRoot.type === 'section_container') {
          const movedChildren = [...sourceRoot.children];
          const nextRoots = doc.rootBlocks
            .filter((b) => b.id !== payload.rootBlockId)
            .map((b) => {
              if (b.id !== targetSectionId || b.type !== 'section_container') return b;
              const nextChildren = [...b.children];
              const insertIdx =
                targetChildIndex !== undefined ? targetChildIndex : nextChildren.length;
              nextChildren.splice(insertIdx, 0, ...movedChildren);
              return { ...b, children: nextChildren };
            });

          commitDocUpdate({
            ...doc,
            rootBlocks: nextRoots,
            updatedAt: new Date().toISOString(),
          });
          set({
            activeDrag: null,
            selectedRootBlockId: targetSectionId,
            selectedChildBlockId: movedChildren[0]?.id || null,
          });
          return;
        } else if (sourceRoot) {
          // Reorder root block right after targetSectionId
          const targetIdx = doc.rootBlocks.findIndex((b) => b.id === targetSectionId);
          if (targetIdx !== -1) {
            state.handleDropAtRootIndex(targetIdx + 1, payload);
          }
          return;
        }
      }

      // Case 4: Dropping a Library Section/Frame into a container -> either add its inner blocks or insert section below
      if (payload.source === 'library_root') {
        const newRoot = materializeRootFromLibrary(payload.rootFactory, doc);
        if (newRoot.type === 'section_container') {
          const targetIdx = doc.rootBlocks.findIndex((b) => b.id === targetSectionId);
          state.handleDropAtRootIndex(targetIdx + 1, payload);
        } else {
          const targetIdx = doc.rootBlocks.findIndex((b) => b.id === targetSectionId);
          state.handleDropAtRootIndex(targetIdx + 1, payload);
        }
        return;
      }

      // Case 5: Dropping a Saved Template into a container
      if (payload.source === 'library_template') {
        const tpl = state.savedTemplates.find((t) => t.id === payload.templateId);
        if (!tpl) return;
        const blocksToInsert: ContentBlock[] =
          tpl.category === 'section'
            ? cloneWithNewIds((tpl.payload as SectionContainerBlock).children)
            : [cloneWithNewIds(tpl.payload as ContentBlock)];

        const nextRoots = doc.rootBlocks.map((b) => {
          if (b.id !== targetSectionId || b.type !== 'section_container') return b;
          const nextChildren = [...b.children];
          const insertIdx =
            targetChildIndex !== undefined ? targetChildIndex : nextChildren.length;
          nextChildren.splice(insertIdx, 0, ...blocksToInsert);
          return { ...b, children: nextChildren };
        });

        commitDocUpdate({
          ...doc,
          rootBlocks: nextRoots,
          updatedAt: new Date().toISOString(),
        });
        set({
          activeDrag: null,
          selectedRootBlockId: targetSectionId,
          selectedChildBlockId: blocksToInsert[0]?.id || null,
        });
      }
    },

    updateImageSlotById: (slotId, patch) => {
      const doc = get().getActiveDoc();
      const nextDoc = updateImageInDocument(doc, slotId, patch);
      commitDocUpdate(nextDoc);
      if (patch.url) {
        get().addCustomAsset('Photo Asset', 'photo', patch.url);
      }
      if (patch.frameOverlayUrl) {
        get().addCustomAsset('Frame PNG', 'frame', patch.frameOverlayUrl);
      }
    },

    saveTemplate: (name, payload) => {
      const state = get();
      const category = payload.type === 'section_container' ? 'section' : 'block';
      const newTemplate: SavedTemplate = {
        id: uid('tpl'),
        name:
          name.trim() ||
          (category === 'section' ? '自定义章节模板' : '自定义图文组件'),
        category,
        createdAt: new Date().toISOString(),
        payload: cloneWithNewIds(payload),
      };
      const nextTemplates = [newTemplate, ...state.savedTemplates];
      persistState(state.documents, state.activeDocId, nextTemplates);
      set({ savedTemplates: nextTemplates });
    },

    deleteTemplate: (id) => {
      const state = get();
      const nextTemplates = state.savedTemplates.filter((t) => t.id !== id);
      persistState(state.documents, state.activeDocId, nextTemplates);
      set({ savedTemplates: nextTemplates });
    },

    addCustomAsset: (name, category, url) => {
      const state = get();
      const existing = state.customAssets.find((a) => a.url === url);
      if (existing) {
        return existing;
      }
      const newAsset: CustomAssetItem = {
        id: uid('asset'),
        name: name.trim() || 'Custom Asset',
        category,
        url,
        createdAt: new Date().toISOString(),
      };
      const nextAssets = [newAsset, ...state.customAssets];
      persistCustomAssets(nextAssets);
      set({ customAssets: nextAssets });
      return newAsset;
    },

    deleteCustomAsset: (id) => {
      const state = get();
      const nextAssets = state.customAssets.filter((a) => a.id !== id);
      persistCustomAssets(nextAssets);
      set({ customAssets: nextAssets });
    },

    createNewDocument: (mode, openImmediately = true) => {
      const state = get();
      let newDoc: BulletinDocument;
      if (mode === 'clone_current') {
        const current = state.getActiveDoc();
        newDoc = cloneWithNewIds(current);
        newDoc.title = `${current.title} (副本)`;
        newDoc.status = 'draft';
        newDoc.updatedAt = new Date().toISOString();
      } else if (mode === 'blank') {
        newDoc = {
          id: uid('doc'),
          title: '未命名自由排版简报',
          issueNumber: new Date().toISOString().slice(0, 7),
          status: 'draft',
          canvasWidth: 480,
          wireframeMode: false,
          showGridGuides: false,
          updatedAt: new Date().toISOString(),
          rootBlocks: [],
        };
      } else {
        newDoc = createDefaultGreyBulletin();
        newDoc.status = 'draft';
      }

      const nextDocs = [newDoc, ...state.documents];
      persistState(nextDocs, newDoc.id, state.savedTemplates);
      set({
        documents: nextDocs,
        activeDocId: newDoc.id,
        currentView: openImmediately ? 'editor' : state.currentView,
        past: [],
        future: [],
        selectedRootBlockId: newDoc.rootBlocks[0]?.id || null,
        selectedChildBlockId: null,
        selectedImageSlotId: null,
      });
    },

    duplicateDocumentById: (docId) => {
      const state = get();
      const target = state.documents.find((d) => d.id === docId);
      if (!target) return;
      const cloned = cloneWithNewIds(target);
      cloned.title = `${target.title} (副本)`;
      cloned.status = 'draft';
      cloned.updatedAt = new Date().toISOString();
      const nextDocs = [cloned, ...state.documents];
      persistState(nextDocs, state.activeDocId, state.savedTemplates);
      set({ documents: nextDocs });
    },

    toggleDocumentStatus: (docId) => {
      const state = get();
      const nextDocs = state.documents.map((d) => {
        if (d.id !== docId) return d;
        const nextStatus: 'draft' | 'published' =
          d.status === 'published' ? 'draft' : 'published';
        return {
          ...d,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
      });
      persistState(nextDocs, state.activeDocId, state.savedTemplates);
      set({ documents: nextDocs });
    },

    renameDocument: (docId, title, issueNumber) => {
      const state = get();
      const nextDocs = state.documents.map((d) => {
        if (d.id !== docId) return d;
        return {
          ...d,
          title: title.trim() || d.title,
          issueNumber: issueNumber !== undefined ? issueNumber : d.issueNumber,
          updatedAt: new Date().toISOString(),
        };
      });
      persistState(nextDocs, state.activeDocId, state.savedTemplates);
      set({ documents: nextDocs });
    },

    importDocumentJson: (importedDoc) => {
      const state = get();
      const cleanDoc = cloneWithNewIds(importedDoc);
      cleanDoc.updatedAt = new Date().toISOString();
      const nextDocs = [cleanDoc, ...state.documents];
      persistState(nextDocs, cleanDoc.id, state.savedTemplates);
      set({
        documents: nextDocs,
        activeDocId: cleanDoc.id,
      });
    },

    switchDocument: (docId) => {
      const state = get();
      const target = state.documents.find((d) => d.id === docId);
      if (!target) return;
      persistState(state.documents, docId, state.savedTemplates);
      set({
        activeDocId: docId,
        past: [],
        future: [],
        selectedRootBlockId: target.rootBlocks[0]?.id || null,
        selectedChildBlockId: null,
        selectedImageSlotId: null,
      });
    },

    deleteDocument: (docId) => {
      const state = get();
      if (state.documents.length <= 1) return;
      const nextDocs = state.documents.filter((d) => d.id !== docId);
      const nextActiveId =
        state.activeDocId === docId ? nextDocs[0].id : state.activeDocId;
      persistState(nextDocs, nextActiveId, state.savedTemplates);
      set({
        documents: nextDocs,
        activeDocId: nextActiveId,
        past: [],
        future: [],
      });
    },
  };
});
