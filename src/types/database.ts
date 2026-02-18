// src/types/database.ts

export interface CatalogSign {
  id: number;
  graphcode: string | null;
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
  bonn_sign_number: number | null;
  bonn_confidence: number | null;
  bonn_image_url: string | null;
  variant_code: string | null;
  phonetic_value: string | null;
  base_thompson_number: number | null;
  former_mhd_code: string | null;
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
  region: string | null;
  site_name: string | null;
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
  image_url: string | null;
  site_code: string | null;
  latitude: number | null;
  longitude: number | null;
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
  image_url: string;
  bbox_x: number | null;
  bbox_y: number | null;
  bbox_width: number | null;
  bbox_height: number | null;
  segmentation_mask: string | null;
  confidence: number | null;
  dataset_split: string | null;
  created_at: string;
}

export interface Source {
  id: number;
  name: string;
  short_code: string;
  base_url: string;
  requires_login: boolean;
}
