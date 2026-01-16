import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Settings,
  Plus,
  Bike,
  Wrench,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
  setHours,
  setMinutes,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import AdminLayout from '../../components/admin/AdminLayout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import BookingDrawer from '../../components/BookingDrawer';
import { getAdminToken, adminConfirmBooking } from '../../services/api';

interface Store {
  id: string;
  name: string;
  workshop_capacity?: number;
  fitting_capacity?: number;
}

interface Booking {
  id: string;
  service_id: string;
  store_id: string;
  customer_firstname: string;
  customer_lastname: string;
  service_name: string;
  service_type: 'fitting' | 'workshop';
  start_datetime: string;
  end_datetime: string;
  status: string;
  technician_name?: string;
  service_price?: number;
  service_duration?: number;
  customer_email?: string;
  customer_phone?: string;
  customer_data?: any;
  internal_notes?: string;
  public_notes?: string;
  created_at?: string;
  booking_token?: string;
}

interface AvailabilityBlock {
  id: string;
  store_id: string;
  technician_id?: string;
  start_datetime: string;
  end_datetime: string;
  reason: string;
  block_type: 'closure' | 'maintenance' | 'holiday' | 'other';
  service_type?: 'fitting' | 'workshop' | null;
  quantity?: number;
}

interface OpeningHours {
  day: number; // 0-6 (dimanche-samedi)
  is_open: boolean;
  morning_start?: string;
  morning_end?: string;
  afternoon_start?: string;
  afternoon_end?: string;
}

type ViewMode = 'day' | 'week' | 'month';

export default function PlanningPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<
    AvailabilityBlock[]
  >([]);
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'fitting' | 'workshop'>(
    'all',
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'confirmed' | 'cancelled'
  >('all');
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showBookingDrawer, setShowBookingDrawer] = useState(false);
  const [selectedBookingForDrawer, setSelectedBookingForDrawer] =
    useState<Booking | null>(null);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState<{
    day: Date;
    hour: number;
    minutes?: number;
  } | null>(null);

  const getAdminStoreId = (): string | null => {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem('admin_store_id') ||
      sessionStorage.getItem('admin_store_id')
    );
  };

  useEffect(() => {
    // Contrôle de connexion désactivé temporairement pour faciliter l'accès au planning.
    // const token = localStorage.getItem('admin_token');
    // if (!token) {
    //   navigate('/admin/login');
    // } else {
    //   loadStores();
    // }
    loadStores();
  }, [navigate]);

  useEffect(() => {
    if (selectedStore) {
      loadBookings();
      loadOpeningHours();
      loadAvailabilityBlocks();
    }
  }, [selectedStore, currentDate, viewMode]);

  // Mettre à jour la réservation sélectionnée quand la liste change (ex: après modification)
  useEffect(() => {
    if (selectedBookingForDrawer && bookings.length > 0) {
      const updated = bookings.find(
        (b) => b.id === selectedBookingForDrawer.id,
      );
      if (
        updated &&
        JSON.stringify(updated) !== JSON.stringify(selectedBookingForDrawer)
      ) {
        setSelectedBookingForDrawer(updated);
      }
    }
  }, [bookings]);

  const loadStores = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/stores', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Erreur API magasins');
      }

      const json = await response.json();
      const data: Store[] = (json.data || []).map((store: any) => ({
        id: store.id,
        name: store.name,
      }));
      const adminStoreId = getAdminStoreId();

      if (adminStoreId) {
        const adminStore = data.find((s) => s.id === adminStoreId);
        if (adminStore) {
          setStores([adminStore]);
          setSelectedStore(adminStore.id);
          return;
        }
      }

      setStores(data);
      if (data.length > 0) {
        setSelectedStore(data[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement magasins:', error);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      if (!selectedStore) {
        setBookings([]);
        return;
      }

      // On récupère les réservations du magasin, sans filtre de date, puis on filtre côté frontend
      const token = getAdminToken();
      const response = await fetch(
        `/api/admin/stores/${selectedStore}/bookings?limit=500`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error('Erreur API réservations');
      }

      const json = await response.json();
      const apiData = json.data || {};
      const apiBookings = apiData.bookings || [];

      const mapped: Booking[] = apiBookings.map((b: any) => ({
        id: b.id,
        service_id: b.service_id,
        store_id: b.store_id,
        customer_firstname: b.customer_firstname,
        customer_lastname: b.customer_lastname,
        service_name: b.service_name,
        service_type: (b.service_type === 'workshop'
          ? 'workshop'
          : 'fitting') as 'fitting' | 'workshop',
        start_datetime: b.start_datetime,
        end_datetime: b.end_datetime,
        status: b.status,
        technician_name: b.technician_name,
        service_price: b.service_price,
        service_duration: b.service_duration,
        customer_email: b.customer_email,
        customer_phone: b.customer_phone,
        customer_data: b.customer_data,
        internal_notes: b.internal_notes,
        public_notes: b.public_notes,
        created_at: b.created_at,
        booking_token: b.booking_token,
      }));

      setBookings(mapped);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOpeningHours = async () => {
    try {
      if (!selectedStore) {
        setOpeningHours([]);
        return;
      }

      const response = await fetch(`/api/stores/${selectedStore}`);

      if (!response.ok) {
        throw new Error('Erreur API magasin (horaires)');
      }

      const json = await response.json();
      const store = json.data;

      if (!store || !store.opening_hours) {
        setOpeningHours([]);
        return;
      }

      const oh = store.opening_hours;

      // Transformation OpeningHours backend -> tableau OpeningHours frontend
      const mapped: OpeningHours[] = [
        {
          day: 1,
          is_open: !oh.monday?.closed,
          morning_start: oh.monday?.open,
          morning_end: oh.monday?.close,
        },
        {
          day: 2,
          is_open: !oh.tuesday?.closed,
          morning_start: oh.tuesday?.open,
          morning_end: oh.tuesday?.close,
        },
        {
          day: 3,
          is_open: !oh.wednesday?.closed,
          morning_start: oh.wednesday?.open,
          morning_end: oh.wednesday?.close,
        },
        {
          day: 4,
          is_open: !oh.thursday?.closed,
          morning_start: oh.thursday?.open,
          morning_end: oh.thursday?.close,
        },
        {
          day: 5,
          is_open: !oh.friday?.closed,
          morning_start: oh.friday?.open,
          morning_end: oh.friday?.close,
        },
        {
          day: 6,
          is_open: !oh.saturday?.closed,
          morning_start: oh.saturday?.open,
          morning_end: oh.saturday?.close,
        },
        {
          day: 0,
          is_open: !oh.sunday?.closed,
          morning_start: oh.sunday?.open,
          morning_end: oh.sunday?.close,
        },
      ];

      setOpeningHours(mapped);
    } catch (error) {
      console.error('Erreur chargement horaires:', error);
    }
  };

  const loadAvailabilityBlocks = async () => {
    try {
      if (!selectedStore) {
        setAvailabilityBlocks([]);
        return;
      }

      const token = getAdminToken();
      const response = await fetch(
        `/api/admin/stores/${selectedStore}/availability-blocks`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        console.error(
          'Erreur chargement blocages:',
          response.status,
          response.statusText,
        );
        throw new Error('Erreur API blocages');
      }

      const json = await response.json();
      if (json.success) {
        setAvailabilityBlocks(json.data);
      }
    } catch (error) {
      console.error('Erreur chargement blocages:', error);
    }
  };

  const getDaysToDisplay = () => {
    if (viewMode === 'day') {
      return [currentDate];
    }

    if (viewMode === 'week') {
      // Lundi (1) à samedi (6) uniquement, on exclut le dimanche (0)
      return Array.from({ length: 7 }, (_, i) =>
        addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i),
      ).filter((day) => day.getDay() !== 0);
    }

    // Vue mois : on aligne sur des semaines complètes (lundi -> samedi) pour éviter les décalages
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start, end }).filter((day) => day.getDay() !== 0);
  };

  const getBookingsForDay = (day: Date) => {
    const dayBookings = bookings.filter((booking) => {
      const matchesDay = isSameDay(parseISO(booking.start_datetime), day);
      const matchesTab =
        activeTab === 'all' || booking.service_type === activeTab;

      let matchesStatus = false;
      if (statusFilter === 'all') {
        matchesStatus = booking.status !== 'cancelled';
      } else {
        matchesStatus = booking.status === statusFilter;
      }

      return matchesDay && matchesTab && matchesStatus;
    });

    // Group concurrent bookings by time slots to calculate widths and offsets
    const sorted = [...dayBookings].sort((a, b) => 
      new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    );

    const groups: Booking[][] = [];
    sorted.forEach(booking => {
      let placed = false;
      for (const group of groups) {
        const isConcurrent = group.some(b => {
          const aStart = new Date(booking.start_datetime).getTime();
          const aEnd = new Date(booking.end_datetime).getTime();
          const bStart = new Date(b.start_datetime).getTime();
          const bEnd = new Date(b.end_datetime).getTime();
          return aStart < bEnd && aEnd > bStart;
        });

        if (isConcurrent) {
          group.push(booking);
          placed = true;
          break;
        }
      }
      if (!placed) groups.push([booking]);
    });

    return dayBookings.map(b => {
      const group = groups.find(g => g.includes(b)) || [b];
      const indexInGroup = group.indexOf(b);
      return {
        ...b,
        concurrent_count: group.length,
        concurrent_index: indexInGroup
      };
    });
  };

  const stats = {
    total: bookings.length,
    fitting: bookings.filter((b) => b.service_type === 'fitting').length,
    workshop: bookings.filter((b) => b.service_type === 'workshop').length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };

  const pendingBookings = bookings.filter((b) => b.status === 'pending');

  const getOpeningHoursForDay = (day: Date) => {
    const dayOfWeek = day.getDay();
    return openingHours.find((h) => h.day === dayOfWeek);
  };

  const getAvailabilityBlockForDateTime = (date: Date, hour: number) => {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    return availabilityBlocks.find((block) => {
      const blockStart = new Date(block.start_datetime);
      const blockEnd = new Date(block.end_datetime);

      // Vérifier si le blocage chevauche le créneau
      const isOverlapping = blockStart < slotEnd && blockEnd > slotStart;
      if (!isOverlapping) return false;

      // Vérifier si le type de blocage correspond au filtre actif
      if (activeTab === 'all') {
        return true;
      } else if (activeTab === 'fitting') {
        return !block.service_type || block.service_type === 'fitting';
      } else if (activeTab === 'workshop') {
        return !block.service_type || block.service_type === 'workshop';
      }

      return false;
    });
  };

  const isDayFullyBooked = (day: Date): boolean => {
    const hours = getOpeningHoursForDay(day);
    if (!hours?.is_open) return false;

    // créneaux de début 10h à 18h (les réservations démarrent entre 10:00 et 18:00)
    const hoursRange = Array.from({ length: 9 }, (_, i) => i + 10);
    const dayBookings = getBookingsForDay(day);

    return hoursRange.every((hour) => {
      const hasBookingAtHour = dayBookings.some((b) => {
        const bookingDate = new Date(b.start_datetime);
        return bookingDate.getHours() === hour;
      });
      const isBlocked = !!getAvailabilityBlockForDateTime(day, hour);
      return hasBookingAtHour || isBlocked;
    });
  };

  const goToNextAvailableDay = () => {
    // Cherche le prochain jour ouvert à partir d'aujourd'hui (limité à 60 jours)
    const start = new Date();
    for (let i = 0; i < 60; i++) {
      const candidate = addDays(start, i);
      if (candidate.getDay() === 0) continue; // ignorer les dimanches
      const hours = getOpeningHoursForDay(candidate);
      if (hours?.is_open) {
        setCurrentDate(candidate);
        return;
      }
    }
  };

  const handleCreateBookingForDay = (day: Date) => {
    if (!selectedStore) return;

    if (activeTab === 'all') {
      setPendingBookingData({ day, hour: 10, minutes: 0 });
      setShowServiceTypeModal(true);
      return;
    }

    const dateParam = format(day, 'yyyy-MM-dd');
    let url = `/stores/${selectedStore}/booking?source=admin&date=${dateParam}`;

    if (activeTab === 'fitting') {
      url += '&type=fitting';
    } else if (activeTab === 'workshop') {
      url += '&type=workshop';
    }

    navigate(url);
  };

  const handleCreateBookingForDateTime = (day: Date, hour: number) => {
    if (!selectedStore) return;

    if (activeTab === 'all') {
      setPendingBookingData({ day, hour, minutes: 0 });
      setShowServiceTypeModal(true);
      return;
    }

    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);

    const dateParam = format(start, 'yyyy-MM-dd');
    const timeParam = format(start, 'HH:mm');

    let typeParam = '';
    if (activeTab === 'fitting') {
      typeParam = '&type=fitting';
    } else if (activeTab === 'workshop') {
      typeParam = '&type=workshop';
    }

    navigate(
      `/stores/${selectedStore}/booking?date=${dateParam}&time=${timeParam}&source=admin${typeParam}`,
    );
  };

  const handleCreateBookingForDateTimeWithMinutes = (
    day: Date,
    hour: number,
    minutes: number,
  ) => {
    if (!selectedStore) return;

    if (activeTab === 'all') {
      setPendingBookingData({ day, hour, minutes });
      setShowServiceTypeModal(true);
      return;
    }

    const start = new Date(day);
    start.setHours(hour, minutes, 0, 0);

    const dateParam = format(start, 'yyyy-MM-dd');
    const timeParam = format(start, 'HH:mm');

    let typeParam = '';
    if (activeTab === 'fitting') {
      typeParam = '&type=fitting';
    } else if (activeTab === 'workshop') {
      typeParam = '&type=workshop';
    }

    navigate(
      `/stores/${selectedStore}/booking?date=${dateParam}&time=${timeParam}&source=admin${typeParam}`,
    );
  };

  const handleSelectServiceTypeAndNavigate = (type: 'fitting' | 'workshop') => {
    if (!selectedStore || !pendingBookingData) return;

    const { day, hour, minutes = 0 } = pendingBookingData;
    const start = new Date(day);
    start.setHours(hour, minutes, 0, 0);

    const dateParam = format(start, 'yyyy-MM-dd');
    const timeParam = format(start, 'HH:mm');

    const url = `/stores/${selectedStore}/booking?date=${dateParam}&time=${timeParam}&source=admin&type=${type}`;
    
    setShowServiceTypeModal(false);
    setPendingBookingData(null);
    navigate(url);
  };

  const navigatePrevious = () => {
    if (viewMode === 'day') {
      let candidate = addDays(currentDate, -1);
      // Sauter les dimanches
      while (candidate.getDay() === 0) {
        candidate = addDays(candidate, -1);
      }
      setCurrentDate(candidate);
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'day') {
      let candidate = addDays(currentDate, 1);
      // Sauter les dimanches
      while (candidate.getDay() === 0) {
        candidate = addDays(candidate, 1);
      }
      setCurrentDate(candidate);
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const handleQuickConfirm = async (bookingId: string) => {
    try {
      setConfirmingId(bookingId);
      await adminConfirmBooking(bookingId);
      await loadBookings();
    } catch (error) {
      console.error('Erreur lors de la confirmation rapide:', error);
    } finally {
      setConfirmingId(null);
    }
  };

  const getAvailabilityBlockForSlot = (
    day: Date,
    hour: number,
    minutes: number,
  ): AvailabilityBlock | undefined => {
    const slotStart = new Date(day);
    slotStart.setHours(hour, minutes, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 15);

    return availabilityBlocks.find((block) => {
      const blockStart = new Date(block.start_datetime);
      const blockEnd = new Date(block.end_datetime);

      const isOverlapping = blockStart < slotEnd && blockEnd > slotStart;
      if (!isOverlapping) return false;

      if (activeTab === 'all') {
        return true;
      } else if (activeTab === 'fitting') {
        return !block.service_type || block.service_type === 'fitting';
      } else if (activeTab === 'workshop') {
        return !block.service_type || block.service_type === 'workshop';
      }

      return false;
    });
  };

  const getCapacityForSlot = (day: Date, hour: number, minutes: number): number => {
    if (!selectedStore) return 1;
    const store = stores.find(s => s.id === selectedStore);
    if (!store) return 1;

    if (activeTab === 'fitting') return store.fitting_capacity || 1;
    if (activeTab === 'workshop') return store.workshop_capacity || 1;
    
    return Math.max(store.fitting_capacity || 1, store.workshop_capacity || 1);
  };

  const getBookedCountForSlot = (day: Date, hour: number, minutes: number, serviceType?: 'fitting' | 'workshop'): number => {
    const slotStart = new Date(day);
    slotStart.setHours(hour, minutes, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 15);

    return bookings.filter(b => {
      if (b.status === 'cancelled') return false;
      const bStart = new Date(b.start_datetime);
      const bEnd = new Date(b.end_datetime);
      const isOverlapping = bStart < slotEnd && bEnd > slotStart;
      
      if (!isOverlapping) return false;
      
      if (serviceType) return b.service_type === serviceType;
      if (activeTab === 'all') return true;
      return b.service_type === activeTab;
    }).length;
  };

  const getBlockedCountForSlot = (day: Date, hour: number, minutes: number, serviceType?: 'fitting' | 'workshop'): number => {
    const slotStart = new Date(day);
    slotStart.setHours(hour, minutes, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 15);

    return availabilityBlocks.reduce((acc, block) => {
      const bStart = new Date(block.start_datetime);
      const bEnd = new Date(block.end_datetime);
      const isOverlapping = bStart < slotEnd && bEnd > slotStart;
      
      if (!isOverlapping) return acc;
      
      if (serviceType) {
        if (block.service_type && block.service_type !== serviceType) return acc;
        return acc + (block.quantity || 1);
      }

      if (activeTab === 'all') return acc + (block.quantity || 1);
      if (block.service_type && block.service_type !== activeTab) return acc;
      
      return acc + (block.quantity || 1);
    }, 0);
  };

  const getBookingDurationMinutes = (booking: Booking): number => {
    if (
      typeof booking.service_duration === 'number' &&
      booking.service_duration > 0
    ) {
      return booking.service_duration;
    }
    const start = new Date(booking.start_datetime);
    const end = new Date(booking.end_datetime);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.round(diffMs / 60000));
  };

  const getBookingGridPlacement = (
    booking: Booking,
    dayIndex: number,
  ): { gridColumn: string; gridRow: string } | null => {
    const start = new Date(booking.start_datetime);
    const durationMinutes = getBookingDurationMinutes(booking);

    // Grille horaire: sous-lignes de 15 min de 10:00 -> 19:00
    const GRID_START_HOUR = 10;
    const GRID_END_HOUR = 19;
    const SLOT_MINUTES = 15;

    const startHour = start.getHours();
    const startMinutes = start.getMinutes();
    if (startHour < GRID_START_HOUR || startHour >= GRID_END_HOUR) return null;

    const slotsPerHour = 60 / SLOT_MINUTES;
    const startSlotIndex =
      (startHour - GRID_START_HOUR) * slotsPerHour +
      Math.floor(startMinutes / SLOT_MINUTES);

    const rowStart = 2 + startSlotIndex; // 1ère ligne = header
    const rowSpan = Math.max(1, Math.ceil(durationMinutes / SLOT_MINUTES));
    const gridColumnStart = 2 + dayIndex; // colonnes = jours (la colonne heures est à l'index 1)

    return {
      gridColumn: `${gridColumnStart} / span 1`,
      gridRow: `${rowStart} / span ${rowSpan}`,
    };
  };

  const hasBookingOverlappingSlot = (
    day: Date,
    hour: number,
    minutes: number,
  ): boolean => {
    // On ne veut plus que cette fonction "cache" les cellules vides si un RDV existe,
    // car le RDV est géré par l'overlay.
    return false;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'pending':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getServiceTypeIcon = (serviceType: 'fitting' | 'workshop') => {
    return serviceType === 'fitting' ? (
      <Bike className="h-3 w-3 inline mr-1" />
    ) : (
      <Wrench className="h-3 w-3 inline mr-1" />
    );
  };

  const days = getDaysToDisplay();

  return (
    <AdminLayout>
      <div className="overflow-y-auto h-full bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Onglets + filtres statut */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <div className="flex items-center justify-between">
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

                {/* Filtres statut */}
                <div className="hidden md:flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Statut :</span>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-xs ${
                        statusFilter === 'all'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Tous ({stats.total})
                    </button>
                    <button
                      onClick={() => {
                        setStatusFilter('pending');
                        setShowPendingModal(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-xs ${
                        statusFilter === 'pending'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-orange-700 hover:bg-orange-100'
                      }`}
                    >
                      En attente ({stats.pending})
                    </button>
                    <button
                      onClick={() => setStatusFilter('confirmed')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-xs ${
                        statusFilter === 'confirmed'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'text-green-700 hover:bg-green-100'
                      }`}
                    >
                      Confirmés ({stats.confirmed})
                    </button>
                    <button
                      onClick={() => setStatusFilter('cancelled')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-xs ${
                        statusFilter === 'cancelled'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-red-700 hover:bg-red-100'
                      }`}
                    >
                      Annulés ({stats.cancelled})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <Card className="mb-6">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Mode vue */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'day' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                >
                  Jour
                </Button>
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

              {/* Navigation centrale */}
              <div className="flex items-center justify-center gap-2 flex-1">
                <Button variant="ghost" size="sm" onClick={navigatePrevious}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Button variant="ghost" size="sm" onClick={navigateToday}>
                  Aujourd'hui
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextAvailableDay}
                >
                  Prochaine disponibilité
                </Button>

                <span className="font-semibold text-gray-900 min-w-[200px] text-center">
                  {viewMode === 'day'
                    ? format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })
                    : viewMode === 'week'
                    ? `Semaine du ${format(
                        startOfWeek(currentDate, { weekStartsOn: 1 }),
                        'd MMM',
                        { locale: fr },
                      )} au ${format(
                        endOfWeek(currentDate, { weekStartsOn: 1 }),
                        'd MMM yyyy',
                        { locale: fr },
                      )}`
                    : format(currentDate, 'MMMM yyyy', { locale: fr })}
                </span>

                <Button variant="ghost" size="sm" onClick={navigateNext}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* CTA création créneau */}
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCreateBookingForDay(currentDate)}
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Créer un créneau
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
                {viewMode === 'month' ? (
                  // Vue mois
                  <div className="grid grid-cols-6 gap-px bg-gray-200">
                    {/* Header jours */}
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(
                      (day) => (
                        <div
                          key={day}
                          className="bg-white p-2 text-center font-semibold text-sm text-gray-700"
                        >
                          {day}
                        </div>
                      ),
                    )}

                    {/* Jours du mois */}
                    {days.map((day) => {
                      const dayBookings = getBookingsForDay(day);
                      const hours = getOpeningHoursForDay(day);
                      const isOpen = hours?.is_open;
                      const full = isDayFullyBooked(day);

                      return (
                        <div
                          key={day.toISOString()}
                          className={`bg-white p-2 min-h-[100px] ${
                            !isOpen ? 'bg-gray-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-sm ${
                                isSameDay(day, new Date())
                                  ? 'text-blue-500 font-bold'
                                  : 'text-gray-700'
                              }`}
                            >
                              {format(day, 'd')}
                            </span>
                            {full && (
                              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                Complet
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {isOpen && dayBookings.length === 0 ? (
                              <div className="flex flex-col items-center justify-center text-xs text-gray-500 gap-2 mt-4">
                                <span>Aucune réservation ce jour</span>
                                <button
                                  onClick={() => handleCreateBookingForDay(day)}
                                  className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium hover:bg-blue-100 transition-colors"
                                >
                                  Créer une réservation
                                </button>
                              </div>
                            ) : (
                              <>
                                {dayBookings.slice(0, 3).map((booking) => (
                                  <div
                                    key={booking.id}
                                    className={`text-xs p-1 rounded border ${getStatusColor(
                                      booking.status,
                                    )} cursor-pointer hover:shadow-sm transition`}
                                    onClick={() => {
                                      setSelectedBookingForDrawer(booking);
                                      setShowBookingDrawer(true);
                                    }}
                                  >
                                    <div className="truncate font-semibold">
                                      {format(
                                        parseISO(booking.start_datetime),
                                        'HH:mm',
                                      )}
                                    </div>
                                    <div className="truncate">
                                      {booking.customer_firstname}{' '}
                                      {booking.customer_lastname}
                                    </div>
                                  </div>
                                ))}
                                {dayBookings.length > 3 && (
                                  <div className="text-xs text-gray-600">
                                    +{dayBookings.length - 3} autres
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
                  {/* Colonne des Heures */}
                  <div className="flex-shrink-0 w-[60px] bg-white border-r border-gray-200 z-30">
                    <div
                      className="font-semibold text-[11px] text-gray-500 flex items-center justify-center border-b border-gray-200 uppercase bg-gray-50"
                      style={{ height: 60 }}
                    >
                      Heure
                    </div>
                    {Array.from({ length: 36 }, (_, i) => i).map((slotIndex) => {
                      const hour = 10 + Math.floor(slotIndex / 4);
                      const minutes = (slotIndex % 4) * 15;
                      return (
                        <div
                          key={`h-slot-${slotIndex}`}
                          className={`px-2 text-[10px] text-gray-400 flex items-start justify-end pr-2 ${
                            minutes === 0
                              ? 'border-t-2 border-t-gray-300 font-black text-gray-300 bg-gray-50/50'
                              : 'border-t border-t-gray-100'
                          }`}
                          style={{ height: 20 }}
                        >
                          {minutes === 0 && (
                            <span className="mt-[-7px] bg-white px-1 shadow-sm rounded-sm">
                              {hour}:00
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Grille Jours */}
                  <div className="flex-1 overflow-x-auto">
                    <div
                      className={`grid relative min-w-full ${
                        viewMode === 'day'
                          ? 'grid-cols-1'
                          : 'grid-cols-[repeat(6,minmax(150px,1fr))]'
                      }`}
                      style={{ gridTemplateRows: `60px repeat(36, 20px)` }}
                    >
                      {days.map((day, dIdx) => {
                        const full = isDayFullyBooked(day);
                        return (
                          <div
                            key={`header-${day.toISOString()}`}
                            className="bg-gray-50 border-b border-gray-200 p-2 flex flex-col items-center justify-center border-r last:border-r-0"
                            style={{ gridRow: '1', gridColumn: `${dIdx + 1}` }}
                          >
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                              {format(day, 'EEE', { locale: fr })}
                            </span>
                            <span
                              className={`text-base font-black ${
                                isSameDay(day, new Date())
                                  ? 'text-blue-600'
                                  : 'text-gray-700'
                              }`}
                            >
                              {format(day, 'd')}
                            </span>
                            {full && (
                              <span className="text-[8px] bg-red-100 text-red-700 px-1 rounded-full font-bold">
                                COMPLET
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Corps de la grille */}
                      {days.map((day, dIdx) => (
                        <Fragment key={`col-${day.toISOString()}`}>
                          {Array.from({ length: 36 }, (_, i) => i).map(
                            (slotIndex) => {
                              const hour = 10 + Math.floor(slotIndex / 4);
                              const minutes = (slotIndex % 4) * 15;
                              const hours = getOpeningHoursForDay(day);
                              const isOpen = hours?.is_open;
                              
                              const store = stores.find(s => s.id === selectedStore);
                              const fCap = store?.fitting_capacity || 1;
                              const wCap = store?.workshop_capacity || 1;

                              const fBooked = getBookedCountForSlot(day, hour, minutes, 'fitting');
                              const fBlocked = getBlockedCountForSlot(day, hour, minutes, 'fitting');
                              const wBooked = getBookedCountForSlot(day, hour, minutes, 'workshop');
                              const wBlocked = getBlockedCountForSlot(day, hour, minutes, 'workshop');

                              const fFull = (fBooked + fBlocked) >= fCap;
                              const wFull = (wBooked + wBlocked) >= wCap;

                              let isFull = false;
                              if (activeTab === 'fitting') isFull = fFull;
                              else if (activeTab === 'workshop') isFull = wFull;
                              else isFull = fFull && wFull; // Dans 'Tous les RDV', c'est complet uniquement si les DEUX sont pleins

                              const isSlotBooked = hasBookingOverlappingSlot(
                                day,
                                hour,
                                minutes,
                              );

                              return (
                                <div
                                  key={`slot-${day.toISOString()}-${slotIndex}`}
                                  className={`border-r group transition-colors
                                  ${!isOpen ? 'bg-gray-50/50' : 'bg-white'}
                                  ${
                                    isFull && isOpen
                                      ? 'bg-gray-100/80 cursor-not-allowed'
                                      : ''
                                  }
                                  ${
                                    !isFull && isOpen && !isSlotBooked
                                      ? 'hover:bg-blue-50/50 cursor-pointer'
                                      : ''
                                  }
                                  ${
                                    minutes === 0
                                      ? 'border-t-2 border-t-gray-300'
                                      : 'border-t border-t-gray-100'
                                  }
                                  ${minutes === 45 ? 'border-b border-b-gray-100' : ''}
                                `}
                                  style={{
                                    gridRow: `${slotIndex + 2}`,
                                    gridColumn: `${dIdx + 1}`,
                                  }}
                                  onClick={() => {
                                    if (!isFull && isOpen && !isSlotBooked) {
                                      handleCreateBookingForDateTimeWithMinutes(
                                        day,
                                        hour,
                                        minutes,
                                      );
                                    }
                                  }}
                                >
                                  {isFull && isOpen && minutes === 0 && (
                                    <div
                                      className="text-[9px] text-gray-400 font-medium px-1 truncate"
                                    >
                                      Complet
                                    </div>
                                  )}
                                  {!isFull &&
                                    isOpen &&
                                    !isSlotBooked &&
                                    minutes === 0 && (
                                      <div className="opacity-0 group-hover:opacity-100 text-[8px] text-blue-400 font-bold px-1">
                                        + RÉSERVER
                                      </div>
                                    )}
                                </div>
                              );
                            },
                          )}
                        </Fragment>
                      ))}

                          {days.flatMap((day, dayIdx) =>
                        getBookingsForDay(day).map((b: any) => {
                          const placement = getBookingGridPlacement(
                            b,
                            dayIdx,
                          );
                          if (!placement) return null;

                          const start = parseISO(b.start_datetime);
                          const hour = start.getHours();
                          const minutes = start.getMinutes();
                          const hasConflict = !!getAvailabilityBlockForSlot(
                            day,
                            hour,
                            minutes,
                          );

                          // Calculate side-by-side positioning
                          const count = b.concurrent_count || 1;
                          const index = b.concurrent_index || 0;
                          const widthPct = 100 / count;
                          const leftPct = widthPct * index;

                          return (
                            <div
                              key={b.id}
                              style={{
                                ...placement,
                                zIndex: 10,
                                margin: '1px',
                                height: 'calc(100% - 2px)',
                                width: `calc(${widthPct}% - 2px)`,
                                left: `calc(${leftPct}%)`,
                                gridColumn: `${dayIdx + 1} / span 1`,
                                position: 'absolute',
                              }}
                              className={`rounded shadow-sm border px-1.5 py-0.5 text-[10px] cursor-pointer hover:brightness-95 overflow-hidden ${getStatusColor(
                                b.status,
                              )} ${
                                hasConflict ? 'ring-2 ring-red-500 ring-inset' : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBookingForDrawer(b);
                                setShowBookingDrawer(true);
                              }}
                            >
                              <div className="font-bold truncate">
                                {hasConflict && (
                                  <span
                                    className="mr-1 text-red-600 font-black"
                                    title="Conflit avec un blocage"
                                  >
                                    ⚠️
                                  </span>
                                )}
                                {getServiceTypeIcon(b.service_type)}
                                {b.customer_firstname} {b.customer_lastname}
                              </div>
                              <div className="opacity-90 truncate">
                                {format(
                                  parseISO(b.start_datetime),
                                  'HH:mm',
                                )} -{' '}
                                {format(
                                  parseISO(b.end_datetime),
                                  'HH:mm',
                                )}
                              </div>
                            </div>
                          );
                        }),
                      )}
                    </div>
                  </div>
                </div>
                )}
              </div>
            )}
          </Card>

          {/* Légende */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Confirmée (client notifié)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>En attente validation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span>Annulée / No show</span>
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
                {[
                  'Lundi',
                  'Mardi',
                  'Mercredi',
                  'Jeudi',
                  'Vendredi',
                  'Samedi',
                  'Dimanche',
                ].map((dayName, index) => {
                  const dayIndex = index === 6 ? 0 : index + 1;
                  const hours = openingHours.find((h) => h.day === dayIndex);

                  return (
                    <div
                      key={dayName}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-900">
                          {dayName}
                        </span>
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
                <Button
                  variant="ghost"
                  onClick={() => setShowHoursModal(false)}
                  fullWidth
                >
                  Fermer
                </Button>
                <Button fullWidth>Enregistrer</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal validation rapide des RDV en attente */}
        {showPendingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">
                  Valider les rendez-vous en attente
                </h3>
                <button
                  onClick={() => setShowPendingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {pendingBookings.length === 0 ? (
                <div className="py-8 text-center text-gray-600">
                  Aucun rendez-vous en attente de validation pour ce magasin.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-3 border border-gray-200 rounded-xl p-3 bg-white"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                            En attente
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {format(
                              parseISO(booking.start_datetime),
                              'EEEE d MMMM yyyy',
                              { locale: fr },
                            )}
                          </span>
                          <span className="text-sm text-gray-600">
                            à{' '}
                            {format(parseISO(booking.start_datetime), 'HH:mm', {
                              locale: fr,
                            })}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {getServiceTypeIcon(booking.service_type)}
                          {booking.customer_firstname}{' '}
                          {booking.customer_lastname}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {booking.service_name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start md:self-auto">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleQuickConfirm(booking.id)}
                          disabled={
                            !!confirmingId && confirmingId === booking.id
                          }
                        >
                          {confirmingId === booking.id
                            ? 'Validation...'
                            : 'Valider'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Drawer de réservation détaillée */}
        <BookingDrawer
          isOpen={showBookingDrawer}
          booking={selectedBookingForDrawer as any}
          onClose={() => {
            setShowBookingDrawer(false);
            setSelectedBookingForDrawer(null);
          }}
          onUpdate={() => {
            loadBookings();
          }}
        />

        {/* Modal de sélection du type de service */}
        {showServiceTypeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <Card className="max-w-md w-full p-8 shadow-2xl border-0 animate-scale-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Nouvelle réservation</h3>
                <p className="text-gray-500 mt-2">Choisissez le type de prestation à programmer</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => handleSelectServiceTypeAndNavigate('fitting')}
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <Bike className="h-6 w-6 text-blue-600 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Étude posturale</p>
                    <p className="text-xs text-gray-500">Positionnement et ergonomie</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectServiceTypeAndNavigate('workshop')}
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 border-green-100 hover:border-green-500 hover:bg-green-50 transition-all group text-left"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
                    <Wrench className="h-6 w-6 text-green-600 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Atelier mécanique</p>
                    <p className="text-xs text-gray-500">Entretien et réparations</p>
                  </div>
                </button>
              </div>

              <div className="mt-8">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    setShowServiceTypeModal(false);
                    setPendingBookingData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  Annuler
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
