import React, { useState, useEffect } from 'react';
import { api, Item } from '../services/api';
import { ItemForm } from './ItemForm';
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
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  CircularProgress,
  InputAdornment,
  Chip
} from '@mui/material';
import { Edit, Plus, X, Search } from 'lucide-react';

export const ItemDashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await api.getItems();
      setItems(res);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleEditClick = (item: Item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleCreateClick = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    loadItems();
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }} color="text.primary">
            Product Catalog Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure catalog products, ingredient parameters, shelf lives, and pricing.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateClick}
          startIcon={<Plus size={18} />}
        >
          Add New Product
        </Button>
      </Box>

      {/* Main Panel */}
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by product name or ingredient..."
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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={36} color="primary" />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product Details</TableCell>
                  <TableCell>Ingredients</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Shelf Life</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No items found matching filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map(item => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="h5" component="span" sx={{ fontSize: '1.75rem', lineHeight: 1 }}>
                            🍪
                          </Typography>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                              {item.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: #{item.id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 350 }}>
                          {item.ingredients.map((ing, i) => (
                            <Chip
                              key={i}
                              label={ing}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem', height: '22px' }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Rs. {item.price}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.best_before_duration}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleEditClick(item)}
                          startIcon={<Edit size={12} />}
                          sx={{ py: 0.5 }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Edit/Create Dialog */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={() => setShowModal(false)} size="small">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
          <ItemForm initialItem={editingItem} onSuccess={handleFormSuccess} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ItemDashboard;
