import { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { SearchBar } from '../components/SearchBar';
import { SignCard } from '../components/SignCard';
import type { Sign } from '../types/database';

interface SignWithCount extends Sign {
  instance_count: number;
}

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [signs, setSigns] = useState<SignWithCount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSigns();
  }, []);

  async function fetchSigns() {
    setLoading(true);
    try {
      const result = await db.execute(`
        SELECT 
          s.*,
          COUNT(si.id) as instance_count
        FROM signs s
        LEFT JOIN sign_instances si ON s.id = si.sign_id
        GROUP BY s.id
        ORDER BY s.bonn_id
      `);
      
      setSigns(result.rows as any);
    } catch (error) {
      console.error('Failed to fetch signs:', error);
    }
    setLoading(false);
  }

  const filteredSigns = signs.filter(sign => {
    if (!query) return true;
    const searchLower = query.toLowerCase();
    return (
      sign.bonn_id?.toLowerCase().includes(searchLower) ||
      sign.thompson_id?.toLowerCase().includes(searchLower) ||
      sign.mhd_id?.toLowerCase().includes(searchLower) ||
      sign.phonetic_value?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>Maya Sign Database</h1>
        <p>Search across Bonn, Thompson, and MHD catalogs</p>
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search by sign ID (Bonn, Thompson, MHD) or phonetic value..."
      />

      {loading ? (
        <div className="loading">Loading signs...</div>
      ) : (
        <div className="results">
          <div className="results-count">
            {filteredSigns.length} sign{filteredSigns.length !== 1 ? 's' : ''} found
          </div>
          
          <div className="sign-grid">
            {filteredSigns.map(sign => (
              <SignCard key={sign.id} sign={sign} />
            ))}
          </div>

          {filteredSigns.length === 0 && !loading && (
            <div className="no-results">
              No signs found. Try a different search term.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
