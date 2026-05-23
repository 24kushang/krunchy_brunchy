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
  IconButton,
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
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
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
  Tooltip
} from 'recharts';
import api from '../utils/api';

interface Item {
  id: string;
  name: string;
  ingredients: string[];
  bestBeforeDays: number;
  imageUrl: string;
  activePrice: number;
}

interface PriceHistoryEntry {
  id: string;
  price: number;
  changedAt: string;
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
  const [bestBeforeDays, setBestBeforeDays] = useState<number | ''>('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Price History States
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
        // Map history to simple objects for Recharts
        const formatted = res.data.map((h: any) => ({
          ...h,
          price: parseFloat(h.price),
          date: new Date(h.changedAt).toLocaleDateString(),
        }));
        setPriceHistory(formatted);
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
    setBestBeforeDays(item.bestBeforeDays);
    setIngredients(item.ingredients || []);
    setImageUrl(item.imageUrl || '');
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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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

    const payload = {
      name,
      price: Number(price),
      bestBeforeDays: Number(bestBeforeDays),
      ingredients,
      imageUrl,
    };

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
          InputProps={{
            endAdornment: <SearchIcon color="action" />
          }}
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
                  '&:hover': {
                    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.05)',
                  },
                }}
              >
                {item.imageUrl ? (
                  <CardMedia
                    component="img"
                    height="160"
                    image={item.imageUrl}
                    alt={item.name}
                  />
                ) : (
                  <Box sx={{ height: 160, bgcolor: 'rgba(255, 90, 9, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h2">🍿</Typography>
                  </Box>
                )}

                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography variant="h6" sx={{ fontFamily: '"Fredoka", sans-serif', fontWeight: 700, mb: 1 }}>
                    {item.name}
                  </Typography>

                  <Typography variant="h5" color="primary" sx={{ fontWeight: 800, mb: 2 }}>
                    Rs. {item.activePrice.toFixed(2)}
                  </Typography>

                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                    Expiry Cycle: **{item.bestBeforeDays} Days**
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                    Ingredients:
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ gap: 0.5 }}>
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
                <Typography color="textSecondary">
                  No items found in active inventory.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Dialog for Item Create / Update */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h5" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#0A3BB0' }}>
            {isEditMode ? 'Update Inventory Item' : 'Introduce New Snack Item'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Grid container spacing={3}>
            {/* Form Fields */}
            <Grid size={{ xs: 12, md: isEditMode ? 6 : 12 }}>
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
                      label="Active Price (Rs.)"
                      type="number"
                      fullWidth
                      value={price}
                      onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Best Before Duration (Days)"
                      type="number"
                      fullWidth
                      value={bestBeforeDays}
                      onChange={(e) => setBestBeforeDays(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                    />
                  </Grid>
                </Grid>

                {/* Autocomplete Chip Component for Ingredients */}
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={ingredients}
                  onChange={(event, newValue) => setIngredients(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Ingredients (Type & press Enter)" placeholder="Add ingredients..." />
                  )}
                />

                {/* Google Drive Upload Component */}
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

            {/* Price History Line Chart (Edit Mode Only) */}
            {isEditMode && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GraphIcon color="primary" />
                  Historical Value Adjustments
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
                  <Box sx={{ height: 260, width: '100%', pr: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={priceHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" fontSize={10} tickLine={false} />
                        <YAxis fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#FF5A09"
                          strokeWidth={3}
                          activeDot={{ r: 6 }}
                          name="Price (Rs.)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
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
