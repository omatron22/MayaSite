export const REGION_COLORS: Record<string, string> = {
  'North': '#f59e0b',
  'East': '#3b82f6',
  'Central': '#10b981',
  'Usmacinta': '#06b6d4',
  'South': '#ec4899',
  'Unknown': '#6b7280',
  'Roboflow': '#a78bfa',
};

export const TIME_PERIODS = [
  { name: 'Early Preclassic', start: -2000, end: -1000, color: '#6b7280' },
  { name: 'Middle Preclassic', start: -1000, end: -400, color: '#78866b' },
  { name: 'Late Preclassic', start: -400, end: 100, color: '#94a344' },
  { name: 'Terminal Preclassic', start: 100, end: 250, color: '#b8b85f' },
  { name: 'Early Classic', start: 250, end: 550, color: '#d4c95d' },
  { name: 'Late Classic', start: 550, end: 830, color: '#e6d45c' },
  { name: 'Terminal Classic', start: 830, end: 950, color: '#f5a623' },
  { name: 'Early Postclassic', start: 950, end: 1200, color: '#d97d42' },
  { name: 'Late Postclassic', start: 1200, end: 1540, color: '#c46a3a' },
  { name: 'Invalid/Undated', start: 0, end: 0, color: '#4b5563' },
] as const;

export const REGIONS = ['North', 'East', 'Central', 'Usmacinta', 'South', 'Unknown'] as const;

export function getRegionColor(region: string): string {
  return REGION_COLORS[region] || REGION_COLORS['Unknown'];
}
