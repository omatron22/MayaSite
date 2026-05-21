import { lazy, Suspense } from 'react';
import { ProgressBarLoader } from './components/ui/ProgressBarLoader';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';

// Retry dynamic imports once on failure (handles stale chunks after deploy)
function lazyRetry<T extends { [key: string]: unknown }>(fn: () => Promise<T>) {
  return lazy(() => fn().catch(() => {
    window.location.reload();
    return new Promise<{ default: React.ComponentType }>(() => {});
  }) as Promise<{ default: React.ComponentType }>);
}

const SearchPage = lazyRetry(() => import('./pages/search').then(m => ({ default: m.SearchPage })));
const SignDetailPage = lazyRetry(() => import('./pages/signDetail').then(m => ({ default: m.SignDetailPage })));
const BlockDetailPage = lazyRetry(() => import('./pages/blockDetail').then(m => ({ default: m.BlockDetailPage })));
const GraphemeDetailPage = lazyRetry(() => import('./pages/graphemeDetail').then(m => ({ default: m.GraphemeDetailPage })));
const AboutPage = lazyRetry(() => import('./pages/about').then(m => ({ default: m.AboutPage })));
const CollectionsPage = lazyRetry(() => import('./pages/collections').then(m => ({ default: m.CollectionsPage })));
const KerrPage = lazyRetry(() => import('./pages/kerr').then(m => ({ default: m.KerrPage })));
const CmhiPage = lazyRetry(() => import('./pages/cmhi').then(m => ({ default: m.CmhiPage })));
const EntryDetailPage = lazyRetry(() => import('./pages/entryDetail').then(m => ({ default: m.EntryDetailPage })));
const ApiPage = lazyRetry(() => import('./pages/api').then(m => ({ default: m.ApiPage })));
const ScannerPage = lazyRetry(() => import('./pages/scanner').then(m => ({ default: m.ScannerPage })));

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
              <Route path="/api" element={<ApiPage />} />
              <Route path="/scanner" element={<ScannerPage />} />
              {/* Redirects for old routes */}
              <Route path="/research" element={<Navigate to="/about" replace />} />
              <Route path="/tools" element={<Navigate to="/search" replace />} />
              <Route path="/tools/search" element={<Navigate to="/search" replace />} />
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
