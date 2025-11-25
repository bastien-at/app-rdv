import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Store as StoreIcon, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { Store, AdminWithStore, CreateAdminData, UpdateAdminData, CreateStoreData } from '../../types';
import { getStores, getAdmins, createAdmin, updateAdmin, deleteAdminApi, createStore } from '../../services/api';

interface AdminFormState {
  id?: string;
  email: string;
  name: string;
  role: 'super_admin' | 'store_admin';
  store_id: string;
  active: boolean;
}

export default function AdminUsersManagementPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [admins, setAdmins] = useState<AdminWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminWithStore | null>(null);
  const [form, setForm] = useState<AdminFormState | null>(null);
  const [storeForm, setStoreForm] = useState<CreateStoreData>({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    opening_hours: {
      monday: { open: '10:00', close: '19:00', closed: false },
      tuesday: { open: '10:00', close: '19:00', closed: false },
      wednesday: { open: '10:00', close: '19:00', closed: false },
      thursday: { open: '10:00', close: '19:00', closed: false },
      friday: { open: '10:00', close: '19:00', closed: false },
      saturday: { open: '10:00', close: '19:00', closed: false },
      sunday: { open: '00:00', close: '00:00', closed: true },
    },
    active: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [storeData, adminData] = await Promise.all([
        getStores(),
        getAdmins(),
      ]);
      setStores(storeData);
      setAdmins(adminData);
    } catch (error) {
      console.error('Erreur chargement admins/stores:', error);
      alert('Erreur lors du chargement des administrateurs');
    } finally {
      setLoading(false);
    }
  };

  const storeAdminsByStoreId = useMemo(() => {
    const map = new Map<string, AdminWithStore>();
    admins.forEach((admin) => {
      if (admin.store_id) {
        map.set(admin.store_id, admin);
      }
    });
    return map;
  }, [admins]);

  const openCreateModal = (storeId?: string) => {
    setEditingAdmin(null);
    setForm({
      email: '',
      name: '',
      role: 'store_admin',
      store_id: storeId || '',
      active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (admin: AdminWithStore) => {
    setEditingAdmin(admin);
    setForm({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      store_id: admin.store_id || '',
      active: admin.active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAdmin(null);
    setForm(null);
  };

  const openStoreModal = () => {
    setShowStoreModal(true);
  };

  const closeStoreModal = () => {
    setShowStoreModal(false);
  };

  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createStore(storeForm);
      await loadData();
      setShowStoreModal(false);
      // Pré-sélectionner ce magasin si on ouvre un nouvel admin ensuite
      openCreateModal(created.id);
    } catch (error) {
      console.error('Erreur création magasin:', error);
      alert('Erreur lors de la création du magasin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    try {
      if (editingAdmin) {
        const payload: UpdateAdminData = {
          email: form.email,
          name: form.name,
          role: form.role,
          store_id: form.store_id || undefined,
          active: form.active,
        };
        if ((form as any).password) {
          payload.password = (form as any).password;
        }
        await updateAdmin(editingAdmin.id, payload);
      } else {
        const payload: CreateAdminData = {
          email: form.email,
          password: (form as any).password || 'ChangeMe123!',
          name: form.name,
          role: form.role,
          store_id: form.store_id || undefined,
        };
        await createAdmin(payload);
      }
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Erreur sauvegarde admin:', error);
      alert('Erreur lors de la sauvegarde de l\'administrateur');
    }
  };

  const handleDelete = async (admin: AdminWithStore) => {
    if (!confirm(`Supprimer l'administrateur ${admin.email} ?`)) return;
    try {
      await deleteAdminApi(admin.id);
      await loadData();
    } catch (error) {
      console.error('Erreur suppression admin:', error);
      alert('Erreur lors de la suppression de l\'administrateur');
    }
  };

  const availableStoresForNewAdmin = useMemo(() => {
    const usedStoreIds = new Set(admins.filter(a => a.store_id).map(a => a.store_id as string));
    return stores.filter(store => !usedStoreIds.has(store.id));
  }, [stores, admins]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Chargement des administrateurs...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des administrateurs</h1>
              <p className="text-sm text-gray-500">Affecter un admin par magasin (rôle store_admin) et gérer les super admins</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={openStoreModal}>
              <StoreIcon className="h-4 w-4 mr-2" />
              Nouveau magasin
            </Button>
            <Button onClick={() => openCreateModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel administrateur
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Admins par magasin</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map(store => {
              const admin = storeAdminsByStoreId.get(store.id);
              return (
                <div key={store.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col justify-between">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <StoreIcon className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{store.name}</h3>
                      <p className="text-sm text-gray-500">{store.city}</p>
                    </div>
                  </div>
                  {admin ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{admin.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${admin.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {admin.active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <p className="text-gray-600 truncate">{admin.email}</p>
                      <p className="text-xs text-gray-500">Rôle : {admin.role === 'super_admin' ? 'Super admin' : 'Admin magasin'}</p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="ghost"
                          className="flex-1 border border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                          onClick={() => openEditModal(admin)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          className="border border-gray-300 hover:border-red-500 hover:bg-red-50"
                          onClick={() => handleDelete(admin)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-3">Aucun admin magasin assigné.</p>
                      <Button
                        variant="ghost"
                        className="w-full border border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                        onClick={() => openCreateModal(store.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assigner un admin magasin
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showModal && form && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingAdmin ? 'Modifier l\'administrateur' : 'Nouvel administrateur'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <Input
                label="Email *"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                label="Nom *"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as 'super_admin' | 'store_admin' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="store_admin">Admin magasin</option>
                  <option value="super_admin">Super admin</option>
                </select>
              </div>

              {form.role === 'store_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Magasin *</label>
                  <select
                    value={form.store_id}
                    onChange={e => setForm({ ...form, store_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sélectionner un magasin</option>
                    {stores.map(store => {
                      const hasAdmin = storeAdminsByStoreId.has(store.id);
                      const isCurrentStore = editingAdmin && editingAdmin.store_id === store.id;
                      if (!isCurrentStore && hasAdmin) {
                        return null; // imposer 1 admin par magasin
                      }
                      return (
                        <option key={store.id} value={store.id}>
                          {store.name} ({store.city})
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Un seul admin magasin par magasin est autorisé.</p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <input
                  id="admin-active"
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="admin-active" className="text-sm text-gray-700">
                  Administrateur actif
                </label>
              </div>

              {!editingAdmin && (
                <Input
                  label="Mot de passe initial *"
                  type="password"
                  value={(form as any).password || ''}
                  onChange={e => setForm({ ...(form as any), password: e.target.value })}
                  required
                  placeholder="Mot de passe provisoire"
                />
              )}
            </form>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
              <Button variant="ghost" onClick={closeModal}>
                Annuler
              </Button>
              <Button type="submit" onClick={handleSubmit}>
                <Check className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {showStoreModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Nouveau magasin</h2>
              <button
                onClick={closeStoreModal}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStoreSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <Input
                label="Nom du magasin *"
                value={storeForm.name}
                onChange={e => setStoreForm({ ...storeForm, name: e.target.value })}
                required
              />
              <Input
                label="Adresse *"
                value={storeForm.address}
                onChange={e => setStoreForm({ ...storeForm, address: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Ville *"
                  value={storeForm.city}
                  onChange={e => setStoreForm({ ...storeForm, city: e.target.value })}
                  required
                />
                <Input
                  label="Code postal *"
                  value={storeForm.postal_code}
                  onChange={e => setStoreForm({ ...storeForm, postal_code: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Téléphone"
                value={storeForm.phone}
                onChange={e => setStoreForm({ ...storeForm, phone: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={storeForm.email}
                onChange={e => setStoreForm({ ...storeForm, email: e.target.value })}
              />
            </form>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
              <Button variant="ghost" onClick={closeStoreModal}>
                Annuler
              </Button>
              <Button type="submit" onClick={handleStoreSubmit}>
                <Check className="h-4 w-4 mr-2" />
                Créer le magasin
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
