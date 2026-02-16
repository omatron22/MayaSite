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
};

// Map artifact codes to site names
const ARTIFACT_TO_SITE: Record<string, string> = {
  // Calakmul
  COLK: 'Calakmul', COLM: 'Calakmul', COLC: 'Calakmul', COLL: 'Calakmul',
  COLS: 'Calakmul', COLP: 'Calakmul', COLH: 'Calakmul', COLDO: 'Calakmul',
  COLLC: 'Calakmul', COLFRM: 'Calakmul', COLMPV: 'Calakmul', COLMS: 'Calakmul',
  COLCNCP: 'Calakmul', CLK: 'Calakmul', CLKS: 'Calakmul',
  // Codices
  MAD: 'Madrid Codex', DRE: 'Dresden Codex', PAR: 'Paris Codex',
  // Copan
  CPN: 'Copan', CPNS: 'Copan', CPNA: 'Copan', CPNT: 'Copan',
  CPNHSB: 'Copan', CPNHSA: 'Copan',
  // Naranjo
  NAR: 'Naranjo', NARS: 'Naranjo', NARA: 'Naranjo',
  // Piedras Negras
  PNG: 'Piedras Negras', PNGS: 'Piedras Negras', PNGP: 'Piedras Negras', PNGA: 'Piedras Negras',
  // Tonina
  TNAM: 'Tonina',
  // Yaxchilan
  YAX: 'Yaxchilan', YAXL: 'Yaxchilan', YAXS: 'Yaxchilan', YAXHS: 'Yaxchilan',
  // Palenque
  PAL: 'Palenque', PALT: 'Palenque', PALTI: 'Palenque', PALPT: 'Palenque',
  PALTC: 'Palenque', PALTFC: 'Palenque', PALTS: 'Palenque', PALTCI: 'Palenque', PALKTT: 'Palenque',
  // Tikal
  TIK: 'Tikal', TIKS: 'Tikal', TIKT: 'Tikal', TIKK: 'Tikal', TIKMT: 'Tikal', TIKTIP: 'Tikal',
  // Caracol
  CRC: 'Caracol', CRCS: 'Caracol', CRCA: 'Caracol', CRCE: 'Caracol', CRCHS: 'Caracol',
  // Quirigua
  QRG: 'Quirigua', QRGS: 'Quirigua', QRGA: 'Quirigua', QRGZP: 'Quirigua', QRGZG: 'Quirigua',
  // Coba
  COB: 'Coba', COBS: 'Coba',
  // Dos Pilas
  DPL: 'Dos Pilas', DPLS: 'Dos Pilas', DPLHS: 'Dos Pilas', DPLP: 'Dos Pilas',
  // Pusila
  PUS: 'Pusila', PUSS: 'Pusila',
  // El Peru
  PRU: 'El Peru', PRUS: 'El Peru',
  // Tortuguero
  TRT: 'Tortuguero', TRTM: 'Tortuguero',
  // La Corona
  CRN: 'La Corona', CRNP: 'La Corona', CRNHS: 'La Corona', CRNA: 'La Corona', CRNHSA: 'La Corona',
  // El Naranjo
  NTN: 'El Naranjo', NTND: 'El Naranjo',
  // Chinkultic
  CHN: 'Chinkultic', CHNT: 'Chinkultic', CHNC: 'Chinkultic', CHNS: 'Chinkultic', CHNLML: 'Chinkultic',
  // Moral-Reforma
  MRL: 'Moral-Reforma', MRLS: 'Moral-Reforma',
  // Aguateca
  AGT: 'Aguateca', AGTS: 'Aguateca',
  // Altar de Sacrificios
  ALS: 'Altar de Sacrificios', ALSS: 'Altar de Sacrificios',
  // Bonampak
  BPK: 'Bonampak', BPKM: 'Bonampak', BPKSS: 'Bonampak', BKPKOKV: 'Bonampak',
  // Uaxactun
  UAX: 'Uaxactun', UAXS: 'Uaxactun', UAXB: 'Uaxactun',
  // Machaquila
  MQL: 'Machaquila', MQLS: 'Machaquila',
  // Xultun
  XUL: 'Xultun', XULS: 'Xultun',
  // Itzimte
  ITN: 'Itzimte', ITNS: 'Itzimte', ITSS: 'Itzimte',
  // Seibal
  SBL: 'Seibal', SBLS: 'Seibal', SBLT: 'Seibal',
  // Ek Balam
  EKB: 'Ek Balam', EKBM: 'Ek Balam',
  // Campeche
  CML: 'Campeche', CMLU: 'Campeche',
  // Oxpemul
  OXP: 'Oxpemul', OXPS: 'Oxpemul',
  // Edzna
  EDZ: 'Edzna', EDZS: 'Edzna',
  // Uxmal
  UXM: 'Uxmal', UXMM: 'Uxmal',
  // Uxul
  UXL: 'Uxul', UXLS: 'Uxul',
  // Nimli Punit
  NMP: 'Nimli Punit', NMPS: 'Nimli Punit',
  // Ixkun
  IXK: 'Ixkun', IXKS: 'Ixkun',
  // Nakum
  NCT: 'Nakum', NCTS: 'Nakum',
  // Sacul
  SCU: 'Sacul', SCUS: 'Sacul',
  // Dzibanche
  DCB: 'Dzibanche', DCBS: 'Dzibanche',
  // Polol
  PLM: 'Polol', PLMHS: 'Polol',
  // Tamarindito
  TAM: 'Tamarindito', TAMHS: 'Tamarindito',
  // Yula
  YUL: 'Yula', YULYL: 'Yula',
};

// Build the legacy SITE_MAPPINGS from the two maps (for backward compat)
export const SITE_MAPPINGS: Record<string, Site> = Object.fromEntries(
  Object.entries(ARTIFACT_TO_SITE)
    .filter(([, siteName]) => SITES[siteName])
    .map(([code, siteName]) => [code, { name: siteName, ...SITES[siteName] }])
);

export function getSiteFromArtifactCode(code: string): Site | null {
  if (!code) return null;

  // Direct match
  const siteName = ARTIFACT_TO_SITE[code];
  if (siteName && SITES[siteName]) {
    return { name: siteName, ...SITES[siteName] };
  }

  // Try removing common suffixes (S=stela, T=temple, HS=hieroglyphic stairway)
  for (const base of [code.replace(/S$/, ''), code.replace(/T$/, ''), code.replace(/HS.*$/, ''), code.replace(/[A-Z]$/, '')]) {
    const name = ARTIFACT_TO_SITE[base];
    if (name && SITES[name]) {
      return { name, ...SITES[name] };
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
