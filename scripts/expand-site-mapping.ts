import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// EXPANDED SITE MAPPING - Major Maya archaeological sites
const MAYA_SITES: Record<string, { name: string; region: string; lat: number; lng: number }> = {
  // Original 20 sites
  'PAL': { name: 'Palenque', region: 'Usmacinta', lat: 17.4839, lng: -92.0460 },
  'TIK': { name: 'Tikal', region: 'Central', lat: 17.2221, lng: -89.6236 },
  'YAX': { name: 'Yaxchilan', region: 'Usmacinta', lat: 16.8989, lng: -91.0000 },
  'PNG': { name: 'Piedras Negras', region: 'Usmacinta', lat: 17.1500, lng: -91.0167 },
  'CPN': { name: 'Copan', region: 'East', lat: 14.8403, lng: -89.1422 },
  'CRN': { name: 'Caracol', region: 'Central', lat: 16.7631, lng: -89.1178 },
  'QRG': { name: 'Quirigua', region: 'East', lat: 15.2722, lng: -89.0292 },
  'COB': { name: 'Coba', region: 'North', lat: 20.4950, lng: -87.7339 },
  'MAD': { name: 'Madrid Codex', region: 'North', lat: 20.0000, lng: -89.0000 },
  'DRE': { name: 'Dresden Codex', region: 'North', lat: 20.0000, lng: -89.0000 },
  'PAR': { name: 'Paris Codex', region: 'North', lat: 20.0000, lng: -89.0000 },
  'NAR': { name: 'Naranjo', region: 'Central', lat: 17.1333, lng: -89.2167 },
  'DPL': { name: 'Dos Pilas', region: 'Central', lat: 16.5000, lng: -90.2167 },
  'TRT': { name: 'Tortuguero', region: 'Usmacinta', lat: 17.6167, lng: -92.9167 },
  'ITN': { name: 'Itzimte', region: 'Central', lat: 16.7833, lng: -89.6833 },
  'COL': { name: 'Calakmul', region: 'Central', lat: 18.1050, lng: -89.8119 },
  'CRC': { name: 'Caracol', region: 'Central', lat: 16.7631, lng: -89.1178 },
  'BKP': { name: 'Bonampak', region: 'Usmacinta', lat: 16.7033, lng: -91.0636 },
  'UAXB': { name: 'Uaxactun', region: 'Central', lat: 17.3986, lng: -89.6336 },
  'MRL': { name: 'Moral', region: 'Usmacinta', lat: 16.8500, lng: -91.1000 },
  'PLM': { name: 'Palenque', region: 'Usmacinta', lat: 17.4839, lng: -92.0460 },
  
  // NEW SITES - Based on your unmapped codes
  'AGT': { name: 'Aguateca', region: 'Central', lat: 16.4167, lng: -90.1833 },
  'ALH': { name: 'La Honradez', region: 'Central', lat: 16.4500, lng: -90.2000 },
  'ALC': { name: 'Altar de Sacrificios', region: 'Usmacinta', lat: 16.0000, lng: -90.5000 },
  'ABR': { name: 'El Cayo', region: 'Usmacinta', lat: 16.7500, lng: -90.8333 },
  'ACA': { name: 'Acanceh', region: 'North', lat: 20.8167, lng: -89.4500 },
  'ACAS': { name: 'Acasaguastlan', region: 'East', lat: 14.9333, lng: -89.9667 },
  'ACH': { name: 'Ixlu', region: 'Central', lat: 17.0000, lng: -89.5000 },
  'ACN': { name: 'Acanceh', region: 'North', lat: 20.8167, lng: -89.4500 },
  'AGAA': { name: 'Aguateca', region: 'Central', lat: 16.4167, lng: -90.1833 },
  'AGC': { name: 'Aguateca', region: 'Central', lat: 16.4167, lng: -90.1833 },
  'ALM': { name: 'El Palmar', region: 'Usmacinta', lat: 17.6000, lng: -91.7000 },
  'ALS': { name: 'Altar de Sacrificios', region: 'Usmacinta', lat: 16.0000, lng: -90.5000 },
  'ARE': { name: 'Arroyo de Piedra', region: 'Central', lat: 16.3833, lng: -90.1167 },
  'ARL': { name: 'El Achiotal', region: 'Central', lat: 17.3500, lng: -89.7000 },
  'BEL': { name: 'Belize', region: 'East', lat: 17.2500, lng: -88.7500 },
  'BNA': { name: 'Bonampak', region: 'Usmacinta', lat: 16.7033, lng: -91.0636 },
  'CAK': { name: 'Calakmul', region: 'Central', lat: 18.1050, lng: -89.8119 },
  'CAN': { name: 'Cancuen', region: 'Central', lat: 16.0333, lng: -90.0833 },
  'CHN': { name: 'Chichen Itza', region: 'North', lat: 20.6843, lng: -88.5678 },
  'CHL': { name: 'Chinkultic', region: 'South', lat: 16.1667, lng: -92.0000 },
  'CHK': { name: 'Chichen Itza', region: 'North', lat: 20.6843, lng: -88.5678 },
  'CMY': { name: 'Calakmul', region: 'Central', lat: 18.1050, lng: -89.8119 },
  'EKB': { name: 'Ek Balam', region: 'North', lat: 21.1483, lng: -88.0933 },
  'EZN': { name: 'Edzna', region: 'North', lat: 19.5950, lng: -90.2333 },
  'HOL': { name: 'Holmul', region: 'Central', lat: 17.2333, lng: -89.3167 },
  'IXK': { name: 'Ixkun', region: 'Central', lat: 16.9167, lng: -89.4167 },
  'IXL': { name: 'Ixlu', region: 'Central', lat: 17.0000, lng: -89.5000 },
  'IXT': { name: 'Ixtonton', region: 'Central', lat: 16.7500, lng: -89.5833 },
  'JNA': { name: 'La Joyanca', region: 'Central', lat: 17.3667, lng: -90.0833 },
  'KNA': { name: 'Kaminaljuyu', region: 'South', lat: 14.6167, lng: -90.5500 },
  'LAM': { name: 'Lamanai', region: 'East', lat: 17.7569, lng: -88.6525 },
  'LMR': { name: 'La Mar', region: 'Usmacinta', lat: 16.4833, lng: -91.5833 },
  'LXT': { name: 'Lubaantun', region: 'East', lat: 16.2917, lng: -88.9669 },
  'MCH': { name: 'Machaquila', region: 'Central', lat: 16.4000, lng: -89.7833 },
  'MTL': { name: 'Motul de San Jose', region: 'Central', lat: 17.0333, lng: -89.7667 },
  'NMT': { name: 'Nimli Punit', region: 'East', lat: 16.4500, lng: -88.8333 },
  'OXK': { name: 'Oxkintok', region: 'North', lat: 20.5667, lng: -90.0333 },
  'POM': { name: 'Pomoná', region: 'Usmacinta', lat: 17.4667, lng: -91.9333 },
  'PUS': { name: 'Pusila', region: 'East', lat: 16.3000, lng: -89.0500 },
  'RIO': { name: 'Rio Azul', region: 'Central', lat: 17.7500, lng: -89.2500 },
  'SAC': { name: 'Sacul', region: 'Central', lat: 16.9167, lng: -89.6667 },
  'SAY': { name: 'Sayil', region: 'North', lat: 20.1833, lng: -89.6500 },
  'SBL': { name: 'Seibal', region: 'Central', lat: 16.5167, lng: -90.1500 },
  'TAM': { name: 'Tamarindito', region: 'Central', lat: 16.4167, lng: -90.2833 },
  'TKL': { name: 'Toniná', region: 'South', lat: 16.9000, lng: -92.0167 },
  'TNA': { name: 'Toniná', region: 'South', lat: 16.9000, lng: -92.0167 },
  'UAX': { name: 'Uaxactun', region: 'Central', lat: 17.3986, lng: -89.6336 },
  'UCA': { name: 'Ucanal', region: 'Central', lat: 16.9500, lng: -89.5833 },
  'UXM': { name: 'Uxmal', region: 'North', lat: 20.3617, lng: -89.7714 },
  'WKA': { name: 'Waka', region: 'Central', lat: 17.4833, lng: -90.4000 },
  'XLT': { name: 'Xultun', region: 'Central', lat: 17.7333, lng: -89.5000 },
  'XTM': { name: 'Xtampak', region: 'North', lat: 19.2500, lng: -89.6167 },
  'XUN': { name: 'Xunantunich', region: 'East', lat: 17.0900, lng: -89.1400 },
};

function extractSiteCode(artifactCode: string): string | null {
  if (!artifactCode || artifactCode === '_' || artifactCode === 'UNKNOWN') return null;
  
  // Try to extract site prefix
  const match = artifactCode.match(/^([A-Z]+)/);
  if (!match) return null;
  
  const prefix = match[1];
  
  // Try exact match first
  if (MAYA_SITES[prefix]) return prefix;
  
  // Try progressively shorter prefixes
  for (let len = prefix.length; len >= 3; len--) {
    const partial = prefix.substring(0, len);
    if (MAYA_SITES[partial]) return partial;
  }
  
  return null;
}

async function updateWithExpandedMapping() {
  console.log('Updating blocks with expanded site mapping...\n');
  
  const unmapped = await db.execute(`
    SELECT id, artifact_code
    FROM blocks
    WHERE region IS NULL 
      AND artifact_code IS NOT NULL 
      AND artifact_code != '' 
      AND artifact_code != '_'
      AND artifact_code != 'UNKNOWN'
  `);
  
  console.log(`Processing ${unmapped.rows.length} unmapped blocks...\n`);
  
  let newlyMapped = 0;
  let stillUnmapped = 0;
  
  for (const block of unmapped.rows) {
    const artifactCode = String(block.artifact_code);
    const siteCode = extractSiteCode(artifactCode);
    
    if (siteCode && MAYA_SITES[siteCode]) {
      const site = MAYA_SITES[siteCode];
      await db.execute({
        sql: `
          UPDATE blocks
          SET site_code = ?,
              site_name = ?,
              region = ?,
              latitude = ?,
              longitude = ?
          WHERE id = ?
        `,
        args: [siteCode, site.name, site.region, site.lat, site.lng, block.id]
      });
      newlyMapped++;
      
      if (newlyMapped % 5000 === 0) {
        console.log(`Mapped ${newlyMapped} additional blocks...`);
      }
    } else {
      stillUnmapped++;
    }
  }
  
  console.log(`\n✓ Complete!`);
  console.log(`  Newly mapped: ${newlyMapped.toLocaleString()}`);
  console.log(`  Still unmapped: ${stillUnmapped.toLocaleString()}`);
  
  // Show final summary
  const summary = await db.execute(`
    SELECT region, COUNT(*) as count
    FROM blocks
    WHERE region IS NOT NULL
    GROUP BY region
    ORDER BY count DESC
  `);
  
  const total = await db.execute(`SELECT COUNT(*) as count FROM blocks`);
  const mapped = await db.execute(`SELECT COUNT(*) as count FROM blocks WHERE region IS NOT NULL`);
  
  console.log(`\nFinal distribution by region:`);
  summary.rows.forEach(row => {
    console.log(`  ${String(row.region).padEnd(15)} ${Number(row.count).toLocaleString()}`);
  });
  
  const coverage = (Number(mapped.rows[0].count) / Number(total.rows[0].count) * 100).toFixed(1);
  console.log(`\nTotal coverage: ${Number(mapped.rows[0].count).toLocaleString()} / ${Number(total.rows[0].count).toLocaleString()} (${coverage}%)`);
}

updateWithExpandedMapping().catch(console.error);
