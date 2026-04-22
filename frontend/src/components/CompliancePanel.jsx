import React from 'react';
import useEquiLens from '../store/useEquiLens';

const REGS = [
  { id: 'r1', name: 'GDPR Art. 22', threshold: 75, desc: 'Automated decisions must be explainable and demographically fair', yes: 'GDPR clear', no: '3 violations detected' },
  { id: 'r2', name: 'EU AI Act',    threshold: 75, desc: 'High-risk AI systems must meet fairness thresholds before deployment', yes: 'Threshold met', no: '2 critical gaps' },
  { id: 'r3', name: 'US EO 13985',  threshold: 50, desc: 'Equity required in all federal AI decision-making systems', yes: 'Within limit', no: 'Disparity exceeds limit' },
];

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

const CompliancePanel = () => {
  const { scorecard } = useEquiLens();
  const f = scorecard.fairness_score;
  const allPass = f >= 75;
  const somePass = f >= 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        {REGS.map(reg => {
          const pass = f >= reg.threshold;
          const c = pass ? '#2ed8a0' : '#ff7070';
          const bg = pass ? '#1D9E75' : '#E24B4A';
          return (
            <div key={reg.id} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '14px 16px' }}>
              {cdLbl(reg.name)}
              <div style={{ fontSize: '20px', fontWeight: 800, color: c, margin: '4px 0', transition: 'color 0.4s' }}>{pass ? 'PASS' : 'FAIL'}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{reg.desc}</div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,.06)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${f}%`, background: bg, transition: 'width 0.55s, background 0.4s' }} />
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '5px' }}>{pass ? reg.yes : reg.no}</div>
            </div>
          );
        })}
      </div>
      {cd(
        <>
          {cdLbl('Overall Compliance Score')}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '4px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: stateColor(f), transition: 'color 0.4s' }}>{f}</div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: stateColor(f), transition: 'color 0.4s' }}>
                {allPass ? 'LOW RISK — DEPLOYABLE' : somePass ? 'MEDIUM RISK — REVIEW' : 'HIGH RISK — NOT DEPLOYABLE'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {allPass ? 'System meets all regulatory requirements' : 'Fix bias in Simulator to unlock deployment'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CompliancePanel;
