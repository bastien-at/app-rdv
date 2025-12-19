import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Wrench, 
  Bike, 
  Clock, 
  Euro,
  Search,
  X,
  Store as StoreIcon,
  Check
} from 'lucide-react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import AdminLayout from '../../components/admin/AdminLayout';
import { getAllServices, createService, updateService, deleteService, getStores } from '../../services/api';
import { Service, CreateServiceData, UpdateServiceData, Store } from '../../types';

export default function GlobalServicesManagementPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedServiceForStores, setSelectedServiceForStores] = useState<Service | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: '',
    service_type: 'workshop' as 'fitting' | 'workshop',
    category: '',
    is_global: true,
    is_active: true,
    isEnabledForCurrentStore: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [servicesData, storesData] = await Promise.all([
        getAllServices(),
        getStores()
      ]);
      console.log('Services chargés:', servicesData);
      
      // Filtrer uniquement les services globaux pour l'affichage principal
      const globalServices = servicesData.filter(s => s.is_global);
      setServices(globalServices);
      
      // Garder tous les services pour vérifier les activations locales
      setAllServices(servicesData);

      // Filtrer les magasins si c'est un admin de magasin
      const role = localStorage.getItem('admin_role') || sessionStorage.getItem('admin_role');
      const storeId = localStorage.getItem('admin_store_id') || sessionStorage.getItem('admin_store_id');

      if (role === 'store_admin' && storeId) {
        setStores(storesData.filter(store => store.id === storeId));
      } else {
        setStores(storesData);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert(`Erreur lors du chargement des données: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const isServiceEnabledForStore = (service: Service, storeId: string): boolean => {
    return allServices.some(s => 
      s.store_id === storeId && 
      s.name === service.name &&
      !s.is_global &&
      s.active
    );
  };

  const handleOpenModal = (service?: Service) => {
    const storeId = localStorage.getItem('admin_store_id') || sessionStorage.getItem('admin_store_id');
    const isEnabled = service && storeId ? isServiceEnabledForStore(service, storeId) : false;

    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        price: service.price.toString(),
        duration_minutes: service.duration_minutes.toString(),
        service_type: service.service_type,
        category: service.category || '',
        is_global: true,
        is_active: service.active,
        isEnabledForCurrentStore: isEnabled
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        duration_minutes: '',
        service_type: 'workshop',
        category: '',
        is_global: true,
        is_active: true,
        isEnabledForCurrentStore: false
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingService(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const storeId = localStorage.getItem('admin_store_id') || sessionStorage.getItem('admin_store_id');
    
    try {
      // Gestion de l'activation/désactivation locale
      if (storeId && editingService) {
        const currentlyEnabled = isServiceEnabledForStore(editingService, storeId);
        if (formData.isEnabledForCurrentStore !== currentlyEnabled) {
          await handleToggleStoreService(storeId, formData.isEnabledForCurrentStore, editingService);
        }
      }

      // Gestion de la mise à jour globale (si admin autorisé, ici simplifié)
      // Note: Normalement, un store_admin ne devrait pas modifier le service global, 
      // mais pour l'instant on garde la logique existante si on veut permettre l'édition du template global.
      // Si on ne veut pas que le store_admin touche au global, on pourrait conditionner ce bloc.
      
      if (editingService) {
        const updateData: UpdateServiceData = {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          duration_minutes: parseInt(formData.duration_minutes),
          category: formData.category,
          active: formData.is_active
        };
        await updateService(editingService.id, updateData);
      } else {
        const createData: CreateServiceData = {
          service_type: formData.service_type,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          duration_minutes: parseInt(formData.duration_minutes),
          category: formData.category,
          is_global: true,
          active: formData.is_active
        };
        const newService = await createService(createData);
        
        // Si l'admin veut activer pour son magasin immédiatement à la création
        if (storeId && formData.isEnabledForCurrentStore) {
          await handleToggleStoreService(storeId, true, newService);
        }
      }
      
      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette prestation ? Elle sera supprimée de tous les magasins.')) return;
    
    try {
      await deleteService(serviceId);
      await loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleManageStores = (service: Service) => {
    setSelectedServiceForStores(service);
    setShowStoreModal(true);
  };

  const handleToggleStoreService = async (storeId: string, enabled: boolean, serviceOverride?: Service) => {
    const serviceToToggle = serviceOverride || selectedServiceForStores;
    if (!serviceToToggle) return;
    
    try {
      if (enabled) {
        // Créer une copie du service pour ce magasin
        const createData: CreateServiceData = {
          store_id: storeId,
          service_type: serviceToToggle.service_type,
          name: serviceToToggle.name,
          description: serviceToToggle.description,
          price: serviceToToggle.price,
          duration_minutes: serviceToToggle.duration_minutes,
          category: serviceToToggle.category,
          image_url: serviceToToggle.image_url,
          is_global: false,
          active: true
        };
        await createService(createData);
      } else {
        // Trouver et supprimer le service de ce magasin
        const storeService = allServices.find(s => 
          s.store_id === storeId && 
          s.name === serviceToToggle.name &&
          !s.is_global
        );
        if (storeService) {
          await deleteService(storeService.id);
        }
      }
      // Pas de await loadData() ici si appelé depuis handleSubmit car loadData est appelé après
      if (!serviceOverride) {
        await loadData();
      }
    } catch (error) {
      console.error('Erreur:', error);
      // Ne pas afficher l'alerte ici si appelé depuis handleSubmit pour gérer l'erreur globalement
      if (!serviceOverride) throw error;
    }
  };

  const handleEnableAllForCurrentStore = async () => {
    const storeId = localStorage.getItem('admin_store_id') || sessionStorage.getItem('admin_store_id');
    if (!storeId) return;

    try {
      // Activer toutes les prestations affichées pour ce magasin
      for (const service of displayedServices) {
        const currentlyEnabled = isServiceEnabledForStore(service, storeId);
        if (!currentlyEnabled) {
          await handleToggleStoreService(storeId, true, service);
        }
      }
      await loadData();
      alert('Toutes les prestations visibles ont été activées pour votre magasin.');
    } catch (error) {
      console.error('Erreur activation globale pour le magasin:', error);
      alert('Erreur lors de l\'activation des prestations pour le magasin');
    }
  };

  const [activeTab, setActiveTab] = useState<'all' | 'workshop' | 'fitting'>('all');

  // ... (rest of the state and useEffects)

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (service.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const displayedServices = filteredServices.filter(service => {
    if (activeTab === 'all') return true;
    return service.service_type === activeTab;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des prestations...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des prestations globales</h1>
              <p className="text-gray-500 mt-1">Créez et gérez les prestations disponibles pour vos magasins</p>
            </div>
            <div className="flex items-center gap-3">
              {(localStorage.getItem('admin_store_id') || sessionStorage.getItem('admin_store_id')) && (
                <Button
                  variant="ghost"
                  className="border border-gray-300 text-sm"
                  onClick={handleEnableAllForCurrentStore}
                >
                  Activer toutes les prestations pour mon magasin
                </Button>
              )}
              <Button
                onClick={() => handleOpenModal()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle prestation
              </Button>
            </div>
          </div>

          {/* Tabs & Search */}
          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tout voir
              </button>
              <button
                onClick={() => setActiveTab('workshop')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'workshop'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Wrench className="h-4 w-4" />
                Atelier
              </button>
              <button
                onClick={() => setActiveTab('fitting')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'fitting'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Bike className="h-4 w-4" />
                Étude posturale
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durée
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                          service.service_type === 'workshop' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {service.service_type === 'workshop' ? <Wrench className="h-5 w-5" /> : <Bike className="h-5 w-5" />}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{service.name}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            {service.service_type === 'workshop' ? 'Atelier' : 'Étude posturale'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-md truncate" title={service.description}>
                        {service.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        {service.duration_minutes} min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {service.price} €
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        service.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {service.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(service)}
                          className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayedServices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Aucune prestation trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal création/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingService ? 'Modifier la prestation' : 'Nouvelle prestation'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de prestation *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, service_type: 'workshop' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.service_type === 'workshop'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-green-300'
                    }`}
                  >
                    <Wrench className={`h-6 w-6 mx-auto mb-2 ${
                      formData.service_type === 'workshop' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <p className="font-medium text-gray-900">Atelier</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, service_type: 'fitting' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.service_type === 'fitting'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <Bike className={`h-6 w-6 mx-auto mb-2 ${
                      formData.service_type === 'fitting' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <p className="font-medium text-gray-900">Étude posturale</p>
                  </button>
                </div>
              </div>

              <Input
                label="Nom de la prestation *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ex: Révision complète"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Décrivez la prestation..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Prix (€) *"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />

                <Input
                  label="Durée (minutes) *"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  required
                  min="1"
                  placeholder="30"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Prestation active (visible pour les clients)
                </label>
              </div>

              {/* Option d'activation pour le magasin courant */}
              {(localStorage.getItem('admin_store_id') || sessionStorage.getItem('admin_store_id')) && (
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <input
                    type="checkbox"
                    id="isEnabledForCurrentStore"
                    checked={formData.isEnabledForCurrentStore}
                    onChange={(e) => setFormData({ ...formData, isEnabledForCurrentStore: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="isEnabledForCurrentStore" className="text-sm font-bold text-gray-900">
                    Activer cette prestation pour mon magasin
                  </label>
                </div>
              )}
            </form>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCloseModal}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingService ? 'Enregistrer' : 'Créer la prestation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestion magasins */}
      {showStoreModal && selectedServiceForStores && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Gérer les magasins</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedServiceForStores.name}</p>
              </div>
              <button
                onClick={() => setShowStoreModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {stores.map(store => {
                  const isEnabled = isServiceEnabledForStore(selectedServiceForStores, store.id);
                  return (
                    <div
                      key={store.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <StoreIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{store.name}</p>
                          <p className="text-sm text-gray-500">{store.city}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleStoreService(store.id, !isEnabled)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          isEnabled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {isEnabled ? (
                          <span className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            Activé
                          </span>
                        ) : (
                          'Activer'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <Button
                onClick={() => setShowStoreModal(false)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
