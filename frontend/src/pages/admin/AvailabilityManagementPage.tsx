import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Badge from '../../components/Badge';

interface Store {
  id: string;
  name: string;
}

interface AvailabilityBlock {
  id?: string;
  store_id: string;
  technician_id?: string;
  start_datetime: string;
  end_datetime: string;
  reason: string;
  block_type: 'closure' | 'maintenance' | 'holiday' | 'other';
}

export default function AvailabilityManagementPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AvailabilityBlock | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    reason: '',
    block_type: 'closure' as const,
  });

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
    } else {
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
      // TODO: Remplacer par l'appel API réel
      const mockStores: Store[] = [
        { id: '1', name: 'Alltricks Paris' },
        { id: '2', name: 'Alltricks Lyon' },
        { id: '3', name: 'Alltricks Marseille' },
      ];
      setStores(mockStores);
      if (mockStores.length > 0) {
        setSelectedStore(mockStores[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement magasins:', error);
    }
  };

  const loadBlocks = async () => {
    setLoading(true);
    try {
      // TODO: Remplacer par l'appel API réel
      // const response = await fetch(`/api/admin/stores/${selectedStore}/availability-blocks`, {
      //   headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
      // });
      // const data = await response.json();
      
      const mockBlocks: AvailabilityBlock[] = [
        {
          id: '1',
          store_id: selectedStore,
          start_datetime: new Date(Date.now() + 86400000 * 7).toISOString(),
          end_datetime: new Date(Date.now() + 86400000 * 14).toISOString(),
          reason: 'Congés annuels',
          block_type: 'holiday',
        },
      ];
      setBlocks(mockBlocks);
    } catch (error) {
      console.error('Erreur chargement blocages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async () => {
    try {
      const start_datetime = `${formData.start_date}T${formData.start_time}:00`;
      const end_datetime = `${formData.end_date}T${formData.end_time}:00`;

      const newBlock: AvailabilityBlock = {
        store_id: selectedStore,
        start_datetime,
        end_datetime,
        reason: formData.reason,
        block_type: formData.block_type,
      };

      // TODO: Appel API
      // const response = await fetch('/api/admin/availability-blocks', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(newBlock)
      // });

      console.log('Nouveau blocage:', newBlock);
      setShowAddModal(false);
      resetForm();
      loadBlocks();
    } catch (error) {
      console.error('Erreur création blocage:', error);
      alert('Erreur lors de la création du blocage');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce blocage ?')) return;

    try {
      // TODO: Appel API
      // await fetch(`/api/admin/availability-blocks/${blockId}`, {
      //   method: 'DELETE',
      //   headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
      // });

      console.log('Suppression blocage:', blockId);
      loadBlocks();
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

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen bg-gray-50">
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
          {/* Sélection du magasin */}
          <Card className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Magasin
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-400 rounded-button focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un blocage
              </Button>
            </div>
          </Card>

          {/* Liste des blocages */}
          <Card>
            <h2 className="text-xl font-semibold mb-6">Périodes bloquées</h2>

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
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getBlockTypeBadge(block.block_type)}
                          <span className="font-medium text-gray-900">{block.reason}</span>
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
              </div>
            )}
          </Card>
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
    </Layout>
  );
}
