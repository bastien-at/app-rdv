import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Edit2, Trash2, Mail, Phone, Calendar, X, Check } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { 
  Store, 
  CustomerDirectory, 
  CreateCustomerData, 
  UpdateCustomerData,
  PaginatedResponse 
} from '../../types';
import { getStores, getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../services/api';

interface CustomerFormState {
  id?: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  notes: string;
  active: boolean;
}

export default function AdminCustomerDirectoryPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [customers, setCustomers] = useState<PaginatedResponse<CustomerDirectory>>({
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDirectory | null>(null);
  const [form, setForm] = useState<CustomerFormState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fonction utilitaire pour décoder le JWT
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadStores();
  }, [navigate]);

  useEffect(() => {
    if (selectedStore) {
      loadCustomers();
    }
  }, [selectedStore, customers.page, searchQuery]);

  const loadStores = async () => {
    try {
      const storeData = await getStores();
      setStores(storeData);
      
      // Récupérer le store_id de l'admin connecté via le token
      const token = localStorage.getItem('admin_token');
      let adminStoreId = null;
      if (token) {
        const decoded = parseJwt(token);
        if (decoded && decoded.store_id) {
          adminStoreId = decoded.store_id;
        }
      }

      // Pré-sélectionner le magasin : soit celui de l'admin, soit le premier de la liste, soit garder l'actuel
      if (adminStoreId) {
        setSelectedStore(adminStoreId);
      } else if (storeData.length > 0 && !selectedStore) {
        setSelectedStore(storeData[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement magasins:', error);
      alert('Erreur lors du chargement des magasins');
    }
  };

  const loadCustomers = async () => {
    if (!selectedStore) return;
    
    setLoading(true);
    try {
      const params: any = {
        page: customers.page,
        limit: customers.limit
      };
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const customerData = await getCustomers(selectedStore, params);
      console.log('Données clients reçues:', customerData);
      setCustomers(customerData);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
      alert('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm({
      firstname: '',
      lastname: '',
      email: '',
      phone: '',
      notes: '',
      active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (customer: CustomerDirectory) => {
    setEditingCustomer(customer);
    setForm({
      id: customer.id,
      firstname: customer.firstname,
      lastname: customer.lastname,
      email: customer.email,
      phone: customer.phone,
      notes: customer.notes || '',
      active: customer.active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setForm(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !selectedStore) return;

    try {
      if (editingCustomer) {
        const payload: UpdateCustomerData = {
          firstname: form.firstname,
          lastname: form.lastname,
          email: form.email,
          phone: form.phone,
          notes: form.notes || undefined,
          active: form.active,
        };
        await updateCustomer(editingCustomer.id, payload);
      } else {
        const payload: CreateCustomerData = {
          store_id: selectedStore,
          firstname: form.firstname,
          lastname: form.lastname,
          email: form.email,
          phone: form.phone,
          notes: form.notes || undefined,
        };
        await createCustomer(selectedStore, payload);
      }
      await loadCustomers();
      closeModal();
    } catch (error: any) {
      console.error('Erreur sauvegarde client:', error);
      alert(error.response?.data?.error || 'Erreur lors de la sauvegarde du client');
    }
  };

  const handleDelete = async (customer: CustomerDirectory) => {
    if (!confirm(`Supprimer le client ${customer.firstname} ${customer.lastname} ?`)) return;
    try {
      await deleteCustomer(customer.id);
      await loadCustomers();
    } catch (error) {
      console.error('Erreur suppression client:', error);
      alert('Erreur lors de la suppression du client');
    }
  };

  const handlePageChange = (newPage: number) => {
    setCustomers(prev => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const currentStore = useMemo(() => 
    stores.find(s => s.id === selectedStore), 
    [stores, selectedStore]
  );

  if (loading && (!customers?.data || customers.data.length === 0)) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Chargement des clients...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Annuaire des clients</h1>
              <p className="text-sm text-gray-500">
                {currentStore ? `Gestion des clients du magasin ${currentStore.name}` : 'Sélectionnez un magasin'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionner un magasin</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.city})
                </option>
              ))}
            </select>
            <Button onClick={openCreateModal} disabled={!selectedStore}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau client
            </Button>
          </div>
        </div>
      </div>

      {selectedStore && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Barre de recherche */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>



          {/* Liste des clients */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {(!customers?.data || customers.data.length === 0) ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun client trouvé</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'Aucun client ne correspond à votre recherche.' : 'Commencez par ajouter un client à l\'annuaire.'}
                </p>
                {!searchQuery && (
                  <Button onClick={openCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un client
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Réservations
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dernière visite
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {customers.data.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {customer.firstname} {customer.lastname}
                              </div>
                              {customer.notes && (
                                <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                                  {customer.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-900">
                                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                {customer.email}
                              </div>
                              <div className="flex items-center text-sm text-gray-900">
                                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                {customer.phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {customer.total_bookings} réservation{customer.total_bookings > 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(customer.last_booking_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              customer.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {customer.active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                className="text-blue-600 hover:text-blue-900"
                                onClick={() => openEditModal(customer)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                className="text-red-600 hover:text-red-900"
                                onClick={() => handleDelete(customer)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {customers.total_pages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Affichage de {((customers.page - 1) * customers.limit) + 1} à{' '}
                      {Math.min(customers.page * customers.limit, customers.total)} sur{' '}
                      {customers.total} résultats
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        disabled={customers.page === 1}
                        onClick={() => handlePageChange(customers.page - 1)}
                      >
                        Précédent
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={customers.page === customers.total_pages}
                        onClick={() => handlePageChange(customers.page + 1)}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showModal && form && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCustomer ? 'Modifier le client' : 'Nouveau client'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Prénom *"
                  value={form.firstname}
                  onChange={e => setForm({ ...form, firstname: e.target.value })}
                  required
                />
                <Input
                  label="Nom *"
                  value={form.lastname}
                  onChange={e => setForm({ ...form, lastname: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Email *"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                label="Téléphone *"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes internes
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notes internes sur le client..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="customer-active"
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="customer-active" className="text-sm text-gray-700">
                  Client actif
                </label>
              </div>
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
    </AdminLayout>
  );
}
