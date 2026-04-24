import { create } from 'zustand';

// ── Empty scorecard before upload ────────────────────────────────────────────
const DEFAULT_SCORECARD = {
  fairness_score: 0,
  accuracy: 0,
  bias_index: 0,
  stability: 0,
  risk_level: 'UNKNOWN',
  state: 'NOT LOADED',
  bias_contributors: [],
  group_fairness: [],
  intersectionality: null,
};

const DEFAULT_PARAMS = { gender: 74, balance: 30, thresh: 42, age: 60, race: 70 };

const useEquiLens = create((set, get) => ({
  // ── Session ───────────────────────────────────────────────────────────────
  session: { session_id: null, uploaded: false, columns: [], target_col: '', protected_attrs: [] },

  // ── Simulator params ──────────────────────────────────────────────────────
  simulatorParams: DEFAULT_PARAMS,

  // ── Scorecard ─────────────────────────────────────────────────────────────
  scorecard: DEFAULT_SCORECARD,
  initial_scorecard: null,
  backend_scorecard: null,

  // ── Navigation ───────────────────────────────────────────────────────────
  activeTab: 'arena',

  // ── XP / gamification ────────────────────────────────────────────────────
  xp: { total: 0, level: 1, level_name: 'Bias Novice', next_level_xp: 100, badges: [] },

  // ── UI state ──────────────────────────────────────────────────────────────
  isLoading: false,
  error: null,
  baselineFairness: 0,

  // ── Helix mini-game ───────────────────────────────────────────────────────
  helix: { total: 20, infected: 13, fixed: 0 },

  // ── Action history ────────────────────────────────────────────────────────
  // Each entry: { id, instruction, before, after, expected_result, fairnessBefore, fairnessAfter, ts }
  actionHistory: [],

  // ── ACTIONS ───────────────────────────────────────────────────────────────

  setActiveTab: (tab) => set({ activeTab: tab }),

  pushActionHistory: (entry) => set((state) => ({
    actionHistory: [
      ...state.actionHistory,
      { ...entry, id: Date.now(), ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
    ],
  })),

  clearActionHistory: () => set({ actionHistory: [] }),

  /** Slider change → hits /api/simulate for real scorecard */
  setSimulatorParams: async (params) => {
    const newParams = { ...get().simulatorParams, ...params };
    set({ simulatorParams: newParams });
    try {
      const fd = new FormData();
      Object.entries(newParams).forEach(([k, v]) => fd.append(k, v));
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/simulate`, { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          scorecard: {
            ...state.scorecard,
            fairness_score: data.overall_fairness_score ?? state.scorecard.fairness_score,
            accuracy:       data.accuracy_proxy         ?? state.scorecard.accuracy,
            bias_index:     data.bias_index             ?? state.scorecard.bias_index,
            stability:      data.stability_index        ?? state.scorecard.stability,
            risk_level:     data.overall_fairness_score >= 75 ? 'LOW' : data.overall_fairness_score >= 50 ? 'HIGH' : 'CRITICAL',
            state:          data.overall_fairness_score >= 75 ? 'FAIR' : data.overall_fairness_score >= 50 ? 'MODERATE' : 'BIASED',
            bias_contributors: data.bias_contributors   ?? state.scorecard.bias_contributors,
            group_fairness:    data.group_fairness      ?? state.scorecard.group_fairness,
          }
        }));
      }
    } catch (e) { console.error('[simulate]', e); }
  },

  resetParams: () => {
    set({ simulatorParams: DEFAULT_PARAMS });
    get().setSimulatorParams(DEFAULT_PARAMS);
  },

  autoFix: () => {
    const TARGET = { gender: 10, balance: 92, thresh: 82, age: 10, race: 10 };
    set({ simulatorParams: TARGET });
    get().setSimulatorParams(TARGET);
    get().addXP(500);
  },

  setFairnessOverride: (v) => {
    const scale = (v - 34) / 61;
    const newParams = {
      gender:  Math.max(0, Math.min(100, Math.round(74 - scale * 64))),
      balance: Math.max(0, Math.min(100, Math.round(30 + scale * 60))),
      thresh:  Math.max(0, Math.min(100, Math.round(42 + scale * 38))),
      age:     Math.max(0, Math.min(100, Math.round(60 - scale * 48))),
      race:    Math.max(0, Math.min(100, Math.round(70 - scale * 58))),
    };
    get().setSimulatorParams(newParams);
    if (v > get().baselineFairness + 2) get().addXP(Math.round((v - get().baselineFairness) * 4));
  },

  /**
   * Apply an AI suggestion to the simulator params.
   * The LLM suggestion carries a `paramAdjustments` map e.g. { gender: 15, balance: 80 }.
   * If it's a special action like "autofix", we trigger that instead.
   */
  applySuggestion: (suggestion) => {
    if (suggestion.action_type === 'autofix') {
      get().autoFix();
      return;
    }
    if (suggestion.paramAdjustments) {
      get().setSimulatorParams(suggestion.paramAdjustments);
      get().addXP(100);
    }
  },

  /** Called by UploadSection with the raw API response */
  setSession: (sessionData) => set((state) => ({
    session: { ...state.session, ...sessionData, uploaded: true },
  })),

  /** Maps the /api/upload response shape → internal scorecard */
  setScorecard: (data) => set((state) => {
    const f = data.fairness_score ?? state.scorecard.fairness_score;
    return {
      scorecard: {
        ...state.scorecard,
        fairness_score:    f,
        accuracy:          data.accuracy          ?? state.scorecard.accuracy,
        bias_index:        data.fairness_score !== undefined ? Math.round(100 - f) : state.scorecard.bias_index,
        stability:         data.stability         ?? state.scorecard.stability,
        risk_level:        f >= 75 ? 'LOW' : f >= 50 ? 'HIGH' : 'CRITICAL',
        state:             f >= 75 ? 'FAIR' : f >= 50 ? 'MODERATE' : 'BIASED',
        bias_contributors: data.bias_contributors ?? state.scorecard.bias_contributors,
        group_fairness:    data.group_fairness    ?? state.scorecard.group_fairness,
        intersectionality: data.intersectionality ?? state.scorecard.intersectionality,
      },
      backend_scorecard: data,
    };
  }),

  setInitialScorecard: (data) => set({
    initial_scorecard: {
      fairness_score:    data.fairness_score,
      bias_contributors: data.bias_contributors,
      group_fairness:    data.group_fairness || [],
    },
    baselineFairness: data.fairness_score ?? 0,
  }),

  addXP: (amount) => set((state) => {
    const t = state.xp.total + amount;
    let level = 1, name = 'Bias Novice', next = 100;
    if      (t >= 1000) { level = 5; name = 'AI Sentinel';       next = 2000; }
    else if (t >=  600) { level = 4; name = 'AI Guardian';       next = 1000; }
    else if (t >=  300) { level = 3; name = 'Ethics Advocate';   next = 600;  }
    else if (t >=  100) { level = 2; name = 'Fairness Trainee';  next = 300;  }
    const badges = [...state.xp.badges];
    if (t >= 50  && !badges.includes('First Upload'))      badges.push('First Upload');
    if (t >= 150 && !badges.includes('Fairness Improved')) badges.push('Fairness Improved');
    if (t >= 350 && !badges.includes('Auto-Fixer'))        badges.push('Auto-Fixer');
    if (t >= 800 && !badges.includes('Ethical Hero'))      badges.push('Ethical Hero');
    return { xp: { total: t, level, level_name: name, next_level_xp: next, badges } };
  }),

  fixHelixSphere: () => set((state) => ({
    helix: { ...state.helix, fixed: state.helix.fixed + 1 },
    xp: { ...state.xp, total: state.xp.total + 30 },
  })),

  resetHelix: () => set({ helix: { total: 20, infected: 13, fixed: 0 } }),
  setLoading:  (v) => set({ isLoading: v }),
  setError:    (e) => set({ error: e }),
}));

export default useEquiLens;
