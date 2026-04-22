import React, { Suspense } from 'react';
import useEquiLens from '../store/useEquiLens';

// We import the Helix component (previously DNAHelixScene)
const Helix = React.lazy(() => import('./Helix'));

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

const SLIDER_DEFS = [
  { key: 'gender',  label: 'Gender influence' },
  { key: 'balance', label: 'Feature balance' },
  { key: 'thresh',  label: 'Threshold calibration' },
  { key: 'age',     label: 'Age weighting' },
  { key: 'race',    label: 'Race sensitivity' },
];

const SimulatorPanel = () => {
  const { scorecard, simulatorParams, setSimulatorParams, autoFix, resetParams, initial_scorecard } = useEquiLens();
  const f = scorecard.fairness_score;
  const col = stateColor(f);
  // Defaulting to 34 if initial_scorecard isn't available for delta calculation
  const delta = f - (initial_scorecard?.fairness_score ?? 34);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cd(
          <>
            {cdLbl('What-If Parameter Controls')}
            {SLIDER_DEFS.map(s => (
              <div key={s.key} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(200,200,224,.52)' }}>{s.label}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-purple)' }}>{simulatorParams[s.key]}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={simulatorParams[s.key]}
                  onChange={(e) => setSimulatorParams({ [s.key]: parseInt(e.target.value) })}
                  style={{ width: '100%', height: '4px', accentColor: 'var(--accent-purple)' }}
                />
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>PROJECTED FAIRNESS</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: col, lineHeight: 1.1, transition: 'color 0.4s' }}>{f}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>DELTA</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: delta > 0 ? '#2ed8a0' : delta < 0 ? '#ff7070' : 'var(--text-muted)' }}>
                    {delta >= 0 ? '+' : ''}{delta.toFixed(0)}
                  </div>
                </div>
              </div>
              <button 
                onClick={autoFix} 
                style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', border: '1px solid rgba(127,119,221,.3)', background: 'rgba(127,119,221,.12)', color: '#a09aff', marginTop: '8px', transition: 'all 0.2s' }}
              >
                ⚡ AUTO-FIX ENGINE
              </button>
              <button 
                onClick={resetParams} 
                style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'rgba(200,200,224,.5)', marginTop: '8px', transition: 'all 0.2s' }}
              >
                ↺ RESET ALL PARAMS
              </button>
            </div>
          </>
        )}
      </div>
      {cd(
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '280px', color: 'var(--text-muted)', fontSize: 10 }}>Loading Helix...</div>}>
          <Helix />
        </Suspense>,
        { display: 'flex', flexDirection: 'column', height: '100%' }
      )}
    </div>
  );
};

export default SimulatorPanel;
