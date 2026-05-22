import React, { useEffect } from 'react';
import { Paper, Box, Typography, IconButton } from '@mui/material';
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
    <Paper
      elevation={6}
      sx={{
        width: 320,
        backgroundColor: 'background.paper',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: (theme) => 
          theme.palette.mode === 'dark' 
            ? '0 12px 32px rgba(0,0,0,0.5)' 
            : '0 12px 32px rgba(148, 163, 184, 0.2)',
        animation: 'slideIn 0.3s ease-out forwards',
        mb: 1.5,
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          backgroundColor: '#075e54', // Classic WhatsApp dark green
          color: 'white',
          px: 2, 
          py: 1 
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ backgroundColor: '#128c7e', borderRadius: '50%', p: 0.5, display: 'flex' }}>
            <Send size={10} color="white" />
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 650, letterSpacing: '0.03em' }}>
            WhatsApp Log ({toast.templateType})
          </Typography>
        </Box>
        <IconButton 
          size="small" 
          onClick={() => onClose(toast.id)} 
          sx={{ color: 'rgba(255,255,255,0.8)', p: 0.2 }}
        >
          <X size={14} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          To: <Box component="span" sx={{ color: '#25d366', fontWeight: 700 }}>{toast.recipient}</Box>
        </Typography>

        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.primary',
            fontSize: '0.85rem',
            whiteSpace: 'pre-wrap', 
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            p: 1.25, 
            borderRadius: 1.5, 
            border: '1px solid',
            borderColor: 'divider',
            maxHeight: 120,
            overflowY: 'auto'
          }}
        >
          {toast.message}
        </Typography>

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#25d366' }}>
            <CheckCheck size={14} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {toast.status === 'Sent' || toast.status === 'Simulated' ? 'Delivered' : 'Pending'}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default WhatsAppToast;
