import React, { Suspense } from 'react';
import useEquiLens from '../store/useEquiLens';

const Helix = React.lazy(() => import('./Helix'));

const stateColor = (f) => f >= 75 ? '#2ed8a0' : f >= 50 ? '#ffb74d' : '#ff7070';

const SLIDER_DEFS = [
  { key: 'gender',  label: 'Gender Influence',        desc: 'Lower = less gender bias'       },
  { key: 'balance', label: 'Feature Balance',          desc: 'Higher = more balanced data'    },
  { key: 'thresh',  label: 'Decision Threshold',       desc: 'Higher = stricter calibration'  },
  { key: 'age',     label: 'Age Weighting',            desc: 'Lower = reduced age impact'     },
  { key: 'race',    label: 'Race Sensitivity',         desc: 'Lower = less racial influence'  },
];

const SimulatorPanel = () => {
  const { simulatorParams, setSimulatorParams, autoFix, resetParams, initial_scorecard, enterpriseMode } = useEquiLens();
  const scorecard = useEquiLens(state => state.scorecard);
  const fairnessScore = useEquiLens(state => state.scorecard.fairness_score);
  const f   = fairnessScore;
  const col = stateColor(f);
  const delta = f - (initial_scorecard?.fairness_score ?? 34);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, height:'100%' }}>

      {/* ── Controls ── */}
      <div className="card" style={{ display:'flex', flexDirection:'column', gap:0 }}>
        <div className="card-label">What-If Parameter Analysis</div>

        {SLIDER_DEFS.map(s => {
          const val = simulatorParams[s.key];
          const valColor = s.key === 'balance' || s.key === 'thresh'
            ? stateColor(val)
            : stateColor(100 - val);
          return (
            <div key={s.key} style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <div>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{s.label}</span>
                  <span style={{ fontSize:10, color:'var(--text-muted)', marginLeft:6 }}>{s.desc}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:800, color:valColor }}>{val}%</span>
              </div>
              <input type="range" min="0" max="100" value={val}
                onChange={(e) => setSimulatorParams({ [s.key]: parseInt(e.target.value) })}
                style={{ width:'100%', height:5, accentColor:'var(--accent-purple)', cursor:'pointer' }}
              />
            </div>
          );
        })}

        {/* Score + delta */}
        <div style={{ borderTop:'1px solid var(--border-glass)', paddingTop:14, marginTop:4 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:2 }}>
                Projected Fairness Score
              </div>
              <div style={{ fontSize:36, fontWeight:900, color:col, lineHeight:1, transition:'color 0.4s' }}>{f}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                {f >= 75 ? 'COMPLIANT — Ready to deploy' : f >= 50 ? 'UNDER REVIEW — Improvements needed' : 'NON-COMPLIANT — Critical fixes required'}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Delta</div>
              <div style={{ fontSize:20, fontWeight:800, color: delta > 0 ? '#2ed8a0' : delta < 0 ? '#ff7070' : 'var(--text-muted)', transition:'color 0.3s' }}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(0)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <button onClick={autoFix} style={{
              width:'100%', padding:'11px 16px', borderRadius:8, fontFamily:'inherit', fontSize:13,
              fontWeight:700, cursor:'pointer', border:'1px solid rgba(139,92,246,0.35)',
              background:'rgba(139,92,246,0.12)', color:'#a09aff', transition:'all 0.2s',
            }}>
              ⚡ Apply Recommended Fixes
            </button>
            <button onClick={resetParams} style={{
              width:'100%', padding:'9px 16px', borderRadius:8, fontFamily:'inherit', fontSize:12,
              fontWeight:600, cursor:'pointer', border:'1px solid var(--border-glass)',
              background:'var(--bg-glass)', color:'var(--text-muted)', transition:'all 0.2s',
            }}>
              ↺ Reset to Baseline
            </button>
          </div>
        </div>
      </div>

      {/* ── Helix Visualizer ── */}
      <div className="card" style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:300 }}>
        <div className="card-label">Bias DNA Visualizer</div>
        <div style={{ flex:1, position:'relative', borderRadius:8, overflow:'hidden', background:'radial-gradient(circle at center,#1a1f2e 0%,#0a0f1c 100%)', minHeight:260 }}>
          <Suspense fallback={
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:12, color:'var(--text-muted)' }}>
              Loading Visualizer...
            </div>
          }>
            <Helix />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default SimulatorPanel;
