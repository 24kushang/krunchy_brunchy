import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  Button,
  TextField,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  useTheme
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import DoneIcon from '@mui/icons-material/Done';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import api from '../utils/api';

interface Hub {
  id: string;
  name: string;
}

interface ItemStock {
  itemId: string;
  itemName: string;
  stocks: Record<string, number>; // hubId -> quantity
}

interface FIFOOrderItem {
  itemId: string;
  itemName: string;
  quantityRequested: number;
  quantityAllocated: number;
  deficit: number;
  status: 'Allocated' | 'Partially Allocated' | 'Out of Stock';
}

interface FIFOOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  createdAt: string;
  hubId: string;
  hubName: string;
  items: FIFOOrderItem[];
  allocationStatus: 'Fully Allocated' | 'Partially Allocated' | 'Unallocated';
}

interface Shortage {
  itemId: string;
  itemName: string;
  requiredToProduce: number;
}

export default function InventoryPlanner() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0); // 0 = Stock Management, 1 = FIFO Planner
  const [loading, setLoading] = useState(true);

  // Tab A - Stock States
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [itemStocks, setItemStocks] = useState<ItemStock[]>([]);
  
  // Tab B - FIFO Planning States
  const [fifoOrders, setFifoOrders] = useState<FIFOOrder[]>([]);
  const [shortages, setShortages] = useState<Shortage[]>([]);

  // Adjustment Dialog States
  const [openAdjust, setOpenAdjust] = useState(false);
  const [adjustItem, setAdjustItem] = useState<{ itemId: string; name: string } | null>(null);
  const [adjustHubId, setAdjustHubId] = useState('');
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const fetchStockData = () => {
    setLoading(true);
    api.get('/api/inventories')
      .then((res) => {
        setHubs(res.data.locations || []);
        setItemStocks(res.data.itemStocks || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch stock data', err);
        setLoading(false);
      });
  };

  const fetchFIFOPlanning = () => {
    setLoading(true);
    api.get('/api/inventories/planning')
      .then((res) => {
        setFifoOrders(res.data.ordersPlanning || []);
        setShortages(res.data.shortages || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch FIFO planner data', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 0) {
      fetchStockData();
    } else {
      fetchFIFOPlanning();
    }
  }, [activeTab]);

  const handleOpenAdjust = (item: ItemStock) => {
    setAdjustItem({ itemId: item.itemId, name: item.itemName });
    if (hubs.length > 0) {
      setAdjustHubId(hubs[0].id);
      setAdjustQuantity(item.stocks[hubs[0].id] || 0);
    }
    setOpenAdjust(true);
  };

  const handleHubChangeInAdjust = (hubId: string) => {
    setAdjustHubId(hubId);
    if (adjustItem) {
      const currentItem = itemStocks.find(i => i.itemId === adjustItem.itemId);
      if (currentItem) {
        setAdjustQuantity(currentItem.stocks[hubId] || 0);
      }
    }
  };

  const handleSaveAdjust = async () => {
    if (!adjustItem || !adjustHubId) return;
    if (adjustQuantity < 0) {
      alert('Quantity cannot be negative');
      return;
    }

    setSubmittingAdjust(true);
    try {
      await api.patch('/api/inventories/adjust', {
        itemId: adjustItem.itemId,
        locationId: adjustHubId,
        quantity: Number(adjustQuantity) });
      setOpenAdjust(false);
      fetchStockData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const getOrderBadgeColor = (status: string) => {
    switch (status) {
      case 'Fully Allocated': return { bg: 'rgba(76, 175, 80, 0.1)', fg: '#4caf50' };
      case 'Partially Allocated': return { bg: 'rgba(255, 152, 0, 0.1)', fg: '#ff9800' };
      case 'Unallocated': return { bg: 'rgba(244, 67, 54, 0.1)', fg: '#f44336' };
      default: return { bg: 'rgba(120, 120, 120, 0.1)', fg: '#757575' };
    }
  };

  const getItemBadgeColor = (status: string) => {
    switch (status) {
      case 'Allocated': return { bg: 'rgba(76, 175, 80, 0.08)', fg: '#4caf50' };
      case 'Partially Allocated': return { bg: 'rgba(255, 152, 0, 0.08)', fg: '#ff9800' };
      case 'Out of Stock': return { bg: 'rgba(244, 67, 54, 0.08)', fg: '#f44336' };
      default: return { bg: 'rgba(120, 120, 120, 0.08)', fg: '#757575' };
    }
  };

  return (
    <Box>
      {/* Top Header Section with Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" sx={{ color: '#0A3BB0', fontWeight: 700 }}>
          Inventory Planner
        </Typography>

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Tabs
            value={activeTab}
            onChange={(_e, val) => setActiveTab(val)}
            sx={{
              bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120',
              borderRadius: 3,
              p: 0.5,
              minHeight: 0,
              '& .MuiTabs-indicator': { display: 'none' } }}
          >
            <Tab icon={<WarehouseIcon sx={{ fontSize: 18 }} />} label="Stock Levels" sx={{ minHeight: 0, py: 1, borderRadius: 2, '&.Mui-selected': { bgcolor: '#FF5A09', color: '#FFF' } }} />
            <Tab icon={<FormatListNumberedIcon sx={{ fontSize: 18 }} />} label="FIFO Production" sx={{ minHeight: 0, py: 1, borderRadius: 2, '&.Mui-selected': { bgcolor: '#FF5A09', color: '#FFF' } }} />
          </Tabs>

          <Button
            variant="outlined"
            onClick={() => (activeTab === 0 ? fetchStockData() : fetchFIFOPlanning())}
            sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, p: 1 }}
          >
            <RefreshIcon />
          </Button>
        </Stack>
      </Box>

      {loading ? (
        <Stack direction="row" sx={{ justifyContent: 'center', py: 12 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : activeTab === 0 ? (
        /* Tab A: Stock Management */
        <Box>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Review stock levels across different warehouse locations. Click adjust next to an item to set new stock counts.
          </Typography>

          <TableContainer component={Paper} sx={{ borderRadius: 4, border: `1px solid ${theme.palette.mode === 'light' ? '#EFEAE4' : '#2C2A28'}` }}>
            <Table>
              <TableHead sx={{ bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Snack Item</TableCell>
                  {hubs.map((hub) => (
                    <TableCell key={hub.id} align="right" sx={{ fontWeight: 800 }}>
                      {hub.name} Stock (Units)
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itemStocks.map((item) => (
                  <TableRow key={item.itemId} hover>
                    <TableCell sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                      {item.itemName}
                    </TableCell>
                    {hubs.map((hub) => {
                      const qty = item.stocks[hub.id] || 0;
                      return (
                        <TableCell key={hub.id} align="right">
                          <Chip
                            label={qty}
                            color={qty > 5 ? 'default' : qty > 0 ? 'warning' : 'error'}
                            variant={qty > 0 ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenAdjust(item)}
                        sx={{ borderRadius: 2 }}
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {itemStocks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={hubs.length + 2} align="center" sx={{ py: 6 }}>
                      No snack items found in the database. Populate catalog items first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        /* Tab B: FIFO Planner */
        <Box>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Simulates stock allocation chronologically (FIFO - First In First Out) for all uncompleted orders. It determines which orders are fully stocked, which are missing items, and aggregates shortages to calculate production requirements.
          </Typography>

          <Grid container spacing={3}>
            {/* Left Column: Aggregated Shortages */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: '2px solid #0A3BB0', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ color: '#0A3BB0', mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormatListNumberedIcon /> Production Required List
                  </Typography>

                  <Divider sx={{ mb: 2.5 }} />

                  {shortages.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <DoneIcon sx={{ color: '#4caf50', fontSize: 48, mb: 1.5 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#4caf50' }}>
                        All Set!
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Existing stocks cover all uncompleted orders. No production required.
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={2}>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                        The following items are in deficit and must be produced or procured to fulfill current backlog:
                      </Typography>
                      {shortages.map((item) => (
                        <Box
                          key={item.itemId}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1.5,
                            borderRadius: 3,
                            bgcolor: 'rgba(255, 90, 9, 0.03)',
                            border: '1px solid rgba(255, 90, 9, 0.12)'
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {item.itemName}
                          </Typography>
                          <Chip
                            label={`+ ${item.requiredToProduce} units`}
                            color="error"
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Right Column: Order Allocation Queue */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="h6" sx={{ color: '#0A3BB0', mb: 2, px: 0.5 }}>
                Chronological Order Queue (FIFO Allocation)
              </Typography>

              <Stack spacing={2.5}>
                {fifoOrders.map((order) => {
                  const colors = getOrderBadgeColor(order.allocationStatus);
                  return (
                    <Card
                      key={order.orderId}
                      sx={{
                        border: `1px solid ${theme.palette.mode === 'light' ? '#EFEAE4' : '#2C2A28'}`,
                        position: 'relative',
                        '&:hover': {
                          boxShadow: '0px 4px 15px rgba(0,0,0,0.05)'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        {/* Order Hub Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                              {order.orderNumber} — {order.customerName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Order Logged: {new Date(order.createdAt).toLocaleString()} | Assigned Hub: **{order.hubName}**
                            </Typography>
                          </Box>
                          <Chip
                            label={order.allocationStatus}
                            size="small"
                            sx={{ bgcolor: colors.bg, color: colors.fg, fontWeight: 'bold' }}
                          />
                        </Box>

                        <Divider sx={{ mb: 2 }} />

                        {/* Order Items stock checks */}
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
                          ALLOCATION DETAILS:
                        </Typography>
                        <Grid container spacing={2}>
                          {order.items.map((item) => {
                            const badge = getItemBadgeColor(item.status);
                            return (
                              <Grid size={{ xs: 12, sm: 6 }} key={item.itemId}>
                                <Box
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 2.5,
                                    border: `1px solid ${theme.palette.divider}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                >
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                      {item.itemName}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                      Requested: {item.quantityRequested} | Allocated: {item.quantityAllocated}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={item.status}
                                    size="small"
                                    sx={{ bgcolor: badge.bg, color: badge.fg, fontWeight: 'bold', fontSize: '0.7rem' }}
                                  />
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </CardContent>
                    </Card>
                  );
                })}

                {fifoOrders.length === 0 && (
                  <Card sx={{ border: `1px dashed rgba(120, 120, 120, 0.2)`, py: 8 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="textSecondary">
                        No uncompleted/active orders found. Create pending orders first.
                      </Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Adjust Stock Dialog */}
      <Dialog open={openAdjust} onClose={() => setOpenAdjust(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" sx={{ color: '#0A3BB0' }}>
            Adjust Stock Level
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {adjustItem && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Typography variant="body2">
                Setting new inventory counts for snack **{adjustItem.name}**.
              </Typography>

              <FormControl fullWidth>
                <InputLabel>Fulfillment Location</InputLabel>
                <Select
                  value={adjustHubId}
                  label="Fulfillment Location"
                  onChange={(e) => handleHubChangeInAdjust(e.target.value)}
                >
                  {hubs.map((hub) => (
                    <MenuItem key={hub.id} value={hub.id}>
                      {hub.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Stock Quantity (Units)"
                type="number"
                fullWidth
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                required
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 3, py: 2 }}>
          <Button variant="outlined" onClick={() => setOpenAdjust(false)} sx={{ borderRadius: 3 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAdjust}
            disabled={submittingAdjust}
            sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 3 }}
          >
            {submittingAdjust ? 'Updating...' : 'Save Stock'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
