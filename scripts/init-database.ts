import { initDatabase } from '../src/lib/db.ts';

async function main() {
  console.log('🚀 Initializing database schema...\n');
  await initDatabase();
  console.log('\n✅ Database ready for imports!');
}

main().catch(console.error);
