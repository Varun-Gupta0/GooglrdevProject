/**
 * ChangeFeedbackPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays an animated before → after diff every time the user clicks APPLY
 * or runs AUTO-FIX.  Receives previous and current state as props, filters out
 * trivial changes, and colour-codes improvements vs regressions.
 *
 * Usage (inside AIInsightPanel):
 *   <ChangeFeedbackPanel prev={prevSnapshot} curr={currSnapshot} visible={shown} />
 *
 * Where snapshot = { fairness_score, risk_level, simulatorParams }
 */

import React, { useEffect, useRef, useState } from 'react';

// ─── helpers ──────────────────────────────────────────────────────────────────

const SLIDER_LABELS = {
  gender:  'Gender Influence',
  balance: 'Feature Balance',
  thresh:  'Threshold Calibration',
  age:     'Age Weighting',
  race:    'Race Sensitivity',
};

const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3, FAIR: 4, UNKNOWN: -1 };

// Row = { label, before, after, improved, delta }
const buildDiffRows = (prev, curr) => {
  if (!prev || !curr) return [];
  const rows = [];

  // Fairness score
  const fs_before = prev.fairness_score ?? 0;
  const fs_after  = curr.fairness_score ?? 0;
  if (Math.abs(fs_after - fs_before) >= 1) {
    rows.push({
      label:    'Fairness Score',
      before:   `${fs_before}/100`,
      after:    `${fs_after}/100`,
      improved: fs_after > fs_before,
      delta:    `${fs_after > fs_before ? '+' : ''}${(fs_after - fs_before).toFixed(0)}`,
    });
  }

  // Risk level
  const rl_before = prev.risk_level ?? prev.state ?? '';
  const rl_after  = curr.risk_level ?? curr.state ?? '';
  if (rl_before && rl_after && rl_before !== rl_after) {
    rows.push({
      label:    'Bias Level',
      before:   rl_before,
      after:    rl_after,
      improved: (RISK_ORDER[rl_after] ?? 0) > (RISK_ORDER[rl_before] ?? 0),
      delta:    null,
    });
  }

  // Slider params
  const pp = prev.simulatorParams ?? {};
  const cp = curr.simulatorParams ?? {};
  Object.keys(SLIDER_LABELS).forEach(key => {
    const vb = pp[key];
    const va = cp[key];
    if (vb == null || va == null || Math.abs(va - vb) < 1) return;

    // For bias sliders (gender/age/race), lower = better; for balance/thresh higher = better
    const improvesWhenLower = ['gender', 'age', 'race'].includes(key);
    const improved = improvesWhenLower ? va < vb : va > vb;

    rows.push({
      label:    SLIDER_LABELS[key],
      before:   `${Math.round(vb)}%`,
      after:    `${Math.round(va)}%`,
      improved,
      delta:    `${va > vb ? '+' : ''}${Math.round(va - vb)}%`,
    });
  });

  return rows;
};

// ─── single diff row ──────────────────────────────────────────────────────────

const DiffRow = ({ row, index }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 70);
    return () => clearTimeout(t);
  }, [index]);

  const col = row.improved ? '#2ed8a0' : '#ff7070';

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 10px', borderRadius: '6px',
      background: `${col}08`,
      border: `1px solid ${col}20`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(-12px)',
      transition: 'opacity 0.35s ease, transform 0.35s ease',
    }}>
      {/* Label */}
      <span style={{ fontSize: '10px', color: 'rgba(200,200,224,0.55)', minWidth: '130px' }}>
        {row.label}
      </span>

      {/* before → after */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700 }}>
        <span style={{ color: 'rgba(200,200,224,0.35)', textDecoration: 'line-through' }}>{row.before}</span>
        <span style={{ color: 'rgba(200,200,224,0.4)', fontSize: '9px' }}>→</span>
        <span style={{ color: col }}>{row.after}</span>
        {row.delta && (
          <span style={{
            fontSize: '9px', fontWeight: 800, color: col,
            background: `${col}18`, border: `1px solid ${col}30`,
            borderRadius: '3px', padding: '1px 5px', marginLeft: '2px',
          }}>
            {row.delta}
          </span>
        )}
      </div>

      {/* icon */}
      <span style={{ fontSize: '11px', color: col, minWidth: '14px', textAlign: 'right' }}>
        {row.improved ? '↑' : '↓'}
      </span>
    </div>
  );
};

// ─── main panel ───────────────────────────────────────────────────────────────

const ChangeFeedbackPanel = ({ prev, curr, visible, label = 'Applied Changes' }) => {
  const rows     = buildDiffRows(prev, curr);
  const improved = rows.filter(r => r.improved).length;
  const total    = rows.length;

  if (!visible || total === 0) return null;

  return (
    <div style={{
      background: 'rgba(46,216,160,0.04)',
      border: '1px solid rgba(46,216,160,0.18)',
      borderRadius: '9px', padding: '11px 13px',
      animation: 'cfp-enter 0.4s cubic-bezier(0.22,1,0.36,1)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '13px' }}>⚡</span>
          <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: '#2ed8a0', textTransform: 'uppercase' }}>
            {label}
          </span>
        </div>
        <span style={{
          fontSize: '9px', fontWeight: 700,
          color: improved === total ? '#2ed8a0' : improved > 0 ? '#ffb74d' : '#ff7070',
          background: improved === total ? 'rgba(46,216,160,0.1)' : 'rgba(255,183,77,0.1)',
          border: `1px solid ${improved === total ? 'rgba(46,216,160,0.2)' : 'rgba(255,183,77,0.2)'}`,
          borderRadius: '4px', padding: '2px 7px',
        }}>
          {improved}/{total} improved
        </span>
      </div>

      {/* Diff rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {rows.map((row, i) => <DiffRow key={row.label} row={row} index={i} />)}
      </div>

      <style>{`
        @keyframes cfp-enter {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ChangeFeedbackPanel;
