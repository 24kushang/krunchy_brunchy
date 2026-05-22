import React, { useState } from 'react';
import { api, Customer } from '../services/api';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  Typography,
  CircularProgress,
  Paper
} from '@mui/material';
import { UserPlus } from 'lucide-react';

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

  const genderOptions = [
    'Male',
    'Female',
    'Other',
    'Prefer Not to Say'
  ];

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }} color="text.primary">
        Register New Customer
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add details to analyze demographics and schedule targeted campaigns.
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Customer Name"
              placeholder="e.g. Aarav Mehta"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              type="tel"
              label="Contact Number (WhatsApp)"
              placeholder="e.g. +919876543210"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as Customer['gender'])}
            >
              {genderOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="City / Location"
              placeholder="e.g. Mumbai"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            {error && (
              <Typography color="error" variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                {error}
              </Typography>
            )}

            {successMsg && (
              <Typography color="success.main" variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                {successMsg}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <UserPlus size={18} />}
              sx={{ py: 1, px: 3 }}
            >
              {loading ? 'Saving...' : 'Register Customer'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default CustomerForm;
