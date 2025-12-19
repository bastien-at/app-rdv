import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, User, Mail, Phone, FileText, Camera, CheckCircle, XCircle, Edit2, Download } from 'lucide-react';
import { format, parseISO, isValid, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Button from './Button';
import { Booking, Service, Store } from '../types';
import { 
  adminConfirmBooking, 
  AdminConfirmBookingPayload, 
  getStoreServices, 
  getStoreById,
  createOrUpdateInspectionApi, 
  uploadInspectionPhotosApi, 
  sendInspectionApi,
  getInspectionByBookingApi,
  createOrUpdateReceptionReportApi,
  sendReceptionReportApi,
  getAdminToken,
  type ReceptionReportPayload,
} from '../services/api';

interface BookingDrawerProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function BookingDrawer({ isOpen, booking, onClose, onUpdate }: BookingDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showReceptionReport, setShowReceptionReport] = useState(false);
  const [showInspectionReport, setShowInspectionReport] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [editableServiceId, setEditableServiceId] = useState<string | undefined>(undefined);
  const [editableDate, setEditableDate] = useState<string>('');
  const [editableTime, setEditableTime] = useState<string>('');
  const [editableDuration, setEditableDuration] = useState<number>(0);
  const [receptionNotes, setReceptionNotes] = useState<string>('');
  const [receptionPhotos, setReceptionPhotos] = useState<File[]>([]);
  const [receptionSaving, setReceptionSaving] = useState(false);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionComments, setInspectionComments] = useState<string>('');
  const [inspectionPhotos, setInspectionPhotos] = useState<{ id: string; photo_url: string }[]>([]);
  const [reportNotes, setReportNotes] = useState<string>('');
  const [reportPhotos, setReportPhotos] = useState<File[]>([]);
  const [reportSaving, setReportSaving] = useState(false);
  const [store, setStore] = useState<Store | null>(null);

  const getInspectionPhotoUrl = (photoUrl: string) => {
    if (!photoUrl) return '';
    // Si l'URL est déjà absolue, on la renvoie telle quelle
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }

    const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';
    const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

    const normalizedPath = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;
    return `${backendOrigin}${normalizedPath}`;
  };

  useEffect(() => {
    if (booking?.store_id) {
      getStoreById(booking.store_id)
        .then(setStore)
        .catch(err => console.error('Error loading store:', err));
    }
  }, [booking?.store_id]);

  useEffect(() => {
    if (!booking) return;
    console.log('BookingDrawer open for:', booking);

    // Initialiser les champs éditables depuis la réservation
    setEditableServiceId(booking.service_id);
    
    if (booking.start_datetime) {
      try {
        const start = parseISO(booking.start_datetime);
        const end = parseISO(booking.end_datetime);
        if (isValid(start)) {
          setEditableDate(start.toISOString().slice(0, 10));
          setEditableTime(format(start, 'HH:mm'));
          
          if (isValid(end)) {
            const duration = differenceInMinutes(end, start);
            setEditableDuration(duration > 0 ? duration : (booking.service_duration || 30));
          } else {
            setEditableDuration(booking.service_duration || 30);
          }
        } else {
          console.error('Date de réservation invalide:', booking.start_datetime);
        }
      } catch (e) {
        console.error('Erreur parsing date:', e);
      }
    }

    // Réinitialiser les états
    setReceptionNotes('');
    setReceptionPhotos([]);
    setInspectionComments('');
    setInspectionPhotos([]);
    setReportNotes('');
    setReportPhotos([]);
    
    // Réinitialiser le mode édition au changement de réservation
    setIsEditing(false);
  }, [booking]);

  useEffect(() => {
    if (!booking || !booking.store_id) return;

    // Charger les services si nécessaire (pour pending ou mode édition)
    if ((booking.status === 'pending' || isEditing) && services.length === 0) {
      setServicesLoading(true);
      getStoreServices(booking.store_id)
        .then((data) => {
          setServices(data);
        })
        .catch((error) => {
          console.error('Erreur chargement services magasin:', error);
        })
        .finally(() => {
          setServicesLoading(false);
        });
    }
  }, [booking, isEditing, services.length]);

  if (!isOpen || !booking) return null;

  const hasReceptionReport = !!booking.customer_data?.reception_report;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const openInspectionReportModal = async () => {
    if (!booking) return;
    setInspectionLoading(true);
    setShowInspectionReport(true);
    try {
      const inspection = await getInspectionByBookingApi(booking.id);
      if (inspection) {
        setInspectionComments(inspection.comments || '');
        if (inspection.photos && Array.isArray(inspection.photos)) {
          setInspectionPhotos(
            inspection.photos.map((p: any) => ({ id: String(p.id), photo_url: p.photo_url }))
          );
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'inspection:", error);
    } finally {
      setInspectionLoading(false);
    }
  };

  const handleSaveReceptionReportAndSend = async () => {
    if (!booking) return;

    setReportSaving(true);
    try {
      console.log('Sending reception report...');
      // On réutilise l'inspection existante ou on en crée une si besoin pour associer d'éventuelles nouvelles photos
      let inspection = await getInspectionByBookingApi(booking.id);
      if (!inspection) {
        inspection = await createOrUpdateInspectionApi(booking.id, inspectionComments || '');
      }

      if (inspection && inspection.id && reportPhotos.length > 0) {
        await uploadInspectionPhotosApi(inspection.id, reportPhotos);
      }

      const report = await createOrUpdateReceptionReportApi(booking.id, {
        inspectionId: inspection?.id,
        workPerformed: reportNotes || undefined,
      });

      if (report && report.id) {
        await sendReceptionReportApi(report.id);
      }

      setShowInspectionReport(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du PV d'intervention:", error);
      alert("Erreur lors de l'enregistrement / l'envoi du PV d'intervention");
    } finally {
      setReportSaving(false);
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

  const handleSaveReceptionReport = async () => {
    if (!booking) return;

    setReceptionSaving(true);
    try {
      let inspectionId: string | undefined;
      
      // If there are photos, create/update an inspection first
      if (receptionPhotos.length > 0) {
        console.log('📸 Creating inspection for photos...');
        const inspection = await createOrUpdateInspectionApi(booking.id, receptionNotes || '');
        inspectionId = inspection?.id;
        
        if (inspectionId) {
          console.log('📸 Uploading photos to inspection:', inspectionId);
          await uploadInspectionPhotosApi(inspectionId, receptionPhotos);
        }
      }
      
      // Create reception report payload
      const payload: ReceptionReportPayload = {
        inspectionId,
        workPerformed: receptionNotes || '',
        // Add other fields as needed
      };
      
      console.log('📝 Creating reception report for booking:', booking.id);
      const report = await createOrUpdateReceptionReportApi(booking.id, payload);
      console.log('📝 Reception report created:', report);
      
      if (report && report.id) {
        console.log('📧 Sending reception report:', report.id);
        await sendReceptionReportApi(report.id);
        console.log('✅ Reception report sent successfully');
      }
      
      setShowReceptionReport(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error("❌ Erreur lors de l'enregistrement de l'état des lieux:", error);
      if (error.response) {
        console.error('Data:', error.response.data);
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
      }
      alert("Erreur lors de l'enregistrement de l'état des lieux: " + (error.message || 'Unknown error'));
    } finally {
      setReceptionSaving(false);
    }
  };

  const handleSaveBooking = async () => {
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
    
    // Envoyer la durée personnalisée
    if (editableDuration > 0) {
      payload.duration = editableDuration;
    }

    setConfirmLoading(true);
    try {
      await adminConfirmBooking(booking.id, payload);
      if (onUpdate) {
        onUpdate();
      }
      // Si on était en mode édition, on en sort
      setIsEditing(false);
      // Si c'était une validation (pending), on ferme le drawer ? 
      // Le comportement original était de fermer. On peut garder ça pour 'pending'.
      if (booking.status === 'pending') {
        onClose();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la réservation:', error);
      alert('Erreur lors de la mise à jour de la réservation');
    } finally {
      setConfirmLoading(false);
    }
  };

  // ... (rest of functions) ...

  const generateSupportSheet = () => {
    if (!booking) return;

    const doc = new jsPDF();
    
    // En-tête
    doc.setFontSize(20);
    doc.text("Fiche d'intervention", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Réf: ${booking.booking_token || booking.id.slice(0, 8)}`, 105, 28, { align: "center" });
    
    // Infos Magasin (Gauche)
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("MAGASIN", 20, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const storeName = store?.name || booking.store_name || "Non spécifié";
    doc.text(storeName, 20, 52);
    
    const storeAddress = store?.address || booking.store_address;
    const storeCity = store ? `${store.postal_code} ${store.city}` : `${booking.store_postal_code || ''} ${booking.store_city || ''}`;
    
    if (storeAddress) {
        doc.text(storeAddress, 20, 57);
        doc.text(storeCity, 20, 62);
    }
    
    if (store?.phone) {
        doc.text(store.phone, 20, 67);
    }
    if (store?.email) {
        doc.text(store.email, 20, 72);
    }
    
    // Infos Client (Droite)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT", 120, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${booking.customer_firstname} ${booking.customer_lastname}`, 120, 52);
    doc.text(booking.customer_email || "", 120, 57);
    doc.text(booking.customer_phone || "", 120, 62);

    // Ligne de séparation
    doc.setDrawColor(200);
    doc.line(20, 70, 190, 70);
    
    // Détails RDV
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DÉTAILS DU RENDEZ-VOUS", 20, 85);
    
    const tableData = [
        ["Date", format(parseISO(booking.start_datetime), "dd/MM/yyyy", { locale: fr })],
        ["Horaire", `${format(parseISO(booking.start_datetime), "HH:mm")} - ${format(parseISO(booking.end_datetime), "HH:mm")}`],
        ["Service", booking.service_name || "Non spécifié"],
        ["Prix estimé", booking.service_price ? `${booking.service_price}€` : "Non spécifié"],
    ];

    autoTable(doc, {
        startY: 90,
        head: [['Intitulé', 'Informations']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });
    
    // Zone de notes
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("NOTES / OBSERVATIONS", 20, finalY);
    
    doc.setDrawColor(150);
    doc.rect(20, finalY + 5, 170, 40);
    
    // Signatures
    const signatureY = finalY + 60;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Signature du client :", 20, signatureY);
    doc.text("Signature du magasin :", 120, signatureY);
    
    doc.line(20, signatureY + 5, 80, signatureY + 5); // Ligne signature client
    doc.line(120, signatureY + 5, 180, signatureY + 5); // Ligne signature magasin
    
    // Save
    doc.save(`prise_en_charge_${format(parseISO(booking.start_datetime), "yyyyMMdd")}_${booking.customer_lastname}.pdf`);
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Informations de réservation</h3>
              {isEditing && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Mode édition
                </span>
              )}
            </div>
            
            {/* Date et heure */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Date et heure</p>
                {isEditing ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Date</label>
                      <input
                        type="date"
                        value={editableDate}
                        onChange={(e) => setEditableDate(e.target.value)}
                        className="h-9 px-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Heure</label>
                      <input
                        type="time"
                        value={editableTime}
                        onChange={(e) => setEditableTime(e.target.value)}
                        className="h-9 px-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Durée (min)</label>
                      <input
                        type="number"
                        value={editableDuration}
                        onChange={(e) => setEditableDuration(parseInt(e.target.value) || 0)}
                        className="h-9 px-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900">
                      {format(parseISO(booking.start_datetime), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      {format(parseISO(booking.start_datetime), "HH:mm")} - {format(parseISO(booking.end_datetime), "HH:mm")}
                      <span>
                        ({differenceInMinutes(parseISO(booking.end_datetime), parseISO(booking.start_datetime))} min)
                      </span>
                      {booking.service_duration && 
                       differenceInMinutes(parseISO(booking.end_datetime), parseISO(booking.start_datetime)) !== booking.service_duration && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 font-medium">
                          Durée modifiée
                        </span>
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Service */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Service</p>
                {isEditing ? (
                  <select
                    value={editableServiceId || ''}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setEditableServiceId(newId || undefined);
                      const service = services.find(s => s.id === newId);
                      if (service) {
                        setEditableDuration(service.duration_minutes);
                      }
                    }}
                    disabled={servicesLoading}
                    className="h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  >
                    <option value="">
                      {servicesLoading ? 'Chargement...' : 'Sélectionner un service'}
                    </option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} ({service.duration_minutes} min) - {service.price}€
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900">{booking.service_name}</p>
                    {booking.service_price && (
                      <p className="text-sm text-gray-600">{booking.service_price}€</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Zone d'édition pour validation magasin (service / date / heure) - SEULEMENT SI PENDING */}
            {booking.status === 'pending' && !isEditing && (
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

            {/* Client */}
            <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Client</h3>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-gray-500">Nom</p>
                  <p className="font-semibold text-gray-900">
                    {booking.customer_firstname} {booking.customer_lastname}
                  </p>
                  {booking.customer_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{booking.customer_email}</span>
                    </div>
                  )}
                  {booking.customer_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{booking.customer_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Actions</h3>
            
            {!isEditing && (
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  fullWidth
                  className="border-2 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600"
                  onClick={generateSupportSheet}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Fiche de prise en charge (PDF)
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="ghost"
                    className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                    onClick={() => {
                      if (hasReceptionReport) {
                        setReceptionNotes(booking.customer_data?.reception_report?.workPerformed || '');
                      }
                      setShowReceptionReport(true);
                    }}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    État des lieux
                  </Button>

                  <Button
                    variant="ghost"
                    className="border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 hover:text-green-600"
                    onClick={openInspectionReportModal}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    PV d'intervention
                  </Button>
                </div>
              </div>
            )}

            {booking.status === 'confirmed' && !isEditing && (
              <div className="flex flex-col gap-2">
                {hasReceptionReport && (
                  <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                    L'état des lieux a été réalisé, la réservation ne peut plus être modifiée ou annulée.
                  </p>
                )}
                <Button
                  fullWidth
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setIsEditing(true)}
                  disabled={hasReceptionReport}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifier la réservation
                </Button>
              </div>
            )}

            {isEditing && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset values
                    setEditableServiceId(booking.service_id);
                    const start = parseISO(booking.start_datetime);
                    setEditableDate(start.toISOString().slice(0, 10));
                    setEditableTime(format(start, 'HH:mm'));
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSaveBooking}
                  disabled={confirmLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {confirmLoading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            )}

            {!isEditing && booking.status !== 'cancelled' && booking.status !== 'completed' && (
              <Button
                fullWidth
                variant="ghost"
                className="border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (window.confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
                    // TODO: API call
                    console.log('Annulation de la réservation:', booking.id);
                  }
                }}
                disabled={hasReceptionReport}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Annuler la réservation
              </Button>
            )}
          </div>

          {/* ... (rest unchanged) ... */}
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
                onClick={handleSaveBooking}
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
      {/* Modals pour état des lieux et PV */}
      {showReceptionReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {hasReceptionReport ? 'État des lieux (Lecture seule)' : 'État des lieux'}
              </h3>
              <button onClick={() => setShowReceptionReport(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarques / anomalies constatées</label>
                <textarea
                  value={receptionNotes}
                  onChange={(e) => setReceptionNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="Ex: rayures sur le cadre, jeu dans la direction, pneus usés..."
                  readOnly={hasReceptionReport}
                  disabled={hasReceptionReport}
                />
              </div>

              {!hasReceptionReport && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photos (1 à 5 images, optionnel)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setReceptionPhotos(files.slice(0, 5));
                    }}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {receptionPhotos.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {receptionPhotos.length} photo(s) sélectionnée(s)
                    </p>
                  )}
                </div>
              )}

              {hasReceptionReport && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Cet état des lieux a déjà été enregistré et envoyé.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowReceptionReport(false)}
                  fullWidth
                >
                  Fermer
                </Button>
                {!hasReceptionReport && (
                  <Button
                    onClick={handleSaveReceptionReport}
                    fullWidth
                    disabled={receptionSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {receptionSaving ? 'Enregistrement...' : 'Enregistrer le rapport'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showInspectionReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">PV d'intervention</h3>
              <button onClick={() => setShowInspectionReport(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {inspectionLoading ? (
              <p className="text-gray-600 mb-4">Chargement de l'état des lieux...</p>
            ) : (
              <div className="space-y-6">
                {/* Rappel de l'état des lieux */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">État des lieux enregistré</h4>
                  {inspectionComments ? (
                    <p className="text-sm text-gray-700 whitespace-pre-line">{inspectionComments}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Aucun commentaire d'état des lieux enregistré.</p>
                  )}

                  {inspectionPhotos.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 md:grid-cols-4 gap-2">
                      {inspectionPhotos.map((photo) => (
                        <div key={photo.id} className="relative w-full pt-[75%] bg-gray-200 rounded-lg overflow-hidden">
                          <img
                            src={getInspectionPhotoUrl(photo.photo_url)}
                            alt="Photo état des lieux"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Commentaire complémentaire */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire d'intervention (optionnel)</label>
                  <textarea
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Détail des travaux effectués, pièces changées, recommandations..."
                  />
                </div>

                {/* Photos supplémentaires */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photos supplémentaires (1 à 5 images, optionnel)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setReportPhotos(files.slice(0, 5));
                    }}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {reportPhotos.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {reportPhotos.length} photo(s) sélectionnée(s)
                    </p>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setShowInspectionReport(false)}
                    fullWidth
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveReceptionReportAndSend}
                    fullWidth
                    disabled={reportSaving}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {reportSaving ? 'Envoi...' : "Enregistrer et envoyer au client"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
