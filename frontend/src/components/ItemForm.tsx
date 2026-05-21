import React, { useState, useEffect } from 'react';
import { api, Item } from '../services/api';
import { PlusCircle, Save, Loader } from 'lucide-react';

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

  return (
    <div className="glass-panel" style={{ marginBottom: 0 }}>
      <h2>{initialItem ? 'Edit Item Details' : 'Create New Catalog Item'}</h2>
      <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
        {initialItem ? 'Update details in the catalog' : 'Define cookies, biscuits, and ingredients for the product catalog.'}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="item-name">Item Name *</label>
            <input
              id="item-name"
              type="text"
              placeholder="e.g. Chocolate Crunch Cookie"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-price">Unit Price (INR) *</label>
            <input
              id="item-price"
              type="number"
              step="0.01"
              placeholder="e.g. 120.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="item-ingredients">Ingredients (Comma Separated) *</label>
            <textarea
              id="item-ingredients"
              rows={2}
              placeholder="e.g. Chocolate Chips, Flour, Butter, Sugar"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-expiry">Best Before Duration *</label>
            <select
              id="item-expiry"
              value={bestBefore}
              onChange={(e) => setBestBefore(e.target.value)}
            >
              <option value="5 Days">5 Days</option>
              <option value="7 Days">7 Days</option>
              <option value="10 Days">10 Days</option>
              <option value="15 Days">15 Days</option>
              <option value="30 Days">30 Days</option>
              <option value="3 Months">3 Months</option>
            </select>
          </div>

          <div className="form-group full-width" style={{ marginTop: '0.5rem' }}>
            {error && <div style={{ color: 'var(--status-cancelled)', fontSize: '0.9rem', fontWeight: 500 }}>{error}</div>}
            {successMsg && <div style={{ color: 'var(--status-ready)', fontSize: '0.9rem', fontWeight: 500 }}>{successMsg}</div>}
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  <span>Saving...</span>
                </>
              ) : initialItem ? (
                <>
                  <Save size={18} />
                  <span>Update Item</span>
                </>
              ) : (
                <>
                  <PlusCircle size={18} />
                  <span>Add Item to Catalog</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default ItemForm;
