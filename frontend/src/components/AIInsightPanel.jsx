/**
 * AIInsightPanel.jsx  v4
 * Adds: mechanism ("Why this works"), confidence_reason, preview-before-apply,
 * FinalSummaryPanel, action history push, micro-UX polish.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useEquiLens from '../store/useEquiLens';
import generateInsights, { computeConfidence, getSeverity, buildConfidenceReason } from '../utils/generateInsights';
import SystemStatus from './SystemStatus';
import ChangeFeedbackPanel from './ChangeFeedbackPanel';
import FinalSummaryPanel from './FinalSummaryPanel';

// ── OpenRouter (optional fallback path) ───────────────────────────────────────
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const HAS_API_KEY    = !!OPENROUTER_KEY && !OPENROUTER_KEY.includes('your_openrouter');

const callOpenRouter = async (scorecard) => {
  const top3   = (scorecard.bias_contributors || []).slice(0, 3).map(c => `${c.feature} (bias: ${c.score ?? 0}/100)`).join('; ');
  const groups = (scorecard.group_fairness || []).map(g => `${g.name}: ${g.fairness}%`).join(', ');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': window.location.origin, 'X-Title': 'EquiLens' },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: `Fairness audit. Score: ${scorecard.fairness_score}/100. Bias: ${top3}. Groups: ${groups}.\nRespond ONLY as JSON with keys: diagnosis, cause, confidence, confidence_reason, severity, actions[]{instruction,reason,mechanism,before,after,expected_result,paramAdjustments}` }],
      max_tokens: 1000, temperature: 0.05,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content?.trim() ?? '{}';
  const s    = raw.indexOf('{'), e = raw.lastIndexOf('}');
  if (s === -1) throw new Error('Bad JSON');
  const p = JSON.parse(raw.slice(s, e + 1));
  if (p.suggestions && !p.actions) p.actions = p.suggestions;
  return p;
};

// ── Shared constants ──────────────────────────────────────────────────────────
const SEV = {
  CRITICAL: { color: '#ff7070', bg: 'rgba(255,112,112,0.08)' },
  HIGH:     { color: '#ffb74d', bg: 'rgba(255,183,77,0.08)'  },
  MODERATE: { color: '#a09aff', bg: 'rgba(160,154,255,0.08)' },
  LOW:      { color: '#2ed8a0', bg: 'rgba(46,216,160,0.08)'  },
};
const sm = (s) => SEV[s] ?? SEV.MODERATE;
const CARD_COLORS = ['#ff7070', '#ffb74d', '#a09aff', '#2ed8a0'];

// ── Sub-components ────────────────────────────────────────────────────────────

const ConfidenceMeter = ({ value, reason }) => {
  const [open, setOpen] = useState(false);
  const col = value >= 85 ? '#2ed8a0' : value >= 70 ? '#a09aff' : '#ffb74d';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: reason ? 'pointer' : 'default' }}
           onClick={() => reason && setOpen(o => !o)}>
        <span style={{ fontSize: '9px', color: 'rgba(200,200,224,0.35)', letterSpacing: '0.08em', minWidth: '68px' }}>CONFIDENCE</span>
        <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${value}%`, background: col, borderRadius: '2px', transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1), background 0.4s' }} />
        </div>
        <span style={{ fontSize: '9px', fontWeight: 700, color: col, minWidth: '28px', textAlign: 'right' }}>{value}%</span>
        {reason && <span style={{ fontSize: '8px', color: 'rgba(200,200,224,0.25)' }}>{open ? '▲' : '▼'}</span>}
      </div>
      {open && reason && (
        <div style={{ marginTop: '6px', padding: '8px 10px', borderRadius: '6px', background: `${col}09`, border: `1px solid ${col}22`, fontSize: '10px', color: 'rgba(200,200,224,0.55)', lineHeight: 1.65, animation: 'ai-fadein 0.25s ease' }}>
          <span style={{ color: col, fontWeight: 700, fontSize: '9px', letterSpacing: '0.07em' }}>WHY THIS CONFIDENCE? </span>
          {reason}
        </div>
      )}
    </div>
  );
};

const SourceBadge = ({ source }) => {
  const isAI = source === 'openrouter';
  const col  = isAI ? '#a09aff' : '#2ed8a0';
  return <span style={{ fontSize: '8px', fontWeight: 700, color: col, background: `${col}12`, border: `1px solid ${col}25`, borderRadius: '3px', padding: '2px 6px', letterSpacing: '0.08em' }}>{isAI ? '⚡ Llama 3.3 70B' : '◈ Rules Engine v3'}</span>;
};

const Skeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
    {['DIAGNOSIS', 'ROOT CAUSE', 'ACTIONS'].map(label => (
      <div key={label} style={{ padding: '11px 13px', borderRadius: '8px', background: 'rgba(127,119,221,0.03)', border: '1px solid rgba(127,119,221,0.08)', animation: 'ai-shimmer 1.5s ease-in-out infinite' }}>
        <div style={{ fontSize: '9px', color: 'rgba(160,154,255,0.22)', fontWeight: 800, letterSpacing: '0.12em', marginBottom: 8 }}>{label}</div>
        <div style={{ height: 7, background: 'rgba(255,255,255,0.035)', borderRadius: 4, marginBottom: 5, width: '88%' }} />
        <div style={{ height: 7, background: 'rgba(255,255,255,0.02)', borderRadius: 4, width: '60%' }} />
      </div>
    ))}
  </div>
);

// ── Preview Impact chip (shown before Apply) ───────────────────────────────────
const PreviewImpact = ({ preview, color }) => {
  if (!preview) return null;
  const improved = preview.delta > 0;
  const sevChanged = preview.severity_before !== preview.severity_after;
  return (
    <div style={{ marginTop: '8px', padding: '7px 10px', borderRadius: '6px', background: `${color}08`, border: `1px solid ${color}22` }}>
      <div style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(200,200,224,0.35)', marginBottom: '5px' }}>
        ⚡ IF APPLIED
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: improved ? '#2ed8a0' : '#ff7070' }}>
          Fairness: {preview.fairness_before} → <strong>{preview.fairness_after}</strong>
          {' '}({preview.delta > 0 ? '+' : ''}{preview.delta} pts)
        </span>
        {sevChanged && (
          <span style={{ fontSize: '9px', color: 'rgba(200,200,224,0.45)' }}>
            | Severity: <span style={{ color: SEV[preview.severity_before]?.color }}>{preview.severity_before}</span>
            {' → '}<span style={{ color: SEV[preview.severity_after]?.color, fontWeight: 700 }}>{preview.severity_after}</span>
          </span>
        )}
      </div>
    </div>
  );
};

// ── Mechanism expander ─────────────────────────────────────────────────────────
const MechanismBox = ({ text, color }) => {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div style={{ marginTop: '6px' }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', color: `${color}cc` }}>WHY THIS WORKS</span>
        <span style={{ fontSize: '8px', color: `${color}66` }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div
          style={{ marginTop: '5px', padding: '8px 10px', borderRadius: '6px', background: `${color}07`, border: `1px solid ${color}1f`, fontSize: '10px', color: 'rgba(200,200,224,0.55)', lineHeight: 1.7, animation: 'ai-fadein 0.22s ease' }}
          dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:rgba(220,220,240,0.8)">$1</strong>') }}
        />
      )}
    </div>
  );
};

// ── Action card ────────────────────────────────────────────────────────────────
const ActionCard = ({ action, index, applied, onApply }) => {
  const col      = CARD_COLORS[index % CARD_COLORS.length];
  const canApply = !!action.paramAdjustments;
  const isAuto   = action.action_type === 'autofix';

  return (
    <div style={{
      background: applied ? `${col}09` : 'rgba(255,255,255,0.02)',
      border: `1px solid ${applied ? col + '32' : 'rgba(255,255,255,0.065)'}`,
      borderRadius: '8px', padding: '11px 13px',
      boxShadow: applied ? `0 0 12px ${col}18` : 'none',
      transition: 'all 0.35s',
    }}>
      {/* Row 1: number + instruction + apply */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '7px' }}>
        <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${col}20`, border: `1px solid ${col}40`, fontSize: '9px', fontWeight: 800, color: col }}>
          {index + 1}
        </span>
        <div style={{ flex: 1, fontSize: '11px', fontWeight: 600, color: 'rgba(220,220,240,0.88)', lineHeight: 1.55 }}
          dangerouslySetInnerHTML={{ __html: action.instruction.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${col}">$1</strong>`) }}
        />
        <button
          onClick={() => onApply(action)}
          disabled={applied || !canApply}
          style={{
            flexShrink: 0, padding: '3px 10px', borderRadius: '4px', fontSize: '8px', fontWeight: 800,
            letterSpacing: '0.08em', fontFamily: 'inherit',
            cursor: (applied || !canApply) ? 'default' : 'pointer',
            border: `1px solid ${col}40`,
            background: applied ? `${col}20` : 'transparent',
            color: applied ? col : 'rgba(200,200,224,0.3)',
            opacity: !canApply && !applied ? 0.35 : 1,
            transition: 'all 0.2s',
          }}
        >
          {applied ? '✓ APPLIED' : isAuto ? '⚡ RUN' : 'APPLY'}
        </button>
      </div>

      {/* Row 2: reason */}
      <div style={{ fontSize: '10px', color: 'rgba(220,220,240,0.44)', lineHeight: 1.65, marginBottom: '8px' }}
        dangerouslySetInnerHTML={{ __html: action.reason.replace(/\*\*(.*?)\*\*/g, '<strong style="color:rgba(220,220,240,0.72)">$1</strong>') }}
      />

      {/* Row 3: before → after + expected result */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
        {action.before && action.after && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '5px', padding: '3px 8px', fontSize: '10px' }}>
            <span style={{ color: 'rgba(200,200,224,0.35)', textDecoration: 'line-through', fontWeight: 600 }}>{action.before}</span>
            <span style={{ color: 'rgba(200,200,224,0.3)', fontSize: '9px' }}>→</span>
            <span style={{ color: col, fontWeight: 700 }}>{action.after}</span>
          </div>
        )}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: col, fontWeight: 700, background: `${col}0c`, border: `1px solid ${col}22`, borderRadius: '4px', padding: '2px 8px' }}>
          <span>→</span><span>{action.expected_result}</span>
        </div>
      </div>

      {/* Preview before apply (hidden once applied) */}
      {!applied && <PreviewImpact preview={action.preview_impact} color={col} />}

      {/* Why this works (collapsible) */}
      <MechanismBox text={action.mechanism} color={col} />
    </div>
  );
};

// ── Main panel ─────────────────────────────────────────────────────────────────
const AIInsightPanel = () => {
  const { scorecard, session, simulatorParams, applySuggestion, addXP, pushActionHistory } = useEquiLens();

  const [status,   setStatus]   = useState('idle');
  const [insights, setInsights] = useState(null);
  const [applied,  setApplied]  = useState({});
  const [source,   setSource]   = useState('rules');
  const [feedback, setFeedback] = useState({ visible: false, prev: null, curr: null, label: '' });
  const prevSession = useRef(null);

  const hasData = session.uploaded && session.session_id;

  const snap = useCallback(() => ({
    fairness_score: scorecard.fairness_score,
    risk_level:     scorecard.risk_level ?? scorecard.state,
    simulatorParams: { ...simulatorParams },
  }), [scorecard, simulatorParams]);

  const runAnalysis = useCallback(async () => {
    if (!hasData) return;
    setStatus('loading');
    setInsights(null);
    setApplied({});
    setFeedback(f => ({ ...f, visible: false }));

    if (HAS_API_KEY) {
      try {
        const result = await callOpenRouter(scorecard);
        setInsights(result); setSource('openrouter'); setStatus('done'); addXP(30);
        return;
      } catch (e) { console.warn('[AIInsight] OpenRouter failed:', e.message); }
    }

    try {
      await new Promise(r => setTimeout(r, 480));
      const result = generateInsights({
        fairness_score:    scorecard.fairness_score,
        bias_contributors: scorecard.bias_contributors,
        selection_rates:   scorecard.selection_rates ?? {},
        group_fairness:    scorecard.group_fairness,
        simulatorParams,
      });
      setInsights(result); setSource('rules'); setStatus('done'); addXP(20);
    } catch (e) { console.error('[AIInsight] Engine error:', e); setStatus('error'); }
  }, [scorecard, simulatorParams, hasData, addXP]);

  useEffect(() => {
    if (hasData && session.session_id !== prevSession.current) {
      prevSession.current = session.session_id;
      runAnalysis();
    }
  }, [session.session_id, session.uploaded, runAnalysis]);

  const handleApply = (action, idx) => {
    const before = snap();
    applySuggestion(action);
    setApplied(prev => ({ ...prev, [idx]: true }));

    setTimeout(() => {
      const after = snap();
      setFeedback({
        visible: true, prev: before, curr: after,
        label: action.action_type === 'autofix' ? '⚡ Auto-Fix Applied' : 'Changes Applied',
      });
      // Push to action history
      pushActionHistory({
        instruction:    action.instruction,
        before:         action.before,
        after:          action.after,
        expected_result: action.expected_result,
        fairnessBefore: before.fairness_score,
        fairnessAfter:  after.fairness_score,
      });
      setTimeout(() => setFeedback(f => ({ ...f, visible: false })), 8000);
    }, 650);
  };

  const liveConfidence = computeConfidence(
    scorecard.fairness_score, scorecard.bias_contributors,
    scorecard.selection_rates ?? {}, scorecard.group_fairness,
  );
  const confidenceReason = buildConfidenceReason(
    scorecard.fairness_score, scorecard.bias_contributors,
    scorecard.selection_rates ?? {}, scorecard.group_fairness,
  );

  const severity = insights?.severity ?? getSeverity(scorecard.fairness_score);
  const meta     = sm(severity);
  const dotCol   = { idle: '#444', loading: '#ffb74d', done: meta.color, error: '#ff7070' }[status];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* ── Main insight card ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-glass)',
        border: `1px solid ${status === 'done' ? meta.color + '28' : 'var(--border-glass)'}`,
        borderRadius: '10px', padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        transition: 'border-color 0.5s',
      }}>
        <SystemStatus fairnessScore={scorecard.fairness_score} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotCol, boxShadow: status === 'done' ? `0 0 7px ${dotCol}88` : 'none', animation: status === 'loading' ? 'ai-pulse 0.9s infinite' : 'none' }} />
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.13em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Fairness Insights</span>
            {status === 'done' && <SourceBadge source={source} />}
          </div>
          <button onClick={runAnalysis} disabled={status === 'loading' || !hasData}
            style={{ padding: '3px 10px', borderRadius: '5px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'inherit', cursor: (status === 'loading' || !hasData) ? 'not-allowed' : 'pointer', border: '1px solid rgba(127,119,221,0.28)', background: 'rgba(127,119,221,0.07)', color: '#a09aff', opacity: (status === 'loading' || !hasData) ? 0.4 : 1, transition: 'all 0.2s' }}>
            {status === 'loading' ? '⟳ ANALYZING…' : '⟳ REFRESH'}
          </button>
        </div>

        {/* Confidence (always live, clickable to see reason) */}
        <ConfidenceMeter value={liveConfidence} reason={confidenceReason} />

        {/* States */}
        {status === 'idle' && !hasData && (
          <div style={{ textAlign: 'center', padding: '26px 0', color: 'rgba(200,200,224,0.18)', fontSize: '11px' }}>
            <div style={{ fontSize: '22px', marginBottom: '8px' }}>◈</div>
            Upload a CSV dataset to generate AI-powered fairness insights
          </div>
        )}
        {status === 'loading' && <Skeleton />}
        {status === 'error' && (
          <div style={{ fontSize: '11px', color: '#ff7070', background: 'rgba(226,75,74,0.07)', border: '1px solid rgba(226,75,74,0.18)', borderRadius: '7px', padding: '10px 12px', textAlign: 'center' }}>
            Analysis failed.{' '}<span onClick={runAnalysis} style={{ cursor: 'pointer', textDecoration: 'underline', color: '#ff9090' }}>Retry</span>
          </div>
        )}

        {/* Results */}
        {status === 'done' && insights && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {/* Diagnosis */}
            <div style={{ padding: '11px 13px', borderRadius: '7px', background: meta.bg, border: `1px solid ${meta.color}22` }}>
              <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: meta.color, marginBottom: 7 }}>◎ DIAGNOSIS</div>
              <div style={{ fontSize: '11px', lineHeight: 1.75, color: 'rgba(220,220,240,0.78)' }}
                dangerouslySetInnerHTML={{ __html: insights.diagnosis.replace(/\*\*(.*?)\*\*/g, '<strong style="color:rgba(220,220,240,0.96)">$1</strong>') }}
              />
            </div>
            {/* Root Cause */}
            <div style={{ padding: '11px 13px', borderRadius: '7px', background: 'rgba(239,159,39,0.05)', border: '1px solid rgba(239,159,39,0.14)' }}>
              <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: '#ffb74d', marginBottom: 7 }}>◈ ROOT CAUSE</div>
              <div style={{ fontSize: '11px', lineHeight: 1.75, color: 'rgba(220,220,240,0.72)' }}
                dangerouslySetInnerHTML={{ __html: insights.cause.replace(/\*\*(.*?)\*\*/g, '<strong style="color:rgba(220,220,240,0.9)">$1</strong>') }}
              />
            </div>
            {/* Actions */}
            {(insights.actions ?? []).length > 0 && (
              <div>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: '#2ed8a0', marginBottom: '8px' }}>★ REMEDIATION ACTIONS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {insights.actions.map((action, i) => (
                    <ActionCard key={i} action={action} index={i} applied={!!applied[i]} onApply={(a) => handleApply(a, i)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Change feedback */}
        <ChangeFeedbackPanel prev={feedback.prev} curr={feedback.curr} visible={feedback.visible} label={feedback.label} />
      </div>

      {/* ── Final Summary (below insight card) ───────────────────────────── */}
      <FinalSummaryPanel />

      <style>{`
        @keyframes ai-pulse   { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes ai-shimmer { 0%,100%{opacity:0.5} 50%{opacity:1}  }
        @keyframes ai-fadein  { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
};

export default AIInsightPanel;
