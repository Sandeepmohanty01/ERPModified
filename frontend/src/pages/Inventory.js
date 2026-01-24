import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, QrCode } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQRCode, setSelectedQRCode] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    weight: '',
    purity: '',
    metal_type: '',
    stone_details: '',
    design_code: '',
    making_charges: '',
    base_price: '',
    selling_price: '',
    dimensions: '',
    certification: '',
    quantity: '1',
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        weight: parseFloat(formData.weight),
        making_charges: parseFloat(formData.making_charges),
        base_price: parseFloat(formData.base_price),
        selling_price: parseFloat(formData.selling_price),
        quantity: parseInt(formData.quantity),
        images: [],
      };

      if (editingItem) {
        await axios.put(`${API}/items/${editingItem.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Item updated successfully');
      } else {
        await axios.post(`${API}/items`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Item created successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/items/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Item deleted successfully');
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category_id: item.category_id,
      weight: item.weight.toString(),
      purity: item.purity,
      metal_type: item.metal_type,
      stone_details: item.stone_details || '',
      design_code: item.design_code,
      making_charges: item.making_charges.toString(),
      base_price: item.base_price.toString(),
      selling_price: item.selling_price.toString(),
      dimensions: item.dimensions || '',
      certification: item.certification || '',
      quantity: item.quantity.toString(),
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category_id: '',
      weight: '',
      purity: '',
      metal_type: '',
      stone_details: '',
      design_code: '',
      making_charges: '',
      base_price: '',
      selling_price: '',
      dimensions: '',
      certification: '',
      quantity: '1',
    });
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.design_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8" data-testid="inventory-container">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-serif font-bold text-[#022c22] mb-1" data-testid="inventory-title">Inventory</h1>
          <p className="text-sm lg:text-base text-stone-500">Manage your jewellery items</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="add-item-button"
              className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] hover:shadow-lg text-sm"
            >
              <Plus size={16} className="mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl lg:text-2xl">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="item-name-input"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger data-testid="item-category-select">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="metal_type">Metal Type</Label>
                  <Input
                    id="metal_type"
                    placeholder="Gold, Silver, Platinum"
                    value={formData.metal_type}
                    onChange={(e) => setFormData({ ...formData, metal_type: e.target.value })}
                    required
                    data-testid="item-metal-input"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="purity">Purity</Label>
                  <Input
                    id="purity"
                    placeholder="22K, 18K, 925"
                    value={formData.purity}
                    onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                    required
                    data-testid="item-purity-input"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (grams)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    required
                    data-testid="item-weight-input"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="design_code">Design Code (Unique)</Label>
                  <Input
                    id="design_code"
                    value={formData.design_code}
                    onChange={(e) => setFormData({ ...formData, design_code: e.target.value })}
                    required
                    placeholder="e.g., TGR-2024-001"
                    data-testid="item-design-code-input"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="base_price">Base Price (₹)</Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    required
                    data-testid="item-base-price-input"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="making_charges">Making Charges (₹)</Label>
                  <Input
                    id="making_charges"
                    type="number"
                    step="0.01"
                    value={formData.making_charges}
                    onChange={(e) => setFormData({ ...formData, making_charges: e.target.value })}
                    required
                    data-testid="item-making-charges-input"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="selling_price">Selling Price (₹)</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    required
                    data-testid="item-selling-price-input"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    data-testid="item-quantity-input"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="stone_details">Stone Details</Label>
                  <Input
                    id="stone_details"
                    value={formData.stone_details}
                    onChange={(e) => setFormData({ ...formData, stone_details: e.target.value })}
                    placeholder="Diamond, Ruby, etc."
                    data-testid="item-stone-input"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input
                    id="dimensions"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    placeholder="L x W x H"
                    data-testid="item-dimensions-input"
                    className="text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="certification">Certification</Label>
                  <Input
                    id="certification"
                    value={formData.certification}
                    onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
                    placeholder="GIA, IGI, etc."
                    data-testid="item-certification-input"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  data-testid="save-item-button"
                  className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] text-sm"
                >
                  {editingItem ? 'Update' : 'Create'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  data-testid="cancel-item-button"
                  variant="outline"
                  className="rounded-sm font-medium tracking-wide text-sm"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400" size={18} />
          <Input
            placeholder="Search items by name or design code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="search-items-input"
            className="pl-10 rounded-sm text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[900px]">
              <thead className="bg-[#fafaf9] text-[#78716c] font-serif uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3 px-3 lg:px-4">Design Code</th>
                  <th className="py-3 px-3 lg:px-4">Name</th>
                  <th className="py-3 px-3 lg:px-4">Metal</th>
                  <th className="py-3 px-3 lg:px-4">Weight</th>
                  <th className="py-3 px-3 lg:px-4">Purity</th>
                  <th className="py-3 px-3 lg:px-4">Price</th>
                  <th className="py-3 px-3 lg:px-4">Qty</th>
                  <th className="py-3 px-3 lg:px-4">QR Code</th>
                  <th className="py-3 px-3 lg:px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-8 text-stone-500">No items found</td></tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/50 transition-colors">
                      <td className="py-2.5 px-3 lg:px-4 font-medium text-xs lg:text-sm">{item.design_code}</td>
                      <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{item.name}</td>
                      <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{item.metal_type}</td>
                      <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{item.weight}g</td>
                      <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{item.purity}</td>
                      <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">₹{item.selling_price?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 lg:px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.quantity <= 2 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 lg:px-4">
                        <button
                          onClick={() => setSelectedQRCode(item)}
                          data-testid={`view-qrcode-${item.id}`}
                          className="text-[#022c22] hover:text-[#064e3b] p-1"
                          title="View QR Code"
                        >
                          <QrCode size={18} />
                        </button>
                      </td>
                      <td className="py-2.5 px-3 lg:px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditDialog(item)}
                            data-testid={`edit-item-${item.id}`}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            data-testid={`delete-item-${item.id}`}
                            className="text-rose-600 hover:text-rose-800 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <Dialog open={!!selectedQRCode} onOpenChange={() => setSelectedQRCode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-center">QR Code</DialogTitle>
          </DialogHeader>
          {selectedQRCode && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                {selectedQRCode.qr_code_image ? (
                  <img 
                    src={selectedQRCode.qr_code_image} 
                    alt={`QR Code for ${selectedQRCode.design_code}`} 
                    className="w-48 h-48 object-contain"
                    data-testid="qr-code-image"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-stone-100 text-stone-400 text-sm">
                    QR Code not available
                  </div>
                )}
              </div>
              <div className="text-center space-y-1">
                <p className="font-serif font-bold text-lg text-[#022c22]">{selectedQRCode.design_code}</p>
                <p className="text-sm text-stone-600">{selectedQRCode.name}</p>
                <p className="text-xs text-stone-400">{selectedQRCode.metal_type} • {selectedQRCode.purity}</p>
              </div>
              <div className="w-full pt-2 border-t border-stone-100">
                <p className="text-xs text-stone-500 text-center">
                  Scan this QR code to identify this unique jewellery item
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
