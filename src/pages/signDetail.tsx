import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Sign } from '../types/database';

export function SignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sign, setSign] = useState<Sign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchSignData(id);
    }
  }, [id]);

  async function fetchSignData(signId: string) {
    setLoading(true);
    try {
      const response = await fetch('/signs.json');
      const signs = await response.json();
      const foundSign = signs.find((s: any) => s.id === parseInt(signId));
      
      if (foundSign) {
        setSign(foundSign);
      }
    } catch (error) {
      console.error('Failed to fetch sign:', error);
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="page loading">Loading sign...</div>;
  }

  if (!sign) {
    return (
      <div className="page">
        <h1>Sign not found</h1>
        <Link to="/">← Back to search</Link>
      </div>
    );
  }

  return (
    <div className="sign-detail-page">
      <Link to="/" className="back-link">← Back to search</Link>
      
      <div className="sign-header">
        <h1>Sign Details</h1>
        <div className="sign-ids-large">
          {sign.bonn_id && <span className="id-badge bonn">Bonn: {sign.bonn_id}</span>}
          {sign.thompson_id && <span className="id-badge thompson">Thompson: {sign.thompson_id}</span>}
          {sign.mhd_id && <span className="id-badge mhd">MHD: {sign.mhd_id}</span>}
        </div>
        {sign.phonetic_value && (
          <div className="phonetic-large">/{sign.phonetic_value}/</div>
        )}
        {sign.description && (
          <p className="description">{sign.description}</p>
        )}
      </div>

      <div className="instances-section">
        <h2>Instances (0)</h2>
        <p className="no-instances">No instances recorded yet.</p>
      </div>
    </div>
  );
}
