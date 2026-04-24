import React from 'react';
import useEquiLens from '../store/useEquiLens';

const REGS = [
  { id: 'r1', name: 'GDPR Art. 22', threshold: 75, desc: 'Automated decisions must be explainable and demographically fair', yes: 'Requirement met', no: '3 violations detected' },
  { id: 'r2', name: 'EU AI Act',    threshold: 75, desc: 'High-risk AI systems must meet fairness thresholds before deployment', yes: 'Threshold met', no: '2 critical gaps' },
  { id: 'r3', name: 'US EO 13985',  threshold: 50, desc: 'Equity required in all federal AI decision-making systems', yes: 'Within acceptable limit', no: 'Disparity exceeds limit' },
];

const fc = (f) => f >= 75 ? 'var(--state-fair)' : f >= 50 ? 'var(--state-moderate)' : 'var(--state-biased)';

const CompliancePanel = () => {
  const fairnessScore = useEquiLens(state => state.scorecard.fairness_score);
  const f = fairnessScore;
  const allPass  = f >= 75;
  const somePass = f >= 50;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── Header ── */}
      <div>
        <div className="section-title">Regulatory Compliance</div>
        <div className="section-sub">Assessment against international AI fairness frameworks</div>
      </div>

      {/* ── Regulation Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:12 }}>
        {REGS.map(reg => {
          const pass = f >= reg.threshold;
          const col  = pass ? 'var(--state-fair)' : 'var(--state-biased)';
          const bg   = pass ? 'rgba(46,216,160,0.1)' : 'rgba(255,82,82,0.1)';
          const brd  = pass ? 'rgba(46,216,160,0.4)' : 'rgba(255,82,82,0.4)';
          return (
            <div key={reg.id} style={{ background:bg, border:`1.5px solid ${brd}`, borderRadius:12, padding:'18px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                {reg.name}
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: col, marginBottom: 8, transition: 'color 0.4s' }}>
                {pass ? 'PASS' : 'FAIL'}
              </div>
              <div style={{ height:5, background:'var(--bg-glass)', borderRadius:3, overflow:'hidden', marginBottom:8 }}>
                <div style={{ height:'100%', width:`${Math.min(f, 100)}%`, background:col, borderRadius:3, transition:'width 0.6s' }} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 8, fontWeight: 500 }}>
                {reg.desc}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: col }}>
                {pass ? `✓ ${reg.yes}` : `✗ ${reg.no}`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 600 }}>
                Required: {reg.threshold}/100 · Achieved: {f}/100
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Overall Status ── */}
      <div className="card">
        <div className="card-label">Overall Compliance Assessment</div>
        <div style={{ display:'flex', alignItems:'center', gap:18, padding:'8px 0', flexWrap:'wrap' }}>
          {/* Big score */}
          <div style={{
            width:72, height:72, borderRadius:'50%', flexShrink:0,
            background:`${fc(f)}10`, border:`3px solid ${fc(f)}44`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:26, fontWeight:900, color:fc(f),
          }}>{f}</div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: fc(f), marginBottom: 6, transition: 'color 0.4s', letterSpacing: '-0.01em' }}>
              {allPass ? 'LOW RISK — Deployment Approved' : somePass ? 'MEDIUM RISK — Review Required' : 'HIGH RISK — Deployment Blocked'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500 }}>
              {allPass
                ? 'This AI system meets all reviewed regulatory thresholds. Proceed to export your compliance certificate.'
                : somePass
                  ? 'Some regulatory requirements are met. Apply the recommended fixes in Step 4 to achieve full compliance.'
                  : 'Critical bias detected. The system must be remediated before deployment. Use the Recommended Actions in Step 4.'}
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div style={{ marginTop:14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
            <span>0 — Critical</span>
            <span>50 — Threshold</span>
            <span>75 — Compliant</span>
            <span>100</span>
          </div>
          <div style={{ height:8, background:'var(--bg-glass)', borderRadius:4, overflow:'hidden', border:'1px solid var(--border-glass)', position:'relative' }}>
            <div style={{ height:'100%', width:`${f}%`, background:`linear-gradient(90deg, #ff7070 0%, #ffb74d 50%, #2ed8a0 100%)`, borderRadius:4, transition:'width 0.6s' }} />
            {/* threshold markers */}
            <div style={{ position:'absolute', top:0, left:'50%', height:'100%', width:2, background:'rgba(255,255,255,0.25)' }} />
            <div style={{ position:'absolute', top:0, left:'75%', height:'100%', width:2, background:'rgba(255,255,255,0.25)' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompliancePanel;
