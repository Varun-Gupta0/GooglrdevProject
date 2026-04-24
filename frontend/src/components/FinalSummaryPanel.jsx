/**
 * FinalSummaryPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows the full user journey: initial score → current score, total improvement,
 * and a timestamped log of every action applied during the session.
 *
 * Props: none — reads directly from Zustand store.
 */

import React, { useState } from 'react';
import useEquiLens from '../store/useEquiLens';

// ─── helpers ──────────────────────────────────────────────────────────────────

const SEV_COLOR = { CRITICAL: '#ff7070', HIGH: '#ffb74d', MODERATE: '#a09aff', LOW: '#2ed8a0', UNKNOWN: '#444' };
const sevColor = s => SEV_COLOR[s] ?? '#a09aff';

const scoreBand = (s) => {
  if (s >= 75) return { label: 'FAIR',     color: '#2ed8a0' };
  if (s >= 60) return { label: 'MODERATE', color: '#a09aff' };
  if (s >= 40) return { label: 'HIGH RISK',color: '#ffb74d' };
  return            { label: 'CRITICAL',   color: '#ff7070' };
};

// ─── mini arc score gauge ──────────────────────────────────────────────────────

const ScoreArc = ({ value, size = 56 }) => {
  const { color } = scoreBand(value);
  const r   = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const fill = circ * (value / 100);
  const cx = size / 2, cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1), stroke 0.4s' }}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={color}
        style={{ fontSize: size * 0.22, fontWeight: 800, fontFamily: 'inherit' }}>
        {value}
      </text>
    </svg>
  );
};

// ─── action history row ────────────────────────────────────────────────────────

const HistoryRow = ({ entry, index }) => {
  const improved = (entry.fairnessAfter ?? 0) > (entry.fairnessBefore ?? 0);
  const delta    = (entry.fairnessAfter ?? 0) - (entry.fairnessBefore ?? 0);
  const col      = improved ? '#2ed8a0' : '#ff7070';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      padding: '7px 10px', borderRadius: '6px',
      background: `${col}07`,
      border: `1px solid ${col}18`,
      animation: 'fsp-row 0.4s ease both',
      animationDelay: `${index * 60}ms`,
    }}>
      {/* Step number */}
      <div style={{
        flexShrink: 0, width: 20, height: 20, borderRadius: '4px',
        background: `${col}18`, border: `1px solid ${col}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '9px', fontWeight: 800, color: col,
      }}>
        {index + 1}
      </div>

      {/* Instruction */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(220,220,240,0.82)', lineHeight: 1.4, marginBottom: 3 }}
          dangerouslySetInnerHTML={{
            __html: (entry.instruction ?? '').replace(/\*\*(.*?)\*\*/g, `<strong style="color:${col}">$1</strong>`)
          }}
        />
        {entry.before && entry.after && (
          <div style={{ fontSize: '9px', color: 'rgba(200,200,224,0.38)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ textDecoration: 'line-through' }}>{entry.before}</span>
            <span>→</span>
            <span style={{ color: col, fontWeight: 700 }}>{entry.after}</span>
          </div>
        )}
      </div>

      {/* Fairness delta + timestamp */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {delta !== 0 && (
          <div style={{ fontSize: '11px', fontWeight: 800, color: col, marginBottom: 1 }}>
            {delta > 0 ? '+' : ''}{delta}
          </div>
        )}
        <div style={{ fontSize: '8px', color: 'rgba(200,200,224,0.28)', fontVariantNumeric: 'tabular-nums' }}>
          {entry.ts}
        </div>
      </div>
    </div>
  );
};

// ─── main component ────────────────────────────────────────────────────────────

const FinalSummaryPanel = () => {
  const { baselineFairness, actionHistory, clearActionHistory } = useEquiLens();
  const scorecard = useEquiLens(state => state.scorecard);
  const fairnessScore = useEquiLens(state => state.scorecard.fairness_score);
  const [historyOpen, setHistoryOpen] = useState(true);

  const current     = fairnessScore ?? 0;
  const initial     = baselineFairness ?? 0;
  const improvement = current - initial;
  const applied     = actionHistory.length;
  const currentBand = scoreBand(current);
  const initialBand = scoreBand(initial);

  // Only render if a session exists
  if (!initial && applied === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-glass)',
      border: `1px solid ${currentBand.color}28`,
      borderRadius: '10px', padding: '13px 15px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      transition: 'border-color 0.5s',
    }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '12px' }}>📊</span>
          <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.13em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            System Progress
          </span>
        </div>
        {applied > 0 && (
          <button
            onClick={clearActionHistory}
            style={{
              fontSize: '8px', fontWeight: 700, letterSpacing: '0.07em',
              color: 'rgba(200,200,224,0.28)', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px',
              padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ↺ RESET
          </button>
        )}
      </div>

      {/* ── Score comparison ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
        {/* Initial */}
        <div style={{ textAlign: 'center' }}>
          <ScoreArc value={initial} />
          <div style={{ fontSize: '8px', color: 'rgba(200,200,224,0.35)', marginTop: '4px', letterSpacing: '0.07em' }}>
            INITIAL
          </div>
          <div style={{ fontSize: '8px', fontWeight: 700, color: initialBand.color, marginTop: '1px' }}>
            {initialBand.label}
          </div>
        </div>

        {/* Arrow + delta */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: improvement > 0 ? '18px' : '14px',
            color: improvement > 0 ? '#2ed8a0' : improvement < 0 ? '#ff7070' : 'rgba(200,200,224,0.25)',
          }}>
            {improvement > 0 ? '→' : improvement < 0 ? '↓' : '—'}
          </div>
          {improvement !== 0 && (
            <div style={{
              fontSize: '11px', fontWeight: 800, marginTop: '2px',
              color: improvement > 0 ? '#2ed8a0' : '#ff7070',
            }}>
              {improvement > 0 ? '+' : ''}{improvement}
            </div>
          )}
        </div>

        {/* Current */}
        <div style={{ textAlign: 'center' }}>
          <ScoreArc value={current} />
          <div style={{ fontSize: '8px', color: 'rgba(200,200,224,0.35)', marginTop: '4px', letterSpacing: '0.07em' }}>
            CURRENT
          </div>
          <div style={{ fontSize: '8px', fontWeight: 700, color: currentBand.color, marginTop: '1px' }}>
            {currentBand.label}
          </div>
        </div>
      </div>

      {/* ── Summary stats row ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        {[
          { label: 'Initial',      value: `${initial}/100`,          color: initialBand.color },
          { label: 'Current',      value: `${current}/100`,          color: currentBand.color },
          { label: 'Improvement',  value: `${improvement > 0 ? '+' : ''}${improvement} pts`, color: improvement >= 0 ? '#2ed8a0' : '#ff7070' },
        ].map(s => (
          <div key={s.label} style={{
            background: `${s.color}08`, border: `1px solid ${s.color}20`,
            borderRadius: '6px', padding: '7px 9px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '8px', color: 'rgba(200,200,224,0.35)', letterSpacing: '0.08em', marginBottom: '3px' }}>
              {s.label.toUpperCase()}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Action history ────────────────────────────────────────────────── */}
      {applied > 0 && (
        <div>
          {/* Collapsible header */}
          <button
            onClick={() => setHistoryOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'transparent', border: 'none', padding: '0 0 7px 0',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: '#2ed8a0' }}>
                ◈ ACTION HISTORY
              </span>
              <span style={{
                fontSize: '8px', fontWeight: 700, color: '#2ed8a0',
                background: 'rgba(46,216,160,0.12)', border: '1px solid rgba(46,216,160,0.22)',
                borderRadius: '3px', padding: '1px 5px',
              }}>{applied}</span>
            </div>
            <span style={{ fontSize: '9px', color: 'rgba(200,200,224,0.3)' }}>
              {historyOpen ? '▲' : '▼'}
            </span>
          </button>

          {historyOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {actionHistory.map((entry, i) => (
                <HistoryRow key={entry.id} entry={entry} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {applied === 0 && (
        <div style={{ textAlign: 'center', padding: '8px 0', color: 'rgba(200,200,224,0.2)', fontSize: '10px' }}>
          Apply actions above to track your progress here
        </div>
      )}

      <style>{`
        @keyframes fsp-row {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default FinalSummaryPanel;
