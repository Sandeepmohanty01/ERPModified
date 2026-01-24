import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SyncStatusIndicator } from './SyncStatus';

const Layout = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <Sidebar user={user} onLogout={onLogout} />
      {/* Sync Status Bar - Fixed at top right on desktop */}
      <div className="fixed top-2 right-4 z-50 hidden lg:flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
        <SyncStatusIndicator />
      </div>
      {/* Mobile sync status - shown in header area */}
      <div className="lg:hidden fixed top-2 right-14 z-50">
        <SyncStatusIndicator />
      </div>
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
