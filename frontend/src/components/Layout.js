import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
