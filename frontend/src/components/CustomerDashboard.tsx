import React, { useState, useEffect } from 'react';
import { api, Customer, CustomerAnalytics } from '../services/api';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  CircularProgress,
  InputAdornment,
  Avatar
} from '@mui/material';
import {
  Users,
  MapPin,
  MessageSquareShare,
  Search,
  Send,
  X
} from 'lucide-react';
import { ToastMessage } from './WhatsAppToast';

interface CustomerDashboardProps {
  onWhatsAppTriggered: (toast: ToastMessage) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ onWhatsAppTriggered }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  // Promotion Modal States
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [sendingPromo, setSendingPromo] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const custRes = await api.getCustomers();
      setCustomers(custRes);
      const analyticRes = await api.getCustomerAnalytics();
      setAnalytics(analyticRes);
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectToggle = (contact: string) => {
    if (selectedContacts.includes(contact)) {
      setSelectedContacts(selectedContacts.filter(c => c !== contact));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const handleSelectAll = (filteredCusts: Customer[]) => {
    const allFilteredContacts = filteredCusts.map(c => c.contact);
    const areAllSelected = allFilteredContacts.every(c => selectedContacts.includes(c));

    if (areAllSelected) {
      // Unselect all filtered
      setSelectedContacts(selectedContacts.filter(c => !allFilteredContacts.includes(c)));
    } else {
      // Select all filtered (without duplicating)
      const merged = Array.from(new Set([...selectedContacts, ...allFilteredContacts]));
      setSelectedContacts(merged);
    }
  };

  const handleSendPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedContacts.length === 0 || !promoMessage) {
      alert('Please select recipients and compose a message.');
      return;
    }

    setSendingPromo(true);
    try {
      const response = await api.sendWhatsAppPromotion(selectedContacts, promoMessage);

      if (response.success) {
        // Trigger simulation toast showing dispatch message details
        onWhatsAppTriggered({
          id: Math.random().toString(),
          recipient: `${selectedContacts.length} recipients`,
          message: `Campaign Message:\n"${promoMessage}"`,
          templateType: 'Promotion',
          status: 'Simulated',
          timestamp: new Date()
        });

        alert(`Promotion blast dispatched successfully to ${selectedContacts.length} recipients!`);
        setSelectedContacts([]);
        setPromoMessage('');
        setShowPromoModal(false);
      }
    } catch (err: any) {
      alert(`Blast failed: ${err.message}`);
    } finally {
      setSendingPromo(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact.includes(searchQuery) ||
    c.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Top Header Row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }} color="text.primary">
            Customer CRM & Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Understand demographics, track top patrons, and broadcast promotional campaigns.
          </Typography>
        </Box>

        {selectedContacts.length > 0 && (
          <Button
            variant="contained"
            onClick={() => setShowPromoModal(true)}
            startIcon={<MessageSquareShare size={18} />}
            sx={{
              backgroundColor: '#25d366',
              color: 'white',
              '&:hover': {
                backgroundColor: '#128c7e'
              }
            }}
          >
            Send Promotion ({selectedContacts.length})
          </Button>
        )}
      </Box>

      {loading && !analytics ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress size={36} color="primary" />
        </Box>
      ) : (
        <>
          {/* Charts/Analytics Panel */}
          {analytics && (
            <Grid container spacing={3}>
              {/* Total Summary CRM Panel */}
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderRight: { xs: 'none', sm: '1px solid' },
                    borderColor: 'divider',
                    pr: { xs: 0, sm: 3 },
                    pb: { xs: 2, sm: 0 },
                    minWidth: 180
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Total Registered Customers
                    </Typography>
                    <Typography variant="h1" color="primary" sx={{ fontSize: '3.5rem', fontWeight: 800, mt: 0.5 }}>
                      {analytics.totalCustomers}
                    </Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Top Spending Patrons
                    </Typography>
                    <TableContainer sx={{ maxHeight: 150, overflowY: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ py: 0.75, fontSize: '0.8rem' }}>Name</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.8rem' }}>Contact</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.8rem' }}>Orders</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.8rem' }}>Total Spent</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analytics.topCustomers?.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 2 }}>
                                No orders logged yet
                              </TableCell>
                            </TableRow>
                          ) : (
                            analytics.topCustomers?.map((tc, idx) => (
                              <TableRow key={idx} hover>
                                <TableCell sx={{ py: 0.75, fontSize: '0.8rem', fontWeight: 600 }}>{tc.name}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.8rem' }}>{tc.contact}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.8rem' }}>{tc.order_count}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.8rem', color: 'primary.main', fontWeight: 700 }}>
                                  Rs. {parseFloat(tc.total_spent as any).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Paper>
              </Grid>

              {/* Geographic Analytics Chart */}
              <Grid item xs={12} sm={6} md={2.5}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                    Location Demographics
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {analytics.locations?.map((loc, idx) => {
                      const percentage = analytics.totalCustomers > 0 ? (loc.value / analytics.totalCustomers) * 100 : 0;
                      return (
                        <Box key={idx}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{loc.label}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {loc.value} ({percentage.toFixed(0)}%)
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            color="info"
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>
              </Grid>

              {/* Gender Representation Panel */}
              <Grid item xs={12} sm={6} md={2.5}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                    Gender Splits
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {analytics.genders?.map((gen, idx) => {
                      const percentage = analytics.totalCustomers > 0 ? (gen.value / analytics.totalCustomers) * 100 : 0;
                      return (
                        <Box key={idx}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{gen.label}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {gen.value} ({percentage.toFixed(0)}%)
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            color="warning"
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* CRM List View */}
          <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Customer CRM Registry
              </Typography>

              <TextField
                size="small"
                placeholder="Filter by name, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: { xs: '100%', sm: 300 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedContacts.length > 0 && selectedContacts.length < filteredCustomers.length}
                        checked={filteredCustomers.length > 0 && filteredCustomers.every(c => selectedContacts.includes(c.contact))}
                        onChange={() => handleSelectAll(filteredCustomers)}
                      />
                    </TableCell>
                    <TableCell>Client Profile</TableCell>
                    <TableCell>Contact Info</TableCell>
                    <TableCell>Gender</TableCell>
                    <TableCell>City / Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No customers matched filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map(cust => {
                      const isSelected = selectedContacts.includes(cust.contact);
                      return (
                        <TableRow
                          key={cust.id}
                          hover
                          selected={isSelected}
                          sx={{
                            '&.Mui-selected': {
                              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(37, 211, 102, 0.05)' : 'rgba(37, 211, 102, 0.03)',
                              '&:hover': {
                                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(37, 211, 102, 0.08)' : 'rgba(37, 211, 102, 0.05)',
                              }
                            }
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleSelectToggle(cust.contact)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'action.hover', color: 'primary.main' }}>
                                <Users size={16} />
                              </Avatar>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {cust.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>
                            {cust.contact}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {cust.gender}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                              <MapPin size={14} />
                              <Typography variant="body2">
                                {cust.location}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* Promotion Blast Modal Dialog */}
      <Dialog
        open={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            WhatsApp Promotion Blast
          </Typography>
          <IconButton onClick={() => setShowPromoModal(false)} size="small">
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pb: 1, pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Send custom notifications, launch promotions, or broadcast campaign deals.
          </Typography>

          <Box component="form" onSubmit={handleSendPromotion} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Targets selection list */}
            <Box sx={{
              backgroundColor: 'rgba(37, 211, 102, 0.05)',
              border: '1px solid rgba(37, 211, 102, 0.2)',
              p: 2,
              borderRadius: 2
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#25d366' }}>
                Campaign targets: {selectedContacts.length} Recipients selected
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1, maxHeight: '80px', overflowY: 'auto' }}>
                {selectedContacts.map((contact, idx) => (
                  <Chip
                    key={idx}
                    label={contact}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem', height: '22px' }}
                  />
                ))}
              </Box>
            </Box>

            <TextField
              required
              fullWidth
              multiline
              rows={5}
              label="WhatsApp Broadcast Body"
              placeholder={`Hi {Name},\n\nCheck out our weekend special: Buy 2 cookies, get 1 classic biscuit free! 🍪\nUse code KRUNCHY🍪`}
              value={promoMessage}
              onChange={(e) => setPromoMessage(e.target.value)}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={sendingPromo}
              startIcon={sendingPromo ? <CircularProgress size={16} color="inherit" /> : <Send size={18} />}
              sx={{
                width: '100%',
                py: 1.25,
                backgroundColor: '#25d366',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#128c7e'
                },
                mt: 1
              }}
            >
              {sendingPromo ? 'Broadcasting Campaign...' : 'Dispatch Broadcast Message'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CustomerDashboard;
