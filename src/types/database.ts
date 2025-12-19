// src/types/database.ts

export interface CatalogSign {
  id: number;
  mhd_code: string;
  mhd_code_sub: string | null;
  mhd_code_2003: string | null;
  thompson_code: string | null;
  thompson_variant: string | null;
  zender_code: string | null;
  kettunen_code: string | null;
  kettunen_1999: string | null;
  gronemeyer_code: string | null;
  logographic_value: string | null;
  logographic_cvc: string | null;
  syllabic_value: string | null;
  english_translation: string | null;
  word_class: string | null;
  calendrical_name: string | null;
  picture_description: string | null;
  volume: string | null;
  technique: string | null;
  distribution: string | null;
  primary_image_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Block {
  id: number;
  mhd_block_id: string;
  artifact_code: string;
  surface_page: string | null;
  orientation_frame: string | null;
  coordinate: string | null;
  block_logosyll: string | null;
  block_hyphenated: string | null;
  block_maya1: string | null;
  block_maya2: string | null;
  block_english: string | null;
  block_graphcodes: string | null;
  event_calendar: string | null;
  event_long_count: string | null;
  event_260_day: string | null;
  event_365_day: string | null;
  region_origin: string | null;
  site_origin: string | null;
  region_dest: string | null;
  site_dest: string | null;
  person_code: string | null;
  scribe: string | null;
  material: string | null;
  technique: string | null;
  artifact_type: string | null;
  object_description: string | null;
  semantic_context: string | null;
  notes: string | null;
  block_image1_url: string | null;
  block_image2_url: string | null;
  image_notes: string | null;
  sort_order: number | null;
  created_at: string;
}

export interface Grapheme {
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
}

export interface RoboflowInstance {
  id: number;
  catalog_sign_id: number | null;
  class_name: string;
  image_url: string;
  bounding_box: string | null;
  confidence: number | null;
  source_image_id: string | null;
  dataset_name: string;
  created_at: string;
}

export interface Source {
  id: number;
  name: string;
  short_code: string;
  base_url: string;
  requires_login: boolean;
}

// Helper types for search/filters
export interface CatalogSearchResult extends CatalogSign {
  grapheme_count?: number;
  roboflow_count?: number;
}

export interface SearchFilters {
  query: string;
  source_type?: string;
  artifact_code?: string;
  location?: string;
  word_class?: string;
}
