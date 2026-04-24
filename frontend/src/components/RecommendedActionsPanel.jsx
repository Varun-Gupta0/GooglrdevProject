/**
 * RecommendedActionsPanel.jsx
 * PRIMARY decision-making panel for Step 4 (Apply Fixes).
 * Shows top 3–5 AI-generated recommended actions with Apply buttons.
 */

import React, { useState, useEffect, useCallback } from 'react';
import useEquiLens from '../store/useEquiLens';
import generateInsights from '../utils/generateInsights';

const fc = (f) => f >= 75 ? '#2ed8a0' : f >= 50 ? '#ffb74d' : '#ff7070';
const fl = (f) => f >= 75 ? 'COMPLIANT' : f >= 50 ? 'UNDER REVIEW' : 'NON-COMPLIANT';
const COLORS = ['#a09aff', '#ffb74d', '#2ed8a0', '#ff7070', '#60a5fa'];

const ActionCard = ({ action, index, isApplied, onApply, currentFairness }) => {
  const col = COLORS[index % COLORS.length];
  const canApply = !!action.paramAdjustments || action.action_type === 'autofix';
  const adj = action.paramAdjustments ?? {};
  const gD = adj.gender  !== undefined ? (74 - adj.gender)  * 0.4 : 0;
  const bD = adj.balance !== undefined ? (adj.balance - 30) * 0.3 : 0;
  const proj = Math.max(0, Math.min(100, currentFairness + Math.round(gD + bD)));

  return (
    <div className="card animate-fade-in" style={{
      border: `1px solid ${isApplied ? col + '55' : 'var(--card-border)'}`,
      background: isApplied ? `${col}07` : 'var(--card-bg)',
      boxShadow: isApplied ? `0 0 16px ${col}18` : undefined,
      transition: 'all 0.4s',
      animationDelay: `${index * 80}ms`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          flexShrink: 0, width: 32, height: 32, borderRadius: 8,
          background: `${col}18`, border: `1.5px solid ${col}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: col,
        }}>{index + 1}</div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 4 }}
            dangerouslySetInnerHTML={{ __html: (action.instruction||'').replace(/\*\*(.*?)\*\*/g, `<strong style="color:${col}">$1</strong>`) }}
          />
          {action.before && action.after && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'2px 8px', borderRadius:5,
              background:'var(--bg-glass)', border:'1px solid var(--border-glass)', fontSize:12 }}>
              <span style={{ color:'var(--text-muted)', textDecoration:'line-through' }}>{action.before}</span>
              <span style={{ color:'var(--text-muted)' }}>→</span>
              <span style={{ color:col, fontWeight:700 }}>{action.after}</span>
            </span>
          )}
        </div>

        <button onClick={() => !isApplied && canApply && onApply(action)}
          disabled={isApplied || !canApply}
          style={{
            flexShrink:0, padding:'7px 16px', borderRadius:7, fontSize:12, fontWeight:700,
            letterSpacing:'0.04em', fontFamily:'inherit', cursor: (isApplied||!canApply)?'default':'pointer',
            border:`1.5px solid ${col}44`, background: isApplied?`${col}22`:`${col}0f`,
            color:col, opacity:(!canApply&&!isApplied)?0.4:1, transition:'all 0.2s', minWidth:86,
          }}>
          {isApplied ? '✓ Applied' : action.action_type==='autofix' ? '⚡ Run' : 'Apply'}
        </button>
      </div>

      <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.65, marginBottom:10, paddingLeft:44 }}
        dangerouslySetInnerHTML={{ __html: (action.reason||'').replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--text-primary)">$1</strong>') }}
      />

      <div style={{ paddingLeft:44, display:'flex', flexWrap:'wrap', alignItems:'center', gap:8 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:6,
          background:`${col}10`, border:`1px solid ${col}28`, fontSize:12, fontWeight:600, color:col }}>
          ↑ {action.expected_result || 'Improved fairness score'}
        </div>
        {Math.round(gD + bD) !== 0 && !isApplied && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:6,
            background:'var(--bg-glass)', border:'1px solid var(--border-glass)', fontSize:12 }}>
            <span style={{ color:'var(--text-muted)' }}>Score preview:</span>
            <span style={{ fontWeight:700, color:fc(currentFairness) }}>{currentFairness}</span>
            <span style={{ color:'var(--text-muted)' }}>→</span>
            <span style={{ fontWeight:800, color:fc(proj) }}>~{proj}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const RecommendedActionsPanel = () => {
  const { session, simulatorParams, applySuggestion, addXP, pushActionHistory, autoFix, setStep } = useEquiLens();
  const scorecard = useEquiLens(state => state.scorecard);
  const fairnessScore = useEquiLens(state => state.scorecard.fairness_score);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [applied, setApplied]   = useState({});
  const [autoApplied, setAutoApplied] = useState(false);
  const f = fairnessScore;

  const load = useCallback(async () => {
    if (!session.uploaded) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    try {
      const result = generateInsights({ fairness_score: scorecard.fairness_score, bias_contributors: scorecard.bias_contributors, selection_rates: {}, group_fairness: scorecard.group_fairness, simulatorParams });
      setInsights(result);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [session.session_id, scorecard.fairness_score]);

  useEffect(() => { load(); }, [session.session_id]);

  const handleApply = (action, idx) => {
    const before = f;
    applySuggestion(action);
    setApplied(p => ({ ...p, [idx]: true }));
    addXP(80);
    setTimeout(() => pushActionHistory({ instruction: action.instruction, before: action.before, after: action.after, expected_result: action.expected_result, fairnessBefore: before, fairnessAfter: scorecard.fairness_score }), 800);
  };

  const handleAutoFix = () => {
    const before = f;
    autoFix();
    setAutoApplied(true);
    setTimeout(() => pushActionHistory({ instruction: '**Apply All Recommended Fixes** — optimal parameter configuration', before: `Score: ${before}`, after: 'Optimised', expected_result: 'Maximum compliance achieved', fairnessBefore: before, fairnessAfter: scorecard.fairness_score }), 800);
  };

  const actions = (insights?.actions ?? []).slice(0, 5);
  const anyApplied = autoApplied || Object.keys(applied).length > 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <div>
          <div className="section-title">Recommended Actions</div>
          <div className="section-sub">Apply targeted fixes to meet fairness and compliance thresholds</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderRadius:10, background:'var(--card-bg)', border:'1px solid var(--card-border)' }}>
          <div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>Fairness Score</div>
            <div style={{ fontSize:24, fontWeight:800, color:fc(f), lineHeight:1 }}>{f}<span style={{ fontSize:13, color:'var(--text-muted)' }}>/100</span></div>
          </div>
          <div style={{ padding:'4px 10px', borderRadius:6, background:`${fc(f)}12`, border:`1px solid ${fc(f)}30`, fontSize:11, fontWeight:700, color:fc(f) }}>{fl(f)}</div>
        </div>
      </div>

      {!session.uploaded && (
        <div className="card" style={{ textAlign:'center', padding:'48px 24px' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>◎</div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>No Dataset Loaded</div>
          <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>Upload a CSV in Step 1 to generate recommendations</div>
          <button className="btn-primary" onClick={() => setStep(1)} style={{ fontFamily:'inherit' }}>← Go to Upload</button>
        </div>
      )}

      {session.uploaded && (
        <>
          {/* Auto-Fix Banner */}
          <div style={{
            padding:'16px 20px', borderRadius:12,
            background: autoApplied ? 'rgba(46,216,160,0.06)' : 'rgba(139,92,246,0.07)',
            border:`1.5px solid ${autoApplied ? 'rgba(46,216,160,0.3)' : 'rgba(139,92,246,0.25)'}`,
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap',
          }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:3 }}>
                {autoApplied ? '✓ All Recommended Fixes Applied' : '⚡ Apply All Recommended Fixes'}
              </div>
              <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
                {autoApplied ? 'All fairness parameters optimised. Proceed to Step 5 to export your report.' : 'Apply the optimal configuration in one click to achieve maximum compliance.'}
              </div>
            </div>
            <button onClick={handleAutoFix} disabled={autoApplied}
              style={{ flexShrink:0, padding:'10px 22px', borderRadius:8, fontSize:13, fontWeight:700, fontFamily:'inherit', cursor: autoApplied?'default':'pointer',
                background: autoApplied ? 'rgba(46,216,160,0.12)' : 'var(--accent-purple)', color: autoApplied ? '#2ed8a0' : '#fff',
                border:'none', opacity: autoApplied ? 0.85 : 1, transition:'all 0.2s' }}>
              {autoApplied ? 'Applied ✓' : 'Apply All'}
            </button>
          </div>

          {loading && [1,2,3].map(i=>(
            <div key={i} className="card" style={{ height:110, animation:'shimmer 1.5s ease-in-out infinite', opacity:0.6 }} />
          ))}

          {!loading && actions.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Or apply individual fixes:</div>
              {actions.map((action, i) => (
                <ActionCard key={i} action={action} index={i} isApplied={!!applied[i] || autoApplied} onApply={(a) => handleApply(a, i)} currentFairness={f} />
              ))}
            </div>
          )}

          {anyApplied && (
            <div className="animate-fade-in" style={{
              padding:'14px 18px', borderRadius:10,
              background:'rgba(46,216,160,0.06)', border:'1px solid rgba(46,216,160,0.25)',
              display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap',
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#2ed8a0' }}>Fixes Applied — Ready to Export</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)' }}>Proceed to generate your compliance report</div>
              </div>
              <button className="btn-primary" onClick={() => setStep(5)} style={{ fontFamily:'inherit', background:'var(--state-fair)', color:'#fff', border:'none' }}>
                Export Report →
              </button>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:0.9}}`}</style>
    </div>
  );
};

export default RecommendedActionsPanel;
