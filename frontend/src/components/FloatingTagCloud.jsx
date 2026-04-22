import React from 'react';

const FloatingTagCloud = ({ contributors }) => {
  if (!contributors || contributors.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[10px] text-muted uppercase font-black tracking-widest animate-pulse">Scanning for Neural DNA...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden min-h-[200px] glass-panel bg-base/20 border-glass/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent)]"></div>
      
      {contributors.map((c, i) => {
        // High bias = Low fairness score.
        // If score < 50, it's high bias (Red).
        // If score >= 50, it's low bias (Green).
        const isHighBias = c.score < 50;
        
        // Size based on bias importance (Low score = High importance)
        const importance = 100 - c.score;
        const fontSize = Math.max(10, Math.min(26, 10 + (importance / 4)));
        const opacity = 0.6 + (importance / 250);
        
        return (
          <div 
            key={i}
            className={`
              absolute px-4 py-2 rounded-xl font-black uppercase tracking-tighter transition-all duration-700 cursor-pointer backdrop-blur-sm border
              ${isHighBias ? 'text-state-biased bg-state-biased/10 border-state-biased/40' : 'text-state-fair bg-state-fair/10 border-state-fair/40'}
            `}
            style={{
              left: `${10 + (i * 30) % 70}%`,
              top: `${15 + (i * 25) % 65}%`,
              fontSize: `${fontSize}px`,
              opacity: opacity,
              animation: `floatDNA ${4 + (i % 3)}s ease-in-out ${i * 0.4}s infinite alternate`,
              boxShadow: `0 0 20px ${isHighBias ? 'rgba(255, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'}`,
              zIndex: Math.round(importance)
            }}
          >
            <div className={`w-2 h-2 rounded-full mr-2 inline-block ${isHighBias ? 'bg-state-biased animate-pulse' : 'bg-state-fair'}`}></div>
            {c.feature}
            <span className="ml-2 text-[0.6em] opacity-40 font-mono">{Math.round(c.score)}%</span>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes floatDNA {
          0% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(-15px) translateX(5px) scale(1.05); }
          100% { transform: translateY(0px) translateX(0px) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default FloatingTagCloud;
