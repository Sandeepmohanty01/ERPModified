import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, FileText, TrendingUp, TrendingDown, Filter, Download, Eye } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StockLedger = () => {
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [items, setItems] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemLedger, setItemLedger] = useState([]);
  const [filters, setFilters] = useState({
    item_id: '',
    metal_type: '',
    purity: '',
    transaction_type: ''
  });
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  useEffect(() => {
    fetchLedgerEntries();
    fetchItems();
    fetchValuation();
  }, [filters, pagination.page]);

  const fetchLedgerEntries = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('limit', 20);
      if (filters.item_id) params.append('item_id', filters.item_id);
      if (filters.metal_type) params.append('metal_type', filters.metal_type);
      if (filters.purity) params.append('purity', filters.purity);
      if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);

      const response = await axios.get(`${API}/stock/ledger?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLedgerEntries(response.data.entries);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        totalPages: response.data.total_pages
      }));
    } catch (error) {
      toast.error('Failed to fetch stock ledger');
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

  const fetchValuation = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.metal_type) params.append('metal_type', filters.metal_type);
      if (filters.purity) params.append('purity', filters.purity);

      const response = await axios.get(`${API}/stock/valuation?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setValuation(response.data);
    } catch (error) {
      console.error('Failed to fetch valuation');
    }
  };

  const fetchItemLedger = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/stock/ledger/item/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItemLedger(response.data.ledger_entries);
      setSelectedItem(response.data.item);
    } catch (error) {
      toast.error('Failed to fetch item ledger');
    }
  };

  const getTransactionBadge = (type) => {
    const badges = {
      opening: 'bg-blue-100 text-blue-800',
      purchase: 'bg-green-100 text-green-800',
      sale: 'bg-amber-100 text-amber-800',
      adjustment: 'bg-purple-100 text-purple-800',
      return: 'bg-cyan-100 text-cyan-800',
      transfer: 'bg-orange-100 text-orange-800'
    };
    return badges[type] || 'bg-stone-100 text-stone-800';
  };

  const resetFilters = () => {
    setFilters({ item_id: '', metal_type: '', purity: '', transaction_type: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const uniqueMetals = [...new Set(items.map(i => i.metal_type))];
  const uniquePurities = [...new Set(items.map(i => i.purity))];

  return (
    <div className="p-4 lg:p-8" data-testid="stock-ledger-container">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-serif font-bold text-[#022c22] mb-1" data-testid="stock-ledger-title">
            Stock Ledger
          </h1>
          <p className="text-sm lg:text-base text-stone-500">Track all stock movements and valuations</p>
        </div>
      </div>

      <Tabs defaultValue="ledger" className="space-y-4">
        <TabsList className="bg-white border border-stone-200 p-1 w-full lg:w-auto flex">
          <TabsTrigger value="ledger" data-testid="ledger-tab" className="flex-1 lg:flex-none text-sm">
            <FileText size={16} className="mr-2" /> Ledger
          </TabsTrigger>
          <TabsTrigger value="valuation" data-testid="valuation-tab" className="flex-1 lg:flex-none text-sm">
            <TrendingUp size={16} className="mr-2" /> Valuation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-stone-500" />
              <span className="text-sm font-medium text-stone-700">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select value={filters.item_id || "all"} onValueChange={(value) => setFilters({ ...filters, item_id: value === "all" ? "" : value })}>
                <SelectTrigger data-testid="filter-item">
                  <SelectValue placeholder="All Items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.design_code} - {item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.metal_type || "all"} onValueChange={(value) => setFilters({ ...filters, metal_type: value === "all" ? "" : value })}>
                <SelectTrigger data-testid="filter-metal">
                  <SelectValue placeholder="All Metals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Metals</SelectItem>
                  {uniqueMetals.map((metal) => (
                    <SelectItem key={metal} value={metal}>{metal}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.purity || "all"} onValueChange={(value) => setFilters({ ...filters, purity: value === "all" ? "" : value })}>
                <SelectTrigger data-testid="filter-purity">
                  <SelectValue placeholder="All Purities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purities</SelectItem>
                  {uniquePurities.map((purity) => (
                    <SelectItem key={purity} value={purity}>{purity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.transaction_type || "all"} onValueChange={(value) => setFilters({ ...filters, transaction_type: value === "all" ? "" : value })}>
                <SelectTrigger data-testid="filter-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="opening">Opening</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={resetFilters}
                data-testid="reset-filters"
                className="text-sm"
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-lg border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[800px]">
                <thead className="bg-[#fafaf9] text-[#78716c] font-serif uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-3 px-3 lg:px-4">Date</th>
                    <th className="py-3 px-3 lg:px-4">Item</th>
                    <th className="py-3 px-3 lg:px-4">Type</th>
                    <th className="py-3 px-3 lg:px-4">In</th>
                    <th className="py-3 px-3 lg:px-4">Out</th>
                    <th className="py-3 px-3 lg:px-4">Running Qty</th>
                    <th className="py-3 px-3 lg:px-4">Value</th>
                    <th className="py-3 px-3 lg:px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="text-center py-8">Loading...</td></tr>
                  ) : ledgerEntries.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-8 text-stone-500">No ledger entries found</td></tr>
                  ) : (
                    ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/50 transition-colors">
                        <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 lg:px-4">
                          <div className="font-medium text-xs lg:text-sm">{entry.design_code}</div>
                          <div className="text-xs text-stone-500 hidden lg:block">{entry.metal_type} - {entry.purity}</div>
                        </td>
                        <td className="py-2.5 px-3 lg:px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getTransactionBadge(entry.transaction_type)}`}>
                            {entry.transaction_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 lg:px-4">
                          {entry.quantity_in > 0 && (
                            <span className="text-green-600 font-medium flex items-center gap-1 text-xs lg:text-sm">
                              <TrendingUp size={14} /> +{entry.quantity_in}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 lg:px-4">
                          {entry.quantity_out > 0 && (
                            <span className="text-red-600 font-medium flex items-center gap-1 text-xs lg:text-sm">
                              <TrendingDown size={14} /> -{entry.quantity_out}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 lg:px-4 font-medium text-xs lg:text-sm">{entry.running_quantity}</td>
                        <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">₹{entry.running_value?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 lg:px-4">
                          <button
                            onClick={() => fetchItemLedger(entry.item_id)}
                            data-testid={`view-item-ledger-${entry.id}`}
                            className="text-[#022c22] hover:text-[#064e3b] p-1"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-stone-100">
                <span className="text-xs lg:text-sm text-stone-500">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="valuation" className="space-y-4">
          {valuation && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-4 lg:p-6">
                  <p className="text-xs lg:text-sm text-stone-500 mb-1">Total Quantity</p>
                  <p className="text-xl lg:text-3xl font-serif font-bold text-[#022c22]">{valuation.summary.total_quantity}</p>
                </div>
                <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-4 lg:p-6">
                  <p className="text-xs lg:text-sm text-stone-500 mb-1">Total Weight</p>
                  <p className="text-xl lg:text-3xl font-serif font-bold text-[#022c22]">{valuation.summary.total_weight}g</p>
                </div>
                <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-4 lg:p-6">
                  <p className="text-xs lg:text-sm text-stone-500 mb-1">Total Value</p>
                  <p className="text-xl lg:text-3xl font-serif font-bold text-[#d4af37]">₹{valuation.summary.total_value?.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-4 lg:p-6">
                  <p className="text-xs lg:text-sm text-stone-500 mb-1">Valuation Method</p>
                  <p className="text-lg lg:text-2xl font-serif font-bold text-[#022c22] capitalize">{valuation.summary.valuation_method?.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Metal-wise Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-serif font-bold text-[#022c22] mb-4">By Metal Type</h3>
                  <div className="space-y-3">
                    {Object.entries(valuation.by_metal).map(([metal, data]) => (
                      <div key={metal} className="flex items-center justify-between p-3 bg-[#fafaf9] rounded-lg">
                        <div>
                          <p className="font-medium text-sm lg:text-base">{metal}</p>
                          <p className="text-xs text-stone-500">{data.quantity} items • {data.weight?.toFixed(2)}g</p>
                        </div>
                        <p className="font-serif font-bold text-[#d4af37] text-sm lg:text-base">₹{data.value?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-serif font-bold text-[#022c22] mb-4">By Purity</h3>
                  <div className="space-y-3">
                    {Object.entries(valuation.by_purity).map(([purity, data]) => (
                      <div key={purity} className="flex items-center justify-between p-3 bg-[#fafaf9] rounded-lg">
                        <div>
                          <p className="font-medium text-sm lg:text-base">{purity}</p>
                          <p className="text-xs text-stone-500">{data.quantity} items • {data.weight?.toFixed(2)}g</p>
                        </div>
                        <p className="font-serif font-bold text-[#d4af37] text-sm lg:text-base">₹{data.value?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Items Valuation Table */}
              <div className="bg-white rounded-lg border border-stone-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-100">
                  <h3 className="text-base lg:text-lg font-serif font-bold text-[#022c22]">Item-wise Valuation</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[700px]">
                    <thead className="bg-[#fafaf9] text-[#78716c] font-serif uppercase tracking-wider text-xs">
                      <tr>
                        <th className="py-3 px-3 lg:px-4">Design Code</th>
                        <th className="py-3 px-3 lg:px-4">Item Name</th>
                        <th className="py-3 px-3 lg:px-4">Metal</th>
                        <th className="py-3 px-3 lg:px-4">Purity</th>
                        <th className="py-3 px-3 lg:px-4">Qty</th>
                        <th className="py-3 px-3 lg:px-4">Weight</th>
                        <th className="py-3 px-3 lg:px-4">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {valuation.items.map((item) => (
                        <tr key={item.item_id} className="border-b border-stone-100 hover:bg-[#fafaf9]/50">
                          <td className="py-2.5 px-3 lg:px-4 font-medium text-xs lg:text-sm">{item.design_code}</td>
                          <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{item.name}</td>
                          <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{item.metal_type}</td>
                          <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{item.purity}</td>
                          <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{item.quantity}</td>
                          <td className="py-2.5 px-3 lg:px-4 text-xs lg:text-sm">{item.total_weight?.toFixed(2)}g</td>
                          <td className="py-2.5 px-3 lg:px-4 font-medium text-[#d4af37] text-xs lg:text-sm">₹{item.total_value?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Item Ledger Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl lg:text-2xl">
              Stock Ledger - {selectedItem?.design_code}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-[#fafaf9] rounded-lg">
                <div>
                  <p className="text-xs text-stone-500">Item Name</p>
                  <p className="font-medium text-sm">{selectedItem.name}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Metal Type</p>
                  <p className="font-medium text-sm">{selectedItem.metal_type}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Purity</p>
                  <p className="font-medium text-sm">{selectedItem.purity}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">Current Quantity</p>
                  <p className="font-medium text-sm">{selectedItem.quantity}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[600px]">
                  <thead className="bg-[#fafaf9] text-[#78716c] font-serif uppercase tracking-wider text-xs">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">In</th>
                      <th className="py-2 px-3">Out</th>
                      <th className="py-2 px-3">Running Qty</th>
                      <th className="py-2 px-3">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemLedger.map((entry) => (
                      <tr key={entry.id} className="border-b border-stone-100">
                        <td className="py-2 px-3 text-xs">{new Date(entry.created_at).toLocaleDateString()}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getTransactionBadge(entry.transaction_type)}`}>
                            {entry.transaction_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-green-600 font-medium text-xs">{entry.quantity_in > 0 ? `+${entry.quantity_in}` : '-'}</td>
                        <td className="py-2 px-3 text-red-600 font-medium text-xs">{entry.quantity_out > 0 ? `-${entry.quantity_out}` : '-'}</td>
                        <td className="py-2 px-3 font-medium text-xs">{entry.running_quantity}</td>
                        <td className="py-2 px-3 text-xs">₹{entry.running_value?.toLocaleString()}</td>
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

export default StockLedger;
