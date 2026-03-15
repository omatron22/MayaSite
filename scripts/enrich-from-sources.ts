// scripts/enrich-from-sources.ts
// Comprehensive enrichment pass: fills every gap we can from existing data sources.
// Run with: npx tsx scripts/enrich-from-sources.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../api/lib/db.ts';
import { readFileSync } from 'fs';

const BATCH_SIZE = 80;

async function batchUpdate(updates: { sql: string; args: unknown[] }[]) {
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    try {
      await db.batch(batch, 'write');
    } catch {
      // Retry individually on failure
      for (const u of batch) {
        try { await db.execute(u); } catch { /* skip */ }
      }
    }
  }
}

// ────────────────────────────────────────────────
// 1. graphemes.assigned_by = 'MHD' for all rows
// ────────────────────────────────────────────────
async function enrichGraphemesAssignedBy() {
  console.log('\n=== 1. Setting graphemes.assigned_by ===');
  const result = await db.execute(
    `UPDATE graphemes SET assigned_by = 'MHD' WHERE assigned_by IS NULL`
  );
  console.log(`  Updated ${result.rowsAffected} graphemes with assigned_by = 'MHD'`);
}

// ────────────────────────────────────────────────
// 2. graphs.medium — derive from artefact materials
// ────────────────────────────────────────────────
async function enrichGraphsMedium() {
  console.log('\n=== 2. Enriching graphs.medium from artefact materials ===');

  const raw = JSON.parse(readFileSync('data/classicmayan-raw.json', 'utf-8'));

  // Build material lookup: URI → label
  const matMap = new Map<string, string>();
  for (const m of raw.materials) {
    matMap.set(m.id, m.label);
  }

  // Build artefact → primary material lookup
  const artMaterial = new Map<string, string>();
  for (const a of raw.artefacts) {
    if (a.materials && a.materials.length > 0) {
      // Pick the most specific material (skip pigments, prefer stone/ceramic)
      const labels = a.materials.map((mid: string) => matMap.get(mid) || '').filter(Boolean);
      const primary = labels.find((l: string) => !l.includes('pigment') && l !== 'paint') || labels[0];
      if (primary) artMaterial.set(String(a.id), primary);
    }
  }

  // Map medium labels to simplified categories
  function simplifyMedium(label: string): string {
    if (label.includes('limestone') || label.includes('sandstone') || label.includes('tuff') ||
        label.includes('mudstone') || label.includes('carbonate') || label.includes('slate') ||
        label.includes('alabaster') || label.includes('travertine') || label === 'stone (material)')
      return 'carved';
    if (label.includes('ceramic') || label === 'clay') return 'ceramic';
    if (label.includes('stucco') || label.includes('plaster')) return 'stucco';
    if (label.includes('bone')) return 'carved';
    if (label.includes('shell') || label.includes('jadeite')) return 'carved';
    if (label.includes('wood')) return 'carved';
    if (label.includes('pigment') || label === 'paint' || label.includes('cinnabar')) return 'painted';
    return label;
  }

  // For each graph in raw data, determine dominant medium from its artefacts
  const graphMedium = new Map<string, string>();
  for (const g of raw.graphs) {
    if (!g.artefacts || g.artefacts.length === 0) continue;
    const mediums: Record<string, number> = {};
    for (const artId of g.artefacts) {
      const mat = artMaterial.get(String(artId));
      if (mat) {
        const simplified = simplifyMedium(mat);
        mediums[simplified] = (mediums[simplified] || 0) + 1;
      }
    }
    // Pick most common medium for this graph
    const sorted = Object.entries(mediums).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      graphMedium.set(g.graphNo, sorted[0][0]);
    }
  }

  console.log(`  Derived medium for ${graphMedium.size} graphs from artefact materials`);

  // Match to DB graphs by TWKM entry + variant suffix
  const signs = JSON.parse(readFileSync('data/classicmayan-signs.json', 'utf-8'));
  const updates: { sql: string; args: unknown[] }[] = [];

  for (const sign of signs) {
    if (!sign.graphs) continue;
    for (const g of sign.graphs) {
      const graphNo = g.graph_code || `${sign.sign_number}${g.variant || 'st'}`;
      const medium = graphMedium.get(graphNo);
      if (medium) {
        const graphId = `twkm-graph-${graphNo}`;
        updates.push({
          sql: `UPDATE graphs SET medium = ? WHERE graph_id = ? AND medium IS NULL`,
          args: [medium, graphId],
        });
      }
    }
  }

  await batchUpdate(updates);
  console.log(`  Sent ${updates.length} medium updates`);
}

// ────────────────────────────────────────────────
// 3. graphs.notes + catalog_entries.notes — from comments/descriptions
// ────────────────────────────────────────────────
async function enrichNotesFromClassicMayan() {
  console.log('\n=== 3. Enriching notes from ClassicMayan comments/descriptions ===');

  const raw = JSON.parse(readFileSync('data/classicmayan-raw.json', 'utf-8'));
  const updates: { sql: string; args: unknown[] }[] = [];

  let signNotesCount = 0;
  let graphNotesCount = 0;

  for (const sign of raw.signs) {
    const entryId = `twkm-${sign.sign_number}`;

    // Sign-level comments → catalog_entries.notes
    const comments = (sign.comments || []).filter((c: string) => c && c.trim());
    const descriptions = (sign.descriptions || []).filter((d: string) => d && d.trim());
    const noteText = [...comments, ...descriptions].join(' | ');

    if (noteText) {
      updates.push({
        sql: `UPDATE catalog_entries SET notes = ? WHERE entry_id = ? AND (notes IS NULL OR notes = '')`,
        args: [noteText.slice(0, 2000), entryId],
      });
      signNotesCount++;
    }

    // Graph-level comments → graphs.notes
    if (sign.graphs) {
      for (const g of sign.graphs) {
        const graphComments = (g.comment || []).filter((c: string) => c && c.trim());
        const graphDescs = (g.description || []).filter((d: string) => d && d.trim());
        const graphNote = [...graphComments, ...graphDescs].join(' | ');

        if (graphNote) {
          const graphId = `twkm-graph-${g.graph_code || g.graphNo || sign.sign_number + (g.variant || 'st')}`;
          updates.push({
            sql: `UPDATE graphs SET notes = ? WHERE graph_id = ? AND (notes IS NULL OR notes = '')`,
            args: [graphNote.slice(0, 2000), graphId],
          });
          graphNotesCount++;
        }
      }
    }
  }

  await batchUpdate(updates);
  console.log(`  Sign notes: ${signNotesCount}, Graph notes: ${graphNotesCount}`);
}

// ────────────────────────────────────────────────
// 4. catalog_entries.function_variant — from MHD usage1
// ────────────────────────────────────────────────
async function enrichMhdFunctionVariant() {
  console.log('\n=== 4. Enriching MHD function_variant from usage1 ===');

  const catalog = JSON.parse(readFileSync('data/mhd-catalog-all.json', 'utf-8'));
  const updates: { sql: string; args: unknown[] }[] = [];

  for (const sign of catalog) {
    if (!sign.usage1 || !sign.usage1.trim()) continue;
    const entryId = `mhd-${sign.codeid}`;
    updates.push({
      sql: `UPDATE catalog_entries SET function_variant = ? WHERE entry_id = ? AND function_variant IS NULL`,
      args: [sign.usage1.trim(), entryId],
    });
  }

  await batchUpdate(updates);
  console.log(`  Updated ${updates.length} entries with function_variant (usage type)`);
}

// ────────────────────────────────────────────────
// 5. CMGG translations → catalog_entries.gloss_english
// ────────────────────────────────────────────────
async function enrichCmggTranslations() {
  console.log('\n=== 5. Enriching CMGG entries with translations ===');

  const lmgg = JSON.parse(readFileSync('data/lmgg-concordance.json', 'utf-8'));
  const twkmEntries = lmgg.twkm || [];
  const updates: { sql: string; args: unknown[] }[] = [];

  for (const entry of twkmEntries) {
    if (!entry.cmgg_translation || !entry.cmgg_values) continue;

    for (const cmggVal of entry.cmgg_values) {
      // CMGG entries were created with IDs like cmgg-{value}
      const entryId = `cmgg-${cmggVal.replace(/[^a-zA-Z0-9]/g, '_')}`;
      updates.push({
        sql: `UPDATE catalog_entries SET gloss_english = ? WHERE entry_id = ? AND gloss_english IS NULL`,
        args: [entry.cmgg_translation, entryId],
      });
    }
  }

  await batchUpdate(updates);
  console.log(`  Sent ${updates.length} CMGG translation updates`);
}

// ────────────────────────────────────────────────
// 6. MHD detailed readings from LMGG → catalog_entries.reading_value
// ────────────────────────────────────────────────
async function enrichMhdReadings() {
  console.log('\n=== 6. Enriching MHD entries with detailed readings from LMGG ===');

  const lmgg = JSON.parse(readFileSync('data/lmgg-concordance.json', 'utf-8'));
  const twkmEntries = lmgg.twkm || [];

  // Build MHD code → entry_id mapping from source JSON (deterministic IDs)
  // LMGG uses short graphcode format (e.g. HE6, 1B9), not newcodesub (e.g. 00101)
  const catalog = JSON.parse(readFileSync('data/mhd-catalog-all.json', 'utf-8'));
  const mhdCodeToId = new Map<string, string>();
  for (const sign of catalog) {
    if (sign.graphcode) mhdCodeToId.set(sign.graphcode, `mhd-${sign.id}`);
    // Also map by codeid (numeric MHD code) and newcodesub
    const codeid = String(sign.codeid);
    if (codeid) mhdCodeToId.set(codeid, `mhd-${sign.id}`);
    if (sign.newcodesub) mhdCodeToId.set(sign.newcodesub, `mhd-${sign.id}`);
  }

  const updates: { sql: string; args: unknown[] }[] = [];

  for (const entry of twkmEntries) {
    if (!entry.mhd_readings) continue;
    for (const [mhdCode, reading] of Object.entries(entry.mhd_readings)) {
      if (!reading) continue;
      const entryId = mhdCodeToId.get(mhdCode);
      if (entryId) {
        updates.push({
          sql: `UPDATE catalog_entries SET reading_value = ? WHERE entry_id = ? AND reading_value IS NULL`,
          args: [String(reading), entryId],
        });
      }
    }
  }

  await batchUpdate(updates);
  console.log(`  Sent ${updates.length} MHD reading updates`);
}

// ────────────────────────────────────────────────
// 7. Decipherment criteria → catalog_entries.notes (append)
// ────────────────────────────────────────────────
async function enrichDeciphermentCriteria() {
  console.log('\n=== 7. Enriching TWKM entries with decipherment criteria ===');

  const signs = JSON.parse(readFileSync('data/classicmayan-signs.json', 'utf-8'));
  const updates: { sql: string; args: unknown[] }[] = [];

  for (const sign of signs) {
    if (!sign.decipherments) continue;
    for (const d of sign.decipherments) {
      if (!d.criteria || d.criteria.length === 0) continue;
      const criteriaText = `Decipherment criteria: ${d.criteria.join(', ')}`;
      const entryId = `twkm-${sign.sign_number}`;
      // Append to notes if not already there
      updates.push({
        sql: `UPDATE catalog_entries SET notes = CASE
                WHEN notes IS NULL OR notes = '' THEN ?
                WHEN notes NOT LIKE '%Decipherment criteria%' THEN notes || ' | ' || ?
                ELSE notes
              END
              WHERE entry_id = ?`,
        args: [criteriaText, criteriaText, entryId],
      });
      break; // One criteria set per sign is enough
    }
  }

  await batchUpdate(updates);
  console.log(`  Sent ${updates.length} criteria updates`);
}

// ────────────────────────────────────────────────
// 8. MHD lexcode → catalog_entries.gloss_mayan
// ────────────────────────────────────────────────
async function enrichMhdLexcode() {
  console.log('\n=== 8. Enriching MHD entries with lexcode → gloss_mayan ===');

  const catalog = JSON.parse(readFileSync('data/mhd-catalog-all.json', 'utf-8'));
  const updates: { sql: string; args: unknown[] }[] = [];

  for (const sign of catalog) {
    if (!sign.lexcode || !sign.lexcode.trim()) continue;
    const entryId = `mhd-${sign.codeid}`;
    updates.push({
      sql: `UPDATE catalog_entries SET gloss_mayan = ? WHERE entry_id = ? AND gloss_mayan IS NULL`,
      args: [sign.lexcode.trim(), entryId],
    });
  }

  await batchUpdate(updates);
  console.log(`  Updated ${updates.length} entries with gloss_mayan (lexcode)`);
}

// ────────────────────────────────────────────────
// 9. TWKM concordances → additional concordance links
//    (from classicmayan-signs.json concordances array, not the TWKM raw concordance)
// ────────────────────────────────────────────────
async function enrichTwkmConcordanceDetails() {
  console.log('\n=== 9. Checking TWKM concordance data for missing links ===');

  const signs = JSON.parse(readFileSync('data/classicmayan-signs.json', 'utf-8'));

  // Count total concordance entries
  let totalConc = 0;
  const catalogNames = new Set<string>();
  for (const sign of signs) {
    if (sign.concordances) {
      totalConc += sign.concordances.length;
      for (const c of sign.concordances) {
        catalogNames.add(c.catalog_name);
      }
    }
  }
  console.log(`  Total concordance entries in signs JSON: ${totalConc}`);
  console.log(`  Catalogs referenced: ${[...catalogNames].join(', ')}`);
  console.log(`  (These were already imported via import-twkm-concordances.ts)`);
}

// ────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────
async function main() {
  console.log('=== Comprehensive Data Enrichment ===\n');
  console.log('This script fills gaps from data already in our source files.\n');

  const steps = [
    enrichGraphemesAssignedBy,
    enrichGraphsMedium,
    enrichNotesFromClassicMayan,
    enrichMhdFunctionVariant,
    enrichCmggTranslations,
    enrichMhdReadings,
    enrichDeciphermentCriteria,
    enrichMhdLexcode,
    enrichTwkmConcordanceDetails,
  ];

  for (const step of steps) {
    try {
      await step();
    } catch (err) {
      console.error(`  ERROR in ${step.name}: ${err}`);
      console.log('  Waiting 10s before next step (rate limit)...');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  // Final verification
  console.log('\n=== Final Verification ===');

  const checks = await Promise.all([
    db.execute(`SELECT COUNT(*) as c FROM graphemes WHERE assigned_by IS NOT NULL`),
    db.execute(`SELECT COUNT(*) as c FROM graphs WHERE medium IS NOT NULL`),
    db.execute(`SELECT COUNT(*) as c FROM catalog_entries WHERE notes IS NOT NULL AND notes != ''`),
    db.execute(`SELECT COUNT(*) as c FROM catalog_entries WHERE function_variant IS NOT NULL`),
    db.execute(`SELECT COUNT(*) as c FROM catalog_entries WHERE gloss_mayan IS NOT NULL`),
    db.execute(`SELECT COUNT(*) as c FROM catalog_entries WHERE reading_value IS NOT NULL`),
    db.execute(`SELECT COUNT(*) as c FROM catalog_entries WHERE gloss_english IS NOT NULL`),
  ]);

  console.log(`  graphemes.assigned_by:  ${checks[0].rows[0].c}`);
  console.log(`  graphs.medium:          ${checks[1].rows[0].c}`);
  console.log(`  entries with notes:     ${checks[2].rows[0].c}`);
  console.log(`  entries function_variant:${checks[3].rows[0].c}`);
  console.log(`  entries gloss_mayan:    ${checks[4].rows[0].c}`);
  console.log(`  entries reading_value:  ${checks[5].rows[0].c}`);
  console.log(`  entries gloss_english:  ${checks[6].rows[0].c}`);

  console.log('\n=== Enrichment Complete ===');
}

main().catch(console.error);
