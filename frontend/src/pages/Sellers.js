import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Phone, Mail, Wifi, WifiOff } from 'lucide-react';
import useOfflineSync from '../hooks/useOfflineSync';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState(null);

  // Offline sync hook
  const { isOnline, pendingChanges, saveOffline, deleteOffline } = useOfflineSync();
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sellers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSellers(response.data);
    } catch (error) {
      toast.error('Failed to fetch sellers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        email: formData.email || null,
        address: formData.address || null,
      };

      if (editingSeller) {
        payload.id = editingSeller.id;

        if (isOnline) {
          await axios.put(`${API}/sellers/${editingSeller.id}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });
          toast.success('Seller updated successfully');
        } else {
          await saveOffline('sellers', payload, true);
          toast.success('Seller updated offline, will sync when online');
        }

        setSellers(sellers.map(s => s.id === editingSeller.id ? { ...s, ...payload } : s));
      } else {
        const newSeller = {
          ...payload,
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString()
        };

        if (isOnline) {
          const response = await axios.post(`${API}/sellers`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });
          toast.success('Seller created successfully');
          setSellers([response.data, ...sellers]);
        } else {
          await saveOffline('sellers', newSeller, true);
          toast.success('Seller saved offline, will sync when online');
          setSellers([newSeller, ...sellers]);
        }
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this seller?')) return;

    try {
      const token = localStorage.getItem('token');

      if (isOnline) {
        await axios.delete(`${API}/sellers/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Seller deleted successfully');
      } else {
        await deleteOffline('sellers', id, true);
        toast.success('Seller deleted offline, will sync when online');
      }

      setSellers(sellers.filter(s => s.id !== id));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const openEditDialog = (seller) => {
    setEditingSeller(seller);
    setFormData({
      name: seller.name,
      contact: seller.contact,
      email: seller.email || '',
      address: seller.address || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSeller(null);
    setFormData({ name: '', contact: '', email: '', address: '' });
  };

  return (
    <div className="p-8 md:p-12" data-testid="sellers-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-serif font-bold text-[#022c22]" data-testid="sellers-title">Sellers</h1>
            {isOnline ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                <Wifi size={12} />
                <span>Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                <WifiOff size={12} />
                <span>Offline</span>
              </div>
            )}
            {pendingChanges > 0 && (
              <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                {pendingChanges} pending sync
              </div>
            )}
          </div>
          <p className="text-stone-500">Manage seller/vendor information</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="add-seller-button"
              className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] hover:shadow-lg"
            >
              <Plus size={18} className="mr-2" /> Add Seller
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editingSeller ? 'Edit Seller' : 'Add New Seller'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Seller Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="seller-name-input"
                />
              </div>
              <div>
                <Label htmlFor="contact">Contact Number</Label>
                <Input
                  id="contact"
                  type="tel"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  pattern="[0-9\s\-\+\(\)]+"
                  title="Contact number must contain only digits, spaces, hyphens, parentheses, or plus sign"
                  minLength={10}
                  required
                  data-testid="seller-contact-input"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="seller-email-input"
                />
              </div>
              <div>
                <Label htmlFor="address">Address (Optional)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  data-testid="seller-address-input"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="save-seller-button"
                  className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : (editingSeller ? 'Update' : 'Create')}
                </Button>
                <Button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  data-testid="cancel-seller-button"
                  className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sellers.map((seller) => (
            <div
              key={seller.id}
              data-testid={`seller-card-${seller.id}`}
              className="bg-white rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-serif font-bold text-[#022c22]">{seller.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditDialog(seller)}
                    data-testid={`edit-seller-${seller.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(seller.id)}
                    data-testid={`delete-seller-${seller.id}`}
                    className="text-rose-600 hover:text-rose-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Phone size={14} />
                  <span>{seller.contact}</span>
                </div>
                {seller.email && (
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Mail size={14} />
                    <span>{seller.email}</span>
                  </div>
                )}
                {seller.address && (
                  <p className="text-sm text-stone-500 mt-2">{seller.address}</p>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-4">
                Added: {new Date(seller.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sellers;