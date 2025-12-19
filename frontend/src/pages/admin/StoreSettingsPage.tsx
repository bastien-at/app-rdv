import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Clock, MapPin, Save, Wrench, Bike, Lock } from 'lucide-react';
import { getStoreById, updateStore, changePassword } from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import AdminLayout from '../../components/admin/AdminLayout';
import { Store as StoreType } from '../../types';

export default function StoreSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<StoreType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    postal_code: '',
    city: '',
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
    has_workshop: true,
    has_fitting: true,
    workshop_capacity: 1
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = async () => {
    try {
      // Récupérer l'ID du magasin depuis le stockage local (défini lors du login)
      const storeId = localStorage.getItem('admin_store_id') || sessionStorage.getItem('admin_store_id');
      
      if (!storeId) {
        // Gérer le cas où aucun magasin n'est lié (par exemple admin global sans magasin spécifique)
        setLoading(false);
        return;
      }

      const data = await getStoreById(storeId);
      setStore(data);
      setFormData({
        name: data.name,
        address: data.address,
        postal_code: data.postal_code,
        city: data.city,
        phone: data.phone || '',
        email: data.email || '',
        opening_hours: data.opening_hours || formData.opening_hours,
        has_workshop: data.has_workshop ?? true,
        has_fitting: data.has_fitting ?? true,
        workshop_capacity: data.workshop_capacity ?? 1,
      });
    } catch (error) {
      console.error('Erreur chargement magasin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours[day as keyof typeof prev.opening_hours],
          [field]: value
        }
      }
    }));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setPasswordLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Erreur changement mot de passe:', err);
      setPasswordError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    setSaving(true);
    try {
      await updateStore(store.id, formData);
      // Recharger les données ou afficher une notification de succès
      alert('Paramètres du magasin mis à jour avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!store) {
    const adminRole =
      (typeof window !== 'undefined' && (localStorage.getItem('admin_role') || sessionStorage.getItem('admin_role')))
      || null;

    return (
      <AdminLayout>
        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
            Aucun magasin associé à ce compte administrateur.
          </div>
          {adminRole === 'super_admin' && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">Vous êtes super admin.</p>
                <p className="text-sm text-gray-600">
                  Créez un premier magasin pour pouvoir configurer les paramètres magasin et le planning.
                </p>
              </div>
              <Button
                className="whitespace-nowrap"
                onClick={() => navigate('/admin/users')}
              >
                Gérer les magasins
              </Button>
            </div>
          )}
        </div>
      </AdminLayout>
    );
  }

  const days = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' },
  ];

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto overflow-y-auto h-full">
        <div className="flex items-center gap-3 mb-6">
          <Store className="h-8 w-8 text-[#005162]" />
          <h1 className="text-2xl font-bold text-[#142129]">Paramètres du magasin</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 pb-10">
          {/* Services proposés */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-[#142129] mb-4 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-gray-400" />
              Services proposés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.has_workshop ? 'border-[#005162] bg-[#f0f7f9]' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="checkbox"
                  checked={formData.has_workshop}
                  onChange={(e) => handleChange('has_workshop', e.target.checked)}
                  className="hidden"
                />
                <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${formData.has_workshop ? 'bg-[#005162] border-[#005162]' : 'border-gray-300'}`}>
                  {formData.has_workshop && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className={`h-4 w-4 ${formData.has_workshop ? 'text-[#005162]' : 'text-gray-400'}`} />
                    <span className={`font-bold ${formData.has_workshop ? 'text-[#005162]' : 'text-gray-700'}`}>Atelier mécanique</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Entretien et réparation de vélos</p>
                  
                  {formData.has_workshop && (
                    <div className="mt-2" onClick={(e) => e.preventDefault()}>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Nombre de techniciens / créneaux simultanés
                      </label>
                      <input 
                        type="number"
                        min="1"
                        max="10"
                        value={formData.workshop_capacity || 1}
                        onChange={(e) => handleChange('workshop_capacity', parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-[#005162] focus:border-[#005162]"
                      />
                    </div>
                  )}
                </div>
              </label>

              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.has_fitting ? 'border-[#005162] bg-[#f0f7f9]' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="checkbox"
                  checked={formData.has_fitting}
                  onChange={(e) => handleChange('has_fitting', e.target.checked)}
                  className="hidden"
                />
                <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${formData.has_fitting ? 'bg-[#005162] border-[#005162]' : 'border-gray-300'}`}>
                  {formData.has_fitting && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Bike className={`h-4 w-4 ${formData.has_fitting ? 'text-[#005162]' : 'text-gray-400'}`} />
                    <span className={`font-bold ${formData.has_fitting ? 'text-[#005162]' : 'text-gray-700'}`}>Étude posturale</span>
                  </div>
                  <p className="text-xs text-gray-500">Analyse posturale et réglages</p>
                </div>
              </label>
            </div>
          </div>

          {/* Informations générales */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-[#142129] mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-400" />
              Informations générales
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nom du magasin"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
              <Input
                label="Adresse"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Code postal"
                  value={formData.postal_code}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  required
                />
                <Input
                  label="Ville"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Horaires */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-[#142129] mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              Horaires d'ouverture
            </h2>
            
            <div className="space-y-4">
              {days.map((day) => {
                const hours = formData.opening_hours[day.key as keyof typeof formData.opening_hours];
                return (
                  <div key={day.key} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-24 font-medium text-gray-700">{day.label}</div>
                    <div className="flex items-center gap-4 flex-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hours.closed}
                          onChange={(e) => handleHoursChange(day.key, 'closed', e.target.checked)}
                          className="rounded text-[#005162] focus:ring-[#005162]"
                        />
                        <span className="text-sm text-gray-600">Fermé</span>
                      </label>
                      
                      {!hours.closed && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => handleHoursChange(day.key, 'open', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#005162]"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => handleHoursChange(day.key, 'close', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#005162]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#005162] hover:bg-[#003a46] text-white"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sauvegarde...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Enregistrer les modifications
                </span>
              )}
            </Button>
          </div>
        </form>

        {/* Changement de mot de passe */}
        <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-[#142129] mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-400" />
            Changer mon mot de passe
          </h2>

          {passwordError && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100">
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <Input
              label="Mot de passe actuel"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirmer le nouveau mot de passe"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                disabled={passwordLoading}
                className="bg-[#005162] hover:bg-[#003a46] text-white"
              >
                {passwordLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Modification...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Mettre à jour le mot de passe
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
