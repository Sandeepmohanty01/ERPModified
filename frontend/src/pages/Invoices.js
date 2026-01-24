import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, FileText, Trash2, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    items: [],
    discount: '0',
    cgst_rate: '1.5',
    sgst_rate: '1.5',
    igst_rate: '0',
    payment_method: 'cash',
    payment_status: 'pending',
    notes: '',
  });
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchItems();
  }, []);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers');
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

  const addItemToInvoice = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const invoiceItem = {
      item_id: item.id,
      item_name: item.name,
      design_code: item.design_code,
      hsn_code: '7113',
      quantity: 1,
      weight: item.weight,
      purity: item.purity,
      metal_type: item.metal_type,
      rate_per_gram: item.base_price / item.weight,
      making_charges: item.making_charges,
      stone_charges: 0,
      subtotal: item.selling_price,
    };

    setSelectedItems([...selectedItems, invoiceItem]);
  };

  const removeItemFromInvoice = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index, quantity) => {
    const updated = [...selectedItems];
    updated[index].quantity = parseInt(quantity);
    updated[index].subtotal =
      (updated[index].rate_per_gram * updated[index].weight + updated[index].making_charges + updated[index].stone_charges) *
      updated[index].quantity;
    setSelectedItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error('Please add at least one item to the invoice');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        items: selectedItems,
        discount: parseFloat(formData.discount),
        cgst_rate: parseFloat(formData.cgst_rate),
        sgst_rate: parseFloat(formData.sgst_rate),
        igst_rate: parseFloat(formData.igst_rate),
      };

      await axios.post(`${API}/invoices`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Invoice created successfully');
      setDialogOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const generatePDF = async (invoice) => {
    const doc = new jsPDF();
    
    // Fetch payment details if partial/pending
    let totalPaid = 0;
    if (invoice.payment_status === 'partial' || invoice.payment_status === 'pending') {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/invoices/${invoice.id}/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        totalPaid = response.data.total_paid;
      } catch (error) {
        console.error('Failed to fetch payment details');
      }
    }
    
    const remainingAmount = invoice.total_amount - totalPaid;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('METRA MIND JEWELLERS', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('GST Invoice', 105, 28, { align: 'center' });

    // Invoice Details
    doc.setFontSize(10);
    doc.text('Invoice No: ' + invoice.invoice_number, 14, 45);
    doc.text('Date: ' + new Date(invoice.invoice_date).toLocaleDateString(), 14, 52);

    // Customer Details
    doc.text('Bill To:', 14, 65);
    doc.text(invoice.customer_name, 14, 72);
    if (invoice.customer_address) doc.text(invoice.customer_address, 14, 79);
    doc.text('Contact: ' + invoice.customer_contact, 14, 86);
    if (invoice.customer_gstin) doc.text('GSTIN: ' + invoice.customer_gstin, 14, 93);

    // Items Table
    const tableData = invoice.items.map((item, idx) => [
      (idx + 1).toString(),
      item.item_name,
      item.design_code,
      item.hsn_code,
      item.weight + 'g',
      item.purity,
      item.quantity.toString(),
      'Rs ' + item.rate_per_gram.toFixed(2),
      'Rs ' + item.making_charges.toFixed(2),
      'Rs ' + item.subtotal.toFixed(2),
    ]);

    autoTable(doc, {
      startY: 105,
      head: [['#', 'Item', 'Code', 'HSN', 'Weight', 'Purity', 'Qty', 'Rate/g', 'Making', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [2, 44, 34], textColor: [255, 255, 255] },
      styles: { fontSize: 8, textColor: [0, 0, 0] },
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setTextColor(0, 0, 0);
    doc.text('Subtotal:', 140, finalY);
    doc.text('Rs ' + invoice.subtotal.toFixed(2), 195, finalY, { align: 'right' });

    doc.text('CGST (' + invoice.cgst_rate + '%):', 140, finalY + 7);
    doc.text('Rs ' + invoice.cgst_amount.toFixed(2), 195, finalY + 7, { align: 'right' });

    doc.text('SGST (' + invoice.sgst_rate + '%):', 140, finalY + 14);
    doc.text('Rs ' + invoice.sgst_amount.toFixed(2), 195, finalY + 14, { align: 'right' });

    let currentY = finalY + 14;

    if (invoice.igst_rate > 0) {
      currentY += 7;
      doc.text('IGST (' + invoice.igst_rate + '%):', 140, currentY);
      doc.text('Rs ' + invoice.igst_amount.toFixed(2), 195, currentY, { align: 'right' });
    }

    if (invoice.discount > 0) {
      currentY += 7;
      doc.text('Discount:', 140, currentY);
      doc.text('-Rs ' + invoice.discount.toFixed(2), 195, currentY, { align: 'right' });
    }

    currentY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', 140, currentY);
    doc.text('Rs ' + invoice.total_amount.toFixed(2), 195, currentY, { align: 'right' });

    // Payment Status Section
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Payment Status:', 14, currentY);
    
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const statusColor = invoice.payment_status === 'paid' ? [34, 197, 94] : 
                       invoice.payment_status === 'partial' ? [251, 146, 60] : 
                       [239, 68, 68];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text('Status: ' + invoice.payment_status.toUpperCase(), 14, currentY);
    
    // Show payment details based on status
    if (invoice.payment_status === 'partial') {
      currentY += 7;
      doc.setTextColor(0, 0, 0);
      doc.text('Total Paid: Rs ' + totalPaid.toFixed(2), 14, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text('Amount Remaining: Rs ' + remainingAmount.toFixed(2), 14, currentY);
    } else if (invoice.payment_status === 'pending') {
      currentY += 7;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('Amount Due: Rs ' + invoice.total_amount.toFixed(2), 14, currentY);
    } else if (invoice.payment_status === 'paid') {
      currentY += 7;
      doc.setTextColor(34, 197, 94);
      doc.text('Paid via: ' + invoice.payment_method.toUpperCase(), 14, currentY);
      currentY += 7;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Thank you for your payment!', 14, currentY);
    }

    // Footer
    currentY += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', 105, currentY, { align: 'center' });

    doc.save('Invoice-' + invoice.invoice_number + '.pdf');
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      items: [],
      discount: '0',
      cgst_rate: '1.5',
      sgst_rate: '1.5',
      igst_rate: '0',
      payment_method: 'cash',
      payment_status: 'pending',
      notes: '',
    });
    setSelectedItems([]);
  };

  return (
    <div className="p-8 md:p-12" data-testid="invoices-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#022c22] mb-2" data-testid="invoices-title">Invoices</h1>
          <p className="text-stone-500">Manage sales invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="add-invoice-button"
              className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] hover:shadow-lg"
            >
              <Plus size={18} className="mr-2" /> Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Create New Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div>
                <Label htmlFor="customer">Customer</Label>
                <Select value={formData.customer_id} onValueChange={(value) => setFormData({ ...formData, customer_id: value })}>
                  <SelectTrigger data-testid="invoice-customer-select">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.contact}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Add Items</Label>
                <div className="flex gap-2 mt-2">
                  <Select onValueChange={addItemToInvoice}>
                    <SelectTrigger data-testid="invoice-item-select">
                      <SelectValue placeholder="Select item to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} - {item.design_code} (₹{item.selling_price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedItems.length > 0 && (
                <div className="border border-stone-200 rounded-sm p-4">
                  <h3 className="font-serif font-bold mb-3">Selected Items</h3>
                  <div className="space-y-2">
                    {selectedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-stone-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item_name}</p>
                          <p className="text-xs text-stone-500">
                            {item.design_code} | {item.weight}g | {item.purity}
                          </p>
                        </div>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(idx, e.target.value)}
                          className="w-20"
                        />
                        <p className="font-bold w-24 text-right">₹{item.subtotal.toFixed(2)}</p>
                        <button
                          type="button"
                          onClick={() => removeItemFromInvoice(idx)}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-stone-200">
                    <div className="flex justify-between">
                      <span className="font-bold">Subtotal:</span>
                      <span className="font-bold">₹{selectedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount">Discount (₹)</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    data-testid="invoice-discount-input"
                  />
                </div>
                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                    <SelectTrigger data-testid="invoice-payment-method-select">
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
              </div>

              <div className="border-t border-stone-200 pt-4">
                <Label className="mb-3 block font-serif font-bold">GST Rates (%)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cgst_rate">CGST %</Label>
                    <Input
                      id="cgst_rate"
                      type="number"
                      step="0.01"
                      value={formData.cgst_rate}
                      onChange={(e) => setFormData({ ...formData, cgst_rate: e.target.value })}
                      data-testid="invoice-cgst-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sgst_rate">SGST %</Label>
                    <Input
                      id="sgst_rate"
                      type="number"
                      step="0.01"
                      value={formData.sgst_rate}
                      onChange={(e) => setFormData({ ...formData, sgst_rate: e.target.value })}
                      data-testid="invoice-sgst-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="igst_rate">IGST %</Label>
                    <Input
                      id="igst_rate"
                      type="number"
                      step="0.01"
                      value={formData.igst_rate}
                      onChange={(e) => setFormData({ ...formData, igst_rate: e.target.value })}
                      data-testid="invoice-igst-input"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select value={formData.payment_status} onValueChange={(value) => setFormData({ ...formData, payment_status: value })}>
                  <SelectTrigger data-testid="invoice-payment-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  data-testid="save-invoice-button"
                  className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b]"
                >
                  Create Invoice
                </Button>
                <Button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  data-testid="cancel-invoice-button"
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
                  <th className="py-4 px-4">Invoice #</th>
                  <th className="py-4 px-4">Date</th>
                  <th className="py-4 px-4">Customer</th>
                  <th className="py-4 px-4">Amount</th>
                  <th className="py-4 px-4">Payment Status</th>
                  <th className="py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{invoice.invoice_number}</td>
                    <td className="py-3 px-4">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{invoice.customer_name}</td>
                    <td className="py-3 px-4 font-bold">₹{invoice.total_amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                          invoice.payment_status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : invoice.payment_status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {invoice.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => generatePDF(invoice)}
                          data-testid={`download-invoice-${invoice.id}`}
                          className="text-blue-600 hover:text-blue-800"
                          title="Download PDF"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          data-testid={`delete-invoice-${invoice.id}`}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
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

export default Invoices;