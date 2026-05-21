import React, { useState, useEffect } from 'react';
import { api, Item } from '../services/api';
import { ItemForm } from './ItemForm';
import { Edit, Plus, X, Loader, Search } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Product Catalog Manager</h2>
          <p className="subtitle" style={{ margin: 0 }}>Configure catalog products, ingredient parameters, shelf lives, and pricing.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateClick}>
          <Plus size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
            <input
              type="text"
              placeholder="Search by product name or ingredient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-dark)' }} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Ingredients</th>
                  <th>Unit Price</th>
                  <th>Shelf Life</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-dark)', padding: '2rem' }}>
                      No items found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.75rem' }}>🍪</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{item.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dark)' }}>ID: #{item.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '350px' }}>
                          {item.ingredients.map((ing, i) => (
                            <span 
                              key={i} 
                              style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px' }}
                            >
                              {ing}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Rs. {item.price}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{item.best_before_duration}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          onClick={() => handleEditClick(item)}
                        >
                          <Edit size={12} />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit/Create Modal Overlay */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <X size={20} />
            </button>
            <ItemForm initialItem={editingItem} onSuccess={handleFormSuccess} />
          </div>
        </div>
      )}
    </div>
  );
};
export default ItemDashboard;
