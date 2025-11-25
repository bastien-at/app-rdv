import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Bike,
  Wrench
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from '../../components/Button';
import CreateBookingModal from '../../components/CreateBookingModal';
import BookingDrawer from '../../components/BookingDrawer';
import AdminLayout from '../../components/admin/AdminLayout';
import { getAllBookings, getStoreById } from '../../services/api';
import { Booking as BookingType, Store } from '../../types';

interface Booking extends BookingType {
  customer_name?: string;
  service_type?: 'fitting' | 'workshop';
}

export default function ModernAdminDashboard() {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'fitting' | 'workshop'>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);

  // Charger les réservations depuis l'API
  useEffect(() => {
    loadBookings();
    loadStoreInfo();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await getAllBookings();
      // Transformer les données pour correspondre à notre interface
      const transformedBookings = data.map(booking => ({
        ...booking,
        customer_name: `${booking.customer_firstname} ${booking.customer_lastname}`,
        // Détecter le type de service depuis le nom
        service_type: booking.service_name?.toLowerCase().includes('posturale') || 
                      booking.service_name?.toLowerCase().includes('fitting')
          ? 'fitting' as const
          : 'workshop' as const
      }));
      setBookings(transformedBookings);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreInfo = async () => {
    try {
      const role = localStorage.getItem('admin_role');
      const storeId = localStorage.getItem('admin_store_id');
      if (role === 'store_admin' && storeId) {
        const store = await getStoreById(storeId);
        setCurrentStore(store);
      } else {
        setCurrentStore(null);
      }
    } catch (error) {
      console.error('Erreur chargement magasin admin:', error);
    }
  };

  // Jours de la semaine (Lundi à Samedi uniquement)
  const weekDays = Array.from({ length: 6 }, (_, i) => 
    addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), i)
  );

  const previousWeek = () => setCurrentWeek(prev => addDays(prev, -7));
  const nextWeek = () => setCurrentWeek(prev => addDays(prev, 7));
  
  const previousDay = () => setSelectedDate(prev => addDays(prev, -1));
  const nextDay = () => setSelectedDate(prev => addDays(prev, 1));

  // Filtrer les réservations selon le type de service
  const filteredBookings = bookings.filter(booking => {
    if (serviceFilter === 'all') return true;
    return booking.service_type === serviceFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmé (client notifié)';
      case 'pending': return 'En attente validation';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDrawer(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des réservations...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
        {/* Contexte magasin pour admin de magasin */}
        {currentStore && (
          <div className="px-8 pt-4 pb-2 bg-white border-b border-gray-200 flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium text-gray-800">Magasin :</span>
            <span>{currentStore.name} ({currentStore.city})</span>
          </div>
        )}

        {/* Service Filter */}
        <div className="px-8 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Type de service :</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setServiceFilter('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  serviceFilter === 'all'
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setServiceFilter('fitting')}
                className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  serviceFilter === 'fitting'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                <Bike className="h-4 w-4" />
                Étude posturale
                {serviceFilter === 'fitting' && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {filteredBookings.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setServiceFilter('workshop')}
                className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  serviceFilter === 'workshop'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                <Wrench className="h-4 w-4" />
                Atelier mécanique
                {serviceFilter === 'workshop' && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {filteredBookings.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="px-8 py-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={view === 'day' ? previousDay : previousWeek}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={view === 'day' ? nextDay : nextWeek}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {view === 'day' 
                  ? format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })
                  : format(currentWeek, 'MMMM yyyy', { locale: fr })
                }
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setView('day')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Jour
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mois
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
            {/* Week Header */}
            {view === 'week' && (
              <div className="grid grid-cols-7 border-b border-gray-200">
                <div className="p-4 border-r border-gray-200">
                  <span className="text-sm font-medium text-gray-500">Heure</span>
                </div>
                {weekDays.map((day, index) => (
                  <div
                    key={index}
                    className={`p-4 text-center ${index < 5 ? 'border-r border-gray-200' : ''} ${
                      isSameDay(day, new Date()) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-500 mb-1">
                      {format(day, 'EEE', { locale: fr })}
                    </div>
                    <div className={`text-2xl font-bold ${
                      isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Time Slots - 10h à 19h */}
            <div className="flex-1 overflow-y-auto">
              {Array.from({ length: 10 }, (_, i) => i + 10).map((hour) => (
                <div key={hour} className={`grid ${view === 'day' ? 'grid-cols-2' : 'grid-cols-7'} border-b border-gray-100`}>
                  <div className="p-4 border-r border-gray-200 bg-gray-50">
                    <span className="text-sm font-medium text-gray-600">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                  {view === 'day' ? (
                    // Vue jour : une seule colonne
                    <div className="p-2 min-h-[80px] hover:bg-gray-50 transition-colors cursor-pointer relative">
                      {filteredBookings
                        .filter(booking => {
                          const bookingDate = parseISO(booking.start_datetime);
                          const bookingHour = bookingDate.getHours();
                          return isSameDay(bookingDate, selectedDate) && bookingHour === hour;
                        })
                        .map(booking => (
                          <div
                            key={booking.id}
                            onClick={() => handleBookingClick(booking)}
                            className={`rounded-lg p-3 cursor-pointer hover:shadow-md transition-all mb-2 border ${
                              booking.service_type === 'fitting' 
                                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                                : 'bg-green-50 border-green-200 hover:bg-green-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {booking.service_type === 'fitting' ? (
                                  <Bike className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <Wrench className="h-4 w-4 text-green-600" />
                                )}
                                <span className="text-sm font-bold text-gray-900">
                                  {format(parseISO(booking.start_datetime), 'HH:mm')}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                                {getStatusLabel(booking.status)}
                              </span>
                            </div>
                            <p className="text-base font-semibold text-gray-900 mb-1">
                              {booking.customer_name || `${booking.customer_firstname} ${booking.customer_lastname}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {booking.service_name}
                            </p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    // Vue semaine : 6 colonnes
                    weekDays.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`p-2 min-h-[80px] ${dayIndex < 5 ? 'border-r border-gray-100' : ''} hover:bg-gray-50 transition-colors cursor-pointer relative`}
                    >
                      {/* Booking cards would go here */}
                      {filteredBookings
                        .filter(booking => {
                          const bookingDate = parseISO(booking.start_datetime);
                          const bookingHour = bookingDate.getHours();
                          return isSameDay(bookingDate, day) && bookingHour === hour;
                        })
                        .map(booking => (
                          <div
                            key={booking.id}
                            onClick={() => handleBookingClick(booking)}
                            className={`absolute inset-2 rounded-lg p-2 cursor-pointer hover:shadow-lg transition-shadow ${
                              booking.service_type === 'fitting' 
                                ? 'bg-blue-100 border-l-4 border-blue-500 hover:bg-blue-200' 
                                : 'bg-green-100 border-l-4 border-green-500 hover:bg-green-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-1">
                                {booking.service_type === 'fitting' ? (
                                  <Bike className="h-3 w-3 text-blue-600" />
                                ) : (
                                  <Wrench className="h-3 w-3 text-green-600" />
                                )}
                                <span className="text-xs font-semibold text-gray-900">
                                  {format(parseISO(booking.start_datetime), 'HH:mm')}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs font-medium text-gray-900 mb-0.5 truncate">
                              {booking.customer_name || `${booking.customer_firstname} ${booking.customer_lastname}`}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {booking.service_name}
                            </p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {getStatusLabel(booking.status)}
                            </span>
                          </div>
                        ))}
                    </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      {/* Modal de création */}
      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadBookings(); // Recharger les réservations
          setShowCreateModal(false);
        }}
      />

      {/* Drawer de détails */}
      <BookingDrawer
        isOpen={showDrawer}
        booking={selectedBooking}
        onClose={() => {
          setShowDrawer(false);
          setSelectedBooking(null);
        }}
        onUpdate={() => {
          loadBookings(); // Recharger les réservations
        }}
      />
    </AdminLayout>
  );
}
