import {
  AspectRatioType,
  BulletinDocument,
  ContentBlock,
  CustomColumnItem,
  FooterBannerBlock,
  HighlightsBarBlock,
  ImageSlotData,
  MastheadBlock,
  SectionContainerBlock,
  SectionTheme,
} from '../types/bulletin';

export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36).slice(-4)}`;

export const DEMO_PHOTOS = [
  '/demo/hero_industrial_park.jpg',
  '/demo/csr_community_event.jpg',
  '/demo/csr_community_support.jpg',
  '/demo/employee_team_sports.jpg',
];

let photoCycle = 0;
export const getNextDemoPhoto = () => {
  const p = DEMO_PHOTOS[photoCycle % DEMO_PHOTOS.length];
  photoCycle++;
  return p;
};

export const createImageSlot = (
  aspectRatio: AspectRatioType = '4:3',
  label = 'IMAGE SLOT',
  url: string | null = null
): ImageSlotData => ({
  id: uid('img'),
  url: url || getNextDemoPhoto(),
  label,
  aspectRatio,
  zoom: 1,
  focalPoint: { x: 50, y: 50 },
});

export const SECTION_THEMES: Record<string, SectionTheme> = {
  grey_wireframe: {
    id: 'grey_wireframe',
    name: 'Structural Grey (Default)',
    primaryColor: '#3f3f46',    // zinc-700
    headerTextColor: '#ffffff',
    containerBg: '#f4f4f5',     // zinc-100
    containerBorder: '#d4d4d8', // zinc-300
    cardBg: '#ffffff',
    textColor: '#27272a',       // zinc-800
    mutedTextColor: '#52525b',  // zinc-600
  },
  pure_white_frame: {
    id: 'pure_white_frame',
    name: 'Clean White Frame',
    primaryColor: '#27272a',
    headerTextColor: '#ffffff',
    containerBg: '#ffffff',
    containerBorder: '#e4e4e7',
    cardBg: '#f4f4f5',
    textColor: '#18181b',
    mutedTextColor: '#52525b',
  },
  grey_soft: {
    id: 'grey_soft',
    name: 'Warm Stone Grey',
    primaryColor: '#57534e',    // stone-600
    headerTextColor: '#ffffff',
    containerBg: '#e7e5e4',     // stone-200
    containerBorder: '#d6d3d1',
    cardBg: '#fafaf9',
    textColor: '#292524',
    mutedTextColor: '#57534e',
  },
  corporate_blue: {
    id: 'corporate_blue',
    name: 'Industrial Blue',
    primaryColor: '#1d4ed8',    // blue-700
    headerTextColor: '#ffffff',
    containerBg: '#eff6ff',     // blue-50
    containerBorder: '#bfdbfe',
    cardBg: '#ffffff',
    textColor: '#1e293b',
    mutedTextColor: '#475569',
  },
  sky_cyan: {
    id: 'sky_cyan',
    name: 'Activity Cyan',
    primaryColor: '#0284c7',    // sky-600
    headerTextColor: '#ffffff',
    containerBg: '#e0f2fe',     // sky-100
    containerBorder: '#bae6fd',
    cardBg: '#ffffff',
    textColor: '#0f172a',
    mutedTextColor: '#334155',
  },
  emerald_green: {
    id: 'emerald_green',
    name: 'Logistics Green',
    primaryColor: '#15803d',    // green-700
    headerTextColor: '#ffffff',
    containerBg: '#f0fdf4',     // green-50
    containerBorder: '#bbf7d0',
    cardBg: '#ffffff',
    textColor: '#14532d',
    mutedTextColor: '#3f6212',
  },
  warm_amber: {
    id: 'warm_amber',
    name: 'Highlight Amber',
    primaryColor: '#b45309',    // amber-700
    headerTextColor: '#ffffff',
    containerBg: '#fef3c7',     // amber-100
    containerBorder: '#fde68a',
    cardBg: '#fffbeb',
    textColor: '#451a03',
    mutedTextColor: '#78350f',
  },
  rose_tint: {
    id: 'rose_tint',
    name: 'Event Rose',
    primaryColor: '#be123c',    // rose-700
    headerTextColor: '#ffffff',
    containerBg: '#ffe4e6',     // rose-100
    containerBorder: '#fecdd3',
    cardBg: '#ffffff',
    textColor: '#4c0519',
    mutedTextColor: '#881337',
  },
};

export const createCustomColumnItem = (index = 1): CustomColumnItem => ({
  id: uid('col'),
  showImage: true,
  image: createImageSlot('4:3', `COL 0${index} ASSET`),
  showKpi: false,
  kpiValue: '100',
  kpiUnit: '+',
  showBullet: true,
  showHeading: true,
  heading: `分栏标题 0${index}`,
  showBody: true,
  bodyText: '可自由编辑或点击右上角 × 删除不需要的标题、正文或图片。',
});

export const createContentBlock = (
  type: ContentBlock['type'],
  variantHint?: string
): ContentBlock => {
  switch (type) {
    case 'simple_text_block':
      return {
        id: uid('blk'),
        type: 'simple_text_block',
        showBullet: true,
        showHeading: variantHint !== 'body_only',
        heading: '独立小标题文本 (可单独隐藏正文或标题)',
        showBody: variantHint !== 'heading_only',
        bodyText: '这是一段极简文本段落组件，您可以自由保留标题、保留正文或删除方块符号。',
        textAlign: 'left',
      };

    case 'freeform_asset_block':
      return {
        id: uid('blk'),
        type: 'freeform_asset_block',
        image: createImageSlot('free', 'CUSTOM PICTURE / ASSET (自适应原图比例)'),
        padding: 'none',
        bordered: false,
        showCaption: false,
        caption: '图片底部说明文字（可隐藏）',
      };

    case 'custom_columns_block': {
      const colCount: 1 | 2 | 3 | 4 =
        variantHint === '1col'
          ? 1
          : variantHint === '3col'
          ? 3
          : variantHint === '4col'
          ? 4
          : 2;
      const isPurePhotoRow = variantHint === 'pure_photos';
      return {
        id: uid('blk'),
        type: 'custom_columns_block',
        columns: colCount,
        columnRatio: 'equal',
        gap: 'md',
        cardStyle: 'plain',
        imageAspectRatio: '4:3',
        items: Array.from({ length: colCount }, (_, idx) => ({
          ...createCustomColumnItem(idx + 1),
          showHeading: !isPurePhotoRow,
          showBullet: !isPurePhotoRow,
          showBody: !isPurePhotoRow,
        })),
      };
    }

    case 'intro_quote_box':
      return {
        id: uid('blk'),
        type: 'intro_quote_box',
        text: '围绕园区文化建设与核心工作目标，持续开展多元化基层活动，凝聚团队合力，营造积极向上的园区氛围。',
        borderStyle: 'dashed',
        textAlign: 'left',
      };

    case 'dated_event_block':
      return {
        id: uid('blk'),
        type: 'dated_event_block',
        showDate: variantHint !== 'no_date',
        dateText: '8月15日',
        showBullet: true,
        showHeading: true,
        heading: '开展专项主题培训与现场交流活动',
        showBody: true,
        bodyText:
          '通过理论讲解与实操演练相结合的方式，全面提升员工业务技能与安全标准化意识，各部门积极参与并完成考核。',
        showImages: true,
        textPosition: 'above_images',
        gridColumns: 3,
        imageAspectRatio: '4:3',
        images: [
          createImageSlot('4:3', 'PHOTO 01'),
          createImageSlot('4:3', 'PHOTO 02'),
          createImageSlot('4:3', 'PHOTO 03'),
        ],
      };

    case 'split_media_text':
      return {
        id: uid('blk'),
        type: 'split_media_text',
        layout: variantHint === 'text_right' ? 'text_right' : 'text_left',
        textWidthRatio: '50:50',
        showBullet: true,
        showHeading: true,
        heading: '开展跨部门联合专项巡检与交流工作',
        showBody: true,
        bodyText:
          '深入现场一线排查运行隐患，针对重点区域建立标准化台账，确保各项基础设施平稳高效运行。',
        imageCount: variantHint === 'single_img' ? 1 : 2,
        imageLayout: 'side_by_side',
        imageAspectRatio: variantHint === 'single_img' ? '4:3' : '3:4',
        images: [
          createImageSlot(variantHint === 'single_img' ? '4:3' : '3:4', 'PHOTO 01'),
          createImageSlot('3:4', 'PHOTO 02'),
        ],
      };

    case 'two_column_cards':
      return {
        id: uid('blk'),
        type: 'two_column_cards',
        imageAspectRatio: '4:3',
        textPosition: 'title_top_body_bottom',
        leftCard: {
          id: uid('card'),
          showBullet: true,
          showHeading: true,
          heading: '园区基础设施升级改造',
          bodyText: '完成主干道与生活区配套设施施工，提升园区通行环境。',
          showBody: true,
          showImage: true,
          image: createImageSlot('4:3', 'LEFT PHOTO'),
        },
        rightCard: {
          id: uid('card'),
          showBullet: true,
          showHeading: true,
          heading: '公共区域设备定期维保',
          bodyText: '对重点公共服务设备进行全面检修与卫生标准化清洁。',
          showBody: true,
          showImage: true,
          image: createImageSlot('4:3', 'RIGHT PHOTO'),
        },
      };

    case 'kpi_stat_row':
      return {
        id: uid('blk'),
        type: 'kpi_stat_row',
        showLeadMetric: variantHint !== 'cards_only',
        leadValue: '7',
        leadUnit: '场',
        showLeadBullet: true,
        showLeadHeading: true,
        leadHeading: '重要公务接待与专题会议',
        showLeadDescription: true,
        leadDescription:
          '高效完成月度各项统筹接待与跨部门协调会务保障工作，确保流程规范有序。',
        showSubHeading: variantHint !== 'cards_only',
        subHeading: '月度核心数据通报',
        columns: 3,
        items: [
          {
            id: uid('kpi'),
            value: '14',
            unit: '条',
            showUnit: true,
            showDescription: true,
            description: '发布管理通报与标准化制度规范文件',
          },
          {
            id: uid('kpi'),
            value: '73',
            unit: '人次',
            showUnit: true,
            showDescription: true,
            description: '开展日常督导检查与专项考核覆盖',
          },
          {
            id: uid('kpi'),
            value: '3',
            unit: '项',
            showUnit: true,
            showDescription: true,
            description: '完成重点流程优化与数字化归档整改',
          },
        ],
      };

    case 'kpi_banner_card':
      return {
        id: uid('blk'),
        type: 'kpi_banner_card',
        variant:
          variantHint === 'centered'
            ? 'centered_big_metric'
            : 'split_metric_photos',
        showMetricLabel: true,
        metricLabel: '园区绿化养护移栽苗木',
        metricValue: '1500',
        showMetricUnit: true,
        metricUnit: '余棵',
        showSubDescription: true,
        subDescription: '中青新育苗木 16000 余株 · 持续改善园区生态环境',
        showImages: true,
        images: [
          createImageSlot('3:4', 'ACTION 01'),
          createImageSlot('3:4', 'ACTION 02'),
        ],
      };

    case 'bullet_list_block':
      return {
        id: uid('blk'),
        type: 'bullet_list_block',
        groupTitle: '重点专项推进事项',
        showGroupTitle: true,
        showBullets: true,
        items: [
          { id: uid('li'), text: '1. 完成园区生活区食堂档口升级与新菜品研发上线；' },
          { id: uid('li'), text: '2. 开展月度食品安全与后勤卫生联合大检查；' },
          { id: uid('li'), text: '3. 持续推进园区节能降耗与公共设施报修快速响应。' },
        ],
      };

    case 'feature_callout_grid':
      return {
        id: uid('blk'),
        type: 'feature_callout_grid',
        showBullet: true,
        showHeading: true,
        heading: '特色服务与新品展示',
        columns: 3,
        imageShape: 'circle',
        items: [
          {
            id: uid('item'),
            showImage: true,
            showTitle: true,
            title: '特色新品 A',
            showSubtitle: true,
            subtitle: '精选食材 · 匠心制作',
            image: createImageSlot('1:1', 'ITEM 01'),
          },
          {
            id: uid('item'),
            showImage: true,
            showTitle: true,
            title: '特色新品 B',
            showSubtitle: true,
            subtitle: '营养均衡 · 风味独特',
            image: createImageSlot('1:1', 'ITEM 02'),
          },
          {
            id: uid('item'),
            showImage: true,
            showTitle: true,
            title: '特色新品 C',
            showSubtitle: true,
            subtitle: '品质升级 · 广受好评',
            image: createImageSlot('1:1', 'ITEM 03'),
          },
        ],
        showFooterNote: true,
        footerNote: '持续倾听员工反馈，不断丰富日常餐饮与后勤服务品质。',
      };
  }
};

export const createSectionContainer = (
  sectionNumber = '1',
  title = '新建章节模块',
  themeKey: keyof typeof SECTION_THEMES = 'grey_wireframe',
  children: ContentBlock[] = [],
  options?: {
    showHeader?: boolean;
    showBadge?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    borderRadius?: number;
  }
): SectionContainerBlock => ({
  id: uid('sec'),
  type: 'section_container',
  showHeader: options?.showHeader ?? true,
  showBadge: options?.showBadge ?? true,
  sectionNumber,
  title,
  theme: { ...SECTION_THEMES[themeKey] },
  padding: options?.padding ?? 'md',
  borderRadius: options?.borderRadius ?? 10,
  bordered: true,
  bgImage: createImageSlot('free', 'CONTAINER BG ASSET (可选背景图)'),
  children:
    children.length > 0 ? children : [createContentBlock('simple_text_block')],
});

export const createBlankContainer = (
  initialChildType: ContentBlock['type'] = 'freeform_asset_block',
  variantHint?: string
): SectionContainerBlock => ({
  id: uid('sec'),
  type: 'section_container',
  showHeader: false,
  showBadge: false,
  sectionNumber: '',
  title: '空白自由容器',
  theme: { ...SECTION_THEMES.grey_wireframe },
  padding: 'sm',
  borderRadius: 8,
  bordered: true,
  bgImage: createImageSlot('free', 'CONTAINER BG ASSET'),
  children: [createContentBlock(initialChildType, variantHint)],
});

export const createMastheadBlock = (): MastheadBlock => ({
  id: uid('masthead'),
  type: 'masthead',
  showTopBar: true,
  orgNameLeft: 'CNGR 中伟 · 园区简报',
  issueMetaRight: '2026年8月刊 · 总第12期',
  showHeroOverlay: true,
  heroTitleEn: 'INDUSTRIAL BASE MONTHLY BULLETIN',
  heroTitleMain: '莫罗瓦利产业基地',
  heroImage: createImageSlot('16:9', '产业基地大图', null),
  showSubBanner: true,
  subBannerLeft: '《基地月度工作简报》',
  subBannerRight: '2026年8月刊 · 第四期',
  subBannerDesc: '聚焦园区建设进展 · 展现一线团队风采 · 传递企业文化声音',
  showSubBannerDesc: true,
  accentColor: '#3f3f46',
});

export const createHighlightsBarBlock = (): HighlightsBarBlock => ({
  id: uid('highlights'),
  type: 'highlights_bar',
  showHeading: true,
  heading: '下月工作看点',
  showBullet: true,
  columns: 3,
  items: [
    {
      id: uid('hl'),
      title: '安全生产月度演练',
      subtitle: '筑牢园区安全防线',
      showSubtitle: true,
      image: createImageSlot('16:9', 'HIGHLIGHT 01'),
      bgColor: '#3f3f46',
    },
    {
      id: uid('hl'),
      title: '园区文化体育嘉年华',
      subtitle: '丰富员工业余生活',
      showSubtitle: true,
      image: createImageSlot('16:9', 'HIGHLIGHT 02'),
      bgColor: '#52525b',
    },
    {
      id: uid('hl'),
      title: '后勤餐饮品质升级',
      subtitle: '打造温馨生活家园',
      showSubtitle: true,
      image: createImageSlot('16:9', 'HIGHLIGHT 03'),
      bgColor: '#71717a',
    },
  ],
});

export const createFooterBannerBlock = (): FooterBannerBlock => ({
  id: uid('footer'),
  type: 'footer_banner',
  showOverlayText: true,
  showBrandLabel: true,
  showSloganMain: true,
  showSloganSub: true,
  brandLabel: 'CNGR 中伟股份',
  sloganMain: '矢志成为全球领先的新能源材料科学公司',
  sloganSub: '团结 · 务实 · 敬业 · 奋进',
  bannerImage: createImageSlot('16:9', '产业基地全景', '/demo/hero_industrial_park.jpg'),
});

export const createDefaultGreyBulletin = (): BulletinDocument => ({
  id: uid('doc'),
  title: '产业基地月度工作简报 (示范工程)',
  issueNumber: '2026-08',
  canvasWidth: 480,
  wireframeMode: false,
  showGridGuides: false,
  updatedAt: new Date().toISOString(),
  rootBlocks: [
    createMastheadBlock(),
    createHighlightsBarBlock(),

    // SECTION 1: 公共关系篇
    createSectionContainer('1', '公共关系篇', 'grey_wireframe', [
      {
        id: uid('blk'),
        type: 'split_media_text',
        layout: 'text_left',
        textWidthRatio: '50:50',
        showBullet: true,
        showHeading: true,
        heading: '开展周边社区交流与外部公共关系共建活动',
        showBody: true,
        bodyText:
          '积极履行企业社会责任，深入周边社区开展基础设施帮扶与联谊交流，持续深化政企互信与社区和谐共建关系，展现企业良好形象。',
        imageCount: 2,
        imageLayout: 'side_by_side',
        imageAspectRatio: '3:4',
        images: [
          createImageSlot('3:4', '社区交流活动', null),
          createImageSlot('3:4', '基础设施共建', null),
        ],
      },
    ]),

    // SECTION 2: 员工活动篇
    createSectionContainer('2', '员工活动篇', 'grey_wireframe', [
      {
        id: uid('blk'),
        type: 'intro_quote_box',
        text: '以人为本，凝聚团队向心力。本月围绕员工技能提升、文体娱乐及节日关怀开展系列活动，搭建跨部门沟通桥梁。',
        borderStyle: 'dashed',
        textAlign: 'left',
      },
      {
        id: uid('blk'),
        type: 'dated_event_block',
        showDate: true,
        dateText: '8月15日',
        showBullet: true,
        showHeading: true,
        heading: '开展专项技能培训与综合业务知识竞赛',
        showBody: true,
        bodyText:
          '组织多部门青年骨干开展专题培训与现场互动竞答，通过以赛促学的方式巩固业务基础。',
        showImages: true,
        textPosition: 'above_images',
        gridColumns: 3,
        imageAspectRatio: '4:3',
        images: [
          createImageSlot('4:3', 'EVENT 08-15 A'),
          createImageSlot('4:3', 'EVENT 08-15 B'),
          createImageSlot('4:3', 'EVENT 08-15 C'),
        ],
      },
      {
        id: uid('blk'),
        type: 'dated_event_block',
        showDate: true,
        dateText: '8月21日',
        showBullet: true,
        showHeading: true,
        heading: '举办园区员工拔河比赛与团队拓展活动',
        showBody: true,
        bodyText:
          '各部门代表队齐聚赛场、奋勇争先，现场呐喊助威声此起彼伏，充分展现了员工团结拼搏的精神风貌。',
        showImages: true,
        textPosition: 'below_images',
        gridColumns: 3,
        imageAspectRatio: '4:3',
        images: [
          createImageSlot('4:3', '拔河比赛与团队拓展', null),
          createImageSlot('4:3', '员工交流晚会', null),
          createImageSlot('4:3', '文体嘉年华', null),
        ],
      },
      {
        id: uid('blk'),
        type: 'dated_event_block',
        showDate: true,
        dateText: '8月22日',
        showBullet: true,
        showHeading: true,
        heading: '开展文体联赛颁奖仪式暨员工交流晚会',
        showBody: true,
        bodyText:
          '对月度表现优异的团队及个人予以表彰，促进中外籍员工文化融合与跨部门默契配合。',
        showImages: true,
        textPosition: 'below_images',
        gridColumns: 2,
        imageAspectRatio: '16:9',
        images: [
          createImageSlot('16:9', 'EVENT 08-22 A'),
          createImageSlot('16:9', 'EVENT 08-22 B'),
        ],
      },
    ]),

    // SECTION 3: 后勤服务篇
    createSectionContainer('3', '后勤服务篇', 'grey_wireframe', [
      {
        id: uid('blk'),
        type: 'kpi_banner_card',
        variant: 'split_metric_photos',
        showMetricLabel: true,
        metricLabel: '园区绿化移栽养护苗木',
        metricValue: '1500',
        showMetricUnit: true,
        metricUnit: '余棵',
        showSubDescription: true,
        subDescription: '中青新育苗木 16000 余株 · 打造绿色生态园区',
        showImages: true,
        images: [
          createImageSlot('3:4', 'GREENING 01'),
          createImageSlot('3:4', 'GREENING 02'),
        ],
      },
      createContentBlock('bullet_list_block'),
      createContentBlock('feature_callout_grid'),
      {
        id: uid('blk'),
        type: 'two_column_cards',
        imageAspectRatio: '4:3',
        textPosition: 'title_top_body_bottom',
        leftCard: {
          id: uid('c1'),
          showBullet: true,
          showHeading: true,
          heading: '宿舍区配套设施巡检维护',
          bodyText: '完成住宿楼栋公共区域照明及给排水管网集中排查整治。',
          showBody: false,
          showImage: true,
          image: createImageSlot('4:3', 'FACILITY 01'),
        },
        rightCard: {
          id: uid('c2'),
          showBullet: true,
          showHeading: true,
          heading: '园区环境卫生与消杀保障',
          bodyText: '定期开展公共区域防疫消杀与垃圾分类清运工作。',
          showBody: false,
          showImage: true,
          image: createImageSlot('4:3', 'FACILITY 02'),
        },
      },
      {
        id: uid('blk'),
        type: 'two_column_cards',
        imageAspectRatio: '4:3',
        textPosition: 'title_top_body_bottom',
        leftCard: {
          id: uid('c3'),
          showBullet: true,
          showHeading: true,
          heading: '生活区走廊文化与导视升级',
          bodyText: '',
          showBody: false,
          showImage: true,
          image: createImageSlot('4:3', 'FACILITY 03'),
        },
        rightCard: {
          id: uid('c4'),
          showBullet: true,
          showHeading: true,
          heading: '直饮水设备滤芯更换与水质检测',
          bodyText: '',
          showBody: false,
          showImage: true,
          image: createImageSlot('4:3', 'FACILITY 04'),
        },
      },
    ]),

    // SECTION 4: 行政管理篇
    createSectionContainer('4', '行政管理篇', 'grey_wireframe', [
      createContentBlock('kpi_stat_row'),
    ]),

    // SECTION 5: 数字赋能篇
    createSectionContainer('5', '数字赋能篇', 'grey_wireframe', [
      {
        id: uid('blk'),
        type: 'split_media_text',
        layout: 'text_left',
        textWidthRatio: '50:50',
        showBullet: true,
        showHeading: true,
        heading: '机房核心网络与弱电基础设施优化',
        showBody: true,
        bodyText:
          '完成核心交换机链路冗余配置与机房动环监控巡检，大幅提升园区办公网与生产专网稳定性。',
        imageCount: 2,
        imageLayout: 'side_by_side',
        imageAspectRatio: '4:3',
        images: [
          createImageSlot('4:3', 'IT WORK 01'),
          createImageSlot('4:3', 'IT WORK 02'),
        ],
      },
      {
        id: uid('blk'),
        type: 'dated_event_block',
        showDate: false,
        dateText: '',
        showBullet: true,
        showHeading: true,
        heading: '园区安防监控点位扩充与智能运维',
        showBody: true,
        bodyText:
          '新增重点厂区周界高清监控点位，实现全天候可视化安全巡检与异常告警联动。',
        showImages: true,
        textPosition: 'above_images',
        gridColumns: 2,
        imageAspectRatio: '4:3',
        images: [
          createImageSlot('4:3', 'CCTV 01'),
          createImageSlot('4:3', 'CCTV 02'),
        ],
      },
      {
        id: uid('blk'),
        type: 'two_column_cards',
        imageAspectRatio: '4:3',
        textPosition: 'title_top_body_bottom',
        leftCard: {
          id: uid('it1'),
          showBullet: true,
          showHeading: true,
          heading: '能耗数据采集看板上线',
          bodyText: '打通底层仪表数据，实现生产与生活能耗实时监测分析。',
          showBody: true,
          showImage: true,
          image: createImageSlot('4:3', 'DASHBOARD'),
        },
        rightCard: {
          id: uid('it2'),
          showBullet: true,
          showHeading: true,
          heading: '数字化移动办公培训推广',
          bodyText: '面向一线班组开展线上审批流与电子表单实操指导。',
          showBody: true,
          showImage: true,
          image: createImageSlot('4:3', 'TRAINING'),
        },
      },
    ]),

    createFooterBannerBlock(),
  ],
});
