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
    is_active: true
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
      console.log('Stores chargés:', storesData);
      // Filtrer uniquement les services globaux
      const globalServices = servicesData.filter(s => s.is_global);
      console.log('Services globaux:', globalServices);
      setServices(globalServices);
      setStores(storesData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert(`Erreur lors du chargement des données: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (service?: Service) => {
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
        is_active: service.active
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
        is_active: true
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
    
    try {
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
        await createService(createData);
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

  const handleToggleStoreService = async (storeId: string, enabled: boolean) => {
    if (!selectedServiceForStores) return;
    
    try {
      if (enabled) {
        // Créer une copie du service pour ce magasin
        const createData: CreateServiceData = {
          store_id: storeId,
          service_type: selectedServiceForStores.service_type,
          name: selectedServiceForStores.name,
          description: selectedServiceForStores.description,
          price: selectedServiceForStores.price,
          duration_minutes: selectedServiceForStores.duration_minutes,
          category: selectedServiceForStores.category,
          image_url: selectedServiceForStores.image_url,
          is_global: false,
          active: true
        };
        await createService(createData);
      } else {
        // Trouver et supprimer le service de ce magasin
        const storeService = services.find(s => 
          s.store_id === storeId && 
          s.name === selectedServiceForStores.name &&
          !s.is_global
        );
        if (storeService) {
          await deleteService(storeService.id);
        }
      }
      await loadData();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification');
    }
  };

  const isServiceEnabledForStore = (service: Service, storeId: string): boolean => {
    return services.some(s => 
      s.store_id === storeId && 
      s.name === service.name &&
      !s.is_global &&
      s.active
    );
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (service.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const workshopServices = filteredServices.filter(s => s.service_type === 'workshop');
  const fittingServices = filteredServices.filter(s => s.service_type === 'fitting');

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
            <Button
              onClick={() => handleOpenModal()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle prestation
            </Button>
          </div>

          {/* Search */}
          <div className="mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une prestation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Atelier */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Wrench className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Atelier mécanique</h2>
              <p className="text-sm text-gray-500">{workshopServices.length} prestation(s)</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshopServices.map(service => (
              <div
                key={service.id}
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-green-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{service.name}</h3>
                    <p className="text-sm text-gray-600">{service.description}</p>
                  </div>
                  {!service.active && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      Inactif
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Euro className="h-4 w-4" />
                    <span className="font-bold text-gray-900">{service.price}€</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => handleManageStores(service)}
                    className="flex-1 border-2 border-gray-300 hover:border-green-500 hover:bg-green-50"
                  >
                    <StoreIcon className="h-4 w-4 mr-2" />
                    Magasins
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleOpenModal(service)}
                    className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(service.id)}
                    className="border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {workshopServices.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucune prestation d'atelier</p>
              </div>
            )}
          </div>
        </div>

        {/* Étude posturale */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bike className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Étude posturale</h2>
              <p className="text-sm text-gray-500">{fittingServices.length} prestation(s)</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fittingServices.map(service => (
              <div
                key={service.id}
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{service.name}</h3>
                    <p className="text-sm text-gray-600">{service.description}</p>
                  </div>
                  {!service.active && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      Inactif
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Euro className="h-4 w-4" />
                    <span className="font-bold text-gray-900">{service.price}€</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => handleManageStores(service)}
                    className="flex-1 border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                  >
                    <StoreIcon className="h-4 w-4 mr-2" />
                    Magasins
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleOpenModal(service)}
                    className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(service.id)}
                    className="border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {fittingServices.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                <Bike className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucune prestation d'étude posturale</p>
              </div>
            )}
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
