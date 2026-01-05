// src/pages/signDetail.tsx - WITH TABS
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/db';
import './signDetail.css';

type TabType = 'info' | 'instances' | 'examples';

export function SignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sign, setSign] = useState<any>(null);
  const [graphemes, setGraphemes] = useState<any[]>([]);
  const [roboflow, setRoboflow] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  useEffect(() => {
    async function loadSign() {
      if (!id) {
        setError('No ID provided');
        setLoading(false);
        return;
      }

      try {
        const signId = parseInt(id);
        
        // Load all data in parallel
        const [signResult, graphemeResult, roboflowResult] = await Promise.all([
          db.execute({
            sql: 'SELECT * FROM catalog_signs WHERE id = ?',
            args: [signId]
          }),
          db.execute({
            sql: `
              SELECT 
                g.id, 
                g.grapheme_code, 
                b.block_english, 
                b.block_maya1, 
                b.artifact_code,
                b.event_calendar,
                b.block_image1_url as block_img
              FROM graphemes g
              LEFT JOIN blocks b ON g.block_id = b.id
              WHERE g.catalog_sign_id = ?
              ORDER BY b.event_calendar DESC
              LIMIT 100
            `,
            args: [signId]
          }),
db.execute({
  sql: `
    SELECT id, image_url, confidence, dataset_split
    FROM roboflow_instances
    WHERE catalog_sign_id = ?
    LIMIT 50
  `,
  args: [signId]
})
        ]);

        if (signResult.rows.length > 0) {
          setSign(signResult.rows[0]);
          setGraphemes(graphemeResult.rows);
          setRoboflow(roboflowResult.rows);
        } else {
          setError(`No sign found with ID: ${signId}`);
        }
      } catch (err: any) {
        setError(`Database error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadSign();
  }, [id]);

  if (loading) {
    return (
      <div className="sign-detail-page">
        <div className="sign-detail-loading">
          <div className="spinner"></div>
          <p>Loading sign...</p>
        </div>
      </div>
    );
  }

  if (error || !sign) {
    return (
      <div className="sign-detail-page">
        <div className="sign-detail-error">
          <h1>Error</h1>
          <p>{error || 'Sign not found'}</p>
          <Link to="/" className="back-link">← Back to search</Link>
        </div>
      </div>
    );
  }

  const displayCode = sign.mhd_code_sub || sign.graphcode || sign.mhd_code;

  return (
    <div className="sign-detail-page">
      <div className="sign-detail-container">
        <Link to="/" className="back-link">← Back to search</Link>
        
        {/* Header Section */}
        <div className="sign-header">
          <div className="sign-image-large">
            {sign.primary_image_url ? (
              <img src={sign.primary_image_url} alt={displayCode} />
            ) : (
              <div className="no-image-large">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
            )}
          </div>
          
          <div className="sign-header-info">
            <h1>{displayCode}</h1>
            
            <div className="sign-meta">
              {sign.thompson_code && (
                <div className="meta-item">
                  <span className="meta-label">Thompson:</span>
                  <span className="meta-value">T{sign.thompson_code}</span>
                </div>
              )}
              {sign.zender_code && (
                <div className="meta-item">
                  <span className="meta-label">Zender:</span>
                  <span className="meta-value">{sign.zender_code}</span>
                </div>
              )}
              {sign.kettunen_code && (
                <div className="meta-item">
                  <span className="meta-label">Kettunen:</span>
                  <span className="meta-value">{sign.kettunen_code}</span>
                </div>
              )}
            </div>

            {sign.english_translation && (
              <div className="sign-translation">
                <strong>Meaning:</strong> {sign.english_translation}
              </div>
            )}

            {sign.syllabic_value && (
              <div className="sign-phonetic">
                <strong>Syllabic:</strong> {sign.syllabic_value}
              </div>
            )}

            {sign.logographic_value && (
              <div className="sign-logographic">
                <strong>Logographic:</strong> {sign.logographic_value}
              </div>
            )}

            {sign.word_class && (
              <div className="sign-word-class">
                <strong>Word class:</strong> {sign.word_class}
              </div>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="sign-tabs">
          <button 
            className={activeTab === 'info' ? 'active' : ''}
            onClick={() => setActiveTab('info')}
          >
            Information
          </button>
          <button 
            className={activeTab === 'instances' ? 'active' : ''}
            onClick={() => setActiveTab('instances')}
          >
            Instances ({graphemes.length})
          </button>
          <button 
            className={activeTab === 'examples' ? 'active' : ''}
            onClick={() => setActiveTab('examples')}
          >
            ML Examples ({roboflow.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="sign-content">
          {activeTab === 'info' && (
            <div className="info-tab">
              <div className="info-grid">
                <div className="info-item">
                  <strong>MHD Code:</strong> {sign.mhd_code}
                </div>
                {sign.mhd_code_sub && (
                  <div className="info-item">
                    <strong>Display Code:</strong> {sign.mhd_code_sub}
                  </div>
                )}
                {sign.graphcode && (
                  <div className="info-item">
                    <strong>Graph Code:</strong> {sign.graphcode}
                  </div>
                )}
                {sign.volume && (
                  <div className="info-item">
                    <strong>Period:</strong> {sign.volume}
                  </div>
                )}
                {sign.technique && (
                  <div className="info-item">
                    <strong>Technique:</strong> {sign.technique}
                  </div>
                )}
                {sign.calendrical_name && (
                  <div className="info-item">
                    <strong>Calendrical:</strong> {sign.calendrical_name}
                  </div>
                )}
                {sign.notes && (
                  <div className="info-notes">
                    <strong>Notes:</strong>
                    <p>{sign.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'instances' && (
            <div className="instances-tab">
              {graphemes.length === 0 ? (
                <p className="empty-message">No instances found in corpus</p>
              ) : (
                <div className="instances-grid">
                  {graphemes.map((g: any) => (
                    <div key={g.id} className="instance-card">
                      {g.block_img && (
                        <div className="instance-image">
                          <img src={g.block_img} alt="Block" loading="lazy" />
                        </div>
                      )}
                      <div className="instance-info">
                        <div className="instance-code">{g.grapheme_code}</div>
                        {g.block_maya1 && <div className="maya-text">{g.block_maya1}</div>}
                        {g.block_english && <div className="english-text">"{g.block_english}"</div>}
                        <div className="instance-meta">
                          {g.artifact_code && <span>📜 {g.artifact_code}</span>}
                          {g.event_calendar && <span>📅 {g.event_calendar}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="examples-tab">
              {roboflow.length === 0 ? (
                <p className="empty-message">No ML training examples available</p>
              ) : (
                <div className="examples-grid">
{roboflow.map((r: any) => (
  <div key={r.id} className="example-card">
    <img src={r.image_url} alt={`Training example ${r.id}`} loading="lazy" />
    <div className="example-info">
      {r.confidence && (
        <div className="confidence">
          {Math.round(r.confidence * 100)}% confidence
        </div>
      )}
      {r.dataset_split && (
        <div className="dataset-split">
          {r.dataset_split}
        </div>
      )}
    </div>
  </div>
))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
