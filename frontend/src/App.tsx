import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ModernHomePage from './pages/ModernHomePage';
import ModernStoresPage from './pages/ModernStoresPage';
import StoreLandingPage from './pages/StoreLandingPage';
import ModernBookingPage from './pages/ModernBookingPage';
import ModernBookingConfirmation from './pages/ModernBookingConfirmation';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import ServicesManagementPage from './pages/admin/ServicesManagementPage';
import GlobalServicesManagementPage from './pages/admin/GlobalServicesManagementPage';
import AvailabilityManagementPage from './pages/admin/AvailabilityManagementPage';
import PlanningPage from './pages/admin/PlanningPage';
import AdminUsersManagementPage from './pages/admin/AdminUsersManagementPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ModernHomePage />} />
        <Route path="/stores" element={<ModernStoresPage />} />
        <Route path="/stores/:storeSlug" element={<StoreLandingPage />} />
        <Route path="/stores/:storeSlug/booking" element={<ModernBookingPage />} />
        <Route path="/booking/:token" element={<ModernBookingConfirmation />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<PlanningPage />} />
        <Route path="/admin/admins" element={<AdminUsersManagementPage />} />
        <Route path="/admin/services" element={<GlobalServicesManagementPage />} />
        <Route path="/admin/services/stores" element={<ServicesManagementPage />} />
        <Route path="/admin/availability" element={<AvailabilityManagementPage />} />
        <Route path="/admin/planning" element={<PlanningPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
