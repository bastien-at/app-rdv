import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, User, Mail, Phone, FileText, Camera, CheckCircle, XCircle, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from './Button';
import { Booking, Service } from '../types';
import { adminConfirmBooking, AdminConfirmBookingPayload, getStoreServices } from '../services/api';

interface BookingDrawerProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function BookingDrawer({ isOpen, booking, onClose, onUpdate }: BookingDrawerProps) {
  const [showReceptionReport, setShowReceptionReport] = useState(false);
  const [showInspectionReport, setShowInspectionReport] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [editableServiceId, setEditableServiceId] = useState<string | undefined>(undefined);
  const [editableDate, setEditableDate] = useState<string>('');
  const [editableTime, setEditableTime] = useState<string>('');

  useEffect(() => {
    if (!booking) return;

    // Initialiser les champs éditables depuis la réservation
    setEditableServiceId(booking.service_id);
    const start = parseISO(booking.start_datetime);
    setEditableDate(start.toISOString().slice(0, 10));
    setEditableTime(format(start, 'HH:mm'));

    // Charger les services du magasin uniquement pour les réservations en attente
    if (booking.status === 'pending' && booking.store_id) {
      setServicesLoading(true);
      getStoreServices(booking.store_id)
        .then((data) => {
          setServices(data);
        })
        .catch((error) => {
          console.error('Erreur chargement services magasin pour édition réservation:', error);
        })
        .finally(() => {
          setServicesLoading(false);
        });
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleConfirm = async () => {
    if (!booking) return;
    if (!editableDate || !editableTime) {
      alert('Merci de renseigner une date et une heure valides');
      return;
    }

    let newStart: Date;
    try {
      newStart = new Date(`${editableDate}T${editableTime}:00`);
      if (isNaN(newStart.getTime())) {
        throw new Error('Invalid date');
      }
    } catch {
      alert('Format de date/heure invalide');
      return;
    }

    const payload: AdminConfirmBookingPayload = {};

    if (editableServiceId && editableServiceId !== booking.service_id) {
      payload.service_id = editableServiceId;
    }

    // Toujours envoyer la nouvelle date/heure choisie
    payload.start_datetime = newStart.toISOString();

    setConfirmLoading(true);
    try {
      await adminConfirmBooking(booking.id, payload);
      if (onUpdate) {
        onUpdate();
      }
      onClose();
    } catch (error) {
      console.error('Erreur lors de la confirmation de la réservation:', error);
      alert('Erreur lors de la confirmation de la réservation');
    } finally {
      setConfirmLoading(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Détails de la réservation</h2>
            <p className="text-sm text-gray-500 mt-1">#{booking.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Statut */}
          <div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-semibold ${getStatusColor(booking.status)}`}>
              {getStatusIcon(booking.status)}
              {getStatusLabel(booking.status)}
            </div>
          </div>

          {/* Informations principales */}
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Informations de réservation</h3>
            
            {/* Date et heure */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date et heure</p>
                <p className="font-semibold text-gray-900">
                  {format(parseISO(booking.start_datetime), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                <p className="text-sm text-gray-600">
                  {format(parseISO(booking.start_datetime), "HH:mm")} - {format(parseISO(booking.end_datetime), "HH:mm")}
                  {booking.service_duration && ` (${booking.service_duration} min)`}
                </p>
              </div>
            </div>

            {/* Service */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Service</p>
                <p className="font-semibold text-gray-900">{booking.service_name}</p>
                {booking.service_price && (
                  <p className="text-sm text-gray-600">{booking.service_price}€</p>
                )}
              </div>
            </div>

            {/* Zone d'édition pour validation magasin (service / date / heure) */}
            {booking.status === 'pending' && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-300 space-y-3">
                <p className="text-sm font-semibold text-gray-800">
                  Validation magasin
                </p>
                <p className="text-xs text-gray-500">
                  Ajustez le service et le créneau avant de valider la réservation.
                </p>

                {/* Service */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Service</label>
                  <select
                    value={editableServiceId || ''}
                    onChange={(e) => setEditableServiceId(e.target.value || undefined)}
                    disabled={servicesLoading}
                    className="h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      {servicesLoading ? 'Chargement des services...' : 'Service inchangé'}
                    </option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} ({service.duration_minutes} min)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & heure */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Date</label>
                    <input
                      type="date"
                      value={editableDate}
                      onChange={(e) => setEditableDate(e.target.value)}
                      className="h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Heure</label>
                    <input
                      type="time"
                      value={editableTime}
                      onChange={(e) => setEditableTime(e.target.value)}
                      className="h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Magasin */}
            {booking.store_name && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Magasin</p>
                  <p className="font-semibold text-gray-900">{booking.store_name}</p>
                  {booking.store_address && (
                    <p className="text-sm text-gray-600">
                      {booking.store_address}<br />
                      {booking.store_postal_code} {booking.store_city}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Technicien */}
            {booking.technician_name && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Technicien assigné</p>
                  <p className="font-semibold text-gray-900">{booking.technician_name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Informations client */}
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Informations client</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Nom complet</p>
                  <p className="font-medium text-gray-900">
                    {booking.customer_firstname} {booking.customer_lastname}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <a href={`mailto:${booking.customer_email}`} className="font-medium text-blue-600 hover:text-blue-700">
                    {booking.customer_email}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Téléphone</p>
                  <a href={`tel:${booking.customer_phone}`} className="font-medium text-blue-600 hover:text-blue-700">
                    {booking.customer_phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Données client supplémentaires */}
            {booking.customer_data && Object.keys(booking.customer_data).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Informations complémentaires</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {booking.customer_data.height && (
                    <div>
                      <span className="text-gray-500">Taille:</span>
                      <span className="ml-2 font-medium text-gray-900">{booking.customer_data.height} cm</span>
                    </div>
                  )}
                  {booking.customer_data.weight && (
                    <div>
                      <span className="text-gray-500">Poids:</span>
                      <span className="ml-2 font-medium text-gray-900">{booking.customer_data.weight} kg</span>
                    </div>
                  )}
                  {booking.customer_data.shoe_size && (
                    <div>
                      <span className="text-gray-500">Pointure:</span>
                      <span className="ml-2 font-medium text-gray-900">{booking.customer_data.shoe_size}</span>
                    </div>
                  )}
                  {booking.customer_data.practice_frequency && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Fréquence:</span>
                      <span className="ml-2 font-medium text-gray-900">{booking.customer_data.practice_frequency}</span>
                    </div>
                  )}
                  {booking.customer_data.pain_description && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Douleurs:</span>
                      <p className="mt-1 text-gray-900">{booking.customer_data.pain_description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Actions</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                onClick={() => setShowReceptionReport(true)}
              >
                <Camera className="h-4 w-4 mr-2" />
                État des lieux
              </Button>

              <Button
                variant="ghost"
                className="border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 hover:text-green-600"
                onClick={() => setShowInspectionReport(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                PV d'intervention
              </Button>
            </div>

            {booking.status === 'confirmed' && (
              <Button
                fullWidth
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Modifier la réservation
              </Button>
            )}

            {booking.status !== 'cancelled' && booking.status !== 'completed' && (
              <Button
                fullWidth
                variant="ghost"
                className="border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-500"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Annuler la réservation
              </Button>
            )}
          </div>

          {/* Informations système */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Créé le {format(parseISO(booking.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
            </p>
            {booking.booking_token && (
              <p className="text-xs text-gray-500 mt-1">
                Token: {booking.booking_token}
              </p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Statut actuel : {getStatusLabel(booking.status)}
          </div>
          <div className="flex items-center gap-3">
            {booking.status === 'pending' && (
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={confirmLoading}
              >
                {confirmLoading ? 'Validation...' : 'Valider la réservation'}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </div>

      {/* Modals pour état des lieux et PV (à implémenter) */}
      {showReceptionReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">État des lieux</h3>
              <button onClick={() => setShowReceptionReport(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">Fonctionnalité d'état des lieux à venir...</p>
            <Button onClick={() => setShowReceptionReport(false)}>Fermer</Button>
          </div>
        </div>
      )}

      {showInspectionReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">PV d'intervention</h3>
              <button onClick={() => setShowInspectionReport(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">Fonctionnalité de PV d'intervention à venir...</p>
            <Button onClick={() => setShowInspectionReport(false)}>Fermer</Button>
          </div>
        </div>
      )}
    </>
  );
}
