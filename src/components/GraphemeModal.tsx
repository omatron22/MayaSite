import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import './GraphemeModal.css';

interface GraphemeModalProps {
  graphemeId: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function GraphemeModal({ graphemeId, onClose, onNext, onPrev }: GraphemeModalProps) {
  const [grapheme, setGrapheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGrapheme();
  }, [graphemeId]);

  async function loadGrapheme() {
    setLoading(true);
    try {
      const result = await db.execute({
        sql: `
          SELECT 
            g.*,
            b.mhd_block_id,
            b.artifact_code,
            b.block_maya1,
            b.block_english,
            b.event_calendar,
            b.surface_page,
            cs.id as catalog_sign_id,
            cs.graphcode,
            cs.primary_image_url,
            cs.mhd_code,
            cs.mhd_code_sub,
            cs.thompson_code,
            cs.syllabic_value,
            cs.logographic_value,
            cs.english_translation,
            cs.word_class
          FROM graphemes g
          LEFT JOIN blocks b ON g.block_id = b.id
          LEFT JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
          WHERE g.id = ?
        `,
        args: [graphemeId]
      });
      
      if (result.rows.length > 0) {
        setGrapheme(result.rows[0]);
      }
    } catch (err) {
      console.error('Error loading grapheme:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (!grapheme) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content grapheme-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          {onPrev && (
            <button className="nav-btn" onClick={onPrev}>
              ← Previous
            </button>
          )}
          <h2>
            {grapheme.mhd_block_id || 'Unknown Block'} - {grapheme.grapheme_code || grapheme.graphcode}
          </h2>
          {onNext && (
            <button className="nav-btn" onClick={onNext}>
              Next →
            </button>
          )}
        </div>

        <div className="modal-body">
          {/* Left side - Data */}
          <div className="data-column">
            <section className="info-section">
              <h3>Block Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Block ID:</label>
                  <span>{grapheme.mhd_block_id || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Artifact:</label>
                  <span>{grapheme.artifact_code || 'N/A'}</span>
                </div>
                {grapheme.surface_page && (
                  <div className="info-item">
                    <label>Page:</label>
                    <span>{grapheme.surface_page}</span>
                  </div>
                )}
                {grapheme.event_calendar && grapheme.event_calendar !== '-' && (
                  <div className="info-item">
                    <label>Date:</label>
                    <span>{grapheme.event_calendar}</span>
                  </div>
                )}
              </div>
            </section>

            <section className="info-section">
              <h3>Grapheme</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Code:</label>
                  <span className="code-value">{grapheme.grapheme_code || grapheme.graphcode || 'N/A'}</span>
                </div>
                {grapheme.grapheme_maya && grapheme.grapheme_maya !== '_' && (
                  <div className="info-item">
                    <label>Maya:</label>
                    <span>{grapheme.grapheme_maya}</span>
                  </div>
                )}
                {grapheme.grapheme_english && grapheme.grapheme_english !== '_' && (
                  <div className="info-item">
                    <label>English:</label>
                    <span>"{grapheme.grapheme_english}"</span>
                  </div>
                )}
              </div>
            </section>

            {grapheme.block_maya1 && grapheme.block_maya1 !== '_' && (
              <section className="info-section">
                <h3>Block Context</h3>
                <div className="context-text">
                  <p className="maya-text">{grapheme.block_maya1}</p>
                  {grapheme.block_english && grapheme.block_english !== '_' && (
                    <p className="english-text">"{grapheme.block_english}"</p>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right side - Catalog sign */}
          {grapheme.catalog_sign_id && (
            <div className="catalog-column">
              <section className="catalog-section">
                <h3>Catalog Sign</h3>
                
                {grapheme.primary_image_url && (
                  <div className="catalog-image">
                    <img src={grapheme.primary_image_url} alt={grapheme.graphcode} />
                  </div>
                )}
                
                <div className="catalog-details">
                  <div className="catalog-code">{grapheme.graphcode}</div>
                  
                  {grapheme.thompson_code && (
                    <div className="catalog-meta">T{grapheme.thompson_code}</div>
                  )}
                  
                  {grapheme.syllabic_value && (
                    <div className="catalog-phonetic">{grapheme.syllabic_value}</div>
                  )}
                  
                  {grapheme.logographic_value && (
                    <div className="catalog-logographic">{grapheme.logographic_value}</div>
                  )}
                  
                  {grapheme.english_translation && (
                    <div className="catalog-translation">"{grapheme.english_translation}"</div>
                  )}
                  
                  {grapheme.word_class && (
                    <div className="catalog-class">{grapheme.word_class}</div>
                  )}
                </div>

                <Link 
                  to={`/sign/${grapheme.catalog_sign_id}`} 
                  className="catalog-link-btn"
                  onClick={onClose}
                >
                  View Full Catalog Entry →
                </Link>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
