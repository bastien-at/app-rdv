import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, User, Mail, Phone, FileText, Camera, CheckCircle, XCircle, Edit2, Download, Send } from 'lucide-react';
import { format, parseISO, isValid, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Button from './Button';
import { Booking, Service, Store } from '../types';
import api, { 
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
  adminCompleteBooking,
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
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [publicNotes, setPublicNotes] = useState<string>('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionTemplate, setCompletionTemplate] = useState('ready');
  const [completionMessage, setCompletionMessage] = useState('');
  const [completionLoading, setCompletionLoading] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [additionalServices, setAdditionalServices] = useState<
    { id?: string; name: string; price?: number }[]
  >([]);
  const [additionalServiceId, setAdditionalServiceId] = useState<string>('');
  const [additionalServiceName, setAdditionalServiceName] = useState('');
  const [additionalServicePrice, setAdditionalServicePrice] = useState<string>('');
  const getAdditionalServicesStorageKey = (bookingId: string) =>
    `admin_booking_additional_services_${bookingId}`;

  const getInspectionPhotoUrl = (photoUrl: string) => {
    if (!photoUrl) return '';
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }
    const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';
    const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
    const normalizedPath = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;
    return `${backendOrigin}${normalizedPath}`;
  };

  const handleAddAdditionalService = () => {
    const name = (additionalServiceName || selectedAdditionalService?.name || '').trim();
    if (!name) {
      alert('Merci de renseigner une prestation à ajouter');
      return;
    }
    const hasPriceInput = additionalServicePrice.trim().length > 0;
    const parsedPrice = hasPriceInput
      ? Number(additionalServicePrice.replace(',', '.'))
      : undefined;
    if (hasPriceInput && (Number.isNaN(parsedPrice) || (parsedPrice ?? 0) < 0)) {
      alert('Merci de renseigner un prix valide');
      return;
    }
    setAdditionalServices((prev) => [
      ...prev,
      {
        id: additionalServiceId || undefined,
        name,
        price: parsedPrice,
      },
    ]);
    setAdditionalServiceId('');
    setAdditionalServiceName('');
    setAdditionalServicePrice('');
  };

  const handleRemoveAdditionalService = (index: number) => {
    setAdditionalServices((prev) => prev.filter((_, i) => i !== index));
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
    console.log('🔍 [DEBUG] Booking object received in Drawer:', booking);
    console.log('🔍 [DEBUG] public_notes value:', booking.public_notes);
    
    setEditableServiceId(booking.service_id);
    setInternalNotes(booking.internal_notes || '');
    setPublicNotes(booking.public_notes || '');
    
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
        }
      } catch (e) {
        console.error('Erreur parsing date:', e);
      }
    }
    setReceptionNotes('');
    setReceptionPhotos([]);
    setInspectionComments('');
    setInspectionPhotos([]);
    setReportNotes('');
    setReportPhotos([]);
    try {
      const stored = sessionStorage.getItem(getAdditionalServicesStorageKey(booking.id));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setAdditionalServices(parsed);
        } else {
          setAdditionalServices([]);
        }
      } else {
        setAdditionalServices([]);
      }
    } catch (error) {
      console.warn('Erreur chargement prestations ajoutées:', error);
      setAdditionalServices([]);
    }
    setAdditionalServiceId('');
    setAdditionalServiceName('');
    setAdditionalServicePrice('');
    setIsEditing(false);
  }, [booking]);

  useEffect(() => {
    if (!booking) return;
    try {
      sessionStorage.setItem(
        getAdditionalServicesStorageKey(booking.id),
        JSON.stringify(additionalServices),
      );
    } catch (error) {
      console.warn('Erreur sauvegarde prestations ajoutées:', error);
    }
  }, [additionalServices, booking]);

  useEffect(() => {
    if (!booking || !booking.store_id) return;
    if (services.length === 0) {
      setServicesLoading(true);
      getStoreServices(booking.store_id)
        .then(setServices)
        .catch(error => console.error('Erreur chargement services magasin:', error))
        .finally(() => setServicesLoading(false));
    }
  }, [booking, services.length]);

  const handleCompleteBooking = async () => {
    if (!booking) return;
    setCompletionLoading(true);
    try {
      await adminCompleteBooking(booking.id, {
        templateId: completionTemplate,
        customMessage: completionMessage,
        internal_notes: internalNotes,
        public_notes: publicNotes
      });
      setShowCompletionModal(false);
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la clôture:', error);
      alert('Erreur lors de la clôture de la réservation');
    } finally {
      setCompletionLoading(false);
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
            inspection.photos.map((p: any) => ({ 
              id: String(p.id), 
              photo_url: p.photo_url 
            }))
          );
        }
      }
      try {
        const { data } = await api.get(`/bookings/${booking.id}/reception-report`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` }
        });
        if (data?.success && data?.data) {
          setReportNotes(data.data.work_performed || '');
        }
      } catch (err) {
        console.log('Aucun PV de réception existant pour cette réservation');
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données pour le PV:", error);
    } finally {
      setInspectionLoading(false);
    }
  };

  const handleSaveReceptionReportAndSend = async () => {
    if (!booking) return;
    setReportSaving(true);
    try {
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
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du PV d'intervention:", error);
      alert("Erreur lors de l'enregistrement / l'envoi du PV d'intervention");
    } finally {
      setReportSaving(false);
    }
  };

  const handleSaveReceptionReport = async () => {
    if (!booking) return;
    setReceptionSaving(true);
    try {
      let inspectionId: string | undefined;
      if (receptionPhotos.length > 0) {
        const inspection = await createOrUpdateInspectionApi(booking.id, receptionNotes || '');
        inspectionId = inspection?.id;
        if (inspectionId) {
          await uploadInspectionPhotosApi(inspectionId, receptionPhotos);
        }
      }
      const payload: ReceptionReportPayload = {
        inspectionId,
        workPerformed: receptionNotes || '',
      };
      const report = await createOrUpdateReceptionReportApi(booking.id, payload);
      if (report && report.id) {
        await sendReceptionReportApi(report.id);
      }
      setShowReceptionReport(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error("❌ Erreur lors de l'enregistrement de l'état des lieux:", error);
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
      if (isNaN(newStart.getTime())) throw new Error('Invalid date');
    } catch {
      alert('Format de date/heure invalide');
      return;
    }
    const payload: AdminConfirmBookingPayload = {
      service_id: editableServiceId,
      start_datetime: newStart.toISOString(),
      duration: editableDuration > 0 ? editableDuration : undefined
    };
    setConfirmLoading(true);
    try {
      await adminConfirmBooking(booking.id, payload);
      if (onUpdate) onUpdate();
      setIsEditing(false);
      if (booking.status === 'pending') onClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la réservation:', error);
      alert('Erreur lors de la mise à jour de la réservation');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSaveInternalNotes = async () => {
    if (!booking) return;

    console.log('💾 [DEBUG] Saving internal notes:', internalNotes);
    setNotesSaving(true);
    try {
      const { adminUpdateBookingStatus } = await import('../services/api');
      await adminUpdateBookingStatus(booking.id, booking.status, internalNotes, publicNotes);
      console.log('✅ [DEBUG] Internal notes saved successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('❌ [DEBUG] Error saving internal notes:', error);
    } finally {
      setNotesSaving(false);
    }
  };

  const handleSavePublicNotes = async () => {
    if (!booking) return;

    console.log('💾 [DEBUG] Saving public notes:', publicNotes);
    setNotesSaving(true);
    try {
      const { adminUpdateBookingStatus } = await import('../services/api');
      await adminUpdateBookingStatus(booking.id, booking.status, internalNotes, publicNotes);
      console.log('✅ [DEBUG] Public notes saved successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('❌ [DEBUG] Error saving public notes:', error);
    } finally {
      setNotesSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) return;
    setConfirmLoading(true);
    try {
      const { adminUpdateBookingStatus } = await import('../services/api');
      await adminUpdateBookingStatus(booking.id, 'cancelled');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'annulation de la réservation:', error);
    } finally {
      setConfirmLoading(false);
    }
  };

  const generateSupportSheet = () => {
    if (!booking) return;
    const doc = new jsPDF();
    const primaryColor = [0, 81, 98]; // #005162
    const secondaryColor = [20, 33, 41]; // #142129
    const accentColor = [239, 241, 243]; // #eff1f3

    // Background color for header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');

    // Title
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("FICHE D'INTERVENTION", 105, 20, { align: "center" });
    
    // Reference
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Référence : ${booking.booking_token || booking.id.slice(0, 8)}`, 105, 28, { align: "center" });

    // Section headers helper
    const drawSectionHeader = (title: string, y: number) => {
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(20, y, 170, 8, 'F');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text(title, 25, y + 6);
    };

    // Store & Client Layout
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    // Column 1: Store
    doc.setFont("helvetica", "bold");
    doc.text("MAGASIN", 20, 55);
    doc.setFont("helvetica", "normal");
    const storeName = store?.name || booking.store_name || "Non spécifié";
    doc.text(storeName, 20, 62);
    const storeAddress = store?.address || booking.store_address;
    const storeCity = store ? `${store.postal_code} ${store.city}` : `${booking.store_postal_code || ''} ${booking.store_city || ''}`;
    if (storeAddress) {
      doc.text(storeAddress, 20, 67);
      doc.text(storeCity, 20, 72);
    }
    if (store?.phone) doc.text(store.phone, 20, 77);
    if (store?.email) doc.text(store.email, 20, 82);

    // Column 2: Client
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT", 120, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`${booking.customer_firstname} ${booking.customer_lastname}`, 120, 62);
    doc.text(booking.customer_email || "", 120, 67);
    doc.text(booking.customer_phone || "", 120, 72);

    // Appointment Details Table
    drawSectionHeader("DÉTAILS DU RENDEZ-VOUS", 95);
    const baseEstimate = booking.service_price ?? null;
    const additionalTotal = additionalServices.reduce(
      (sum, service) => sum + (service.price ?? 0),
      0,
    );
    const estimatedTotal = baseEstimate !== null ? baseEstimate + additionalTotal : null;
    const estimateLabel = baseEstimate !== null
      ? (additionalServices.length > 0
        ? `${estimatedTotal}€ (inclut prestations ajoutées)`
        : `${baseEstimate}€`)
      : "À confirmer sur place";
    const tableData = [
      ["Date de l'intervention", format(parseISO(booking.start_datetime), "EEEE d MMMM yyyy", { locale: fr })],
      ["Créneau horaire", `${format(parseISO(booking.start_datetime), "HH:mm")} - ${format(parseISO(booking.end_datetime), "HH:mm")}`],
      ["Type de service", booking.service_name || "Non spécifié"],
      ["Estimation tarifaire", estimateLabel],
    ];

    autoTable(doc, {
      startY: 105,
      head: [['Intitulé', 'Informations']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: primaryColor as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold' 
      },
      styles: { 
        fontSize: 10, 
        cellPadding: 5,
        lineColor: [230, 230, 230]
      },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 60, fillColor: [250, 250, 250] } 
      },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    if (additionalServices.length > 0) {
      drawSectionHeader('PRESTATIONS AJOUTÉES', currentY);
      autoTable(doc, {
        startY: currentY + 10,
        head: [['Prestation', 'Prix'] ],
        body: additionalServices.map((service) => [
          service.name,
          service.price !== undefined ? `${service.price}€` : 'À définir',
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor as [number, number, number],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
          lineColor: [230, 230, 230],
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 120 },
          1: { cellWidth: 50 },
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Public Notes Section
    const notesToInclude = publicNotes || booking.public_notes;
    if (notesToInclude) {
      drawSectionHeader("NOTES COMPLÉMENTAIRES", currentY);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const splitNotes = doc.splitTextToSize(notesToInclude, 160);
      doc.text(splitNotes, 25, currentY + 15);
      currentY += 20 + (splitNotes.length * 5);
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const legalMention =
      "Le client reconnaît avoir pris connaissance des prestations ajoutées et accepte l'exécution des travaux décrits ci-dessus.";
    const legalLines = doc.splitTextToSize(legalMention, 170);
    doc.text(legalLines, 20, currentY + 10);

    doc.save(`fiche_alltricks_${format(parseISO(booking.start_datetime), "yyyyMMdd")}_${booking.customer_lastname}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  if (!isOpen || !booking) return null;
  const hasReceptionReport = !!booking.customer_data?.reception_report;
  const selectedAdditionalService = services.find(
    (service) => service.id === additionalServiceId,
  );
  const baseEstimate = booking.service_price !== undefined && booking.service_price !== null
    ? Number(booking.service_price)
    : null;
  const additionalTotal = additionalServices.reduce(
    (sum, service) => sum + Number(service.price ?? 0),
    0,
  );
  const estimatedTotal = baseEstimate !== null ? baseEstimate + additionalTotal : null;
  const formatPrice = (value: number) => {
    const normalized = Number(value);
    if (Number.isNaN(normalized)) {
      return '0,00';
    }
    return normalized.toFixed(2).replace('.', ',');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[40] transition-opacity backdrop-blur-sm" onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Détails de la réservation</h2>
            <p className="text-sm text-gray-500 mt-1">#{booking.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div><div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-semibold ${getStatusColor(booking.status)}`}>{getStatusIcon(booking.status)}{getStatusLabel(booking.status)}</div></div>
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900">Informations de réservation</h3>{isEditing && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Mode édition</span>}</div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><Calendar className="h-5 w-5 text-blue-600" /></div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Date et heure</p>
                {isEditing ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1"><label className="text-xs text-gray-500">Date</label><input type="date" value={editableDate} onChange={(e) => setEditableDate(e.target.value)} className="h-9 px-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" /></div>
                    <div className="flex flex-col gap-1"><label className="text-xs text-gray-500">Heure</label><input type="time" value={editableTime} onChange={(e) => setEditableTime(e.target.value)} className="h-9 px-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" /></div>
                    <div className="flex flex-col gap-1"><label className="text-xs text-gray-500">Durée (min)</label><input type="number" value={editableDuration} onChange={(e) => setEditableDuration(parseInt(e.target.value) || 0)} className="h-9 px-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" /></div>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900">{format(parseISO(booking.start_datetime), "EEEE d MMMM yyyy", { locale: fr })}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">{format(parseISO(booking.start_datetime), "HH:mm")} - {format(parseISO(booking.end_datetime), "HH:mm")}<span>({differenceInMinutes(parseISO(booking.end_datetime), parseISO(booking.start_datetime))} min)</span></p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="h-5 w-5 text-purple-600" /></div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Service</p>
                {isEditing ? (
                  <select value={editableServiceId || ''} onChange={(e) => { const newId = e.target.value; setEditableServiceId(newId || undefined); const service = services.find(s => s.id === newId); if (service) setEditableDuration(service.duration_minutes); }} disabled={servicesLoading} className="h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full">
                    <option value="">{servicesLoading ? 'Chargement...' : 'Sélectionner un service'}</option>
                    {services.map((service) => (<option key={service.id} value={service.id}>{service.name} ({service.duration_minutes} min) - {service.price}€</option>))}
                  </select>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900">{booking.service_name}</p>
                    {booking.service_price && (
                      <p className="text-sm text-gray-600">{booking.service_price}€</p>
                    )}
                    {baseEstimate !== null && additionalServices.length > 0 && (
                      <p className="text-xs font-semibold text-emerald-700">
                        Estimation tarifaire : {formatPrice(estimatedTotal ?? 0)}€ (prestations ajoutées incluses)
                      </p>
                    )}
                    {additionalServices.length > 0 && (
                      <div className="mt-2 space-y-1 rounded-lg border border-emerald-100 bg-emerald-50/40 p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          Prestations ajoutées
                        </p>
                        {additionalServices.map((service, index) => (
                          <p key={`${service.name}-${index}`} className="text-xs text-emerald-900">
                            {service.name}
                            {service.price !== undefined ? ` · ${service.price}€` : ''}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {booking.status === 'pending' && !isEditing && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-300 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Validation magasin</p>
                <div className="flex flex-col gap-1"><label className="text-xs font-medium text-gray-600">Service</label><select value={editableServiceId || ''} onChange={(e) => setEditableServiceId(e.target.value || undefined)} disabled={servicesLoading} className="h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">{servicesLoading ? 'Chargement...' : 'Service inchangé'}</option>{services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>)}</select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1"><label className="text-xs font-medium text-gray-600">Date</label><input type="date" value={editableDate} onChange={e => setEditableDate(e.target.value)} className="h-9 px-3 border border-gray-300 rounded-lg text-sm" /></div>
                  <div className="flex flex-col gap-1"><label className="text-xs font-medium text-gray-600">Heure</label><input type="time" value={editableTime} onChange={e => setEditableTime(e.target.value)} className="h-9 px-3 border border-gray-300 rounded-lg text-sm" /></div>
                </div>
              </div>
            )}
            {booking.store_name && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0"><MapPin className="h-5 w-5 text-green-600" /></div>
                <div><p className="text-sm text-gray-500">Magasin</p><p className="font-semibold text-gray-900">{booking.store_name}</p>{booking.store_address && <p className="text-sm text-gray-600">{booking.store_address}<br />{booking.store_postal_code} {booking.store_city}</p>}</div>
              </div>
            )}
            <div className="bg-white rounded-2xl p-6 space-y-4 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><User className="h-5 w-5 text-indigo-600" />Client</h3>
              <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Nom Complet</p><p className="font-semibold text-gray-900 text-lg">{booking.customer_firstname} {booking.customer_lastname}</p></div>
              <div className="grid grid-cols-2 gap-4">
                {booking.customer_email && <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p><p className="text-sm text-gray-900 truncate">{booking.customer_email}</p></div>}
                {booking.customer_phone && <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> Téléphone</p><p className="text-sm text-gray-900">{booking.customer_phone}</p></div>}
              </div>
            </div>
            <div className="bg-amber-50/50 rounded-2xl p-6 space-y-4 border border-amber-100 shadow-sm">
              <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Edit2 className="h-5 w-5 text-amber-600" /><h3 className="font-bold text-gray-900">Notes internes (privé)</h3></div>{notesSaving && <span className="text-[10px] text-amber-600 animate-pulse font-bold uppercase tracking-widest bg-white px-2 py-1 rounded-full border border-amber-200">Sync...</span>}</div>
              <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} onBlur={handleSaveInternalNotes} placeholder="Ajouter une note interne..." className="w-full h-24 px-4 py-3 border border-amber-200 rounded-xl text-sm" />
            </div>
            <div className="bg-blue-50/50 rounded-2xl p-6 space-y-4 border border-blue-100 shadow-sm">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><User className="h-5 w-5 text-blue-600" />Note publique (client)</h3>
              <textarea value={publicNotes} onChange={(e) => setPublicNotes(e.target.value)} onBlur={handleSavePublicNotes} placeholder="Ajouter une note pour le client..." className="w-full h-24 px-4 py-3 border border-blue-200 rounded-xl text-sm" />
            </div>
            <div className="bg-emerald-50/60 rounded-2xl p-6 space-y-4 border border-emerald-100 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-900">Prestations ajoutées</h3>
                  <p className="text-xs text-gray-500">Ces prestations seront indiquées sur la fiche PDF sans modifier la durée du rendez-vous.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <label className="text-xs font-medium text-gray-600">Sélectionner une prestation existante</label>
                <select
                  value={additionalServiceId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAdditionalServiceId(value);
                    const service = services.find((item) => item.id === value);
                    if (service) {
                      setAdditionalServiceName(service.name);
                      if (!additionalServicePrice) {
                        setAdditionalServicePrice(String(service.price));
                      }
                    }
                  }}
                  disabled={servicesLoading}
                  className="h-10 px-3 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{servicesLoading ? 'Chargement...' : 'Choisir une prestation'}</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {service.price}€
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Nom de prestation</label>
                  <input
                    type="text"
                    value={additionalServiceName}
                    onChange={(e) => setAdditionalServiceName(e.target.value)}
                    placeholder="Ex: Réglage dérailleur"
                    className="h-10 px-3 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Prix (optionnel)</label>
                  <input
                    type="text"
                    value={additionalServicePrice}
                    onChange={(e) => setAdditionalServicePrice(e.target.value)}
                    placeholder="Ex: 25"
                    className="h-10 px-3 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <Button variant="ghost" className="border border-emerald-200 text-emerald-700" onClick={handleAddAdditionalService}>
                Ajouter la prestation
              </Button>
              {additionalServices.length > 0 && (
                <div className="space-y-2">
                  {additionalServices.map((service, index) => (
                    <div key={`${service.name}-${index}`} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-4 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                        <p className="text-xs text-gray-500">{service.price !== undefined ? `${service.price}€` : 'Prix à définir'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditionalService(index)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Actions</h3>
            {!isEditing && (
              <div className="space-y-3">
                <Button variant="ghost" fullWidth className="border-2 border-gray-300" onClick={generateSupportSheet}><Download className="h-4 w-4 mr-2" />Fiche de prise en charge (PDF)</Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="ghost" className="border-2 border-blue-500" onClick={() => { if (hasReceptionReport) setReceptionNotes(booking.customer_data?.reception_report?.workPerformed || ''); setShowReceptionReport(true); }}><Camera className="h-4 w-4 mr-2" />État des lieux</Button>
                  <Button variant="ghost" className="border-2 border-green-500" onClick={openInspectionReportModal}><FileText className="h-4 w-4 mr-2" />PV d'intervention</Button>
                </div>
                {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                  <Button fullWidth className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowCompletionModal(true)}><CheckCircle className="h-4 w-4 mr-2" />Terminer l'intervention</Button>
                )}
                {!hasReceptionReport && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                  <Button fullWidth className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsEditing(true)}><Edit2 className="h-4 w-4 mr-2" />Modifier la réservation</Button>
                )}
                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                  <Button fullWidth variant="ghost" className="border-2 border-red-300 text-red-600" onClick={handleCancel} disabled={confirmLoading}><XCircle className="h-4 w-4 mr-2" />Annuler la réservation</Button>
                )}
              </div>
            )}
            {isEditing && (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Annuler</Button>
                <Button onClick={handleSaveBooking} disabled={confirmLoading} className="bg-blue-600 hover:bg-blue-700 text-white">Enregistrer</Button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">Statut actuel : {getStatusLabel(booking.status)}</div>
          <div className="flex items-center gap-3">
            {booking.status === 'pending' && <Button variant="primary" onClick={handleSaveBooking} disabled={confirmLoading}>Valider la réservation</Button>}
            <Button variant="secondary" onClick={onClose}>Fermer</Button>
          </div>
        </div>
      </div>

      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6"><h3 className="text-2xl font-bold text-gray-900">Clôturer l'intervention</h3><button onClick={() => setShowCompletionModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-500" /></button></div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Modèle d'email</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'ready', label: '✅ Vélo prêt', desc: 'Prévient le client que son vélo est prêt' },
                    { id: 'feedback', label: '⭐ Avis Google', desc: 'Remercie le client et demande un avis' },
                    { id: 'default', label: '🏁 Simple clôture', desc: 'Notification standard de fin de RDV' }
                  ].map((tpl) => (
                    <button key={tpl.id} onClick={() => setCompletionTemplate(tpl.id)} className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${completionTemplate === tpl.id ? 'border-green-500 bg-green-50 ring-4 ring-green-100' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                      <span className="font-bold text-gray-900">{tpl.label}</span>
                      <span className="text-xs text-gray-500 mt-1">{tpl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Message personnalisé</label><textarea value={completionMessage} onChange={e => setCompletionMessage(e.target.value)} rows={4} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl text-sm" placeholder="Note pour l'email..." /></div>
              <div className="flex gap-4 pt-4">
                <Button variant="ghost" onClick={() => setShowCompletionModal(false)} fullWidth className="py-3 font-bold">Annuler</Button>
                <Button onClick={handleCompleteBooking} fullWidth disabled={completionLoading} className="bg-green-600 hover:bg-green-700 text-white py-3 font-bold">{completionLoading ? 'Envoi...' : 'Clôturer & Envoyer'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReceptionReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold">{hasReceptionReport ? 'État des lieux (Lecture seule)' : 'État des lieux'}</h3><button onClick={() => setShowReceptionReport(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button></div>
            <div className="space-y-4">
              <textarea value={receptionNotes} onChange={e => setReceptionNotes(e.target.value)} rows={4} className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-100" readOnly={hasReceptionReport} disabled={hasReceptionReport} placeholder="Remarques..." />
              {!hasReceptionReport && (
                <div><label className="block text-sm font-medium mb-1">Photos (1-5)</label><input type="file" accept="image/*" multiple onChange={e => setReceptionPhotos(Array.from(e.target.files || []).slice(0, 5))} className="text-sm" /></div>
              )}
              <div className="flex gap-3 mt-4">
                <Button variant="ghost" onClick={() => setShowReceptionReport(false)} fullWidth>Fermer</Button>
                {!hasReceptionReport && <Button onClick={handleSaveReceptionReport} fullWidth disabled={receptionSaving} className="bg-blue-600 text-white">Enregistrer</Button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {showInspectionReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full">
            <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold">PV d'intervention</h3><button onClick={() => setShowInspectionReport(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button></div>
            {inspectionLoading ? <p>Chargement...</p> : (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <h4 className="text-sm font-semibold mb-2">État des lieux</h4>
                  <p className="text-sm">{inspectionComments || 'Aucun commentaire'}</p>
                  {inspectionPhotos.length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{inspectionPhotos.map(p => <div key={p.id} className="relative pt-[75%] rounded-lg overflow-hidden"><img src={getInspectionPhotoUrl(p.photo_url)} className="absolute inset-0 w-full h-full object-cover" alt="" /></div>)}</div>}
                </div>
                <textarea value={reportNotes} onChange={e => setReportNotes(e.target.value)} rows={4} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Détails travaux..." />
                <input type="file" multiple onChange={e => setReportPhotos(Array.from(e.target.files || []).slice(0, 5))} className="text-sm" />
                <div className="flex gap-3 mt-4">
                  <Button variant="ghost" onClick={() => setShowInspectionReport(false)} fullWidth>Annuler</Button>
                  <Button onClick={handleSaveReceptionReportAndSend} fullWidth disabled={reportSaving} className="bg-green-600 text-white">Envoyer</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
