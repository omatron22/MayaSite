import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import { Navbar } from './components/Navbar'
import { SearchPage } from './pages/search'
import { SignDetailPage } from './pages/signDetail'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/sign/:id" element={<SignDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

// Replace the AboutPage function in App.tsx
function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-container">
        <h1>About the Maya Hieroglyphic Database</h1>
        
        <section className="about-section">
          <p className="lead">
            The Maya developed the most sophisticated writing system in the pre-Columbian Americas. 
            This database consolidates fragmented scholarly resources to make Maya epigraphy research 
            more accessible and efficient.
          </p>
        </section>

        <section className="about-section">
          <h2>The Challenge</h2>
          <p>
            Maya glyphs have been catalogued according to multiple, often incompatible classification systems 
            over the past century. One catalog may list a sign once, while another splits it into several 
            entries based on minor shape variations. A third might omit it entirely.
          </p>
          <p>
            This fragmentation forces researchers to cross-reference multiple sources manually, 
            slowing progress and creating barriers to entry for new scholars.
          </p>
        </section>

        <section className="about-section">
          <h2>Our Solution</h2>
          <p>
            We've unified data from the Maya Hieroglyphic Database (MHD), machine learning datasets, 
            and cross-catalog mappings into a single searchable interface. The database includes:
          </p>
          <ul className="feature-list">
            <li>
              <strong>3,141 catalog signs</strong> with images, phonetic values, and translations
            </li>
            <li>
              <strong>208,000 glyph blocks</strong> documenting real inscriptions across sites and time periods
            </li>
            <li>
              <strong>208,000 grapheme instances</strong> showing how signs appear in archaeological context
            </li>
            <li>
              <strong>10,665 annotated examples</strong> with instance segmentation masks for computer vision
            </li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Data Coverage</h2>
          <div className="stats-grid-about">
            <div className="stat-card-about">
              <div className="stat-value">4,901</div>
              <div className="stat-label">Unique artifacts</div>
            </div>
            <div className="stat-card-about">
              <div className="stat-value">75%</div>
              <div className="stat-label">Graphemes linked to catalog</div>
            </div>
            <div className="stat-card-about">
              <div className="stat-value">159,489</div>
              <div className="stat-label">Blocks with calendar dates</div>
            </div>
            <div className="stat-card-about">
              <div className="stat-value">205,969</div>
              <div className="stat-label">Blocks with translations</div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Cross-Catalog Mappings</h2>
          <p>
            We integrate multiple classification systems to help researchers navigate between catalogs:
          </p>
          <ul className="catalog-list">
            <li><strong>Thompson (1962)</strong> - The foundational catalog with ~1,000 signs</li>
            <li><strong>Zender</strong> - Modern phonetic-based classification</li>
            <li><strong>Kettunen (2011)</strong> - Comprehensive handbook system</li>
            <li><strong>Gronemeyer</strong> - Recent typological approach</li>
            <li><strong>MHD 2003</strong> - Original Maya Hieroglyphic Database codes</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Data Sources</h2>
          <ul className="source-list">
            <li>
              <strong>Maya Hieroglyphic Database (MHD)</strong><br/>
              Comprehensive scholarly database with artifact locations, dates, and contextual metadata
            </li>
            <li>
              <strong>Roboflow Dataset</strong><br/>
              Annotated training data with instance segmentation masks for computer vision research
            </li>
            <li>
              <strong>Cross-Reference Tables</strong><br/>
              Manually curated mappings between Thompson, Zender, Kettunen, and other systems
            </li>
          </ul>
        </section>

        <section className="about-section footer-section">
          <p className="attribution">
            This project consolidates publicly available scholarly resources. 
            All contributors to this database will be credited as co-authors in resulting publications.
          </p>
        </section>
      </div>
    </div>
  );
}


export default App
