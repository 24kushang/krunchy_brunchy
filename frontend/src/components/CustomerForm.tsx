import React, { useState } from 'react';
import { api, Customer } from '../services/api';
import { UserPlus, Loader } from 'lucide-react';

interface CustomerFormProps {
  onSuccess?: (customer: Customer) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [gender, setGender] = useState<Customer['gender']>('Prefer Not to Say');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact || !location) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const newCustomer = await api.createCustomer({
        name,
        contact,
        gender,
        location
      });
      setSuccessMsg(`Customer "${newCustomer.name}" created successfully!`);
      setName('');
      setContact('');
      setGender('Prefer Not to Say');
      setLocation('');
      if (onSuccess) {
        onSuccess(newCustomer);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel">
      <h2>Register New Customer</h2>
      <p className="subtitle" style={{ marginBottom: '1.5rem' }}>Add details to analyze demographics and schedule targeted campaigns.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="cust-name">Customer Name *</label>
            <input
              id="cust-name"
              type="text"
              placeholder="e.g. Aarav Mehta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cust-contact">Contact Number (WhatsApp) *</label>
            <input
              id="cust-contact"
              type="tel"
              placeholder="e.g. +919876543210"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cust-gender">Gender</label>
            <select
              id="cust-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as Customer['gender'])}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer Not to Say">Prefer Not to Say</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="cust-location">City / Location *</label>
            <input
              id="cust-location"
              type="text"
              placeholder="e.g. Mumbai"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
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
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Register Customer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default CustomerForm;
