// src/pages/signDetail.tsx (fix the cache cleanup section)
import { useEffect, useState, useMemo, useCallback } from 'react';
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

type TabType = 'info' | 'instances' | 'examples';

// In-memory cache for sign data
const signCache = new Map<string, {
  sign: SignData;
  graphemes: GraphemeInstance[];
  roboflow: RoboflowInstance[];
  timestamp: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

export function SignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sign, setSign] = useState<SignData | null>(null);
  const [graphemes, setGraphemes] = useState<GraphemeInstance[]>([]);
  const [roboflow, setRoboflow] = useState<RoboflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  useEffect(() => {
    loadSignData();
  }, [id]);

  const loadSignData = useCallback(async () => {
    if (!id) return;
    
    // Check cache first
    const cached = signCache.get(id);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('Loading from cache:', id);
      setSign(cached.sign);
      setGraphemes(cached.graphemes);
      setRoboflow(cached.roboflow);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const signId = parseInt(id);
      
      // Parallel queries for better performance
      const [signResult, graphemeResult, roboflowResult] = await Promise.all([
        db.execute({
          sql: `SELECT * FROM catalog_signs WHERE id = ?`,
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
              COALESCE(b.image_url, b.block_image1_url) as block_img
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
            SELECT id, image_url, class_name, confidence
            FROM roboflow_instances
            WHERE catalog_sign_id = ?
            LIMIT 50
          `,
          args: [signId]
        })
      ]);
      
      if (signResult.rows.length > 0) {
        const signData = signResult.rows[0] as any;
        const graphemeData = graphemeResult.rows as any;
        const roboflowData = roboflowResult.rows as any;
        
        setSign(signData);
        setGraphemes(graphemeData);
        setRoboflow(roboflowData);
        
        // Cache the results
        signCache.set(id, {
          sign: signData,
          graphemes: graphemeData,
          roboflow: roboflowData,
          timestamp: now
        });
        
        // Limit cache size to prevent memory issues - FIX HERE
        if (signCache.size > MAX_CACHE_SIZE) {
          const keysIterator = signCache.keys();
          const firstKey = keysIterator.next().value;
          if (firstKey !== undefined) {
            signCache.delete(firstKey);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load sign:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Memoized helpers
  const hasValue = useCallback((val: any) => val && val !== '', []);

  const displayCode = useMemo(() => 
    sign?.mhd_code_sub || sign?.graphcode || sign?.mhd_code || 'Unknown',
    [sign]
  );

  const hasCodes = useMemo(() => 
    sign && (hasValue(sign.thompson_code) || hasValue(sign.zender_code) || hasValue(sign.kettunen_code)),
    [sign, hasValue]
  );

  // Memoized tab change handler
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

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
              <img src={sign.primary_image_url} alt={displayCode} loading="eager" />
            ) : (
              <div className="no-image-large">?</div>
            )}
          </div>
          
          <div className="sign-header-info">
            <h1>{displayCode}</h1>
            
            {hasCodes && (
              <div className="sign-codes">
                {hasValue(sign.thompson_code) && (
                  <div className="code-badge">
                    <span className="code-label">Thompson:</span> T{sign.thompson_code}
                  </div>
                )}
                {hasValue(sign.zender_code) && (
                  <div className="code-badge">
                    <span className="code-label">Zender:</span> {sign.zender_code}
                  </div>
                )}
                {hasValue(sign.kettunen_code) && (
                  <div className="code-badge">
                    <span className="code-label">Kettunen:</span> {sign.kettunen_code}
                  </div>
                )}
              </div>
            )}

            {hasValue(sign.english_translation) && (
              <div className="sign-translation">
                <strong>Meaning:</strong> {sign.english_translation}
              </div>
            )}

            {hasValue(sign.syllabic_value) && (
              <div className="sign-phonetic">
                <strong>Syllabic:</strong> {sign.syllabic_value}
              </div>
            )}

            {hasValue(sign.logographic_value) && (
              <div className="sign-logographic">
                <strong>Logographic:</strong> {sign.logographic_value}
              </div>
            )}

            {hasValue(sign.word_class) && (
              <div className="sign-word-class">
                <strong>Word class:</strong> {sign.word_class}
              </div>
            )}

            {hasValue(sign.calendrical_name) && (
              <div className="sign-calendrical">
                <strong>Calendrical:</strong> {sign.calendrical_name}
              </div>
            )}
          </div>
        </div>

        <div className="sign-tabs">
          <button 
            className={activeTab === 'info' ? 'active' : ''}
            onClick={() => handleTabChange('info')}
          >
            Information
          </button>
          <button 
            className={activeTab === 'instances' ? 'active' : ''}
            onClick={() => handleTabChange('instances')}
          >
            Instances ({graphemes.length})
          </button>
          <button 
            className={activeTab === 'examples' ? 'active' : ''}
            onClick={() => handleTabChange('examples')}
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
                {hasValue(sign.graphcode) && (
                  <div className="info-item">
                    <strong>Graph Code:</strong> {sign.graphcode}
                  </div>
                )}
                {hasValue(sign.notes) && (
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
                          <img src={g.block_img} alt="Block" loading="lazy" />
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
                      <img src={r.image_url} alt={r.class_name} loading="lazy" />
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
