import { useState } from 'react';
import { ingestLMGGConcordance } from '../lib/ingestLMGG';

export function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleImport() {
    setLoading(true);
    setMessage('Importing data...');
    
    try {
      const count = await ingestLMGGConcordance();
      setMessage(`✅ Successfully imported ${count} signs from LMGG concordance!`);
    } catch (error) {
      setMessage(`❌ Import failed: ${error}`);
    }
    
    setLoading(false);
  }

  return (
    <div className="page admin-page">
      <h1>Admin Panel</h1>
      <p>Import data from external sources</p>
      
      <div className="admin-section">
        <h2>LMGG Concordance</h2>
        <p>Import sign mappings between Bonn, Thompson, and MHD catalogs</p>
        <button 
          onClick={handleImport} 
          disabled={loading}
          className="import-button"
        >
          {loading ? 'Importing...' : 'Import LMGG Data'}
        </button>
        {message && <p className="import-message">{message}</p>}
      </div>
    </div>
  );
}
