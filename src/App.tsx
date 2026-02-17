import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';

// Eager load search page (home page)
import { SearchPage } from './pages/search';

// Lazy load other routes
const SignDetailPage = lazy(() => import('./pages/signDetail').then(m => ({ default: m.SignDetailPage })));
const BlockDetailPage = lazy(() => import('./pages/blockDetail').then(m => ({ default: m.BlockDetailPage })));
const GraphemeDetailPage = lazy(() => import('./pages/graphemeDetail').then(m => ({ default: m.GraphemeDetailPage })));
const ResearchPage = lazy(() => import('./pages/research').then(m => ({ default: m.ResearchPage })));
const AboutPage = lazy(() => import('./pages/about').then(m => ({ default: m.AboutPage })));
const ToolsPage = lazy(() => import('./pages/tools').then(m => ({ default: m.ToolsPage })));
const ScannerPage = lazy(() => import('./pages/scanner').then(m => ({ default: m.ScannerPage })));
const MapPage = lazy(() => import('./pages/map').then(m => ({ default: m.MapPage })));
const KerrPage = lazy(() => import('./pages/kerr').then(m => ({ default: m.KerrPage })));
const CmhiPage = lazy(() => import('./pages/cmhi').then(m => ({ default: m.CmhiPage })));

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="loading-spinner"></div>
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/sign/:id" element={<SignDetailPage />} />
              <Route path="/block/:id" element={<BlockDetailPage />} />
              <Route path="/grapheme/:id" element={<GraphemeDetailPage />} />
              <Route path="/research" element={<ResearchPage />} />
              <Route path="/tools" element={<ToolsPage />}>
                <Route index element={<Navigate to="scanner" replace />} />
                <Route path="scanner" element={<ScannerPage />} />
                <Route path="map" element={<MapPage />} />
                <Route path="kerr" element={<KerrPage />} />
                <Route path="cmhi" element={<CmhiPage />} />
              </Route>
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
