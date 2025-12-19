import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/db';
import './signDetail.css';

interface SignData {
  id: number;
  mhd_code: string;
  mhd_code_sub: string;
  graphcode: string;
  thompson_code: string;
  zender_code: string;
  kettunen_code: string;
  logographic_value: string;
  syllabic_value: string;
  english_translation: string;
  word_class: string;
  calendrical_name: string;
  primary_image_url: string;
  notes: string;
}

interface GraphemeInstance {
  id: number;
  grapheme_code: string;
  block_english: string;
  block_maya1: string;
  artifact_code: string;
  event_calendar: string;
  block_img: string;
}

interface RoboflowInstance {
  id: number;
  image_url: string;
  class_name: string;
  confidence: number;
}

export function SignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sign, setSign] = useState<SignData | null>(null);
  const [graphemes, setGraphemes] = useState<GraphemeInstance[]>([]);
  const [roboflow, setRoboflow] = useState<RoboflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'instances' | 'examples'>('info');

  useEffect(() => {
    loadSignData();
  }, [id]);

  async function loadSignData() {
    if (!id) return;
    
    setLoading(true);
    try {
      // Load sign data
      const signResult = await db.execute({
        sql: `SELECT * FROM catalog_signs WHERE id = ?`,
        args: [parseInt(id)]
      });
      
      if (signResult.rows.length > 0) {
        setSign(signResult.rows[0] as any);
      }

      // Load grapheme instances
      const graphemeResult = await db.execute({
        sql: `
          SELECT 
            g.id, 
            g.grapheme_code, 
            b.block_english, 
            b.block_maya1, 
            b.artifact_code,
            b.event_calendar,
            COALESCE(b.image_url, b.block_image1_url) as block_img
          FROM graphemes g
          LEFT JOIN blocks b ON g.block_id = b.id
          WHERE g.catalog_sign_id = ?
          ORDER BY b.event_calendar DESC
          LIMIT 100
        `,
        args: [parseInt(id)]
      });
      setGraphemes(graphemeResult.rows as any);

      // Load Roboflow instances
      const roboflowResult = await db.execute({
        sql: `
          SELECT id, image_url, class_name, confidence
          FROM roboflow_instances
          WHERE catalog_sign_id = ?
          LIMIT 50
        `,
        args: [parseInt(id)]
      });
      setRoboflow(roboflowResult.rows as any);

    } catch (error) {
      console.error('Failed to load sign:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="sign-detail-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!sign) {
    return (
      <div className="sign-detail-page">
        <div className="error">Sign not found</div>
        <Link to="/">← Back to search</Link>
      </div>
    );
  }

  return (
    <div className="sign-detail-page">
      <div className="sign-detail-container">
        <Link to="/" className="back-link">← Back to search</Link>
        
        <div className="sign-header">
          <div className="sign-image-large">
            {sign.primary_image_url ? (
              <img src={sign.primary_image_url} alt={sign.mhd_code_sub} />
            ) : (
              <div className="no-image-large">?</div>
            )}
          </div>
          
          <div className="sign-header-info">
            <h1>{sign.mhd_code_sub || sign.graphcode || sign.mhd_code}</h1>
            
            <div className="sign-codes">
              {sign.thompson_code && (
                <div className="code-badge">
                  <span className="code-label">Thompson:</span> T{sign.thompson_code}
                </div>
              )}
              {sign.zender_code && (
                <div className="code-badge">
                  <span className="code-label">Zender:</span> {sign.zender_code}
                </div>
              )}
              {sign.kettunen_code && (
                <div className="code-badge">
                  <span className="code-label">Kettunen:</span> {sign.kettunen_code}
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

            {sign.calendrical_name && (
              <div className="sign-calendrical">
                <strong>Calendrical:</strong> {sign.calendrical_name}
              </div>
            )}
          </div>
        </div>

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
            Training Examples ({roboflow.length})
          </button>
        </div>

        <div className="sign-content">
          {activeTab === 'info' && (
            <div className="info-tab">
              <div className="info-grid">
                <div className="info-item">
                  <strong>MHD Code:</strong> {sign.mhd_code}
                </div>
                <div className="info-item">
                  <strong>Display Code:</strong> {sign.mhd_code_sub}
                </div>
                {sign.graphcode && (
                  <div className="info-item">
                    <strong>Graph Code:</strong> {sign.graphcode}
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
                <p>No instances found in corpus</p>
              ) : (
                <div className="instances-grid">
                  {graphemes.map((g) => (
                    <div key={g.id} className="instance-card">
                      {g.block_img && (
                        <div className="instance-image">
                          <img src={g.block_img} alt="Block" />
                        </div>
                      )}
                      <div className="instance-info">
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
                <p>No training examples available</p>
              ) : (
                <div className="examples-grid">
                  {roboflow.map((r) => (
                    <div key={r.id} className="example-card">
                      <img src={r.image_url} alt={r.class_name} />
                      {r.confidence && (
                        <div className="confidence">
                          {Math.round(r.confidence * 100)}% confidence
                        </div>
                      )}
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
