/**
 * AuditMilestonesPanel.jsx
 * Professional replacement for AchievementsPanel.
 * XP → Compliance Score, Level → Maturity Level, Badges → Audit Milestones.
 * All underlying logic (addXP, xp state) is unchanged.
 */

import React from 'react';
import useEquiLens from '../store/useEquiLens';

const MILESTONES = [
  { minLevel: 1, title: 'Initial Assessment',   desc: 'First bias scan completed',          icon: '◎' },
  { minLevel: 2, title: 'Pattern Recognition',  desc: 'Identified 3+ bias sources',         icon: '⬡' },
  { minLevel: 3, title: 'Remediation Initiated',desc: 'Applied What-If analysis',           icon: '⚙' },
  { minLevel: 4, title: 'Compliance Threshold', desc: 'Fairness score reached 80+',         icon: '⚖' },
  { minLevel: 5, title: 'Full Certification',   desc: 'All regulations passed & certified', icon: '★' },
];

const AUDIT_MILESTONES = [
  { title: 'First Audit Run',        desc: 'Initiated bias scan',          xp: 50,  fn: (f) => true },
  { title: 'Feature Mapping',        desc: 'Analysed all bias contributors',xp: 100, fn: (f) => true },
  { title: 'What-If Analysis',       desc: 'Ran parameter simulation',      xp: 90,  fn: (f) => true },
  { title: 'Remediation Applied',    desc: 'Applied fairness fix engine',   xp: 200, fn: (f) => f >= 60 },
  { title: 'Compliance Achieved',    desc: 'Fairness score ≥ 80',          xp: 300, fn: (f) => f >= 80 },
  { title: 'Regulatory Sign-off',    desc: 'Passed all 3 regulations',      xp: 500, fn: (f) => f >= 75 },
];

const LEVEL_NAMES = ['Initial Assessment','Basic Awareness','Developing','Proficient','Advanced'];

const fc = (f) => f >= 75 ? '#2ed8a0' : f >= 50 ? '#ffb74d' : '#ff7070';

const AuditMilestonesPanel = () => {
  const xp = useEquiLens(state => state.xp);
  const fairnessScore = useEquiLens(state => state.scorecard.fairness_score);
  const f   = fairnessScore;
  const lv  = xp.level;
  const pct = Math.min(100, (xp.total / xp.next_level_xp) * 100);
  const maturityName = LEVEL_NAMES[lv - 1] || xp.level_name;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── Compliance Score Card ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="card-label">Maturity Level</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-purple)', letterSpacing: '-0.01em' }}>{maturityName}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="card-label">Compliance Score</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)' }}>{xp.total}<span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}> pts</span></div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{maturityName}</span>
          <div style={{ flex: 1, height: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))', borderRadius: 5, transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{LEVEL_NAMES[lv] || 'Max'}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 500 }}>
          {Math.max(0, xp.next_level_xp - xp.total)} points to next maturity level
        </div>
      </div>

      {/* ── Audit Milestones (Badges) ── */}
      <div className="card">
        <div className="card-label">Audit Milestones</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {AUDIT_MILESTONES.map((m, i) => {
            const earned = m.fn(f);
            const col = earned ? 'var(--accent-purple)' : 'var(--text-muted)';
            return (
              <div key={i} style={{
                padding: '16px 12px', borderRadius: 10, textAlign: 'center',
                background: earned ? 'rgba(167,139,250,0.12)' : 'var(--bg-glass)',
                border: `1.5px solid ${earned ? 'rgba(167,139,250,0.4)' : 'var(--border-glass)'}`,
                opacity: earned ? 1 : 0.45, transition: 'all 0.3s',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8, color: col, fontWeight: 900 }}>{earned ? '✓' : '◯'}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.2 }}>{m.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{m.desc}</div>
                <div style={{ fontSize: 11, fontWeight: 900, color: col, marginTop: 8 }}>+{m.xp} pts</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Maturity Roadmap ── */}
      <div className="card">
        <div className="card-label">Compliance Maturity Roadmap</div>
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {MILESTONES.map((m, i) => {
            const done = lv > m.minLevel;
            const curr = lv === m.minLevel;
            const col  = done ? 'var(--state-fair)' : curr ? 'var(--accent-purple)' : 'var(--text-muted)';
            return (
              <div key={i} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '12px 0', borderBottom: i < MILESTONES.length - 1 ? '1px solid var(--border-glass)' : 'none',
              }}>
                <div style={{
                  flexShrink: 0, width: 36, height: 36, borderRadius: 10,
                  background: done ? 'rgba(46,216,160,0.12)' : curr ? 'rgba(167,139,250,0.12)' : 'var(--bg-glass)',
                  border: `1.5px solid ${done ? 'rgba(46,216,160,0.4)' : curr ? 'rgba(167,139,250,0.4)' : 'var(--border-glass)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: col, fontWeight: 900,
                }}>
                  {done ? '✓' : m.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: (done || curr) ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: 2 }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: (done || curr) ? 'var(--text-secondary)' : 'var(--text-muted)', fontWeight: 500 }}>{m.desc}</div>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
                  background: done ? 'rgba(46,216,160,0.15)' : curr ? 'rgba(167,139,250,0.15)' : 'transparent',
                  color: done ? 'var(--state-fair)' : curr ? 'var(--accent-purple)' : 'var(--text-muted)',
                  border: `1px solid ${done ? 'rgba(46,216,160,0.3)' : curr ? 'rgba(167,139,250,0.3)' : 'transparent'}`,
                  alignSelf: 'center',
                }}>
                  {done ? 'COMPLETE' : curr ? 'IN PROGRESS' : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AuditMilestonesPanel;
