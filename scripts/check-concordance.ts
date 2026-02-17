import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/lmgg-concordance.json', 'utf-8'));
console.log('Type:', typeof data);
console.log('Is array:', Array.isArray(data));

if (typeof data === 'object' && !Array.isArray(data)) {
  const keys = Object.keys(data);
  console.log('Top-level keys count:', keys.length);
  console.log('First 5 keys:', keys.slice(0, 5));
  
  const firstKey = keys[0];
  console.log('\nSample value for key', firstKey, ':', JSON.stringify(data[firstKey], null, 2));
  const secondKey = keys[1];
  console.log('Sample value for key', secondKey, ':', JSON.stringify(data[secondKey], null, 2));
  const thirdKey = keys[2];
  console.log('Sample value for key', thirdKey, ':', JSON.stringify(data[thirdKey], null, 2));

  // Analyze the structure of values
  const allFields = new Set<string>();
  let count = 0;
  for (const key of keys) {
    const val = data[key];
    if (typeof val === 'object' && val !== null) {
      for (const f of Object.keys(val)) allFields.add(f);
    }
    count++;
  }
  console.log('\nAll fields across entries:', [...allFields].join(', '));
  console.log('Total entries:', count);

  // Field coverage
  const fc: Record<string, number> = {};
  for (const key of keys) {
    const val = data[key];
    if (typeof val === 'object' && val !== null) {
      for (const [f, v] of Object.entries(val)) {
        if (v && (typeof v !== 'object' || (Array.isArray(v) && (v as any[]).length > 0))) {
          fc[f] = (fc[f] || 0) + 1;
        }
      }
    }
  }
  console.log('\nField coverage:');
  for (const [key2, cnt] of Object.entries(fc).sort(([, a], [, b]) => b - a)) {
    console.log(`  ${key2}: ${cnt}/${count} (${((cnt / count) * 100).toFixed(1)}%)`);
  }
  
  // Show some more diverse samples
  console.log('\n=== MORE SAMPLES ===');
  for (const key of keys.slice(0, 10)) {
    const val = data[key];
    console.log(`${key}: ${JSON.stringify(val)}`);
  }
} else if (Array.isArray(data)) {
  console.log('Length:', data.length);
  console.log('First 3:', JSON.stringify(data.slice(0, 3), null, 2));
}
