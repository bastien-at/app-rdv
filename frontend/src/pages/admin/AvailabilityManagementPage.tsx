import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AdminLayout from '../../components/admin/AdminLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Badge from '../../components/Badge';
import { getAdminToken } from '../../services/api';

interface Store {
  id: string;
  name: string;
  opening_hours: {
    [key: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
}

interface AvailabilityBlock {
  id?: string;
  store_id: string;
  technician_id?: string;
  start_datetime: string;
  end_datetime: string;
  reason: string;
  block_type: 'closure' | 'maintenance' | 'holiday' | 'other';
  service_type?: 'fitting' | 'workshop' | null;
}

export default function AvailabilityManagementPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AvailabilityBlock | null>(null);
  const [adminStoreId, setAdminStoreId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    reason: '',
    block_type: 'closure' as const,
    service_type: null as 'fitting' | 'workshop' | null,
  });

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
    const token = getAdminToken();
    if (!token) {
      navigate('/admin/login');
    } else {
      const decoded = parseJwt(token);
      if (decoded && decoded.store_id) {
        setAdminStoreId(decoded.store_id);
      }
      loadStores();
    }
  }, [navigate]);

  useEffect(() => {
    if (selectedStore) {
      loadBlocks();
    }
  }, [selectedStore]);

  const loadStores = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/stores', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Erreur API magasins');
      }

      const json = await response.json();
      let data: Store[] = json.data || [];

      // Si l'admin est restreint à un magasin, on filtre
      const currentToken = getAdminToken();
      if (currentToken) {
        const decoded = parseJwt(currentToken);
        if (decoded && decoded.store_id) {
          data = data.filter(s => s.id === decoded.store_id);
          if (data.length > 0) {
            setSelectedStore(data[0].id);
          }
        } else if (data.length > 0 && !selectedStore) {
           setSelectedStore(data[0].id);
        }
      }
      
      setStores(data);
    } catch (error) {
      console.error('Erreur chargement magasins:', error);
    }
  };

  const loadBlocks = async () => {
    setLoading(true);
    try {
      if (!selectedStore) {
        setBlocks([]);
        return;
      }

      console.log('Chargement des blocages pour le magasin:', selectedStore);
      const response = await fetch(`/api/admin/stores/${selectedStore}/availability-blocks`, {
        headers: {
          Authorization: `Bearer ${getAdminToken()}`,
        },
      });

      if (!response.ok) {
        console.error('Erreur HTTP:', response.status, response.statusText);
        const text = await response.text();
        console.error('Réponse brute:', text);
        throw new Error(`Erreur API blocages: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      console.log('Réponse API blocages:', json);
      const data: AvailabilityBlock[] = json.data || [];

      setBlocks(data);
    } catch (error: any) {
      console.error('Erreur chargement blocages:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async () => {
    try {
      const start_datetime = `${formData.start_date}T${formData.start_time}:00`;
      const end_datetime = `${formData.end_date}T${formData.end_time}:00`;

      const newBlock: Omit<AvailabilityBlock, 'id'> = {
        store_id: selectedStore,
        start_datetime,
        end_datetime,
        reason: formData.reason,
        block_type: formData.block_type,
        service_type: formData.service_type,
      };

      const token = getAdminToken();
      const response = await fetch('/api/admin/availability-blocks', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBlock),
      });

      if (!response.ok) {
        throw new Error('Erreur API création blocage');
      }

      setShowAddModal(false);
      resetForm();
      await loadBlocks();
    } catch (error) {
      console.error('Erreur création blocage:', error);
      alert('Erreur lors de la création du blocage');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce blocage ?')) return;

    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/availability-blocks/${blockId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Erreur API suppression blocage');
      }

      await loadBlocks();
    } catch (error) {
      console.error('Erreur suppression blocage:', error);
      alert('Erreur lors de la suppression du blocage');
    }
  };

  const resetForm = () => {
    setFormData({
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      reason: '',
      block_type: 'closure',
      service_type: null,
    });
  };

  const getBlockTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      closure: 'Fermeture',
      maintenance: 'Maintenance',
      holiday: 'Congés',
      other: 'Autre',
    };
    return labels[type] || type;
  };

  const getBlockTypeBadge = (type: string) => {
    switch (type) {
      case 'closure':
        return <Badge variant="error">Fermeture</Badge>;
      case 'maintenance':
        return <Badge variant="warning">Maintenance</Badge>;
      case 'holiday':
        return <Badge variant="info">Congés</Badge>;
      default:
        return <Badge variant="info">Autre</Badge>;
    }
  };

  const selectedStoreData = stores.find(s => s.id === selectedStore);

  const daysTranslation: Record<string, string> = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };

  const orderedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <AdminLayout>
      <div className="overflow-y-auto h-full bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
                ← Retour
              </Button>
              <h1 className="text-xl font-bold text-blue-500">
                Gestion des disponibilités
              </h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne de gauche : Sélection et Horaires */}
            <div className="lg:col-span-1 space-y-6">
              {/* Sélection du magasin */}
              <Card>
                <div className="flex flex-col gap-4">
                  <Button onClick={() => setShowAddModal(true)} fullWidth>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un blocage
                  </Button>
                </div>
              </Card>

              {/* Horaires d'ouverture habituels */}
              {selectedStoreData && selectedStoreData.opening_hours && (
                <Card>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    Horaires d'ouverture
                  </h3>
                  <div className="space-y-2 text-sm">
                    {orderedDays.map(day => {
                      const schedule = selectedStoreData.opening_hours[day];
                      if (!schedule) return null;
                      
                      return (
                        <div key={day} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                          <span className="text-gray-600 font-medium">{daysTranslation[day]}</span>
                          <span className={`${schedule.closed ? 'text-red-500' : 'text-gray-900'}`}>
                            {schedule.closed ? (
                              'Fermé'
                            ) : (
                              `${schedule.open} - ${schedule.close}`
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>

            {/* Colonne de droite : Liste des blocages */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Périodes bloquées exceptionnelles</h2>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      showHistory 
                        ? 'bg-gray-100 text-gray-900' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {showHistory ? 'Masquer l\'historique' : 'Voir l\'historique'}
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Chargement...</p>
                  </div>
                ) : blocks.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Aucun blocage configuré</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blocks
                      .filter(block => {
                        if (showHistory) return true;
                        // Garder les blocages futurs ou en cours (fin après maintenant)
                        return new Date(block.end_datetime) > new Date();
                      })
                      .map((block) => (
                      <div
                        key={block.id}
                        className={`border rounded-lg p-4 transition-colors ${
                          new Date(block.end_datetime) < new Date()
                            ? 'border-gray-100 bg-gray-50 opacity-75'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getBlockTypeBadge(block.block_type)}
                              <span className="font-medium text-gray-900">{block.reason}</span>
                              {block.service_type ? (
                                <Badge variant={block.service_type === 'workshop' ? 'warning' : 'info'}>
                                  {block.service_type === 'workshop' ? 'Atelier' : 'Étude posturale'}
                                </Badge>
                              ) : (
                                <Badge variant="neutral">Tous les services</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Du {format(new Date(block.start_datetime), 'dd/MM/yyyy', { locale: fr })}
                                  {' '}au {format(new Date(block.end_datetime), 'dd/MM/yyyy', { locale: fr })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(new Date(block.start_datetime), 'HH:mm', { locale: fr })}
                                  {' '}-{' '}
                                  {format(new Date(block.end_datetime), 'HH:mm', { locale: fr })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBlock(block.id!)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {blocks.filter(block => !showHistory && new Date(block.end_datetime) > new Date()).length === 0 && !showHistory && blocks.length > 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        Aucun blocage à venir. <button onClick={() => setShowHistory(true)} className="text-blue-600 hover:underline">Voir l'historique</button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        {/* Modal d'ajout */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Ajouter un blocage</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de blocage
                  </label>
                  <select
                    value={formData.block_type}
                    onChange={(e) => setFormData({ ...formData, block_type: e.target.value as any })}
                    className="w-full h-12 px-4 border border-gray-400 rounded-button focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="closure">Fermeture</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="holiday">Congés</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de service (optionnel)
                  </label>
                  <select
                    value={formData.service_type || ''}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value as 'fitting' | 'workshop' | null || null })}
                    className="w-full h-12 px-4 border border-gray-400 rounded-button focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tous les services</option>
                    <option value="workshop">Atelier uniquement</option>
                    <option value="fitting">Étude posturale uniquement</option>
                  </select>
                </div>

                <Input
                  label="Raison"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Ex: Congés annuels, Travaux..."
                  required
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Date de début"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                  <Input
                    label="Heure de début"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Date de fin"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                  <Input
                    label="Heure de fin"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  fullWidth
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddBlock}
                  fullWidth
                  disabled={!formData.start_date || !formData.end_date || !formData.reason}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
