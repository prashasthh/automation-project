import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { GenerationProvider, useGeneration } from './contexts/GenerationContext';
import { ToastProvider } from './components/Toast';
import SearchPage from './pages/SearchPage';
import QueuePage from './pages/QueuePage';
import LibraryPage from './pages/LibraryPage';
import BrandPage from './pages/BrandPage';

// ─── Sidebar ──────────────────────────────────────────────────────────────────

// Monochrome line icons (Trace0 technical aesthetic)
const icons = {
  find: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-[18px] h-[18px]">
      <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4-4M11 8v6M8 11h6" />
    </svg>
  ),
  queue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-[18px] h-[18px]">
      <circle cx="12" cy="12" r="8.5" /><path strokeLinecap="round" d="M12 7.5V12l3 2" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-[18px] h-[18px]">
      <rect x="3.5" y="3.5" width="7" height="7" /><rect x="13.5" y="3.5" width="7" height="7" />
      <rect x="3.5" y="13.5" width="7" height="7" /><rect x="13.5" y="13.5" width="7" height="7" />
    </svg>
  ),
  brand: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-[18px] h-[18px]">
      <path strokeLinejoin="round" d="M4 4h8l8 8-8 8-8-8V4z" /><circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
};

function Sidebar() {
  const { activeCount } = useGeneration();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium tracking-wide uppercase transition-colors duration-200 ${
      isActive
        ? 'text-[var(--accent)] bg-[rgba(255,95,31,0.06)]'
        : 'text-zinc-500 hover:text-zinc-200'
    }`;

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-[#050505] border-r border-[var(--border)] flex flex-col z-30 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[var(--accent)] flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(255,95,31,0.4)]">
            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-display text-[15px] tracking-tight font-semibold text-[var(--fg)]">
            AdForge
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-mono">
          <span className="w-1 h-1 bg-[var(--accent)] animate-pulse" />
          System.Online
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-1 pb-2 text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-600 font-mono">
          SYS.01 / Workspace
        </p>

        <NavLink to="/" end className={navItemClass} id="nav-find-ads">
          {({ isActive }) => (
            <>
              <span className={`absolute left-0 top-0 h-full w-[2px] bg-[var(--accent)] transition-transform origin-top ${isActive ? 'scale-y-100' : 'scale-y-0'}`} />
              {icons.find}
              <span>Find Ads</span>
            </>
          )}
        </NavLink>

        <NavLink to="/queue" className={navItemClass} id="nav-queue">
          {({ isActive }) => (
            <>
              <span className={`absolute left-0 top-0 h-full w-[2px] bg-[var(--accent)] transition-transform origin-top ${isActive ? 'scale-y-100' : 'scale-y-0'}`} />
              {icons.queue}
              <span className="flex-1">Queue</span>
              {activeCount > 0 && (
                <span className="bg-[var(--accent)] text-black text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                  {activeCount}
                </span>
              )}
            </>
          )}
        </NavLink>

        <NavLink to="/library" className={navItemClass} id="nav-library">
          {({ isActive }) => (
            <>
              <span className={`absolute left-0 top-0 h-full w-[2px] bg-[var(--accent)] transition-transform origin-top ${isActive ? 'scale-y-100' : 'scale-y-0'}`} />
              {icons.library}
              <span>Library</span>
            </>
          )}
        </NavLink>

        <div className="pt-4">
          <p className="px-3 pb-2 text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-600 font-mono">
            SYS.02 / Settings
          </p>
          <NavLink to="/brand" className={navItemClass} id="nav-brand">
            {({ isActive }) => (
              <>
                <span className={`absolute left-0 top-0 h-full w-[2px] bg-[var(--accent)] transition-transform origin-top ${isActive ? 'scale-y-100' : 'scale-y-0'}`} />
                {icons.brand}
                <span>Brand</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">v1.0.0 · local-first</p>
      </div>
    </aside>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function Layout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-56 min-h-screen">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/brand" element={<BrandPage />} />
        </Routes>
      </main>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <GenerationProvider>
          <Layout />
        </GenerationProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
