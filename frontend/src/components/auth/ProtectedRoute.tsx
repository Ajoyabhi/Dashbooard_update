import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Map user_type to role for comparison with explicit empty string handling
  let userRole: UserRole;

  if (!user?.user_type || user.user_type == '') {
    console.log('ProtectedRoute: User type is empty or undefined, defaulting to user role');
    userRole = 'user';
  } else if (user.user_type === 'admin') {
    console.log('ProtectedRoute: User is admin');
    userRole = 'admin';
  } else if (user.user_type === 'agent') {
    console.log('ProtectedRoute: User is agent');
    userRole = 'agent';
  } else {
    console.log(`ProtectedRoute: User type "${user.user_type}" mapped to user role`);
    userRole = 'user';
  }

  console.log('ProtectedRoute: Current user role:', userRole, 'Required role:', role);

  if (userRole !== role) {
    console.log(`ProtectedRoute: Redirecting from ${role} to ${userRole}`);
    // Redirect to appropriate dashboard
    return <Navigate to={`/${userRole}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;