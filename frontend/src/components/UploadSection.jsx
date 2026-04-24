import React, { useRef, useState } from 'react';
import useEquiLens from '../store/useEquiLens';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const UploadSection = () => {
  const fileRef = useRef(null);
  const [status, setStatus]     = useState('idle');   // idle | uploading | success | error
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { setSession, setScorecard, setInitialScorecard, addXP } = useEquiLens();

  const processFile = async (file) => {
    if (!file) return;

    // Validate CSV
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Only CSV files are supported.');
      return;
    }

    setFileName(file.name);
    setStatus('uploading');
    setErrorMsg('');

    // ── Build FormData ────────────────────────────────────────────────────────
    const fd = new FormData();
    fd.append('file', file);
    fd.append('target_column', 'hired');
    fd.append('protected_attributes', JSON.stringify(['gender', 'age']));

    console.log('[EquiLens Upload] Sending file:', file.name, 'size:', file.size);

    try {
      // ── API call ────────────────────────────────────────────────────────────
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: fd,
        // Do NOT set Content-Type header — browser sets it with correct boundary
      });

      const text = await res.text();

      if (!res.ok) {
        console.error('[EquiLens Upload] HTTP error:', res.status, text);
        throw new Error(`Server error ${res.status}: ${text}`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Backend returned invalid JSON');
      }

      console.log('[EquiLens Upload] Response received:', {
        fairness_score:     data.fairness_score,
        contributors_count: data.bias_contributors?.length,
        group_fairness:     data.group_fairness?.length,
        session_id:         data.session_id,
      });

      // ── Update global state ─────────────────────────────────────────────────
      setSession({
        session_id:      data.session_id,
        target_col:      'hired',
        protected_attrs: ['gender', 'age'],
      });

      // setScorecard maps all keys correctly (see store)
      setScorecard(data);
      setInitialScorecard(data);

      if (data.xp_awarded) addXP(data.xp_awarded);

      console.log('[EquiLens Upload] State updated. fairness_score =', data.fairness_score);

      setStatus('success');
      setTimeout(() => setStatus('idle'), 5000);

    } catch (err) {
      console.error('[EquiLens Upload] Failed:', err.message);
      setErrorMsg(err.message);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 6000);
    }
  };

  const onInputChange  = (e)  => processFile(e.target.files[0]);
  const onDrop         = (e)  => { e.preventDefault(); processFile(e.dataTransfer.files[0]); };
  const onDragOver     = (e)  => e.preventDefault();

  const CFG = {
    idle:      { label: '⬆ UPLOAD DATASET', color: '#a09aff', bg: 'rgba(127,119,221,.15)', border: 'rgba(127,119,221,.3)' },
    uploading: { label: '⟳ ANALYZING...',   color: '#ffb74d', bg: 'rgba(239,159,39,.12)',  border: 'rgba(239,159,39,.35)'  },
    success:   { label: '✓ DATASET LOADED', color: '#2ed8a0', bg: 'rgba(46,216,160,.12)',  border: 'rgba(46,216,160,.35)'  },
    error:     { label: '⚠ FAILED — RETRY', color: '#ff7070', bg: 'rgba(226,75,74,.12)',   border: 'rgba(226,75,74,.35)'   },
  };
  const c = CFG[status];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={onInputChange}
        style={{ display: 'none' }}
      />

      <button
        id="upload-dataset-btn"
        onClick={() => fileRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        disabled={status === 'uploading'}
        title={status === 'error' ? errorMsg : 'Upload a CSV dataset'}
        style={{
          padding: '6px 14px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
          letterSpacing: '0.06em', fontFamily: 'inherit', transition: 'all 0.3s',
          cursor: status === 'uploading' ? 'not-allowed' : 'pointer',
          color: c.color, background: c.bg, border: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}
      >
        {status === 'uploading' && (
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            border: '2px solid #ffb74d', borderTopColor: 'transparent',
            display: 'inline-block', animation: 'upload-spin 0.8s linear infinite',
          }} />
        )}
        {c.label}
      </button>

      {fileName && (status === 'idle' || status === 'success') && (
        <span style={{
          fontSize: '10px', color: status === 'success' ? '#2ed8a0' : 'var(--text-muted)',
          maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'color 0.3s',
        }}>
          {fileName}
        </span>
      )}

      <style>{`@keyframes upload-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default UploadSection;
