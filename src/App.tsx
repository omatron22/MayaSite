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

function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <h1 className="text-5xl font-bold mb-8">About This Project</h1>
        
        <div className="space-y-6 text-lg text-gray-300 leading-relaxed">
          <p>
            The Maya developed the most complex writing system in the pre-Columbian Americas. 
            Appearing around 300 BCE, Maya writing flourished over a millennium, surviving in 
            vestigial form through the Spanish conquest.
          </p>

          <p>
            In Classic Maya, words are spelled using graphic combinations of syllabograms and 
            logograms, of which there are roughly 800-1000. These glyphs have been catalogued 
            and classified over decades according to multiple, often incompatible, classification systems.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">The Problem</h2>
          
          <p>
            Such systems align poorly with one another: one catalog may list a sign once, while 
            another may split it into several entries based on minor differences in shape or orientation. 
            A third catalog might omit the sign entirely. As a result, the same glyph can appear 
            redundantly, inconsistently, or not at all depending on the system used.
          </p>

          <p>
            Because of these inconsistent cataloging systems, Mayanists sidestep the time-consuming 
            task of actually encoding glyphic spellings. Instead, they focus on phonetic transcription 
            and translation. This is a lossy data transfer which does not preserve information about 
            glyph choice and spatial arrangement—two variables that vary significantly over space and time.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Our Solution</h2>

          <p>
            This database consolidates fragmented data sources to make Maya epigraphy research 
            more accessible and efficient. We've integrated:
          </p>

          <ul className="list-disc ml-8 space-y-2">
            <li><strong>3,141 catalog signs</strong> from the Maya Hieroglyphic Database</li>
            <li><strong>208,000 glyph blocks</strong> with location and date metadata</li>
            <li><strong>293,600 grapheme occurrences</strong> documenting real-world usage</li>
            <li><strong>10,665 annotated instances</strong> with instance segmentation masks</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Dataset Coverage</h2>

          <div className="grid grid-cols-2 gap-6 my-8">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="text-3xl font-bold text-blue-400 mb-2">90%</div>
              <div className="text-sm text-gray-400">Signs with images</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="text-3xl font-bold text-green-400 mb-2">87%</div>
              <div className="text-sm text-gray-400">Graphemes with images</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="text-3xl font-bold text-purple-400 mb-2">276</div>
              <div className="text-sm text-gray-400">Phonetic variants tracked</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="text-3xl font-bold text-orange-400 mb-2">100%</div>
              <div className="text-sm text-gray-400">Roboflow instances segmented</div>
            </div>
          </div>

          <h2 className="text-3xl font-bold mt-12 mb-4">Data Sources</h2>

          <ul className="space-y-4">
            <li>
              <strong className="text-white">Maya Hieroglyphic Database (MHD)</strong> - 
              Comprehensive catalog with location, date, and artifact metadata
            </li>
            <li>
              <strong className="text-white">Roboflow Dataset</strong> - 
              Annotated training data with instance segmentation masks
            </li>
            <li>
              <strong className="text-white">Cross-Catalog Mappings</strong> - 
              Thompson, Zender, Kettunen, and other classification systems
            </li>
          </ul>

          <p className="mt-12 text-gray-400 text-sm">
            This project is the shared intellectual property of all contributors. 
            Every person who has meaningfully contributed to the project will be credited as a co-author 
            in any resulting publications.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App
