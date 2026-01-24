import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Shield, Eye, ChevronDown, ChevronRight, Check, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});

  // Module definitions with their actions
  const moduleDefinitions = {
    dashboard: { label: 'Dashboard', actions: ['view'] },
    inventory: { label: 'Inventory', actions: ['view', 'create', 'edit', 'delete'] },
    stock_ledger: { label: 'Stock Ledger', actions: ['view', 'export'] },
    stock_adjustment: { label: 'Stock Adjustment', actions: ['view', 'create', 'approve', 'reject'] },
    categories: { label: 'Categories', actions: ['view', 'create', 'edit', 'delete'] },
    transactions: { label: 'Transactions', actions: ['view', 'create', 'edit', 'delete'] },
    invoices: { label: 'Invoices', actions: ['view', 'create', 'edit', 'delete', 'print'] },
    customers: { label: 'Customers', actions: ['view', 'create', 'edit', 'delete'] },
    sellers: { label: 'Sellers/Vendors', actions: ['view', 'create', 'edit', 'delete'] },
    accounts: { label: 'Accounts', actions: ['view', 'create', 'edit', 'delete'] },
    expenses: { label: 'Expenses', actions: ['view', 'create', 'edit', 'delete'] },
    reports: { label: 'Reports', actions: ['view', 'export'] },
    users: { label: 'Users', actions: ['view', 'create', 'edit', 'delete'] },
    roles: { label: 'Roles', actions: ['view', 'create', 'edit', 'delete'] },
    settings: { label: 'Settings', actions: ['view', 'edit'] },
  };

  const actionLabels = {
    view: 'View',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    export: 'Export',
    print: 'Print',
    approve: 'Approve',
    reject: 'Reject',
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {},
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const initializePermissions = () => {
    const perms = {};
    Object.entries(moduleDefinitions).forEach(([module, def]) => {
      perms[module] = {};
      def.actions.forEach(action => {
        perms[module][action] = false;
      });
    });
    return perms;
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoles(response.data);
    } catch (error) {
      toast.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingRole) {
        await axios.put(`${API}/roles/${editingRole.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Role updated successfully');
      } else {
        await axios.post(`${API}/roles`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Role created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (name === 'Admin') {
      toast.error('Cannot delete Admin role');
      return;
    }
    if (!window.confirm('Are you sure? This might affect users with this role.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/roles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const openEditDialog = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || initializePermissions(),
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: initializePermissions(),
    });
    setExpandedModules({});
  };

  const handlePermissionChange = (module, action, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: value,
        },
      },
    }));
  };

  const toggleModuleExpand = (module) => {
    setExpandedModules(prev => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  const toggleAllModulePermissions = (module, value) => {
    const newPermissions = { ...formData.permissions[module] };
    moduleDefinitions[module].actions.forEach(action => {
      newPermissions[action] = value;
    });
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: newPermissions,
      },
    }));
  };

  const countPermissions = (permissions) => {
    let count = 0;
    if (!permissions) return 0;
    Object.values(permissions).forEach(module => {
      if (typeof module === 'object') {
        Object.values(module).forEach(val => {
          if (val === true) count++;
        });
      } else if (module === true) {
        count++;
      }
    });
    return count;
  };

  const getRoleBadgeColor = (name) => {
    const colors = {
      'Admin': 'bg-red-100 text-red-800 border-red-200',
      'Manager': 'bg-blue-100 text-blue-800 border-blue-200',
      'Sales Executive': 'bg-green-100 text-green-800 border-green-200',
      'Accountant': 'bg-purple-100 text-purple-800 border-purple-200',
      'Inventory Clerk': 'bg-amber-100 text-amber-800 border-amber-200',
      'Cashier': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Viewer': 'bg-stone-100 text-stone-800 border-stone-200',
    };
    return colors[name] || 'bg-stone-100 text-stone-800 border-stone-200';
  };

  return (
    <div className="p-4 lg:p-8" data-testid="roles-container">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-serif font-bold text-[#022c22] mb-1" data-testid="roles-title">
            Roles & Permissions
          </h1>
          <p className="text-sm lg:text-base text-stone-500">Define user roles and access control for Jewellery ERP</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="add-role-button"
              className="rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] hover:shadow-lg text-sm"
            >
              <Plus size={16} className="mr-2" /> Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl lg:text-2xl">
                {editingRole ? 'Edit Role' : 'Add New Role'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="role-name-input"
                    placeholder="e.g., Sales Manager"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="role-description-input"
                    placeholder="Brief description of this role's responsibilities"
                    className="text-sm"
                    rows={2}
                  />
                </div>
              </div>
              
              <div>
                <Label className="mb-3 block">Module Permissions</Label>
                <div className="border border-stone-200 rounded-lg overflow-hidden">
                  {Object.entries(moduleDefinitions).map(([module, def]) => {
                    const modulePerms = formData.permissions[module] || {};
                    const enabledCount = Object.values(modulePerms).filter(v => v).length;
                    const totalCount = def.actions.length;
                    const isExpanded = expandedModules[module];
                    
                    return (
                      <div key={module} className="border-b border-stone-100 last:border-b-0">
                        <div 
                          className="flex items-center justify-between p-3 bg-[#fafaf9] cursor-pointer hover:bg-stone-100"
                          onClick={() => toggleModuleExpand(module)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <span className="font-medium text-sm">{def.label}</span>
                            <span className="text-xs text-stone-500">({enabledCount}/{totalCount})</span>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="text-xs text-green-600 hover:underline"
                              onClick={() => toggleAllModulePermissions(module, true)}
                            >
                              All
                            </button>
                            <span className="text-stone-300">|</span>
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:underline"
                              onClick={() => toggleAllModulePermissions(module, false)}
                            >
                              None
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white">
                            {def.actions.map(action => (
                              <div key={action} className="flex items-center gap-2">
                                <Switch
                                  id={`${module}-${action}`}
                                  checked={modulePerms[action] || false}
                                  onCheckedChange={(value) => handlePermissionChange(module, action, value)}
                                  className="scale-75"
                                />
                                <Label htmlFor={`${module}-${action}`} className="text-xs font-normal cursor-pointer">
                                  {actionLabels[action]}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  data-testid="save-role-button"
                  className="rounded-sm font-medium tracking-wide bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] text-sm"
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setDialogOpen(false)}
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

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map((role) => {
            const permCount = countPermissions(role.permissions);
            return (
              <div
                key={role.id}
                data-testid={`role-card-${role.id}`}
                className="bg-white rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
              >
                <div className="p-4 lg:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="text-[#022c22]" size={18} />
                      <h3 className="text-lg font-serif font-bold text-[#022c22]">{role.name}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(role.name)}`}>
                      {permCount} perms
                    </span>
                  </div>
                  
                  {role.description && (
                    <p className="text-sm text-stone-600 mb-3 line-clamp-2">{role.description}</p>
                  )}
                  
                  {/* Quick permission preview */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {role.permissions && Object.entries(role.permissions).slice(0, 5).map(([module, perms]) => {
                      if (typeof perms === 'object' && perms.view) {
                        return (
                          <span key={module} className="px-2 py-0.5 bg-[#f0fdf4] text-[#14532d] rounded text-xs">
                            {moduleDefinitions[module]?.label || module}
                          </span>
                        );
                      }
                      return null;
                    })}
                    {Object.keys(role.permissions || {}).length > 5 && (
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs">
                        +{Object.keys(role.permissions).length - 5} more
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                    <p className="text-xs text-stone-400">
                      {new Date(role.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setSelectedRole(role); setViewDialogOpen(true); }}
                        data-testid={`view-role-${role.id}`}
                        className="text-stone-500 hover:text-[#022c22] p-1.5 rounded hover:bg-stone-100"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEditDialog(role)}
                        data-testid={`edit-role-${role.id}`}
                        className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      {role.name !== 'Admin' && (
                        <button
                          onClick={() => handleDelete(role.id, role.name)}
                          data-testid={`delete-role-${role.id}`}
                          className="text-rose-600 hover:text-rose-800 p-1.5 rounded hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Role Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl lg:text-2xl flex items-center gap-2">
              <Shield className="text-[#022c22]" size={24} />
              {selectedRole?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-4 mt-4">
              {selectedRole.description && (
                <p className="text-sm text-stone-600 p-3 bg-stone-50 rounded-lg">{selectedRole.description}</p>
              )}
              
              <div>
                <h4 className="font-medium text-sm mb-3 text-stone-700">Permissions Matrix</h4>
                <div className="border border-stone-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#fafaf9]">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-stone-700">Module</th>
                        <th className="text-center py-2 px-2 font-medium text-stone-700 text-xs">View</th>
                        <th className="text-center py-2 px-2 font-medium text-stone-700 text-xs">Create</th>
                        <th className="text-center py-2 px-2 font-medium text-stone-700 text-xs">Edit</th>
                        <th className="text-center py-2 px-2 font-medium text-stone-700 text-xs">Delete</th>
                        <th className="text-center py-2 px-2 font-medium text-stone-700 text-xs">Other</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(moduleDefinitions).map(([module, def]) => {
                        const perms = selectedRole.permissions?.[module] || {};
                        const otherPerms = def.actions.filter(a => !['view', 'create', 'edit', 'delete'].includes(a));
                        
                        return (
                          <tr key={module} className="border-t border-stone-100">
                            <td className="py-2 px-3 font-medium text-xs">{def.label}</td>
                            <td className="text-center py-2 px-2">
                              {perms.view ? <Check size={14} className="text-green-600 mx-auto" /> : <X size={14} className="text-stone-300 mx-auto" />}
                            </td>
                            <td className="text-center py-2 px-2">
                              {def.actions.includes('create') ? (
                                perms.create ? <Check size={14} className="text-green-600 mx-auto" /> : <X size={14} className="text-stone-300 mx-auto" />
                              ) : <span className="text-stone-300">-</span>}
                            </td>
                            <td className="text-center py-2 px-2">
                              {def.actions.includes('edit') ? (
                                perms.edit ? <Check size={14} className="text-green-600 mx-auto" /> : <X size={14} className="text-stone-300 mx-auto" />
                              ) : <span className="text-stone-300">-</span>}
                            </td>
                            <td className="text-center py-2 px-2">
                              {def.actions.includes('delete') ? (
                                perms.delete ? <Check size={14} className="text-green-600 mx-auto" /> : <X size={14} className="text-stone-300 mx-auto" />
                              ) : <span className="text-stone-300">-</span>}
                            </td>
                            <td className="text-center py-2 px-2">
                              {otherPerms.length > 0 ? (
                                <div className="flex justify-center gap-1">
                                  {otherPerms.map(action => (
                                    perms[action] && (
                                      <span key={action} className="text-xs px-1 py-0.5 bg-blue-100 text-blue-700 rounded">
                                        {actionLabels[action]}
                                      </span>
                                    )
                                  ))}
                                </div>
                              ) : <span className="text-stone-300">-</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Roles;
