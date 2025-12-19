import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Site mapping (paste your working mapping here)
const MAYA_SITES: Record<string, { name: string; region: string; lat: number; lng: number }> = {
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
};

function extractSiteCode(artifactCode: string): string | null {
  if (!artifactCode || artifactCode === '_') return null;
  const match = artifactCode.match(/^([A-Z]+)/);
  return match ? match[1] : null;
}

async function addGeographicData() {
  console.log('Adding geographic columns to blocks table...\n');
  
  // Add columns if they don't exist
  try {
    await db.execute(`ALTER TABLE blocks ADD COLUMN site_code TEXT`);
    await db.execute(`ALTER TABLE blocks ADD COLUMN site_name TEXT`);
    await db.execute(`ALTER TABLE blocks ADD COLUMN region TEXT`);
    await db.execute(`ALTER TABLE blocks ADD COLUMN latitude REAL`);
    await db.execute(`ALTER TABLE blocks ADD COLUMN longitude REAL`);
    console.log('✓ Columns added successfully');
  } catch (err: any) {
    if (err.message?.includes('duplicate column')) {
      console.log('✓ Columns already exist');
    } else {
      throw err;
    }
  }
  
  // Get all blocks with artifact codes
  const blocks = await db.execute(`
    SELECT id, artifact_code
    FROM blocks
    WHERE artifact_code IS NOT NULL AND artifact_code != ''
  `);
  
  console.log(`\nProcessing ${blocks.rows.length} blocks...\n`);
  
  let mapped = 0;
  let unmapped = 0;
  const unmappedSites = new Set<string>();
  
  for (const block of blocks.rows) {
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
      mapped++;
      
      if (mapped % 5000 === 0) {
        console.log(`Processed ${mapped} blocks...`);
      }
    } else {
      unmapped++;
      if (siteCode) unmappedSites.add(siteCode);
    }
  }
  
  console.log(`\n✓ Complete!`);
  console.log(`  Mapped: ${mapped.toLocaleString()}`);
  console.log(`  Unmapped: ${unmapped.toLocaleString()}`);
  
  if (unmappedSites.size > 0) {
    console.log(`\nUnmapped site codes (top 20):`);
    Array.from(unmappedSites).slice(0, 20).forEach(code => {
      console.log(`  - ${code}`);
    });
  }
  
  // Show summary
  const summary = await db.execute(`
    SELECT region, COUNT(*) as count
    FROM blocks
    WHERE region IS NOT NULL
    GROUP BY region
    ORDER BY count DESC
  `);
  
  console.log(`\nBlocks by region:`);
  summary.rows.forEach(row => {
    console.log(`  ${String(row.region).padEnd(15)} ${Number(row.count).toLocaleString()}`);
  });
}

addGeographicData().catch(console.error);
