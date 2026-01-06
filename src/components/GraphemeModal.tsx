// src/components/GraphemeModal.tsx
import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Package, FileText, BookOpen, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../lib/db';
import './GraphemeModal.css';

interface GraphemeModalProps {
  graphemeId: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

// Memoized Catalog Code Badge Component
const CatalogCodeBadge = memo(({ 
  label, 
  code, 
  variant, 
  badgeClass 
}: { 
  label: string; 
  code: string; 
  variant?: string; 
  badgeClass: string; 
}) => (
  <div className="catalog-code-item">
    <span className="code-label">{label}:</span>
    <span className={`code-badge ${badgeClass}`}>{code}</span>
    {variant && <span className="code-variant">var. {variant}</span>}
  </div>
));
CatalogCodeBadge.displayName = 'CatalogCodeBadge';

export function GraphemeModal({ graphemeId, onClose, onNext, onPrev }: GraphemeModalProps) {
  const [grapheme, setGrapheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Prevent background scroll with layout shift prevention
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

  // Load grapheme data
  useEffect(() => {
    loadGrapheme();
  }, [graphemeId]);

  const loadGrapheme = useCallback(async () => {
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
            b.event_long_count,
            b.surface_page,
            b.region,
            b.site_name,
            b.technique as block_technique,
            b.material,
            b.artifact_type,
            cs.id as catalog_sign_id,
            cs.graphcode,
            cs.primary_image_url,
            cs.mhd_code,
            cs.mhd_code_sub,
            cs.mhd_code_2003,
            cs.thompson_code,
            cs.thompson_variant,
            cs.zender_code,
            cs.kettunen_code,
            cs.gronemeyer_code,
            cs.syllabic_value,
            cs.logographic_value,
            cs.logographic_cvc,
            cs.english_translation,
            cs.word_class,
            cs.technique as sign_technique,
            cs.distribution,
            cs.picture_description
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
  }, [graphemeId]);

  // Memoized helper function
  const hasValue = useCallback((val: any) => val && val !== '_' && val !== '-' && val !== 'N/A', []);

  // Memoized computed values
  const hasTemporal = useMemo(
    () => hasValue(grapheme?.event_calendar) || hasValue(grapheme?.event_long_count),
    [grapheme, hasValue]
  );

  const hasGeographic = useMemo(
    () => hasValue(grapheme?.region) || hasValue(grapheme?.site_name),
    [grapheme, hasValue]
  );

  const hasBlockContext = useMemo(
    () => hasValue(grapheme?.block_maya1) || hasValue(grapheme?.block_english),
    [grapheme, hasValue]
  );

  const hasMetadata = useMemo(
    () => hasValue(grapheme?.sign_technique) || hasValue(grapheme?.distribution) || hasValue(grapheme?.picture_description),
    [grapheme, hasValue]
  );

  // Memoized catalog codes for rendering
  const catalogCodes = useMemo(() => {
    if (!grapheme) return [];
    
    return [
      hasValue(grapheme.thompson_code) && { 
        label: 'Thompson', 
        code: `T${grapheme.thompson_code}`, 
        variant: grapheme.thompson_variant,
        badgeClass: 'thompson' 
      },
      hasValue(grapheme.zender_code) && { 
        label: 'Zender', 
        code: grapheme.zender_code, 
        badgeClass: 'zender' 
      },
      hasValue(grapheme.kettunen_code) && { 
        label: 'Kettunen', 
        code: grapheme.kettunen_code, 
        badgeClass: 'kettunen' 
      },
      hasValue(grapheme.gronemeyer_code) && { 
        label: 'Gronemeyer', 
        code: grapheme.gronemeyer_code, 
        badgeClass: 'gronemeyer' 
      },
      hasValue(grapheme.mhd_code_2003) && { 
        label: 'MHD 2003', 
        code: grapheme.mhd_code_2003, 
        badgeClass: 'mhd' 
      }
    ].filter(Boolean);
  }, [grapheme, hasValue]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading grapheme details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!grapheme) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content grapheme-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>
        
        <div className="modal-header">
          {onPrev && (
            <button className="nav-btn" onClick={onPrev} aria-label="Previous grapheme">
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
          )}
          <h2>
            {grapheme.mhd_block_id || 'Unknown Block'} - {grapheme.grapheme_code || grapheme.graphcode}
          </h2>
          {onNext && (
            <button className="nav-btn" onClick={onNext} aria-label="Next grapheme">
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        <div className="modal-body">
          {/* Left side - Instance Data */}
          <div className="data-column">
            
            {/* TEMPORAL INFORMATION */}
            {hasTemporal && (
              <section className="info-section temporal-section">
                <h3><Calendar size={16} /> Temporal Information</h3>
                <div className="info-grid">
                  {hasValue(grapheme.event_calendar) && (
                    <div className="info-item">
                      <label>Calendar Date:</label>
                      <span className="highlight-value">{grapheme.event_calendar}</span>
                    </div>
                  )}
                  {hasValue(grapheme.event_long_count) && (
                    <div className="info-item">
                      <label>Long Count:</label>
                      <span className="code-value">{grapheme.event_long_count}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* GEOGRAPHIC INFORMATION */}
            {hasGeographic && (
              <section className="info-section geographic-section">
                <h3><MapPin size={16} /> Geographic Origin</h3>
                <div className="info-grid">
                  {hasValue(grapheme.region) && (
                    <div className="info-item">
                      <label>Region:</label>
                      <span className="highlight-value">{grapheme.region}</span>
                    </div>
                  )}
                  {hasValue(grapheme.site_name) && (
                    <div className="info-item">
                      <label>Site:</label>
                      <span>{grapheme.site_name}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ARTIFACT INFORMATION */}
            <section className="info-section artifact-section">
              <h3><Package size={16} /> Artifact Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Block ID:</label>
                  <span className="code-value">{grapheme.mhd_block_id || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Artifact Code:</label>
                  <span>{grapheme.artifact_code || 'N/A'}</span>
                </div>
                {hasValue(grapheme.surface_page) && (
                  <div className="info-item">
                    <label>Surface/Page:</label>
                    <span>{grapheme.surface_page}</span>
                  </div>
                )}
                {hasValue(grapheme.artifact_type) && (
                  <div className="info-item">
                    <label>Type:</label>
                    <span>{grapheme.artifact_type}</span>
                  </div>
                )}
                {hasValue(grapheme.material) && (
                  <div className="info-item">
                    <label>Material:</label>
                    <span>{grapheme.material}</span>
                  </div>
                )}
                {hasValue(grapheme.block_technique) && (
                  <div className="info-item">
                    <label>Technique:</label>
                    <span>{grapheme.block_technique}</span>
                  </div>
                )}
              </div>
            </section>

            {/* GRAPHEME INSTANCE */}
            <section className="info-section grapheme-section">
              <h3><FileText size={16} /> Grapheme Instance</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Code:</label>
                  <span className="code-value">{grapheme.grapheme_code || grapheme.graphcode || 'N/A'}</span>
                </div>
                {hasValue(grapheme.grapheme_maya) && (
                  <div className="info-item">
                    <label>Maya Text:</label>
                    <span className="maya-value">{grapheme.grapheme_maya}</span>
                  </div>
                )}
                {hasValue(grapheme.grapheme_english) && (
                  <div className="info-item">
                    <label>Translation:</label>
                    <span className="translation-value">"{grapheme.grapheme_english}"</span>
                  </div>
                )}
              </div>
            </section>

            {/* BLOCK CONTEXT */}
            {hasBlockContext && (
              <section className="info-section context-section">
                <h3><BookOpen size={16} /> Block Context</h3>
                <div className="context-text">
                  {hasValue(grapheme.block_maya1) && (
                    <p className="maya-text">{grapheme.block_maya1}</p>
                  )}
                  {hasValue(grapheme.block_english) && (
                    <p className="english-text">"{grapheme.block_english}"</p>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right side - Catalog Sign */}
          {grapheme.catalog_sign_id && (
            <div className="catalog-column">
              <section className="catalog-section">
                <h3><BookOpen size={16} /> Catalog Sign Reference</h3>
                
                {grapheme.primary_image_url && (
                  <div className="catalog-image">
                    <img src={grapheme.primary_image_url} alt={grapheme.graphcode} loading="lazy" />
                  </div>
                )}
                
                <div className="catalog-details">
                  <div className="catalog-code">{grapheme.graphcode}</div>
                  
                  {/* CROSS-CATALOG CODES */}
                  {catalogCodes.length > 0 && (
                    <div className="catalog-codes-section">
                      {catalogCodes.map((codeData: any) => (
                        <CatalogCodeBadge
                          key={codeData.label}
                          label={codeData.label}
                          code={codeData.code}
                          variant={codeData.variant}
                          badgeClass={codeData.badgeClass}
                        />
                      ))}
                    </div>
                  )}

                  {/* PHONETIC & SEMANTIC VALUES */}
                  <div className="values-section">
                    {hasValue(grapheme.syllabic_value) && (
                      <div className="value-item">
                        <span className="value-label">Syllabic:</span>
                        <span className="catalog-phonetic">{grapheme.syllabic_value}</span>
                      </div>
                    )}
                    {hasValue(grapheme.logographic_value) && (
                      <div className="value-item">
                        <span className="value-label">Logographic:</span>
                        <span className="catalog-logographic">{grapheme.logographic_value}</span>
                      </div>
                    )}
                    {hasValue(grapheme.logographic_cvc) && (
                      <div className="value-item">
                        <span className="value-label">CVC:</span>
                        <span className="catalog-cvc">{grapheme.logographic_cvc}</span>
                      </div>
                    )}
                    {hasValue(grapheme.english_translation) && (
                      <div className="value-item">
                        <span className="value-label">Translation:</span>
                        <span className="catalog-translation">"{grapheme.english_translation}"</span>
                      </div>
                    )}
                    {hasValue(grapheme.word_class) && (
                      <div className="value-item">
                        <span className="value-label">Word Class:</span>
                        <span className="catalog-class">{grapheme.word_class}</span>
                      </div>
                    )}
                  </div>

                  {/* ADDITIONAL METADATA */}
                  {hasMetadata && (
                    <div className="metadata-section">
                      {hasValue(grapheme.sign_technique) && (
                        <div className="metadata-item">
                          <span className="meta-label">Technique:</span>
                          <span className="meta-value">{grapheme.sign_technique}</span>
                        </div>
                      )}
                      {hasValue(grapheme.distribution) && (
                        <div className="metadata-item">
                          <span className="meta-label">Distribution:</span>
                          <span className="meta-value">{grapheme.distribution}</span>
                        </div>
                      )}
                      {hasValue(grapheme.picture_description) && (
                        <div className="metadata-item full-width">
                          <span className="meta-label">Description:</span>
                          <span className="meta-value">{grapheme.picture_description}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="catalog-actions">
                  <Link 
                    to={`/sign/${grapheme.catalog_sign_id}`} 
                    className="catalog-link-btn"
                    onClick={onClose}
                  >
                    <span>View Full Catalog Entry</span>
                    <ChevronRight size={16} />
                  </Link>
                  
                  {grapheme.mhd_block_id && (
                    <a
                      href={`http://research.mayavase.com/kerrmaya_hires.php?vase=${grapheme.mhd_block_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="external-link-btn"
                    >
                      <span>View on MHD</span>
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
