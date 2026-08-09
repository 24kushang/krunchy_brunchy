import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  Autocomplete,
  CircularProgress,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/CloudUpload';
import GraphIcon from '@mui/icons-material/TrendingUp';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import api from '../utils/api';

interface Item {
  id: string;
  name: string;
  ingredients: string[];
  bestBeforeDays: number;
  imageUrl: string;
  activePrice: number;
  activeCostPrice: number | null;
  activeMarginPercent: number | null;
}

interface PriceHistoryEntry {
  id: string;
  price: number;
  costPrice: number | null;
  marginPercent: number | null;
  changedAt: string;
}

/** Color coding for margin chips */
function marginColor(pct: number | null): 'success' | 'warning' | 'error' | 'default' {
  if (pct === null) return 'default';
  if (pct >= 30) return 'success';
  if (pct >= 10) return 'warning';
  return 'error';
}

export default function Items() {
  const theme = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog / Modal Form States
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [bestBeforeDays, setBestBeforeDays] = useState<number | ''>('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Price History States
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Inline edit state for price history rows
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryPrice, setEditEntryPrice] = useState<number | ''>('');
  const [editEntryCost, setEditEntryCost] = useState<number | ''>('');
  const [editEntryDate, setEditEntryDate] = useState<string>('');

  const formatForDateTimeInput = (isoStr?: string | null) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localDate = new Date(d.getTime() - tzOffset);
      return localDate.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const fetchItems = () => {
    setLoading(true);
    api.get(`/api/items?search=${encodeURIComponent(search)}`)
      .then((res) => {
        setItems(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load items', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchItems();
    }, 450);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Load price history timeline
  const fetchPriceHistory = (itemId: string) => {
    setLoadingHistory(true);
    api.get(`/api/items/${itemId}/price-history`)
      .then((res) => {
        setPriceHistory(res.data);
        setLoadingHistory(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingHistory(false);
      });
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingItemId(null);
    setName('');
    setPrice('');
    setCostPrice('');
    setBestBeforeDays('');
    setIngredients([]);
    setImageUrl('');
    setPriceHistory([]);
    setOpenDialog(true);
  };

  const handleOpenEdit = (item: Item) => {
    setIsEditMode(true);
    setEditingItemId(item.id);
    setName(item.name);
    setPrice(item.activePrice);
    setCostPrice(item.activeCostPrice !== null ? item.activeCostPrice : '');
    setBestBeforeDays(item.bestBeforeDays);
    setIngredients(item.ingredients || []);
    setImageUrl(item.imageUrl || '');
    setPriceHistory([]);
    setEditingEntryId(null);
    setOpenDialog(true);
    fetchPriceHistory(item.id);
  };

  // Google Drive File Upload Handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(res.data.url);
    } catch (err) {
      console.error('File upload failed', err);
      alert('Upload failed. Using simulated default.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || price === '' || bestBeforeDays === '') {
      alert('Please fill in all required fields');
      return;
    }

    const payload: Record<string, any> = {
      name,
      price: Number(price),
      bestBeforeDays: Number(bestBeforeDays),
      ingredients,
      imageUrl,
    };
    if (costPrice !== '') payload.costPrice = Number(costPrice);

    try {
      if (isEditMode && editingItemId) {
        await api.put(`/api/items/${editingItemId}`, payload);
      } else {
        await api.post('/api/items', payload);
      }
      setOpenDialog(false);
      fetchItems();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save item');
    }
  };

  // Start editing a price history row inline
  const startEditEntry = (entry: PriceHistoryEntry) => {
    setEditingEntryId(entry.id);
    setEditEntryPrice(entry.price);
    setEditEntryCost(entry.costPrice !== null ? entry.costPrice : '');
    setEditEntryDate(formatForDateTimeInput(entry.changedAt));
  };

  const cancelEditEntry = () => {
    setEditingEntryId(null);
    setEditEntryPrice('');
    setEditEntryCost('');
    setEditEntryDate('');
  };

  const saveEditEntry = async (entryId: string) => {
    const payload: Record<string, any> = {};
    if (editEntryPrice !== '') payload.price = Number(editEntryPrice);
    if (editEntryCost !== '') payload.costPrice = Number(editEntryCost);
    else payload.costPrice = null; // explicitly clear if left blank
    if (editEntryDate) payload.changedAt = new Date(editEntryDate).toISOString();

    try {
      await api.patch(`/api/items/price-history/${entryId}`, payload);
      // Refresh history
      if (editingItemId) fetchPriceHistory(editingItemId);
      cancelEditEntry();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update price history entry');
    }
  };

  // Chart data: map to Recharts format
  const chartData = priceHistory.map((h) => ({
    date: new Date(h.changedAt).toLocaleDateString(),
    price: h.price,
    cost: h.costPrice,
  }));

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search inventory items..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 300 } }}
          slotProps={{ input: { endAdornment: <SearchIcon color="action" /> } }}
        />

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' } }}
        >
          Add Catalog Item
        </Button>
      </Box>

      {/* Item grid */}
      {loading ? (
        <Stack direction="row" sx={{ justifyContent: 'center', py: 12 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : (
        <Grid container spacing={3}>
          {items.map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  '&:hover': { boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.05)' },
                }}
              >
                {item.imageUrl ? (
                  <CardMedia component="img" height="160" image={item.imageUrl} alt={item.name} />
                ) : (
                  <Box sx={{ height: 160, bgcolor: 'rgba(255, 90, 9, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h2">🍿</Typography>
                  </Box>
                )}

                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {item.name}
                  </Typography>

                  {/* Pricing row */}
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                    <Typography variant="h5" color="primary" sx={{ fontWeight: 800 }}>
                      Rs. {item.activePrice.toFixed(2)}
                    </Typography>
                    {item.activeCostPrice !== null && (
                      <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
                        Cost: Rs. {item.activeCostPrice.toFixed(2)}
                      </Typography>
                    )}
                  </Stack>

                  {/* Margin chip */}
                  {item.activeMarginPercent !== null ? (
                    <Chip
                      label={`Margin: ${item.activeMarginPercent.toFixed(1)}%`}
                      size="small"
                      color={marginColor(item.activeMarginPercent)}
                      variant="filled"
                      sx={{ fontWeight: 700, mb: 1.5, fontSize: '0.72rem' }}
                    />
                  ) : (
                    <Chip
                      label="Margin: —"
                      size="small"
                      color="default"
                      variant="outlined"
                      sx={{ mb: 1.5, fontSize: '0.72rem' }}
                    />
                  )}

                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                    Expiry Cycle: **{item.bestBeforeDays} Days**
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                    Ingredients:
                  </Typography>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    {item.ingredients?.map((ing) => (
                      <Chip key={ing} label={ing} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                    ))}
                    {(!item.ingredients || item.ingredients.length === 0) && (
                      <Typography variant="caption" color="textSecondary">No ingredients logged</Typography>
                    )}
                  </Stack>
                </CardContent>

                <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenEdit(item)}
                    sx={{ borderRadius: 2 }}
                  >
                    Edit / Price History
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}

          {items.length === 0 && (
            <Grid size={12}>
              <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'transparent', border: '1px dashed #EFEAE4' }}>
                <Typography color="textSecondary">No items found in active inventory.</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Dialog for Item Create / Update */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h5" sx={{ color: '#0A3BB0' }}>
            {isEditMode ? 'Update Inventory Item' : 'Introduce New Snack Item'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Grid container spacing={3}>
            {/* Form Fields */}
            <Grid size={{ xs: 12, md: isEditMode ? 4 : 12 }}>
              <Stack spacing={2.5}>
                <TextField
                  label="Item Name"
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField
                      label="Selling Price (Rs.)"
                      type="number"
                      fullWidth
                      value={price}
                      onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Cost Price (Rs.) — optional"
                      type="number"
                      fullWidth
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      helperText={
                        price !== '' && costPrice !== ''
                          ? `Margin: ${(((Number(price) - Number(costPrice)) / Number(price)) * 100).toFixed(1)}%`
                          : undefined
                      }
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Best Before Duration (Days)"
                  type="number"
                  fullWidth
                  value={bestBeforeDays}
                  onChange={(e) => setBestBeforeDays(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />

                {/* Autocomplete Chip Component for Ingredients */}
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={ingredients}
                  onChange={(_event, newValue: string[]) => setIngredients(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Ingredients (Type & press Enter)" placeholder="Add ingredients..." />
                  )}
                />

                {/* Google Drive Upload */}
                <Box>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
                    Snack Catalog Photo (Upload to Google Drive)
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading to Drive...' : 'Upload File'}
                      <input type="file" hidden accept="image/*,video/*" onChange={handleFileUpload} />
                    </Button>
                    {imageUrl && (
                      <Chip
                        label="Drive File Configured"
                        color="success"
                        variant="outlined"
                        onDelete={() => setImageUrl('')}
                        sx={{ maxWidth: 200 }}
                      />
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Grid>

            {/* Price History (Edit Mode Only) */}
            {isEditMode && (
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GraphIcon color="primary" />
                  Historical Price & Cost
                </Typography>

                {loadingHistory ? (
                  <Stack direction="row" sx={{ justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={30} />
                  </Stack>
                ) : priceHistory.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 6 }}>
                    No pricing history logged yet.
                  </Typography>
                ) : (
                  <>
                    {/* Dual-line chart: selling price + cost price */}
                    <Box sx={{ height: 220, width: '100%', mb: 3 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" fontSize={10} tickLine={false} />
                          <YAxis fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                          <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke="#FF5A09"
                            strokeWidth={3}
                            activeDot={{ r: 6 }}
                            name="Selling Price (Rs.)"
                          />
                          <Line
                            type="monotone"
                            dataKey="cost"
                            stroke="#0A3BB0"
                            strokeWidth={2}
                            strokeDasharray="5 3"
                            activeDot={{ r: 5 }}
                            name="Cost Price (Rs.)"
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>

                    {/* Editable history table */}
                    <TableContainer
                      component={Paper}
                      variant="outlined"
                      sx={{ maxHeight: 280, overflow: 'auto', borderRadius: 2 }}
                    >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ '& th': { fontWeight: 800, bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120' } }}>
                            <TableCell>Date</TableCell>
                            <TableCell align="right">Selling (Rs.)</TableCell>
                            <TableCell align="right">Cost (Rs.)</TableCell>
                            <TableCell align="right">Margin %</TableCell>
                            <TableCell align="center">Edit</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {[...priceHistory].reverse().map((entry) => {
                            const isRowEditing = editingEntryId === entry.id;
                            return (
                              <TableRow key={entry.id} hover>
                                <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                  {isRowEditing ? (
                                    <TextField
                                      size="small"
                                      type="datetime-local"
                                      value={editEntryDate}
                                      onChange={(e) => setEditEntryDate(e.target.value)}
                                      slotProps={{ htmlInput: { style: { fontSize: '0.75rem', padding: '4px 6px' } } }}
                                    />
                                  ) : (
                                    new Date(entry.changedAt).toLocaleString()
                                  )}
                                </TableCell>

                                {isRowEditing ? (
                                  <>
                                    <TableCell align="right">
                                      <TextField
                                        size="small"
                                        type="number"
                                        value={editEntryPrice}
                                        onChange={(e) => setEditEntryPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                        sx={{ width: 90 }}
                                        slotProps={{ htmlInput: { style: { fontSize: '0.78rem' } } }}
                                      />
                                    </TableCell>
                                    <TableCell align="right">
                                      <TextField
                                        size="small"
                                        type="number"
                                        placeholder="—"
                                        value={editEntryCost}
                                        onChange={(e) => setEditEntryCost(e.target.value === '' ? '' : Number(e.target.value))}
                                        sx={{ width: 90 }}
                                        slotProps={{ htmlInput: { style: { fontSize: '0.78rem' } } }}
                                      />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.78rem', color: 'textSecondary' }}>
                                      {editEntryPrice !== '' && editEntryCost !== '' && Number(editEntryPrice) > 0
                                        ? `${(((Number(editEntryPrice) - Number(editEntryCost)) / Number(editEntryPrice)) * 100).toFixed(1)}%`
                                        : '—'}
                                    </TableCell>
                                    <TableCell align="center">
                                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                                        <Tooltip title="Save">
                                          <IconButton size="small" color="success" onClick={() => saveEditEntry(entry.id)}>
                                            <SaveIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Cancel">
                                          <IconButton size="small" onClick={cancelEditEntry}>
                                            <CancelIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </Stack>
                                    </TableCell>
                                  </>
                                ) : (
                                  <>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#FF5A09', fontSize: '0.82rem' }}>
                                      {entry.price.toFixed(2)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.82rem' }}>
                                      {entry.costPrice !== null ? entry.costPrice.toFixed(2) : '—'}
                                    </TableCell>
                                    <TableCell align="right">
                                      {entry.marginPercent !== null ? (
                                        <Chip
                                          label={`${entry.marginPercent.toFixed(1)}%`}
                                          size="small"
                                          color={marginColor(entry.marginPercent)}
                                          variant="filled"
                                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                                        />
                                      ) : (
                                        <Typography variant="caption" color="textSecondary">—</Typography>
                                      )}
                                    </TableCell>
                                    <TableCell align="center">
                                      <Tooltip title="Edit this entry">
                                        <IconButton size="small" onClick={() => startEditEntry(entry)}>
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 3, py: 2 }}>
          <Button variant="outlined" onClick={() => setOpenDialog(false)} sx={{ borderRadius: 3 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 3 }}>
            Save Item Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
