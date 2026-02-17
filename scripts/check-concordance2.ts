import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/lmgg-concordance.json', 'utf-8'));

// It's an object with 3 keys: twkm, mhd, cmgg
console.log('Top-level keys:', Object.keys(data));

for (const topKey of Object.keys(data)) {
  const arr = data[topKey];
  console.log(`\n=== ${topKey} ===`);
  console.log(`  Count: ${arr.length}`);
  if (arr.length > 0) {
    console.log(`  Fields: ${Object.keys(arr[0]).join(', ')}`);
    
    // Field coverage
    const fc: Record<string, number> = {};
    for (const entry of arr) {
      for (const [f, v] of Object.entries(entry)) {
        if (v !== null && v !== undefined && v !== '' && (typeof v !== 'object' || (Array.isArray(v) && (v as any[]).length > 0) || (!Array.isArray(v) && Object.keys(v as object).length > 0))) {
          fc[f] = (fc[f] || 0) + 1;
        }
      }
    }
    console.log('  Field coverage:');
    for (const [key, cnt] of Object.entries(fc).sort(([, a], [, b]) => b - a)) {
      console.log(`    ${key}: ${cnt}/${arr.length} (${((cnt / arr.length) * 100).toFixed(1)}%)`);
    }
    
    // Show first sample
    console.log(`  Sample:`, JSON.stringify(arr[0], null, 2).split('\n').map((l: string) => '  ' + l).join('\n'));
  }
}

// Now check what's already in the database
console.log('\n\n=== CHECKING WHAT IS ALREADY IMPORTED ===');
// Check the existing import scripts
const importCatalog = fs.readFileSync('scripts/import-mhd-catalog.ts', 'utf-8');
console.log('\nimport-mhd-catalog.ts references to lmgg:', 
  importCatalog.includes('lmgg') ? 'YES' : 'NO',
  importCatalog.includes('concordance') ? '(concordance: YES)' : '(concordance: NO)',
  importCatalog.includes('crossref') ? '(crossref: YES)' : '(crossref: NO)'
);

const initDb = fs.readFileSync('scripts/init-database.ts', 'utf-8');
console.log('init-database.ts references to lmgg:', 
  initDb.includes('lmgg') ? 'YES' : 'NO',
  initDb.includes('pronunciation') ? '(pronunciation: YES)' : '(pronunciation: NO)',
  initDb.includes('thompson') ? '(thompson: YES)' : '(thompson: NO)',
  initDb.includes('cmgg') ? '(cmgg: YES)' : '(cmgg: NO)'
);

// Check database types
const dbTypes = fs.readFileSync('src/types/database.ts', 'utf-8');
console.log('\ndatabase.ts references:');
console.log('  lmgg:', dbTypes.includes('lmgg') ? 'YES' : 'NO');
console.log('  pronunciation:', dbTypes.includes('pronunciation') ? 'YES' : 'NO');
console.log('  thompson:', dbTypes.includes('thompson') ? 'YES' : 'NO');
console.log('  cmgg:', dbTypes.includes('cmgg') ? 'YES' : 'NO');
console.log('  twkm:', dbTypes.includes('twkm') ? 'YES' : 'NO');
console.log('  concordance:', dbTypes.includes('concordance') ? 'YES' : 'NO');
console.log('  translation:', dbTypes.includes('translation') ? 'YES' : 'NO');
