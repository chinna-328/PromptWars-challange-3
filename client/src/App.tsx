import { lazy, Suspense, useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { SkipLink } from './components/SkipLink';
import { Nav } from './components/Nav';
import { LeafMark } from './components/icons';

// Route pages are lazy-loaded so each route ships its own chunk.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LogActivity = lazy(() => import('./pages/LogActivity'));
const Insights = lazy(() => import('./pages/Insights'));
const Actions = lazy(() => import('./pages/Actions'));
const Understand = lazy(() => import('./pages/Understand'));

/**
 * App shell: skip link, primary navigation, a single <main> landmark and
 * lazy routes. On route change focus moves to <main> so keyboard and
 * screen-reader users land on the new page content, not the navigation.
 */
export function App(): JSX.Element {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the initial load so we don't steal focus from the document.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <>
      <SkipLink />
      <header>
        <div className="brand">
          <LeafMark />
          <span className="brand-word">
            Eco<span className="brand-trace">Trace</span>
          </span>
        </div>
        <Nav />
      </header>
      <main id="main" ref={mainRef} tabIndex={-1}>
        <Suspense fallback={<p role="status">Loading page…</p>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<LogActivity />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/actions" element={<Actions />} />
            <Route path="/understand" element={<Understand />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}
