import { db } from './db';
import lmggHtmlUrl from './lmgg-concordance.html?url';

export async function ingestLMGGConcordance() {
  console.log('📥 Fetching LMGG concordance...');
  
  try {
    // Fetch the HTML file
    const response = await fetch(lmggHtmlUrl);
    const lmggHtml = await response.text();
    
    // Parse the HTML table
    const parser = new DOMParser();
    const doc = parser.parseFromString(lmggHtml, 'text/html');
    const rows = doc.querySelectorAll('table tr');
    
    let imported = 0;
    
    for (let i = 1; i < rows.length; i++) { // Skip header row
      const cells = rows[i].querySelectorAll('td');
      if (cells.length < 3) continue;
      
      // Extract text from first 3 columns (T#, Bonn, MHD)
      const thompson = cells[0]?.textContent?.trim() || null;
      const bonn = cells[1]?.textContent?.trim() || null;
      const mhd = cells[3]?.textContent?.trim() || null;
      
      // Skip rows with "not a Bonn number" or "does not give a match"
      if (bonn?.includes('not a Bonn number')) continue;
      if (mhd?.includes('does not give a match')) continue;
      
      // Only insert if we have at least one valid ID
      if ((bonn && bonn !== '~') || (thompson && thompson !== '~') || (mhd && mhd !== '~')) {
        await db.execute({
          sql: `INSERT INTO signs (thompson_id, bonn_id, mhd_id) VALUES (?, ?, ?)`,
          args: [
            thompson && thompson !== '~' ? thompson : null,
            bonn && bonn !== '~' ? bonn : null,
            mhd && mhd !== '~' ? mhd : null
          ]
        });
        imported++;
      }
    }
    
    console.log(`✅ Imported ${imported} signs from LMGG concordance`);
    return imported;
  } catch (error) {
    console.error('❌ Failed to ingest LMGG:', error);
    throw error;
  }
}
