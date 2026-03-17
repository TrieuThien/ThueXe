import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { getDefaultPathForRole, getRoleLeafRoutes } from "../config/roleRoutes";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminProfilePage from "../pages/AdminProfilePage";
import DispatcherDashboardPage from "../pages/DispatcherDashboardPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import ModulePlaceholderPage from "../pages/ModulePlaceholderPage";
import NewCustomer from "../pages/customers/NewCustomer";
import CustomerList from "../pages/customers/CustomerList";
import CustomerDetail from "../pages/customers/CustomerDetail";
import EditCustomer from "../pages/customers/EditCustomer";
import CarList from "../pages/cars/CarList";
import NewCar from "../pages/cars/NewCar";
import StaffAccountPage from "../pages/StaffAccount";

function getElementByRoleAndPath(role, path) {
    if (path === "dashboard") {
        return role === "admin" ? <AdminDashboardPage /> : <DispatcherDashboardPage />;
    }

    if (path === "profile") {
        return <AdminProfilePage />;
    }

    if (role === "admin" && path === "staff/create") {
        return <StaffAccountPage />;
    }

    if (role === "admin" && path === "vehicle/create") {
        return <NewCar />;
    }

    if (role === "admin" && path === "vehicles") {
        return <CarList />;
    }

    if (role === "admin" && path === "customer/create") {
        return <NewCustomer />;
    }

    if (role === "admin" && path === "customers") {
        return <CustomerList />;
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
            </Route>

            <Route path="/dispatcher" element={<Layout allowedRole="dispatcher" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                {renderRoleRoutes("dispatcher")}
            </Route>

            <Route
                path="*"
                element={<Navigate to={getDefaultPathForRole()} replace />}
            />
        </Routes>
    );
}
