// Maya archaeological site data
// Coordinates from academic sources and archaeological databases

export interface Site {
  name: string;
  lat: number;
  lng: number;
  region: 'North' | 'East' | 'Central' | 'Usmacinta' | 'South' | 'Unknown';
  country?: string;
  modernName?: string;
}

export const SITE_MAPPINGS: Record<string, Site> = {
  // Calakmul (Campeche, Mexico) - Central
  'COLK': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLM': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLC': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLL': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLS': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLP': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLH': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLDO': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLLC': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLFRM': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLMPV': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLMS': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'COLCNCP': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },

  // Madrid Codex - Post-Classic
  'MAD': { name: 'Madrid Codex', lat: 20.0, lng: -89.0, region: 'North', country: 'Spain (Codex)' },

  // Dresden Codex - Post-Classic  
  'DRE': { name: 'Dresden Codex', lat: 20.0, lng: -89.0, region: 'North', country: 'Germany (Codex)' },

  // Copan (Honduras) - East
  'CPN': { name: 'Copan', lat: 14.8403, lng: -89.1422, region: 'East', country: 'Honduras' },
  'CPNS': { name: 'Copan', lat: 14.8403, lng: -89.1422, region: 'East', country: 'Honduras' },
  'CPNA': { name: 'Copan', lat: 14.8403, lng: -89.1422, region: 'East', country: 'Honduras' },
  'CPNT': { name: 'Copan', lat: 14.8403, lng: -89.1422, region: 'East', country: 'Honduras' },
  'CPNHSB': { name: 'Copan', lat: 14.8403, lng: -89.1422, region: 'East', country: 'Honduras' },
  'CPNHSA': { name: 'Copan', lat: 14.8403, lng: -89.1422, region: 'East', country: 'Honduras' },

  // Naranjo (Guatemala) - Central
  'NAR': { name: 'Naranjo', lat: 17.1667, lng: -89.2167, region: 'Central', country: 'Guatemala' },
  'NARS': { name: 'Naranjo', lat: 17.1667, lng: -89.2167, region: 'Central', country: 'Guatemala' },
  'NARA': { name: 'Naranjo', lat: 17.1667, lng: -89.2167, region: 'Central', country: 'Guatemala' },

  // Piedras Negras (Guatemala) - Usmacinta
  'PNG': { name: 'Piedras Negras', lat: 17.1500, lng: -91.0167, region: 'Usmacinta', country: 'Guatemala' },
  'PNGS': { name: 'Piedras Negras', lat: 17.1500, lng: -91.0167, region: 'Usmacinta', country: 'Guatemala' },
  'PNGP': { name: 'Piedras Negras', lat: 17.1500, lng: -91.0167, region: 'Usmacinta', country: 'Guatemala' },
  'PNGA': { name: 'Piedras Negras', lat: 17.1500, lng: -91.0167, region: 'Usmacinta', country: 'Guatemala' },

  // Tonina (Mexico) - Central
  'TNAM': { name: 'Tonina', lat: 16.9033, lng: -92.0108, region: 'Central', country: 'Mexico' },

  // Yaxchilan (Mexico) - Usmacinta
  'YAX': { name: 'Yaxchilan', lat: 16.8989, lng: -91.0000, region: 'Usmacinta', country: 'Mexico' },
  'YAXL': { name: 'Yaxchilan', lat: 16.8989, lng: -91.0000, region: 'Usmacinta', country: 'Mexico' },
  'YAXS': { name: 'Yaxchilan', lat: 16.8989, lng: -91.0000, region: 'Usmacinta', country: 'Mexico' },
  'YAXHS': { name: 'Yaxchilan', lat: 16.8989, lng: -91.0000, region: 'Usmacinta', country: 'Mexico' },

  // Palenque (Mexico) - Usmacinta
  'PAL': { name: 'Palenque', lat: 17.4839, lng: -92.0460, region: 'Usmacinta', country: 'Mexico' },
  'PALT': { name: 'Palenque', lat: 17.4839, lng: -92.0460, region: 'Usmacinta', country: 'Mexico' },
  'PALTI': { name: 'Palenque', lat: 17.4839, lng: -92.0460, region: 'Usmacinta', country: 'Mexico' },
  'PALPT': { name: 'Palenque', lat: 17.4839, lng: -92.0460, region: 'Usmacinta', country: 'Mexico' },
  'PALTC': { name: 'Palenque', lat: 17.4839, lng: -92.0460, region: 'Usmacinta', country: 'Mexico' },
  'PALTFC': { name: 'Palenque', lat: 17.4839, lng: -92.0460, region: 'Usmacinta', country: 'Mexico' },
  'PALTS': { name: 'Palenque', lat: 17.4839, lng: -92.0460, region: 'Usmacinta', country: 'Mexico' },
  'PALTCI': { name: 'Palenque', lat: 17.4839, lng: -92.0460, region: 'Usmacinta', country: 'Mexico' },
  'PALKTT': { name: 'Palenque', lat: 17.4839, lng: -92.0460, region: 'Usmacinta', country: 'Mexico' },

  // Tikal (Guatemala) - Central
  'TIK': { name: 'Tikal', lat: 17.2221, lng: -89.6236, region: 'Central', country: 'Guatemala' },
  'TIKS': { name: 'Tikal', lat: 17.2221, lng: -89.6236, region: 'Central', country: 'Guatemala' },
  'TIKT': { name: 'Tikal', lat: 17.2221, lng: -89.6236, region: 'Central', country: 'Guatemala' },
  'TIKK': { name: 'Tikal', lat: 17.2221, lng: -89.6236, region: 'Central', country: 'Guatemala' },
  'TIKMT': { name: 'Tikal', lat: 17.2221, lng: -89.6236, region: 'Central', country: 'Guatemala' },
  'TIKTIP': { name: 'Tikal', lat: 17.2221, lng: -89.6236, region: 'Central', country: 'Guatemala' },

  // Calakmul variants (already covered above)
  'CLK': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },
  'CLKS': { name: 'Calakmul', lat: 18.1050, lng: -89.8119, region: 'Central', country: 'Mexico' },

  // Paracal / Paris (Codex?)
  'PAR': { name: 'Paris Codex', lat: 20.0, lng: -89.0, region: 'North', country: 'France (Codex)' },

  // Caracol (Belize) - East
  'CRC': { name: 'Caracol', lat: 16.7628, lng: -89.1156, region: 'East', country: 'Belize' },
  'CRCS': { name: 'Caracol', lat: 16.7628, lng: -89.1156, region: 'East', country: 'Belize' },
  'CRCA': { name: 'Caracol', lat: 16.7628, lng: -89.1156, region: 'East', country: 'Belize' },
  'CRCE': { name: 'Caracol', lat: 16.7628, lng: -89.1156, region: 'East', country: 'Belize' },
  'CRCHS': { name: 'Caracol', lat: 16.7628, lng: -89.1156, region: 'East', country: 'Belize' },

  // Quirigua (Guatemala) - East
  'QRG': { name: 'Quirigua', lat: 15.2728, lng: -89.0292, region: 'East', country: 'Guatemala' },
  'QRGS': { name: 'Quirigua', lat: 15.2728, lng: -89.0292, region: 'East', country: 'Guatemala' },
  'QRGA': { name: 'Quirigua', lat: 15.2728, lng: -89.0292, region: 'East', country: 'Guatemala' },
  'QRGZP': { name: 'Quirigua', lat: 15.2728, lng: -89.0292, region: 'East', country: 'Guatemala' },
  'QRGZG': { name: 'Quirigua', lat: 15.2728, lng: -89.0292, region: 'East', country: 'Guatemala' },

  // Cobá (Mexico) - North
  'COB': { name: 'Coba', lat: 20.4950, lng: -87.7344, region: 'North', country: 'Mexico' },
  'COBS': { name: 'Coba', lat: 20.4950, lng: -87.7344, region: 'North', country: 'Mexico' },

  // Dos Pilas (Guatemala) - Central
  'DPL': { name: 'Dos Pilas', lat: 16.5100, lng: -90.2200, region: 'Central', country: 'Guatemala' },
  'DPLS': { name: 'Dos Pilas', lat: 16.5100, lng: -90.2200, region: 'Central', country: 'Guatemala' },
  'DPLHS': { name: 'Dos Pilas', lat: 16.5100, lng: -90.2200, region: 'Central', country: 'Guatemala' },
  'DPLP': { name: 'Dos Pilas', lat: 16.5100, lng: -90.2200, region: 'Central', country: 'Guatemala' },

  // Pusila (Belize) - East
  'PUS': { name: 'Pusila', lat: 16.2167, lng: -89.1167, region: 'East', country: 'Belize' },
  'PUSS': { name: 'Pusila', lat: 16.2167, lng: -89.1167, region: 'East', country: 'Belize' },

  // El Peru / Waka (Guatemala) - Central
  'PRU': { name: 'El Peru', lat: 17.6167, lng: -90.6000, region: 'Central', country: 'Guatemala' },
  'PRUS': { name: 'El Peru', lat: 17.6167, lng: -90.6000, region: 'Central', country: 'Guatemala' },

  // Tortuguero (Mexico) - Usmacinta
  'TRT': { name: 'Tortuguero', lat: 17.5000, lng: -92.9500, region: 'Usmacinta', country: 'Mexico' },
  'TRTM': { name: 'Tortuguero', lat: 17.5000, lng: -92.9500, region: 'Usmacinta', country: 'Mexico' },

  // La Corona (Guatemala) - Central
  'CRN': { name: 'La Corona', lat: 17.6333, lng: -90.5667, region: 'Central', country: 'Guatemala' },
  'CRNP': { name: 'La Corona', lat: 17.6333, lng: -90.5667, region: 'Central', country: 'Guatemala' },
  'CRNHS': { name: 'La Corona', lat: 17.6333, lng: -90.5667, region: 'Central', country: 'Guatemala' },
  'CRNA': { name: 'La Corona', lat: 17.6333, lng: -90.5667, region: 'Central', country: 'Guatemala' },
  'CRNHSA': { name: 'La Corona', lat: 17.6333, lng: -90.5667, region: 'Central', country: 'Guatemala' },

  // El Naranjo (Guatemala) - Central  
  'NTN': { name: 'El Naranjo', lat: 17.4667, lng: -90.8500, region: 'Central', country: 'Guatemala' },
  'NTND': { name: 'El Naranjo', lat: 17.4667, lng: -90.8500, region: 'Central', country: 'Guatemala' },

  // Chinkultic (Mexico) - South
  'CHN': { name: 'Chinkultic', lat: 16.1167, lng: -91.7833, region: 'South', country: 'Mexico' },
  'CHNT': { name: 'Chinkultic', lat: 16.1167, lng: -91.7833, region: 'South', country: 'Mexico' },
  'CHNC': { name: 'Chinkultic', lat: 16.1167, lng: -91.7833, region: 'South', country: 'Mexico' },
  'CHNS': { name: 'Chinkultic', lat: 16.1167, lng: -91.7833, region: 'South', country: 'Mexico' },
  'CHNLML': { name: 'Chinkultic', lat: 16.1167, lng: -91.7833, region: 'South', country: 'Mexico' },

  // Moral-Reforma (Mexico) - Usmacinta
  'MRL': { name: 'Moral-Reforma', lat: 18.0500, lng: -91.7667, region: 'Usmacinta', country: 'Mexico' },
  'MRLS': { name: 'Moral-Reforma', lat: 18.0500, lng: -91.7667, region: 'Usmacinta', country: 'Mexico' },

  // Aguateca (Guatemala) - Central
  'AGT': { name: 'Aguateca', lat: 16.4500, lng: -90.1833, region: 'Central', country: 'Guatemala' },
  'AGTS': { name: 'Aguateca', lat: 16.4500, lng: -90.1833, region: 'Central', country: 'Guatemala' },

  // Altar de Sacrificios (Guatemala) - Usmacinta
  'ALS': { name: 'Altar de Sacrificios', lat: 16.4667, lng: -90.8000, region: 'Usmacinta', country: 'Guatemala' },
  'ALSS': { name: 'Altar de Sacrificios', lat: 16.4667, lng: -90.8000, region: 'Usmacinta', country: 'Guatemala' },

  // Bonampak (Mexico) - Usmacinta
  'BPK': { name: 'Bonampak', lat: 16.7050, lng: -91.0658, region: 'Usmacinta', country: 'Mexico' },
  'BPKM': { name: 'Bonampak', lat: 16.7050, lng: -91.0658, region: 'Usmacinta', country: 'Mexico' },
  'BPKSS': { name: 'Bonampak', lat: 16.7050, lng: -91.0658, region: 'Usmacinta', country: 'Mexico' },
  'BKPKOKV': { name: 'Bonampak', lat: 16.7050, lng: -91.0658, region: 'Usmacinta', country: 'Mexico' },

  // Uaxactun (Guatemala) - Central
  'UAX': { name: 'Uaxactun', lat: 17.4000, lng: -89.6333, region: 'Central', country: 'Guatemala' },
  'UAXS': { name: 'Uaxactun', lat: 17.4000, lng: -89.6333, region: 'Central', country: 'Guatemala' },
  'UAXB': { name: 'Uaxactun', lat: 17.4000, lng: -89.6333, region: 'Central', country: 'Guatemala' },

  // Machaquila (Guatemala) - Central
  'MQL': { name: 'Machaquila', lat: 16.4000, lng: -90.0833, region: 'Central', country: 'Guatemala' },
  'MQLS': { name: 'Machaquila', lat: 16.4000, lng: -90.0833, region: 'Central', country: 'Guatemala' },

  // Xultun (Guatemala) - Central
  'XUL': { name: 'Xultun', lat: 17.7167, lng: -89.5167, region: 'Central', country: 'Guatemala' },
  'XULS': { name: 'Xultun', lat: 17.7167, lng: -89.5167, region: 'Central', country: 'Guatemala' },

  // Itzimte (Guatemala) - Central
  'ITN': { name: 'Itzimte', lat: 16.4833, lng: -90.1167, region: 'Central', country: 'Guatemala' },
  'ITNS': { name: 'Itzimte', lat: 16.4833, lng: -90.1167, region: 'Central', country: 'Guatemala' },
  'ITSS': { name: 'Itzimte', lat: 16.4833, lng: -90.1167, region: 'Central', country: 'Guatemala' },

  // Seibal (Guatemala) - Central
  'SBL': { name: 'Seibal', lat: 16.5167, lng: -90.1500, region: 'Central', country: 'Guatemala' },
  'SBLS': { name: 'Seibal', lat: 16.5167, lng: -90.1500, region: 'Central', country: 'Guatemala' },
  'SBLT': { name: 'Seibal', lat: 16.5167, lng: -90.1500, region: 'Central', country: 'Guatemala' },

  // Ek Balam (Mexico) - North
  'EKB': { name: 'Ek Balam', lat: 20.8833, lng: -88.0833, region: 'North', country: 'Mexico' },
  'EKBM': { name: 'Ek Balam', lat: 20.8833, lng: -88.0833, region: 'North', country: 'Mexico' },

  // Ceibal/Campeche (Mexico) - Central
  'CML': { name: 'Campeche', lat: 19.8467, lng: -90.5244, region: 'Central', country: 'Mexico' },
  'CMLU': { name: 'Campeche', lat: 19.8467, lng: -90.5244, region: 'Central', country: 'Mexico' },

  // Oxpemul (Mexico) - Central
  'OXP': { name: 'Oxpemul', lat: 18.5000, lng: -89.4500, region: 'Central', country: 'Mexico' },
  'OXPS': { name: 'Oxpemul', lat: 18.5000, lng: -89.4500, region: 'Central', country: 'Mexico' },

  // Edzna (Mexico) - North
  'EDZ': { name: 'Edzna', lat: 19.5950, lng: -90.2322, region: 'North', country: 'Mexico' },
  'EDZS': { name: 'Edzna', lat: 19.5950, lng: -90.2322, region: 'North', country: 'Mexico' },

  // Uxmal (Mexico) - North
  'UXM': { name: 'Uxmal', lat: 20.3597, lng: -89.7711, region: 'North', country: 'Mexico' },
  'UXMM': { name: 'Uxmal', lat: 20.3597, lng: -89.7711, region: 'North', country: 'Mexico' },

  // Uxul (Mexico) - Central
  'UXL': { name: 'Uxul', lat: 18.1667, lng: -89.5833, region: 'Central', country: 'Mexico' },
  'UXLS': { name: 'Uxul', lat: 18.1667, lng: -89.5833, region: 'Central', country: 'Mexico' },

  // Nimli Punit (Belize) - East
  'NMP': { name: 'Nimli Punit', lat: 16.3833, lng: -88.7833, region: 'East', country: 'Belize' },
  'NMPS': { name: 'Nimli Punit', lat: 16.3833, lng: -88.7833, region: 'East', country: 'Belize' },

  // Ixkun (Guatemala) - East
  'IXK': { name: 'Ixkun', lat: 16.8500, lng: -89.4167, region: 'East', country: 'Guatemala' },
  'IXKS': { name: 'Ixkun', lat: 16.8500, lng: -89.4167, region: 'East', country: 'Guatemala' },

  // Nakum (Guatemala) - Central
  'NCT': { name: 'Nakum', lat: 17.1500, lng: -89.4333, region: 'Central', country: 'Guatemala' },
  'NCTS': { name: 'Nakum', lat: 17.1500, lng: -89.4333, region: 'Central', country: 'Guatemala' },

  // Sacul (Guatemala) - Central
  'SCU': { name: 'Sacul', lat: 16.8167, lng: -89.3333, region: 'Central', country: 'Guatemala' },
  'SCUS': { name: 'Sacul', lat: 16.8167, lng: -89.3333, region: 'Central', country: 'Guatemala' },

  // Dzibanche (Mexico) - Central
  'DCB': { name: 'Dzibanche', lat: 18.6500, lng: -88.7333, region: 'Central', country: 'Mexico' },
  'DCBS': { name: 'Dzibanche', lat: 18.6500, lng: -88.7333, region: 'Central', country: 'Mexico' },

  // Polol (Guatemala) - Central
  'PLM': { name: 'Polol', lat: 16.5333, lng: -90.1833, region: 'Central', country: 'Guatemala' },
  'PLMHS': { name: 'Polol', lat: 16.5333, lng: -90.1833, region: 'Central', country: 'Guatemala' },

  // Tamarindito (Guatemala) - Central
  'TAM': { name: 'Tamarindito', lat: 16.5667, lng: -90.3000, region: 'Central', country: 'Guatemala' },
  'TAMHS': { name: 'Tamarindito', lat: 16.5667, lng: -90.3000, region: 'Central', country: 'Guatemala' },

  // Yula (Guatemala) - Central
  'YUL': { name: 'Yula', lat: 16.3500, lng: -89.9833, region: 'Central', country: 'Guatemala' },
  'YULYL': { name: 'Yula', lat: 16.3500, lng: -89.9833, region: 'Central', country: 'Guatemala' },
};

// Helper function to get site from artifact code
export function getSiteFromArtifactCode(code: string): Site | null {
  if (!code) return null;
  
  // Direct match
  if (SITE_MAPPINGS[code]) {
    return SITE_MAPPINGS[code];
  }
  
  // Try to find base site (remove suffixes)
  // Many codes have suffixes like S (stela), T (temple), HS (hieroglyphic stairway)
  const possibleBases = [
    code,
    code.replace(/S$/, ''),
    code.replace(/T$/, ''),
    code.replace(/HS.*$/, ''),
    code.replace(/[A-Z]$/, ''),
  ];
  
  for (const base of possibleBases) {
    if (SITE_MAPPINGS[base]) {
      return SITE_MAPPINGS[base];
    }
  }
  
  return null;
}

// Get all unique sites (deduplicated by name)
export function getAllUniqueSites(): Map<string, Site> {
  const uniqueSites = new Map<string, Site>();
  
  Object.values(SITE_MAPPINGS).forEach(site => {
    if (!uniqueSites.has(site.name)) {
      uniqueSites.set(site.name, site);
    }
  });
  
  return uniqueSites;
}
