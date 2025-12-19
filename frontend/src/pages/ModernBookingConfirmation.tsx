import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, MapPin, User, Mail, Phone, Users, Clock, Edit2, Bike, Wrench, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from '../components/Button';
import { getBookingByToken, cancelBooking } from '../services/api';
import { Booking } from '../types';

export default function ModernBookingConfirmation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
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
      await loadBooking();
      setShowCancelModal(false);
    } catch (error) {
      console.error('Erreur annulation:', error);
      alert('Erreur lors de l\'annulation de la réservation');
    } finally {
      setCancelling(false);
    }
  };

  const getHeroImage = () => {
    // Déterminer le type de service depuis le nom ou autre propriété
    const isFitting = booking?.service_name?.toLowerCase().includes('posturale') || 
                      booking?.service_name?.toLowerCase().includes('fitting');
    
    if (isFitting) {
      return 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80';
  };

  const getServiceIcon = () => {
    const isFitting = booking?.service_name?.toLowerCase().includes('posturale') || 
                      booking?.service_name?.toLowerCase().includes('fitting');
    return isFitting ? Bike : Wrench;
  };

  const addToGoogleCalendar = () => {
    if (!booking) return;
    
    const startDate = new Date(booking.start_datetime);
    const endDate = new Date(booking.end_datetime);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.service_name || 'Réservation')}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(`Réservation chez ${booking.store_name}`)}&location=${encodeURIComponent(booking.store_name || '')}`;
    
    window.open(url, '_blank');
  };

  const addToAppleCalendar = () => {
    // Génération d'un fichier .ics pour Apple Calendar
    if (!booking) return;
    
    const startDate = new Date(booking.start_datetime);
    const endDate = new Date(booking.end_datetime);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${booking.service_name}
DESCRIPTION:Réservation chez ${booking.store_name}
LOCATION:${booking.store_name}
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reservation.ics';
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Réservation non trouvée</p>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  const ServiceIcon = getServiceIcon();
  const isCancelled = booking.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Colonne gauche - Image hero */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl h-[600px]">
              <img
                src={getHeroImage()}
                alt="Service"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <ServiceIcon className="h-8 w-8" />
                </div>
                <p className="text-sm text-white/80 mb-2">{booking.store_name}</p>
          
                <p className="text-lg text-white/90">
                  Nous avons hâte de vous accueillir
                </p>
              </div>
            </div>
          </div>

          {/* Colonne droite - Détails de la réservation */}
          <div>
            {/* Statut */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
              {isCancelled ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Réservation annulée
                  </h2>
                  <p className="text-gray-600">
                    Cette réservation a été annulée
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Votre réservation est en attente de validation
                  </h2>
                  <p className="text-gray-600 mb-1">
                    Nous vous enverrons un email de confirmation à
                  </p>
                  <p className="text-blue-600 font-medium">
                    {booking.customer_email}
                  </p>
                </div>
              )}
            </div>

            {/* Détails de la réservation */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {booking.service_name}
                </h3>
                {!isCancelled && (
                  <button
                    onClick={() => navigate(`/stores/${booking.store_id}/booking?edit=${token}`)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <Edit2 className="h-4 w-4" />
                    Modifier
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Date et heure */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(booking.start_datetime), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {format(new Date(booking.start_datetime), "HH:mm", { locale: fr })}
                      {booking.service_duration && ` (${booking.service_duration} min)`}
                    </p>
                  </div>
                </div>

                {/* Lieu */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{booking.store_name}</p>
                    {booking.store_address && (
                      <p className="text-gray-600 text-sm">
                        {booking.store_address}<br />
                        {booking.store_postal_code} {booking.store_city}
                      </p>
                    )}
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.store_name || '')}`, '_blank')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1"
                    >
                      Voir sur Google Maps
                    </button>
                  </div>
                </div>

                {/* Client */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {booking.customer_firstname} {booking.customer_lastname}
                    </p>
                    <p className="text-gray-600 text-sm flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4" />
                      {booking.customer_email}
                    </p>
                    <p className="text-gray-600 text-sm flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4" />
                      {booking.customer_phone}
                    </p>
                  </div>
                </div>

                {/* Technicien */}
                {booking.technician_name && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Technicien</p>
                      <p className="text-gray-600 text-sm">{booking.technician_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ajouter au calendrier */}
            {!isCancelled && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Ajouter à votre calendrier</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={addToGoogleCalendar}
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google Calendar
                  </button>
                  <button
                    onClick={addToAppleCalendar}
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Apple Calendar
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => navigate('/')}
              >
                Retour à l'accueil
              </Button>
              {!isCancelled ? (
                <Button
                  fullWidth
                  onClick={() => navigate('/stores')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Nouvelle réservation
                </Button>
              ) : (
                <Button
                  fullWidth
                  onClick={() => navigate('/stores')}
                >
                  Réserver à nouveau
                </Button>
              )}
            </div>

            {/* Annulation */}
            {!isCancelled && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Annuler cette réservation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'annulation */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Annuler la réservation
            </h3>
            <p className="text-gray-600 mb-4">
              Êtes-vous sûr de vouloir annuler cette réservation ?
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Raison de l'annulation (optionnel)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
              >
                Retour
              </Button>
              <Button
                fullWidth
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="bg-red-600 hover:bg-red-700"
              >
                {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
