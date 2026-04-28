import React, { Suspense, lazy, useEffect } from 'react';
import useEquiLens, { getMaturityLevel } from './store/useEquiLens';
import StepProgressBar from './components/StepProgressBar';
import UploadSection from './components/UploadSection';
import DemoMode from './components/DemoMode';
import OnboardingScreen from './components/OnboardingScreen';
import SavedReports from './components/SavedReports';
import { Database } from 'lucide-react';
import './index.css';

// ── Lazy imports ──────────────────────────────────────────────────────────────
const ArenaPanel            = lazy(() => import('./components/ArenaPanel'));
const AIInsightPanel        = lazy(() => import('./components/AIInsightPanel'));
const SimulatorPanel        = lazy(() => import('./components/SimulatorPanel'));
const CompliancePanel       = lazy(() => import('./components/CompliancePanel'));
const AuditMilestonesPanel  = lazy(() => import('./components/AuditMilestonesPanel'));
const RecommendedActionsPanel = lazy(() => import('./components/RecommendedActionsPanel'));
const ExportReportModule    = lazy(() => import('./components/ExportReportModule'));
const EnterpriseUploadZone  = lazy(() => import('./components/EnterpriseUploadZone'));

const Spin = ({ label = 'Loading…' }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:200, fontSize:13, color:'var(--text-muted)' }}>
    {label}
  </div>
);

// ── Colour helpers ─────────────────────────────────────────────────────────────
const fc  = (f) => f >= 75 ? '#2ed8a0' : f >= 50 ? '#ffb74d' : '#ff7070';
const frl = (f) => f >= 75 ? 'LOW RISK' : f >= 50 ? 'MED RISK' : 'HIGH RISK';

// ── Header ─────────────────────────────────────────────────────────────────────
const Header = () => {
  const { xp, scorecard, session, enterpriseMode, toggleEnterpriseMode, currentStep, setStep } = useEquiLens();
  const [showSavedReports, setShowSavedReports] = React.useState(false);
  const f       = scorecard.fairness_score;
  const riskCol = fc(f);
  const riskBg  = f >= 75 ? 'rgba(46,216,160,.1)' : f >= 50 ? 'rgba(255,183,77,.1)' : 'rgba(255,68,68,.1)';
  const maturity = getMaturityLevel(xp.total);
  const pct = Math.min(100, (xp.total / xp.next_level_xp) * 100);

  return (
    <header style={{
      position:'fixed', top:0, left:0, right:0, height:60, zIndex:100,
      display:'flex', alignItems:'center', gap:12, padding:'0 20px',
      background:'var(--header-bg)',
      borderBottom:'1px solid var(--header-border)',
      backdropFilter: enterpriseMode ? 'none' : 'blur(16px)',
      WebkitBackdropFilter: enterpriseMode ? 'none' : 'blur(16px)',
      transition:'background 0.3s, border-color 0.3s',
    }}>
      {/* Logo */}
      <button
        onClick={() => setStep(1)}
        style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}
      >
        <div style={{
          width:32, height:32, borderRadius:8, flexShrink:0,
          background:'linear-gradient(135deg, #534AB7, #8B5CF6)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:15, fontWeight:900, color:'#fff',
        }}>E</div>
        <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.5px', color:'var(--text-primary)' }}>
          Equi<span style={{ color:'var(--accent-purple)' }}>Lens</span>
        </div>
      </button>

      {/* Context pill */}
      <div style={{
        fontSize:10, color:'var(--text-muted)', letterSpacing:'0.07em',
        padding:'2px 8px', borderRadius:5,
        border:'1px solid var(--border-glass)', background:'var(--bg-glass)',
        display:'flex', alignItems:'center', gap:5, flexShrink:0,
      }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background: session.uploaded ? '#2ed8a0' : '#ffb74d', display:'inline-block' }} />
        {session.uploaded ? 'DATASET LOADED' : 'DEMO MODE'} · HIRING AI
      </div>

      <div style={{ flex:1 }} />

      {/* Upload button (compact, always visible) */}
      <UploadSection />

      {/* Saved Reports button */}
      <button
        onClick={() => setShowSavedReports(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700,
          fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
          border: '1px solid rgba(46,216,160,0.35)',
          background: 'rgba(46,216,160,0.1)',
          color: '#2ed8a0',
          transition: 'all 0.25s',
        }}
        title="View Saved Reports"
      >
        <Database size={14} /> Cloud Reports
      </button>

      {/* Demo mode button */}
      <DemoMode />

      {/* Compliance Score / Maturity Level */}
      {!enterpriseMode ? (
        /* Demo style */
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Maturity Level</div>
            <div style={{ fontSize:11, fontWeight:700, color:maturity.color }}>{maturity.label}</div>
          </div>
          <div style={{ width:72, height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#534AB7,#8B5CF6)', borderRadius:3, transition:'width 0.6s' }} />
          </div>
          <span style={{ fontSize:10, color:'var(--text-muted)' }}>
            Score <span style={{ color:'var(--text-primary)', fontWeight:700 }}>{xp.total}</span>
          </span>
        </div>
      ) : (
        /* Enterprise style */
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>Compliance Score</div>
            <div style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{xp.total} pts</div>
          </div>
          <div style={{ width:1, height:28, background:'var(--border-glass)' }} />
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>Maturity</div>
            <div style={{ fontSize:13, fontWeight:800, color:maturity.color }}>{maturity.label}</div>
          </div>
        </div>
      )}

      {/* Risk badge (only when data loaded) */}
      {session.uploaded && (
        <div style={{
          padding:'4px 10px', borderRadius:6, fontSize:10, fontWeight:800,
          letterSpacing:'0.07em', color:riskCol, background:riskBg,
          border:`1px solid ${riskCol}44`, flexShrink:0,
        }}>
          {frl(f)}
        </div>
      )}

      {/* Demo / Enterprise toggle */}
      <button
        onClick={toggleEnterpriseMode}
        style={{
          padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:700,
          fontFamily:'inherit', cursor:'pointer', flexShrink:0,
          border:`1px solid ${enterpriseMode ? 'rgba(59,91,219,0.35)' : 'rgba(139,92,246,0.35)'}`,
          background: enterpriseMode ? 'rgba(59,91,219,0.1)' : 'rgba(139,92,246,0.1)',
          color: enterpriseMode ? '#3B5BDB' : '#a09aff',
          transition:'all 0.25s',
        }}
        title="Toggle between Demo and Enterprise mode"
      >
        {enterpriseMode ? '🎮 Demo Mode' : '🏢 Enterprise'}
      </button>
      
      {showSavedReports && <SavedReports onClose={() => setShowSavedReports(false)} />}
    </header>
  );
};

// ── Step Shell — wraps each step's content with title + navigation ─────────────
const StepShell = ({ title, subtitle, children, prev, next, prevLabel = '← Back', nextLabel = 'Continue →', nextDisabled = false }) => {
  const { setStep, currentStep } = useEquiLens();
  return (
    <div className="step-content animate-fade-in">
      {(title || subtitle) && (
        <div style={{ marginBottom:22 }}>
          {title && <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.02em', color:'var(--text-primary)', marginBottom:4 }}>{title}</h1>}
          {subtitle && <p style={{ fontSize:14, color:'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
      )}
      {children}
      {(prev || next) && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:28, paddingTop:20, borderTop:'1px solid var(--border-glass)' }}>
          {prev
            ? <button className="btn-primary" onClick={() => setStep(prev)} style={{ fontFamily:'inherit' }}>{prevLabel}</button>
            : <div />}
          {next && (
            <button
              className="btn-primary"
              onClick={() => setStep(next)}
              disabled={nextDisabled}
              style={{ fontFamily:'inherit', background:'var(--accent-purple)', color:'#fff', border:'none', opacity: nextDisabled ? 0.4 : 1 }}
            >
              {nextLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Step 1: Upload Dataset ─────────────────────────────────────────────────────
const Step1 = () => {
  const { session, enterpriseMode } = useEquiLens();
  return (
    <StepShell
      title="Upload Dataset"
      subtitle="Start by uploading your AI training dataset in CSV format for bias analysis."
      next={session.uploaded ? 2 : undefined}
      nextLabel="Analyze Bias →"
      nextDisabled={!session.uploaded}
    >
      <Suspense fallback={<Spin label="Loading upload zone…" />}>
        {enterpriseMode
          ? <EnterpriseUploadZone />
          : (
            <div style={{ maxWidth:560, margin:'0 auto' }}>
              <div className="card" style={{ textAlign:'center', padding:'40px 32px' }}>
                <div style={{ fontSize:40, marginBottom:16 }}>⬆</div>
                <div style={{ fontSize:18, fontWeight:700, marginBottom:8, color:'var(--text-primary)' }}>Upload Your Dataset</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:24, lineHeight:1.65 }}>
                  Upload a CSV file containing your AI training data. The system will automatically detect bias patterns and generate a fairness assessment.
                </div>
                <UploadSection />
                <div style={{ marginTop:20, fontSize:11, color:'var(--text-muted)' }}>
                  No dataset? Use <code style={{ padding:'1px 5px', background:'var(--bg-glass)', borderRadius:3 }}>sample_hiring.csv</code> from the project root
                </div>
              </div>
            </div>
          )
        }
      </Suspense>
    </StepShell>
  );
};

// ── Step 2: Analyze Bias ───────────────────────────────────────────────────────
const Step2 = () => {
  const { session } = useEquiLens();
  return (
    <StepShell
      title="Bias Analysis"
      subtitle="Explore detected bias patterns, affected groups, and key feature contributions."
      prev={1} next={3} nextLabel="Review Issues →"
    >
      {session.uploaded ? (
        <Suspense fallback={<Spin label="Loading analysis…" />}>
          <ArenaPanel />
        </Suspense>
      ) : (
        <UploadPrompt onUpload={() => {}} />
      )}
    </StepShell>
  );
};

// ── Step 3: Review Issues ──────────────────────────────────────────────────────
const Step3 = () => {
  const { session } = useEquiLens();
  return (
    <StepShell
      title="Issue Review"
      subtitle="AI-generated diagnosis: understand what is wrong, why, and the root causes."
      prev={2} next={4} nextLabel="Apply Fixes →"
    >
      {session.uploaded ? (
        <Suspense fallback={<Spin label="Running AI analysis…" />}>
          <AIInsightPanel />
        </Suspense>
      ) : (
        <UploadPrompt />
      )}
    </StepShell>
  );
};

// ── Step 4: Apply Fixes ────────────────────────────────────────────────────────
const Step4 = () => {
  const { session } = useEquiLens();
  return (
    <StepShell
      title="Apply Fixes"
      subtitle="Select and apply recommended remediations. Use the What-If simulator to fine-tune parameters."
      prev={3} next={5} nextLabel="Export Report →"
    >
      {session.uploaded ? (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, alignItems:'start' }}>
          <Suspense fallback={<Spin />}>
            <RecommendedActionsPanel />
          </Suspense>
          <Suspense fallback={<Spin />}>
            <SimulatorPanel />
          </Suspense>
        </div>
      ) : (
        <UploadPrompt />
      )}
    </StepShell>
  );
};

// ── Step 5: Export Report ──────────────────────────────────────────────────────
const Step5 = () => {
  return (
    <StepShell
      title="Export Compliance Report"
      subtitle="Review your full audit results and download the compliance report for your records."
      prev={4} prevLabel="← Back to Fixes"
    >
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:18, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <Suspense fallback={<Spin />}>
            <ExportReportModule />
          </Suspense>
          <Suspense fallback={<Spin />}>
            <CompliancePanel />
          </Suspense>
        </div>
        <Suspense fallback={<Spin />}>
          <AuditMilestonesPanel />
        </Suspense>
      </div>
    </StepShell>
  );
};

// ── Upload Prompt (when session not loaded) ────────────────────────────────────
const UploadPrompt = () => {
  const { setStep } = useEquiLens();
  return (
    <div className="card" style={{ textAlign:'center', padding:'48px 32px', maxWidth:500, margin:'0 auto' }}>
      <div style={{ fontSize:32, marginBottom:12 }}>◎</div>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>No Dataset Loaded</div>
      <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>
        Please upload a CSV dataset in Step 1 to continue.
      </div>
      <button className="btn-primary" onClick={() => setStep(1)} style={{ fontFamily:'inherit' }}>
        ← Go to Upload
      </button>
    </div>
  );
};

// ── Step Router ────────────────────────────────────────────────────────────────
const STEP_VIEWS = { 1: Step1, 2: Step2, 3: Step3, 4: Step4, 5: Step5 };

// ── Root App ───────────────────────────────────────────────────────────────────
function App() {
  const { currentStep, enterpriseMode, session } = useEquiLens();

  // Apply enterprise CSS class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('enterprise-mode', enterpriseMode);
  }, [enterpriseMode]);

  // Trigger the live demo from onboarding screen
  const handleRunDemo = () => {
    const btn = document.getElementById('demo-mode-btn');
    if (btn) btn.click();
  };

  const StepView = STEP_VIEWS[currentStep] ?? Step1;

  // ── Pre-upload: full onboarding screen (no step bar) ──
  if (!session.uploaded) {
    return (
      <div className="app-root">
        <Header />
        <OnboardingScreen onRunDemo={handleRunDemo} />
      </div>
    );
  }

  // ── Post-upload: guided step flow ──
  return (
    <div className="app-root-with-steps">
      <Header />
      <StepProgressBar />
      <StepView />
    </div>
  );
}

export default App;
