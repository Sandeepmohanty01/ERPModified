import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Wifi, WifiOff } from 'lucide-react';
import useOfflineSync from '../hooks/useOfflineSync';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // Offline sync hook
  const { isOnline, pendingChanges, saveOffline, deleteOffline } = useOfflineSync();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data);
    } catch (error) {
      toast.error('Failed to fetch categories');
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
        description: formData.description || null
      };

      if (editingCategory) {
        payload.id = editingCategory.id;

        if (isOnline) {
          await axios.put(`${API}/categories/${editingCategory.id}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });
          toast.success('Category updated successfully');
        } else {
          await saveOffline('categories', payload, true);
          toast.success('Category updated offline, will sync when online');
        }

        setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, ...payload } : c));
      } else {
        const newCategory = {
          ...payload,
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString()
        };

        if (isOnline) {
          const response = await axios.post(`${API}/categories`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });
          toast.success('Category created successfully');
          setCategories([response.data, ...categories]);
        } else {
          await saveOffline('categories', newCategory, true);
          toast.success('Category saved offline, will sync when online');
          setCategories([newCategory, ...categories]);
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
    if (!window.confirm('Are you sure? This will fail if the category has items.')) return;

    try {
      const token = localStorage.getItem('token');

      if (isOnline) {
        await axios.delete(`${API}/categories/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Category deleted successfully');
      } else {
        await deleteOffline('categories', id, true);
        toast.success('Category deleted offline, will sync when online');
      }

      setCategories(categories.filter(c => c.id !== id));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const openEditDialog = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || '' });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
  };

  return (
    <div className="p-8 md:p-12" data-testid="categories-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-serif font-bold text-[#022c22]" data-testid="categories-title">Categories</h1>
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
          <p className="text-stone-500">Organize your jewellery items</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="add-category-button"
              className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] hover:shadow-lg"
            >
              <Plus size={18} className="mr-2" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="category-name-input"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="category-description-input"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="save-category-button"
                  className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
                </Button>
                <Button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  data-testid="cancel-category-button"
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
          {categories.map((category) => (
            <div
              key={category.id}
              data-testid={`category-card-${category.id}`}
              className="bg-white rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-serif font-bold text-[#022c22]">{category.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditDialog(category)}
                    data-testid={`edit-category-${category.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    data-testid={`delete-category-${category.id}`}
                    className="text-rose-600 hover:text-rose-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {category.description && (
                <p className="text-sm text-stone-500">{category.description}</p>
              )}
              <p className="text-xs text-stone-400 mt-3">
                Created: {new Date(category.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Categories;