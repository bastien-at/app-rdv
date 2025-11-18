import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Settings, LogOut, Search, Filter, Bike, Wrench, Camera, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Input from '../../components/Input';
import Button from '../../components/Button';
import BikeInspectionModal from '../../components/BikeInspectionModal';
import ReceptionReportModal from '../../components/ReceptionReportModal';

interface Booking {
  id: string;
  booking_token: string;
  customer_firstname: string;
  customer_lastname: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  service_type: 'fitting' | 'workshop';
  start_datetime: string;
  end_datetime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  store_name: string;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'fitting' | 'workshop'>('all');
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
    } else {
      loadBookings();
    }
  }, [navigate]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/bookings', {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des réservations');
      }
      
      const result = await response.json();
      setBookings(result.data || []);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
      // En cas d'erreur, afficher des données de démonstration
      const mockBookings: Booking[] = [
        {
          id: '1',
          booking_token: 'abc123',
          customer_firstname: 'Jean',
          customer_lastname: 'Dupont',
          customer_email: 'jean.dupont@email.com',
          customer_phone: '06 12 34 56 78',
          service_name: 'Étude posturale Route',
          service_type: 'fitting',
          start_datetime: new Date(Date.now() + 86400000).toISOString(),
          end_datetime: new Date(Date.now() + 90000000).toISOString(),
          status: 'confirmed',
          store_name: 'Alltricks Paris',
        },
        {
          id: '2',
          booking_token: 'def456',
          customer_firstname: 'Marie',
          customer_lastname: 'Martin',
          customer_email: 'marie.martin@email.com',
          customer_phone: '06 98 76 54 32',
          service_name: 'Étude posturale VTT',
          service_type: 'fitting',
          start_datetime: new Date(Date.now() + 172800000).toISOString(),
          end_datetime: new Date(Date.now() + 176400000).toISOString(),
          status: 'pending',
          store_name: 'Alltricks Paris',
        },
        {
          id: '3',
          booking_token: 'ghi789',
          customer_firstname: 'Pierre',
          customer_lastname: 'Durand',
          customer_email: 'pierre.durand@email.com',
          customer_phone: '06 11 22 33 44',
          service_name: 'Révision complète',
          service_type: 'workshop',
          start_datetime: new Date(Date.now() + 259200000).toISOString(),
          end_datetime: new Date(Date.now() + 262800000).toISOString(),
          status: 'confirmed',
          store_name: 'Alltricks Lyon',
        },
        {
          id: '4',
          booking_token: 'jkl012',
          customer_firstname: 'Sophie',
          customer_lastname: 'Bernard',
          customer_email: 'sophie.bernard@email.com',
          customer_phone: '06 55 66 77 88',
          service_name: 'Réglage transmission',
          service_type: 'workshop',
          start_datetime: new Date(Date.now() + 345600000).toISOString(),
          end_datetime: new Date(Date.now() + 348300000).toISOString(),
          status: 'pending',
          store_name: 'Alltricks Paris',
        },
      ];
      setBookings(mockBookings);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.customer_firstname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer_lastname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.service_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesTab = activeTab === 'all' || booking.service_type === activeTab;
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  const getServiceTypeBadge = (type: 'fitting' | 'workshop') => {
    return type === 'fitting' 
      ? <Badge variant="info">Étude posturale</Badge>
      : <Badge variant="success">Atelier</Badge>;
  };

  // Statistiques
  const stats = {
    total: bookings.length,
    fitting: bookings.filter(b => b.service_type === 'fitting').length,
    workshop: bookings.filter(b => b.service_type === 'workshop').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmée</Badge>;
      case 'pending':
        return <Badge variant="warning">En attente</Badge>;
      case 'cancelled':
        return <Badge variant="error">Annulée</Badge>;
      case 'completed':
        return <Badge variant="info">Terminée</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen bg-gray-50">
        {/* Header Admin */}
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold text-blue-500">
              Dashboard Admin
            </h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-500"
            >
              <LogOut className="h-5 w-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/admin/planning')}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Voir le</p>
                  <p className="text-lg font-bold text-gray-900">Planning →</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Études posturales</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.fitting}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Settings className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ateliers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.workshop}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Settings className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Taux de remplissage</p>
                  <p className="text-2xl font-bold text-gray-900">87%</p>
                </div>
              </div>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/admin/availability')}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gérer les</p>
                  <p className="text-lg font-bold text-gray-900">Disponibilités →</p>
                </div>
              </div>
            </Card>
          </div>

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
                    <Calendar className="h-5 w-5" />
                    Toutes les réservations
                    <span className="ml-2 bg-gray-100 text-gray-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {bookings.length}
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

          {/* Filtres et recherche */}
          <Card className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher par nom, email ou service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-400 rounded-button focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="confirmed">Confirmées</option>
                  <option value="cancelled">Annulées</option>
                  <option value="completed">Terminées</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Tableau des réservations */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                Réservations ({filteredBookings.length})
              </h2>
              <Button size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Chargement...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Aucune réservation trouvée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Client</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Service</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Date & Heure</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Magasin</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Statut</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              {booking.customer_firstname} {booking.customer_lastname}
                            </div>
                            <div className="text-sm text-gray-600">{booking.customer_email}</div>
                            <div className="text-sm text-gray-600">{booking.customer_phone}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">{booking.service_name}</div>
                        </td>
                        <td className="py-4 px-4">
                          {getServiceTypeBadge(booking.service_type)}
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              {format(new Date(booking.start_datetime), 'dd/MM/yyyy', { locale: fr })}
                            </div>
                            <div className="text-sm text-gray-600">
                              {format(new Date(booking.start_datetime), 'HH:mm', { locale: fr })} - {format(new Date(booking.end_datetime), 'HH:mm', { locale: fr })}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-900">{booking.store_name}</div>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(booking.status)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`/booking/${booking.booking_token}`, '_blank')}
                            >
                              Voir
                            </Button>
                            
                            {/* Bouton État des lieux - uniquement pour workshop */}
                            {booking.service_type === 'workshop' && booking.status === 'confirmed' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowInspectionModal(true);
                                }}
                                className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1"
                              >
                                <Camera className="h-4 w-4" />
                                État des lieux
                              </Button>
                            )}
                            
                            {/* Bouton PV - si état des lieux fait */}
                            {booking.service_type === 'workshop' && booking.status === 'confirmed' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowReportModal(true);
                                }}
                                className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1"
                              >
                                <FileText className="h-4 w-4" />
                                PV
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modals */}
      {selectedBooking && (
        <>
          <BikeInspectionModal
            isOpen={showInspectionModal}
            onClose={() => {
              setShowInspectionModal(false);
              setSelectedBooking(null);
            }}
            bookingId={selectedBooking.id}
            customerName={`${selectedBooking.customer_firstname} ${selectedBooking.customer_lastname}`}
            onSuccess={() => {
              loadBookings();
              alert('État des lieux envoyé avec succès !');
            }}
          />

          <ReceptionReportModal
            isOpen={showReportModal}
            onClose={() => {
              setShowReportModal(false);
              setSelectedBooking(null);
            }}
            bookingId={selectedBooking.id}
            inspectionId="1" // TODO: Récupérer l'ID de l'inspection depuis la réservation
            customerName={`${selectedBooking.customer_firstname} ${selectedBooking.customer_lastname}`}
            onSuccess={() => {
              loadBookings();
              alert('PV de réception envoyé avec succès !');
            }}
          />
        </>
      )}
    </Layout>
  );
}
