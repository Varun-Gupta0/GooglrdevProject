import React, { useState, useEffect, useRef } from 'react';
import useEquiLens from '../store/useEquiLens';

// ── OpenRouter API call ────────────────────────────────────────────────────────
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
console.log("🔍 [EquiLens Debug] Environment Variables:", import.meta.env);

const callOpenRouter = async (scorecard) => {
  const top3 = (scorecard.bias_contributors || [])
    .slice(0, 3)
    .map(c => `${c.feature} (score: ${c.score}, severity: ${c.severity ?? 'N/A'})`)
    .join('; ');

  const groups = (scorecard.group_fairness || [])
    .map(g => `${g.name}: ${g.fairness}%`)
    .join(', ');

  const prompt = `You are an expert AI fairness auditor. Analyze this hiring model.

Fairness Score: ${scorecard.fairness_score}/100
Top Bias Contributors: ${top3 || 'unknown'}
Group Selection Rates: ${groups || 'unknown'}

Respond ONLY with valid JSON (no markdown, no extra text) in this exact format:
{
  "diagnosis": "2-3 sentence description of the bias detected",
  "cause": "2-3 sentence explanation of why this bias exists",
  "suggestions": [
    {
      "action": "Short action title",
      "impact": "Expected improvement",
      "implementation": "Concrete step to take",
      "paramAdjustments": { "gender": 20, "balance": 80 }
    }
  ]
}

The paramAdjustments must be a subset of these keys: gender (0-100), balance (0-100), thresh (0-100), age (0-100), race (0-100).
Lower gender/age/race = less influence from that attribute. Higher balance/thresh = fairer outcomes.
Provide 3 suggestions.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'EquiLens AI Ethics Dashboard',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '{}';
  
  // Robust cleaning: Find the first { and last } to extract JSON even if there is filler text
  const startIdx = raw.indexOf('{');
  const endIdx = raw.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) throw new Error("AI response did not contain valid JSON");
  
  const clean = raw.slice(startIdx, endIdx + 1);
  return JSON.parse(clean);
};

// ── Typewriter effect ──────────────────────────────────────────────────────────
const Typewriter = ({ text, delay = 0, speed = 16 }) => {
  const [out, setOut] = useState('');
  const ref = useRef(0);

  useEffect(() => {
    setOut('');
    ref.current = 0;
    if (!text) return;
    const t = setTimeout(() => {
      const i = setInterval(() => {
        ref.current++;
        setOut(text.slice(0, ref.current));
        if (ref.current >= text.length) clearInterval(i);
      }, speed);
      return () => clearInterval(i);
    }, delay);
    return () => clearTimeout(t);
  }, [text]);

  return <>{out}</>;
};

// ── Suggestion Card ────────────────────────────────────────────────────────────
const SuggestionCard = ({ suggestion, index, onApply, applied }) => {
  const COLORS = ['#a09aff', '#2ed8a0', '#ffb74d'];
  const col = COLORS[index % COLORS.length];

  return (
    <div style={{
      background: applied ? `${col}10` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${applied ? col + '44' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '8px', padding: '12px 14px',
      transition: 'all 0.4s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: col, flex: 1 }}>
          {suggestion.action}
        </div>
        <button
          onClick={() => onApply(suggestion)}
          disabled={applied}
          style={{
            padding: '3px 10px', borderRadius: '4px', fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.07em', cursor: applied ? 'default' : 'pointer',
            border: `1px solid ${col}55`, background: applied ? `${col}22` : 'transparent',
            color: applied ? col : 'rgba(200,200,224,0.5)', fontFamily: 'inherit',
            transition: 'all 0.3s', marginLeft: '10px', flexShrink: 0,
          }}
        >
          {applied ? '✓ APPLIED' : 'APPLY FIX'}
        </button>
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(220,220,240,0.55)', marginBottom: '5px' }}>
        <span style={{ color, fontWeight: 600 }}>Impact: </span>{suggestion.impact}
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(220,220,240,0.45)', lineHeight: 1.6 }}>
        {suggestion.implementation}
      </div>
    </div>
  );
};

// ── Main Panel ─────────────────────────────────────────────────────────────────
const AIInsightPanel = () => {
  const { scorecard, session, applySuggestion, addXP } = useEquiLens();

  const [status, setStatus] = useState('idle');   // idle | loading | done | error | no-key
  const [insights, setInsights] = useState(null);
  const [applied, setApplied] = useState({});
  const prevFairness = useRef(null);

  const hasKey  = !!OPENROUTER_KEY && !OPENROUTER_KEY.includes('your_openrouter');
  // Only require the file to have been uploaded — fairness_score CAN be 0
  const hasData = session.uploaded && session.session_id;

  const runAnalysis = async () => {
    if (!hasKey) { setStatus('no-key'); return; }
    if (!hasData) return;
    setStatus('loading');
    setInsights(null);
    setApplied({});
    try {
      const result = await callOpenRouter(scorecard);
      setInsights(result);
      setStatus('done');
      addXP(30);
    } catch (err) {
      console.error('[AI Insight]', err);
      setStatus('error');
    }
  };

  // Auto-run when a new dataset is uploaded (session_id changes)
  useEffect(() => {
    if (hasData && session.session_id !== prevFairness.current) {
      prevFairness.current = session.session_id;
      runAnalysis();
    }
  }, [session.session_id, session.uploaded]);

  const handleApply = (suggestion, idx) => {
    applySuggestion(suggestion);
    setApplied(prev => ({ ...prev, [idx]: true }));
  };

  // Status dot color
  const dotColor = { idle: '#444', loading: '#ffb74d', done: '#2ed8a0', error: '#ff7070', 'no-key': '#ffb74d' }[status];

  return (
    <div style={{
      background: 'var(--bg-glass)',
      border: `1px solid ${status === 'done' ? 'rgba(127,119,221,0.25)' : 'var(--border-glass)'}`,
      borderRadius: '10px', padding: '14px 16px',
      transition: 'border-color 0.5s',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', background: dotColor,
            boxShadow: status === 'done' ? '0 0 8px #2ed8a066' : 'none',
            animation: status === 'loading' ? 'ai-pulse 1s infinite' : 'none',
          }} />
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.13em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            AI Fairness Insights
          </span>
          {status === 'done' && (
            <span style={{ fontSize: '9px', color: 'rgba(127,119,221,0.55)' }}>· Llama 3.3 70B</span>
          )}
        </div>
        <button
          onClick={runAnalysis}
          disabled={status === 'loading' || !hasData}
          style={{
            padding: '3px 10px', borderRadius: '5px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
            cursor: (status === 'loading' || !hasData) ? 'not-allowed' : 'pointer',
            border: '1px solid rgba(127,119,221,0.3)', background: 'rgba(127,119,221,0.08)',
            color: '#a09aff', fontFamily: 'inherit', transition: 'all 0.2s',
            opacity: (status === 'loading' || !hasData) ? 0.4 : 1,
          }}
        >
          {status === 'loading' ? '⟳ ANALYZING' : '⟳ REFRESH'}
        </button>
      </div>

      {/* ── No key ── */}
      {status === 'no-key' && (
        <div style={{ fontSize: '10px', color: '#ffb74d', background: 'rgba(239,159,39,0.08)', border: '1px solid rgba(239,159,39,0.18)', borderRadius: '7px', padding: '10px 12px' }}>
          ⚠ Add <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 3 }}>VITE_OPENROUTER_API_KEY</code> to your <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 3 }}>.env</code> file and restart Vite.
        </div>
      )}

      {/* ── No data ── */}
      {(status === 'idle') && !hasData && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(200,200,224,0.22)', fontSize: '11px' }}>
          Upload a CSV to generate AI-powered insights
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {['DIAGNOSIS', 'CAUSE', 'SUGGESTIONS'].map(label => (
            <div key={label} style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(127,119,221,0.04)', border: '1px solid rgba(127,119,221,0.1)', animation: 'ai-shimmer 1.6s ease-in-out infinite' }}>
              <div style={{ fontSize: '9px', color: 'rgba(160,154,255,0.3)', fontWeight: 800, letterSpacing: '0.12em', marginBottom: 8 }}>{label}</div>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 6, width: '88%' }} />
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)', width: '65%' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {status === 'error' && (
        <div style={{ fontSize: '11px', color: '#ff7070', background: 'rgba(226,75,74,0.07)', border: '1px solid rgba(226,75,74,0.18)', borderRadius: '7px', padding: '10px 12px', textAlign: 'center' }}>
          AI analysis failed — check console for details.{' '}
          <span onClick={runAnalysis} style={{ cursor: 'pointer', textDecoration: 'underline', color: '#ff9090' }}>Retry</span>
        </div>
      )}

      {/* ── Results ── */}
      {status === 'done' && insights && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Diagnosis */}
          <div style={{ padding: '11px 13px', borderRadius: '7px', background: 'rgba(226,75,74,0.06)', border: '1px solid rgba(226,75,74,0.15)' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: '#ff7070', marginBottom: 7 }}>◎ DIAGNOSIS</div>
            <div style={{ fontSize: '11px', lineHeight: 1.7, color: 'rgba(220,220,240,0.75)' }}>
              <Typewriter text={insights.diagnosis} delay={0} />
            </div>
          </div>

          {/* Cause */}
          <div style={{ padding: '11px 13px', borderRadius: '7px', background: 'rgba(239,159,39,0.06)', border: '1px solid rgba(239,159,39,0.15)' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: '#ffb74d', marginBottom: 7 }}>◈ CAUSE</div>
            <div style={{ fontSize: '11px', lineHeight: 1.7, color: 'rgba(220,220,240,0.75)' }}>
              <Typewriter text={insights.cause} delay={500} />
            </div>
          </div>

          {/* Suggestions */}
          {(insights.suggestions || []).length > 0 && (
            <div>
              <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: '#2ed8a0', marginBottom: '8px' }}>★ SUGGESTIONS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {insights.suggestions.map((s, i) => (
                  <SuggestionCard
                    key={i}
                    suggestion={s}
                    index={i}
                    applied={!!applied[i]}
                    onApply={(sg) => handleApply(sg, i)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes ai-pulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes ai-shimmer { 0%,100%{opacity:0.6} 50%{opacity:1} }
      `}</style>
    </div>
  );
};

export default AIInsightPanel;
