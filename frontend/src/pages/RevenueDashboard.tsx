import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Stack,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import { getMarginChipProps } from './Items';
import PaidIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Schedule';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EditIcon from '@mui/icons-material/Edit';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import api from '../utils/api';

interface CashLog {
  orderId: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  collectedAt: string;
  timestamp: string;
}

interface RevenueMetrics {
  totalPaidRevenue: number;
  totalPendingRevenue: number;
  modeBreakdown: Record<string, number>;
  cashLogs: CashLog[];
  totalCost: number | null;
  totalGrossProfit: number | null;
  overallMarginPercent: number | null;
  timeline: {
    daily: { date: string; revenue: number }[];
    monthly: { date: string; revenue: number }[];
    quarterly: { date: string; revenue: number }[];
    yearly: { date: string; revenue: number }[];
  };
}

export default function RevenueDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();

  // Inspect Order Modal states
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  const getCurrentMonthDateRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return {
      start: formatDate(start),
      end: formatDate(end)
    };
  };

  const { start: defaultStart, end: defaultEnd } = getCurrentMonthDateRange();

  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Filter States
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [paymentMode, setPaymentMode] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');

  // Trend Grouping state
  const [trendMode, setTrendMode] = useState<'daily' | 'monthly' | 'quarterly' | 'yearly'>('daily');

  // Paginated details states
  const [revenueDetails, setRevenueDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const fetchRevenueMetrics = (
    sDate = startDate,
    eDate = endDate,
    type = trendMode,
    pMode = paymentMode,
    pStatus = paymentStatus
  ) => {
    setLoadingMetrics(true);
    const params: Record<string, string> = { type };
    if (sDate) params.startDate = sDate;
    if (eDate) params.endDate = eDate;
    if (pMode !== 'ALL') params.paymentMode = pMode;
    if (pStatus !== 'ALL') params.paymentStatus = pStatus;

    api.get('/api/orders/metrics/revenue', { params })
      .then((res) => {
        setMetrics(res.data);
        setLoadingMetrics(false);
      })
      .catch((err) => {
        console.error('Failed to load revenue metrics', err);
        setLoadingMetrics(false);
      });
  };

  const handleInspectOrder = async (orderId: string) => {
    setOpenDetail(true);
    setLoadingOrderDetail(true);
    try {
      const res = await api.get(`/api/orders/${orderId}`);
      setSelectedOrder(res.data);
    } catch (err) {
      console.error('Failed to fetch order details', err);
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const handleSendWhatsApp = async (order: any) => {
    if (!order?.id) return;
    try {
      const res = await api.post(`/api/orders/${order.id}/whatsapp-url`);
      if (res.data && res.data.url) {
        window.open(res.data.url, '_blank');
      }
    } catch (err) {
      console.error('Failed to generate WhatsApp URL', err);
      alert('Failed to generate WhatsApp URL. Please try again.');
    }
  };

  const fetchRevenueDetails = (
    curPage = page,
    curLimit = rowsPerPage,
    sDate = startDate,
    eDate = endDate,
    pMode = paymentMode,
    pStatus = paymentStatus
  ) => {
    setLoadingDetails(true);
    const params: Record<string, any> = {
      page: curPage + 1,
      limit: curLimit
    };
    if (sDate) params.startDate = sDate;
    if (eDate) params.endDate = eDate;
    if (pMode !== 'ALL') params.paymentMode = pMode;
    if (pStatus !== 'ALL') params.paymentStatus = pStatus;

    api.get('/api/orders/metrics/revenue/details', { params })
      .then((res) => {
        setRevenueDetails(res.data.data || []);
        setTotalRows(res.data.total || 0);
        setLoadingDetails(false);
      })
      .catch((err) => {
        console.error('Failed to load revenue details', err);
        setLoadingDetails(false);
      });
  };

  const didFetch = useRef(false);

  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      fetchRevenueMetrics(defaultStart, defaultEnd, trendMode, paymentMode, paymentStatus);
      fetchRevenueDetails(0, rowsPerPage, defaultStart, defaultEnd, paymentMode, paymentStatus);
    }
  }, []);

  useEffect(() => {
    if (didFetch.current) {
      fetchRevenueMetrics(startDate, endDate, trendMode, paymentMode, paymentStatus);
    }
  }, [trendMode]);

  const handleApplyFilters = () => {
    setPage(0);
    fetchRevenueMetrics(startDate, endDate, trendMode, paymentMode, paymentStatus);
    fetchRevenueDetails(0, rowsPerPage, startDate, endDate, paymentMode, paymentStatus);
  };

  const handleResetFilters = () => {
    const { start: resetStart, end: resetEnd } = getCurrentMonthDateRange();
    setStartDate(resetStart);
    setEndDate(resetEnd);
    setPaymentMode('ALL');
    setPaymentStatus('ALL');
    setPage(0);
    fetchRevenueMetrics(resetStart, resetEnd, trendMode, 'ALL', 'ALL');
    fetchRevenueDetails(0, rowsPerPage, resetStart, resetEnd, 'ALL', 'ALL');
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
    fetchRevenueDetails(newPage, rowsPerPage, startDate, endDate, paymentMode, paymentStatus);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const limit = parseInt(event.target.value, 10);
    setRowsPerPage(limit);
    setPage(0);
    fetchRevenueDetails(0, limit, startDate, endDate, paymentMode, paymentStatus);
  };

  // Parse Mode Breakdown for PieChart
  const modeColors: Record<string, string> = {
    'UPI': '#4CAF50',
    'Cash': '#FF5A09',
    'Card': '#0A3BB0',
    'Net Banking': '#9C27B0',
    'Unknown': '#757575'
  };

  const modeData = metrics
    ? Object.keys(metrics.modeBreakdown).map((mode) => ({
      name: mode,
      value: metrics.modeBreakdown[mode]
    }))
    : [];

  const totalSales = metrics
    ? metrics.totalPaidRevenue + metrics.totalPendingRevenue
    : 0;

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#0A3BB0', fontWeight: 700 }}>
            Revenue Reports & Analytics
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Monitor paid invoicing status, payment mode distributions, and revenue trends across days, months, quarters, or years.
          </Typography>
        </Box>
      </Box>

      {/* Filter Control Card */}
      <Card sx={{ mb: 4, border: `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                type="date"
                label="From Date"
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                type="date"
                label="To Date"
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Mode</InputLabel>
                <Select
                  value={paymentMode}
                  label="Payment Mode"
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <MenuItem value="ALL">All Modes</MenuItem>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Card">Card</MenuItem>
                  <MenuItem value="Net Banking">Net Banking</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={paymentStatus}
                  label="Payment Status"
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Unpaid">Unpaid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }} sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="medium"
                startIcon={<FilterListIcon />}
                onClick={handleApplyFilters}
                fullWidth
                sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 2 }}
              >
                Apply
              </Button>
              <Button
                variant="outlined"
                size="medium"
                onClick={handleResetFilters}
                sx={{ borderRadius: 2 }}
              >
                <ClearIcon />
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loadingMetrics || !metrics ? (
        <Stack direction="row" sx={{ justifyContent: 'center', py: 12 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : (
        <>
          {/* Numerical Metric Counters */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.03)', border: '1px solid rgba(76, 175, 80, 0.15)', height: '100%', display: 'flex', alignItems: 'center', p: 1 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', display: 'flex' }}>
                    <PaidIcon fontSize="large" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block' }}>
                      PAID REVENUE
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                      Rs. {metrics.totalPaidRevenue.toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Card sx={{ bgcolor: 'rgba(244, 67, 54, 0.03)', border: '1px solid rgba(244, 67, 54, 0.15)', height: '100%', display: 'flex', alignItems: 'center', p: 1 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(244, 67, 54, 0.1)', color: '#f44336', display: 'flex' }}>
                    <PendingIcon fontSize="large" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block' }}>
                      UNPAID INVOICES
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                      Rs. {metrics.totalPendingRevenue.toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Card sx={{ bgcolor: 'rgba(10, 59, 176, 0.03)', border: '1px solid rgba(10, 59, 176, 0.15)', height: '100%', display: 'flex', alignItems: 'center', p: 1 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(10, 59, 176, 0.1)', color: '#0A3BB0', display: 'flex' }}>
                    <AccountBalanceWalletIcon fontSize="large" />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block' }}>
                      TOTAL SALES VALUE
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="h4" sx={{ color: '#0A3BB0', fontWeight: 'bold' }}>
                        Rs. {totalSales.toFixed(2)}
                      </Typography>
                      {metrics.overallMarginPercent !== null && (
                        <Chip
                          label={`${metrics.overallMarginPercent.toFixed(1)}% margin`}
                          size="small"
                          {...getMarginChipProps(metrics.overallMarginPercent)}
                          variant="filled"
                          sx={{ fontWeight: 700, fontSize: '0.7rem', ...getMarginChipProps(metrics.overallMarginPercent).sx }}
                        />
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Cost & Profit row (only if cost data available) */}
            {metrics.totalCost !== null && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card sx={{ bgcolor: 'rgba(156, 39, 176, 0.03)', border: '1px solid rgba(156, 39, 176, 0.15)', height: '100%', display: 'flex', alignItems: 'center', p: 1 }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(156, 39, 176, 0.1)', color: '#9c27b0', display: 'flex' }}>
                        <PaymentsIcon fontSize="large" />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block' }}>
                          TOTAL COST (WHERE KNOWN)
                        </Typography>
                        <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                          Rs. {metrics.totalCost.toFixed(2)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card
                    sx={{
                      bgcolor: metrics.totalGrossProfit !== null && metrics.totalGrossProfit >= 0
                        ? 'rgba(76, 175, 80, 0.03)' : 'rgba(244, 67, 54, 0.03)',
                      border: metrics.totalGrossProfit !== null && metrics.totalGrossProfit >= 0
                        ? '1px solid rgba(76, 175, 80, 0.25)' : '1px solid rgba(244, 67, 54, 0.25)',
                      height: '100%', display: 'flex', alignItems: 'center', p: 1
                    }}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Box
                        sx={{
                          p: 1.5, borderRadius: 3, display: 'flex',
                          bgcolor: metrics.totalGrossProfit !== null && metrics.totalGrossProfit >= 0
                            ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                          color: metrics.totalGrossProfit !== null && metrics.totalGrossProfit >= 0 ? '#4caf50' : '#f44336',
                        }}
                      >
                        <AccountBalanceWalletIcon fontSize="large" />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block' }}>
                          GROSS PROFIT (WHERE KNOWN)
                        </Typography>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 'bold',
                            color: metrics.totalGrossProfit !== null && metrics.totalGrossProfit >= 0 ? '#4caf50' : '#f44336',
                          }}
                        >
                          Rs. {metrics.totalGrossProfit !== null ? metrics.totalGrossProfit.toFixed(2) : '—'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </Grid>

          {/* Visual Charts section */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Line Chart - Trend Selection */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                      📈 Sales Trend ({trendMode.toUpperCase()})
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {(['daily', 'monthly', 'quarterly', 'yearly'] as const).map((mode) => (
                        <Button
                          key={mode}
                          size="small"
                          variant={trendMode === mode ? 'contained' : 'outlined'}
                          onClick={() => setTrendMode(mode)}
                          sx={{
                            borderRadius: 2,
                            textTransform: 'capitalize',
                            bgcolor: trendMode === mode ? '#FF5A09' : 'transparent',
                            color: trendMode === mode ? '#FF5A09' : '#757575',
                            borderColor: '#FF5A09',
                            '&:hover': {
                              bgcolor: trendMode === mode ? '#E04E07' : 'rgba(255, 90, 9, 0.04)',
                              borderColor: '#FF5A09'
                            },
                            // Override custom styling to handle Recharts themes nicely
                            ...(trendMode === mode && {
                              color: '#FFF',
                              borderColor: '#FF5A09'
                            })
                          }}
                        >
                          {mode === 'daily' ? 'Days' : mode === 'monthly' ? 'Months' : mode === 'quarterly' ? 'Quarters' : 'Years'}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.timeline[trendMode] || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          fontSize={10}
                          tickFormatter={(str) => {
                            if (trendMode === 'daily') {
                              const parts = str.split('/');
                              if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
                            }
                            return str;
                          }}
                        />
                        <YAxis fontSize={10} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const pointData = payload[0].payload;
                              return (
                                <Paper sx={{ p: 1.5, fontSize: '0.8rem', border: `1px solid ${theme.palette.divider}`, borderRadius: 2, boxShadow: '0px 4px 20px rgba(0,0,0,0.1)' }}>
                                  <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5, color: 'text.secondary' }}>
                                    {label}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#FF5A09', fontWeight: 700 }}>
                                    Revenue: Rs. {parseFloat(pointData.revenue || 0).toFixed(2)}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#9C27B0', fontWeight: 700 }}>
                                    Cost: Rs. {parseFloat(pointData.cost || 0).toFixed(2)}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 700 }}>
                                    Gross Profit: Rs. {parseFloat(pointData.profit || 0).toFixed(2)}
                                  </Typography>
                                  {pointData.marginPercent !== null && pointData.marginPercent !== undefined && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: pointData.marginPercent >= 49 ? '#6366F1' : pointData.marginPercent >= 25 ? '#4CAF50' : pointData.marginPercent >= 10 ? '#ff9800' : '#f44336',
                                        fontWeight: 800, display: 'block', mt: 0.5
                                      }}
                                    >
                                      Margin: {pointData.marginPercent.toFixed(1)}%
                                    </Typography>
                                  )}
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#FF5A09"
                          name="Revenue (Rs.)"
                          strokeWidth={3}
                          dot={{ r: 4, stroke: '#FF5A09', strokeWidth: 1, fill: '#FFF' }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="cost"
                          stroke="#9C27B0"
                          name="Cost (Rs.)"
                          strokeWidth={2}
                          strokeDasharray="5 3"
                          dot={{ r: 3, stroke: '#9C27B0', strokeWidth: 1, fill: '#FFF' }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="profit"
                          stroke="#4CAF50"
                          name="Gross Profit (Rs.)"
                          strokeWidth={2}
                          dot={{ r: 3, stroke: '#4CAF50', strokeWidth: 1, fill: '#FFF' }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Pie Chart - Payment Modes */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PaymentsIcon color="primary" /> Payment Mode Share
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', flexDirection: 'column', justifyItems: 'center' }}>
                    {modeData.length === 0 ? (
                      <Box sx={{ m: 'auto', textAlign: 'center' }}>
                        <Typography variant="body2" color="textSecondary">
                          No payment data available for the chosen date range.
                        </Typography>
                      </Box>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={modeData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                          >
                            {modeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={modeColors[entry.name] || '#757575'} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val) => `Rs. ${parseFloat(val as any).toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Paginated Invoiced Sales details log */}
      <Typography variant="h6" sx={{ color: '#0A3BB0', mb: 2, px: 0.5 }}>
        📋 Revenue Audit Log
      </Typography>

      <TableContainer component={Paper} sx={{ borderRadius: 4, border: `1px solid ${theme?.palette.mode === 'light' ? '#EFEAE4' : '#2C2A28'}` }}>
        {loadingDetails ? (
          <Stack direction="row" sx={{ justifyContent: 'center', py: 6 }}>
            <CircularProgress color="primary" />
          </Stack>
        ) : (
          <>
            <Table>
              <TableHead sx={{ bgcolor: theme?.palette.mode === 'light' ? '#FAF6F0' : '#222120' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Date Logged</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Order #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Hub Location</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Payment Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Payment Mode</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Total Value</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Est. Cost</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Gross Profit</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Margin %</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Details</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {revenueDetails.map((order: any) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>
                      {order.orderNumber}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {order.customer?.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {order.customer?.contact || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {order.fulfillmentHub?.name || 'Default Hub'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.paymentStatus}
                        size="small"
                        color={order.paymentStatus === 'Paid' ? 'success' : 'error'}
                        variant={order.paymentStatus === 'Paid' ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {order.paymentMode || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#FF5A09', fontWeight: 800 }}>
                      Rs. {parseFloat(order.totalAmount as any).toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>
                      {order.estimatedCost !== null && order.estimatedCost !== undefined
                        ? `Rs. ${order.estimatedCost.toFixed(2)}`
                        : <span style={{ color: '#9e9e9e' }}>—</span>}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                      {order.grossProfit !== null && order.grossProfit !== undefined ? (
                        <span style={{ color: order.grossProfit >= 0 ? '#4caf50' : '#f44336' }}>
                          Rs. {order.grossProfit.toFixed(2)}
                        </span>
                      ) : <span style={{ color: '#9e9e9e' }}>—</span>}
                    </TableCell>
                    <TableCell>
                      {order.marginPercent !== null && order.marginPercent !== undefined ? (
                        <Chip
                          label={`${order.marginPercent.toFixed(1)}%`}
                          size="small"
                          {...getMarginChipProps(order.marginPercent)}
                          variant="filled"
                          sx={{ fontWeight: 700, fontSize: '0.7rem', ...getMarginChipProps(order.marginPercent).sx }}
                        />
                      ) : <span style={{ color: '#9e9e9e' }}>—</span>}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary' }}>
                      {order.paymentMode === 'Cash'
                        ? order.cashCollectionDetails || 'N/A'
                        : 'N/A'}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleInspectOrder(order.id)}
                          sx={{ py: 0.2, px: 1, fontSize: '0.72rem', borderRadius: 2 }}
                        >
                          Inspect
                        </Button>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate(`/orders/${order.id}/edit`)}
                          title="Edit Order"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                {revenueDetails.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                      No invoicing records found matching your active filter criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 20]}
              component="div"
              count={totalRows}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </TableContainer>

      {/* Inspect Order Details Dialog */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="sm" fullWidth>
        {loadingOrderDetail ? (
          <Stack direction="row" sx={{ justifyContent: 'center', py: 8 }}>
            <CircularProgress color="primary" />
          </Stack>
        ) : selectedOrder && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.palette.divider}`, gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ color: '#0A3BB0', fontWeight: 800 }}>
                Order Details ({selectedOrder.orderNumber})
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip
                  label={selectedOrder.paymentStatus || 'Unpaid'}
                  size="small"
                  color={selectedOrder.paymentStatus === 'Paid' ? 'success' : 'error'}
                  sx={{ fontWeight: 'bold' }}
                />
                <Chip
                  label={selectedOrder.status || 'Pending'}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 'bold' }}
                />
              </Stack>
            </DialogTitle>
            <DialogContent sx={{ py: 3 }}>
              {/* Items Segment */}
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 800, mb: 1.5 }}>
                Order Items
              </Typography>
              <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                {selectedOrder.items?.map((item: any) => (
                  <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.item?.name}</Typography>
                      <Typography variant="caption" color="textSecondary">{item.quantity} x Rs. {parseFloat(item.priceAtOrder as any).toFixed(2)}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      Rs. {(item.quantity * parseFloat(item.priceAtOrder as any)).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Total Amount:</Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 900 }}>Rs. {parseFloat(selectedOrder.totalAmount as any).toFixed(2)}</Typography>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              {/* Customer Segment */}
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 800, mb: 1.5 }}>
                Customer Information
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Name</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.customer?.name}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Contact</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.customer?.contact || 'N/A'}</Typography>
                    {selectedOrder.customer?.contact && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="success"
                        startIcon={<WhatsAppIcon sx={{ fontSize: '0.875rem !important' }} />}
                        onClick={() => handleSendWhatsApp(selectedOrder)}
                        sx={{
                          borderColor: '#25D366',
                          color: '#25D366',
                          '&:hover': {
                            borderColor: '#128C7E',
                            bgcolor: 'rgba(37, 211, 102, 0.04)',
                          },
                          textTransform: 'none',
                          py: 0.1,
                          px: 1,
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          borderRadius: 1.5,
                          minWidth: 0,
                          lineHeight: 1.2
                        }}
                      >
                        Send Message
                      </Button>
                    )}
                  </Box>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Date Logged</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{new Date(selectedOrder.createdAt).toLocaleString()}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2.5 }} />

              {/* Fulfillment & Payment Details */}
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 800, mb: 1.5 }}>
                Additional Details
              </Typography>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Location (City)</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.customer?.location || 'N/A'}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Order Source</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {typeof selectedOrder.source === 'object' ? (selectedOrder.source as any)?.name : selectedOrder.source || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Expected Delivery Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedOrder.expectedDeliveryDate ? new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Fulfillment Hub</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedOrder.fulfillmentHub?.name || 'N/A'}
                  </Typography>
                </Grid>
                {selectedOrder.paymentStatus === 'Paid' && (
                  <>
                    <Grid size={6}>
                      <Typography variant="caption" color="textSecondary">Payment Mode</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.paymentMode || 'N/A'}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="textSecondary">Payment Recorded At</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {selectedOrder.paymentUpdatedAt ? new Date(selectedOrder.paymentUpdatedAt).toLocaleString() : 'N/A'}
                      </Typography>
                    </Grid>
                    {selectedOrder.paymentMode === 'Cash' && (
                      <Grid size={12}>
                        <Typography variant="caption" color="textSecondary">Cash Collected At</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.cashCollectionDetails || 'N/A'}</Typography>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => {
                  setOpenDetail(false);
                  navigate(`/orders/${selectedOrder.id}/edit`);
                }}
                sx={{ borderRadius: 2, bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' } }}
              >
                Edit Order
              </Button>
              <Button variant="outlined" onClick={() => setOpenDetail(false)} sx={{ borderRadius: 3 }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
