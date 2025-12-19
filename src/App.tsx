// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { Navbar } from './components/Navbar';

// Eager load search page (home page) [web:39][web:44]
import { SearchPage } from './pages/search';

// Lazy load other routes [web:39][web:43][web:44]
const SignDetailPage = lazy(() => import('./pages/signDetail').then(m => ({ default: m.SignDetailPage })));
const AnalyticsPage = lazy(() => import('./pages/analytics').then(m => ({ default: m.AnalyticsPage })));
const StatsPage = lazy(() => import('./pages/stats').then(m => ({ default: m.StatsPage })));
const AboutPage = lazy(() => import('./pages/about').then(m => ({ default: m.AboutPage })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="page-loader">
      <div className="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/sign/:id" element={<SignDetailPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
