export type AdminProduct = 'core' | 'analysis';

const PRODUCT_KEY = 'pmub_admin_product';

export const PRODUCTS: Record<
  AdminProduct,
  {
    id: AdminProduct;
    name: string;
    shortName: string;
    subtitle: string;
    basePath: string;
  }
> = {
  core: {
    id: 'core',
    name: "PMU'B/LONAB",
    shortName: "PMU'B",
    subtitle: 'Programme, resultats et gestion courante',
    basePath: '',
  },
  analysis: {
    id: 'analysis',
    name: "PMU'B/LONAB/Analysis",
    shortName: 'Analysis',
    subtitle: 'Recherche, historique et intelligence PDF',
    basePath: '/analysis',
  },
};

export function getSelectedProduct(): AdminProduct | null {
  const value = localStorage.getItem(PRODUCT_KEY);
  return value === 'core' || value === 'analysis' ? value : null;
}

export function setSelectedProduct(product: AdminProduct) {
  localStorage.setItem(PRODUCT_KEY, product);
}

export function clearSelectedProduct() {
  localStorage.removeItem(PRODUCT_KEY);
}

export function getProductHome(product: AdminProduct): string {
  return product === 'analysis' ? '/analysis/dashboard' : '/dashboard';
}
