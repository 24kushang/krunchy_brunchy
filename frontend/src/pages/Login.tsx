import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect back to the page they tried to visit, or fallback to /orders
  const from = (location.state as any)?.from?.pathname || '/orders';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/login`,
        { email, password }
      );

      if (response.data && response.data.access_token) {
        login(response.data.access_token, response.data.user);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Login failed. Please check your network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#FAF6F0', // Brand Light BG
        px: 2,
      }}
    >
      <Card
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: 4,
          borderRadius: 4,
          border: '1px solid #EFEAE4', // Brand Light Border
          textAlign: 'center',
        }}
      >
        {/* Brand Logo Box */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FF5A09', // Primary Orange
            color: 'white',
            width: 48,
            height: 48,
            borderRadius: 2,
            mb: 2,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Fredoka',
              fontSize: '2rem',
              fontWeight: 'bold',
            }}
          >
            K
          </Typography>
        </Box>

        {/* Title */}
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'Fredoka',
            fontWeight: 'bold',
            color: '#FF5A09', // Primary Orange
            mb: 0.5,
          }}
        >
          KRUNCHY
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontFamily: 'Fredoka',
            fontWeight: 'bold',
            color: '#0A3BB0', // Primary Blue
            mb: 3,
            letterSpacing: 1,
          }}
        >
          BRUNCHY OMS
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Internal Order Management System Sign In
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left', borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }
            }}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isSubmitting}
            sx={{
              py: 1.5,
              borderRadius: 2,
              backgroundColor: '#FF5A09', // Primary Orange
              '&:hover': {
                backgroundColor: '#e04f08',
              },
              textTransform: 'none',
              fontFamily: 'Fredoka',
              fontSize: '1.1rem',
              boxShadow: 'none',
            }}
          >
            {isSubmitting ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Sign In'}
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default Login;
