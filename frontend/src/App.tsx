import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { GenerationProvider, useGeneration } from './contexts/GenerationContext';
import { ToastProvider } from './components/Toast';
import SearchPage from './pages/SearchPage';
import QueuePage from './pages/QueuePage';
import LibraryPage from './pages/LibraryPage';
import BrandPage from './pages/BrandPage';

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar() {
  const { activeCount } = useGeneration();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
    }`;

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white border-r border-zinc-100 flex flex-col z-30">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-display font-800 text-zinc-900 text-[15px] tracking-tight font-extrabold">
            AdForge
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 font-display">
          Workspace
        </p>

        <NavLink to="/" end className={navItemClass} id="nav-find-ads">
          <span className="text-base">🔍</span>
          <span>Find Ads</span>
        </NavLink>

        <NavLink to="/queue" className={navItemClass} id="nav-queue">
          <span className="text-base">⏱</span>
          <span className="flex-1">Queue</span>
          {activeCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
              {activeCount}
            </span>
          )}
        </NavLink>

        <NavLink to="/library" className={navItemClass} id="nav-library">
          <span className="text-base">📚</span>
          <span>Library</span>
        </NavLink>

        <div className="pt-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 font-display">
            Settings
          </p>
          <NavLink to="/brand" className={navItemClass} id="nav-brand">
            <span className="text-base">🏷</span>
            <span>Brand</span>
          </NavLink>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-100">
        <p className="text-[11px] text-zinc-400 font-mono">v1.0.0 · local-first</p>
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
