import { useNavigate } from 'react-router-dom';
import { BarChart3, ChevronRight, ClipboardList } from 'lucide-react';
import { PRODUCTS, AdminProduct, getProductHome, setSelectedProduct } from '@/lib/product';

const productCards: Array<{
  product: AdminProduct;
  icon: typeof ClipboardList;
}> = [
  { product: 'core', icon: ClipboardList },
  { product: 'analysis', icon: BarChart3 },
];

export default function ProductSelection() {
  const navigate = useNavigate();

  const selectProduct = (product: AdminProduct) => {
    setSelectedProduct(product);
    navigate(getProductHome(product), { replace: true });
  };

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col justify-center">
        <div className="mb-8">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-lg font-bold text-white">
            H
          </div>
          <h1 className="text-2xl font-semibold text-fg">Choisir un espace admin</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Selectionnez le produit a administrer.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {productCards.map(({ product, icon: Icon }) => {
            const details = PRODUCTS[product];

            return (
              <button
                key={product}
                type="button"
                onClick={() => selectProduct(product)}
                className="card group flex min-h-40 items-center gap-4 p-5 text-left transition-colors hover:border-border-strong hover:bg-bg-elevated/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-bg-elevated text-accent">
                  <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-fg">{details.name}</h2>
                  <p className="mt-1 text-sm text-fg-muted">{details.subtitle}</p>
                </div>
                <ChevronRight
                  size={20}
                  className="shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
