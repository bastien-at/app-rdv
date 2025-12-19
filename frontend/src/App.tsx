import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ModernHomePage from './pages/ModernHomePage';
import ModernStoresPage from './pages/ModernStoresPage';
import StoreLandingPage from './pages/StoreLandingPage';
import ModernBookingPage from './pages/ModernBookingPage';
import ModernBookingConfirmation from './pages/ModernBookingConfirmation';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import ForgotPasswordPage from './pages/admin/ForgotPasswordPage';
import ResetPasswordPage from './pages/admin/ResetPasswordPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import ServicesManagementPage from './pages/admin/ServicesManagementPage';
import GlobalServicesManagementPage from './pages/admin/GlobalServicesManagementPage';
import AvailabilityManagementPage from './pages/admin/AvailabilityManagementPage';
import PlanningPage from './pages/admin/PlanningPage';
import AdminUsersManagementPage from './pages/admin/AdminUsersManagementPage';
import AdminCustomerDirectoryPage from './pages/admin/AdminCustomerDirectoryPage';
import StoreSettingsPage from './pages/admin/StoreSettingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Routes Publiques */}
          <Route path="/" element={<ModernHomePage />} />
          <Route path="/stores" element={<ModernStoresPage />} />
          <Route path="/stores/:storeSlug" element={<StoreLandingPage />} />
          <Route path="/stores/:storeSlug/booking" element={<ModernBookingPage />} />
          <Route path="/booking/:token" element={<ModernBookingConfirmation />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/admin/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Routes Admin Protégées */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/dashboard" element={<PlanningPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/admins" element={<AdminUsersManagementPage />} />
            <Route path="/admin/customers" element={<AdminCustomerDirectoryPage />} />
            <Route path="/admin/services" element={<GlobalServicesManagementPage />} />
            <Route path="/admin/services/stores" element={<ServicesManagementPage />} />
            <Route path="/admin/availability" element={<AvailabilityManagementPage />} />
            <Route path="/admin/planning" element={<PlanningPage />} />
            <Route path="/admin/store-settings" element={<StoreSettingsPage />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
