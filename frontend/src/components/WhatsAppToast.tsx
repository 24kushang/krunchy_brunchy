import React, { useEffect } from 'react';
import { X, Send, CheckCheck } from 'lucide-react';

export interface ToastMessage {
  id: string;
  recipient: string;
  message: string;
  templateType: string;
  status: string;
  timestamp: Date;
}

interface WhatsAppToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const WhatsAppToast: React.FC<WhatsAppToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 8000); // Dismiss after 8 seconds to allow reading
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div className="whatsapp-toast">
      <div className="whatsapp-toast-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ backgroundColor: '#25d366', borderRadius: '50%', padding: '4px', display: 'flex' }}>
            <Send size={12} color="white" />
          </div>
          <span>WhatsApp Alert ({toast.templateType})</span>
        </div>
        <button 
          onClick={() => onClose(toast.id)} 
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex' }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
        To: <span style={{ color: '#25d366' }}>{toast.recipient}</span>
      </div>

      <div className="whatsapp-toast-msg">
        {toast.message}
      </div>

      <div className="whatsapp-toast-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#25d366' }}>
          <CheckCheck size={14} />
          <span>{toast.status === 'Sent' || toast.status === 'Simulated' ? 'Delivered' : 'Delivery Pending'}</span>
        </div>
        <span>{toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};
export default WhatsAppToast;
