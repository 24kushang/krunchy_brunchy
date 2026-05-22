import React, { useState, useEffect } from 'react';
import { api, WhatsAppLog } from '../services/api';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Typography,
  Button,
  Chip,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { RefreshCw, Search, Clock } from 'lucide-react';

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

  const getTemplateChipColor = (type: WhatsAppLog['template_type']) => {
    switch (type) {
      case 'OrderReceived': return 'warning';
      case 'OrderReady': return 'success';
      case 'PaymentSuccess': return 'secondary';
      case 'Promotion': return 'info';
      default: return 'default';
    }
  };

  const getStatusChipColor = (status: WhatsAppLog['status']) => {
    switch (status) {
      case 'Sent':
      case 'Simulated':
        return 'success';
      case 'Failed': return 'error';
      case 'Pending': return 'warning';
      default: return 'default';
    }
  };

  const filteredLogs = logs.filter(log =>
    log.recipient.includes(searchQuery) ||
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.template_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }} color="text.primary">
            WhatsApp Communications Outbox
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review automatic system notifications and marketing broadcasts sent to clients.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          onClick={loadLogs}
          disabled={loading}
          startIcon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
        >
          Refresh Logs
        </Button>
      </Box>

      {/* Main Panel */}
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by recipient phone number or message content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
          }}
        />

        {loading && logs.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={36} color="primary" />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Template Type</TableCell>
                  <TableCell>Message Preview</TableCell>
                  <TableCell>Delivery Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No communication logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map(log => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                          <Clock size={12} />
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {log.recipient}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.template_type}
                          color={getTemplateChipColor(log.template_type)}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            fontSize: '0.85rem',
                            whiteSpace: 'pre-wrap',
                            maxWidth: '400px',
                            maxHeight: '80px',
                            overflowY: 'auto',
                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                            p: 1.25,
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        >
                          {log.message}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.status}
                          color={getStatusChipColor(log.status)}
                          size="small"
                          sx={{ fontWeight: 650 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default WhatsAppLogs;
