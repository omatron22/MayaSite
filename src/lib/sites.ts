// Maya archaeological site data
// Coordinates from academic sources and archaeological databases

type Region = 'North' | 'East' | 'Central' | 'Usmacinta' | 'South' | 'Unknown';

export interface Site {
  name: string;
  lat: number;
  lng: number;
  region: Region;
  country?: string;
  modernName?: string;
}

interface SiteData {
  lat: number;
  lng: number;
  region: Region;
  country?: string;
}

// Define each site ONCE
const SITES: Record<string, SiteData> = {
  'Calakmul': { lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'Madrid Codex': { lat: 20.0, lng: -89.0, region: 'North', country: 'Spain (Codex)' },
  'Dresden Codex': { lat: 20.0, lng: -89.0, region: 'North', country: 'Germany (Codex)' },
  'Paris Codex': { lat: 20.0, lng: -89.0, region: 'North', country: 'France (Codex)' },
  'Copan': { lat: 14.8403, lng: -89.1422, region: 'East', country: 'Honduras' },
  'Naranjo': { lat: 17.1667, lng: -89.2167, region: 'Central', country: 'Guatemala' },
  'Piedras Negras': { lat: 17.1500, lng: -91.0167, region: 'Usmacinta', country: 'Guatemala' },
  'Tonina': { lat: 16.9033, lng: -92.0108, region: 'Central', country: 'Mexico' },
  'Yaxchilan': { lat: 16.8989, lng: -91.0000, region: 'Usmacinta', country: 'Mexico' },
  'Palenque': { lat: 17.4839, lng: -92.0460, region: 'Usmacinta', country: 'Mexico' },
  'Tikal': { lat: 17.2221, lng: -89.6236, region: 'Central', country: 'Guatemala' },
  'Caracol': { lat: 16.7628, lng: -89.1156, region: 'East', country: 'Belize' },
  'Quirigua': { lat: 15.2728, lng: -89.0292, region: 'East', country: 'Guatemala' },
  'Coba': { lat: 20.4950, lng: -87.7344, region: 'North', country: 'Mexico' },
  'Dos Pilas': { lat: 16.5100, lng: -90.2200, region: 'Central', country: 'Guatemala' },
  'Pusila': { lat: 16.2167, lng: -89.1167, region: 'East', country: 'Belize' },
  'El Peru': { lat: 17.6167, lng: -90.6000, region: 'Central', country: 'Guatemala' },
  'Tortuguero': { lat: 17.5000, lng: -92.9500, region: 'Usmacinta', country: 'Mexico' },
  'La Corona': { lat: 17.6333, lng: -90.5667, region: 'Central', country: 'Guatemala' },
  'El Naranjo': { lat: 17.4667, lng: -90.8500, region: 'Central', country: 'Guatemala' },
  'Chinkultic': { lat: 16.1167, lng: -91.7833, region: 'South', country: 'Mexico' },
  'Moral-Reforma': { lat: 18.0500, lng: -91.7667, region: 'Usmacinta', country: 'Mexico' },
  'Aguateca': { lat: 16.4500, lng: -90.1833, region: 'Central', country: 'Guatemala' },
  'Altar de Sacrificios': { lat: 16.4667, lng: -90.8000, region: 'Usmacinta', country: 'Guatemala' },
  'Bonampak': { lat: 16.7050, lng: -91.0658, region: 'Usmacinta', country: 'Mexico' },
  'Uaxactun': { lat: 17.4000, lng: -89.6333, region: 'Central', country: 'Guatemala' },
  'Machaquila': { lat: 16.4000, lng: -90.0833, region: 'Central', country: 'Guatemala' },
  'Xultun': { lat: 17.7167, lng: -89.5167, region: 'Central', country: 'Guatemala' },
  'Itzimte': { lat: 16.4833, lng: -90.1167, region: 'Central', country: 'Guatemala' },
  'Seibal': { lat: 16.5167, lng: -90.1500, region: 'Central', country: 'Guatemala' },
  'Ek Balam': { lat: 20.8833, lng: -88.0833, region: 'North', country: 'Mexico' },
  'Campeche': { lat: 19.8467, lng: -90.5244, region: 'Central', country: 'Mexico' },
  'Oxpemul': { lat: 18.5000, lng: -89.4500, region: 'Central', country: 'Mexico' },
  'Edzna': { lat: 19.5950, lng: -90.2322, region: 'North', country: 'Mexico' },
  'Uxmal': { lat: 20.3597, lng: -89.7711, region: 'North', country: 'Mexico' },
  'Uxul': { lat: 18.1667, lng: -89.5833, region: 'Central', country: 'Mexico' },
  'Nimli Punit': { lat: 16.3833, lng: -88.7833, region: 'East', country: 'Belize' },
  'Ixkun': { lat: 16.8500, lng: -89.4167, region: 'East', country: 'Guatemala' },
  'Nakum': { lat: 17.1500, lng: -89.4333, region: 'Central', country: 'Guatemala' },
  'Sacul': { lat: 16.8167, lng: -89.3333, region: 'Central', country: 'Guatemala' },
  'Dzibanche': { lat: 18.6500, lng: -88.7333, region: 'Central', country: 'Mexico' },
  'Polol': { lat: 16.5333, lng: -90.1833, region: 'Central', country: 'Guatemala' },
  'Tamarindito': { lat: 16.5667, lng: -90.3000, region: 'Central', country: 'Guatemala' },
  'Yula': { lat: 16.3500, lng: -89.9833, region: 'Central', country: 'Guatemala' },
  // Additional sites
  'Kabah': { lat: 20.2500, lng: -89.6500, region: 'North', country: 'Mexico' },
  'Dzibilchaltun': { lat: 21.0900, lng: -89.6000, region: 'North', country: 'Mexico' },
  'Resbalon': { lat: 18.3000, lng: -88.6000, region: 'Central', country: 'Mexico' },
  'La Pasadita': { lat: 16.9500, lng: -91.0500, region: 'Usmacinta', country: 'Guatemala' },
  'Itzan': { lat: 16.6833, lng: -90.2333, region: 'Central', country: 'Guatemala' },
  'Cancuen': { lat: 15.9667, lng: -90.1833, region: 'South', country: 'Guatemala' },
  'La Mar': { lat: 16.8667, lng: -91.5333, region: 'Usmacinta', country: 'Mexico' },
  'Pomoná': { lat: 17.6333, lng: -91.5833, region: 'Usmacinta', country: 'Mexico' },
  'Xcalumkin': { lat: 20.1000, lng: -89.7333, region: 'North', country: 'Mexico' },
  'Chichen Itza': { lat: 20.6843, lng: -88.5678, region: 'North', country: 'Mexico' },
  'Oxkintok': { lat: 20.5667, lng: -89.9167, region: 'North', country: 'Mexico' },
  'Sak Tz\'i\'': { lat: 16.7167, lng: -91.7500, region: 'Usmacinta', country: 'Mexico' },
  'Lacanha': { lat: 16.7500, lng: -91.1333, region: 'Usmacinta', country: 'Mexico' },
  'Xunantunich': { lat: 17.0833, lng: -89.1333, region: 'East', country: 'Belize' },
  'Motul de San Jose': { lat: 17.0833, lng: -89.9000, region: 'Central', country: 'Guatemala' },
  'La Milpa': { lat: 17.8333, lng: -89.0333, region: 'Central', country: 'Belize' },
  'Xcocha': { lat: 18.1500, lng: -89.7500, region: 'Central', country: 'Mexico' },
  'Tzibatnah': { lat: 18.2000, lng: -89.5000, region: 'Central', country: 'Mexico' },
  'Itzimte-Bolonchen': { lat: 19.9500, lng: -89.7500, region: 'North', country: 'Mexico' },
  'Santa Elena': { lat: 20.3167, lng: -89.6500, region: 'North', country: 'Mexico' },
  'Sayil': { lat: 20.1833, lng: -89.6500, region: 'North', country: 'Mexico' },
  'Jaina': { lat: 20.1833, lng: -90.5000, region: 'North', country: 'Mexico' },
  'Yaxha': { lat: 17.0833, lng: -89.4000, region: 'Central', country: 'Guatemala' },
  'El Cayo': { lat: 16.9667, lng: -91.1167, region: 'Usmacinta', country: 'Guatemala' },
  'La Amelia': { lat: 16.4500, lng: -90.1167, region: 'Central', country: 'Guatemala' },
  'Cancuén': { lat: 15.9667, lng: -90.1833, region: 'South', country: 'Guatemala' },
  'Arroyo de Piedra': { lat: 16.4833, lng: -90.3167, region: 'Central', country: 'Guatemala' },
  'Pomona': { lat: 17.6333, lng: -91.5833, region: 'Usmacinta', country: 'Mexico' },
  'Lacanja Tzeltal': { lat: 16.7500, lng: -91.1333, region: 'Usmacinta', country: 'Mexico' },
  // Additional sites (batch 2)
  'Holmul': { lat: 17.3833, lng: -89.3833, region: 'Central', country: 'Guatemala' },
  'Tulum': { lat: 20.2117, lng: -87.4283, region: 'North', country: 'Mexico' },
  'Zapote Bobal': { lat: 16.6333, lng: -90.2167, region: 'Central', country: 'Guatemala' },
  'Tres Islas': { lat: 16.5500, lng: -90.1000, region: 'Central', country: 'Guatemala' },
  'La Mancha': { lat: 17.3000, lng: -91.2000, region: 'Usmacinta', country: 'Mexico' },
  'Polbox': { lat: 18.3000, lng: -89.7000, region: 'Central', country: 'Mexico' },
  'Raxruha': { lat: 15.8833, lng: -90.0333, region: 'South', country: 'Guatemala' },
  'La Gloria': { lat: 16.8500, lng: -91.0000, region: 'Usmacinta', country: 'Guatemala' },
  'La Ramada': { lat: 16.6000, lng: -90.2500, region: 'Central', country: 'Guatemala' },
  'Flores': { lat: 16.9303, lng: -89.8922, region: 'Central', country: 'Guatemala' },
  'Alacranes': { lat: 18.2000, lng: -89.3000, region: 'Central', country: 'Mexico' },
};

// Map artifact code PREFIXES to site names.
// Matching uses longest-prefix-first, so more specific codes take priority.
const ARTIFACT_TO_SITE: Record<string, string> = {
  // Calakmul
  COL: 'Calakmul', CLK: 'Calakmul',
  // Codices
  MAD: 'Madrid Codex', DRE: 'Dresden Codex', PAR: 'Paris Codex',
  // Copan
  CPN: 'Copan',
  // Naranjo
  NAR: 'Naranjo',
  // Piedras Negras
  PNG: 'Piedras Negras',
  // Tonina
  TNA: 'Tonina',
  // Yaxchilan
  YAX: 'Yaxchilan',
  // Palenque
  PAL: 'Palenque',
  // Tikal
  TIK: 'Tikal',
  // Caracol
  CRC: 'Caracol',
  // Quirigua
  QRG: 'Quirigua',
  // Coba
  COB: 'Coba',
  // Dos Pilas
  DPL: 'Dos Pilas',
  // Pusila (Pusilha)
  PUS: 'Pusila',
  // El Peru (Waka')
  PRU: 'El Peru',
  // Tortuguero
  TRT: 'Tortuguero',
  // La Corona
  CRN: 'La Corona',
  // El Naranjo (on Usumacinta)
  NTN: 'El Naranjo',
  // Chinkultic
  CHN: 'Chinkultic',
  // Moral-Reforma
  MRL: 'Moral-Reforma',
  // Aguateca
  AGT: 'Aguateca',
  // Altar de Sacrificios
  ALS: 'Altar de Sacrificios',
  // Bonampak
  BPK: 'Bonampak',
  // Uaxactun
  UAX: 'Uaxactun',
  // Machaquila
  MQL: 'Machaquila',
  // Xultun
  XUL: 'Xultun',
  // Itzimte
  ITN: 'Itzimte',
  // Seibal (Ceibal)
  SBL: 'Seibal',
  // Ek Balam
  EKB: 'Ek Balam',
  // Campeche
  CML: 'Campeche',
  // Oxpemul
  OXP: 'Oxpemul',
  // Edzna
  EDZ: 'Edzna',
  // Uxmal
  UXM: 'Uxmal',
  // Uxul
  UXL: 'Uxul',
  // Nimli Punit
  NMP: 'Nimli Punit',
  // Ixkun
  IXK: 'Ixkun',
  // Nakum
  NCT: 'Nakum', NAK: 'Nakum',
  // Sacul
  SCU: 'Sacul',
  // Dzibanche
  DCB: 'Dzibanche', DZB: 'Dzibanche',
  // Polol
  PLM: 'Polol',
  // Tamarindito
  TAM: 'Tamarindito',
  // Yula
  YUL: 'Yula',
  // Kabah
  KAB: 'Kabah',
  // Dzibilchaltun
  DBC: 'Dzibilchaltun',
  // Resbalon
  RSB: 'Resbalon',
  // La Pasadita
  LPS: 'La Pasadita',
  // Itzan
  ITZ: 'Itzan',
  // Cancuen
  CNC: 'Cancuen',
  // La Mar
  LMR: 'La Mar',
  // Pomona
  POM: 'Pomona',
  // Xcalumkin
  XCL: 'Xcalumkin',
  // Chichen Itza
  CHI: 'Chichen Itza',
  // Oxkintok
  OKT: 'Oxkintok',
  // Sak Tz'i' (Plan de Ayutla / Lacanja Tzeltal)
  LTZ: 'Lacanja Tzeltal',
  // Lacanha
  LCH: 'Lacanha',
  // Xunantunich
  XUN: 'Xunantunich',
  // Motul de San Jose
  MSJ: 'Motul de San Jose',
  // La Milpa
  LML: 'La Milpa',
  // Xcocha
  XCO: 'Xcocha',
  // Tzibatnah
  TZB: 'Tzibatnah',
  // Santa Elena
  SEN: 'Santa Elena',
  // Sayil
  SAY: 'Sayil',
  // Jaina
  JAN: 'Jaina',
  // Yaxha
  YXH: 'Yaxha',
  // El Cayo
  ECY: 'El Cayo', CAY: 'El Cayo',
  // La Amelia
  AML: 'La Amelia',
  // Arroyo de Piedra
  ADP: 'Arroyo de Piedra',
  // San Bartolo Panel
  SBP: 'Seibal',
  // Holmul
  HLM: 'Holmul',
  // Tulum
  TUL: 'Tulum',
  // Arroyo de Piedra (alternate code)
  ARP: 'Arroyo de Piedra',
  // La Milpa (alternate code)
  MLP: 'La Milpa',
  // Pomona Tabasco (alternate code)
  PMT: 'Pomona',
  // Zapote Bobal
  ZAP: 'Zapote Bobal',
  // Tres Islas
  TRS: 'Tres Islas',
  // Piedra Labrada / La Mancha area
  MAN: 'La Mancha',
  // Polbox
  PBX: 'Polbox',
  // Zapote Bobal (alternate)
  ZPB: 'Zapote Bobal',
  // El Resbalon / Rej
  REJ: 'Resbalon',
  // Raxruha Viejo / Raxchich
  RAZ: 'Raxruha',
  // La Gloria Panel
  LGP: 'La Gloria',
  // Lacanha
  RAM: 'La Ramada',
  // Motul (alternate)
  MTL: 'Motul de San Jose',
  // Flores/Tayasal area
  FLD: 'Flores',
  // Alvarado
  ALC: 'Alacranes',
};

// Pre-sort prefixes longest-first for matching priority
const SORTED_PREFIXES = Object.keys(ARTIFACT_TO_SITE).sort((a, b) => b.length - a.length);

// Build the legacy SITE_MAPPINGS from the two maps (for backward compat)
export const SITE_MAPPINGS: Record<string, Site> = Object.fromEntries(
  Object.entries(ARTIFACT_TO_SITE)
    .filter(([, siteName]) => SITES[siteName])
    .map(([code, siteName]) => [code, { name: siteName, ...SITES[siteName] }])
);

export function getSiteFromArtifactCode(code: string): Site | null {
  if (!code) return null;

  // Longest prefix match
  for (const prefix of SORTED_PREFIXES) {
    if (code.startsWith(prefix)) {
      const siteName = ARTIFACT_TO_SITE[prefix];
      if (SITES[siteName]) {
        return { name: siteName, ...SITES[siteName] };
      }
    }
  }

  return null;
}

// Get all unique sites (deduplicated)
export function getAllUniqueSites(): Map<string, Site> {
  const uniqueSites = new Map<string, Site>();
  for (const [name, data] of Object.entries(SITES)) {
    uniqueSites.set(name, { name, ...data });
  }
  return uniqueSites;
}
