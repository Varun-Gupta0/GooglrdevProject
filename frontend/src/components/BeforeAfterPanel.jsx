import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, AlertTriangle, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

// Animated counter hook
const useCountUp = (target, duration = 1200) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((from + (target - from) * eased).toFixed(1)));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
};

const ScoreCard = ({ label, score, variant }) => {
  const displayScore = useCountUp(score, 1000);

  const styles = {
    before: {
      border: 'border-white/10',
      labelColor: 'text-muted',
      scoreColor: 'text-white/40',
      bg: 'bg-white/[0.02]',
      icon: <AlertTriangle size={16} className="text-state-biased" />,
      barColor: 'var(--state-biased)',
    },
    after: {
      border: 'border-state-fair/30',
      labelColor: 'text-state-fair',
      scoreColor: 'text-state-fair',
      bg: 'bg-state-fair/5',
      icon: <ShieldCheck size={16} className="text-state-fair" />,
      barColor: 'var(--state-fair)',
    },
  };

  const s = styles[variant];

  return (
    <div className={`flex-1 rounded-2xl border p-5 flex flex-col gap-3 ${s.bg} ${s.border}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        {s.icon}
        <span className={`text-[10px] font-black uppercase tracking-widest ${s.labelColor}`}>{label}</span>
      </div>

      {/* Score */}
      <div className={`text-5xl font-black tabular-nums ${s.scoreColor}`}>
        {displayScore}<span className="text-xl">%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-glass rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-[1200ms] ease-out"
          style={{ width: `${score}%`, backgroundColor: s.barColor }}
        />
      </div>

      {/* Risk badge */}
      <div className={`text-[8px] font-black uppercase tracking-widest ${s.labelColor} opacity-60`}>
        {score < 40 ? '⚠ CRITICAL BIAS' : score <= 70 ? '⚡ BIAS DETECTED' : '✓ WITHIN PARITY'}
      </div>
    </div>
  );
};

const BeforeAfterPanel = ({ before, after, changesApplied }) => {
  const delta = after - before;
  const deltaDisplay = useCountUp(Math.abs(delta), 1200);

  if (before === null || after === null) return null;

  return (
    <div className="glass-panel p-6 border-t-2 border-state-fair">
      {/* Title row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-state-fair" />
          <h3 className="text-[10px] uppercase font-black tracking-widest text-state-fair">Neural Correction Result</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase
          ${delta >= 0 ? 'bg-state-fair/10 text-state-fair border border-state-fair/20' : 'bg-state-biased/10 text-state-biased border border-state-biased/20'}`}>
          <TrendingUp size={10} />
          {delta >= 0 ? '+' : '-'}{deltaDisplay}% {delta >= 0 ? 'Improvement' : 'Regression'}
        </div>
      </div>

      {/* Side-by-side cards */}
      <div className="flex items-stretch gap-4 mb-6">
        <ScoreCard label="Before Autofix" score={before} variant="before" />

        {/* Arrow divider */}
        <div className="flex flex-col items-center justify-center gap-1 px-1 shrink-0">
          <ArrowRight size={20} className="text-accent-blue" />
        </div>

        <ScoreCard label="After Autofix" score={after} variant="after" />
      </div>

      {/* Changes log */}
      {changesApplied && changesApplied.length > 0 && (
        <div>
          <p className="text-[9px] text-muted uppercase font-black mb-2 tracking-widest">Changes Applied</p>
          <ul className="space-y-1.5">
            {changesApplied.map((change, i) => (
              <li key={i} className="text-[10px] flex gap-2 items-start text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-state-fair mt-1 shrink-0" />
                {change}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BeforeAfterPanel;
