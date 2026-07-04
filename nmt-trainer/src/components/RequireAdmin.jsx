import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAdmin({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <div className="p-10 text-center font-bold text-stone-400">Завантаження...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (!isAdmin) {
    alert('Доступ заборонено: потрібні права вчителя');
    return <Navigate to="/" replace />;
  }

  return children;
}