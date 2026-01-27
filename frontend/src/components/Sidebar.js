import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Users, Tag, ShoppingCart, UserCircle, 
  Shield, LogOut, Receipt, DollarSign, UserPlus, BookOpen, 
  ClipboardList, Menu, X, ChevronDown, ChevronRight
} from 'lucide-react';

const Sidebar = ({ user, onLogout }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stockMenuOpen, setStockMenuOpen] = useState(
    location.pathname.includes('/stock') || location.pathname === '/inventory'
  );

  const mainMenuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ];

  const stockMenuItems = [
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/stock-ledger', icon: BookOpen, label: 'Stock Ledger' },
    { path: '/stock-adjustment', icon: ClipboardList, label: 'Stock Adjustment' },
  ];

  const otherMenuItems = [
    // { path: '/categories', icon: Tag, label: 'Categories' },
    // { path: '/transactions', icon: ShoppingCart, label: 'Transactions' },
    // { path: '/invoices', icon: Receipt, label: 'Invoices' },
    // { path: '/customers', icon: UserPlus, label: 'Customers' },
    // { path: '/sellers', icon: UserCircle, label: 'Sellers' },
    // { path: '/accounts', icon: DollarSign, label: 'Accounts' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/roles', icon: Shield, label: 'Roles' },
  ];

  const NavLink = ({ item, onClick }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={onClick}
        data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-sm font-medium tracking-wide transition-all duration-300 ${
          isActive
            ? 'bg-[#d4af37] text-[#022c22]'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon size={18} strokeWidth={1.5} />
        <span className="text-sm">{item.label}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 lg:p-6 border-b border-[#d4af37]/20">
        <h1 className="text-xl lg:text-2xl font-serif font-bold text-[#d4af37]" data-testid="sidebar-title">Metra Mind</h1>
        <p className="text-xs text-white/70 mt-1">Jewellery ERP v2.0</p>
      </div>

      <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
        {mainMenuItems.map((item) => (
          <NavLink key={item.path} item={item} onClick={() => setMobileOpen(false)} />
        ))}

        {/* Stock Management Submenu */}
        <div className="pt-2">
          <button
            onClick={() => setStockMenuOpen(!stockMenuOpen)}
            data-testid="stock-menu-toggle"
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-sm font-medium tracking-wide text-white/80 hover:bg-white/10 hover:text-white transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <Package size={18} strokeWidth={1.5} />
              <span className="text-sm">Stock Management</span>
            </div>
            {stockMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {stockMenuOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-[#d4af37]/20 pl-2">
              {stockMenuItems.map((item) => (
                <NavLink key={item.path} item={item} onClick={() => setMobileOpen(false)} />
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-[#d4af37]/10 mt-2">
          {otherMenuItems.map((item) => (
            <NavLink key={item.path} item={item} onClick={() => setMobileOpen(false)} />
          ))}
        </div>
      </nav>

      <div className="p-3 lg:p-4 border-t border-[#d4af37]/20">
        <div className="px-4 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{user?.name}</p>
          <p className="text-xs text-white/60 truncate">{user?.email}</p>
        </div>
        <button
          onClick={() => {
            setMobileOpen(false);
            onLogout();
          }}
          data-testid="logout-button"
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-sm font-medium tracking-wide text-white/80 hover:bg-white/10 hover:text-white transition-all duration-300"
        >
          <LogOut size={18} strokeWidth={1.5} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#022c22] border-b border-[#d4af37]/20 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-serif font-bold text-[#d4af37]">Metra Mind</h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          data-testid="mobile-menu-toggle"
          className="text-white/80 hover:text-white p-2"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-[#022c22] z-50 transform transition-transform duration-300 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col`}>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-[#022c22] text-white h-screen fixed left-0 top-0 z-50 border-r border-[#d4af37]/20 flex-col">
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar;
