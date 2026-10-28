export type AspectRatioType = 'free' | '16:9' | '4:3' | '3:2' | '1:1' | '3:4';

export type BulletShapeType =
  | 'square'
  | 'circle'
  | 'diamond'
  | 'ring'
  | 'bar'
  | 'arrow'
  | 'star'
  | 'custom';

export type BadgeShapeType =
  | 'rounded_square'
  | 'circle'
  | 'pill'
  | 'diamond'
  | 'flower'
  | 'hexagon'
  | 'outline'
  | 'custom_only';

export type ContainerPatternType =
  | 'solid'
  | 'gradient'
  | 'dots'
  | 'grid'
  | 'stripes';

export type ContainerBorderStyleType =
  | 'none'
  | 'solid'
  | 'dashed'
  | 'double'
  | 'top_thick';

export interface ImageSlotData {
  id: string;
  url: string | null; // null renders structural grey placeholder
  label?: string;     // Wireframe placeholder label
  aspectRatio: AspectRatioType;
  zoom: number;       // 1.0 to 3.0
  focalPoint: { x: number; y: number }; // 0 to 100 (%)

  // Photo Frame Customization
  frameRadius?: number; // Custom border-radius in px (0 to 999)
  frameBorderWidth?: number; // 0 to 8px
  frameBorderColor?: string;
  frameBorderStyle?: 'solid' | 'dashed' | 'double';
  frameMatPadding?: number; // Inner photo mat padding (0 to 14px, like a Polaroid/card frame)
  frameMatColor?: string;
  frameShadow?: 'none' | 'sm' | 'md' | 'hard';
  frameOverlayUrl?: string | null; // Custom uploaded frame asset (behind, mask, or in front of the photo frame)
  frameAssetLayer?: 'behind' | 'front' | 'mask'; // Default 'behind'
  frameAssetScale?: number; // 0.5 to 2.5 (default 1)
  frameAssetX?: number; // -50 to 50 (%)
  frameAssetY?: number; // -50 to 50 (%)

  // Frame Sizing & Alignment
  frameWidthMode?: 'full' | '75%' | '50%' | 'custom_px' | 'custom_pct';
  frameCustomWidthPx?: number;  // 80 to 800 px
  frameCustomWidthPct?: number; // 20 to 100 %
  frameHeightMode?: 'aspect' | 'custom_px'; // 'aspect' keeps ratio, 'custom_px' fixes height in px
  frameCustomHeightPx?: number; // 60 to 800 px
  frameAlign?: 'left' | 'center' | 'right';
}

export interface SectionTheme {
  id: string;
  name: string;
  primaryColor: string;    // Header badge, square bullets, KPI numbers, date text
  headerTextColor: string; // Badge text color
  containerBg: string;     // Outer section box background
  containerBorder: string; // Outer section box border
  cardBg: string;          // Inner block card background
  textColor: string;       // Main paragraph text color
  mutedTextColor: string;  // Secondary/caption text color
}

// ==========================================
// 1. GLOBAL / ROOT LEVEL BLOCKS
// ==========================================

export interface MastheadBlock {
  id: string;
  type: 'masthead';
  showTopBar?: boolean;
  orgNameLeft: string;
  issueMetaRight: string;
  showHeroOverlay?: boolean;
  heroTitleEn: string;
  heroTitleMain: string;
  heroImage: ImageSlotData;
  showSubBanner?: boolean;
  subBannerLeft: string;
  subBannerRight: string;
  subBannerDesc: string;
  showSubBannerDesc?: boolean;
  accentColor: string;
}

export interface HighlightCardItem {
  id: string;
  title: string;
  subtitle: string;
  showSubtitle?: boolean;
  image: ImageSlotData;
  bgColor: string;
}

export interface HighlightsBarBlock {
  id: string;
  type: 'highlights_bar';
  showHeading?: boolean;
  heading: string;
  showBullet: boolean;
  columns: 1 | 2 | 3 | 4;
  items: HighlightCardItem[];
}

export interface FooterBannerBlock {
  id: string;
  type: 'footer_banner';
  showOverlayText?: boolean;
  showBrandLabel?: boolean;
  showSloganMain?: boolean;
  showSloganSub?: boolean;
  sloganMain: string;
  sloganSub: string;
  brandLabel: string;
  bannerImage: ImageSlotData;
}

// ==========================================
// 2. INNER SECTION CONTENT BLOCKS
// ==========================================

export interface IntroQuoteBoxBlock {
  id: string;
  type: 'intro_quote_box';
  text: string;
  borderStyle: 'dashed' | 'solid' | 'none';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textIndent?: string; // e.g. '0px' | '1em' | '2em' | '3em' | '4em'
  lineHeight?: number;
  letterSpacing?: string;
  paddingX?: number;
  paddingY?: number;
}

export interface SimpleTextBlock {
  id: string;
  type: 'simple_text_block';
  showBullet: boolean;
  showHeading: boolean;
  heading: string;
  showBody: boolean;
  bodyText: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textIndent?: string;
  lineHeight?: number;
  letterSpacing?: string;
  bodyPaddingLeft?: number;
}

export interface FreeformAssetBlock {
  id: string;
  type: 'freeform_asset_block';
  image: ImageSlotData;
  padding: 'none' | 'sm' | 'md';
  bordered: boolean;
  showCaption: boolean;
  caption: string;
}

export interface CustomColumnItem {
  id: string;
  showImage: boolean;
  image: ImageSlotData;
  showKpi: boolean;
  kpiValue: string;
  kpiUnit: string;
  showBullet: boolean;
  showHeading: boolean;
  heading: string;
  showBody: boolean;
  bodyText: string;
}

export interface CustomColumnsBlock {
  id: string;
  type: 'custom_columns_block';
  columns: 1 | 2 | 3 | 4;
  columnRatio: 'equal' | '30:70' | '70:30' | '40:60' | '60:40';
  gap: 'sm' | 'md' | 'lg';
  cardStyle: 'plain' | 'white_card' | 'bordered';
  imageAspectRatio: AspectRatioType;
  items: CustomColumnItem[];
}

export type PhotoLayoutPreset =
  | 'auto'
  | '1_col'
  | '2_cols'
  | '3_cols'
  | '4_cols'
  | '2x2'
  | '3_plus_1'
  | '1_plus_3'
  | '2_plus_1'
  | '1_plus_2'
  | '3_plus_2'
  | '2_plus_3'
  | '4_plus_1'
  | '1_plus_4'
  | '3x2'
  | '2x3'
  | '4_plus_2'
  | '2_plus_4'
  | '4_plus_3'
  | '3_plus_4'
  | '4x2'
  | '3_plus_3_plus_2'
  | '3x3'
  | 'stacked';

export interface DatedEventBlock {
  id: string;
  type: 'dated_event_block';
  showDate: boolean;
  dateText: string;
  showBullet: boolean;
  showHeading?: boolean;
  heading: string;
  showBody?: boolean;
  bodyText: string;
  showImages?: boolean;
  textPosition: 'above_images' | 'below_images';
  gridColumns: 1 | 2 | 3 | 4;
  imageAspectRatio: AspectRatioType;
  images: ImageSlotData[];
  layoutPreset?: PhotoLayoutPreset;
  fitLastToMargin?: boolean;
}

export interface SplitMediaTextBlock {
  id: string;
  type: 'split_media_text';
  layout: 'text_left' | 'text_right';
  textWidthRatio: '45:55' | '50:50' | '60:40';
  showBullet: boolean;
  showHeading?: boolean;
  heading: string;
  showBody?: boolean;
  bodyText: string;
  imageCount: 1 | 2;
  imageLayout: 'side_by_side' | 'stacked';
  imageAspectRatio: AspectRatioType;
  images: ImageSlotData[];
}

export interface TwoColumnCardItem {
  id: string;
  showBullet: boolean;
  showHeading?: boolean;
  heading: string;
  bodyText: string;
  showBody: boolean;
  showImage?: boolean;
  image: ImageSlotData;
}

export interface TwoColumnCardsBlock {
  id: string;
  type: 'two_column_cards';
  imageAspectRatio: AspectRatioType;
  textPosition: 'top' | 'bottom' | 'title_top_body_bottom';
  leftCard: TwoColumnCardItem;
  rightCard: TwoColumnCardItem;
}

export interface KpiStatItem {
  id: string;
  value: string;
  unit: string;
  showUnit?: boolean;
  showDescription?: boolean;
  description: string;
}

export interface KpiStatRowBlock {
  id: string;
  type: 'kpi_stat_row';
  showLeadMetric: boolean;
  leadValue: string;
  leadUnit: string;
  showLeadBullet?: boolean;
  showLeadHeading?: boolean;
  leadHeading: string;
  showLeadDescription?: boolean;
  leadDescription: string;
  showSubHeading: boolean;
  subHeading: string;
  columns: 1 | 2 | 3 | 4;
  items: KpiStatItem[];
}

export interface KpiBannerCardBlock {
  id: string;
  type: 'kpi_banner_card';
  variant: 'split_metric_photos' | 'centered_big_metric' | 'banner_strip';
  showMetricLabel?: boolean;
  metricLabel: string;
  metricValue: string;
  showMetricUnit?: boolean;
  metricUnit: string;
  showSubDescription?: boolean;
  subDescription: string;
  showImages?: boolean;
  images: ImageSlotData[];
}

export interface BulletListBlock {
  id: string;
  type: 'bullet_list_block';
  groupTitle: string;
  showGroupTitle: boolean;
  showBullets?: boolean;
  listStyleMode?: 'inherit_bullet' | 'numbered_badge' | 'card_rows' | 'custom_icon';
  customBulletUrl?: string | null;
  items: Array<{ id: string; text: string }>;
}

export interface ShowcaseItem {
  id: string;
  showImage?: boolean;
  showTitle?: boolean;
  title: string;
  showSubtitle?: boolean;
  subtitle: string;
  image: ImageSlotData;
}

export interface FeatureCalloutGridBlock {
  id: string;
  type: 'feature_callout_grid';
  showBullet: boolean;
  showHeading?: boolean;
  heading: string;
  columns: 2 | 3 | 4;
  imageShape: 'circle' | 'rounded';
  items: ShowcaseItem[];
  showFooterNote?: boolean;
  footerNote: string;
}

export type ContentBlock =
  | IntroQuoteBoxBlock
  | SimpleTextBlock
  | FreeformAssetBlock
  | CustomColumnsBlock
  | DatedEventBlock
  | SplitMediaTextBlock
  | TwoColumnCardsBlock
  | KpiStatRowBlock
  | KpiBannerCardBlock
  | BulletListBlock
  | FeatureCalloutGridBlock;

// ==========================================
// 3. SECTION / BLANK CONTAINER
// ==========================================

export interface SectionContainerBlock {
  id: string;
  type: 'section_container';
  showHeader?: boolean;  // false = Blank Container (无标题空白容器)
  showBadge?: boolean;   // false = Title only without number badge
  sectionNumber: string; // "1", "2", "3", "4", "5"
  title: string;         // e.g., "公共关系篇"
  theme: SectionTheme;
  padding: 'none' | 'sm' | 'md' | 'lg';
  customPadding?: number; // Custom padding in px (manual value)
  borderRadius: number;  // Custom radius in px (presets 0, 10, 16 or manual value)
  bordered?: boolean;
  bgImage?: ImageSlotData; // Optional background picture asset for the container

  // 1. Section Number Badge Customization (Screenshot 3)
  badgeShape?: BadgeShapeType;
  badgeCustomUrl?: string | null; // Custom uploaded badge background/icon PNG/SVG
  badgeSize?: number; // 22 to 44px
  badgeAssetScale?: number; // 0.5 to 2.5 (default 1)
  badgeAssetX?: number; // -30 to 30 px (default 0)
  badgeAssetY?: number; // -30 to 30 px (default 0)
  badgeTextColor?: string; // Optional override color for number text on custom badge
  headerDivider?: 'solid' | 'dashed' | 'double' | 'thick_accent' | 'none';

  // 2. Bullet Point Icon Customization (Screenshot 2)
  bulletShape?: BulletShapeType;
  bulletCustomUrl?: string | null; // Custom uploaded bullet point icon PNG/SVG
  bulletSize?: number; // 8 to 20px
  bulletAssetScale?: number; // 0.5 to 2.5 (default 1)
  bulletAssetX?: number; // -15 to 15 px (default 0)
  bulletAssetY?: number; // -15 to 15 px (default 0)

  // 3. Container Background & Border Design
  bgPattern?: ContainerPatternType;
  bgGradientEnd?: string;
  bgImageFit?: 'cover' | 'contain' | 'repeat' | 'top_banner';
  bgImageOpacity?: number; // 0.1 to 1.0
  borderStyle?: ContainerBorderStyleType;
  borderWidth?: number; // 1 to 6px
  cornerStickerUrl?: string | null; // Optional decorative corner sticker PNG

  children: ContentBlock[];
}

export type RootBlock =
  | MastheadBlock
  | HighlightsBarBlock
  | SectionContainerBlock
  | FooterBannerBlock;

export interface BulletinDocument {
  id: string;
  title: string;
  issueNumber: string;
  status?: 'draft' | 'published';
  canvasWidth: number;
  fontFamily?: string;
  wireframeMode: boolean;
  showGridGuides: boolean;
  rootBlocks: RootBlock[];
  updatedAt: string;
}

export interface CustomFontItem {
  id: string;
  name: string;
  family: string;
  source: 'preset' | 'custom';
  url?: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  category: 'section' | 'block';
  createdAt: string;
  payload: SectionContainerBlock | ContentBlock;
}

export type CustomAssetCategory =
  | 'photo'
  | 'frame'
  | 'badge'
  | 'bullet'
  | 'background'
  | 'sticker';

export interface CustomAssetItem {
  id: string;
  name: string;
  category: CustomAssetCategory;
  url: string;
  createdAt: string;
}

