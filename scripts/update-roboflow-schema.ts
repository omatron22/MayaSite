import { db } from '../src/lib/db';

async function main() {
  console.log('Updating roboflow_instances schema...');
  
  // Drop and recreate the table with correct schema
  await db.execute(`
    DROP TABLE IF EXISTS roboflow_instances
  `);
  
  await db.execute(`
    CREATE TABLE roboflow_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catalog_sign_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      bbox_x REAL NOT NULL,
      bbox_y REAL NOT NULL,
      bbox_width REAL NOT NULL,
      bbox_height REAL NOT NULL,
      segmentation_mask TEXT,
      confidence REAL DEFAULT 1.0,
      dataset_split TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (catalog_sign_id) REFERENCES catalog_signs(id)
    )
  `);
  
  console.log('✅ Schema updated successfully');
}

main().catch(console.error);
