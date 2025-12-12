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
  }, [query]);

  async function fetchSigns() {
    setLoading(true);
    try {
      // Try API route first (production), fallback to direct DB (local dev)
      if (import.meta.env.PROD) {
        const response = await fetch(`/api/signs?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setSigns(data);
      } else {
        const result = await db.execute({
          sql: `
            SELECT 
              s.*,
              COUNT(si.id) as instance_count
            FROM signs s
            LEFT JOIN sign_instances si ON s.id = si.sign_id
            WHERE 
              s.bonn_id LIKE ? OR
              s.thompson_id LIKE ? OR
              s.mhd_id LIKE ? OR
              s.phonetic_value LIKE ?
            GROUP BY s.id
            ORDER BY s.bonn_id
          `,
          args: [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
        });
        setSigns(result.rows as any);
      }
    } catch (error) {
      console.error('Failed to fetch signs:', error);
    }
    setLoading(false);
  }

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
            {signs.length} sign{signs.length !== 1 ? 's' : ''} found
          </div>
          
          <div className="sign-grid">
            {signs.map(sign => (
              <SignCard key={sign.id} sign={sign} />
            ))}
          </div>

          {signs.length === 0 && !loading && (
            <div className="no-results">
              No signs found. Try a different search term.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
