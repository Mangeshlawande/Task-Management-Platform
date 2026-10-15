import { Outlet } from 'react-router-dom';

/** Public routes shell (Login, Register use full-screen AuthLayout). */
export function PublicLayout() {
  return <Outlet />;
}
