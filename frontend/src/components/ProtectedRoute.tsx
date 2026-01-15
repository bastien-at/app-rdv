import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute() {
  const location = useLocation();
  // Check both storages as the login page supports "Remember me"
  const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');

  if (!token) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
