import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  DownloadCloud,
  Trophy,
  Megaphone,
  History,
  KeyRound,
  Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSelectedProduct, PRODUCTS } from '@/lib/product';

const coreNavItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload PDF', icon: UploadCloud },
  { to: '/archive-import', label: 'Import LONAB', icon: DownloadCloud },
  { to: '/races', label: 'Courses', icon: Trophy },
  { to: '/announcements', label: 'Annonces', icon: Megaphone },
  { to: '/beta-access', label: 'Acces beta', icon: KeyRound },
  { to: '/logs', label: 'Activite', icon: History },
  { to: '/settings', label: 'Parametres', icon: SettingsIcon },
];

const analysisNavItems = [
  { to: '/analysis/dashboard', label: 'Analyse', icon: LayoutDashboard },
  { to: '/analysis/upload', label: 'Upload PDF', icon: UploadCloud },
  { to: '/analysis/archive-import', label: 'Import LONAB', icon: DownloadCloud },
  { to: '/analysis/races', label: 'Corpus courses', icon: Trophy },
  { to: '/analysis/logs', label: 'Activite', icon: History },
  { to: '/analysis/settings', label: 'Parametres', icon: SettingsIcon },
];

export default function Sidebar() {
  const selectedProduct = getSelectedProduct() || 'core';
  const product = PRODUCTS[selectedProduct];
  const navItems = selectedProduct === 'analysis' ? analysisNavItems : coreNavItems;

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-bg-surface flex flex-col">
      <div className="h-14 px-4 flex items-center gap-2 border-b border-border">
        <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white font-bold">
          H
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-fg">{product.shortName} Admin</span>
          <span className="text-[10px] text-fg-subtle uppercase tracking-wider">
            {selectedProduct === 'analysis' ? 'Recherche' : 'Le Journal Hippique'}
          </span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-bg-elevated text-fg font-medium'
                  : 'text-fg-muted hover:text-fg hover:bg-bg-elevated/50'
              )
            }
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <p className="text-[11px] text-fg-subtle">v1.0.0 - Admin Web</p>
      </div>
    </aside>
  );
}
