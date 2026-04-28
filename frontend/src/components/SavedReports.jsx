import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { X, FileText, Database } from 'lucide-react';

const SavedReports = ({ onClose }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReports(data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'FAIR': return '#2ed8a0';
      case 'MODERATE': return '#ffb74d';
      case 'HIGH': return '#ff7070';
      case 'CRITICAL': return '#ff4444';
      default: return '#a09aff';
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border-glass)',
        borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-glass)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)'
            }}>
              <Database size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Saved Reports</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Cloud compliance records</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
            padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading reports...</div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              No reports saved to cloud yet.
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} style={{
                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16,
                transition: 'transform 0.2s, background 0.2s', cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'var(--bg-glass)'; }}
              onClick={() => {
                const jsonStr = JSON.stringify(report.report, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: '50%',
                  background: `${getStatusColor(report.compliance_status)}15`,
                  border: `2px solid ${getStatusColor(report.compliance_status)}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 900, color: getStatusColor(report.compliance_status), flexShrink: 0
                }}>
                  {Math.round(report.fairness_score)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {report.dataset_name || 'Dataset Analysis'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(report.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                      background: `${getStatusColor(report.compliance_status)}20`,
                      color: getStatusColor(report.compliance_status),
                      letterSpacing: '0.05em'
                    }}>
                      {report.compliance_status}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {report.actions_applied?.length || 0} fixes applied
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border-glass)',
          background: 'rgba(0,0,0,0.2)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center'
        }}>
          Click on any report to view the raw JSON data.
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </div>
  );
};

export default SavedReports;
