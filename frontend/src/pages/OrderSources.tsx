import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import api from '../utils/api';

interface OrderSource {
  id: string;
  name: string;
  createdAt: string;
}

export default function OrderSources() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sources, setSources] = useState<OrderSource[]>([]);
  const [loading, setLoading] = useState(true);

  const editParamId = searchParams.get('edit');
  const isNewParam = searchParams.get('new') === '1';

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const initializedModalRef = useRef<string | null>(null);

  const clearModalParams = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    next.delete('new');
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const fetchSources = useCallback(() => {
    setLoading(true);
    api.get('/api/order-sources')
      .then((res) => {
        setSources(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load order sources', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  useEffect(() => {
    if (editParamId) {
      const key = `edit:${editParamId}`;
      if (initializedModalRef.current === key) return;
      const found = sources.find((s) => s.id === editParamId);
      if (found) {
        initializedModalRef.current = key;
        setIsEditMode(true);
        setEditingId(found.id);
        setName(found.name);
        setOpenDialog(true);
      } else if (!loading && sources.length > 0) {
        clearModalParams();
      }
      return;
    }

    if (isNewParam) {
      if (initializedModalRef.current !== 'new') {
        initializedModalRef.current = 'new';
        setIsEditMode(false);
        setEditingId(null);
        setName('');
        setOpenDialog(true);
      }
      return;
    }

    initializedModalRef.current = null;
    setOpenDialog(false);
  }, [editParamId, isNewParam, sources, loading, clearModalParams]);

  const handleCloseDialog = () => {
    initializedModalRef.current = null;
    setOpenDialog(false);
    clearModalParams();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Order source name cannot be empty');
      return;
    }

    try {
      if (isEditMode && editingId) {
        await api.put(`/api/order-sources/${editingId}`, { name });
      } else {
        await api.post('/api/order-sources', { name });
      }
      handleCloseDialog();
      fetchSources();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving order source');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this order source? Orders linked to this source will retain it, but you won\'t be able to select it for new orders.')) {
      return;
    }

    try {
      await api.delete(`/api/order-sources/${id}`);
      fetchSources();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting order source');
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#0A3BB0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon /> Order Sources Configuration
        </Typography>

        <Button
          component={Link}
          to="/order-sources?new=1"
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 3 }}
        >
          Add Source
        </Button>
      </Box>

      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Configure the order sources that admins can select during order creation (e.g. Website, WhatsApp, Phone, Instagram, Walk-in). These sources are saved dynamically in the database.
      </Typography>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading ? (
            <Stack direction="row" sx={{ justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <List disablePadding>
              {sources.map((source, index) => (
                <Box key={source.id}>
                  {index > 0 && <Divider sx={{ borderColor: theme.palette.mode === 'light' ? '#F0EBE5' : '#2D2B29' }} />}
                  <ListItem
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          component={Link}
                          to={`/order-sources?edit=${source.id}`}
                          edge="end"
                          color="primary"
                          sx={{ '&:hover': { bgcolor: 'rgba(10, 59, 176, 0.08)' } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleDelete(source.id)}
                          sx={{ '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.08)' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    }
                    sx={{ py: 2, px: 3 }}
                  >
                    <ListItemText
                      primary={source.name}
                      slotProps={{
                        primary: {
                          sx: { fontWeight: 700, fontSize: '1.05rem' }
                        }
                      }}
                    />
                  </ListItem>
                </Box>
              ))}

              {sources.length === 0 && (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    No custom order sources configured. Add one to get started!
                  </Typography>
                </Box>
              )}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" sx={{ color: '#0A3BB0' }}>
            {isEditMode ? 'Edit Order Source' : 'Add Order Source'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Order Source Name"
              placeholder="e.g. Instagram Shop, WhatsApp Business"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 3, py: 2 }}>
          <Button variant="outlined" onClick={handleCloseDialog} sx={{ borderRadius: 3 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 3 }}
          >
            Save Source
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
