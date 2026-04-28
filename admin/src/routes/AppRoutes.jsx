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
import VehicleOwnerList from "../pages/vehicle-owners/VehicleOwnerList";
import NewVehicleOwner from "../pages/vehicle-owners/NewVehicleOwner";
import VehicleOwnerDetail from "../pages/vehicle-owners/VehicleOwnerDetail";
import EditVehicleOwner from "../pages/vehicle-owners/EditVehicleOwner";
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
import BannerListPage from "../pages/banners/BannerListPage";
import BannerCreatePage from "../pages/banners/BannerCreatePage";
import BannerEditPage from "../pages/banners/BannerEditPage";
import BannerDetailPage from "../pages/banners/BannerDetailPage";
import RewardPointsPage from "../pages/reward-points/RewardPointsPage";
import BookingCreatePage from "../pages/bookings/BookingCreatePage";
import BookingDispatchPage from "../pages/bookings/BookingDispatchPage";
import BookingListPage from "../pages/bookings/BookingListPage";
import ScheduledBookingListPage from "../pages/bookings/ScheduledBookingListPage";
import BookingDetailPage from "../pages/bookings/BookingDetailPage";
import TransactionsPage from "../pages/finance/TransactionsPage";
import WalletsPage from "../pages/finance/WalletsPage";
import PayoutsPage from "../pages/finance/PayoutsPage";
import DocumentReviewPage from "../pages/documents/DocumentReviewPage";
import DocumentDefinitionsPage from "../pages/documents/DocumentDefinitionsPage";
import VehicleDocumentReviewPage from "../pages/documents/VehicleDocumentReviewPage";
import SupportChatPage from "../pages/chat/SupportChatPage";
import SystemSettingsPage from "../pages/settings/SystemSettingsPage";
import DriverReportPage from "../pages/reports/DriverReportPage";
import CustomerReportPage from "../pages/reports/CustomerReportPage";
import PaymentReportPage from "../pages/reports/PaymentReportPage";
import RentalPackagesPage from "../pages/rentals/RentalPackagesPage";
import RentalBookingListPage from "../pages/rental-bookings/RentalBookingListPage";

function getElementByRoleAndPath(role, path) {
    const sharedMap = {
        "profile": <AdminProfilePage />,
        "drivers": <DriverList />,
        "map-tracking": <MapTrackingPage />,
        "booking/create": <BookingCreatePage />,
        "booking/dispatch": <BookingDispatchPage />,
        "bookings": <BookingListPage />,
        "scheduled-bookings": <ScheduledBookingListPage />,
        "chat-support": <SupportChatPage />,
    };

    if (path === "dashboard") {
        return role === "admin" ? <AdminDashboardPage /> : <DispatcherDashboardPage />;
    }

    if (sharedMap[path]) {
        return sharedMap[path];
    }

    if (role === "admin") {
        const adminMap = {
            "staff/create": <NewStaff />,
            "staff": <StaffList />,
            "vehicle/create": <NewCar />,
            "vehicles": <CarList />,
            "tariff/create": <TariffCreatePage />,
            "tariffs": <TariffListPage />,
            "area/create": <ZoneCreatePage />,
            "areas": <ZoneListPage />,
            "coupons": <CouponListPage />,
            "banners": <BannerListPage />,
            "reward-points": <RewardPointsPage />,
            "customer/create": <NewCustomer />,
            "customers": <CustomerList />,
            "driver/create": <NewDriver />,
            "vehicle-owner/create": <NewVehicleOwner />,
            "vehicle-owners": <VehicleOwnerList />,
            "documents/users": <DocumentReviewPage subject="users" />,
            "documents/drivers": <DocumentReviewPage subject="drivers" />,
            "documents/vehicle-owners": <DocumentReviewPage subject="vehicle-owners" />,
            "documents/vehicles": <VehicleDocumentReviewPage />,
            "documents/definitions": <DocumentDefinitionsPage />,
            "transactions": <TransactionsPage />,
            "wallets": <WalletsPage />,
            "payouts": <PayoutsPage />,
            "settings": <SystemSettingsPage />,
            "reports/drivers": <DriverReportPage />,
            "reports/customers": <CustomerReportPage />,
            "reports/payments": <PaymentReportPage />,
            "rental-packages": <RentalPackagesPage />,
            "rental-bookings": <RentalBookingListPage />,
        };

        if (adminMap[path]) {
            return adminMap[path];
        }
    }

    if (role === "dispatcher") {
        const dispatcherMap = {
            "customer/create": <NewCustomer />,
            "customers": <CustomerList />,
            "rental-bookings": <RentalBookingListPage />,
        };

        if (dispatcherMap[path]) {
            return dispatcherMap[path];
        }
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
                <Route path="vehicle-owners/:ownerId" element={<VehicleOwnerDetail />} />
                <Route path="vehicle-owners/:ownerId/edit" element={<EditVehicleOwner />} />
                <Route path="staff/:userId" element={<StaffDetail />} />
                <Route path="staff/:userId/edit" element={<EditStaff />} />
                <Route path="tariffs/:id/edit" element={<TariffEditPage />} />
                <Route path="areas/:id/edit" element={<ZoneEditPage />} />
                <Route path="coupons/create" element={<CouponCreatePage />} />
                <Route path="coupons/:id" element={<CouponDetailPage />} />
                <Route path="coupons/:id/edit" element={<CouponEditPage />} />
                <Route path="banners/create" element={<BannerCreatePage />} />
                <Route path="banners/:id" element={<BannerDetailPage />} />
                <Route path="banners/:id/edit" element={<BannerEditPage />} />
                <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
            </Route>

            <Route path="/dispatcher" element={<Layout allowedRole="dispatcher" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                {renderRoleRoutes("dispatcher")}
                <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
            </Route>

            <Route path="*" element={<Navigate to={getDefaultPathForRole()} replace />} />
        </Routes>
    );
}
