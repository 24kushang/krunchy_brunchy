import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Stack,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Grid,
  Divider,
  useTheme
} from '@mui/material';
import {
  DataGrid,
  type GridColDef
} from '@mui/x-data-grid';
import LogsIcon from '@mui/icons-material/ReceiptLong';
import TemplatesIcon from '@mui/icons-material/LibraryBooks';
import RetryIcon from '@mui/icons-material/Autorenew';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeliveredIcon from '@mui/icons-material/CheckCircle';
import FailedIcon from '@mui/icons-material/Error';
import SentIcon from '@mui/icons-material/Send';
import api from '../utils/api';

interface WhatsappLog {
  id: string;
  recipientName: string;
  recipientContact: string;
  triggeringEvent: string;
  status: 'Sent' | 'Delivered' | 'Failed';
  errorMessage?: string;
  timestamp: string;
  order?: {
    id: string;
    orderNumber: string;
  };
}

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  text: string;
}

export default function WhatsappHub() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0); // 0 = Live Logs, 1 = Templates
  const [logs, setLogs] = useState<WhatsappLog[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    api.get('/api/whatsapp/logs')
      .then((res) => {
        setLogs(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const fetchTemplates = () => {
    setLoading(true);
    api.get('/api/whatsapp/templates')
      .then((res) => {
        setTemplates(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 0) {
      fetchLogs();
    } else {
      fetchTemplates();
    }
  }, [activeTab]);

  const handleRetry = async (logId: string) => {
    setRetryingId(logId);
    try {
      await api.post(`/api/whatsapp/logs/${logId}/retry`);
      fetchLogs(); // refresh logs
    } catch (err) {
      console.error('Retry failed', err);
      alert('Retry dispatch failed. Check console.');
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Delivered': return <DeliveredIcon sx={{ color: '#4CAF50', fontSize: 18 }} />;
      case 'Failed': return <FailedIcon sx={{ color: '#f44336', fontSize: 18 }} />;
      case 'Sent': return <SentIcon sx={{ color: '#0A3BB0', fontSize: 18 }} />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return { bg: 'rgba(76, 175, 80, 0.1)', fg: '#4caf50' };
      case 'Failed': return { bg: 'rgba(244, 67, 54, 0.1)', fg: '#f44336' };
      case 'Sent': return { bg: 'rgba(10, 59, 176, 0.1)', fg: '#0A3BB0' };
      default: return { bg: 'grey.300', fg: 'black' };
    }
  };

  const columns: GridColDef[] = [
    { field: 'timestamp', headerName: 'Dispatched At', width: 180, renderCell: (params) => new Date(params.value).toLocaleString() },
    { field: 'orderNumber', headerName: 'Associated Order', width: 140, valueGetter: (_value, row) => row.order?.orderNumber || 'N/A' },
    { field: 'recipientName', headerName: 'Recipient Name', width: 170 },
    { field: 'recipientContact', headerName: 'Contact Number', width: 150 },
    { field: 'triggeringEvent', headerName: 'Trigger Event', width: 190 },
    {
      field: 'status', headerName: 'Delivery Status', width: 140, renderCell: (params) => {
        const colors = getStatusColor(params.value);
        return (
          <Chip
            icon={getStatusIcon(params.value) || undefined}
            label={params.value}
            size="small"
            sx={{ bgcolor: colors.bg, color: colors.fg, fontWeight: 'bold' }}
          />
        );
      }
    },
    {
      field: 'errorMessage', headerName: 'Error Summary / Logs', width: 220, renderCell: (params) => (
        <Typography variant="caption" color="textSecondary">{params.value || '-'}</Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      renderCell: (params) => {
        const isFailed = params.row.status === 'Failed';
        if (!isFailed) return null;
        return (
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={retryingId === params.row.id ? <CircularProgress size={12} /> : <RetryIcon />}
            onClick={() => handleRetry(params.row.id)}
            disabled={retryingId !== null}
            sx={{ py: 0.1, px: 1, borderRadius: 2 }}
          >
            Retry
          </Button>
        );
      },
    },
  ];

  return (
    <Box>
      {/* View Selector Tabs */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, val) => setActiveTab(val)}
          sx={{
            bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120',
            borderRadius: 3,
            p: 0.5,
            minHeight: 0,
            '& .MuiTabs-indicator': { display: 'none' },
          }}
        >
          <Tab icon={<LogsIcon sx={{ fontSize: 18 }} />} label="Live Dispatch Logs" sx={{ minHeight: 0, py: 1, borderRadius: 2, '&.Mui-selected': { bgcolor: '#0A3BB0', color: '#FFF' } }} />
          <Tab icon={<TemplatesIcon sx={{ fontSize: 18 }} />} label="Approved Templates" sx={{ minHeight: 0, py: 1, borderRadius: 2, '&.Mui-selected': { bgcolor: '#0A3BB0', color: '#FFF' } }} />
        </Tabs>

        <IconButton
          onClick={activeTab === 0 ? fetchLogs : fetchTemplates}
          color="primary"
          sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Main Content Displays */}
      {loading ? (
        <Stack direction="row" sx={{ justifyContent: 'center', py: 12 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : activeTab === 0 ? (
        /* View A: Live Message Logs Table */
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={logs}
            columns={columns}
            initialState={{
              pagination: { paginationModel: { page: 0, pageSize: 15 } },
            }}
            pageSizeOptions={[15, 30]}
            disableRowSelectionOnClick
            sx={{
              bgcolor: theme.palette.background.paper,
              borderRadius: 4,
              border: `1px solid ${theme.palette.mode === 'light' ? '#EFEAE4' : '#2C2A28'}`,
              '& .MuiDataGrid-columnHeader': {
                bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120',
                fontWeight: 'bold',
              },
            }}
          />
        </Box>
      ) : (
        /* View B: Predefined Template Directory */
        <Grid container spacing={3}>
          {templates.map((tpl) => (
            <Grid size={{ xs: 12, sm: 6 }} key={tpl.id}>
              <Card sx={{ height: '100%', border: '1px solid #EFEAE4' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontFamily: '"Fredoka", sans-serif', fontWeight: 700 }}>
                      {tpl.name}
                    </Typography>

                    <Chip
                      label={tpl.category}
                      size="small"
                      sx={{ bgcolor: 'rgba(10, 59, 176, 0.08)', color: '#0A3BB0', fontWeight: 'bold' }}
                    />
                  </Stack>

                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                    Approved ID: **{tpl.id}** | Language: **{tpl.language}**
                  </Typography>

                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120', border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', lineHeight: 1.5 }}>
                      "{tpl.text}"
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
