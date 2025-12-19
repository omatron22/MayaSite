// src/pages/about.tsx
export function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-container">
        <div className="about-header">
          <h1>About</h1>
          <p className="about-subtitle">
            Unifying Maya hieroglyphic research through accessible, consolidated data
          </p>
        </div>
        
        <div className="about-content">
          <section className="about-section">
            <h2>The Challenge</h2>
            <p>
              Maya glyphs have been catalogued according to multiple, often incompatible classification 
              systems over the past century. This fragmentation forces researchers to cross-reference 
              multiple sources manually, slowing progress and creating barriers to entry.
            </p>
          </section>

          <section className="about-section">
            <h2>Our Solution</h2>
            <p>
              We've unified data from the Maya Hieroglyphic Database (MHD), machine learning datasets, 
              and cross-catalog mappings into a single searchable interface.
            </p>
            
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-number">3,141</div>
                <div className="feature-label">Catalog signs with images and translations</div>
              </div>
              <div className="feature-card">
                <div className="feature-number">208K</div>
                <div className="feature-label">Glyph blocks from real inscriptions</div>
              </div>
              <div className="feature-card">
                <div className="feature-number">208K</div>
                <div className="feature-label">Grapheme instances in context</div>
              </div>
              <div className="feature-card">
                <div className="feature-number">10,665</div>
                <div className="feature-label">ML annotated examples</div>
              </div>
            </div>
          </section>

          <section className="about-section">
            <h2>Cross-Catalog Integration</h2>
            <p>
              We integrate multiple classification systems to help researchers navigate between catalogs:
            </p>
            <div className="catalog-tags">
              <span className="catalog-tag">Thompson (1962)</span>
              <span className="catalog-tag">Zender</span>
              <span className="catalog-tag">Kettunen (2011)</span>
              <span className="catalog-tag">Gronemeyer</span>
              <span className="catalog-tag">MHD 2003</span>
            </div>
          </section>

          <section className="about-section">
            <h2>Data Sources</h2>
            <div className="source-list">
              <div className="source-item">
                <div className="source-title">Maya Hieroglyphic Database (MHD)</div>
                <div className="source-desc">Comprehensive scholarly database with artifact locations, dates, and contextual metadata</div>
              </div>
              <div className="source-item">
                <div className="source-title">Roboflow Dataset</div>
                <div className="source-desc">Annotated training data with instance segmentation masks for computer vision research</div>
              </div>
              <div className="source-item">
                <div className="source-title">Cross-Reference Tables</div>
                <div className="source-desc">Manually curated mappings between Thompson, Zender, Kettunen, and other systems</div>
              </div>
            </div>
          </section>

          <section className="about-section about-footer">
            <p>
              This project consolidates publicly available scholarly resources. 
              All contributors to this database will be credited as co-authors in resulting publications.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
