import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/db';
import './signDetail.css';

export function SignDetailPage() {
  const { id } = useParams();
  const [sign, setSign] = useState<any>(null);
  const [roboflowInstances, setRoboflowInstances] = useState<any[]>([]);
  const [graphemes, setGraphemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadSign();
  }, [id]);

  async function loadSign() {
    setLoading(true);
    try {
      // Get sign details
      const signResult = await db.execute({
        sql: 'SELECT * FROM catalog_signs WHERE id = ?',
        args: [id!]
      });
      
      if (signResult.rows.length > 0) {
        setSign(signResult.rows[0]);
        
        // Get Roboflow instances
        const roboflowResult = await db.execute({
          sql: `
            SELECT image_url, dataset_split, bbox_x, bbox_y, bbox_width, bbox_height
            FROM roboflow_instances
            WHERE catalog_sign_id = ?
            ORDER BY dataset_split, id
            LIMIT 24
          `,
          args: [id!]
        });
        setRoboflowInstances(roboflowResult.rows as any);
        
        // Get grapheme occurrences with block info
        const graphemesResult = await db.execute({
          sql: `
            SELECT 
              g.id,
              g.grapheme_code,
              g.location_summary,
              g.artifact_code,
              b.block_english,
              b.block_maya1,
              b.event_calendar,
              b.site_origin,
              b.image_url as block_image_url
            FROM graphemes g
            LEFT JOIN blocks b ON g.block_id = b.id
            WHERE g.catalog_sign_id = ?
            ORDER BY b.event_calendar DESC NULLS LAST
            LIMIT 50
          `,
          args: [id!]
        });
        setGraphemes(graphemesResult.rows as any);
      }
    } catch (error) {
      console.error('Failed to load sign:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!sign) {
    return (
      <div className="detail-error">
        <p>Sign not found</p>
        <Link to="/" className="back-link">← Back to search</Link>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <div className="detail-container">
        
        {/* Breadcrumb */}
        <Link to="/" className="back-link">
          ← Back to search
        </Link>

        {/* Header */}
        <div className="detail-header">
          <div className="header-content">
            {/* Primary Image */}
            {sign.primary_image_url && (
              <div className="primary-image">
                <img 
                  src={sign.primary_image_url} 
                  alt={sign.mhd_code}
                />
              </div>
            )}
            
            {/* Sign Info */}
            <div className="sign-info">
              <h1 className="sign-title">
                {sign.mhd_code}
                {sign.variant_code && (
                  <span className="variant">({sign.variant_code})</span>
                )}
              </h1>

              {/* Codes */}
              <div className="code-badges">
                {sign.thompson_code && (
                  <span className="badge thompson">Thompson {sign.thompson_code}</span>
                )}
                {sign.zender_code && (
                  <span className="badge zender">Zender {sign.zender_code}</span>
                )}
              </div>

              {/* Linguistic Info */}
              {sign.phonetic_value && (
                <div className="info-row">
                  <span className="label">Phonetic:</span>
                  <span className="value phonetic">{sign.phonetic_value}</span>
                </div>
              )}

              {sign.syllabic_value && (
                <div className="info-row">
                  <span className="label">Syllabic:</span>
                  <span className="value">{sign.syllabic_value}</span>
                </div>
              )}

              {sign.english_translation && (
                <div className="info-row">
                  <span className="label">Meaning:</span>
                  <span className="value">"{sign.english_translation}"</span>
                </div>
              )}

              {/* Stats */}
              <div className="stats">
                <div className="stat">
                  <span className="stat-value">{roboflowInstances.length}</span>
                  <span className="stat-label">Roboflow Examples</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{graphemes.length}</span>
                  <span className="stat-label">Corpus Occurrences</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Roboflow Examples */}
        {roboflowInstances.length > 0 && (
          <section className="detail-section">
            <h2>Annotated Training Examples</h2>
            <p className="section-subtitle">Segmented instances from the Roboflow dataset</p>
            
            <div className="roboflow-grid">
              {roboflowInstances.map((inst: any, idx: number) => (
                <div key={idx} className="roboflow-card">
                  <div className="roboflow-image">
                    <img 
                      src={inst.image_url} 
                      alt={`Example ${idx + 1}`}
                    />
                  </div>
                  <div className="roboflow-meta">
                    <span className="split">{inst.dataset_split}</span>
                    {inst.bbox_width && (
                      <span className="dims">{Math.round(inst.bbox_width)}×{Math.round(inst.bbox_height)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Corpus Occurrences */}
        {graphemes.length > 0 && (
          <section className="detail-section">
            <h2>Corpus Occurrences</h2>
            <p className="section-subtitle">Real-world usage from Maya inscriptions</p>
            
            <div className="graphemes-list">
              {graphemes.slice(0, 20).map((g: any) => (
                <div key={g.id} className="grapheme-card">
                  {g.block_image_url && (
                    <div className="grapheme-image">
                      <img 
                        src={g.block_image_url}
                        alt="Block"
                      />
                    </div>
                  )}
                  
                  <div className="grapheme-content">
                    <div className="grapheme-tags">
                      <span className="tag artifact">{g.artifact_code || 'Unknown'}</span>
                      {g.location_summary && (
                        <span className="tag location">{g.location_summary}</span>
                      )}
                    </div>
                    
                    {g.block_maya1 && (
                      <div className="grapheme-text">
                        <span className="text-label">Maya:</span>
                        <span>{g.block_maya1}</span>
                      </div>
                    )}
                    
                    {g.block_english && (
                      <div className="grapheme-text">
                        <span className="text-label">Translation:</span>
                        <span className="translation-text">{g.block_english}</span>
                      </div>
                    )}
                    
                    <div className="grapheme-meta">
                      {g.site_origin && <span>Site: {g.site_origin}</span>}
                      {g.event_calendar && <span>Date: {g.event_calendar}</span>}
                    </div>
                  </div>
                </div>
              ))}
              
              {graphemes.length > 20 && (
                <p className="more-text">
                  Showing 20 of {graphemes.length} occurrences
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
