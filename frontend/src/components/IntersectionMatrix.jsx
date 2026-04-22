import React from 'react';
import useEquiLens from '../store/useEquiLens';

const IntersectionMatrix = () => {
  const { scorecard } = useEquiLens();
  const matrix = scorecard.intersectionality;

  if (!matrix) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No intersectional data available.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `auto repeat(${matrix.labels_x.length}, 1fr)`, gap: '4px', fontSize: '10px', marginTop: '12px' }}>
      {/* Top left empty corner */}
      <div />
      
      {/* X-axis labels (e.g. Age groups) */}
      {matrix.labels_x.map(lx => (
        <div key={lx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
          {lx}
        </div>
      ))}
      
      {/* Rows: Y-axis label followed by data cells */}
      {matrix.data.map((row, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', color: 'var(--text-muted)', fontWeight: 600 }}>
            {matrix.labels_y[i]}
          </div>
          {row.map((val, j) => {
            const isFair = val >= 75;
            const isModerate = val >= 50 && val < 75;
            
            const bg = isFair ? 'rgba(46, 216, 160, 0.15)' : isModerate ? 'rgba(239, 159, 39, 0.15)' : 'rgba(226, 75, 74, 0.15)';
            const color = isFair ? '#2ed8a0' : isModerate ? '#ffb74d' : '#ff7070';
            const border = isFair ? '1px solid rgba(46, 216, 160, 0.3)' : isModerate ? '1px solid rgba(239, 159, 39, 0.3)' : '1px solid rgba(226, 75, 74, 0.3)';

            return (
              <div 
                key={j} 
                style={{ 
                  padding: '8px 4px', 
                  borderRadius: '6px', 
                  textAlign: 'center', 
                  fontWeight: 800, 
                  background: bg, 
                  color: color, 
                  border: border,
                  fontSize: '11px', 
                  transition: 'all 0.4s ease',
                  cursor: 'default'
                }}
                title={`${matrix.labels_y[i]} + ${matrix.labels_x[j]}: ${val}%`}
              >
                {val}%
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

export default IntersectionMatrix;
