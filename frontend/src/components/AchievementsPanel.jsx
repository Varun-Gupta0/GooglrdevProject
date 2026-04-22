import React from 'react';
import useEquiLens from '../store/useEquiLens';

const BADGES_DEF = [
  { icon: '◈', title: 'First Contact',  desc: 'Ran first bias scan',    xp: 50,  fn: () => true },
  { icon: '⬡', title: 'Genome Mapper',  desc: 'Mapped 10 features',    xp: 100, fn: () => true },
  { icon: '⚙', title: 'What-If Master', desc: 'Used simulator',         xp: 90,  fn: () => true },
  { icon: '⚡', title: 'Fixer Upper',   desc: 'Used Auto-Fix engine',   xp: 200, fn: (f) => f >= 60 },
  { icon: '★', title: 'Fairness Hero',  desc: 'Fairness score 80+',     xp: 300, fn: (f) => f >= 80 },
  { icon: '⚖', title: 'Law Abider',    desc: 'Pass all 3 regs',        xp: 500, fn: (f) => f >= 75 },
];

const MILES = [
  { lv: 1, title: 'Bias Novice',          desc: 'First scan complete' },
  { lv: 2, title: 'Pattern Spotter',      desc: 'Detected 3+ sources' },
  { lv: 3, title: 'System Challenger',    desc: 'Used What-If Simulator' },
  { lv: 5, title: 'Fairness Engineer',    desc: 'Achieve Fairness 80+' },
  { lv: 7, title: 'Ethics Champion',      desc: 'Pass all 3 regulations' },
  { lv: 10, title: 'AI Guardian',          desc: 'Deploy fair AI system' },
];

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

const AchievementsPanel = () => {
  const { xp, scorecard } = useEquiLens();
  const f = scorecard.fairness_score;
  const lv = xp.level;
  const pct = Math.min(100, (xp.total / xp.next_level_xp) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {cd(
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              {cdLbl('AI Ethics Champion')}
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#a09aff' }}>LEVEL {lv}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {cdLbl('Total XP')}
              <div style={{ fontSize: '26px', fontWeight: 800 }}>{xp.total}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>LV {lv}</span>
            <div style={{ flex: 1, height: '10px', background: 'rgba(255,255,255,.06)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#534AB7,#7F77DD)', transition: 'width 0.6s' }} />
            </div>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>LV {lv + 1}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>{xp.next_level_xp - xp.total} XP to next level — keep fixing bias!</div>
        </>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {cd(
          <>
            {cdLbl('Achievement Badges')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {BADGES_DEF.map((b, i) => {
                const ok = b.fn(f);
                return (
                  <div key={i} style={{ padding: '12px', borderRadius: '8px', background: ok ? 'rgba(127,119,221,.05)' : 'var(--bg-glass)', border: `1px solid ${ok ? 'rgba(127,119,221,.3)' : 'var(--border-glass)'}`, opacity: ok ? 1 : 0.3, transition: 'all 0.3s' }}>
                    <div style={{ fontSize: '24px', marginBottom: '6px', color: ok ? '#a09aff' : 'var(--text-muted)' }}>{b.icon}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700 }}>{b.title}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>{b.desc}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#a09aff', marginTop: '5px' }}>+{b.xp} XP</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {cd(
          <>
            {cdLbl('Level Milestones')}
            {MILES.map((m, i) => {
              const done = lv > m.lv, cur = lv === m.lv;
              const c = done ? '#2ed8a0' : cur ? '#a09aff' : 'var(--text-muted)';
              return (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, minWidth: '28px', color: c, paddingTop: '1px' }}>LV{m.lv}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: done || cur ? 'var(--text-primary)' : 'var(--text-muted)' }}>{m.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{m.desc}</div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', border: '1px solid', background: done ? 'rgba(29,158,117,.12)' : cur ? 'rgba(127,119,221,.12)' : 'transparent', color: done ? '#2ed8a0' : cur ? '#a09aff' : 'var(--text-muted)', borderColor: done ? 'rgba(29,158,117,.2)' : cur ? 'rgba(127,119,221,.2)' : 'transparent' }}>
                    {done ? 'DONE' : cur ? 'NOW' : '—'}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default AchievementsPanel;
