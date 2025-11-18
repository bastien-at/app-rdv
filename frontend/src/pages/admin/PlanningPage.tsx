import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Settings, Plus, Bike, Wrench } from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks, 
  addMonths, 
  subMonths,
  isSameDay,
  parseISO,
  setHours,
  setMinutes
} from 'date-fns';
import { fr } from 'date-fns/locale';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

interface Store {
  id: string;
  name: string;
}

interface Booking {
  id: string;
  customer_firstname: string;
  customer_lastname: string;
  service_name: string;
  service_type: 'fitting' | 'workshop';
  start_datetime: string;
  end_datetime: string;
  status: string;
  technician_name?: string;
}

interface OpeningHours {
  day: number; // 0-6 (dimanche-samedi)
  is_open: boolean;
  morning_start?: string;
  morning_end?: string;
  afternoon_start?: string;
  afternoon_end?: string;
}

type ViewMode = 'week' | 'month';

export default function PlanningPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'fitting' | 'workshop'>('all');

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
      loadBookings();
      loadOpeningHours();
    }
  }, [selectedStore, currentDate, viewMode]);

  const loadStores = async () => {
    try {
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

  const loadBookings = async () => {
    setLoading(true);
    try {
      // TODO: Appel API réel
      const mockBookings: Booking[] = [
        {
          id: '1',
          customer_firstname: 'Jean',
          customer_lastname: 'Dupont',
          service_name: 'Étude posturale Route',
          service_type: 'fitting',
          start_datetime: setHours(setMinutes(new Date(), 0), 10).toISOString(),
          end_datetime: setHours(setMinutes(new Date(), 0), 11).toISOString(),
          status: 'confirmed',
          technician_name: 'Marc Lefebvre',
        },
        {
          id: '2',
          customer_firstname: 'Marie',
          customer_lastname: 'Martin',
          service_name: 'Étude posturale VTT',
          service_type: 'fitting',
          start_datetime: setHours(setMinutes(new Date(), 0), 14).toISOString(),
          end_datetime: setHours(setMinutes(new Date(), 0), 15).toISOString(),
          status: 'pending',
          technician_name: 'Sophie Dubois',
        },
        {
          id: '3',
          customer_firstname: 'Pierre',
          customer_lastname: 'Durand',
          service_name: 'Révision complète',
          service_type: 'workshop',
          start_datetime: setHours(setMinutes(new Date(), 0), 11).toISOString(),
          end_datetime: setHours(setMinutes(new Date(), 0), 12).toISOString(),
          status: 'confirmed',
          technician_name: 'Marc Lefebvre',
        },
        {
          id: '4',
          customer_firstname: 'Sophie',
          customer_lastname: 'Bernard',
          service_name: 'Réglage transmission',
          service_type: 'workshop',
          start_datetime: setHours(setMinutes(new Date(), 0), 16).toISOString(),
          end_datetime: setHours(setMinutes(new Date(), 0), 17).toISOString(),
          status: 'pending',
          technician_name: 'Sophie Dubois',
        },
      ];
      setBookings(mockBookings);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOpeningHours = async () => {
    try {
      // TODO: Appel API réel
      const mockHours: OpeningHours[] = [
        { day: 1, is_open: true, morning_start: '09:00', morning_end: '12:00', afternoon_start: '14:00', afternoon_end: '18:00' },
        { day: 2, is_open: true, morning_start: '09:00', morning_end: '12:00', afternoon_start: '14:00', afternoon_end: '18:00' },
        { day: 3, is_open: true, morning_start: '09:00', morning_end: '12:00', afternoon_start: '14:00', afternoon_end: '18:00' },
        { day: 4, is_open: true, morning_start: '09:00', morning_end: '12:00', afternoon_start: '14:00', afternoon_end: '18:00' },
        { day: 5, is_open: true, morning_start: '09:00', morning_end: '12:00', afternoon_start: '14:00', afternoon_end: '18:00' },
        { day: 6, is_open: true, morning_start: '09:00', morning_end: '12:00', afternoon_start: '14:00', afternoon_end: '17:00' },
        { day: 0, is_open: false },
      ];
      setOpeningHours(mockHours);
    } catch (error) {
      console.error('Erreur chargement horaires:', error);
    }
  };

  const getDaysToDisplay = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  };

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => {
      const matchesDay = isSameDay(parseISO(booking.start_datetime), day);
      const matchesTab = activeTab === 'all' || booking.service_type === activeTab;
      return matchesDay && matchesTab;
    });
  };
  
  const stats = {
    total: bookings.length,
    fitting: bookings.filter(b => b.service_type === 'fitting').length,
    workshop: bookings.filter(b => b.service_type === 'workshop').length,
  };

  const getOpeningHoursForDay = (day: Date) => {
    const dayOfWeek = day.getDay();
    return openingHours.find(h => h.day === dayOfWeek);
  };

  const navigatePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 border-green-300 text-green-800';
      case 'pending': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'cancelled': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };
  
  const getServiceTypeIcon = (serviceType: 'fitting' | 'workshop') => {
    return serviceType === 'fitting' 
      ? <Bike className="h-3 w-3 inline mr-1" />
      : <Wrench className="h-3 w-3 inline mr-1" />;
  };

  const days = getDaysToDisplay();

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
                Planning
              </h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Onglets */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Tous les RDV
                    <span className="ml-2 bg-gray-100 text-gray-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {stats.total}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('fitting')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'fitting'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bike className="h-5 w-5" />
                    Études posturales
                    <span className="ml-2 bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {stats.fitting}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('workshop')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'workshop'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Ateliers mécaniques
                    <span className="ml-2 bg-green-100 text-green-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {stats.workshop}
                    </span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Toolbar */}
          <Card className="mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Sélection magasin */}
              <div className="flex items-center gap-4">
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="h-10 px-4 border border-gray-400 rounded-button focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHoursModal(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Horaires
                </Button>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={navigatePrevious}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <Button variant="ghost" size="sm" onClick={navigateToday}>
                  Aujourd'hui
                </Button>

                <span className="font-semibold text-gray-900 min-w-[200px] text-center">
                  {viewMode === 'week' 
                    ? `Semaine du ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: fr })}`
                    : format(currentDate, 'MMMM yyyy', { locale: fr })
                  }
                </span>

                <Button variant="ghost" size="sm" onClick={navigateNext}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Mode vue */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'week' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                >
                  Semaine
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  Mois
                </Button>
              </div>
            </div>
          </Card>

          {/* Calendrier */}
          <Card>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Chargement...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {viewMode === 'week' ? (
                  // Vue semaine
                  <div className="grid grid-cols-8 gap-px bg-gray-200">
                    {/* Header avec heures */}
                    <div className="bg-white p-2 font-semibold text-sm text-gray-700">
                      Heure
                    </div>
                    {days.map((day) => (
                      <div key={day.toISOString()} className="bg-white p-2 text-center">
                        <div className="font-semibold text-sm text-gray-900">
                          {format(day, 'EEE', { locale: fr })}
                        </div>
                        <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-blue-500 font-bold' : 'text-gray-700'}`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}

                    {/* Grille horaire */}
                    {Array.from({ length: 10 }, (_, i) => i + 8).map((hour) => (
                      <>
                        <div key={`hour-${hour}`} className="bg-white p-2 text-sm text-gray-600 border-t border-gray-200">
                          {hour}:00
                        </div>
                        {days.map((day) => {
                          const dayBookings = getBookingsForDay(day).filter(b => {
                            const bookingHour = new Date(b.start_datetime).getHours();
                            return bookingHour === hour;
                          });
                          const hours = getOpeningHoursForDay(day);
                          const isOpen = hours?.is_open;

                          return (
                            <div 
                              key={`${day.toISOString()}-${hour}`}
                              className={`bg-white p-1 border-t border-gray-200 min-h-[60px] ${!isOpen ? 'bg-gray-50' : ''}`}
                            >
                              {dayBookings.map((booking) => (
                                <div
                                  key={booking.id}
                                  className={`text-xs p-2 rounded mb-1 border ${getStatusColor(booking.status)}`}
                                >
                                  <div className="font-semibold truncate">
                                    {getServiceTypeIcon(booking.service_type)}
                                    {booking.customer_firstname} {booking.customer_lastname}
                                  </div>
                                  <div className="truncate">{booking.service_name}</div>
                                  {booking.technician_name && (
                                    <div className="text-xs opacity-75">{booking.technician_name}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                ) : (
                  // Vue mois
                  <div className="grid grid-cols-7 gap-px bg-gray-200">
                    {/* Header jours */}
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                      <div key={day} className="bg-white p-2 text-center font-semibold text-sm text-gray-700">
                        {day}
                      </div>
                    ))}

                    {/* Jours du mois */}
                    {days.map((day) => {
                      const dayBookings = getBookingsForDay(day);
                      const hours = getOpeningHoursForDay(day);
                      const isOpen = hours?.is_open;

                      return (
                        <div
                          key={day.toISOString()}
                          className={`bg-white p-2 min-h-[100px] ${!isOpen ? 'bg-gray-50' : ''}`}
                        >
                          <div className={`text-sm mb-1 ${isSameDay(day, new Date()) ? 'text-blue-500 font-bold' : 'text-gray-700'}`}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-1">
                            {dayBookings.slice(0, 3).map((booking) => (
                              <div
                                key={booking.id}
                                className={`text-xs p-1 rounded border ${getStatusColor(booking.status)}`}
                              >
                                <div className="truncate font-semibold">
                                  {format(parseISO(booking.start_datetime), 'HH:mm')}
                                </div>
                                <div className="truncate">
                                  {booking.customer_firstname} {booking.customer_lastname}
                                </div>
                              </div>
                            ))}
                            {dayBookings.length > 3 && (
                              <div className="text-xs text-gray-600">
                                +{dayBookings.length - 3} autres
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Légende */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Confirmée</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>En attente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span>Annulée</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
              <span>Fermé</span>
            </div>
          </div>
        </div>

        {/* Modal Horaires d'ouverture */}
        {showHoursModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Horaires d'ouverture</h3>
                <button
                  onClick={() => setShowHoursModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((dayName, index) => {
                  const dayIndex = index === 6 ? 0 : index + 1;
                  const hours = openingHours.find(h => h.day === dayIndex);

                  return (
                    <div key={dayName} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-900">{dayName}</span>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={hours?.is_open || false}
                            className="rounded"
                            readOnly
                          />
                          <span className="text-sm">Ouvert</span>
                        </label>
                      </div>

                      {hours?.is_open && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Matin
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={hours.morning_start || ''}
                                className="flex-1 px-3 py-2 border border-gray-400 rounded-button"
                                readOnly
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={hours.morning_end || ''}
                                className="flex-1 px-3 py-2 border border-gray-400 rounded-button"
                                readOnly
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Après-midi
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={hours.afternoon_start || ''}
                                className="flex-1 px-3 py-2 border border-gray-400 rounded-button"
                                readOnly
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={hours.afternoon_end || ''}
                                className="flex-1 px-3 py-2 border border-gray-400 rounded-button"
                                readOnly
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowHoursModal(false)} fullWidth>
                  Fermer
                </Button>
                <Button fullWidth>
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
