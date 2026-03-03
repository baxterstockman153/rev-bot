import { Navigate } from 'react-router-dom';
import { useAdmin } from './AdminContext.jsx';

export default function RequireAdmin({ children }) {
  const { token } = useAdmin();
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}
