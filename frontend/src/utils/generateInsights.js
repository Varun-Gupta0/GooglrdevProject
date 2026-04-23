/**
 * EquiLens — Deterministic AI Insight Engine v3
 * ─────────────────────────────────────────────────────────────────────────────
 * 100% deterministic. Adds:
 *   • mechanism field on every action ("Why this works")
 *   • confidence_reason string (human-readable explanation of confidence score)
 *   • preview_impact field (pre-APPLY projected scorecard delta)
 */

// ─── pure helpers ─────────────────────────────────────────────────────────────

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt   = (s = '')    => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const pct   = (v)         => `${Math.round(v)}%`;

const topN = (arr = [], n = 5) =>
  [...arr].sort((a, b) => (b.score ?? b.impact ?? 0) - (a.score ?? a.impact ?? 0)).slice(0, n);

const groupDisparity = (groups = []) => {
  if (groups.length < 2) return 0;
  const vals = groups.map(g => g.fairness ?? 0);
  return Math.max(...vals) - Math.min(...vals);
};

const worstGroup = (groups = []) =>
  [...groups].sort((a, b) => (a.fairness ?? 0) - (b.fairness ?? 0))[0] ?? null;

const bestGroup = (groups = []) =>
  [...groups].sort((a, b) => (b.fairness ?? 0) - (a.fairness ?? 0))[0] ?? null;


// ─── feature → slider map ──────────────────────────────────────────────────────

const FEATURE_SLIDER = {
  gender:     { label: 'Gender Influence',      key: 'gender',  direction: 'lower', targetFn: s => clamp(Math.round(s * 0.28), 5,  35) },
  age:        { label: 'Age Weighting',         key: 'age',     direction: 'lower', targetFn: s => clamp(Math.round(s * 0.28), 5,  35) },
  race:       { label: 'Race Sensitivity',      key: 'race',    direction: 'lower', targetFn: s => clamp(Math.round(s * 0.28), 5,  35) },
  name:       { label: 'Race Sensitivity',      key: 'race',    direction: 'lower', targetFn: s => clamp(Math.round(s * 0.28), 5,  35) },
  experience: { label: 'Feature Balance',       key: 'balance', direction: 'raise', targetFn: s => clamp(Math.round(100 - s * 0.4), 60, 92) },
  balance:    { label: 'Feature Balance',       key: 'balance', direction: 'raise', targetFn: s => clamp(Math.round(100 - s * 0.4), 60, 92) },
  zip:        { label: 'Feature Balance',       key: 'balance', direction: 'raise', targetFn: s => clamp(Math.round(100 - s * 0.4), 60, 92) },
  region:     { label: 'Feature Balance',       key: 'balance', direction: 'raise', targetFn: s => clamp(Math.round(100 - s * 0.4), 60, 92) },
  income:     { label: 'Feature Balance',       key: 'balance', direction: 'raise', targetFn: s => clamp(Math.round(100 - s * 0.4), 60, 92) },
  edu:        { label: 'Feature Balance',       key: 'balance', direction: 'raise', targetFn: s => clamp(Math.round(100 - s * 0.4), 60, 92) },
  thresh:     { label: 'Threshold Calibration', key: 'thresh',  direction: 'raise', targetFn: s => clamp(Math.round(100 - s * 0.35), 58, 88) },
  score:      { label: 'Threshold Calibration', key: 'thresh',  direction: 'raise', targetFn: s => clamp(Math.round(100 - s * 0.35), 58, 88) },
  history:    { label: 'Threshold Calibration', key: 'thresh',  direction: 'raise', targetFn: s => clamp(Math.round(100 - s * 0.35), 58, 88) },
};
const DEFAULT_SLIDER = { label: 'Feature Balance', key: 'balance', direction: 'raise', targetFn: s => clamp(Math.round(100 - s * 0.4), 60, 92) };
const sliderFor = (feature = '') => FEATURE_SLIDER[feature.toLowerCase()] ?? DEFAULT_SLIDER;


// ─── mechanism library ────────────────────────────────────────────────────────
// Deterministic per slider key + direction. Explains the causal mechanism.

const MECHANISMS = {
  gender_lower:  `Reducing the **Gender Influence** weight decreases the feature's contribution to the model's scoring function. Since gender was acting as a proxy discriminator, lowering its weight forces the model to rely on genuinely merit-based signals — improving outcome equity without sacrificing predictive power.`,
  age_lower:     `Reducing **Age Weighting** limits how strongly age drives selection decisions. Age correlates with experience but also encodes generational bias. Decoupling age from the outcome score prevents younger and older candidates from being systematically penalised.`,
  race_lower:    `Lowering **Race Sensitivity** reduces the model's reliance on features correlated with racial identity (names, zip codes, school regions). This breaks the proxy-discrimination chain while retaining genuinely predictive signals.`,
  balance_raise: `Raising **Feature Balance** increases the diversity of training samples across demographic groups. With more balanced representation, the model learns decision boundaries from the full population rather than majority-group patterns — directly reducing disparate impact.`,
  thresh_raise:  `Raising the **Threshold Calibration** widens the acceptance band for borderline candidates. In biased models, tight thresholds disproportionately exclude qualified individuals from underrepresented groups who cluster near the decision boundary. A higher threshold acts as an equity floor.`,
  autofix:       `The **Auto-Fix Engine** applies all parameter optimisations simultaneously, minimising the total bias energy function across all five dimensions. By jointly tuning gender, balance, threshold, age, and race parameters to their Pareto-optimal values, it achieves the maximum possible fairness improvement in a single operation.`,
  monitor:       `**Continuous monitoring** detects distributional shift — the phenomenon where model fairness degrades as the real-world population drifts from the training distribution. Regular re-analysis triggers early intervention before bias accumulates to critical levels.`,
};

const mechanismFor = (sliderKey, direction, isAutofix, isMonitor) => {
  if (isAutofix)  return MECHANISMS.autofix;
  if (isMonitor)  return MECHANISMS.monitor;
  return MECHANISMS[`${sliderKey}_${direction}`] ?? MECHANISMS.balance_raise;
};


// ─── severity ─────────────────────────────────────────────────────────────────

export const getSeverity = (score) => {
  if (score < 40) return 'CRITICAL';
  if (score < 60) return 'HIGH';
  if (score < 75) return 'MODERATE';
  return 'LOW';
};


// ─── confidence ───────────────────────────────────────────────────────────────

export const computeConfidence = (fairnessScore, contributors = [], selectionRates = {}, groupFairness = []) => {
  const distFromMid   = Math.abs(fairnessScore - 50);
  const distScore     = Math.round((distFromMid / 50) * 30);                           // 0–30

  const highImpact    = contributors.filter(c => (c.score ?? 0) > 40).length;
  const totalImpact   = contributors.reduce((acc, c) => acc + (c.score ?? 0), 0);
  const avgImpact     = contributors.length ? totalImpact / contributors.length : 0;
  const contribScore  = clamp(Math.round((highImpact * 5) + (avgImpact * 0.35)), 0, 35); // 0–35

  const disparity      = groupDisparity(groupFairness);
  const disparityScore = clamp(Math.round((disparity / 100) * 25), 0, 25);             // 0–25

  const rateVals   = Object.values(selectionRates ?? {}).filter(v => typeof v === 'number');
  const rateSpread = rateVals.length >= 2 ? Math.max(...rateVals) - Math.min(...rateVals) : 0;
  const rateScore  = clamp(Math.round((rateSpread / 100) * 10), 0, 10);               // 0–10

  return clamp(distScore + contribScore + disparityScore + rateScore, 45, 97);
};

/**
 * buildConfidenceReason — returns a human-readable explanation of why the
 * confidence score is at its calculated level, referencing real signal values.
 */
export const buildConfidenceReason = (fairnessScore, contributors = [], selectionRates = {}, groupFairness = []) => {
  const distFromMid   = Math.abs(fairnessScore - 50);
  const disparity     = groupDisparity(groupFairness);
  const highImpact    = contributors.filter(c => (c.score ?? 0) > 40).length;
  const rateVals      = Object.values(selectionRates ?? {}).filter(v => typeof v === 'number');
  const rateSpread    = rateVals.length >= 2
    ? (Math.max(...rateVals) - Math.min(...rateVals)).toFixed(1)
    : null;

  const signals = [];

  if (distFromMid > 30) {
    signals.push(`fairness score is far from neutral (${fairnessScore}/100 vs midpoint 50)`);
  } else if (distFromMid > 15) {
    signals.push(`fairness score deviates moderately from neutral (${fairnessScore}/100)`);
  } else {
    signals.push(`fairness score is near the neutral midpoint (${fairnessScore}/100), creating some ambiguity`);
  }

  if (highImpact >= 3) {
    signals.push(`${highImpact} high-impact bias contributors (>40 bias index) detected`);
  } else if (highImpact === 1) {
    signals.push(`1 dominant high-impact bias contributor detected`);
  } else {
    signals.push(`bias contributors show low individual signal strength`);
  }

  if (disparity > 30) {
    signals.push(`large group fairness gap of ${disparity.toFixed(0)} points confirms systemic imbalance`);
  } else if (disparity > 15) {
    signals.push(`moderate ${disparity.toFixed(0)}-point gap across demographic groups`);
  }

  if (rateSpread && parseFloat(rateSpread) > 20) {
    signals.push(`selection rates diverge by ${rateSpread}% across groups`);
  }

  return `Confidence derived from: ${signals.join('; ')}.`;
};


// ─── diagnosis ────────────────────────────────────────────────────────────────

const buildDiagnosis = (score, severity, topFeature, disparity, wg, bg) => {
  const top   = fmt(topFeature);
  const disp  = disparity.toFixed(0);
  const wName = wg?.name ?? 'a minority group';
  const wVal  = wg?.fairness != null ? `${wg.fairness}%` : 'significantly lower';
  const bVal  = bg?.fairness != null ? `${bg.fairness}%` : 'higher';

  if (severity === 'CRITICAL') {
    return `The model exhibits severe, systemic bias (fairness score: ${score}/100). **${top}** is the dominant discriminatory driver, creating a ${disp}-point disparity gap where **${wName}** receives only ${wVal} fairness vs. ${bVal} for the best-treated group. This level of bias fails EU AI Act Article 10 compliance thresholds and must be remediated before deployment.`;
  }
  if (severity === 'HIGH') {
    return `Significant bias detected — fairness score ${score}/100. **${top}** is over-represented in the model's decision surface, producing a ${disp}-point fairness gap between demographic groups (worst: ${wName} at ${wVal}). This may constitute indirect discrimination under GDPR Article 22 and warrants immediate corrective action.`;
  }
  if (severity === 'MODERATE') {
    return `Moderate bias present — fairness score ${score}/100. **${top}** introduces a ${disp}-point disparity that, while below critical thresholds, will compound over large-scale deployment. The model is not yet compliant with standard 80%-rule parity requirements for the **${wName}** group (${wVal} fairness).`;
  }
  return `The model operates within acceptable fairness bounds — score ${score}/100. Residual **${top}** influence creates a minor ${disp}-point disparity (${wName}: ${wVal} vs. ${bVal}), which is within normal statistical variation. Continued monitoring is recommended to prevent regression.`;
};


// ─── cause ────────────────────────────────────────────────────────────────────

const buildCause = (severity, top2, selectionRates) => {
  const names   = top2.map(c => `**${fmt(c.feature)}** (bias index: ${c.score ?? 0}/100)`).join(' and ');
  const rateVals = Object.values(selectionRates ?? {}).filter(v => typeof v === 'number');
  const rateMin  = rateVals.length ? Math.min(...rateVals).toFixed(1) : null;
  const rateMax  = rateVals.length ? Math.max(...rateVals).toFixed(1) : null;
  const rateNote = (rateMin && rateMax && rateMin !== rateMax)
    ? ` Selection rates diverge from ${rateMin}% to ${rateMax}% across groups.`
    : '';

  if (severity === 'CRITICAL') {
    return `Root cause: ${names} are leaking protected-group identity into the model's decision boundary — a classic proxy discrimination pattern. The training data has encoded historical inequalities directly into feature correlations.${rateNote} The model has learned that these features are "safe" proxies for protected attributes, making it statistically efficient but ethically discriminatory.`;
  }
  if (severity === 'HIGH') {
    return `The disparity originates from ${names} carrying residual correlation with protected demographic groups.${rateNote} Insufficient fairness constraints during training allowed the model to exploit these proxy signals. Without debiasing, this pattern will persist and amplify at deployment scale.`;
  }
  if (severity === 'MODERATE') {
    return `Moderate correlation between ${names} and protected group membership is the underlying driver.${rateNote} This is typically caused by class imbalance in the training data rather than intentional discrimination, but the downstream effect on affected groups is real and measurable.`;
  }
  return `Residual correlation in ${names} causes minor fairness drift.${rateNote} This is consistent with natural distributional variance rather than structural bias. A larger, more diverse training dataset would likely eliminate this effect entirely.`;
};


// ─── action builder ───────────────────────────────────────────────────────────

const buildActions = (score, severity, contributors, selectionRates, groupFairness, simulatorParams) => {
  const actions  = [];
  const disparity = groupDisparity(groupFairness);
  const top4      = topN(contributors, 4);
  const params    = simulatorParams ?? { gender: 74, balance: 30, thresh: 42, age: 60, race: 70 };

  // Mirrors /api/simulate backend formula exactly
  const projectFairness = (adj) => {
    const m = { ...params, ...adj };
    return clamp(Math.round(100 - (m.gender * 0.4 + (100 - m.balance) * 0.3 + (100 - m.thresh) * 0.2 + m.age * 0.05 + m.race * 0.05)), 5, 95);
  };

  const currentSeverity = getSeverity(score);

  // ── Actions 1 & 2: Top two high-impact features ───────────────────────────
  const highImpact = top4.filter(c => (c.score ?? 0) > 15);

  highImpact.slice(0, 2).forEach((feature, idx) => {
    const impact     = feature.score ?? 0;
    const sl         = sliderFor(feature.feature);
    const before     = params[sl.key];
    const after      = sl.targetFn(impact);
    const projected  = projectFairness({ [sl.key]: after });
    const projSev    = getSeverity(projected);
    const verb       = sl.direction === 'lower' ? 'Reduce' : 'Raise';
    const dir        = sl.direction === 'lower' ? 'down to' : 'up to';
    const gainLow    = Math.max(0, projected - score - 3);
    const gainHigh   = Math.max(0, projected - score + 5);

    actions.push({
      instruction:    `${verb} **${sl.label}** slider ${dir} ${after}%`,
      reason:         `**${fmt(feature.feature)}** carries a bias index of ${impact}/100 — the ${idx === 0 ? 'highest' : 'second-highest'} contributor to unfair outcomes. ${sl.direction === 'lower' ? 'Reducing' : 'Increasing'} its weight directly limits proxy-discrimination influence on model predictions.`,
      mechanism:      mechanismFor(sl.key, sl.direction, false, false),
      before:         pct(before),
      after:          pct(after),
      expected_result:`Fairness: ${score} → ~${projected} (+${gainLow}–${gainHigh} pts)`,
      preview_impact: {
        fairness_before: score,
        fairness_after:  projected,
        severity_before: currentSeverity,
        severity_after:  projSev,
        delta:           projected - score,
      },
      paramAdjustments: { [sl.key]: after },
    });
  });

  // ── Action 3: Group disparity → Feature Balance ───────────────────────────
  if (disparity > 18) {
    const wg        = worstGroup(groupFairness);
    const before    = params.balance;
    const after     = 78;
    const projected = projectFairness({ balance: after });
    const projSev   = getSeverity(projected);

    actions.push({
      instruction:    `Raise **Feature Balance** slider to ${after}%`,
      reason:         `A ${disparity.toFixed(0)}-point fairness gap separates demographic groups — **${wg?.name ?? 'the worst group'}** receives only ${wg?.fairness ?? '?'}% fairness. Raising Feature Balance equalises group sample density in the training distribution.`,
      mechanism:      mechanismFor('balance', 'raise', false, false),
      before:         pct(before),
      after:          pct(after),
      expected_result:`Fairness: ${score} → ~${projected} | Group gap: ${disparity.toFixed(0)}pt → <15pt`,
      preview_impact: {
        fairness_before: score,
        fairness_after:  projected,
        severity_before: currentSeverity,
        severity_after:  projSev,
        delta:           projected - score,
      },
      paramAdjustments: { balance: after },
    });
  }

  // ── Action 4: Threshold calibration (CRITICAL/HIGH only) ─────────────────
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    const before    = params.thresh;
    const after     = 72;
    const projected = projectFairness({ thresh: after });
    const projSev   = getSeverity(projected);

    actions.push({
      instruction:    `Raise **Threshold Calibration** to ${after}%`,
      reason:         `Tight decision thresholds systematically exclude borderline candidates from underrepresented groups. A higher calibration value acts as a fairness floor, ensuring all qualified candidates are evaluated equally regardless of group membership.`,
      mechanism:      mechanismFor('thresh', 'raise', false, false),
      before:         pct(before),
      after:          pct(after),
      expected_result:`Fairness: ${score} → ~${projected} | Selection rates converge across groups`,
      preview_impact: {
        fairness_before: score,
        fairness_after:  projected,
        severity_before: currentSeverity,
        severity_after:  projSev,
        delta:           projected - score,
      },
      paramAdjustments: { thresh: after },
    });
  }

  // ── Action 5: Auto-Fix (compound) ────────────────────────────────────────
  if (severity === 'CRITICAL' || severity === 'HIGH' || actions.length < 2) {
    const AUTOFIX   = { gender: 10, balance: 92, thresh: 82, age: 10, race: 10 };
    const projected = projectFairness(AUTOFIX);
    const projSev   = getSeverity(projected);

    actions.push({
      instruction:    `Run **⚡ AUTO-FIX ENGINE** — apply all optimised parameters`,
      reason:         `Applies the globally optimal parameter configuration simultaneously: Gender: ${params.gender}%→10%, Balance: ${params.balance}%→92%, Threshold: ${params.thresh}%→82%, Age: ${params.age}%→10%, Race: ${params.race}%→10%. Eliminates manual trial-and-error.`,
      mechanism:      mechanismFor(null, null, true, false),
      before:         `Fairness ${score}/100 (${currentSeverity})`,
      after:          `Fairness ~${projected}/100 (${projSev})`,
      expected_result:`All CRITICAL/HIGH flags cleared | Estimated fairness: ~${projected}/100`,
      preview_impact: {
        fairness_before: score,
        fairness_after:  projected,
        severity_before: currentSeverity,
        severity_after:  projSev,
        delta:           projected - score,
      },
      action_type:      'autofix',
      paramAdjustments: AUTOFIX,
    });
  }

  // ── Action 6: Monitoring (LOW/MODERATE) ──────────────────────────────────
  if (severity === 'LOW' || severity === 'MODERATE') {
    actions.push({
      instruction:    `Monitor — re-analyse after every 1,000 new data points`,
      reason:         `Even well-tuned models degrade through distributional shift (data drift). Current fairness score of ${score}/100 should be re-validated periodically to catch regression before it becomes a compliance issue.`,
      mechanism:      mechanismFor(null, null, false, true),
      before:         `Score ${score}/100`,
      after:          `Maintained ≥75/100`,
      expected_result:`Sustained compliance above minimum parity thresholds over time`,
      preview_impact: null,
      paramAdjustments: null,
    });
  }

  // Deduplicate by slider key, cap at 4
  const seen = new Set();
  return actions.filter(a => {
    const k = a.paramAdjustments ? Object.keys(a.paramAdjustments).sort().join(',') : a.instruction.slice(0, 28);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 4);
};


// ─── main export ──────────────────────────────────────────────────────────────

/**
 * generateInsights(data)
 * Returns: { diagnosis, cause, confidence, confidence_reason, severity, actions[] }
 */
const generateInsights = (data = {}) => {
  const {
    fairness_score    = 0,
    bias_contributors = [],
    selection_rates   = {},
    group_fairness    = [],
    simulatorParams   = null,
  } = data;

  const severity          = getSeverity(fairness_score);
  const top               = topN(bias_contributors, 5);
  const topFeature        = top[0]?.feature ?? 'unknown';
  const disparity         = groupDisparity(group_fairness);
  const wg                = worstGroup(group_fairness);
  const bg                = bestGroup(group_fairness);

  const confidence        = computeConfidence(fairness_score, bias_contributors, selection_rates, group_fairness);
  const confidence_reason = buildConfidenceReason(fairness_score, bias_contributors, selection_rates, group_fairness);
  const diagnosis         = buildDiagnosis(fairness_score, severity, topFeature, disparity, wg, bg);
  const cause             = buildCause(severity, top.slice(0, 2), selection_rates);
  const actions           = buildActions(fairness_score, severity, bias_contributors, selection_rates, group_fairness, simulatorParams);

  return { diagnosis, cause, confidence, confidence_reason, severity, actions };
};

export default generateInsights;
