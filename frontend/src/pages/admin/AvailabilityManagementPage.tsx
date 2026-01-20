import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Plus } from 'lucide-react';
import { fr } from 'date-fns/locale';
import AdminLayout from '../../components/admin/AdminLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { getAdminToken } from '../../services/api';
import AvailabilityBlocksList from '../../components/admin/availability/AvailabilityBlocksList';
import AvailabilityBlockModal from '../../components/admin/availability/AvailabilityBlockModal';
import { buildBlockPayloads, buildRecurringDates } from '../../components/admin/availability/utils';
import type { AvailabilityBlock, AvailabilityBlockFormData, Store } from '../../components/admin/availability/types';

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
  const [formData, setFormData] = useState<AvailabilityBlockFormData>({
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    reason: '',
    block_type: 'closure' as const,
    service_type: null as 'fitting' | 'workshop' | null,
    quantity: 1,
    is_recurring: false,
    recurring_day: 'monday',
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

  const handleDeleteRecurring = async (blockIds: string[]) => {
    if (blockIds.length === 0) return;
    const confirmDelete = confirm(
      `Supprimer les ${blockIds.length} occurrences de ce blocage récurrent ?`
    );
    if (!confirmDelete) return;

    try {
      const token = getAdminToken();
      for (const blockId of blockIds) {
        const response = await fetch(`/api/admin/availability-blocks/${blockId}`, {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('Erreur API suppression blocage');
        }
      }

      await loadBlocks();
    } catch (error) {
      console.error('Erreur suppression blocages récurrents:', error);
      alert('Erreur lors de la suppression du blocage récurrent');
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

  const handleAddBlock = async (cancelConflicts: boolean = false) => {
    try {
      const payloads = buildBlockPayloads(formData, selectedStore, cancelConflicts);
      const token = getAdminToken();

      for (const payload of payloads) {
        const response = await fetch('/api/admin/availability-blocks', {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const json = await response.json();

        if (!response.ok) {
          if (response.status === 409 && json.error === 'CONFLICTING_BOOKINGS') {
            const count = json.conflicts.length;
            const confirmCancel = window.confirm(
              `⚠️ ${count} rendez-vous sont déjà programmés sur un ou plusieurs créneaux.\n\n` +
              `Voulez-vous les annuler automatiquement et envoyer les emails de notification aux clients ?`
            );

            if (confirmCancel) {
              await handleAddBlock(true);
            }
            return;
          }
          throw new Error(json.error || 'Erreur API création blocage');
        }
      }

      setShowAddModal(false);
      resetForm();
      await loadBlocks();
      alert(formData.is_recurring
        ? 'Blocages récurrents créés avec succès.'
        : 'Blocage créé avec succès.'
      );
    } catch (error: any) {
      console.error('Erreur création blocage:', error);
      alert(error.message || 'Erreur lors de la création du blocage');
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
      quantity: 1,
      is_recurring: false,
      recurring_day: 'monday',
    });
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
  const recurringDatesPreview = formData.is_recurring
    ? buildRecurringDates(formData.start_date, formData.recurring_day)
    : [];

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
              <AvailabilityBlocksList
                blocks={blocks}
                loading={loading}
                showHistory={showHistory}
                onToggleHistory={() => setShowHistory(!showHistory)}
                onDelete={handleDeleteBlock}
                onDeleteRecurring={handleDeleteRecurring}
              />
            </div>
          </div>
        </div>

        {/* Modal d'ajout */}
        <AvailabilityBlockModal
          isOpen={showAddModal}
          formData={formData}
          setFormData={setFormData}
          selectedStoreData={selectedStoreData}
          orderedDays={orderedDays}
          daysTranslation={daysTranslation}
          recurringDatesPreview={recurringDatesPreview}
          onClose={() => {
            setShowAddModal(false);
            resetForm();
          }}
          onSubmit={() => handleAddBlock(false)}
        />
      </div>
    </AdminLayout>
  );
}
