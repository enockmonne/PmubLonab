import { useNavigate } from 'react-router-dom';
import { LogOut, Repeat2, User } from 'lucide-react';
import { clearAuth, getUser } from '@/lib/auth';
import { clearSelectedProduct, getSelectedProduct, PRODUCTS } from '@/lib/product';
import toast from 'react-hot-toast';

export default function TopBar() {
  const navigate = useNavigate();
  const user = getUser();
  const selectedProduct = getSelectedProduct();
  const product = selectedProduct ? PRODUCTS[selectedProduct] : null;

  const handleLogout = () => {
    clearAuth();
    clearSelectedProduct();
    toast.success('Deconnecte');
    navigate('/login');
  };

  return (
    <header className="h-14 shrink-0 border-b border-border bg-bg-surface px-6 flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {product && (
          <>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{product.name}</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-fg-subtle">
                {product.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="btn-ghost"
              title="Changer de produit"
            >
              <Repeat2 size={16} />
            </button>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <div className="w-7 h-7 rounded-full bg-bg-elevated border border-border flex items-center justify-center">
            <User size={14} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-fg text-xs font-medium">{user?.email || '-'}</span>
            <span className="text-[10px] text-fg-subtle uppercase tracking-wider">
              {user?.role || 'admin'}
            </span>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-ghost" title="Deconnexion">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
