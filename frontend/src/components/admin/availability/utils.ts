import { addDays, addMonths, format, getDay, parseISO } from 'date-fns';
import type { AvailabilityBlockFormData } from './types';

const recurringDaysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const getWeekdayIndex = (day: typeof recurringDaysOrder[number]) => {
  const map: Record<typeof recurringDaysOrder[number], number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };
  return map[day];
};

export const buildRecurringDates = (startDateValue: string, recurringDay: string) => {
  if (!startDateValue) return [] as Date[];
  const startDate = parseISO(startDateValue);
  const targetDay = getWeekdayIndex(recurringDay as typeof recurringDaysOrder[number]);
  const currentDay = getDay(startDate);
  const dayOffset = (targetDay - currentDay + 7) % 7;
  const firstDate = addDays(startDate, dayOffset);
  const endDate = addMonths(firstDate, 12);
  const dates: Date[] = [];
  let cursor = firstDate;

  while (cursor < endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 7);
  }

  return dates;
};

export const buildBlockPayloads = (
  formData: AvailabilityBlockFormData,
  selectedStore: string,
  cancelConflicts: boolean,
) => {
  if (!formData.is_recurring) {
    return [
      {
        store_id: selectedStore,
        start_datetime: `${formData.start_date}T${formData.start_time}:00`,
        end_datetime: `${formData.end_date}T${formData.end_time}:00`,
        reason: formData.reason,
        block_type: formData.block_type,
        service_type: formData.service_type,
        quantity: formData.quantity,
        cancel_conflicts: cancelConflicts,
      },
    ];
  }

  const recurringDates = buildRecurringDates(formData.start_date, formData.recurring_day);
  return recurringDates.map((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      store_id: selectedStore,
      start_datetime: `${dateStr}T${formData.start_time}:00`,
      end_datetime: `${dateStr}T${formData.end_time}:00`,
      reason: formData.reason,
      block_type: 'recurring',
      service_type: formData.service_type,
      quantity: formData.quantity,
      cancel_conflicts: cancelConflicts,
    };
  });
};
