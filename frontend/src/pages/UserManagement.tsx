import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SuperAdmin' | 'Admin';
  isActive: boolean;
  createdAt: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Form states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'SuperAdmin' | 'Admin'>('Admin');
  const [formError, setFormError] = useState<string | null>(null);

  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch users. Make sure you have SuperAdmin permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('Admin');
    setFormError(null);
    setOpenAddDialog(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // leave blank unless updating
    setRole(user.role);
    setFormError(null);
    setOpenEditDialog(true);
  };

  const handleOpenDelete = (user: User) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setFormError('Name, Email and Password are required');
      return;
    }
    setFormError(null);
    try {
      await api.post('/api/users', { name, email, password, role });
      setOpenAddDialog(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setFormError('Name and Email are required');
      return;
    }
    setFormError(null);
    try {
      const payload: any = { name, email, role };
      if (password) {
        payload.password = password; // Only send password if updated
      }
      await api.patch(`/api/users/${selectedUser?.id}`, payload);
      setOpenEditDialog(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (selectedUser?.id === currentUser?.id) {
      setError("You cannot delete your own logged-in user account.");
      setOpenDeleteDialog(false);
      return;
    }
    try {
      await api.delete(`/api/users/${selectedUser?.id}`);
      setOpenDeleteDialog(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setError('Failed to delete user.');
      setOpenDeleteDialog(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert("You cannot suspend your own logged-in account.");
      return;
    }
    try {
      await api.patch(`/api/users/${user.id}`, { isActive: !user.isActive });
      setUsers(
        users.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      );
    } catch (err: any) {
      console.error(err);
      alert('Failed to update user status.');
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: '1200px', margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'Fredoka',
            fontWeight: 'bold',
            color: '#FF5A09', // Brand Primary Orange
          }}
        >
          User Management
        </Typography>
        <Button
          variant="contained"
          onClick={handleOpenAdd}
          sx={{
            backgroundColor: '#FF5A09',
            fontFamily: 'Fredoka',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: '#e04f08',
            },
            borderRadius: 2,
          }}
        >
          Add New User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress sx={{ color: '#FF5A09' }} />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #EFEAE4' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#FAF6F0' }}>
              <TableRow>
                <TableCell sx={{ fontFamily: 'Fredoka', fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontFamily: 'Fredoka', fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontFamily: 'Fredoka', fontWeight: 'bold' }}>Role</TableCell>
                <TableCell sx={{ fontFamily: 'Fredoka', fontWeight: 'bold' }}>Active Status</TableCell>
                <TableCell sx={{ fontFamily: 'Fredoka', fontWeight: 'bold' }}>Created At</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Fredoka', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontWeight: 'medium' }}>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role}
                      color={u.role === 'SuperAdmin' ? 'primary' : 'default'}
                      size="small"
                      sx={{
                        fontFamily: 'Fredoka',
                        backgroundColor: u.role === 'SuperAdmin' ? '#0A3BB0' : '#EFEAE4',
                        color: u.role === 'SuperAdmin' ? 'white' : 'text.primary',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.isActive}
                      onChange={() => handleToggleActive(u)}
                      disabled={u.id === currentUser?.id}
                      color="warning"
                    />
                  </TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenEdit(u)} color="primary" sx={{ mr: 1 }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleOpenDelete(u)}
                      color="error"
                      disabled={u.id === currentUser?.id}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add User Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Fredoka', color: '#0A3BB0', fontWeight: 'bold' }}>
          Add New User
        </DialogTitle>
        <Box component="form" onSubmit={handleCreateUser}>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <TextField
              margin="normal"
              required
              fullWidth
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              select
              fullWidth
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'SuperAdmin' | 'Admin')}
              margin="normal"
            >
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="SuperAdmin">SuperAdmin</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpenAddDialog(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: '#FF5A09',
                '&:hover': { backgroundColor: '#e04f08' },
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              Create User
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Fredoka', color: '#0A3BB0', fontWeight: 'bold' }}>
          Edit User
        </DialogTitle>
        <Box component="form" onSubmit={handleUpdateUser}>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <TextField
              margin="normal"
              required
              fullWidth
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              fullWidth
              label="Password (leave blank to keep current)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              select
              fullWidth
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'SuperAdmin' | 'Admin')}
              margin="normal"
              disabled={selectedUser?.id === currentUser?.id}
            >
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="SuperAdmin">SuperAdmin</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpenEditDialog(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: '#FF5A09',
                '&:hover': { backgroundColor: '#e04f08' },
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle sx={{ fontFamily: 'Fredoka', color: 'error.main', fontWeight: 'bold' }}>
          Delete User
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete the user account for{' '}
            <strong>{selectedUser?.name}</strong> ({selectedUser?.email})? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
