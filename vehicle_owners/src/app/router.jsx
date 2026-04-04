import { Navigate, createBrowserRouter } from 'react-router-dom';
import OwnerLayout from '../layouts/OwnerLayout';
import DashboardPage from '../pages/DashboardPage';
import VehicleManagementPage from '../pages/VehicleManagementPage';
import DocumentsPage from '../pages/DocumentsPage';
import RentalBookingsPage from '../pages/RentalBookingsPage';
import RentalBookingDetailPage from '../pages/RentalBookingDetailPage';
import MaintenancePage from '../pages/MaintenancePage';
import PaymentsPage from '../pages/PaymentsPage';
import WalletPage from '../pages/WalletPage';
import WithdrawalsPage from '../pages/WithdrawalsPage';
import OwnerLoginPage from '../pages/auth/OwnerLoginPage';
import OwnerRegisterPage from '../pages/auth/OwnerRegisterPage';
import OwnerVerifyPage from '../pages/auth/OwnerVerifyPage';
import AccountProfilePage from '../pages/AccountProfilePage';
import VerificationPage from '../pages/VerificationPage';
import VehicleActivityPage from '../pages/VehicleActivityPage';
import OwnerRevenuePage from '../pages/OwnerRevenuePage';
import OwnerLandingPage from '../features/owner-landing/OwnerLandingPage';
import { OWNER_ROUTES } from '../constants/routes';
import RequireOwnerAuth from './guards/RequireOwnerAuth';

export const router = createBrowserRouter([
  {
    path: '/owner',
    children: [
      { index: true, element: <OwnerLandingPage /> },
      { path: 'login', element: <OwnerLoginPage /> },
      { path: 'register', element: <OwnerRegisterPage /> },
      { path: 'register/verify', element: <OwnerVerifyPage /> },
      {
        element: <RequireOwnerAuth />,
        children: [
          {
            element: <OwnerLayout />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'account', element: <AccountProfilePage /> },
              { path: 'verification', element: <VerificationPage /> },
              { path: 'vehicle-activity', element: <VehicleActivityPage /> },
              { path: 'revenue', element: <OwnerRevenuePage /> },
              { path: 'vehicles', element: <VehicleManagementPage /> },
              { path: 'documents', element: <DocumentsPage /> },
              { path: 'bookings', element: <RentalBookingsPage /> },
              { path: 'bookings/:bookingId', element: <RentalBookingDetailPage /> },
              { path: 'maintenance', element: <MaintenancePage /> },
              { path: 'payments', element: <PaymentsPage /> },
              { path: 'wallet', element: <WalletPage /> },
              { path: 'withdrawals', element: <WithdrawalsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={OWNER_ROUTES.LANDING} replace /> },
]);
