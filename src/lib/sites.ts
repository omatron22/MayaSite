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
  // Batch 3 — from Peabody Museum CMHI site code reference
  // North (Yucatan/Campeche)
  'Santa Rosa Xtampak': { lat: 19.7667, lng: -89.6167, region: 'North', country: 'Mexico' },
  'Dzibilnocac': { lat: 19.8167, lng: -89.7333, region: 'North', country: 'Mexico' },
  'Dzehkabtun': { lat: 19.8000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Tzum': { lat: 19.9000, lng: -89.6000, region: 'North', country: 'Mexico' },
  'Pixoy': { lat: 19.8500, lng: -89.7500, region: 'North', country: 'Mexico' },
  'Mulchic': { lat: 20.2000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Ichmac': { lat: 19.8000, lng: -89.6000, region: 'North', country: 'Mexico' },
  'Halakal': { lat: 20.1500, lng: -89.8500, region: 'North', country: 'Mexico' },
  'Halal': { lat: 20.0000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Sacnicte': { lat: 20.0000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Cuychen': { lat: 19.9000, lng: -89.5000, region: 'North', country: 'Mexico' },
  'Xcorralche': { lat: 20.1000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Ichmul': { lat: 20.2500, lng: -89.0000, region: 'North', country: 'Mexico' },
  'Nohpat': { lat: 20.3000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Hobomo': { lat: 20.6000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Xcochkax': { lat: 19.9500, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Huntichmul': { lat: 20.2000, lng: -89.6000, region: 'North', country: 'Mexico' },
  'Dzilam': { lat: 21.3000, lng: -88.9000, region: 'North', country: 'Mexico' },
  'Tohcok': { lat: 19.9000, lng: -89.8000, region: 'North', country: 'Mexico' },
  'Xkombec': { lat: 19.9000, lng: -89.6000, region: 'North', country: 'Mexico' },
  'Ikil': { lat: 20.7000, lng: -88.6000, region: 'North', country: 'Mexico' },
  'Yaxcopoil': { lat: 20.7500, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Yaxhom': { lat: 20.2000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Yaltutu': { lat: 20.0000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Yakalxiu': { lat: 20.3000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Labna': { lat: 20.1700, lng: -89.5700, region: 'North', country: 'Mexico' },
  'Uaymil': { lat: 20.0000, lng: -87.4000, region: 'North', country: 'Mexico' },
  'Oxlahuntun': { lat: 19.8000, lng: -89.5000, region: 'North', country: 'Mexico' },
  'Techoh': { lat: 20.5000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Cumpich': { lat: 20.1000, lng: -89.8000, region: 'North', country: 'Mexico' },
  'Mayapan': { lat: 20.6297, lng: -89.4614, region: 'North', country: 'Mexico' },
  'Tunkuyi': { lat: 20.0000, lng: -89.6000, region: 'North', country: 'Mexico' },
  'Ukum': { lat: 19.9000, lng: -89.6000, region: 'North', country: 'Mexico' },
  'Chak Ho Be': { lat: 20.4000, lng: -87.5000, region: 'North', country: 'Mexico' },
  'Hotzuc': { lat: 20.4000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Panhale': { lat: 19.8500, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Playa del Carmen': { lat: 20.6296, lng: -87.0739, region: 'North', country: 'Mexico' },
  'Xculoc': { lat: 20.0500, lng: -89.8000, region: 'North', country: 'Mexico' },
  'Nohcacab II': { lat: 20.2000, lng: -89.8000, region: 'North', country: 'Mexico' },
  'Xnucbec': { lat: 19.9000, lng: -89.5000, region: 'North', country: 'Mexico' },
  'Sacchana': { lat: 19.8000, lng: -89.6000, region: 'North', country: 'Mexico' },
  // Central (Peten/Campeche southern)
  'Itsimte-Sacluk': { lat: 16.5000, lng: -89.6000, region: 'Central', country: 'Guatemala' },
  'El Chorro': { lat: 16.5000, lng: -90.2000, region: 'Central', country: 'Guatemala' },
  'La Honradez': { lat: 17.7000, lng: -89.8000, region: 'Central', country: 'Guatemala' },
  'El Chilonche': { lat: 17.1000, lng: -89.8000, region: 'Central', country: 'Guatemala' },
  'El Zotz': { lat: 17.3333, lng: -89.8833, region: 'Central', country: 'Guatemala' },
  'Jimbal': { lat: 17.2500, lng: -89.6000, region: 'Central', country: 'Guatemala' },
  'Kaminaljuyu': { lat: 14.6333, lng: -90.5333, region: 'South', country: 'Guatemala' },
  'Balakbal': { lat: 18.0000, lng: -89.7000, region: 'Central', country: 'Mexico' },
  'La Muneca': { lat: 18.2000, lng: -89.9000, region: 'Central', country: 'Mexico' },
  'Ixlu': { lat: 16.9833, lng: -89.7000, region: 'Central', country: 'Guatemala' },
  'Santa Elena Poco Uinic': { lat: 16.6000, lng: -91.5000, region: 'Usmacinta', country: 'Mexico' },
  'El Encanto': { lat: 17.5000, lng: -89.7000, region: 'Central', country: 'Guatemala' },
  'Nakbe': { lat: 17.4500, lng: -89.5500, region: 'Central', country: 'Guatemala' },
  'Obregon': { lat: 17.5000, lng: -91.5000, region: 'Usmacinta', country: 'Mexico' },
  'Uolantun': { lat: 16.5000, lng: -89.5000, region: 'Central', country: 'Guatemala' },
  'Lamanai': { lat: 17.7500, lng: -88.6500, region: 'East', country: 'Belize' },
  'Joloniel': { lat: 17.0000, lng: -92.0000, region: 'Usmacinta', country: 'Mexico' },
  'Zacpeten': { lat: 16.9833, lng: -89.7167, region: 'Central', country: 'Guatemala' },
  'Topoxte': { lat: 16.9667, lng: -89.6500, region: 'Central', country: 'Guatemala' },
  'Rio Bec': { lat: 18.4167, lng: -89.4667, region: 'Central', country: 'Mexico' },
  'Los Higos': { lat: 14.9000, lng: -89.0000, region: 'East', country: 'Honduras' },
  'Chinikiha': { lat: 17.3500, lng: -91.7000, region: 'Usmacinta', country: 'Mexico' },
  'El Chal': { lat: 16.5500, lng: -89.6000, region: 'Central', country: 'Guatemala' },
  'La Joyanca': { lat: 17.1000, lng: -90.7000, region: 'Central', country: 'Guatemala' },
  'El Juleque': { lat: 17.0000, lng: -89.5000, region: 'Central', country: 'Guatemala' },
  'El Temblor': { lat: 16.5000, lng: -90.3000, region: 'Central', country: 'Guatemala' },
  'Aguas Calientes': { lat: 16.4000, lng: -90.2000, region: 'Central', country: 'Guatemala' },
  'Candzibaantun': { lat: 19.5000, lng: -89.5000, region: 'North', country: 'Mexico' },
  'Cahal Pech': { lat: 17.0833, lng: -89.0833, region: 'East', country: 'Belize' },
  'Altar de los Reyes': { lat: 18.2000, lng: -89.5000, region: 'Central', country: 'Mexico' },
  'Sisilha': { lat: 16.5000, lng: -89.5000, region: 'Central', country: 'Guatemala' },
  'Chuctiepa': { lat: 16.1500, lng: -91.8000, region: 'South', country: 'Mexico' },
  'Santa Rita Corozal': { lat: 18.4000, lng: -88.4000, region: 'East', country: 'Belize' },
  'La Naya': { lat: 17.0000, lng: -89.5000, region: 'Central', country: 'Guatemala' },
  'El Mirador': { lat: 17.7500, lng: -89.9200, region: 'Central', country: 'Guatemala' },
  'Tayasal': { lat: 16.9300, lng: -89.8800, region: 'Central', country: 'Guatemala' },
  'Tintal': { lat: 17.6500, lng: -89.9500, region: 'Central', country: 'Guatemala' },
  'Jonuta': { lat: 18.0800, lng: -92.1300, region: 'Usmacinta', country: 'Mexico' },
  'Chuncanob': { lat: 19.9000, lng: -89.6000, region: 'North', country: 'Mexico' },
  'Altamira': { lat: 17.4000, lng: -91.6000, region: 'Usmacinta', country: 'Mexico' },
  'Tenam Rosario': { lat: 16.1000, lng: -92.0000, region: 'South', country: 'Mexico' },
  'San Bartolo': { lat: 17.5667, lng: -89.3833, region: 'Central', country: 'Guatemala' },
  'Blackman Eddy': { lat: 17.1667, lng: -88.7500, region: 'East', country: 'Belize' },
  'Santo Domingo': { lat: 17.1000, lng: -91.5000, region: 'Usmacinta', country: 'Mexico' },
  'El Palma': { lat: 17.5000, lng: -90.0000, region: 'Central', country: 'Guatemala' },
  'El Kinel': { lat: 16.9000, lng: -91.0000, region: 'Usmacinta', country: 'Guatemala' },
  'Chinaja': { lat: 15.8000, lng: -90.3000, region: 'South', country: 'Guatemala' },
  'Chicanna': { lat: 18.5167, lng: -89.4667, region: 'Central', country: 'Mexico' },
  'Chancala': { lat: 17.3000, lng: -91.9000, region: 'Usmacinta', country: 'Mexico' },
  'Salinas de los Nuevos Cerros': { lat: 15.8500, lng: -89.9000, region: 'South', country: 'Guatemala' },
  'Pomona Belize': { lat: 17.2000, lng: -88.6500, region: 'East', country: 'Belize' },
  'Huacutal': { lat: 16.3000, lng: -90.5000, region: 'Central', country: 'Guatemala' },
  'Tabi': { lat: 20.5000, lng: -89.2000, region: 'North', country: 'Mexico' },
  'Punta Chimino': { lat: 16.4500, lng: -90.2000, region: 'Central', country: 'Guatemala' },
  'Lopez Mateos': { lat: 17.5000, lng: -91.5000, region: 'Usmacinta', country: 'Mexico' },
  'Kayal': { lat: 17.3000, lng: -91.3000, region: 'Usmacinta', country: 'Mexico' },
  'Loltun': { lat: 20.2500, lng: -89.4500, region: 'North', country: 'Mexico' },
  'Ixtonton': { lat: 16.5000, lng: -89.3000, region: 'East', country: 'Guatemala' },
  'Chacchoben': { lat: 19.0000, lng: -88.2000, region: 'East', country: 'Mexico' },
  'Almuchil': { lat: 19.9000, lng: -89.5000, region: 'North', country: 'Mexico' },
  'Aguacate': { lat: 16.5000, lng: -89.0000, region: 'East', country: 'Guatemala' },
  'Becan': { lat: 18.5167, lng: -89.4667, region: 'Central', country: 'Mexico' },
  'Muluch Tsekal': { lat: 20.0000, lng: -89.7000, region: 'North', country: 'Mexico' },
  'Chapayal': { lat: 17.2000, lng: -89.1000, region: 'East', country: 'Belize' },
  'Bellote': { lat: 18.2000, lng: -93.2000, region: 'Usmacinta', country: 'Mexico' },
  'Tzuncal': { lat: 20.0000, lng: -89.5000, region: 'North', country: 'Mexico' },
  'Caballo': { lat: 16.5000, lng: -89.0000, region: 'East', country: 'Guatemala' },
  'Xutilha': { lat: 16.0000, lng: -89.7000, region: 'Central', country: 'Guatemala' },
  'Xupa': { lat: 17.0000, lng: -91.5000, region: 'Usmacinta', country: 'Mexico' },
  'Xtablakal': { lat: 18.5000, lng: -89.5000, region: 'Central', country: 'Mexico' },
  'Xnaheb': { lat: 16.2000, lng: -89.0000, region: 'East', country: 'Belize' },
  'Tzendales': { lat: 16.8000, lng: -91.3000, region: 'Usmacinta', country: 'Mexico' },
  'El Pabellon': { lat: 16.4000, lng: -90.1000, region: 'Central', country: 'Guatemala' },
  'La Montura': { lat: 16.5000, lng: -89.5000, region: 'Central', country: 'Guatemala' },
  'La Lagunita': { lat: 15.4000, lng: -90.4000, region: 'South', country: 'Guatemala' },
  'Miraflores': { lat: 14.6000, lng: -90.5000, region: 'South', country: 'Guatemala' },
  'Anonal': { lat: 16.6000, lng: -90.3000, region: 'Central', country: 'Guatemala' },
  'El Abra': { lat: 16.5000, lng: -90.2000, region: 'Central', country: 'Guatemala' },
  'El Excavado': { lat: 17.5000, lng: -89.5000, region: 'Central', country: 'Guatemala' },
  'El Chicozapote': { lat: 17.7500, lng: -89.4500, region: 'Central', country: 'Guatemala' },
  'Corozal': { lat: 18.3833, lng: -88.3917, region: 'East', country: 'Belize' },
  'Zaculeu': { lat: 15.3333, lng: -91.5000, region: 'South', country: 'Guatemala' },
  'X Castillo': { lat: 18.5000, lng: -89.5000, region: 'Central', country: 'Mexico' },
  'Metate con Glifos': { lat: 17.0000, lng: -89.5000, region: 'Central', country: 'Guatemala' },
  'Mountain Cow': { lat: 16.8000, lng: -88.8000, region: 'East', country: 'Belize' },
  'Hormiguero': { lat: 18.3333, lng: -89.4167, region: 'Central', country: 'Mexico' },
  'Champerico': { lat: 16.4000, lng: -90.3000, region: 'Central', country: 'Guatemala' },
  'Ojo de Agua Chiapas': { lat: 17.0000, lng: -93.0000, region: 'Usmacinta', country: 'Mexico' },
  'San Jose': { lat: 17.2000, lng: -89.0000, region: 'East', country: 'Belize' },
  'El Caribe': { lat: 17.0000, lng: -89.1000, region: 'East', country: 'Belize' },
  'San Pedro': { lat: 17.5000, lng: -91.3000, region: 'Usmacinta', country: 'Mexico' },
  'San Lorenzo Campeche': { lat: 18.5000, lng: -90.2000, region: 'Central', country: 'Mexico' },
  'El Porvenir': { lat: 16.5000, lng: -90.3000, region: 'Central', country: 'Guatemala' },
  'Chalchuapa': { lat: 13.9833, lng: -89.6833, region: 'South', country: 'El Salvador' },
  'Bejucal': { lat: 17.0000, lng: -89.7000, region: 'Central', country: 'Guatemala' },
  'Chunhuitz': { lat: 16.9000, lng: -89.1000, region: 'East', country: 'Belize' },
  // East
  'Altun Ha': { lat: 17.7639, lng: -88.3475, region: 'East', country: 'Belize' },
  'Ucanal': { lat: 16.7500, lng: -89.3500, region: 'Central', country: 'Guatemala' },
  'Ixtutz': { lat: 16.6167, lng: -89.3333, region: 'East', country: 'Guatemala' },
  'Uxbenka': { lat: 16.2833, lng: -89.1000, region: 'East', country: 'Belize' },
  'Lubaantun': { lat: 16.2833, lng: -88.9500, region: 'East', country: 'Belize' },
  'Sufricaya': { lat: 17.2200, lng: -89.5000, region: 'Central', country: 'Guatemala' },
  'Ichpaatun': { lat: 18.5000, lng: -87.8000, region: 'East', country: 'Mexico' },
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
  // === Batch 3: All remaining unmapped prefixes (Peabody CMHI codes) ===
  OXK: 'Oxkintok',
  XLM: 'Xcalumkin',
  ITB: 'Itzimte-Bolonchen',
  ITS: 'Itsimte-Sacluk',
  CKL: 'Chinkultic',
  CRO: 'El Chorro',
  ALH: 'Altun Ha',
  SRX: 'Santa Rosa Xtampak',
  UCN: 'Ucanal',
  SUF: 'Sufricaya',
  HRZ: 'La Honradez',
  IXZ: 'Ixtutz',
  UXB: 'Uxbenka',
  CHT: 'El Chilonche',
  BNN: 'Bonampak',
  POL: 'Polol',
  MAR: 'La Mar',
  ZTZ: 'El Zotz',
  JMB: 'Jimbal',
  DBN: 'Dzibilnocac',
  KJU: 'Kaminaljuyu',
  BLK: 'Balakbal',
  LBT: 'Lubaantun',
  DZK: 'Dzehkabtun',
  CHP: 'Champerico',
  MCA: 'La Muneca',
  IXL: 'Ixlu',
  TZM: 'Tzum',
  KJT: 'Kaminaljuyu',
  SEP: 'Santa Elena Poco Uinic',
  ENC: 'El Encanto',
  XCA: 'Xcocha',
  MCW: 'Mountain Cow',
  PSD: 'La Pasadita',
  NKB: 'Nakbe',
  OBR: 'Obregon',
  UOL: 'Uolantun',
  LMN: 'Lamanai',
  JLN: 'Joloniel',
  ZPT: 'Zacpeten',
  TPX: 'Topoxte',
  PBT: 'El Pabellon',
  RBC: 'Rio Bec',
  MLC: 'Mulchic',
  HIG: 'Los Higos',
  NKM: 'Nakum',
  CNK: 'Chinikiha',
  CHL: 'El Chal',
  TRC: 'Santa Rita Corozal',
  JOY: 'La Joyanca',
  STE: 'Santa Elena',
  SBO: 'San Bartolo',
  JUL: 'El Juleque',
  ICC: 'Ichmac',
  HLL: 'Halal',
  HLK: 'Halakal',
  CBV: 'Coba',
  TMB: 'El Temblor',
  HWS: 'Los Higos',
  AGC: 'Aguas Calientes',
  CDZ: 'Candzibaantun',
  CLP: 'Cahal Pech',
  SNT: 'Sacnicte',
  CUY: 'Cuychen',
  XCR: 'Xcorralche',
  ICL: 'Ichmul',
  ICP: 'Ichpaatun',
  ALR: 'Altar de los Reyes',
  SIS: 'Sisilha',
  MPN: 'Mayapan',
  CTP: 'Chuctiepa',
  SRC: 'Santa Rita Corozal',
  PIX: 'Pixoy',
  ATE: 'Altamira',
  SDP: 'San Pedro',
  SCN: 'Sacchana',
  YOK: 'Yaxha',
  XCK: 'Xcochkax',
  NAY: 'La Naya',
  DZL: 'Dzilam',
  BJC: 'Bejucal',
  NPT: 'Nohpat',
  FLS: 'Flores',
  TET: 'Tayasal',
  OAG: 'Ojo de Agua Chiapas',
  ACA: 'Aguateca',
  TZC: 'Tayasal',
  SJS: 'San Jose',
  PDA: 'La Pasadita',
  HTZ: 'Hotzuc',
  HBM: 'Hobomo',
  CRB: 'El Caribe',
  SPD: 'San Pedro',
  XUP: 'Xupa',
  XTB: 'Xtablakal',
  XNH: 'Xnaheb',
  XKB: 'Xkombec',
  TSL: 'Tayasal',
  TPN: 'Topoxte',
  IKL: 'Ikil',
  CNZ: 'Chunhuitz',
  TZD: 'Tzendales',
  TCK: 'Tohcok',
  PAB: 'El Pabellon',
  MTR: 'La Montura',
  LAG: 'La Lagunita',
  MRF: 'Miraflores',
  ANL: 'Anonal',
  ACH: 'Aguateca',
  ABR: 'El Abra',
  HNY: 'La Honradez',
  WTZ: 'Uxmal',
  EXC: 'El Excavado',
  CZP: 'El Chicozapote',
  UKM: 'Ukum',
  PNH: 'Panhale',
  HNT: 'Huntichmul',
  CRZ: 'Corozal',
  ZAC: 'Zaculeu',
  YXP: 'Yaxcopoil',
  YXM: 'Yaxhom',
  TUN: 'Tunkuyi',
  TNH: 'La Honradez',
  XCS: 'X Castillo',
  TCL: 'Tayasal',
  MRD: 'El Mirador',
  CRU: 'La Corona',
  YLT: 'Yaltutu',
  YKL: 'Yakalxiu',
  UYM: 'Uaymil',
  TNT: 'Tintal',
  MCG: 'Metate con Glifos',
  KND: 'El Kinel',
  JNT: 'Jonuta',
  CNB: 'Chuncanob',
  CMT: 'El Temblor',
  ALM: 'Altamira',
  XTL: 'Xutilha',
  TNR: 'Tenam Rosario',
  SBR: 'San Bartolo',
  NCC: 'Nohcacab II',
  LAB: 'Labna',
  BME: 'Blackman Eddy',
  YTM: 'Yaxha',
  SDM: 'Santo Domingo',
  CLC: 'Chalchuapa',
  CHY: 'Chichen Itza',
  CCB: 'Coba',
  SDC: 'Santo Domingo',
  PMA: 'El Palma',
  KIN: 'El Kinel',
  CNJ: 'Chinaja',
  CHC: 'Chicanna',
  CCA: 'Chancala',
  SAL: 'Salinas de los Nuevos Cerros',
  PMB: 'Pomona Belize',
  KPH: 'Cahal Pech',
  HUA: 'Huacutal',
  HMB: 'Hobomo',
  XNC: 'Xnucbec',
  XBU: 'Uxbenka',
  TBI: 'Tabi',
  PCH: 'Punta Chimino',
  LPM: 'Lopez Mateos',
  KYL: 'Kayal',
  CPH: 'Cumpich',
  SLM: 'San Lorenzo Campeche',
  PVR: 'El Porvenir',
  LOL: 'Loltun',
  IXT: 'Ixtonton',
  CHB: 'Chacchoben',
  CFC: 'Campeche',
  ASU: 'Aguateca',
  OXL: 'Oxlahuntun',
  KIC: 'Cahal Pech',
  CHH: 'Chak Ho Be',
  AMC: 'Almuchil',
  AGA: 'Aguacate',
  TNN: 'Tonina',
  TCH: 'Techoh',
  PLC: 'Playa del Carmen',
  LPL: 'Labna',
  CNS: 'Chuncanob',
  XSK: 'Xcocha',
  TZI: 'Tzendales',
  TLH: 'Tayasal',
  RND: 'Rio Bec',
  PHC: 'Punta Chimino',
  CET: 'Seibal',
  CCM: 'Campeche',
  BCN: 'Becan',
  MLS: 'Muluch Tsekal',
  KKB: 'Kabah',
  KHL: 'Kabah',
  CTN: 'Coba',
  CPL: 'Chapayal',
  BOL: 'Polol',
  YXL: 'Yaxchilan',
  UNK: 'Unknown',
  TZN: 'Tzuncal',
  CAB: 'Caballo',
  BLL: 'Bellote',
  JAI: 'Jaina',
  LAC: 'Lacanha',
  BKP: 'Bonampak',
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
