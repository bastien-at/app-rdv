import { Save, X } from 'lucide-react';
import Card from '../../Card';
import Button from '../../Button';
import Input from '../../Input';
import type { AvailabilityBlockFormData, Store } from './types';

interface AvailabilityBlockModalProps {
  isOpen: boolean;
  formData: AvailabilityBlockFormData;
  setFormData: (data: AvailabilityBlockFormData) => void;
  selectedStoreData?: Store;
  orderedDays: string[];
  daysTranslation: Record<string, string>;
  recurringDatesPreview: Date[];
  onClose: () => void;
  onSubmit: () => void;
}

export default function AvailabilityBlockModal({
  isOpen,
  formData,
  setFormData,
  selectedStoreData,
  orderedDays,
  daysTranslation,
  recurringDatesPreview,
  onClose,
  onSubmit,
}: AvailabilityBlockModalProps) {
  if (!isOpen) return null;

  const capacityMax = formData.service_type === 'workshop'
    ? (selectedStoreData?.workshop_capacity || 1)
    : formData.service_type === 'fitting'
      ? (selectedStoreData?.fitting_capacity || 1)
      : Math.min(
          selectedStoreData?.workshop_capacity || 1,
          selectedStoreData?.fitting_capacity || 1,
        );

  const isSubmitDisabled =
    !formData.start_date ||
    !formData.start_time ||
    !formData.end_time ||
    !formData.reason ||
    (!formData.is_recurring && !formData.end_date);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Ajouter un blocage</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
              onChange={(e) => setFormData({ ...formData, block_type: e.target.value as AvailabilityBlockFormData['block_type'] })}
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
              onChange={(e) => {
                const newServiceType = (e.target.value as 'fitting' | 'workshop' | '') || null;
                setFormData({
                  ...formData,
                  service_type: newServiceType,
                  quantity: 1,
                });
              }}
              className="w-full h-12 px-4 border border-gray-400 rounded-button focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les services</option>
              <option value="workshop">Atelier uniquement</option>
              <option value="fitting">Étude posturale uniquement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de places à bloquer
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={capacityMax}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex items-center justify-center w-12 h-12 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-700 font-bold text-lg">
                {formData.quantity}
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Capacité disponible : {capacityMax} technicien(s)
            </p>
          </div>

          <Input
            label="Raison"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Ex: Congés annuels, Travaux..."
            required
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recurring_block"
              checked={formData.is_recurring}
              onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="recurring_block" className="text-sm font-medium text-gray-700">
              Blocage récurrent chaque semaine
            </label>
          </div>

          {formData.is_recurring && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jour de la semaine
                </label>
                <select
                  value={formData.recurring_day}
                  onChange={(e) => setFormData({ ...formData, recurring_day: e.target.value })}
                  className="w-full h-12 px-4 border border-gray-400 rounded-button focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {orderedDays.map((day) => (
                    <option key={day} value={day}>
                      {daysTranslation[day]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                {recurringDatesPreview.length > 0
                  ? `Créera ${recurringDatesPreview.length} blocage(s) sur 12 mois.`
                  : 'Sélectionnez une date de début.'}
              </div>
            </div>
          )}

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
              required={!formData.is_recurring}
              disabled={formData.is_recurring}
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
          <Button variant="ghost" onClick={onClose} fullWidth>
            Annuler
          </Button>
          <Button onClick={onSubmit} fullWidth disabled={isSubmitDisabled}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </Card>
    </div>
  );
}
