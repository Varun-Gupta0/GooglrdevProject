import React from 'react';
import useEquiLens from '../store/useEquiLens';

const STEPS = [
  { id: 1, label: 'Upload Dataset',  icon: '↑',  shortLabel: 'Upload'  },
  { id: 2, label: 'Analyze Bias',    icon: '⬡',  shortLabel: 'Analyze' },
  { id: 3, label: 'Review Issues',   icon: '◎',  shortLabel: 'Review'  },
  { id: 4, label: 'Apply Fixes',     icon: '⚙',  shortLabel: 'Fix'     },
  { id: 5, label: 'Export Report',   icon: '↓',  shortLabel: 'Export'  },
];

const StepProgressBar = () => {
  const { currentStep, setStep, session, enterpriseMode } = useEquiLens();

  const canNav = (id) => id === 1 || (session.uploaded && id <= currentStep);

  return (
    <div className="step-bar">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        width: '100%',
        maxWidth: 860,
      }}>
        {STEPS.map((step, idx) => {
          const isActive    = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isClickable = canNav(step.id);
          const isBlocked   = !session.uploaded && step.id > 1;

          const activeCol  = 'var(--step-active-col)';
          const doneCol    = 'var(--step-done-col)';
          const idleCol    = 'var(--step-idle-col)';
          const circleCol  = isActive ? activeCol : isCompleted ? doneCol : idleCol;
          const labelCol   = isActive
            ? (enterpriseMode ? 'var(--text-primary)' : '#fff')
            : isCompleted
              ? doneCol
              : idleCol;

          return (
            <React.Fragment key={step.id}>
              {/* Step Node */}
              <div
                onClick={() => isClickable && setStep(step.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  cursor: isClickable ? 'pointer' : isBlocked ? 'not-allowed' : 'default',
                  flex: 1,
                  opacity: isBlocked ? 0.38 : 1,
                  transition: 'opacity 0.3s',
                  padding: '0 4px',
                  position: 'relative',
                }}
              >
                {/* Circle */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isCompleted ? 14 : 13,
                  fontWeight: 800,
                  border: `2px solid ${circleCol}`,
                  background: isActive
                    ? (enterpriseMode ? activeCol : 'rgba(139,92,246,0.18)')
                    : isCompleted
                      ? (enterpriseMode ? doneCol : 'rgba(46,216,160,0.12)')
                      : 'transparent',
                  color: isActive
                    ? (enterpriseMode ? '#fff' : activeCol)
                    : circleCol,
                  transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: isActive
                    ? `0 0 14px ${activeCol}55`
                    : 'none',
                  flexShrink: 0,
                }}>
                  {isCompleted ? '✓' : step.icon}
                </div>

                {/* Label */}
                <div style={{
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  color: labelCol,
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.3s',
                  textAlign: 'center',
                }}>
                  <span style={{ display: 'none' }}>{step.label}</span>
                  <span>{window.innerWidth < 700 ? step.shortLabel : step.label}</span>
                </div>
              </div>

              {/* Connector Line */}
              {idx < STEPS.length - 1 && (
                <div style={{
                  flex: '0 0 24px',
                  height: 2,
                  borderRadius: 2,
                  background: currentStep > step.id
                    ? doneCol
                    : `var(--border-glass)`,
                  marginBottom: 20,
                  transition: 'background 0.5s',
                  flexShrink: 0,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Next Step CTA (only when there's a blocked next step) */}
      {!session.uploaded && currentStep === 1 && (
        <div style={{
          position: 'absolute',
          right: 20,
          fontSize: 11,
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}>
          Upload a dataset to continue →
        </div>
      )}
    </div>
  );
};

export default StepProgressBar;
