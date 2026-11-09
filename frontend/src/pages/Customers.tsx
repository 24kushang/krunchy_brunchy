import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Divider,
  Switch,
  Link as MuiLink,
  useTheme
} from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridSortModel
} from '@mui/x-data-grid';
import ExportIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import MetricIcon from '@mui/icons-material/TrendingUp';
import MapIcon from '@mui/icons-material/LocationOn';
import GenderIcon from '@mui/icons-material/Wc';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import api from '../utils/api';

interface Customer {
  id: string;
  name: string;
  contact: string | null;
  gender: string;
  location: string;
  address?: string;
  orderCount: number;
  ltv: number;
}

interface Metrics {
  totalCustomers: number;
  averageLTV: number;
  maxLTV: number;
  regionalHubs: { location: string; customerCount: number; totalSales: number }[];
  genderDistribution: { gender: string; count: number }[];
  purchaseFrequency: { frequency: string; count: number }[];
}

export default function Customers() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkColor = theme.palette.mode === 'light' ? '#0A3BB0' : '#7CA1FF';

  // URL-backed filters, pagination & modal state
  const search = searchParams.get('search') || '';
  const locationFilter = searchParams.get('location') || '';
  const genderFilter = searchParams.get('gender') || 'ALL';
  const pageParam = Math.max(0, (parseInt(searchParams.get('page') || '1', 10) || 1) - 1);
  const rawPageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const pageSizeParam = [10, 20].includes(rawPageSize) ? rawPageSize : 10;
  const paginationModel = useMemo(
    () => ({ page: pageParam, pageSize: pageSizeParam }),
    [pageParam, pageSizeParam]
  );
  const editCustomerId = searchParams.get('edit');
  const isNewParam = searchParams.get('new') === '1';

  // Smooth debounced text inputs
  const [searchInput, setSearchInput] = useState(search);
  const lastCommittedSearchRef = useRef(search);
  const [locationInput, setLocationInput] = useState(locationFilter);
  const lastCommittedLocationRef = useRef(locationFilter);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const customersRef = useRef<Customer[]>(customers);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Server-side pagination and sorting states
  const [totalRows, setTotalRows] = useState(0);
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  // Customer Form Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingDialogCustomer, setLoadingDialogCustomer] = useState(false);
  const initializedModalKeyRef = useRef<string | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [noContact, setNoContact] = useState(false);
  const [originalContact, setOriginalContact] = useState<string | null>(null);
  const [gender, setGender] = useState('Male');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');

  const buildCustomersParams = useCallback(
    (overrides: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(overrides).forEach(([key, val]) => {
        if (
          val === null ||
          val === undefined ||
          val === '' ||
          (key === 'gender' && val === 'ALL') ||
          (key === 'page' && val === '1') ||
          (key === 'pageSize' && val === '10')
        ) {
          next.delete(key);
        } else {
          next.set(key, val);
        }
      });
      return next;
    },
    [searchParams]
  );

  const buildCustomersUrl = useCallback(
    (overrides: Record<string, string | null | undefined>) => {
      const next = buildCustomersParams(overrides);
      const qs = next.toString();
      return qs ? `/customers?${qs}` : '/customers';
    },
    [buildCustomersParams]
  );

  const updateCustomerParams = useCallback(
    (overrides: Record<string, string | null | undefined>) => {
      setSearchParams(buildCustomersParams(overrides));
    },
    [buildCustomersParams, setSearchParams]
  );

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    const params: Record<string, any> = {
      page: pageParam + 1,
      limit: pageSizeParam
    };
    if (search) params.search = search;
    if (locationFilter && locationFilter !== 'ALL') params.location = locationFilter;
    if (genderFilter !== 'ALL') params.gender = genderFilter;

    if (sortModel.length > 0) {
      params.sortBy = sortModel[0].field;
      params.sortOrder = (sortModel[0].sort || 'asc').toUpperCase();
    }

    api.get('/api/customers', { params })
      .then((res) => {
        setCustomers(res.data.data || []);
        setTotalRows(res.data.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [pageParam, pageSizeParam, sortModel, search, locationFilter, genderFilter]);

  const fetchMetrics = useCallback(() => {
    api.get('/api/customers/metrics')
      .then((res) => setMetrics(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Sync URL filter changes back to draft inputs on navigation
  useEffect(() => {
    if (search !== lastCommittedSearchRef.current) {
      lastCommittedSearchRef.current = search;
      setSearchInput(search);
    }
  }, [search]);

  useEffect(() => {
    if (locationFilter !== lastCommittedLocationRef.current) {
      lastCommittedLocationRef.current = locationFilter;
      setLocationInput(locationFilter);
    }
  }, [locationFilter]);

  // Debounced search lookup
  useEffect(() => {
    if (searchInput === search) return;
    const delayDebounceFn = setTimeout(() => {
      lastCommittedSearchRef.current = searchInput;
      updateCustomerParams({ search: searchInput || null, page: null });
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchInput, search, updateCustomerParams]);

  // Debounced location lookup
  useEffect(() => {
    if (locationInput === locationFilter) return;
    const delayDebounceFn = setTimeout(() => {
      lastCommittedLocationRef.current = locationInput;
      updateCustomerParams({ location: locationInput || null, page: null });
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [locationInput, locationFilter, updateCustomerParams]);

  const handleExportCSV = () => {
    let url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/customers/export?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (locationFilter && locationFilter !== 'ALL') url += `location=${encodeURIComponent(locationFilter)}&`;
    if (genderFilter !== 'ALL') url += `gender=${encodeURIComponent(genderFilter)}&`;

    window.open(url, '_blank');
  };

  const populateCreateForm = useCallback(() => {
    setIsEditMode(false);
    setEditingId(null);
    setName('');
    setContact('');
    setNoContact(false);
    setOriginalContact(null);
    setGender('Male');
    setLocation('');
    setAddress('');
    setLoadingDialogCustomer(false);
    setOpenDialog(true);
  }, []);

  const populateEditForm = useCallback((customer: Customer) => {
    setIsEditMode(true);
    setEditingId(customer.id);
    setName(customer.name);
    setContact(customer.contact || '');
    setNoContact(!customer.contact);
    setOriginalContact(customer.contact);
    setGender(customer.gender);
    setLocation(customer.location);
    setAddress(customer.address || '');
    setLoadingDialogCustomer(false);
    setOpenDialog(true);
  }, []);

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  // Sync dialog open state from ?edit=<id> or ?new=1
  useEffect(() => {
    if (editCustomerId) {
      const modalKey = `edit:${editCustomerId}`;
      if (initializedModalKeyRef.current === modalKey) return;

      const localMatch = customersRef.current.find((c) => c.id === editCustomerId);
      if (localMatch) {
        initializedModalKeyRef.current = modalKey;
        populateEditForm(localMatch);
        return;
      }

      let cancelled = false;
      setOpenDialog(true);
      setIsEditMode(true);
      setLoadingDialogCustomer(true);
      api.get(`/api/customers/${editCustomerId}`)
        .then((res) => {
          if (!cancelled) {
            initializedModalKeyRef.current = modalKey;
            populateEditForm(res.data);
          }
        })
        .catch((err) => {
          console.error('Failed to load customer for edit', err);
          if (!cancelled) {
            setLoadingDialogCustomer(false);
            updateCustomerParams({ edit: null });
          }
        });
      return () => {
        cancelled = true;
      };
    }

    if (isNewParam) {
      if (initializedModalKeyRef.current !== 'new') {
        initializedModalKeyRef.current = 'new';
        populateCreateForm();
      }
      return;
    }

    initializedModalKeyRef.current = null;
    setOpenDialog(false);
  }, [editCustomerId, isNewParam, populateCreateForm, populateEditForm, updateCustomerParams]);

  const handleCloseDialog = () => {
    initializedModalKeyRef.current = null;
    setOpenDialog(false);
    updateCustomerParams({ edit: null, new: null });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please fill in the required name field');
      return;
    }
    if (!noContact && !contact.trim()) {
      alert('Please fill in the contact field, or mark "Phone number not available"');
      return;
    }

    const payload = {
      name,
      contact: noContact ? undefined : contact,
      noContact,
      gender,
      location,
      address,
    };

    try {
      if (isEditMode && editingId) {
        await api.put(`/api/customers/${editingId}`, payload);
      } else {
        await api.post('/api/customers', payload);
      }
      handleCloseDialog();
      fetchCustomers();
      fetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving customer profile');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name', headerName: 'Customer Name', width: 180, renderCell: (params) => (
        <MuiLink
          component={Link}
          to={buildCustomersUrl({ edit: params.row.id, new: null })}
          onClick={(e) => e.stopPropagation()}
          underline="hover"
          variant="body2"
          sx={{ fontWeight: 700, color: linkColor }}
        >
          {params.value}
        </MuiLink>
      )
    },
    {
      field: 'contact', headerName: 'Contact Number', width: 140, renderCell: (params) => (
        params.value ? params.value : <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>N/A</Typography>
      )
    },
    { field: 'gender', headerName: 'Gender', width: 100 },
    { field: 'location', headerName: 'City / Location', width: 130 },
    { field: 'address', headerName: 'Address', width: 220 },
    { field: 'orderCount', headerName: 'Orders Placed', type: 'number', width: 110 },
    {
      field: 'ltv', headerName: 'Lifetime Value', type: 'number', width: 130, renderCell: (params) => (
        <Typography variant="body2" color="primary" sx={{ fontWeight: 800 }}>Rs. {parseFloat(params.value).toFixed(2)}</Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <Button
          component={Link}
          to={buildCustomersUrl({ edit: params.row.id, new: null })}
          onClick={(e) => e.stopPropagation()}
          size="small"
        >
          Edit
        </Button>
      )
    },
  ];

  // Recharts styling
  const COLORS = ['#FF5A09', '#0A3BB0', '#4CAF50', '#9C27B0', '#FFC107', '#00BCD4'];

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. Marketing Dashboard Visualizations */}
      <Typography variant="h5" sx={{ color: '#0A3BB0', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <MetricIcon /> Customer Demographics & Lifetime Value Insights
      </Typography>

      {!metrics ? (
        <Stack direction="row" sx={{ justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {/* Card Summary counters */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ bgcolor: 'rgba(255, 90, 9, 0.03)', border: '1px solid rgba(255, 90, 9, 0.15)', height: '100%', display: 'flex', alignItems: 'center', p: 1 }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 700 }}>
                  Total Brand Customer Profiles
                </Typography>
                <Typography variant="h3" sx={{ color: '#FF5A09', fontWeight: 'bold' }}>
                  {metrics.totalCustomers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ bgcolor: 'rgba(10, 59, 176, 0.03)', border: '1px solid rgba(10, 59, 176, 0.15)', height: '100%', display: 'flex', alignItems: 'center', p: 1 }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 700 }}>
                  Average Lifetime Value (LTV)
                </Typography>
                <Typography variant="h3" sx={{ color: '#0A3BB0', fontWeight: 'bold' }}>
                  Rs. {metrics.averageLTV.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.03)', border: '1px solid rgba(76, 175, 80, 0.15)', height: '100%', display: 'flex', alignItems: 'center', p: 1 }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 700 }}>
                  Highest Customer LTV
                </Typography>
                <Typography variant="h3" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                  Rs. {metrics.maxLTV.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Charts Row */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GenderIcon color="primary" /> Gender Distribution
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.genderDistribution}
                        dataKey="count"
                        nameKey="gender"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label
                      >
                        {metrics.genderDistribution.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MapIcon color="primary" /> Regional Sales Value
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.regionalHubs}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="location" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="totalSales" fill="#0A3BB0" name="Sales (Rs.)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  📈 Purchase Frequency Groups
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.purchaseFrequency}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="frequency" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#FF5A09" name="Customers" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 2. Customer Ledger List */}
      <Divider sx={{ my: 4 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ color: '#0A3BB0' }}>
          Customer Profiles Directory
        </Typography>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportCSV}
            sx={{ borderRadius: 3 }}
          >
            Export CSV Directory
          </Button>

          <Button
            component={Link}
            to={buildCustomersUrl({ new: '1', edit: null })}
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 3 }}
          >
            Add Profile
          </Button>
        </Stack>
      </Box>

      {/* Grid Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Search customer name or contact number..."
                variant="outlined"
                size="small"
                fullWidth
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Filter by Location / City..."
                variant="outlined"
                size="small"
                fullWidth
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select
                  value={genderFilter}
                  label="Gender"
                  onChange={(e) => updateCustomerParams({ gender: e.target.value, page: null })}
                >
                  <MenuItem value="ALL">All Genders</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Grid List */}
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={customers}
          columns={columns}
          loading={loading}
          paginationMode="server"
          rowCount={totalRows}
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => {
            updateCustomerParams({
              page: String(model.page + 1),
              pageSize: String(model.pageSize)
            });
          }}
          sortingMode="server"
          onSortModelChange={setSortModel}
          pageSizeOptions={[10, 20]}
          disableRowSelectionOnClick
          sx={{
            bgcolor: theme.palette.background.paper,
            borderRadius: 4,
            border: `1px solid ${theme.palette.mode === 'light' ? '#EFEAE4' : '#2C2A28'}`,
            '& .MuiDataGrid-columnHeader': {
              bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120',
              fontWeight: 'bold'
            }
          }}
        />
      </Box>

      {/* Customer Create / Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" sx={{ color: '#0A3BB0' }}>
            {isEditMode ? 'Update Customer Profile' : 'Register Customer Profile'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {loadingDialogCustomer ? (
            <Stack direction="row" sx={{ justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Customer Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <TextField
              label="Contact Number / Identifier"
              fullWidth
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={(isEditMode && !!originalContact) || noContact} // Lock once a real contact is set; unlock to add one later
              required={!noContact}
            />

            {!(isEditMode && !!originalContact) && (
              <FormControlLabel
                sx={{ ml: 0, mt: -1.5 }}
                control={
                  <Switch
                    size="small"
                    checked={noContact}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setNoContact(checked);
                      if (checked) setContact('');
                    }}
                  />
                }
                label={
                  <Typography variant="caption" color="textSecondary">
                    Phone number not available
                  </Typography>
                }
              />
            )}

            <TextField
              label="Location / City"
              fullWidth
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            <TextField
              label="Customer Address (for future reference)"
              fullWidth
              multiline
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter customer address..."
            />

            <FormControl>
              <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 0.5 }}>Gender Demographics</FormLabel>
              <RadioGroup
                row
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <FormControlLabel value="Male" control={<Radio />} label="Male" />
                <FormControlLabel value="Female" control={<Radio />} label="Female" />
                <FormControlLabel value="Other" control={<Radio />} label="Other" />
              </RadioGroup>
            </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 3, py: 2 }}>
          <Button variant="outlined" onClick={handleCloseDialog} sx={{ borderRadius: 3 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={loadingDialogCustomer} sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 3 }}>
            Save Profile
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
