import { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, Users, Tag, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 md:p-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-stone-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-stone-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Items',
      value: stats?.total_items || 0,
      icon: Package,
      color: 'text-[#022c22]',
      bg: 'bg-[#f0fdf4]',
    },
    {
      title: 'Categories',
      value: stats?.total_categories || 0,
      icon: Tag,
      color: 'text-[#d4af37]',
      bg: 'bg-[#fef3c7]',
    },
    {
      title: 'Sellers',
      value: stats?.total_sellers || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Total Value',
      value: `₹${stats?.total_value?.toFixed(2) || 0}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="p-8 md:p-12" data-testid="dashboard-container">
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-bold text-[#022c22] mb-2" data-testid="dashboard-title">Dashboard</h1>
        <p className="text-stone-500">Welcome to your jewellery inventory system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              data-testid={`stat-card-${stat.title.toLowerCase().replace(' ', '-')}`}
              className="bg-white rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <Icon className={stat.color} size={24} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-sm text-stone-500 mb-1">{stat.title}</p>
              <p className="text-3xl font-serif font-bold text-[#1c1917]">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {stats?.low_stock_items && stats.low_stock_items.length > 0 && (
        <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-amber-600" size={20} />
            <h2 className="text-xl font-serif font-bold text-[#1c1917]" data-testid="low-stock-title">Low Stock Alert</h2>
          </div>
          <div className="space-y-2">
            {stats.low_stock_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50 rounded border border-amber-200">
                <div>
                  <p className="font-medium text-sm text-[#1c1917]">{item.name}</p>
                  <p className="text-xs text-stone-500">{item.design_code}</p>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium uppercase tracking-wider">
                  Qty: {item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* {stats?.recent_transactions && stats.recent_transactions.length > 0 && (
        <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={20} />
            <h2 className="text-xl font-serif font-bold text-[#1c1917]" data-testid="recent-transactions-title">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#fafaf9] text-[#78716c] font-serif uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-4">Quantity</th>
                  <th className="py-4 px-4">Amount</th>
                  <th className="py-4 px-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/50 transition-colors">
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                          txn.transaction_type === 'sale'
                            ? 'bg-emerald-100 text-emerald-800'
                            : txn.transaction_type === 'issue'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {txn.transaction_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">{txn.quantity}</td>
                    <td className="py-3 px-4">₹{txn.amount?.toFixed(2) || 'N/A'}</td>
                    <td className="py-3 px-4">{new Date(txn.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default Dashboard;