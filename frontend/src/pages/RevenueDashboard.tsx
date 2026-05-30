import { useState, useEffect } from 'react';
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
  useTheme
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PaidIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Schedule';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
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
  timeline: { date: string; revenue: number }[];
}

export default function RevenueDashboard() {
  const theme = useTheme();

  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRevenueMetrics = () => {
    setLoading(true);
    api.get('/api/orders/metrics/revenue')
      .then((res) => {
        setMetrics(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load revenue metrics', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRevenueMetrics();
  }, []);

  if (loading || !metrics) {
    return (
      <Stack direction="row" sx={{ justifyContent: 'center', py: 12 }}>
        <CircularProgress color="primary" />
      </Stack>
    );
  }

  // Parse Mode Breakdown for PieChart
  const modeColors: Record<string, string> = {
    'UPI': '#4CAF50',
    'Cash': '#FF5A09',
    'Card': '#0A3BB0',
    'Net Banking': '#9C27B0',
    'Unknown': '#757575'
  };

  const modeData = Object.keys(metrics.modeBreakdown).map((mode) => ({
    name: mode,
    value: metrics.modeBreakdown[mode]
  }));

  const totalSales = metrics.totalPaidRevenue + metrics.totalPendingRevenue;

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#0A3BB0', fontWeight: 700 }}>
            Revenue Reports
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Monitor paid invoicing status, payment mode distributions, rider/counter cash collection audits, and daily sales trends.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchRevenueMetrics}
          sx={{ border: `1px solid ${theme?.palette.divider}`, borderRadius: 3 }}
        >
          Refresh Metrics
        </Button>
      </Box>

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
                <Typography variant="h4" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#4caf50', fontWeight: 'bold' }}>
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
                <Typography variant="h4" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#f44336', fontWeight: 'bold' }}>
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
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block' }}>
                  TOTAL CONTRACTED SALES
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#0A3BB0', fontWeight: 'bold' }}>
                  Rs. {totalSales.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Visual Charts section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Line Chart - Daily Sales Trend */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                📈 Sales Trend (Last 30 Days)
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.timeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={10} tickFormatter={(str) => {
                      const parts = str.split('/');
                      if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
                      return str;
                    }} />
                    <YAxis fontSize={10} />
                    <Tooltip formatter={(value) => [`Rs. ${parseFloat(value as any).toFixed(2)}`, 'Revenue']} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#FF5A09"
                      name="Daily Sales (Rs.)"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: '#FF5A09', strokeWidth: 1, fill: '#FFF' }}
                      activeDot={{ r: 6 }}
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
                      No payment data available. Mark orders as paid.
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

      {/* Cash Collection Audit Log Table */}
      <Typography variant="h6" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#0A3BB0', mb: 2, px: 0.5 }}>
        💵 Cash Reconciliation Audit Log
      </Typography>

      <TableContainer component={Paper} sx={{ borderRadius: 4, border: `1px solid ${theme?.palette.mode === 'light' ? '#EFEAE4' : '#2C2A28'}` }}>
        <Table>
          <TableHead sx={{ bgcolor: theme?.palette.mode === 'light' ? '#FAF6F0' : '#222120' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Date/Time Collected</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Order #</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Customer Name</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Amount Collected</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Manual Collection Point (Rider/Counter)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {metrics.cashLogs.map((log) => (
              <TableRow key={log.orderId} hover>
                <TableCell>
                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {log.orderNumber}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {log.customerName}
                </TableCell>
                <TableCell sx={{ color: '#FF5A09', fontWeight: 800 }}>
                  Rs. {parseFloat(log.amount as any).toFixed(2)}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {log.collectedAt || 'N/A'}
                </TableCell>
              </TableRow>
            ))}

            {metrics.cashLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  No cash payments recorded yet. Place orders and mark them as paid via Cash.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
