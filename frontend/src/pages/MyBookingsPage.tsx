import { useState } from 'react';
import { Search, Calendar, Clock, MapPin, Wrench, Bike, Mail, Phone, User } from 'lucide-react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';

interface Booking {
  id: number;
  booking_date: string;
  start_time: string;
  status: string;
  service_name: string;
  service_type: 'fitting' | 'workshop';
  service_duration: number;
  service_price: number;
  store_name: string;
  store_address: string;
  store_city: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  technician_name?: string;
}

export default function MyBookingsPage() {
  const [searchEmail, setSearchEmail] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const response = await fetch(`/api/bookings/search?email=${encodeURIComponent(searchEmail)}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }

      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError('Impossible de récupérer vos réservations. Vérifiez votre email.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'success' | 'warning' | 'error' | 'info', label: string }> = {
      confirmed: { variant: 'success', label: 'Confirmé' },
      pending: { variant: 'warning', label: 'En attente' },
      cancelled: { variant: 'error', label: 'Annulé' },
      completed: { variant: 'info', label: 'Terminé' },
    };

    const config = statusConfig[status] || { variant: 'info' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getServiceIcon = (serviceType: string) => {
    return serviceType === 'fitting' ? (
      <Bike className="w-5 h-5 text-blue-500" />
    ) : (
      <Wrench className="w-5 h-5 text-green-500" />
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent-300 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 animate-slide-up">
                Mes réservations
              </h1>
              <p className="text-xl text-blue-50 animate-slide-up" style={{animationDelay: '0.1s'}}>
                Retrouvez tous vos rendez-vous d'étude posturale et d'atelier
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Search Section */}
          <div className="max-w-2xl mx-auto mb-12">
            <Card className="animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Rechercher mes réservations
                </h2>
                <p className="text-gray-600">
                  Entrez l'adresse email utilisée lors de votre réservation
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Recherche...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Rechercher
                    </span>
                  )}
                </Button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </Card>
          </div>

          {/* Results */}
          {searched && (
            <div className="max-w-5xl mx-auto">
              {bookings.length === 0 ? (
                <Card className="text-center py-12 animate-fade-in">
                  <div className="text-gray-400 mb-4">
                    <Calendar className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Aucune réservation trouvée
                  </h3>
                  <p className="text-gray-600">
                    Aucune réservation n'a été trouvée avec cette adresse email.
                  </p>
                </Card>
              ) : (
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {bookings.length} réservation{bookings.length > 1 ? 's' : ''} trouvée{bookings.length > 1 ? 's' : ''}
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {bookings.map((booking, index) => (
                      <Card 
                        key={booking.id} 
                        className="hover:shadow-lg transition-shadow animate-slide-up"
                        style={{animationDelay: `${index * 0.1}s`}}
                      >
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Left: Service Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                  booking.service_type === 'fitting' 
                                    ? 'bg-blue-100' 
                                    : 'bg-green-100'
                                }`}>
                                  {getServiceIcon(booking.service_type)}
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900">
                                    {booking.service_name}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    {booking.service_type === 'fitting' ? 'Étude posturale' : 'Atelier mécanique'}
                                  </p>
                                </div>
                              </div>
                              {getStatusBadge(booking.status)}
                            </div>

                            {/* Date & Time */}
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <Calendar className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">Date</div>
                                  <div className="font-medium text-gray-900">
                                    {formatDate(booking.booking_date)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <Clock className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">Horaire</div>
                                  <div className="font-medium text-gray-900">
                                    {formatTime(booking.start_time)} ({booking.service_duration} min)
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Location */}
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <MapPin className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-medium text-gray-900">{booking.store_name}</div>
                                <div className="text-sm text-gray-600">
                                  {booking.store_address}, {booking.store_city}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right: Customer & Price */}
                          <div className="md:w-64 border-t md:border-t-0 md:border-l border-gray-200 pt-6 md:pt-0 md:pl-6">
                            <div className="space-y-4">
                              {/* Customer Info */}
                              <div>
                                <div className="text-xs text-gray-500 mb-2">Informations client</div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-900">
                                      {booking.customer_first_name} {booking.customer_last_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600 truncate">
                                      {booking.customer_email}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">
                                      {booking.customer_phone}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Technician */}
                              {booking.technician_name && (
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Technicien</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {booking.technician_name}
                                  </div>
                                </div>
                              )}

                              {/* Price */}
                              <div className="pt-4 border-t border-gray-200">
                                <div className="text-xs text-gray-500 mb-1">Tarif</div>
                                <div className="text-2xl font-bold text-gray-900">
                                  {booking.service_price}€
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
