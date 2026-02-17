import * as fs from 'fs';

// Check lmgg-crossref.json
console.log('=== lmgg-crossref.json ===');
const crossref = JSON.parse(fs.readFileSync('data/lmgg-crossref.json', 'utf-8'));
console.log(`Total entries: ${crossref.length}`);
console.log(`Fields: ${Object.keys(crossref[0]).join(', ')}`);
console.log(`Sample:`, JSON.stringify(crossref[0], null, 2));

const fieldCounts: Record<string, number> = {};
for (const entry of crossref) {
  for (const [key, value] of Object.entries(entry)) {
    if (value && (typeof value !== 'object' || (Array.isArray(value) && (value as unknown[]).length > 0))) {
      fieldCounts[key] = (fieldCounts[key] || 0) + 1;
    }
  }
}
console.log('\nField coverage:');
for (const [key, count] of Object.entries(fieldCounts).sort(([,a], [,b]) => b - a)) {
  console.log(`  ${key}: ${count}/${crossref.length} (${((count/crossref.length)*100).toFixed(1)}%)`);
}

// Check what cmgg_values look like
console.log('\n=== CMGG VALUES SAMPLES ===');
const withCmgg = crossref.filter((e: any) => e.cmgg_values && e.cmgg_values.length > 0);
console.log(`Entries with CMGG values: ${withCmgg.length}`);
for (const entry of withCmgg.slice(0, 10)) {
  console.log(`  ${entry.mhd_code}: ${JSON.stringify(entry.cmgg_values)}`);
}

// Check what pronunciation looks like
console.log('\n=== PRONUNCIATION SAMPLES ===');
const withPron = crossref.filter((e: any) => e.pronunciation);
console.log(`Entries with pronunciation: ${withPron.length}`);
for (const entry of withPron.slice(0, 10)) {
  console.log(`  ${entry.mhd_code}: "${entry.pronunciation}"`);
}

// Check lmgg-concordance.json  
console.log('\n\n=== lmgg-concordance.json ===');
try {
  const concordance = JSON.parse(fs.readFileSync('data/lmgg-concordance.json', 'utf-8'));
  console.log(`Total entries: ${concordance.length}`);
  if (concordance.length > 0) {
    console.log(`Fields: ${Object.keys(concordance[0]).join(', ')}`);
    console.log(`Sample:`, JSON.stringify(concordance[0], null, 2));
    
    const fc2: Record<string, number> = {};
    for (const entry of concordance) {
      for (const [key, value] of Object.entries(entry)) {
        if (value && (typeof value !== 'object' || (Array.isArray(value) && (value as unknown[]).length > 0))) {
          fc2[key] = (fc2[key] || 0) + 1;
        }
      }
    }
    console.log('\nField coverage:');
    for (const [key, count] of Object.entries(fc2).sort(([,a], [,b]) => b - a)) {
      console.log(`  ${key}: ${count}/${concordance.length} (${((count/concordance.length)*100).toFixed(1)}%)`);
    }
  }
} catch (e) {
  console.log('File not found or error:', e);
}
