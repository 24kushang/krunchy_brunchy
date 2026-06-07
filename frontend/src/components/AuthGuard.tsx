import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('SuperAdmin' | 'Admin')[];
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#FAF6F0', // Brand Light BG
        }}
      >
        <CircularProgress sx={{ color: '#FF5A09', mb: 3 }} size={60} />
        <Typography variant="h5" sx={{ fontFamily: 'Fredoka', color: '#0A3BB0' }}>
          Loading Krunchy Brunchy OMS...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page and save the current location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If user role is not permitted, redirect them to dashboard (orders)
    return <Navigate to="/orders" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
