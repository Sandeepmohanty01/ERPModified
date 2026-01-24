import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [items, setItems] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: 'sale',
    item_id: '',
    seller_id: '',
    quantity: '1',
    amount: '',
    notes: '',
  });

  useEffect(() => {
    fetchTransactions();
    fetchItems();
    fetchSellers();
  }, []);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(response.data);
    } catch (error) {
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch items');
    }
  };

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sellers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSellers(response.data);
    } catch (error) {
      console.error('Failed to fetch sellers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity),
        amount: formData.amount ? parseFloat(formData.amount) : null,
        seller_id: formData.seller_id || null,
      };

      await axios.post(`${API}/transactions`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Transaction created successfully');
      setDialogOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_type: 'sale',
      item_id: '',
      seller_id: '',
      quantity: '1',
      amount: '',
      notes: '',
    });
  };

  const getItemName = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    return item ? `${item.name} (${item.design_code})` : 'Unknown Item';
  };

  const getSellerName = (sellerId) => {
    if (!sellerId) return 'N/A';
    const seller = sellers.find((s) => s.id === sellerId);
    return seller ? seller.name : 'Unknown Seller';
  };

  return (
    <div className="p-8 md:p-12" data-testid="transactions-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#022c22] mb-2" data-testid="transactions-title">Transactions</h1>
          <p className="text-stone-500">Track sales, issues, and returns</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="add-transaction-button"
              className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] hover:shadow-lg"
            >
              <Plus size={18} className="mr-2" /> New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">New Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="type">Transaction Type</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                >
                  <SelectTrigger data-testid="transaction-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="issue">Issue to Seller</SelectItem>
                    <SelectItem value="return">Return from Seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="item">Item</Label>
                <Select value={formData.item_id} onValueChange={(value) => setFormData({ ...formData, item_id: value })}>
                  <SelectTrigger data-testid="transaction-item-select">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} - {item.design_code} (Qty: {item.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(formData.transaction_type === 'issue' || formData.transaction_type === 'return') && (
                <div>
                  <Label htmlFor="seller">Seller</Label>
                  <Select value={formData.seller_id} onValueChange={(value) => setFormData({ ...formData, seller_id: value })}>
                    <SelectTrigger data-testid="transaction-seller-select">
                      <SelectValue placeholder="Select seller" />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  data-testid="transaction-quantity-input"
                />
              </div>
              {formData.transaction_type === 'sale' && (
                <div>
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    data-testid="transaction-amount-input"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="transaction-notes-input"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  data-testid="save-transaction-button"
                  className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b]"
                >
                  Create
                </Button>
                <Button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  data-testid="cancel-transaction-button"
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
        <div className="bg-white rounded-lg border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#fafaf9] text-[#78716c] font-serif uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-4 px-4">Date</th>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-4">Item</th>
                  <th className="py-4 px-4">Seller</th>
                  <th className="py-4 px-4">Quantity</th>
                  <th className="py-4 px-4">Amount</th>
                  <th className="py-4 px-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/50 transition-colors">
                    <td className="py-3 px-4">{new Date(txn.created_at).toLocaleString()}</td>
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
                    <td className="py-3 px-4">{getItemName(txn.item_id)}</td>
                    <td className="py-3 px-4">{getSellerName(txn.seller_id)}</td>
                    <td className="py-3 px-4">{txn.quantity}</td>
                    <td className="py-3 px-4">{txn.amount ? `₹${txn.amount.toFixed(2)}` : 'N/A'}</td>
                    <td className="py-3 px-4">{txn.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;