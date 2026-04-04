import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { OWNER_ROUTES } from '../../constants/routes';
import { ownerAuthService } from '../../services/ownerAuthService';

export default function RequireOwnerAuth() {
  const location = useLocation();

  if (!ownerAuthService.isAuthenticated()) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={OWNER_ROUTES.LOGIN} replace state={{ from }} />;
  }

  return <Outlet />;
}
