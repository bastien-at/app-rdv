import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Check } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from '../Button';
import Input from '../Input';
import { Service, TimeSlot, CreateBookingData } from '../../types';
import { getAvailability, createBooking } from '../../services/api';

interface BookingSectionProps {
  storeId: string;
  storeName: string;
  selectedService: Service | null;
  onBack: () => void;
  onSuccess: (bookingToken: string) => void;
}

type Step = 'date' | 'form';

export default function BookingSection({ 
  storeId, 
  storeName, 
  selectedService, 
  onBack,
  onSuccess 
}: BookingSectionProps) {
  const [step, setStep] = useState<Step>('date');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    height: '',
    weight: '',
    shoeSize: '',
    practiceFrequency: '',
    painDescription: '',
    bikeInfo: 'own',
    acceptTerms: false,
  });

  useEffect(() => {
    if (selectedService && selectedDate) {
      loadAvailability();
    }
  }, [selectedService, selectedDate]);

  const loadAvailability = async () => {
    if (!selectedService || !selectedDate) return;
    
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const slots = await getAvailability(storeId, selectedService.id, dateStr);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleContinueToForm = () => {
    if (!selectedSlot) return;
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService || !selectedSlot) return;
    
    setSubmitting(true);
    
    try {
      const bookingData: CreateBookingData = {
        store_id: storeId,
        service_id: selectedService.id,
        technician_id: selectedSlot.technician_id,
        start_datetime: selectedSlot.start_datetime,
        customer_firstname: formData.firstname,
        customer_lastname: formData.lastname,
        customer_email: formData.email,
        customer_phone: formData.phone,
        customer_data: {
          height: formData.height ? parseInt(formData.height) : undefined,
          weight: formData.weight ? parseInt(formData.weight) : undefined,
          shoe_size: formData.shoeSize ? parseInt(formData.shoeSize) : undefined,
          practice_frequency: formData.practiceFrequency || undefined,
          pain_description: formData.painDescription || undefined,
          bike_info: formData.bikeInfo || undefined,
        },
      };
      
      const booking = await createBooking(bookingData);
      onSuccess(booking.booking_token);
    } catch (error) {
      console.error('Erreur lors de la création de la réservation:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const previousMonth = () => setCurrentMonth(prev => addMonths(prev, -1));
  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  if (!selectedService) return null;

  const steps = [
    { id: 'date', label: 'Date & Heure', completed: step === 'form' },
    { id: 'form', label: 'Informations', completed: false },
  ];

  return (
    <section id="booking" className="py-24 bg-gray-50 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <button
              onClick={onBack}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Changer de service
            </button>
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Réservation : {selectedService.name}
            </h2>
            <p className="text-xl text-gray-600">
              {storeName} - {selectedService.price}€
            </p>
          </div>

          {/* Stepper */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4">
              {steps.map((s, index) => (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      s.completed 
                        ? 'bg-blue-500 text-white' 
                        : s.id === step
                        ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-100'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {s.completed ? <Check className="h-5 w-5" /> : index + 1}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${
                      s.id === step ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 w-16 mx-4 ${
                      s.completed ? 'bg-blue-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contenu */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Étape Date */}
            {step === 'date' && (
              <div>
                {/* Calendrier */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">
                      {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={previousMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                      <div key={i} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                    {getDaysInMonth().map((day, i) => {
                      const isPast = isBefore(day, startOfDay(new Date()));
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isCurrentDay = isToday(day);

                      return (
                        <button
                          key={i}
                          onClick={() => !isPast && handleDateSelect(day)}
                          disabled={isPast}
                          className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                            isPast
                              ? 'text-gray-300 cursor-not-allowed'
                              : isSelected
                              ? 'bg-blue-600 text-white shadow-lg scale-105'
                              : isCurrentDay
                              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {format(day, 'd')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Créneaux */}
                {selectedDate && (
                  <div>
                    <h3 className="font-semibold mb-3">Créneaux disponibles</h3>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Aucun créneau disponible ce jour</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 mb-6">
                        {availableSlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => handleSlotSelect(slot)}
                            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                              selectedSlot === slot
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {format(new Date(slot.start_datetime), 'HH:mm')}
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedSlot && (
                      <Button
                        fullWidth
                        onClick={handleContinueToForm}
                        className="mt-4"
                      >
                        Continuer
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Étape Formulaire */}
            {step === 'form' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Vos informations</h3>
                  <button
                    onClick={() => setStep('date')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Modifier
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Prénom *"
                      value={formData.firstname}
                      onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                      required
                    />
                    <Input
                      label="Nom *"
                      value={formData.lastname}
                      onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                      required
                    />
                  </div>

                  <Input
                    label="Email *"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />

                  <Input
                    label="Téléphone *"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />

                  {selectedService.service_type === 'fitting' && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <Input
                          label="Taille (cm)"
                          type="number"
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        />
                        <Input
                          label="Poids (kg)"
                          type="number"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        />
                        <Input
                          label="Pointure"
                          type="number"
                          value={formData.shoeSize}
                          onChange={(e) => setFormData({ ...formData, shoeSize: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fréquence de pratique
                        </label>
                        <select
                          value={formData.practiceFrequency}
                          onChange={(e) => setFormData({ ...formData, practiceFrequency: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Sélectionnez</option>
                          <option value="occasional">Occasionnel (1-2x/mois)</option>
                          <option value="regular">Régulier (1-2x/semaine)</option>
                          <option value="intensive">Intensif (3+/semaine)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Douleurs ou gênes
                        </label>
                        <textarea
                          value={formData.painDescription}
                          onChange={(e) => setFormData({ ...formData, painDescription: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Décrivez vos éventuelles douleurs..."
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-start gap-3 pt-4">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={formData.acceptTerms}
                      onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                      className="mt-1"
                      required
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600">
                      J'accepte les conditions générales et la politique de confidentialité *
                    </label>
                  </div>

                  <Button
                    type="submit"
                    fullWidth
                    disabled={submitting}
                    className="mt-6"
                  >
                    {submitting ? 'Réservation en cours...' : 'Confirmer la réservation'}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
