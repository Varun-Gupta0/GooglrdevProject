/**
 * ExportReportModule.jsx
 * Step 5 — Final output: generates a JSON compliance report and offers
 * Download JSON + Download PDF (print) options.
 */

import React, { useState } from 'react';
import useEquiLens from '../store/useEquiLens';

const REGS = [
  { id: 'GDPR_Art_22',  name: 'GDPR Art. 22',  threshold: 75 },
  { id: 'EU_AI_Act',    name: 'EU AI Act',      threshold: 75 },
  { id: 'US_EO_13985',  name: 'US EO 13985',    threshold: 50 },
];

const fc = (f) => f >= 75 ? '#2ed8a0' : f >= 50 ? '#ffb74d' : '#ff7070';

const buildReport = ({ scorecard, baselineFairness, session, actionHistory, xp }) => {
  const f = scorecard.fairness_score;
  const compliance = {};
  REGS.forEach(r => {
    compliance[r.id] = {
      name:      r.name,
      status:    f >= r.threshold ? 'PASS' : 'FAIL',
      threshold: r.threshold,
      achieved:  f,
    };
  });

  const allPass = REGS.every(r => f >= r.threshold);

  return {
    report_id:        `EQL-${Date.now().toString(36).toUpperCase()}`,
    report_version:   '2.0',
    platform:         'EquiLens AI Compliance Platform',
    generated_at:     new Date().toISOString(),
    dataset_summary: {
      target_column:       session.target_col   || 'hired',
      protected_attributes: session.protected_attrs || ['gender','age'],
      model_type:          'RandomForest',
      features:            session.columns?.length || 'N/A',
    },
    bias_analysis: {
      initial_fairness_score: baselineFairness,
      final_fairness_score:   f,
      improvement:            f - baselineFairness,
      bias_index:             scorecard.bias_index,
      accuracy:               scorecard.accuracy,
      stability:              scorecard.stability,
      risk_level:             f >= 75 ? 'LOW' : f >= 50 ? 'HIGH' : 'CRITICAL',
    },
    key_biased_features: (scorecard.bias_contributors || []).slice(0, 8).map(c => ({
      feature:  c.feature,
      bias_score: c.score,
      severity: c.severity || (c.score > 60 ? 'CRITICAL' : c.score > 35 ? 'HIGH' : 'MODERATE'),
    })),
    group_fairness: scorecard.group_fairness || [],
    actions_applied: actionHistory.map(a => ({
      action:        a.instruction,
      before:        a.before,
      after:         a.after,
      expected_impact: a.expected_result,
      fairness_delta: (a.fairnessAfter || 0) - (a.fairnessBefore || 0),
      timestamp:     a.ts,
    })),
    compliance_status:  compliance,
    overall_compliance: allPass ? 'COMPLIANT' : f >= 50 ? 'PARTIALLY_COMPLIANT' : 'NON_COMPLIANT',
    compliance_score:   f,
    maturity_level:     xp.level_name,
    recommendation: allPass
      ? 'This AI system meets all reviewed fairness and regulatory standards. It is approved for deployment subject to ongoing monitoring.'
      : 'This AI system does not yet meet all regulatory thresholds. Apply the recommended actions in the Fixes step and re-evaluate before deployment.',
  };
};

const ExportReportModule = () => {
  const { baselineFairness, session, actionHistory, xp } = useEquiLens();
  const scorecard = useEquiLens(state => state.scorecard);
  const fairnessScore = useEquiLens(state => state.scorecard.fairness_score);
  const [downloaded, setDownloaded] = useState(false);
  const f = fairnessScore;

  const report = buildReport({ scorecard, baselineFairness, session, actionHistory, xp });
  const allPass = report.overall_compliance === 'COMPLIANT';
  const overallColor = allPass ? '#2ed8a0' : f >= 50 ? '#ffb74d' : '#ff7070';

  const downloadJSON = () => {
    try {
      const json    = JSON.stringify(report, null, 2);
      const blob    = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url     = URL.createObjectURL(blob);
      const a       = document.createElement('a');
      a.href        = url;
      a.download    = `equilens-report-${report.report_id}.json`;
      a.rel         = 'noopener';
      // Must be in DOM for Firefox/Safari
      document.body.appendChild(a);
      a.click();
      // Cleanup after browser picks up the click
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
      setDownloaded(true);
    } catch (err) {
      console.error('[ExportReport] JSON download failed:', err);
      alert('Download failed. Please try right-clicking and saving manually.');
    }
  };

  const downloadCSV = () => {
    try {
      const rows = [
        ['Report ID', report.report_id],
        ['Generated', report.generated_at],
        ['Platform',  report.platform],
        [''],
        ['Metric', 'Value'],
        ['Initial Fairness Score', report.bias_analysis.initial_fairness_score],
        ['Final Fairness Score',   report.bias_analysis.final_fairness_score],
        ['Improvement',            report.bias_analysis.improvement],
        ['Bias Index',             report.bias_analysis.bias_index],
        ['Risk Level',             report.bias_analysis.risk_level],
        ['Overall Compliance',     report.overall_compliance],
        [''],
        ['Feature', 'Bias Score', 'Severity'],
        ...(report.key_biased_features || []).map(f => [f.feature, f.bias_score, f.severity]),
        [''],
        ['Regulation', 'Status', 'Required', 'Achieved'],
        ...Object.values(report.compliance_status || {}).map(r => [r.name, r.status, r.threshold, r.achieved]),
      ];
      const csv  = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `equilens-report-${report.report_id}.csv`;
      a.rel      = 'noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    } catch (err) {
      console.error('[ExportReport] CSV download failed:', err);
    }
  };

  const downloadPDF = () => window.print();


  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Header ── */}
      <div>
        <div className="section-title">Compliance Report</div>
        <div className="section-sub">Review and export your AI fairness audit report</div>
      </div>

      {/* ── Overall Status Card ── */}
      <div style={{
        padding:'24px 28px', borderRadius:14,
        background:`${overallColor}08`,
        border:`2px solid ${overallColor}35`,
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:20, flexWrap:'wrap',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:18 }}>
          <div style={{
            width:64, height:64, borderRadius:'50%', flexShrink:0,
            background:`${overallColor}14`, border:`3px solid ${overallColor}44`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:28, fontWeight:900, color:overallColor,
          }}>{f}</div>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:overallColor, marginBottom:2 }}>
              {report.overall_compliance.replace('_', ' ')}
            </div>
            <div style={{ fontSize:13, color:'var(--text-secondary)' }}>
              {allPass ? 'This system meets all reviewed regulatory thresholds.' : 'One or more regulatory thresholds are not met.'}
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
              Report ID: {report.report_id} · Generated: {new Date(report.generated_at).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Download buttons */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'stretch', minWidth:200 }}>
          {/* JSON */}
          <button onClick={downloadJSON}
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              padding:'11px 22px', borderRadius:9, fontSize:14, fontWeight:700,
              fontFamily:'inherit', cursor:'pointer', border:'none',
              background: downloaded ? 'rgba(46,216,160,0.18)' : 'var(--accent-purple)',
              color: downloaded ? '#2ed8a0' : '#fff', transition:'all 0.25s',
              boxShadow:'0 2px 12px rgba(0,0,0,0.2)',
            }}>
            {downloaded ? '✓ JSON Downloaded' : '↓ Download JSON'}
          </button>
          {/* CSV */}
          <button onClick={downloadCSV}
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              padding:'9px 22px', borderRadius:9, fontSize:13, fontWeight:700,
              fontFamily:'inherit', cursor:'pointer',
              background:'rgba(46,216,160,0.08)', border:'1px solid rgba(46,216,160,0.25)',
              color:'#2ed8a0', transition:'all 0.2s',
            }}>
            ↓ Download CSV
          </button>
          {/* PDF */}
          <button onClick={downloadPDF}
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              padding:'9px 22px', borderRadius:9, fontSize:13, fontWeight:700,
              fontFamily:'inherit', cursor:'pointer',
              background:'var(--bg-glass)', border:'1px solid var(--border-glass)',
              color:'var(--text-secondary)', transition:'all 0.2s',
            }}>
            ⎙ Print / Save PDF
          </button>
        </div>
      </div>

      {/* ── Regulation Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12 }}>
        {REGS.map(reg => {
          const pass = f >= reg.threshold;
          const col  = pass ? '#2ed8a0' : '#ff7070';
          return (
            <div key={reg.id} className="card">
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>{reg.name}</div>
              <div style={{ fontSize:28, fontWeight:900, color:col, marginBottom:4 }}>{pass ? 'PASS' : 'FAIL'}</div>
              <div style={{ height:4, background:'var(--bg-glass)', borderRadius:2, overflow:'hidden', marginBottom:6 }}>
                <div style={{ height:'100%', width:`${f}%`, background:col, borderRadius:2, transition:'width 0.6s' }} />
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                Required: {reg.threshold}  ·  Achieved: {f}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Before / After ── */}
      <div className="card">
        <div className="card-label">Fairness Improvement Summary</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:16, alignItems:'center' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>INITIAL SCORE</div>
            <div style={{ fontSize:36, fontWeight:900, color:fc(baselineFairness) }}>{baselineFairness}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{baselineFairness >= 75 ? 'FAIR' : baselineFairness >= 50 ? 'MODERATE' : 'BIASED'}</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:24, color: f > baselineFairness ? '#2ed8a0' : '#ff7070' }}>{f > baselineFairness ? '→' : '↓'}</div>
            <div style={{ fontSize:14, fontWeight:800, color: f > baselineFairness ? '#2ed8a0' : '#ff7070' }}>
              {f > baselineFairness ? '+' : ''}{f - baselineFairness} pts
            </div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>FINAL SCORE</div>
            <div style={{ fontSize:36, fontWeight:900, color:fc(f) }}>{f}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{f >= 75 ? 'FAIR' : f >= 50 ? 'MODERATE' : 'BIASED'}</div>
          </div>
        </div>
      </div>

      {/* ── Actions Applied ── */}
      {actionHistory.length > 0 && (
        <div className="card">
          <div className="card-label">Actions Applied ({actionHistory.length})</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {actionHistory.map((a, i) => (
              <div key={a.id} style={{
                display:'flex', alignItems:'flex-start', gap:10, padding:'8px 10px', borderRadius:8,
                background:'var(--bg-glass)', border:'1px solid var(--border-glass)',
              }}>
                <div style={{
                  flexShrink:0, width:22, height:22, borderRadius:5, background:'rgba(139,92,246,0.12)',
                  border:'1px solid rgba(139,92,246,0.25)', display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:10, fontWeight:800, color:'var(--accent-purple)',
                }}>{i+1}</div>
                <div style={{ flex:1, fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}
                  dangerouslySetInnerHTML={{ __html:(a.instruction||'').replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--text-primary)">$1</strong>') }}
                />
                {a.fairnessBefore !== undefined && a.fairnessAfter !== undefined && (
                  <div style={{ flexShrink:0, fontSize:11, fontWeight:700, color: a.fairnessAfter > a.fairnessBefore ? '#2ed8a0' : '#ff7070' }}>
                    {a.fairnessAfter > a.fairnessBefore ? '+' : ''}{(a.fairnessAfter||0) - (a.fairnessBefore||0)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Key Biased Features ── */}
      {scorecard.bias_contributors?.length > 0 && (
        <div className="card">
          <div className="card-label">Key Biased Features</div>
          <table className="ent-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Bias Score</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scorecard.bias_contributors.slice(0, 8).map((c, i) => {
                const sev = c.score > 60 ? 'CRITICAL' : c.score > 40 ? 'HIGH' : c.score > 20 ? 'MODERATE' : 'LOW';
                const col = c.score > 60 ? '#ff7070' : c.score > 40 ? '#ffb74d' : '#a09aff';
                return (
                  <tr key={i}>
                    <td style={{ fontWeight:600 }}>{c.feature}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, maxWidth:100, height:6, background:'var(--bg-glass)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${c.score}%`, background:col, borderRadius:3 }} />
                        </div>
                        <span style={{ fontWeight:700, color:col, fontSize:12 }}>{c.score}%</span>
                      </div>
                    </td>
                    <td><span className={`badge badge-${sev==='CRITICAL'||sev==='HIGH'?'fail':sev==='MODERATE'?'warn':'pass'}`}>{sev}</span></td>
                    <td style={{ fontSize:11, color:'var(--text-muted)' }}>{c.score <= 20 ? 'Acceptable' : 'Requires Attention'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Recommendation ── */}
      <div className="card" style={{ borderColor: `${overallColor}30`, background:`${overallColor}05` }}>
        <div className="card-label">Auditor Recommendation</div>
        <div style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.75 }}>{report.recommendation}</div>
      </div>
    </div>
  );
};

export default ExportReportModule;
