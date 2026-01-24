import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Check, X, Eye, ClipboardCheck, AlertTriangle, Package } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StockAdjustment = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [selectedReconciliation, setSelectedReconciliation] = useState(null);
  
  const [adjustmentForm, setAdjustmentForm] = useState({
    adjustment_type: 'decrease',
    reason: 'damage',
    notes: '',
    items: []
  });

  const [reconcileItems, setReconcileItems] = useState([]);

  const adjustmentReasons = [
    { value: 'damage', label: 'Damage' },
    { value: 'loss', label: 'Loss' },
    { value: 'found', label: 'Found Items' },
    { value: 'theft', label: 'Theft' },
    { value: 'count_correction', label: 'Count Correction' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'expired', label: 'Expired/Outdated' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchAdjustments();
    fetchReconciliations();
    fetchItems();
  }, []);

  const fetchAdjustments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/stock/adjustments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdjustments(response.data.adjustments);
    } catch (error) {
      toast.error('Failed to fetch adjustments');
    } finally {
      setLoading(false);
    }
  };

  const fetchReconciliations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/stock/reconciliation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReconciliations(response.data.reconciliations);
    } catch (error) {
      console.error('Failed to fetch reconciliations');
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

  const addItemToAdjustment = (item) => {
    if (adjustmentForm.items.find(i => i.item_id === item.id)) {
      toast.error('Item already added');
      return;
    }
    
    const newItem = {
      item_id: item.id,
      item_name: item.name,
      design_code: item.design_code,
      metal_type: item.metal_type,
      purity: item.purity,
      system_quantity: item.quantity,
      system_weight: item.quantity * item.weight,
      adjusted_quantity: item.quantity,
      adjusted_weight: item.quantity * item.weight,
      quantity_difference: 0,
      weight_difference: 0,
      unit_cost: item.selling_price,
      value_difference: 0,
      reason: ''
    };
    
    setAdjustmentForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateAdjustmentItem = (index, field, value) => {
    setAdjustmentForm(prev => {
      const updatedItems = [...prev.items];
      const item = { ...updatedItems[index] };
      
      if (field === 'adjusted_quantity') {
        const adjustedQty = parseInt(value) || 0;
        const originalItem = items.find(i => i.id === item.item_id);
        item.adjusted_quantity = adjustedQty;
        item.adjusted_weight = adjustedQty * (originalItem?.weight || 0);
        item.quantity_difference = adjustedQty - item.system_quantity;
        item.weight_difference = item.adjusted_weight - item.system_weight;
        item.value_difference = item.quantity_difference * item.unit_cost;
      } else {
        item[field] = value;
      }
      
      updatedItems[index] = item;
      return { ...prev, items: updatedItems };
    });
  };

  const removeItemFromAdjustment = (index) => {
    setAdjustmentForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleCreateAdjustment = async () => {
    if (adjustmentForm.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/stock/adjustments`, adjustmentForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Stock adjustment created successfully');
      setDialogOpen(false);
      setAdjustmentForm({ adjustment_type: 'decrease', reason: 'damage', notes: '', items: [] });
      fetchAdjustments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create adjustment');
    }
  };

  const handleApproveAdjustment = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/stock/adjustments/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Adjustment approved and applied');
      fetchAdjustments();
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve adjustment');
    }
  };

  const handleRejectAdjustment = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/stock/adjustments/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Adjustment rejected');
      fetchAdjustments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject adjustment');
    }
  };

  const startReconciliation = () => {
    const reconcileData = items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      design_code: item.design_code,
      metal_type: item.metal_type,
      purity: item.purity,
      system_quantity: item.quantity,
      physical_quantity: item.quantity,
      unit_price: item.selling_price
    }));
    setReconcileItems(reconcileData);
    setReconcileDialogOpen(true);
  };

  const updateReconcileItem = (index, value) => {
    setReconcileItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        physical_quantity: parseInt(value) || 0
      };
      return updated;
    });
  };

  const handleCreateReconciliation = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/stock/reconciliation`, {
        items: reconcileItems,
        notes: 'Physical stock count reconciliation'
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Reconciliation created successfully');
      setReconcileDialogOpen(false);
      fetchReconciliations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create reconciliation');
    }
  };

  const handleCompleteReconciliation = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/stock/reconciliation/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Reconciliation completed and adjustments applied');
      fetchReconciliations();
      fetchAdjustments();
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete reconciliation');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      draft: 'bg-stone-100 text-stone-800',
      in_progress: 'bg-blue-100 text-blue-800'
    };
    return badges[status] || 'bg-stone-100 text-stone-800';
  };

  return (
    <div className="p-4 lg:p-8" data-testid="stock-adjustment-container">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-serif font-bold text-[#022c22] mb-1" data-testid="stock-adjustment-title">
            Stock Adjustment
          </h1>
          <p className="text-sm lg:text-base text-stone-500">Manage stock adjustments and reconciliations</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={startReconciliation}
            data-testid="start-reconciliation-btn"
            variant="outline"
            className="rounded-sm font-medium tracking-wide text-sm"
          >
            <ClipboardCheck size={16} className="mr-2" /> Start Reconciliation
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="create-adjustment-btn"
                className="rounded-sm font-medium tracking-wide bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] text-sm"
              >
                <Plus size={16} className="mr-2" /> New Adjustment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl lg:text-2xl">Create Stock Adjustment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Adjustment Type</Label>
                    <Select value={adjustmentForm.adjustment_type} onValueChange={(value) => setAdjustmentForm(prev => ({ ...prev, adjustment_type: value }))}>
                      <SelectTrigger data-testid="adjustment-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="increase">Increase</SelectItem>
                        <SelectItem value="decrease">Decrease</SelectItem>
                        <SelectItem value="reconciliation">Reconciliation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Select value={adjustmentForm.reason} onValueChange={(value) => setAdjustmentForm(prev => ({ ...prev, reason: value }))}>
                      <SelectTrigger data-testid="adjustment-reason-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {adjustmentReasons.map(reason => (
                          <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={adjustmentForm.notes}
                    onChange={(e) => setAdjustmentForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter any additional notes..."
                    data-testid="adjustment-notes"
                    className="text-sm"
                  />
                </div>

                {/* Add Items */}
                <div>
                  <Label>Add Items</Label>
                  <Select onValueChange={(value) => {
                    const item = items.find(i => i.id === value);
                    if (item) addItemToAdjustment(item);
                  }}>
                    <SelectTrigger data-testid="add-item-select">
                      <SelectValue placeholder="Select item to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.design_code} - {item.name} (Qty: {item.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Items Table */}
                {adjustmentForm.items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead className="bg-[#fafaf9] text-xs uppercase">
                          <tr>
                            <th className="py-2 px-3 text-left">Item</th>
                            <th className="py-2 px-3 text-left">System Qty</th>
                            <th className="py-2 px-3 text-left">Adjusted Qty</th>
                            <th className="py-2 px-3 text-left">Difference</th>
                            <th className="py-2 px-3 text-left">Value Impact</th>
                            <th className="py-2 px-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {adjustmentForm.items.map((item, index) => (
                            <tr key={item.item_id} className="border-t">
                              <td className="py-2 px-3">
                                <div className="font-medium text-xs lg:text-sm">{item.design_code}</div>
                                <div className="text-xs text-stone-500">{item.item_name}</div>
                              </td>
                              <td className="py-2 px-3 text-xs lg:text-sm">{item.system_quantity}</td>
                              <td className="py-2 px-3">
                                <Input
                                  type="number"
                                  value={item.adjusted_quantity}
                                  onChange={(e) => updateAdjustmentItem(index, 'adjusted_quantity', e.target.value)}
                                  className="w-20 text-sm"
                                  min="0"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <span className={`font-medium text-xs lg:text-sm ${item.quantity_difference > 0 ? 'text-green-600' : item.quantity_difference < 0 ? 'text-red-600' : ''}`}>
                                  {item.quantity_difference > 0 ? '+' : ''}{item.quantity_difference}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`font-medium text-xs lg:text-sm ${item.value_difference > 0 ? 'text-green-600' : item.value_difference < 0 ? 'text-red-600' : ''}`}>
                                  ₹{item.value_difference?.toLocaleString()}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <button
                                  onClick={() => removeItemFromAdjustment(index)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <X size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-sm">Cancel</Button>
                  <Button 
                    onClick={handleCreateAdjustment}
                    data-testid="submit-adjustment-btn"
                    className="bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] text-sm"
                  >
                    Create Adjustment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="adjustments" className="space-y-4">
        <TabsList className="bg-white border border-stone-200 p-1 w-full lg:w-auto flex">
          <TabsTrigger value="adjustments" data-testid="adjustments-tab" className="flex-1 lg:flex-none text-sm">
            <AlertTriangle size={16} className="mr-2" /> Adjustments
          </TabsTrigger>
          <TabsTrigger value="reconciliations" data-testid="reconciliations-tab" className="flex-1 lg:flex-none text-sm">
            <ClipboardCheck size={16} className="mr-2" /> Reconciliations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="adjustments">
          <div className="bg-white rounded-lg border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[800px]">
                <thead className="bg-[#fafaf9] text-[#78716c] font-serif uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-3 px-3 lg:px-4">Adjustment #</th>
                    <th className="py-3 px-3 lg:px-4">Date</th>
                    <th className="py-3 px-3 lg:px-4">Type</th>
                    <th className="py-3 px-3 lg:px-4">Reason</th>
                    <th className="py-3 px-3 lg:px-4">Items</th>
                    <th className="py-3 px-3 lg:px-4">Value Impact</th>
                    <th className="py-3 px-3 lg:px-4">Status</th>
                    <th className="py-3 px-3 lg:px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="text-center py-8">Loading...</td></tr>
                  ) : adjustments.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-8 text-stone-500">No adjustments found</td></tr>
                  ) : (
                    adjustments.map((adj) => (
                      <tr key={adj.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/50">
                        <td className="py-2.5 px-3 lg:px-4 font-medium text-xs lg:text-sm">{adj.adjustment_number}</td>
                        <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{new Date(adj.adjustment_date).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3 lg:px-4 capitalize text-xs lg:text-sm">{adj.adjustment_type}</td>
                        <td className="py-2.5 px-3 lg:px-4 capitalize text-xs lg:text-sm">{adj.reason?.replace('_', ' ')}</td>
                        <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{adj.items?.length || 0} items</td>
                        <td className="py-2.5 px-3 lg:px-4 font-medium text-xs lg:text-sm">₹{adj.total_value_adjusted?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 lg:px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getStatusBadge(adj.status)}`}>
                            {adj.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 lg:px-4">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setSelectedAdjustment(adj)}
                              data-testid={`view-adjustment-${adj.id}`}
                              className="text-[#022c22] hover:text-[#064e3b] p-1"
                            >
                              <Eye size={16} />
                            </button>
                            {adj.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveAdjustment(adj.id)}
                                  data-testid={`approve-adjustment-${adj.id}`}
                                  className="text-green-600 hover:text-green-800 p-1"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => handleRejectAdjustment(adj.id)}
                                  data-testid={`reject-adjustment-${adj.id}`}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reconciliations">
          <div className="bg-white rounded-lg border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[700px]">
                <thead className="bg-[#fafaf9] text-[#78716c] font-serif uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-3 px-3 lg:px-4">Reconciliation #</th>
                    <th className="py-3 px-3 lg:px-4">Date</th>
                    <th className="py-3 px-3 lg:px-4">Items Counted</th>
                    <th className="py-3 px-3 lg:px-4">Discrepancies</th>
                    <th className="py-3 px-3 lg:px-4">Value Difference</th>
                    <th className="py-3 px-3 lg:px-4">Status</th>
                    <th className="py-3 px-3 lg:px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliations.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-8 text-stone-500">No reconciliations found</td></tr>
                  ) : (
                    reconciliations.map((rec) => (
                      <tr key={rec.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/50">
                        <td className="py-2.5 px-3 lg:px-4 font-medium text-xs lg:text-sm">{rec.reconciliation_number}</td>
                        <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{new Date(rec.reconciliation_date).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{rec.total_items_counted}</td>
                        <td className="py-2.5 px-3 lg:px-4">
                          <span className={`font-medium text-xs lg:text-sm ${rec.total_discrepancies > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                            {rec.total_discrepancies}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 lg:px-4 font-medium text-xs lg:text-sm">₹{rec.total_value_discrepancy?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 lg:px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getStatusBadge(rec.status)}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 lg:px-4">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setSelectedReconciliation(rec)}
                              data-testid={`view-reconciliation-${rec.id}`}
                              className="text-[#022c22] hover:text-[#064e3b] p-1"
                            >
                              <Eye size={16} />
                            </button>
                            {rec.status !== 'completed' && (
                              <button
                                onClick={() => handleCompleteReconciliation(rec.id)}
                                data-testid={`complete-reconciliation-${rec.id}`}
                                className="text-green-600 hover:text-green-800 p-1"
                              >
                                <Check size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reconciliation Dialog */}
      <Dialog open={reconcileDialogOpen} onOpenChange={setReconcileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl lg:text-2xl">Physical Stock Count</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-stone-500">Enter the physical count for each item. Discrepancies will be highlighted.</p>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-[#fafaf9] text-xs uppercase sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left">Item</th>
                      <th className="py-2 px-3 text-left">System Qty</th>
                      <th className="py-2 px-3 text-left">Physical Qty</th>
                      <th className="py-2 px-3 text-left">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconcileItems.map((item, index) => {
                      const diff = item.physical_quantity - item.system_quantity;
                      return (
                        <tr key={item.item_id} className={`border-t ${diff !== 0 ? 'bg-amber-50' : ''}`}>
                          <td className="py-2 px-3">
                            <div className="font-medium text-xs lg:text-sm">{item.design_code}</div>
                            <div className="text-xs text-stone-500">{item.metal_type} - {item.purity}</div>
                          </td>
                          <td className="py-2 px-3 text-xs lg:text-sm">{item.system_quantity}</td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              value={item.physical_quantity}
                              onChange={(e) => updateReconcileItem(index, e.target.value)}
                              className="w-20 text-sm"
                              min="0"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <span className={`font-medium text-xs lg:text-sm ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}`}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setReconcileDialogOpen(false)} className="text-sm">Cancel</Button>
              <Button 
                onClick={handleCreateReconciliation}
                data-testid="submit-reconciliation-btn"
                className="bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] text-sm"
              >
                Save Reconciliation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Adjustment Dialog */}
      <Dialog open={!!selectedAdjustment} onOpenChange={() => setSelectedAdjustment(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl lg:text-2xl">
              Adjustment Details - {selectedAdjustment?.adjustment_number}
            </DialogTitle>
          </DialogHeader>
          {selectedAdjustment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-[#fafaf9] rounded-lg">
                <div>
                  <p className="text-xs text-stone-500">Type</p>
                  <p className="font-medium capitalize text-sm">{selectedAdjustment.adjustment_type}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Reason</p>
                  <p className="font-medium capitalize text-sm">{selectedAdjustment.reason?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getStatusBadge(selectedAdjustment.status)}`}>
                    {selectedAdjustment.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Total Value</p>
                  <p className="font-medium text-sm">₹{selectedAdjustment.total_value_adjusted?.toLocaleString()}</p>
                </div>
              </div>
              {selectedAdjustment.notes && (
                <div className="p-3 bg-stone-50 rounded-lg">
                  <p className="text-xs text-stone-500">Notes</p>
                  <p className="text-sm">{selectedAdjustment.notes}</p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-[#fafaf9] text-xs uppercase">
                    <tr>
                      <th className="py-2 px-3 text-left">Item</th>
                      <th className="py-2 px-3 text-left">System</th>
                      <th className="py-2 px-3 text-left">Adjusted</th>
                      <th className="py-2 px-3 text-left">Difference</th>
                      <th className="py-2 px-3 text-left">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAdjustment.items?.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2 px-3">
                          <div className="font-medium text-xs lg:text-sm">{item.design_code}</div>
                          <div className="text-xs text-stone-500">{item.item_name}</div>
                        </td>
                        <td className="py-2 px-3 text-xs lg:text-sm">{item.system_quantity}</td>
                        <td className="py-2 px-3 text-xs lg:text-sm">{item.adjusted_quantity}</td>
                        <td className="py-2 px-3">
                          <span className={`font-medium text-xs lg:text-sm ${item.quantity_difference > 0 ? 'text-green-600' : item.quantity_difference < 0 ? 'text-red-600' : ''}`}>
                            {item.quantity_difference > 0 ? '+' : ''}{item.quantity_difference}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs lg:text-sm">₹{Math.abs(item.value_difference)?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Reconciliation Dialog */}
      <Dialog open={!!selectedReconciliation} onOpenChange={() => setSelectedReconciliation(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl lg:text-2xl">
              Reconciliation Details - {selectedReconciliation?.reconciliation_number}
            </DialogTitle>
          </DialogHeader>
          {selectedReconciliation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-[#fafaf9] rounded-lg">
                <div>
                  <p className="text-xs text-stone-500">Items Counted</p>
                  <p className="font-medium text-sm">{selectedReconciliation.total_items_counted}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Discrepancies</p>
                  <p className="font-medium text-sm">{selectedReconciliation.total_discrepancies}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Value Difference</p>
                  <p className="font-medium text-sm">₹{selectedReconciliation.total_value_discrepancy?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getStatusBadge(selectedReconciliation.status)}`}>
                    {selectedReconciliation.status}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-[#fafaf9] text-xs uppercase">
                    <tr>
                      <th className="py-2 px-3 text-left">Item</th>
                      <th className="py-2 px-3 text-left">System</th>
                      <th className="py-2 px-3 text-left">Physical</th>
                      <th className="py-2 px-3 text-left">Difference</th>
                      <th className="py-2 px-3 text-left">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReconciliation.items?.map((item, index) => (
                      <tr key={index} className={`border-t ${item.difference !== 0 ? 'bg-amber-50' : ''}`}>
                        <td className="py-2 px-3">
                          <div className="font-medium text-xs lg:text-sm">{item.design_code}</div>
                          <div className="text-xs text-stone-500">{item.metal_type} - {item.purity}</div>
                        </td>
                        <td className="py-2 px-3 text-xs lg:text-sm">{item.system_quantity}</td>
                        <td className="py-2 px-3 text-xs lg:text-sm">{item.physical_quantity}</td>
                        <td className="py-2 px-3">
                          <span className={`font-medium text-xs lg:text-sm ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : ''}`}>
                            {item.difference > 0 ? '+' : ''}{item.difference}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs lg:text-sm">₹{Math.abs(item.value_difference)?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockAdjustment;
