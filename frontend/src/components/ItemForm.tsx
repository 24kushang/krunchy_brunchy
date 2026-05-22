import React, { useState, useEffect } from 'react';
import { api, Item } from '../services/api';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Typography,
  CircularProgress,
  Paper
} from '@mui/material';
import { PlusCircle, Save } from 'lucide-react';

interface ItemFormProps {
  initialItem?: Item | null;
  onSuccess?: (item: Item) => void;
}

export const ItemForm: React.FC<ItemFormProps> = ({ initialItem, onSuccess }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [bestBefore, setBestBefore] = useState('7 Days');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name);
      setPrice(initialItem.price.toString());
      setIngredients(initialItem.ingredients.join(', '));
      setBestBefore(initialItem.best_before_duration);
    } else {
      setName('');
      setPrice('');
      setIngredients('');
      setBestBefore('7 Days');
    }
    setError('');
    setSuccessMsg('');
  }, [initialItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !ingredients || !bestBefore) {
      setError('Please fill in all fields.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid positive price.');
      return;
    }

    // Convert comma-separated ingredients into array, trim spaces
    const ingredientsArray = ingredients
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      let savedItem: Item;
      if (initialItem && initialItem.id) {
        // Edit Mode
        savedItem = await api.updateItem(initialItem.id, {
          name,
          ingredients: ingredientsArray,
          price: priceNum,
          best_before_duration: bestBefore
        });
        setSuccessMsg(`Item "${savedItem.name}" updated successfully!`);
      } else {
        // Create Mode
        savedItem = await api.createItem({
          name,
          ingredients: ingredientsArray,
          price: priceNum,
          best_before_duration: bestBefore
        });
        setSuccessMsg(`Item "${savedItem.name}" created successfully!`);
        setName('');
        setPrice('');
        setIngredients('');
        setBestBefore('7 Days');
      }

      if (onSuccess) {
        onSuccess(savedItem);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save item.');
    } finally {
      setLoading(false);
    }
  };

  const bestBeforeOptions = [
    '5 Days',
    '7 Days',
    '10 Days',
    '15 Days',
    '30 Days',
    '3 Months'
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }} color="text.primary">
        {initialItem ? 'Edit Item Details' : 'Create New Catalog Item'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {initialItem
          ? 'Update details in the catalog'
          : 'Define cookies, biscuits, and ingredients for the product catalog.'}
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <TextField
            fullWidth
            required
            label="Item Name"
            placeholder="e.g. Chocolate Crunch Cookie"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <TextField
            fullWidth
            required
            type="number"
            label="Unit Price (INR)"
            placeholder="e.g. 120.00"
            inputProps={{ step: '0.01', min: '0' }}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Box>

        <TextField
          fullWidth
          required
          multiline
          rows={2}
          label="Ingredients (Comma Separated)"
          placeholder="e.g. Chocolate Chips, Flour, Butter, Sugar"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
        />

        <TextField
          fullWidth
          select
          required
          label="Best Before Duration"
          value={bestBefore}
          onChange={(e) => setBestBefore(e.target.value)}
        >
          {bestBeforeOptions.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>

        {error && (
          <Typography color="error" variant="body2" sx={{ fontWeight: 600 }}>
            {error}
          </Typography>
        )}

        {successMsg && (
          <Typography color="success.main" variant="body2" sx={{ fontWeight: 600 }}>
            {successMsg}
          </Typography>
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : (initialItem ? <Save size={18} /> : <PlusCircle size={18} />)}
          sx={{ alignSelf: 'flex-start', mt: 1 }}
        >
          {loading ? 'Saving...' : (initialItem ? 'Update Item' : 'Add Item to Catalog')}
        </Button>
      </Box>
    </Box>
  );
};

export default ItemForm;
