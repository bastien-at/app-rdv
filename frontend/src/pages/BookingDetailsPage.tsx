import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, MapPin, User, Mail, Phone, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { getBookingByToken, cancelBooking } from '../services/api';
import { Booking } from '../types';

export default function BookingDetailsPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (token) {
      loadBooking();
    }
  }, [token]);

  const loadBooking = async () => {
    try {
      const data = await getBookingByToken(token!);
      setBooking(data);
    } catch (error) {
      console.error('Erreur chargement réservation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    setCancelling(true);
    try {
      await cancelBooking(token!, cancelReason);
      await loadBooking(); // Recharger pour voir le statut mis à jour
      setShowCancelModal(false);
    } catch (error) {
      console.error('Erreur annulation:', error);
      alert('Erreur lors de l\'annulation de la réservation');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Chargement...</p>
        </div>
      </Layout>
    );
  }

  if (!booking) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Réservation introuvable</h1>
          <p className="text-gray-600 mb-6">Le lien de réservation est invalide ou a expiré.</p>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </div>
      </Layout>
    );
  }

  const isCancelled = booking.status === 'cancelled';
  const isPast = new Date(booking.start_datetime) < new Date();

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen">
        {/* Hero Section */}
        <div className={`py-12 md:py-16 ${isCancelled ? 'bg-red-500' : 'bg-green-500'}`}>
          <div className="container mx-auto px-4 text-center text-white">
            {isCancelled ? (
              <>
                <XCircle className="h-16 w-16 mx-auto mb-4" />
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Réservation annulée</h1>
                <p className="text-lg">Cette réservation a été annulée</p>
              </>
            ) : (
              <>
                <CheckCircle className="h-16 w-16 mx-auto mb-4" />
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Réservation confirmée !</h1>
                <p className="text-lg">Votre étude posturale est réservée</p>
              </>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Informations principales */}
            <Card>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {booking.service_name}
                  </h2>
                  <Badge variant={isCancelled ? 'error' : 'success'}>
                    {isCancelled ? 'Annulée' : 'Confirmée'}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-500">{booking.service_price}€</div>
                  <div className="text-sm text-gray-600">{booking.service_duration} min</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {format(new Date(booking.start_datetime), "EEEE d MMMM yyyy", { locale: fr })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(booking.start_datetime), "HH:mm", { locale: fr })} - {format(new Date(booking.end_datetime), "HH:mm", { locale: fr })}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">{booking.store_name}</div>
                    <div className="text-sm text-gray-600">
                      {booking.store_address}<br />
                      {booking.store_postal_code} {booking.store_city}
                    </div>
                  </div>
                </div>

                {booking.technician_name && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Technicien</div>
                      <div className="text-sm text-gray-600">{booking.technician_name}</div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Informations client */}
            <Card>
              <h3 className="text-lg font-semibold mb-4">Vos informations</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <span>{booking.customer_firstname} {booking.customer_lastname}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span>{booking.customer_email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span>{booking.customer_phone}</span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            {!isCancelled && !isPast && (
              <Card className="bg-red-50 border-red-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Annuler la réservation</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Vous pouvez annuler gratuitement jusqu'à 48h avant le rendez-vous.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setShowCancelModal(true)}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  Annuler ma réservation
                </Button>
              </Card>
            )}

            <div className="text-center">
              <Button variant="ghost" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </div>
          </div>
        </div>

        {/* Modal d'annulation */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Confirmer l'annulation</h3>
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir annuler cette réservation ?
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison de l'annulation (optionnel)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Empêchement de dernière minute..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-400 rounded-button focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelModal(false)}
                  fullWidth
                  disabled={cancelling}
                >
                  Retour
                </Button>
                <Button
                  onClick={handleCancelBooking}
                  fullWidth
                  loading={cancelling}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  Confirmer l'annulation
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
