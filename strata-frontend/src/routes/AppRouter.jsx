import { Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ResetPassword from '../pages/ResetPassword';
import DashboardLanding from '../pages/DashboardLanding';
import ManagerDashboard from '../pages/manager/Dashboard';
import TenantDashboard from '../pages/tenant/Dashboard';
import OwnerDashboard from '../pages/owner/Dashboard';
import TenantBookings from '../pages/tenant/Bookings';
import TenantForms from '../pages/tenant/Forms';
import TenantEvents from '../pages/tenant/Events';
import TenantDocuments from '../pages/tenant/Documents';
import TenantNotifications from '../pages/tenant/Notifications';


export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<DashboardLanding />} />
      <Route path="/manager-dashboard" element={<ManagerDashboard />} />
      <Route path="/tenant-dashboard" element={<TenantDashboard />} />
      <Route path="/owner-dashboard" element={<OwnerDashboard />} />
      <Route path="/tenant/bookings" element={<TenantBookings />} />
      <Route path="/tenant/Forms" element={<TenantForms />} />
      <Route path="/tenant/events" element={<TenantEvents />} />
      <Route path="/tenant/documents" element={<TenantDocuments />} />
      <Route path="/tenant/notifications" element={<TenantNotifications />} />

    </Routes>
  );
}
