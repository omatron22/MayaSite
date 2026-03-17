import type { CatalogSign, Block } from '../../src/types/database.js';

// Search
export type ViewMode = 'signs' | 'blocks' | 'graphemes';

export interface SearchParams {
  mode: ViewMode;
  q?: string;
  page?: number;
  pageSize?: number;
  // Sign filters
  volume?: string;
  wordClass?: string;
  technique?: string;
  distribution?: string;
  hasImage?: boolean;
  hasRoboflow?: boolean;
  hasInstances?: boolean;
  hasTranslation?: boolean;
  sortBy?: 'code' | 'frequency' | 'completeness';
  // Block/Grapheme filters
  region?: string;
  artifact?: string;
  site?: string;
  hasDate?: boolean;
}

export interface SearchResponse {
  results: SignSearchResult[] | BlockSearchResult[] | GraphemeSearchResult[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SignSearchResult extends CatalogSign {
  display_code: string;
  grapheme_count: number;
  roboflow_count: number;
}

export interface BlockSearchResult {
  id: number;
  block_id: string;
  artifact_code: string;
  block_maya1: string | null;
  block_english: string | null;
  event_calendar: string | null;
  block_img: string | null;
  region: string | null;
  site_name: string | null;
}

export interface GraphemeSearchResult {
  id: number;
  block_id: number;
  catalog_sign_id: number | null;
  grapheme_code: string;
  grapheme_logosyll: string | null;
  grapheme_hyphenated: string | null;
  grapheme_maya: string | null;
  grapheme_english: string | null;
  artifact_code: string | null;
  location_summary: string | null;
  block_maya1: string | null;
  block_english: string | null;
  event_calendar: string | null;
  block_img: string | null;
  region: string | null;
  site_name: string | null;
  mhd_code_sub: string | null;
  syllabic_value: string | null;
  primary_image_url: string | null;
}

// Sign detail
export interface SignDetailResponse {
  sign: CatalogSign;
  graphemes: SignGrapheme[];
  roboflow: SignRoboflowInstance[];
  crossRefs: SignDetailCrossRef[];
  graphs: SignDetailGraph[];
}

export interface SignGrapheme {
  id: number;
  block_id: number | null;
  grapheme_code: string;
  block_english: string | null;
  block_maya1: string | null;
  block_logosyll: string | null;
  artifact_code: string | null;
  event_calendar: string | null;
  event_long_count: string | null;
  event_gregorian: string | null;
  site_name: string | null;
  region: string | null;
  semantic_context: string | null;
  mhd_block_id: string | null;
  coordinate: string | null;
  surface_page: string | null;
  orientation_frame: string | null;
  block_img: string | null;
}

export interface SignRoboflowInstance {
  id: number;
  image_url: string;
  bbox_x: number | null;
  bbox_y: number | null;
  bbox_width: number | null;
  bbox_height: number | null;
  confidence: number | null;
  dataset_split: string | null;
}

// Block detail
export interface BlockDetailResponse {
  block: Block;
  graphemes: BlockGrapheme[];
  signSlots: BlockSignSlotDetail[];
  prevBlock: { id: number; coordinate: string } | null;
  nextBlock: { id: number; coordinate: string } | null;
}

export interface BlockGrapheme {
  id: number;
  grapheme_code: string;
  grapheme_logosyll: string | null;
  grapheme_hyphenated: string | null;
  grapheme_maya: string | null;
  grapheme_english: string | null;
  artifact_code: string | null;
  location_summary: string | null;
  graphcode: string | null;
  primary_image_url: string | null;
  syllabic_value: string | null;
  english_translation: string | null;
  catalog_sign_id: number | null;
}

// Grapheme detail
export interface GraphemeDetailResponse {
  id: number;
  block_id: number;
  catalog_sign_id: number | null;
  grapheme_code: string;
  grapheme_logosyll: string | null;
  grapheme_hyphenated: string | null;
  grapheme_maya: string | null;
  grapheme_english: string | null;
  artifact_code: string | null;
  location_summary: string | null;
  // Block fields
  mhd_block_id: string | null;
  block_maya1: string | null;
  block_english: string | null;
  event_calendar: string | null;
  event_long_count: string | null;
  surface_page: string | null;
  region: string | null;
  site_name: string | null;
  // Catalog sign fields
  graphcode: string | null;
  primary_image_url: string | null;
  mhd_code: string | null;
  mhd_code_sub: string | null;
  mhd_code_2003: string | null;
  thompson_code: string | null;
  thompson_variant: string | null;
  zender_code: string | null;
  kettunen_code: string | null;
  gronemeyer_code: string | null;
  syllabic_value: string | null;
  logographic_value: string | null;
  logographic_cvc: string | null;
  english_translation: string | null;
  word_class: string | null;
  sign_technique: string | null;
  distribution: string | null;
  picture_description: string | null;
  bonn_sign_number: number | null;
  bonn_confidence: number | null;
  bonn_image_url: string | null;
}

// Stats
export interface StatsResponse {
  totalSigns: number;
  signsWithImages: number;
  totalBlocks: number;
  totalGraphemes: number;
  totalRoboflow: number;
  totalKerr: number;
  totalCmhiDrawings: number;
  totalCmhiPhotos: number;
  graphemesLinkedToCatalog: number;
  blocksWithDates: number;
  blocksWithTranslations: number;
  thompsonCoverage: number;
  zenderCoverage: number;
  kettunenCoverage: number;
  gronemeyerCoverage: number;
  bonnImageCoverage: number;
  signsByRegion: Record<string, number>;
  topSites: Array<{ site: string; count: number }>;
  // Concordance stats
  entriesPerCatalog?: Record<string, number>;
  totalConcordanceLinks?: number;
  totalBlockSignSlots?: number;
  totalGraphs?: number;
  correspondenceBreakdown?: Record<string, number>;
  mhdVariants?: number;
  mhdParents?: number;
  slotCertaintyBreakdown?: Record<string, number>;
  blocksWithGregorian?: number;
}

// Analytics
export type AnalyticsDataSource = 'mhd' | 'roboflow' | 'both';

export interface AnalyticsParams {
  source: AnalyticsDataSource;
  period?: string;
  region?: string;
}

export interface AnalyticsInstance {
  id: string;
  sign: string;
  syllabic: string;
  imageUrl: string;
  longCount: string;
  year: number | null;
  region: string;
  site: string;
  period: string;
  source: 'mhd' | 'roboflow';
}

export interface AnalyticsResponse {
  data: AnalyticsInstance[];
  total: number;
}

// Inference
export interface InferencePrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

export interface InferenceResponse {
  predictions: InferencePrediction[];
  image: { width: number; height: number };
}

// Sign lookup
export interface SignLookupEntry {
  id: number;
  display_code: string;
  primary_image_url: string | null;
}

export interface SignLookupResponse {
  signs: Record<string, SignLookupEntry>;
}

// Concordance architecture types
export interface CatalogEntryRow {
  entry_id: string;
  catalog: string;
  catalog_code: string;
  parent_entry: string | null;
  variant_code: string | null;
  reading_value: string | null;
  reading_type: string | null;
  gloss_english: string | null;
  gloss_mayan: string | null;
  part_of_speech: string | null;
  confidence_level: number | null;
  function_variant: string | null;
  image_url: string | null;
  source_url: string | null;
  notes: string | null;
  legacy_catalog_sign_id: number | null;
}

export interface ConcordanceLinkRow {
  link_id: string;
  entry_a: string;
  entry_b: string;
  correspondence: 'exact' | 'approximate' | 'partial' | 'disputed';
  asserted_by: string | null;
  notes: string | null;
}

export interface GraphRow {
  graph_id: string;
  catalog_entry: string;
  variant_suffix: string | null;
  variant_type_label: string | null;
  medium: string | null;
  iconographic_tags: string | null;
  image_url: string | null;
  notes: string | null;
}

export interface BlockSignSlotRow {
  slot_id: string;
  block_id: number;
  slot_position: number;
  catalog_entry: string | null;
  certainty: 'certain' | 'uncertain' | 'eroded';
  position_in_block: string | null;
  graph: string | null;
  raw_code: string;
}

export interface NewConcordanceRow {
  entry_id: string;
  catalog: string;
  catalog_code: string;
  reading_value: string | null;
  reading_type: string | null;
  gloss_english: string | null;
  image_url: string | null;
  confidence_level: number | null;
  cross_references: {
    entry_id: string;
    catalog: string;
    catalog_code: string;
    correspondence: string;
  }[];
}

export interface NewConcordanceResponse {
  rows: NewConcordanceRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SignDetailCrossRef {
  entry_id: string;
  catalog: string;
  catalog_code: string;
  correspondence: string;
  asserted_by: string | null;
}

export interface SignDetailGraph {
  graph_id: string;
  variant_suffix: string | null;
  variant_type_label: string | null;
  medium: string | null;
  image_url: string | null;
  iconographic_tags: string[] | null;
  notes: string | null;
}

export interface BlockSignSlotDetail {
  slot_id: string;
  slot_position: number;
  certainty: string;
  position_in_block: string | null;
  raw_code: string;
  graph: string | null;
  entry_id: string | null;
  catalog_code: string | null;
  image_url: string | null;
  reading_value: string | null;
}

// Error
export interface ApiError {
  error: string;
  details?: string;
}
