import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import { Navbar } from './components/Navbar'
import { SearchPage } from './pages/search'
import { SignDetailPage } from './pages/signDetail'
import { AdminPage } from './pages/admin'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/sign/:id" element={<SignDetailPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function AboutPage() {
  return (
    <div className="page about-page">
      <h1>About Maya Database</h1>
      <p>
        A unified search interface for Maya hieroglyphic signs across multiple 
        cataloging systems including Bonn, Thompson, and the Maya Hieroglyphic Database.
      </p>
      <p>
        This tool consolidates fragmented data sources to make Maya epigraphy 
        research more accessible and efficient.
      </p>
    </div>
  );
}

export default App
