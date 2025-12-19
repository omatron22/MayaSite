import { db } from '../src/lib/db.ts';

async function main() {
  console.log('=== NOAH\'S CATEGORIES (from Notion) ===\n');
  
  const noahRegions = ['North', 'East', 'Central', 'Usmacinta', 'South', 'Unknown'];
  const noahPeriods = [
    'Early Preclassic (-2000 to -400)',
    'Late Preclassic (-400 to 100)',
    'Terminal Preclassic (100 to 250)',
    'Early Classic (250 to 600)',
    'Late Classic (600 to 850)',
    'Early Postclassic (850 to 1200)',
    'Late Postclassic (1200 to 1500)'
  ];
  
  console.log('Noah\'s Regions:', noahRegions);
  console.log('\nNoah\'s Time Periods:');
  noahPeriods.forEach(p => console.log(`  - ${p}`));
  
  console.log('\n=== YOUR DATABASE CATEGORIES ===\n');
  
  // Get unique regions
  const regionsResult = await db.execute(`
    SELECT DISTINCT region
    FROM blocks
    WHERE region IS NOT NULL
    ORDER BY region
  `);
  
  const yourRegions = regionsResult.rows.map((r: any) => r.region);
  console.log('Your Regions:', yourRegions);
  
  // Get date range
  const dateRangeResult = await db.execute(`
    SELECT 
      MIN(event_long_count) as min_lc,
      MAX(event_long_count) as max_lc
    FROM blocks
    WHERE event_long_count IS NOT NULL
      AND event_long_count != '-'
  `);
  
  console.log('\nYour Date Range:');
  console.log(`  Min Long Count: ${dateRangeResult.rows[0].min_lc}`);
  console.log(`  Max Long Count: ${dateRangeResult.rows[0].max_lc}`);
  
  console.log('\n=== COMPARISON ===\n');
  
  // Compare regions
  const noahSet = new Set(noahRegions);
  const yourSet = new Set(yourRegions);
  
  const matching = yourRegions.filter(r => noahSet.has(r));
  const yourExtra = yourRegions.filter(r => !noahSet.has(r));
  const noahExtra = noahRegions.filter(r => !yourSet.has(r));
  
  console.log(`✅ Matching regions (${matching.length}):`, matching);
  if (yourExtra.length > 0) {
    console.log(`⚠️  Regions YOU have that Noah doesn't (${yourExtra.length}):`, yourExtra);
  }
  if (noahExtra.length > 0) {
    console.log(`⚠️  Regions NOAH has that you don't (${noahExtra.length}):`, noahExtra);
  }
  
  console.log('\n=== TIME PERIOD IMPLEMENTATION ===\n');
  console.log('Your code uses these periods:');
  console.log('  - Late Preclassic (-400 to 250)');
  console.log('  - Terminal Preclassic (100 to 250)');
  console.log('  - Early Classic (250 to 600)');
  console.log('  - Late Classic (600 to 900)');
  console.log('  - Early Postclassic (900 to 1200)');
  console.log('  - Invalid/Undated (for unparseable dates)');
  
  console.log('\n⚠️  DIFFERENCES:');
  console.log('  1. Noah has "Early Preclassic" (-2000 to -400) - you DON\'T');
  console.log('  2. Noah\'s Late Classic ends at 850 - yours ends at 900');
  console.log('  3. Noah has "Late Postclassic" (1200-1500) - you DON\'T');
  console.log('  4. You have "Invalid/Undated" category - Noah doesn\'t show this explicitly');
}

main().catch(console.error);
