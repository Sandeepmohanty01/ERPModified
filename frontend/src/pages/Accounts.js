import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Accounts = () => {
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [expenseFormData, setExpenseFormData] = useState({
    category: '',
    description: '',
    amount: '',
    payment_method: 'cash',
    notes: '',
  });
  const [paymentFormData, setPaymentFormData] = useState({
    invoice_id: '',
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [summaryRes, expensesRes, paymentsRes, invoicesRes] = await Promise.all([
        axios.get(`${API}/accounts/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/expenses`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/payments`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/invoices`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setSummary(summaryRes.data);
      setExpenses(expensesRes.data);
      setPayments(paymentsRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      toast.error('Failed to fetch account data');
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/expenses`,
        {
          ...expenseFormData,
          amount: parseFloat(expenseFormData.amount),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Expense added successfully');
      setExpenseDialogOpen(false);
      resetExpenseForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/payments`,
        {
          ...paymentFormData,
          amount: parseFloat(paymentFormData.amount),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      resetPaymentForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      category: '',
      description: '',
      amount: '',
      payment_method: 'cash',
      notes: '',
    });
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      invoice_id: '',
      amount: '',
      payment_method: 'cash',
      reference_number: '',
      notes: '',
    });
  };

  if (loading) {
    return (
      <div className="p-8 md:p-12">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12" data-testid="accounts-container">
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-bold text-[#022c22] mb-2" data-testid="accounts-title">Accounts</h1>
        <p className="text-stone-500">Financial overview and management</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-emerald-50">
              <TrendingUp className="text-emerald-600" size={24} strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-sm text-stone-500 mb-1">Total Revenue</p>
          <p className="text-3xl font-serif font-bold text-[#1c1917]">₹{summary?.total_revenue?.toFixed(2) || 0}</p>
          <p className="text-xs text-emerald-600 mt-2">Paid: ₹{summary?.paid_revenue?.toFixed(2) || 0}</p>
        </div>

        <div className="bg-white rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-rose-50">
              <TrendingDown className="text-rose-600" size={24} strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-sm text-stone-500 mb-1">Total Expenses</p>
          <p className="text-3xl font-serif font-bold text-[#1c1917]">₹{summary?.total_expenses?.toFixed(2) || 0}</p>
        </div>

        <div className="bg-white rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-50">
              <DollarSign className="text-blue-600" size={24} strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-sm text-stone-500 mb-1">Net Profit</p>
          <p
            className={`text-3xl font-serif font-bold ${
              summary?.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            ₹{summary?.profit?.toFixed(2) || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-amber-50">
              <CreditCard className="text-amber-600" size={24} strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-sm text-stone-500 mb-1">Pending Payments</p>
          <p className="text-3xl font-serif font-bold text-[#1c1917]">₹{summary?.pending_revenue?.toFixed(2) || 0}</p>
          <p className="text-xs text-stone-500 mt-2">{summary?.pending_invoices} invoices</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetPaymentForm}
              data-testid="record-payment-button"
              className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] hover:shadow-lg"
            >
              <Plus size={18} className="mr-2" /> Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Record Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="invoice">Invoice</Label>
                <Select
                  value={paymentFormData.invoice_id}
                  onValueChange={(value) => setPaymentFormData({ ...paymentFormData, invoice_id: value })}
                >
                  <SelectTrigger data-testid="payment-invoice-select">
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices
                      .filter((inv) => inv.payment_status !== 'paid')
                      .map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoice_number} - {invoice.customer_name} (₹{invoice.total_amount})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment_amount">Amount (₹)</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  required
                  data-testid="payment-amount-input"
                />
              </div>
              <div>
                <Label htmlFor="payment_method_payment">Payment Method</Label>
                <Select
                  value={paymentFormData.payment_method}
                  onValueChange={(value) => setPaymentFormData({ ...paymentFormData, payment_method: value })}
                >
                  <SelectTrigger data-testid="payment-method-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reference_number">Reference Number (Optional)</Label>
                <Input
                  id="reference_number"
                  value={paymentFormData.reference_number}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_number: e.target.value })}
                  data-testid="payment-reference-input"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  data-testid="save-payment-button"
                  className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b]"
                >
                  Record
                </Button>
                <Button
                  type="button"
                  onClick={() => setPaymentDialogOpen(false)}
                  className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetExpenseForm}
              data-testid="add-expense-button"
              className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
            >
              <Plus size={18} className="mr-2" /> Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Add Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleExpenseSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={expenseFormData.category}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                  placeholder="e.g., Rent, Utilities, Salary"
                  required
                  data-testid="expense-category-input"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={expenseFormData.description}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                  required
                  data-testid="expense-description-input"
                />
              </div>
              <div>
                <Label htmlFor="expense_amount">Amount (₹)</Label>
                <Input
                  id="expense_amount"
                  type="number"
                  step="0.01"
                  value={expenseFormData.amount}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                  required
                  data-testid="expense-amount-input"
                />
              </div>
              <div>
                <Label htmlFor="expense_payment_method">Payment Method</Label>
                <Select
                  value={expenseFormData.payment_method}
                  onValueChange={(value) => setExpenseFormData({ ...expenseFormData, payment_method: value })}
                >
                  <SelectTrigger data-testid="expense-payment-method-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expense_notes">Notes (Optional)</Label>
                <Textarea
                  id="expense_notes"
                  value={expenseFormData.notes}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                  data-testid="expense-notes-input"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  data-testid="save-expense-button"
                  className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b]"
                >
                  Add
                </Button>
                <Button
                  type="button"
                  onClick={() => setExpenseDialogOpen(false)}
                  className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-6 mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-4">Recent Expenses</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#fafaf9] text-[#78716c] font-serif uppercase tracking-wider text-xs">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
              </tr>
            </thead>
            <tbody>
              {expenses.slice(0, 10).map((expense) => (
                <tr key={expense.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/50 transition-colors">
                  <td className="py-3 px-4">{new Date(expense.expense_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-stone-100 text-stone-700 rounded text-xs font-medium">
                      {expense.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">{expense.description}</td>
                  <td className="py-3 px-4 font-bold text-rose-600">-₹{expense.amount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-xs">{expense.payment_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-6">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-4">Recent Payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#fafaf9] text-[#78716c] font-serif uppercase tracking-wider text-xs">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 10).map((payment) => (
                <tr key={payment.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/50 transition-colors">
                  <td className="py-3 px-4">{new Date(payment.payment_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{payment.invoice_id.substring(0, 8)}...</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">+₹{payment.amount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-xs">{payment.payment_method}</td>
                  <td className="py-3 px-4 text-xs">{payment.reference_number || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Accounts;
