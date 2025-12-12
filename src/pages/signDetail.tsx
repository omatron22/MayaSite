import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/db';
import type { Sign, SignInstance } from '../types/database';

export function SignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sign, setSign] = useState<Sign | null>(null);
  const [instances, setInstances] = useState<SignInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchSignData(id);
    }
  }, [id]);

  async function fetchSignData(signId: string) {
    setLoading(true);
    try {
      // Fetch from static JSON
      const response = await fetch('/signs.json');
      const signs = await response.json();
      const foundSign = signs.find((s: any) => s.id === parseInt(signId));
      
      if (foundSign) {
        setSign(foundSign);
      }

      // Still fetch instances from DB (there are none yet anyway)
      const instancesResult = await db.execute({
        sql: 'SELECT * FROM sign_instances WHERE sign_id = ? ORDER BY created_at DESC',
        args: [parseInt(signId)]
      });
      
      setInstances(instancesResult.rows as any);
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
        <h2>Instances ({instances.length})</h2>
        
        {instances.length === 0 ? (
          <p className="no-instances">No instances recorded yet.</p>
        ) : (
          <div className="instances-grid">
            {instances.map(instance => (
              <div key={instance.id} className="instance-card">
                <div className="instance-source">
                  <span className={`source-badge ${instance.source_type}`}>
                    {instance.source_type.toUpperCase()}
                  </span>
                  <span className="source-id">{instance.source_id}</span>
                </div>
                
                {instance.location && (
                  <div className="instance-location">📍 {instance.location}</div>
                )}
                
                {(instance.date_start || instance.date_end) && (
                  <div className="instance-date">
                    📅 {instance.date_start || '?'} - {instance.date_end || '?'}
                  </div>
                )}
                
                {instance.artifact_type && (
                  <div className="instance-artifact">🏺 {instance.artifact_type}</div>
                )}
                
                <a 
                  href={instance.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="view-source"
                >
                  View Source →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
