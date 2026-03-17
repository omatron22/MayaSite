import { lazy, Suspense } from 'react';
import { ProgressBarLoader } from './components/ui/ProgressBarLoader';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';

const SearchPage = lazy(() => import('./pages/search').then(m => ({ default: m.SearchPage })));
const SignDetailPage = lazy(() => import('./pages/signDetail').then(m => ({ default: m.SignDetailPage })));
const BlockDetailPage = lazy(() => import('./pages/blockDetail').then(m => ({ default: m.BlockDetailPage })));
const GraphemeDetailPage = lazy(() => import('./pages/graphemeDetail').then(m => ({ default: m.GraphemeDetailPage })));
const AboutPage = lazy(() => import('./pages/about').then(m => ({ default: m.AboutPage })));
const CollectionsPage = lazy(() => import('./pages/collections').then(m => ({ default: m.CollectionsPage })));
const KerrPage = lazy(() => import('./pages/kerr').then(m => ({ default: m.KerrPage })));
const CmhiPage = lazy(() => import('./pages/cmhi').then(m => ({ default: m.CmhiPage })));
const EntryDetailPage = lazy(() => import('./pages/entryDetail').then(m => ({ default: m.EntryDetailPage })));
const ScannerPage = lazy(() => import('./pages/scanner').then(m => ({ default: m.ScannerPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <ProgressBarLoader />
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
              <Route path="/" element={<Navigate to="/search" replace />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/search/scanner" element={<ScannerPage />} />
              <Route path="/sign/:id" element={<SignDetailPage />} />
              <Route path="/entry/:entryId" element={<EntryDetailPage />} />
              <Route path="/block/:id" element={<BlockDetailPage />} />
              <Route path="/grapheme/:id" element={<GraphemeDetailPage />} />
              <Route path="/collections" element={<CollectionsPage />}>
                <Route index element={<Navigate to="kerr" replace />} />
                <Route path="kerr" element={<KerrPage />} />
                <Route path="cmhi" element={<CmhiPage />} />
              </Route>
              <Route path="/about" element={<AboutPage />} />
              {/* Redirects for old routes */}
              <Route path="/research" element={<Navigate to="/about" replace />} />
              <Route path="/tools" element={<Navigate to="/search/scanner" replace />} />
              <Route path="/tools/scanner" element={<Navigate to="/search/scanner" replace />} />
              <Route path="/tools/map" element={<Navigate to="/about" replace />} />
              <Route path="/tools/kerr" element={<Navigate to="/collections/kerr" replace />} />
              <Route path="/tools/cmhi" element={<Navigate to="/collections/cmhi" replace />} />
              <Route path="/map" element={<Navigate to="/about" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
