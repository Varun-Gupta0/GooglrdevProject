import React, { Suspense } from 'react';
import GroupFairnessChart from './GroupFairnessChart';
import IntersectionMatrix from './IntersectionMatrix';
import AIInsightPanel from './AIInsightPanel';

const NeuralMesh = React.lazy(() => import('./NeuralMesh'));

const cd = (children, style = {}) => (
  <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '14px 16px', ...style }}>
    {children}
  </div>
);

const cdLbl = (text) => (
  <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.13em', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
    {text}
  </div>
);

const AnalysisPanel = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {cd(
        <>
          {cdLbl('3D Neural Bias Network — Drag to Orbit · Nodes Pulse with Bias Intensity')}
          <Suspense fallback={<div style={{ height: 255, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}>INITIALIZING NEURAL MESH...</div>}>
            <NeuralMesh />
          </Suspense>
        </>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
        {cd(
          <>
            {cdLbl('Live Group Fairness Split')}
            <GroupFairnessChart />
          </>
        )}
        
        {cd(
          <>
            {cdLbl('Intersectionality Matrix')}
            <IntersectionMatrix />
          </>
        )}
      </div>

      <AIInsightPanel />
    </div>
  );
};

export default AnalysisPanel;
