import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import Categories from '@/pages/Categories';
import Transactions from '@/pages/Transactions';
import Invoices from '@/pages/Invoices';
import Customers from '@/pages/Customers';
import Sellers from '@/pages/Sellers';
import Accounts from '@/pages/Accounts';
import Users from '@/pages/Users';
import Roles from '@/pages/Roles';
import StockLedger from '@/pages/StockLedger';
import StockAdjustment from '@/pages/StockAdjustment';
import Layout from '@/components/Layout';
import offlineSyncService from '@/lib/offlineSync';
import '@/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
    
    // Initialize offline sync service
    offlineSyncService.init().then(() => {
      console.log('[App] Offline sync service initialized');
      // Trigger initial sync if online
      if (navigator.onLine && token) {
        offlineSyncService.sync();
      }
    }).catch(err => {
      console.error('[App] Failed to initialize offline sync:', err);
    });
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // Sync data after login
    setTimeout(() => {
      offlineSyncService.sync();
    }, 1000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <div className="text-2xl font-serif text-[#022c22]">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <Route element={<Layout user={user} onLogout={handleLogout} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/stock-ledger" element={<StockLedger />} />
              <Route path="/stock-adjustment" element={<StockAdjustment />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/sellers" element={<Sellers />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/users" element={<Users />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
