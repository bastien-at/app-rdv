import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  // Check both storages as the login page supports "Remember me"
  const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');

  if (!token) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
