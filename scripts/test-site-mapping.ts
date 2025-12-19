import { getSiteFromArtifactCode, getAllUniqueSites } from '../src/lib/sites';

// Test some codes
const testCodes = ['COLK', 'TIKS', 'PALT', 'YAXL', 'CPNS', 'MAD', 'DRE'];

console.log('Testing site mappings:\n');
testCodes.forEach(code => {
  const site = getSiteFromArtifactCode(code);
  if (site) {
    console.log(`✓ ${code.padEnd(10)} → ${site.name.padEnd(20)} (${site.region}, ${site.lat.toFixed(4)}, ${site.lng.toFixed(4)})`);
  } else {
    console.log(`✗ ${code.padEnd(10)} → NOT MAPPED`);
  }
});

console.log(`\nTotal unique sites mapped: ${getAllUniqueSites().size}`);
