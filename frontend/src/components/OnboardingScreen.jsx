/**
 * OnboardingScreen.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown on first load (no dataset uploaded).
 * Instantly communicates what EquiLens does and what to do next.
 * Hides all complex dashboards until user takes action.
 */

import React, { useRef, useState } from 'react';
import useEquiLens from '../store/useEquiLens';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── 3-Step visual flow ────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '⬡',
    title: 'Analyze Bias',
    desc: 'Upload your CSV dataset. EquiLens detects bias across gender, age, race and more.',
    color: '#a09aff',
  },
  {
    step: '02',
    icon: '⚙',
    title: 'Apply Fixes',
    desc: 'Review AI-generated recommendations and apply targeted fairness improvements.',
    color: '#ffb74d',
  },
  {
    step: '03',
    icon: '↓',
    title: 'Export Report',
    desc: 'Download a full compliance report covering GDPR, EU AI Act, and US EO 13985.',
    color: '#2ed8a0',
  },
];

// ── Stat pills ────────────────────────────────────────────────────────────────
const STATS = [
  { value: '3',      label: 'Regulations Checked' },
  { value: '<2s',    label: 'Analysis Time' },
  { value: '100%',   label: 'Client-Side Privacy' },
];

// ── Main Component ────────────────────────────────────────────────────────────
const OnboardingScreen = ({ onRunDemo }) => {
  const [dragging, setDragging] = useState(false);
  const isUploading = false; // Status is now managed by UploadSection in the header

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      // Trigger the top button's drop logic or simply simulate a file selection
      // For simplicity, we just trigger the top button click for now, 
      // but drop support usually requires shared state.
      // Since the user just asked to connect the buttons, we'll focus on that.
      document.getElementById('upload-dataset-btn')?.click();
    }
  };



  return (
    <div style={{
      minHeight: 'calc(100vh - 124px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '48px 24px 64px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Background glow (demo mode only) ── */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.12) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 760, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* ── Badge ── */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 999,
          background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
          fontSize: 12, fontWeight: 700, color: 'var(--accent-purple)',
          letterSpacing: '0.04em', marginBottom: 24,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-purple)', display: 'inline-block' }} />
          AI Fairness Compliance Platform
        </div>

        {/* ── Hero Title ── */}
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 52px)',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
          textAlign: 'center',
          lineHeight: 1.1,
          marginBottom: 20,
          maxWidth: 680,
        }}>
          Detect and Fix{' '}
          <span style={{
            background: 'linear-gradient(135deg, #8B5CF6, #60a5fa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Bias in AI Systems
          </span>
        </h1>

        {/* ── Subtitle ── */}
        <p style={{
          fontSize: 17,
          color: 'var(--text-secondary)',
          textAlign: 'center',
          lineHeight: 1.65,
          maxWidth: 520,
          marginBottom: 36,
        }}>
          Upload your dataset to analyze bias, apply targeted fixes, and generate a
          regulatory compliance report in minutes.
        </p>

        {/* ── CTA Buttons ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Primary: Upload */}
          <button
            id="onboarding-upload-btn"
            onClick={() => document.getElementById('upload-dataset-btn')?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            disabled={isUploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 32px',
              borderRadius: 12,
              fontSize: 16, fontWeight: 800, fontFamily: 'inherit',
              cursor: isUploading ? 'wait' : 'pointer',
              border: 'none',
              background: isUploading
                ? 'rgba(139,92,246,0.5)'
                : dragging
                  ? 'rgba(139,92,246,0.9)'
                  : 'linear-gradient(135deg, #6D4AE8, #8B5CF6)',
              color: '#fff',
              boxShadow: '0 4px 24px rgba(139,92,246,0.4)',
              transition: 'all 0.25s',
              transform: dragging ? 'scale(1.03)' : 'scale(1)',
            }}
          >
            <span style={{ fontSize: 18 }}>⬆</span>
            Upload Dataset
          </button>

          {/* Secondary: Demo */}
          <button
            id="onboarding-demo-btn"
            onClick={onRunDemo}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '14px 28px',
              borderRadius: 12,
              fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
              cursor: 'pointer',
              border: '1.5px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-primary)',
              transition: 'all 0.2s',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            <span>🚀</span> Run Live Demo
          </button>
        </div>

        {/* ── Helper text ── */}
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 56 }}>
          Start by uploading your dataset or try the demo — no sign-up required.
        </p>

        {/* ── Stat pills ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 64, flexWrap: 'wrap', justifyContent: 'center' }}>
          {STATS.map(s => (
            <div key={s.label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 20px', borderRadius: 10,
              background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Divider ── */}
        <div style={{ width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-glass)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em' }}>HOW IT WORKS</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-glass)' }} />
        </div>

        {/* ── 3-Step Cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          width: '100%',
          maxWidth: 720,
        }}>
          {HOW_IT_WORKS.map((item, idx) => (
            <div key={idx} style={{
              padding: '24px 20px',
              borderRadius: 14,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              animation: `onb-slidein 0.5s ease both`,
              animationDelay: `${idx * 100}ms`,
            }}>
              {/* Glow accent */}
              <div aria-hidden style={{
                position: 'absolute', top: 0, right: 0,
                width: 80, height: 80, borderRadius: '0 14px 0 80px',
                background: `${item.color}10`,
                pointerEvents: 'none',
              }} />

              {/* Step number */}
              <div style={{
                fontSize: 10, fontWeight: 800, color: item.color,
                letterSpacing: '0.1em', opacity: 0.7,
              }}>STEP {item.step}</div>

              {/* Icon circle */}
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${item.color}14`,
                border: `1.5px solid ${item.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: item.color,
              }}>
                {item.icon}
              </div>

              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Trusted by note ── */}
        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Designed for compliance with</div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['GDPR Art. 22', 'EU AI Act', 'US EO 13985'].map(reg => (
              <span key={reg} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                color: 'var(--text-secondary)',
              }}>{reg}</span>
            ))}
          </div>
        </div>

      </div>

      {/* ── Hidden file input removed (using header uploader) ── */}

      {/* ── Error toast removed (managed by header uploader) ── */}

      <style>{`
        @keyframes onb-spin    { to { transform: rotate(360deg); } }
        @keyframes onb-slidein { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
};

export default OnboardingScreen;
