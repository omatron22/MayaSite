// Database table interfaces matching our schema

export interface Sign {
  id: number;
  bonn_id: string | null;
  thompson_id: string | null;
  mhd_id: string | null;
  phonetic_value: string | null;
  description: string | null;
  primary_image_url: string | null;
  created_at: string;
}

export interface SignInstance {
  id: number;
  sign_id: number;
  source_type: 'mhd' | 'kerr' | 'cmhi' | 'roboflow';
  source_id: string;
  source_url: string;
  image_url: string | null;
  date_start: number | null;
  date_end: number | null;
  location: string | null;
  artifact_type: string | null;
  notes: string | null;
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
export interface SignSearchResult extends Sign {
  instance_count: number;
}

export interface SearchFilters {
  query: string;
  source_type?: string;
  date_start?: number;
  date_end?: number;
  location?: string;
}
