import React, { Suspense, lazy } from 'react';
import useEquiLens from './store/useEquiLens';
import ArenaPanel from './components/ArenaPanel';
import UploadSection from './components/UploadSection';
import './index.css';

const FloatingTagCloud   = lazy(() => import('./components/FloatingTagCloud'));

const TABS = [
  { id: 'arena',        label: 'ARENA',        icon: '◈' },
  { id: 'analysis',     label: 'ANALYSIS',      icon: '⬡' },
  { id: 'simulator',    label: 'SIMULATOR',     icon: '⚙' },
  { id: 'compliance',   label: 'COMPLIANCE',    icon: '⚖' },
  { id: 'achievements', label: 'ACHIEVEMENTS',  icon: '★' },
];

// ── Tiny helpers ────────────────────────────────────────────────────────────────
const stateColor = (f) => f >= 75 ? '#2ed8a0' : f >= 50 ? '#ffb74d' : '#ff7070';
const cd = (children, style = {}) => (
  <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '14px 16px', ...style }}>
    {children}
  </div>
);
const cdLbl = (text) => (
  <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.13em', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
    {text}
  </div>
);

// ── Navigation ──────────────────────────────────────────────────────────────────
const Header = () => {
  const { xp, scorecard, session } = useEquiLens();
  const f = scorecard.fairness_score;
  const riskColor = f >= 75 ? '#2ed8a0' : f >= 50 ? '#ffb74d' : '#ff7070';
  const riskBg    = f >= 75 ? 'rgba(29,158,117,.14)' : f >= 50 ? 'rgba(239,159,39,.12)' : 'rgba(226,75,74,.14)';
  const lvLabel   = f >= 85 ? 'LV 8' : f >= 75 ? 'LV 7' : f >= 65 ? 'LV 6' : f >= 55 ? 'LV 5' : f >= 45 ? 'LV 4' : 'LV 3';

  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 20px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(7,7,14,0.9)', backdropFilter: 'blur(14px)', height: '54px', flexShrink: 0 }}>
      <div style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>
        Equi<span style={{ color: 'var(--accent-purple)' }}>Lens</span>
      </div>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.09em', padding: '2px 9px', borderRadius: '4px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
        HIRING AI · RANDOMFOREST · {session.uploaded ? 'LIVE' : 'DEMO'}
      </div>
      <div style={{ flex: 1 }} />
      <UploadSection />
      <div style={{ width: '14px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-purple)', padding: '2px 8px', borderRadius: '4px', background: 'rgba(127,119,221,.12)', border: '1px solid rgba(127,119,221,.22)' }}>
          {lvLabel}
        </span>
        <div style={{ width: '90px', height: '6px', background: 'rgba(255,255,255,.06)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${xp.total % 100}%`, background: 'linear-gradient(90deg,#534AB7,#7F77DD)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
        </div>
        <span style={{ fontSize: '10px', color: 'rgba(200,200,224,.52)' }}>XP <span>{xp.total}</span></span>
      </div>
      {session.uploaded && (
        <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.1em', padding: '3px 9px', borderRadius: '4px', border: '1px solid', background: riskBg, color: riskColor, borderColor: `${riskColor}44` }}>
          {f >= 75 ? 'LOW RISK' : f >= 50 ? 'MED RISK' : 'HIGH RISK'}
        </span>
      )}
      <span style={{ fontSize: '9px', fontWeight: 800, background: 'rgba(29,158,117,.12)', color: '#2ed8a0', border: '1px solid rgba(29,158,117,.22)', padding: '3px 9px', borderRadius: '4px' }}>
        ● LIVE
      </span>
    </header>
  );
};

const TabNav = () => {
  const { activeTab, setActiveTab } = useEquiLens();
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '1px', padding: '0 14px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(7,7,14,.7)', height: '46px', flexShrink: 0, overflowX: 'auto' }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
          padding: '0 17px', height: '46px', fontFamily: 'inherit', fontSize: '10px', fontWeight: 700,
          letterSpacing: '0.1em', background: 'transparent', border: 'none', cursor: 'pointer',
          whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px',
          color: activeTab === t.id ? 'var(--accent-purple)' : 'rgba(200,200,224,.3)',
          borderBottom: activeTab === t.id ? '2px solid var(--accent-purple)' : '2px solid transparent',
          transition: 'color .2s, border-color .2s',
        }}>
          <span style={{ opacity: activeTab === t.id ? 1 : 0.5 }}>{t.icon}</span>{t.label}
        </button>
      ))}
    </nav>
  );
};

const AnalysisPanel = lazy(() => import('./components/AnalysisPanel'));

const SimulatorPanel = lazy(() => import('./components/SimulatorPanel'));

const CompliancePanel = lazy(() => import('./components/CompliancePanel'));
const AchievementsPanel = lazy(() => import('./components/AchievementsPanel'));

// ── Tab Router ──────────────────────────────────────────────────────────────────
const TAB_COMPONENTS = {
  arena:        <ArenaPanel />,
  analysis:     <Suspense fallback={<div>Loading Analysis...</div>}><AnalysisPanel /></Suspense>,
  simulator:    <Suspense fallback={<div>Loading Simulator...</div>}><SimulatorPanel /></Suspense>,
  compliance:   <Suspense fallback={<div>Loading Compliance...</div>}><CompliancePanel /></Suspense>,
  achievements: <Suspense fallback={<div>Loading Achievements...</div>}><AchievementsPanel /></Suspense>,
};

function App() {
  const { activeTab } = useEquiLens();
  return (
    <div style={{ background: 'var(--bg-base)', height: '100vh', display: 'grid', gridTemplateRows: '54px 46px 1fr', overflow: 'hidden', fontFamily: "ui-monospace,'Cascadia Code','JetBrains Mono',monospace" }}>
      <Header />
      <TabNav />
      <main style={{ overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '16px 18px' }}>
          {TAB_COMPONENTS[activeTab]}
        </div>
      </main>
    </div>
  );
}

export default App;
