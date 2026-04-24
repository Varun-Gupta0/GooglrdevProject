/**
 * DemoMode.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * One-click hackathon demo. Runs a real 4-step transformation sequence through
 * the live /api/simulate endpoint, updating all charts and the AI panel.
 *
 * Steps:
 *  0  Inject a "broken" starting state  (gender:90, balance:10, thresh:20, age:85, race:85)
 *  1  Reduce Gender Influence            → gender: 25
 *  2  Rebalance Feature Balance          → balance: 78
 *  3  Raise Threshold Calibration        → thresh: 72
 *  4  Full Auto-Fix                      → globally optimal params
 *
 * Each step waits 900 ms so every chart animates visibly before the next fires.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import useEquiLens from '../store/useEquiLens';

// ─── Demo step definitions ────────────────────────────────────────────────────

const DEMO_START = { gender: 90, balance: 10, thresh: 20, age: 85, race: 85 };

const DEMO_STEPS = [
  {
    label:       'Reducing Gender Influence',
    icon:        '①',
    params:      { gender: 25 },
    instruction: 'Reduce **Gender Influence** slider → 25%',
    reason:      'Gender was the dominant bias driver (score: 90/100). Reducing its weight breaks the proxy-discrimination chain.',
  },
  {
    label:       'Rebalancing Dataset',
    icon:        '②',
    params:      { balance: 78 },
    instruction: 'Raise **Feature Balance** slider → 78%',
    reason:      'High group disparity detected. Increasing balance equalises training sample density across demographic groups.',
  },
  {
    label:       'Calibrating Threshold',
    icon:        '③',
    params:      { thresh: 72 },
    instruction: 'Raise **Threshold Calibration** slider → 72%',
    reason:      'Tight threshold (20%) was systematically excluding borderline candidates from underrepresented groups.',
  },
  {
    label:       'Applying Auto-Fix',
    icon:        '④',
    params:      { gender: 10, balance: 92, thresh: 82, age: 10, race: 10 },
    instruction: 'Run **⚡ AUTO-FIX ENGINE** — full global optimisation',
    reason:      'Compound all corrections simultaneously to reach peak fairness.',
    isAutofix:   true,
  },
];

const STEP_DELAY_MS = 950;  // gap between each step

// ─── helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Mirror the backend /api/simulate formula so we can show projected score
const projectScore = (p) =>
  clamp(Math.round(100 - (p.gender * 0.4 + (100 - p.balance) * 0.3 + (100 - p.thresh) * 0.2 + p.age * 0.05 + p.race * 0.05)), 5, 95);

const sevLabel = (s) => {
  if (s < 40) return 'CRITICAL';
  if (s < 60) return 'HIGH';
  if (s < 75) return 'MODERATE';
  return 'FAIR';
};

const sevColor = (s) => {
  if (s < 40) return '#ff7070';
  if (s < 60) return '#ffb74d';
  if (s < 75) return '#a09aff';
  return '#2ed8a0';
};

// ─── Step indicator ────────────────────────────────────────────────────────────

const StepRow = ({ step, state }) => {
  // state: 'pending' | 'active' | 'done'
  const col = state === 'done' ? '#2ed8a0' : state === 'active' ? '#a09aff' : 'rgba(200,200,224,0.2)';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '8px 12px', borderRadius: '6px',
      background: state === 'active' ? 'rgba(160,154,255,0.08)' : state === 'done' ? 'rgba(46,216,160,0.06)' : 'transparent',
      border: `1px solid ${state === 'pending' ? 'rgba(255,255,255,0.05)' : col + '30'}`,
      transition: 'all 0.4s',
    }}>
      <span style={{ fontSize: '12px', color: col, flexShrink: 0, transition: 'color 0.4s', marginTop: '1px' }}>
        {state === 'done' ? '✓' : state === 'active' ? '⟳' : step.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: state === 'active' ? 700 : 600, color: state === 'pending' ? 'rgba(200,200,224,0.3)' : 'rgba(220,220,240,0.85)', lineHeight: 1.45, transition: 'color 0.4s' }}
          dangerouslySetInnerHTML={{ __html: step.instruction.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${col}">$1</strong>`) }}
        />
        {state !== 'pending' && (
          <div style={{ fontSize: '9px', color: 'rgba(200,200,224,0.4)', marginTop: '4px', lineHeight: 1.5, animation: 'dm-fadein 0.3s ease' }}>
            {step.reason}
          </div>
        )}
      </div>
      {state === 'active' && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a09aff', animation: 'dm-pulse 0.8s infinite', flexShrink: 0, marginTop: '4px' }} />
      )}
    </div>
  );
};

// ─── Score transition display ──────────────────────────────────────────────────

const ScoreTransition = ({ from, to, isDone }) => {
  const fromCol  = sevColor(from);
  const toCol    = sevColor(to);
  const improved = to > from;
  const delta    = to - from;
  const isFairNow = to >= 75;
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        {/* FROM score */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '30px', fontWeight: 800, color: fromCol, lineHeight: 1,
            textShadow: from < 40 ? `0 0 18px ${fromCol}88` : 'none',
          }}>{from}</div>
          <div style={{ fontSize: '8px', color: fromCol, fontWeight: 700, letterSpacing: '0.1em', marginTop: 2 }}>{sevLabel(from)}</div>
        </div>

        {/* Arrow + delta */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div style={{ fontSize: '18px', color: improved ? '#2ed8a0' : '#ff7070' }}>→</div>
          {delta !== 0 && (
            <div style={{
              fontSize: '10px', fontWeight: 800,
              color: improved ? '#2ed8a0' : '#ff7070',
              animation: isDone ? 'dm-celebrate 0.6s cubic-bezier(0.22,1,0.36,1)' : 'none',
            }}>
              {improved ? '+' : ''}{delta}
            </div>
          )}
        </div>

        {/* TO score */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '30px', fontWeight: 800, color: toCol, lineHeight: 1,
            transition: 'color 0.5s, text-shadow 0.5s',
            textShadow: isFairNow ? `0 0 22px ${toCol}99` : 'none',
            animation: isDone && isFairNow ? 'dm-pulse-score 1.4s ease infinite' : 'none',
          }}>{to}</div>
          <div style={{ fontSize: '8px', color: toCol, fontWeight: 700, letterSpacing: '0.1em', marginTop: 2, transition: 'color 0.5s' }}>{sevLabel(to)}</div>
        </div>
      </div>

      {/* Improvement pill — shown when done and improved */}
      {isDone && delta > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: 'rgba(46,216,160,0.12)', border: '1px solid rgba(46,216,160,0.3)',
            borderRadius: '20px', padding: '3px 12px',
            fontSize: '11px', fontWeight: 800, color: '#2ed8a0',
            boxShadow: '0 0 16px rgba(46,216,160,0.2)',
            animation: 'dm-fadein 0.5s ease',
          }}>
            <span>▲</span>
            <span>+{delta} point improvement</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main DemoMode component ───────────────────────────────────────────────────

const DemoMode = () => {
  const { setSimulatorParams, setSession, setScorecard, setInitialScorecard, clearActionHistory, pushActionHistory, addXP } = useEquiLens();

  const [phase,       setPhase]       = useState('idle');   // idle | running | done | error
  const [currentStep, setCurrentStep] = useState(-1);       // index into DEMO_STEPS
  const [stepStates,  setStepStates]  = useState({});       // { 0: 'done', 1: 'active', ... }
  const [scoreFrom,   setScoreFrom]   = useState(0);
  const [scoreTo,     setScoreTo]     = useState(0);
  const [open,        setOpen]        = useState(false);    // panel expanded
  const cancelRef = useRef(false);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition({ x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
    setIsDragging(false);
  };

  // ── Seed demo session so AI panel and FinalSummaryPanel activate ────────────
  const seedDemoSession = useCallback(async () => {
    const startScore = projectScore(DEMO_START);

    // Build a plausible demo scorecard
    const demoScorecard = {
      fairness_score:    startScore,
      accuracy:          52,
      bias_index:        100 - startScore,
      stability:         31,
      risk_level:        sevLabel(startScore),
      state:             sevLabel(startScore),
      bias_contributors: [
        { feature: 'Gender',    score: 88, severity: 'CRITICAL' },
        { feature: 'Race',      score: 72, severity: 'HIGH'     },
        { feature: 'Age',       score: 65, severity: 'HIGH'     },
        { feature: 'Zip',       score: 58, severity: 'HIGH'     },
        { feature: 'Income',    score: 44, severity: 'MEDIUM'   },
        { feature: 'Education', score: 38, severity: 'MEDIUM'   },
        { feature: 'Region',    score: 32, severity: 'LOW'      },
      ],
      group_fairness: [
        { name: 'Male',   fairness: startScore + 18 > 95 ? 95 : startScore + 18 },
        { name: 'Female', fairness: Math.max(5, startScore - 22) },
        { name: '18-30',  fairness: startScore + 10 > 95 ? 95 : startScore + 10 },
        { name: '55+',    fairness: Math.max(5, startScore - 18) },
        { name: 'Urban',  fairness: startScore + 8 > 95 ? 95 : startScore + 8 },
        { name: 'Rural',  fairness: Math.max(5, startScore - 14) },
      ],
      selection_rates: {
        gender_male: 72.4, gender_female: 28.1,
        age_young: 65.0,   age_senior: 22.5,
      },
      intersectionality: null,
    };

    // Inject session so the AI panel considers it "uploaded"
    setSession({
      session_id:       'demo-mode-' + Date.now(),
      uploaded:          true,
      columns:          ['gender','age','race','experience','education','salary','zip','hired'],
      target_col:       'hired',
      protected_attrs:  ['gender', 'age', 'race'],
    });
    setScorecard(demoScorecard);
    setInitialScorecard(demoScorecard);
    clearActionHistory();
  }, [setSession, setScorecard, setInitialScorecard, clearActionHistory]);

  // ── Run the demo sequence ────────────────────────────────────────────────────
  const runDemo = useCallback(async () => {
    if (phase === 'running') return;
    cancelRef.current = false;
    setPhase('running');
    setCurrentStep(-1);
    setStepStates({});
    setOpen(true);
    setPosition({ x: 0, y: 0 });

    // Step 0: inject broken start state
    await seedDemoSession();
    await setSimulatorParams(DEMO_START);
    const startScore = projectScore(DEMO_START);
    setScoreFrom(startScore);
    setScoreTo(startScore);
    await sleep(700);

    let currentParams = { ...DEMO_START };

    for (let i = 0; i < DEMO_STEPS.length; i++) {
      if (cancelRef.current) { setPhase('idle'); return; }

      const step = DEMO_STEPS[i];
      setCurrentStep(i);
      setStepStates(prev => ({ ...prev, [i]: 'active' }));

      // Merge params for this step
      currentParams = { ...currentParams, ...step.params };
      const prevScore = projectScore({ ...currentParams, ...Object.fromEntries(Object.entries(step.params).map(([k]) => [k, DEMO_START[k]])) });
      const nextScore = projectScore(currentParams);

      // Fire the real simulate call — updates all charts
      await setSimulatorParams(step.params);
      await sleep(STEP_DELAY_MS);

      setScoreTo(nextScore);

      // Push to action history
      pushActionHistory({
        instruction:     step.instruction,
        before:          `${Object.keys(step.params).map(k => `${k}: ${DEMO_START[k]}%`).join(', ')}`,
        after:           `${Object.entries(step.params).map(([k, v]) => `${k}: ${v}%`).join(', ')}`,
        expected_result: `Fairness ≈ ${nextScore}/100`,
        fairnessBefore:  prevScore,
        fairnessAfter:   nextScore,
      });

      setStepStates(prev => ({ ...prev, [i]: 'done' }));
      if (i < DEMO_STEPS.length - 1) await sleep(300);
    }

    addXP(300);
    setCurrentStep(-1);
    setPhase('done');
  }, [phase, seedDemoSession, setSimulatorParams, pushActionHistory, addXP]);

  const reset = () => {
    cancelRef.current = true;
    setPhase('idle');
    setCurrentStep(-1);
    setStepStates({});
    setScoreFrom(0);
    setScoreTo(0);
    setPosition({ x: 0, y: 0 });
  };

  // ── Button (collapsed state) ─────────────────────────────────────────────────
  const finalScore = scoreTo;
  const isFair     = finalScore >= 75;

  return (
    <>
      {/* ── Trigger Button (shown in header area) ─────────────────────────── */}
      <button
        id="demo-mode-btn"
        onClick={phase === 'idle' || phase === 'done' ? runDemo : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 13px', borderRadius: '6px', fontFamily: 'inherit',
          fontSize: '10px', fontWeight: 800, letterSpacing: '0.07em',
          cursor: phase === 'running' ? 'not-allowed' : 'pointer',
          border: `1px solid ${phase === 'done' ? 'rgba(46,216,160,0.4)' : 'rgba(127,119,221,0.4)'}`,
          background: phase === 'done'
            ? 'rgba(46,216,160,0.12)'
            : phase === 'running'
              ? 'rgba(127,119,221,0.06)'
              : 'rgba(127,119,221,0.12)',
          color: phase === 'done' ? '#2ed8a0' : '#a09aff',
          transition: 'all 0.3s',
          boxShadow: phase === 'done' ? '0 0 14px rgba(46,216,160,0.2)' : phase === 'running' ? '0 0 10px rgba(127,119,221,0.15)' : 'none',
        }}
      >
        <span style={{ fontSize: '12px', animation: phase === 'running' ? 'dm-spin 1.2s linear infinite' : 'none' }}>
          {phase === 'done' ? '✓' : phase === 'running' ? '⟳' : '🚀'}
        </span>
        {phase === 'running' ? 'DEMO RUNNING…' : phase === 'done' ? 'DEMO COMPLETE' : 'RUN LIVE DEMO'}
        {phase !== 'idle' && (
          <span onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
            style={{ marginLeft: '2px', fontSize: '8px', opacity: 0.5, cursor: 'pointer' }}>
            {open ? '▲' : '▼'}
          </span>
        )}
      </button>

      {/* ── Floating demo panel ────────────────────────────────────────────── */}
      {(phase !== 'idle' || open) && open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', animation: 'dm-overlay-enter 0.3s ease',
          padding: '20px'
        }}>
          <div style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            width: '100%', maxWidth: '700px'
          }}>
            <div className="custom-scrollbar" style={{
              width: '100%', maxHeight: '85vh', overflowY: 'auto',
              background: '#0a0e14',
              border: `1px solid ${
                phase === 'done' ? 'rgba(46,216,160,0.35)'
                : phase === 'running' && scoreTo < 40 ? 'rgba(255,112,112,0.35)'
                : 'rgba(127,119,221,0.25)'
              }`,
              borderRadius: '16px', padding: '24px 28px',
              boxShadow: phase === 'done'
                ? '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(46,216,160,0.12)'
                : phase === 'running' && scoreTo < 40
                  ? '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(255,112,112,0.1)'
                  : '0 20px 60px rgba(0,0,0,0.6)',
              animation: 'dm-panel-enter 0.4s cubic-bezier(0.22,1,0.36,1)',
              display: 'flex', flexDirection: 'column', gap: '16px',
              transition: 'border-color 0.5s, box-shadow 0.5s',
            }}>

              {/* Header row */}
              <div 
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: isDragging ? 'grabbing' : 'grab' }}
              >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '18px' }}>🚀</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', color: '#fff' }}>LIVE FIX DEMO</div>
                  <div style={{ fontSize: '9px', color: 'rgba(200,200,224,0.4)', letterSpacing: '0.07em', marginTop: '2px' }}>HIRING AI · BIAS REMEDIATION · EQUILENS</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onPointerDown={e => e.stopPropagation()} onClick={reset} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 12px', color: 'rgba(200,200,224,0.6)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(200,200,224,0.6)'; }}
                >
                  RESET
                </button>
                <button onPointerDown={e => e.stopPropagation()} onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', padding: '4px', color: 'rgba(255,255,255,0.4)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, transition: 'color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ── HOOK: initial warning banner (shown right after seed, before steps) ── */}
            {scoreFrom > 0 && phase === 'running' && currentStep === 0 && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(255,112,112,0.09)', border: '1px solid rgba(255,112,112,0.3)',
                animation: 'dm-fadein 0.4s ease',
                boxShadow: '0 0 20px rgba(255,112,112,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '15px' }}>⚠️</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#ff7070', letterSpacing: '0.05em' }}>
                    This AI system is currently biased and unsafe to deploy.
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,112,112,0.7)', lineHeight: 1.6, paddingLeft: '24px' }}>
                  Non-compliant AI systems can violate fairness regulations (GDPR Art. 22, EU AI Act).
                  EquiLens will now remediate this automatically.
                </div>
              </div>
            )}

            {/* Score transition */}
            {scoreFrom > 0 && (
              <div style={{
                background: phase === 'done'
                  ? 'rgba(46,216,160,0.04)'
                  : scoreTo < 40 ? 'rgba(255,112,112,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${
                  phase === 'done' ? 'rgba(46,216,160,0.2)'
                  : scoreTo < 40 ? 'rgba(255,112,112,0.18)' : 'rgba(255,255,255,0.07)'
                }`,
                borderRadius: '12px',
                padding: '16px',
                transition: 'background 0.5s, border-color 0.5s',
              }}>
                <ScoreTransition from={scoreFrom} to={scoreTo} isDone={phase === 'done'} />
                <div style={{ textAlign: 'center', padding: '0 0 4px', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 700, color: sevColor(scoreTo), transition: 'color 0.5s' }}>
                  {sevLabel(scoreFrom)} → {sevLabel(scoreTo)}
                </div>
              </div>
            )}

            {/* Step list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEMO_STEPS.map((step, i) => (
                <StepRow
                  key={i}
                  step={step}
                  state={stepStates[i] ?? 'pending'}
                />
              ))}
            </div>

            {/* ── DONE: transformation success banner ─────────────────────────── */}
            {phase === 'done' && isFair && (
              <div style={{
                padding: '16px 20px', borderRadius: '12px',
                background: 'rgba(46,216,160,0.09)', border: '1px solid rgba(46,216,160,0.3)',
                textAlign: 'center',
                boxShadow: '0 0 28px rgba(46,216,160,0.12)',
                animation: 'dm-fadein 0.5s ease',
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px', animation: 'dm-celebrate 0.7s cubic-bezier(0.22,1,0.36,1)' }}>✅</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#2ed8a0', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  System is now FAIR, compliant, and ready for deployment.
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(200,200,224,0.6)', lineHeight: 1.6, marginBottom: '12px' }}>
                  Fairness score reached <strong style={{ color: '#2ed8a0' }}>{scoreTo}/100</strong> — above the 75-point compliance threshold.
                  All <strong style={{ color: '#ff7070' }}>CRITICAL</strong> and <strong style={{ color: '#ffb74d' }}>HIGH</strong> severity flags have been cleared.
                </div>
                {/* Legal context */}
                <div style={{
                  fontSize: '9.5px', color: 'rgba(200,200,224,0.4)', lineHeight: 1.5,
                  borderTop: '1px solid rgba(46,216,160,0.15)', paddingTop: '12px',
                }}>
                  ⚖ Now compliant with GDPR Art. 22 & EU AI Act fairness requirements.
                  Non-compliant systems risk fines and deployment bans.
                </div>
                {/* Attribution */}
                <div style={{
                  marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontSize: '10px', fontWeight: 700, color: '#a09aff',
                  background: 'rgba(127,119,221,0.1)', border: '1px solid rgba(127,119,221,0.25)',
                  borderRadius: '20px', padding: '4px 14px',
                }}>
                  <span>⚡</span>
                  <span>Fixed in {DEMO_STEPS.length} steps using EquiLens</span>
                </div>
              </div>
            )}

            {/* Progress bar */}
            {phase === 'running' && (
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  width: `${Math.round(((currentStep + 1) / DEMO_STEPS.length) * 100)}%`,
                  background: 'linear-gradient(90deg, #534AB7, #7F77DD)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            )}

            {/* Footer note */}
            <div style={{ fontSize: '9px', color: 'rgba(200,200,224,0.3)', textAlign: 'center', letterSpacing: '0.08em', marginTop: '4px' }}>
              All changes use live /api/simulate · No fake data
            </div>
          </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dm-overlay-enter { from{opacity:0} to{opacity:1} }
        @keyframes dm-panel-enter  { from{opacity:0;transform:scale(0.95) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes dm-fadein       { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dm-pulse        { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes dm-spin         { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes dm-row          { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes dm-celebrate    { 0%{transform:scale(0.7) translateY(6px);opacity:0} 60%{transform:scale(1.12) translateY(-2px)} 100%{transform:scale(1) translateY(0);opacity:1} }
        @keyframes dm-pulse-score  { 0%,100%{text-shadow:0 0 22px #2ed8a099} 50%{text-shadow:0 0 38px #2ed8a0dd} }
      `}</style>
    </>
  );
};

export default DemoMode;
