import { db } from '../src/lib/db';

async function getFilterOptions() {
  console.log('🎯 AVAILABLE SEARCH FILTERS\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Word classes
  const wordClasses = await db.execute({
    sql: `
      SELECT word_class, COUNT(*) as count 
      FROM catalog_signs 
      WHERE word_class IS NOT NULL AND word_class != ''
      GROUP BY word_class 
      ORDER BY count DESC
    `,
    args: []
  });
  
  console.log('📚 Word Classes:');
  wordClasses.rows.forEach((w: any) => {
    console.log(`   ${w.word_class.padEnd(20)} (${w.count} signs)`);
  });
  
  // Volumes/Periods
  const volumes = await db.execute({
    sql: `
      SELECT volume, COUNT(*) as count 
      FROM catalog_signs 
      WHERE volume IS NOT NULL 
      GROUP BY volume 
      ORDER BY count DESC
    `,
    args: []
  });
  
  console.log('\n�� Volumes/Periods:');
  volumes.rows.forEach((v: any) => {
    console.log(`   ${v.volume.padEnd(20)} (${v.count} signs)`);
  });
  
  // Techniques
  const techniques = await db.execute({
    sql: `
      SELECT technique, COUNT(*) as count 
      FROM catalog_signs 
      WHERE technique IS NOT NULL 
      GROUP BY technique 
      ORDER BY count DESC
    `,
    args: []
  });
  
  console.log('\n🎨 Techniques:');
  techniques.rows.forEach((t: any) => {
    console.log(`   ${t.technique.padEnd(20)} (${t.count} signs)`);
  });
  
  // Distribution
  const distributions = await db.execute({
    sql: `
      SELECT distribution, COUNT(*) as count 
      FROM catalog_signs 
      WHERE distribution IS NOT NULL 
      GROUP BY distribution 
      ORDER BY count DESC
    `,
    args: []
  });
  
  console.log('\n🗺️  Distribution:');
  distributions.rows.forEach((d: any) => {
    console.log(`   ${d.distribution.padEnd(20)} (${d.count} signs)`);
  });
  
  // Signs with corpus instances
  const withInstances = await db.execute({
    sql: `
      SELECT COUNT(DISTINCT catalog_sign_id) as count 
      FROM graphemes 
      WHERE catalog_sign_id IS NOT NULL
    `,
    args: []
  });
  
  console.log('\n📊 Metadata Availability:');
  console.log(`   With corpus instances:  ${withInstances.rows[0].count}`);
  
  // Signs with ML data
  const withML = await db.execute({
    sql: `SELECT COUNT(DISTINCT catalog_sign_id) as count FROM roboflow_instances`,
    args: []
  });
  console.log(`   With ML training data:  ${withML.rows[0].count}`);
  
  // Signs with syllabic values
  const withSyllabic = await db.execute({
    sql: `SELECT COUNT(*) as count FROM catalog_signs WHERE syllabic_value IS NOT NULL AND syllabic_value != ''`,
    args: []
  });
  console.log(`   With syllabic values:   ${withSyllabic.rows[0].count}`);
  
  // Signs with translations
  const withTranslation = await db.execute({
    sql: `SELECT COUNT(*) as count FROM catalog_signs WHERE english_translation IS NOT NULL AND english_translation != ''`,
    args: []
  });
  console.log(`   With translations:      ${withTranslation.rows[0].count}`);
  
  console.log('\n═══════════════════════════════════════════════════════');
}

getFilterOptions();
