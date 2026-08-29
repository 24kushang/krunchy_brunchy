import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
  useTheme,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface MismatchedOrderItem {
  itemName: string;
  quantity: number;
  priceAtOrder: number;
}

interface MismatchedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  itemsSum: number;
  delta: number;
  updatedAt: string;
  items: MismatchedOrderItem[];
}

interface ReconciliationReport {
  mismatchedOrders: MismatchedOrder[];
  orphanedItemsCount: number;
}

export default function DataIntegrity() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchReport = useCallback(() => {
    setLoading(true);
    setErrorMsg(null);
    api
      .get('/api/orders/reconciliation')
      .then((res) => setReport(res.data))
      .catch((err) => {
        console.error('Failed to load reconciliation report', err);
        setErrorMsg(err.response?.data?.message || 'Failed to load reconciliation report.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleCleanupOrphaned = async () => {
    if (
      !window.confirm(
        'Delete all orphaned order_items rows (those with no owning order)? This is safe — these rows can never be reattached to any order, they are already unreachable dead data.',
      )
    ) {
      return;
    }
    setCleaning(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.post('/api/orders/reconciliation/cleanup-orphaned');
      setSuccessMsg(`Deleted ${res.data.deletedCount} orphaned order item row(s).`);
      fetchReport();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to clean up orphaned items.');
    } finally {
      setCleaning(false);
    }
  };

  const borderColor = theme.palette.mode === 'light' ? '#F0EBE5' : '#2D2B29';

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#0A3BB0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WarningAmberIcon /> Data Integrity
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1, maxWidth: 700 }}>
            Orders whose stored total doesn't match the sum of their current line items. This
            usually means the order's cart was edited but the change didn't fully persist —
            open the order below, re-select the correct items, and save to fix it. Orders with a
            manually entered discount/override total are excluded from this list.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={fetchReport} disabled={loading} sx={{ borderRadius: 3, whiteSpace: 'nowrap' }}>
          Refresh
        </Button>
      </Box>

      {errorMsg && <Alert severity="error" sx={{ mb: 3 }}>{errorMsg}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 3 }}>{successMsg}</Alert>}

      {loading ? (
        <Stack direction="row" sx={{ justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <>
          {/* Orphaned items cleanup card */}
          <Card sx={{ borderRadius: 4, mb: 3 }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CleaningServicesIcon sx={{ color: report && report.orphanedItemsCount > 0 ? '#FF5A09' : '#4CAF50' }} />
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>
                    {report?.orphanedItemsCount ?? 0} orphaned item row(s)
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Dead order_items rows with no owning order. Safe to delete — they can never
                    be reattached to any order.
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                disabled={!report || report.orphanedItemsCount === 0 || cleaning}
                onClick={handleCleanupOrphaned}
                startIcon={cleaning ? <CircularProgress size={16} color="inherit" /> : <CleaningServicesIcon />}
                sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 3 }}
              >
                Clean Up
              </Button>
            </CardContent>
          </Card>

          {/* Mismatched orders */}
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {report && report.mismatchedOrders.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 40, mb: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    No mismatched orders. Everything reconciles.
                  </Typography>
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Order</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Current Items</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Items Sum</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Order Total</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Delta</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report?.mismatchedOrders.map((o) => (
                      <TableRow key={o.id} hover>
                        <TableCell sx={{ fontWeight: 700, borderColor }}>{o.orderNumber}</TableCell>
                        <TableCell sx={{ borderColor }}>{o.customerName}</TableCell>
                        <TableCell sx={{ borderColor }}>
                          {o.items.length === 0 ? (
                            <Chip label="No items" size="small" color="error" variant="outlined" />
                          ) : (
                            o.items.map((it, idx) => (
                              <Typography key={idx} variant="body2">
                                {it.itemName} x{it.quantity} (₹{it.priceAtOrder.toFixed(2)})
                              </Typography>
                            ))
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ borderColor }}>₹{o.itemsSum.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ borderColor }}>₹{o.totalAmount.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ borderColor }}>
                          <Chip
                            label={`${o.delta > 0 ? '+' : ''}₹${o.delta.toFixed(2)}`}
                            size="small"
                            color={o.delta === 0 ? 'default' : 'warning'}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ borderColor }}>
                          <Button
                            size="small"
                            startIcon={<EditIcon fontSize="small" />}
                            onClick={() => navigate(`/orders/${o.id}/edit`)}
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                          >
                            Review & Fix
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
