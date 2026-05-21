import React, { useState, useEffect } from 'react';
import { api, WhatsAppLog } from '../services/api';
import { RefreshCw, Search, Send, Clock, Loader } from 'lucide-react';

export const WhatsAppLogs: React.FC = () => {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getWhatsAppLogs();
      setLogs(res);
    } catch (err) {
      console.error('Failed to load WhatsApp logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getTemplateBadgeClass = (type: WhatsAppLog['template_type']) => {
    switch (type) {
      case 'OrderReceived': return 'badge badge-pending';
      case 'OrderReady': return 'badge badge-ready';
      case 'PaymentSuccess': return 'badge badge-delivered';
      case 'Promotion': return 'badge badge-preparing';
      default: return 'badge';
    }
  };

  const getStatusBadgeClass = (status: WhatsAppLog['status']) => {
    switch (status) {
      case 'Sent': return 'badge badge-ready';
      case 'Failed': return 'badge badge-cancelled';
      case 'Pending': return 'badge badge-pending';
      default: return 'badge';
    }
  };

  const filteredLogs = logs.filter(log => 
    log.recipient.includes(searchQuery) ||
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.template_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>WhatsApp Communications Outbox</h2>
          <p className="subtitle" style={{ margin: 0 }}>Review automatic system notifications and marketing broadcasts sent to clients.</p>
        </div>
        <button className="btn btn-secondary" onClick={loadLogs} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="glass-panel">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Search by recipient phone number or message content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-dark)' }} />
        </div>

        {loading && logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Recipient</th>
                  <th>Template Type</th>
                  <th>Message Preview</th>
                  <th>Delivery Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-dark)', padding: '2rem' }}>
                      No communication logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          <Clock size={12} color="var(--color-text-dark)" />
                          <span>{new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{log.recipient}</td>
                      <td>
                        <span className={getTemplateBadgeClass(log.template_type)}>
                          {log.template_type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxWidth: '400px', maxHeight: '80px', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          {log.message}
                        </div>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(log.status)}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default WhatsAppLogs;
