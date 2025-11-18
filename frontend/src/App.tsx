import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import StoresPage from './pages/StoresPage';
import ServiceTypePage from './pages/ServiceTypePage';
import BookingPage from './pages/BookingPage';
import BookingDetailsPage from './pages/BookingDetailsPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AvailabilityManagementPage from './pages/admin/AvailabilityManagementPage';
import PlanningPage from './pages/admin/PlanningPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/stores/:storeSlug" element={<ServiceTypePage />} />
        <Route path="/stores/:storeSlug/service-type" element={<ServiceTypePage />} />
        <Route path="/stores/:storeSlug/booking" element={<BookingPage />} />
        <Route path="/booking/:token" element={<BookingDetailsPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/availability" element={<AvailabilityManagementPage />} />
        <Route path="/admin/planning" element={<PlanningPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
