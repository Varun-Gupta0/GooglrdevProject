import React, { Suspense } from 'react';
import useEquiLens from '../store/useEquiLens';
import BiasOrb from './BiasOrb';

// ── Colour helpers (match HTML sCol / fInfo logic) ────────────────────────────
const stateColor  = (f) => f >= 75 ? '#2ed8a0' : f >= 50 ? '#ffb74d' : '#ff7070';
const stateLabel  = (f) => f >= 75 ? 'FAIR'     : f >= 50 ? 'MODERATE' : 'BIASED';
const riskLabel   = (f) => f >= 75 ? 'LOW RISK'  : f >= 50 ? 'MED RISK' : 'HIGH RISK';
const pillClass   = (f) => f >= 75 ? 'pill-green' : f >= 50 ? 'pill-amber' : 'pill-red';

// ── Stat Card (Fairness / Accuracy / Bias Index / Stability) ──────────────────
const StatCard = ({ label, value, subtitle, inverted = false }) => {
  const effectiveVal = inverted ? 100 - value : value;
  const color = stateColor(effectiveVal);
  const circumference = 2 * Math.PI * 16;
  const dashOffset = Math.round(circumference * (1 - value / 100));

  return (
    <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px 14px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.13em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.1, color, transition: 'color 0.4s' }}>
          {value}
        </div>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
          <circle cx="22" cy="22" r="16" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            strokeLinecap="round" transform="rotate(-90 22 22)"
            style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(.4,0,.2,1), stroke 0.4s' }}
          />
        </svg>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '2px', transition: 'width 0.55s cubic-bezier(.4,0,.2,1), background 0.4s' }} />
      </div>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '5px' }}>{subtitle}</div>
    </div>
  );
};

// ── DNA Tag Cloud ──────────────────────────────────────────────────────────────
const DNACloud = ({ contributors }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
    {contributors.map((c, i) => {
      const [bg, tc] = c.score > 60
        ? ['rgba(226,75,74,.14)', '#ff7070']
        : c.score > 35
          ? ['rgba(239,159,39,.12)', '#ffb74d']
          : ['rgba(29,158,117,.12)', '#2ed8a0'];
      return (
        <span key={i} style={{
          padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700,
          letterSpacing: '0.06em', border: `1px solid ${tc}30`,
          background: bg, color: tc, cursor: 'default',
          transition: 'all 0.3s',
        }}>
          {c.feature} {c.score}%
        </span>
      );
    })}
  </div>
);

// ── Bias Contributor List ──────────────────────────────────────────────────────
const BiasContributorList = ({ contributors }) => (
  <div>
    {contributors.slice(0, 5).map((b, i) => {
      const c = b.score > 60 ? '#ff7070' : b.score > 40 ? '#ffb74d' : '#2ed8a0';
      return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(200,200,224,0.52)' }}>{b.feature} feature</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '58px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${b.score}%`, background: c, borderRadius: '2px', transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: c, minWidth: '26px', textAlign: 'right', transition: 'color 0.3s' }}>{b.score}%</span>
          </div>
        </div>
      );
    })}
  </div>
);

// ── Entity Profile (static model card) ────────────────────────────────────────
const EntityProfile = ({ session }) => {
  const rows = [
    ['Model',         session.uploaded ? 'RandomForest'   : 'Not loaded'],
    ['Domain',        'Hiring AI'],
    ['Dataset',       session.uploaded ? `${session.columns?.length || 0} features` : '—'],
    ['Deploy status', { text: session.uploaded ? '⚠ Blocked' : '○ No Data', color: '#ff7070' }],
  ];
  return (
    <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px 14px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.13em', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
        Entity Profile
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
        {rows.map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            {typeof val === 'object'
              ? <span style={{ color: val.color }}>{val.text}</span>
              : <span>{val}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Fairness Override Slider ───────────────────────────────────────────────────
const FairnessOverrideSlider = ({ value, onChange }) => {
  const color = stateColor(value);
  return (
    <div style={{ marginBottom: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(200,200,224,0.52)' }}>Fairness override</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color }}>{value}</span>
      </div>
      <input
        type="range"
        min={5}
        max={95}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ width: '100%', height: '4px', accentColor: 'var(--accent-purple)' }}
      />
    </div>
  );
};

// ── Main ArenaPanel component ──────────────────────────────────────────────────
const ArenaPanel = () => {
  const { scorecard, session, setFairnessOverride } = useEquiLens();
  const f   = scorecard.fairness_score;
  const col = stateColor(f);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: '13px', height: '100%', minHeight: '480px' }}>

      {/* ── Left column: Orb + Entity info ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Orb card */}
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.13em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            AI Entity — Bias State
          </div>

          <div style={{ flex: 1, minHeight: '200px', position: 'relative', borderRadius: '8px', overflow: 'hidden', background: 'radial-gradient(circle at center, #1a1f2e 0%, #0a0f1c 100%)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }}>
            <Suspense fallback={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                INITIALIZING ENTITY...
              </div>
            }>
              <BiasOrb fairnessScore={f} />
            </Suspense>
          </div>

          {/* State badge + override slider */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ENTITY STATE</span>
              <span style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700,
                letterSpacing: '0.08em', border: '1px solid',
                background: f >= 75 ? 'rgba(29,158,117,0.12)' : f >= 50 ? 'rgba(239,159,39,0.12)' : 'rgba(226,75,74,0.12)',
                color: col, borderColor: `${col}44`,
              }}>
                {stateLabel(f)}
              </span>
            </div>
            <FairnessOverrideSlider value={f} onChange={setFairnessOverride} />
          </div>
        </div>

        <EntityProfile session={session} />
      </div>

      {/* ── Right column: stats + DNA + contributors ── */}
      <div style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: '10px' }}>

        {/* 4-stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
          <StatCard label="Fairness"    value={scorecard.fairness_score} subtitle="Target: 80+" />
          <StatCard label="Accuracy"    value={scorecard.accuracy}       subtitle="Prediction rate" />
          <StatCard label="Bias Index"  value={scorecard.bias_index}     subtitle="Lower is better" inverted />
          <StatCard label="Stability"   value={scorecard.stability}      subtitle="Cross-group" />
        </div>

        {/* DNA Tag Cloud */}
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.13em', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
            Bias DNA — Feature Infection Map
          </div>
          <DNACloud contributors={scorecard.bias_contributors} />
        </div>

        {/* Bias Contributors */}
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '14px 16px', overflowY: 'auto' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.13em', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
            Top Bias Contributors
          </div>
          <BiasContributorList contributors={scorecard.bias_contributors} />
        </div>

      </div>
    </div>
  );
};

export default ArenaPanel;
