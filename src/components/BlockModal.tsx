import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import './BlockModal.css';

interface BlockModalProps {
  blockId: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function BlockModal({ blockId, onClose, onNext, onPrev }: BlockModalProps) {
  const [block, setBlock] = useState<any>(null);
  const [graphemes, setGraphemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlock();
  }, [blockId]);

  async function loadBlock() {
    setLoading(true);
    try {
      // Get block data
      const blockResult = await db.execute({
        sql: `SELECT * FROM blocks WHERE id = ?`,
        args: [blockId]
      });
      
      if (blockResult.rows.length > 0) {
        setBlock(blockResult.rows[0]);
        
        // Get graphemes in this block
        const graphemesResult = await db.execute({
          sql: `
            SELECT 
              g.*,
              cs.graphcode,
              cs.primary_image_url,
              cs.syllabic_value,
              cs.english_translation
            FROM graphemes g
            LEFT JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
            WHERE g.block_id = ?
            ORDER BY g.id
          `,
          args: [blockId]
        });
        
        setGraphemes(graphemesResult.rows);
      }
    } catch (err) {
      console.error('Error loading block:', err);
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

  if (!block) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content block-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          {onPrev && (
            <button className="nav-btn" onClick={onPrev}>
              ← Previous
            </button>
          )}
          <h2>{block.mhd_block_id}</h2>
          {onNext && (
            <button className="nav-btn" onClick={onNext}>
              Next →
            </button>
          )}
        </div>

        <div className="modal-body">
          <div className="block-info-column">
            <section className="info-section">
              <h3>Block Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Block ID:</label>
                  <span>{block.mhd_block_id}</span>
                </div>
                <div className="info-item">
                  <label>Artifact:</label>
                  <span>{block.artifact_code}</span>
                </div>
                {block.surface_page && (
                  <div className="info-item">
                    <label>Surface/Page:</label>
                    <span>{block.surface_page}</span>
                  </div>
                )}
                {block.orientation_frame && (
                  <div className="info-item">
                    <label>Frame:</label>
                    <span>{block.orientation_frame}</span>
                  </div>
                )}
              </div>
            </section>

            {(block.block_maya1 || block.block_english) && (
              <section className="info-section">
                <h3>Text</h3>
                <div className="block-text-content">
                  {block.block_maya1 && block.block_maya1 !== '_' && (
                    <p className="maya-text">{block.block_maya1}</p>
                  )}
                  {block.block_maya2 && block.block_maya2 !== '_' && (
                    <p className="maya-text-alt">{block.block_maya2}</p>
                  )}
                  {block.block_english && block.block_english !== '_' && (
                    <p className="english-text">"{block.block_english}"</p>
                  )}
                </div>
              </section>
            )}

            {(block.event_calendar || block.event_long_count) && (
              <section className="info-section">
                <h3>Calendar Information</h3>
                <div className="info-grid">
                  {block.event_calendar && block.event_calendar !== '-' && (
                    <div className="info-item">
                      <label>Calendar:</label>
                      <span>{block.event_calendar}</span>
                    </div>
                  )}
                  {block.event_long_count && block.event_long_count !== '-' && (
                    <div className="info-item">
                      <label>Long Count:</label>
                      <span>{block.event_long_count}</span>
                    </div>
                  )}
                  {block.event_260_day && (
                    <div className="info-item">
                      <label>260-day:</label>
                      <span>{block.event_260_day}</span>
                    </div>
                  )}
                  {block.event_365_day && (
                    <div className="info-item">
                      <label>365-day:</label>
                      <span>{block.event_365_day}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {block.notes && block.notes !== '' && (
              <section className="info-section">
                <h3>Notes</h3>
                <p className="notes-text">{block.notes}</p>
              </section>
            )}
          </div>

          {graphemes.length > 0 && (
            <div className="graphemes-column">
              <section className="info-section">
                <h3>Graphemes in this Block ({graphemes.length})</h3>
                <div className="graphemes-grid">
                  {graphemes.map((g: any) => (
                    <div key={g.id} className="grapheme-item">
                      {g.primary_image_url && (
                        <div className="grapheme-thumb">
                          <img src={g.primary_image_url} alt={g.graphcode} />
                        </div>
                      )}
                      <div className="grapheme-info">
                        <div className="grapheme-code">{g.graphcode || g.grapheme_code}</div>
                        {g.syllabic_value && (
                          <div className="grapheme-value">{g.syllabic_value}</div>
                        )}
                        {g.grapheme_english && g.grapheme_english !== '_' && (
                          <div className="grapheme-translation">"{g.grapheme_english}"</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
