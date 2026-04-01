import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { getDefaultPathForRole, getRoleLeafRoutes } from "../config/roleRoutes";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminProfilePage from "../pages/AdminProfilePage";
import DispatcherDashboardPage from "../pages/DispatcherDashboardPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import MapTrackingPage from "../pages/MapTrackingPage";
import ModulePlaceholderPage from "../pages/ModulePlaceholderPage";
import NewCustomer from "../pages/customers/NewCustomer";
import CustomerList from "../pages/customers/CustomerList";
import CustomerDetail from "../pages/customers/CustomerDetail";
import EditCustomer from "../pages/customers/EditCustomer";
import CarList from "../pages/cars/CarList";
import NewCar from "../pages/cars/NewCar";
import NewDriver from "../pages/drivers/NewDriver";
import DriverList from "../pages/drivers/DriverList";
import DriverDetail from "../pages/drivers/DriverDetail";
import EditDriver from "../pages/drivers/EditDriver";
import NewStaff from "../pages/staff/NewStaff";
import StaffList from "../pages/staff/StaffList";
import StaffDetail from "../pages/staff/StaffDetail";
import EditStaff from "../pages/staff/EditStaff";
import TariffListPage from "../pages/tariffs/TariffListPage";
import TariffCreatePage from "../pages/tariffs/TariffCreatePage";
import TariffEditPage from "../pages/tariffs/TariffEditPage";
import ZoneListPage from "../pages/zones/ZoneListPage";
import { ZoneCreatePage, ZoneEditPage } from "../pages/zones/ZonePages";
import CouponListPage from "../pages/coupons/CouponListPage";
import CouponCreatePage from "../pages/coupons/CouponCreatePage";
import CouponEditPage from "../pages/coupons/CouponEditPage";
import CouponDetailPage from "../pages/coupons/CouponDetailPage";
import RewardPointsPage from "../pages/reward-points/RewardPointsPage";
import BookingCreatePage from "../pages/bookings/BookingCreatePage";
import BookingDispatchPage from "../pages/bookings/BookingDispatchPage";
import BookingListPage from "../pages/bookings/BookingListPage";
import ScheduledBookingListPage from "../pages/bookings/ScheduledBookingListPage";
import BookingDetailPage from "../pages/bookings/BookingDetailPage";

function getElementByRoleAndPath(role, path) {
    if (path === "dashboard") {
        return role === "admin" ? <AdminDashboardPage /> : <DispatcherDashboardPage />;
    }

    if (path === "profile") {
        return <AdminProfilePage />;
    }

    if (role === "admin" && path === "staff/create") {
        return <NewStaff />;
    }

    if (role === "admin" && path === "staff") {
        return <StaffList />;
    }

    if (role === "admin" && path === "vehicle/create") {
        return <NewCar />;
    }

    if (role === "admin" && path === "vehicles") {
        return <CarList />;
    }

    if (role === "admin" && path === "tariff/create") {
        return <TariffCreatePage />;
    }

    if (role === "admin" && path === "tariffs") {
        return <TariffListPage />;
    }

    if (role === "admin" && path === "area/create") {
        return <ZoneCreatePage />;
    }

    if (role === "admin" && path === "areas") {
        return <ZoneListPage />;
    }

    if (role === "admin" && path === "coupons") {
        return <CouponListPage />;
    }

    if (role === "admin" && path === "reward-points") {
        return <RewardPointsPage />;
    }

    if (role === "admin" && path === "customer/create") {
        return <NewCustomer />;
    }

    if (role === "admin" && path === "customers") {
        return <CustomerList />;
    }

    if (role === "admin" && path === "driver/create") {
        return <NewDriver />;
    }

    if (path === "drivers") {
        return <DriverList />;
    }

    if (path === "map-tracking") {
        return <MapTrackingPage />;
    }

    if (path === "booking/create") {
        return <BookingCreatePage />;
    }

    if (path === "booking/dispatch") {
        return <BookingDispatchPage />;
    }

    if (path === "bookings") {
        return <BookingListPage />;
    }

    if (path === "scheduled-bookings") {
        return <ScheduledBookingListPage />;
    }

    return <ModulePlaceholderPage role={role} />;
}

function renderRoleRoutes(role) {
    return getRoleLeafRoutes(role).map(({ path }) => (
        <Route key={`${role}-${path}`} path={path} element={getElementByRoleAndPath(role, path)} />
    ));
}

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/admin" element={<Layout allowedRole="admin" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                {renderRoleRoutes("admin")}
                <Route path="customers/:userId" element={<CustomerDetail />} />
                <Route path="customers/:userId/edit" element={<EditCustomer />} />
                <Route path="drivers/:driverId" element={<DriverDetail />} />
                <Route path="drivers/:driverId/edit" element={<EditDriver />} />
                <Route path="staff/:userId" element={<StaffDetail />} />
                <Route path="staff/:userId/edit" element={<EditStaff />} />
                <Route path="tariffs/:id/edit" element={<TariffEditPage />} />
                <Route path="areas/:id/edit" element={<ZoneEditPage />} />
                <Route path="coupons/create" element={<CouponCreatePage />} />
                <Route path="coupons/:id" element={<CouponDetailPage />} />
                <Route path="coupons/:id/edit" element={<CouponEditPage />} />
                <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
            </Route>

            <Route path="/dispatcher" element={<Layout allowedRole="dispatcher" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                {renderRoleRoutes("dispatcher")}
                <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
            </Route>

            <Route
                path="*"
                element={<Navigate to={getDefaultPathForRole()} replace />}
            />
        </Routes>
    );
}
