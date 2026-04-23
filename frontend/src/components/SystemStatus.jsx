/**
 * SystemStatus.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Animated status progress bar: CRITICAL → HIGH → MODERATE → FAIR
 * Sits at the top of the AI Insight Panel and updates reactively.
 */

import React, { useEffect, useRef, useState } from 'react';

// ─── config ───────────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'CRITICAL', label: 'CRITICAL', color: '#ff7070', threshold: 40 },
  { key: 'HIGH',     label: 'HIGH',     color: '#ffb74d', threshold: 60 },
  { key: 'MODERATE', label: 'MODERATE', color: '#a09aff', threshold: 75 },
  { key: 'FAIR',     label: 'FAIR',     color: '#2ed8a0', threshold: 101 },
];

const stageOf = (score) => {
  if (score < 40) return 0;
  if (score < 60) return 1;
  if (score < 75) return 2;
  return 3;
};

// ─── component ────────────────────────────────────────────────────────────────

const SystemStatus = ({ fairnessScore = 0 }) => {
  const current   = stageOf(fairnessScore);
  const stage     = STAGES[current];
  const prevRef   = useRef(current);
  const [flash, setFlash] = useState(false);

  // Flash when stage changes
  useEffect(() => {
    if (prevRef.current !== current) {
      prevRef.current = current;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
  }, [current]);

  return (
    <div style={{
      background: flash ? `${stage.color}12` : 'rgba(255,255,255,0.02)',
      border: `1px solid ${flash ? stage.color + '40' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '8px', padding: '10px 13px',
      transition: 'background 0.5s, border-color 0.5s',
    }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px' }}>
        <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(200,200,224,0.38)', textTransform: 'uppercase' }}>
          System Status
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: stage.color,
            boxShadow: `0 0 6px ${stage.color}88`,
            animation: current === 0 ? 'ss-pulse 1s infinite' : 'none',
          }} />
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', color: stage.color, transition: 'color 0.4s' }}>
            {stage.label}
          </span>
        </div>
      </div>

      {/* Stage progress track */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {STAGES.map((s, i) => {
          const isActive  = i === current;
          const isDone    = i < current;
          const col       = isDone || isActive ? s.color : 'rgba(255,255,255,0.07)';
          const bgOpacity = isDone ? '22' : isActive ? '18' : '08';

          return (
            <React.Fragment key={s.key}>
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center',
              }}>
                {/* Bar segment */}
                <div style={{
                  width: '100%', height: '5px', borderRadius: '3px',
                  background: isDone || isActive
                    ? `${s.color}${bgOpacity}`
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isDone || isActive ? s.color + '44' : 'rgba(255,255,255,0.05)'}`,
                  position: 'relative', overflow: 'hidden',
                  transition: 'background 0.5s, border-color 0.5s',
                }}>
                  {isActive && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `linear-gradient(90deg, transparent, ${s.color}55, transparent)`,
                      animation: 'ss-sweep 2s linear infinite',
                    }} />
                  )}
                  {isDone && (
                    <div style={{ width: '100%', height: '100%', background: s.color, opacity: 0.45, borderRadius: '3px' }} />
                  )}
                </div>
                {/* Label */}
                <span style={{
                  fontSize: '7.5px', fontWeight: isActive ? 800 : 600,
                  letterSpacing: '0.07em',
                  color: isActive ? s.color : isDone ? `${s.color}99` : 'rgba(255,255,255,0.2)',
                  transition: 'color 0.4s',
                }}>
                  {s.label}
                </span>
              </div>
              {/* Chevron separator */}
              {i < STAGES.length - 1 && (
                <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.12)', flexShrink: 0, marginBottom: '13px' }}>›</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <style>{`
        @keyframes ss-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes ss-sweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </div>
  );
};

export default SystemStatus;
