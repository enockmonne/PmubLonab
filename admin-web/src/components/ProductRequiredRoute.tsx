import { Navigate } from 'react-router-dom';
import { getSelectedProduct } from '@/lib/product';

export default function ProductRequiredRoute({ children }: { children: React.ReactNode }) {
  if (!getSelectedProduct()) {
    return <Navigate to="/products" replace />;
  }

  return <>{children}</>;
}
