// src/components/BlockModal.tsx
import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { FileText, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../lib/db';
import './BlockModal.css';

interface BlockModalProps {
  blockId: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

// Memoized Grapheme Item Component
const GraphemeItem = memo(({ grapheme }: { grapheme: any }) => (
  <div className="grapheme-item">
    {grapheme.primary_image_url && (
      <div className="grapheme-thumb">
        <img src={grapheme.primary_image_url} alt={grapheme.graphcode} loading="lazy" />
      </div>
    )}
    <div className="grapheme-info">
      <div className="grapheme-code">{grapheme.graphcode || grapheme.grapheme_code}</div>
      {grapheme.syllabic_value && (
        <div className="grapheme-value">{grapheme.syllabic_value}</div>
      )}
      {grapheme.grapheme_english && grapheme.grapheme_english !== '_' && (
        <div className="grapheme-translation">"{grapheme.grapheme_english}"</div>
      )}
    </div>
  </div>
));
GraphemeItem.displayName = 'GraphemeItem';

export function BlockModal({ blockId, onClose, onNext, onPrev }: BlockModalProps) {
  const [block, setBlock] = useState<any>(null);
  const [graphemes, setGraphemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Prevent background scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  // Load block data
  useEffect(() => {
    loadBlock();
  }, [blockId]);

  const loadBlock = useCallback(async () => {
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
  }, [blockId]);

  // Memoized helpers
  const hasValue = useCallback((val: any) => val && val !== '_' && val !== '-', []);

  const hasCalendarInfo = useMemo(
    () => hasValue(block?.event_calendar) || hasValue(block?.event_long_count),
    [block, hasValue]
  );

  const hasTextContent = useMemo(
    () => hasValue(block?.block_maya1) || hasValue(block?.block_english),
    [block, hasValue]
  );

  const hasNotes = useMemo(
    () => block?.notes && block.notes !== '',
    [block]
  );

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading block details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!block) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content block-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>
        
        <div className="modal-header">
          {onPrev && (
            <button className="nav-btn" onClick={onPrev} aria-label="Previous block">
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
          )}
          <h2>{block.mhd_block_id}</h2>
          {onNext && (
            <button className="nav-btn" onClick={onNext} aria-label="Next block">
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        <div className="modal-body">
          <div className="block-info-column">
            <section className="info-section">
              <h3><FileText size={16} /> Block Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Block ID:</label>
                  <span>{block.mhd_block_id}</span>
                </div>
                <div className="info-item">
                  <label>Artifact:</label>
                  <span>{block.artifact_code}</span>
                </div>
                {hasValue(block.surface_page) && (
                  <div className="info-item">
                    <label>Surface/Page:</label>
                    <span>{block.surface_page}</span>
                  </div>
                )}
                {hasValue(block.orientation_frame) && (
                  <div className="info-item">
                    <label>Frame:</label>
                    <span>{block.orientation_frame}</span>
                  </div>
                )}
              </div>
            </section>

            {hasTextContent && (
              <section className="info-section">
                <h3><FileText size={16} /> Text</h3>
                <div className="block-text-content">
                  {hasValue(block.block_maya1) && (
                    <p className="maya-text">{block.block_maya1}</p>
                  )}
                  {hasValue(block.block_maya2) && (
                    <p className="maya-text-alt">{block.block_maya2}</p>
                  )}
                  {hasValue(block.block_english) && (
                    <p className="english-text">"{block.block_english}"</p>
                  )}
                </div>
              </section>
            )}

            {hasCalendarInfo && (
              <section className="info-section">
                <h3><Calendar size={16} /> Calendar Information</h3>
                <div className="info-grid">
                  {hasValue(block.event_calendar) && (
                    <div className="info-item">
                      <label>Calendar:</label>
                      <span>{block.event_calendar}</span>
                    </div>
                  )}
                  {hasValue(block.event_long_count) && (
                    <div className="info-item">
                      <label>Long Count:</label>
                      <span>{block.event_long_count}</span>
                    </div>
                  )}
                  {hasValue(block.event_260_day) && (
                    <div className="info-item">
                      <label>260-day:</label>
                      <span>{block.event_260_day}</span>
                    </div>
                  )}
                  {hasValue(block.event_365_day) && (
                    <div className="info-item">
                      <label>365-day:</label>
                      <span>{block.event_365_day}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {hasNotes && (
              <section className="info-section">
                <h3><FileText size={16} /> Notes</h3>
                <p className="notes-text">{block.notes}</p>
              </section>
            )}
          </div>

          {graphemes.length > 0 && (
            <div className="graphemes-column">
              <section className="info-section">
                <h3><FileText size={16} /> Graphemes in this Block ({graphemes.length})</h3>
                <div className="graphemes-grid">
                  {graphemes.map((g: any) => (
                    <GraphemeItem key={g.id} grapheme={g} />
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
