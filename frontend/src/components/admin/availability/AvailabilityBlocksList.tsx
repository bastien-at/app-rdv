import { Calendar, Clock, Trash2 } from 'lucide-react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Badge from '../../Badge';
import Button from '../../Button';
import Card from '../../Card';
import type { AvailabilityBlock } from './types';

interface AvailabilityBlocksListProps {
  blocks: AvailabilityBlock[];
  loading: boolean;
  showHistory: boolean;
  onToggleHistory: () => void;
  onDelete: (id: string) => void;
  onDeleteRecurring: (ids: string[]) => void;
}

const getBlockTypeBadge = (type: AvailabilityBlock['block_type']) => {
  switch (type) {
    case 'closure':
      return <Badge variant="error">Fermeture</Badge>;
    case 'maintenance':
      return <Badge variant="warning">Maintenance</Badge>;
    case 'holiday':
      return <Badge variant="info">Congés</Badge>;
    default:
      return <Badge variant="info">Autre</Badge>;
  }
};

export default function AvailabilityBlocksList({
  blocks,
  loading,
  showHistory,
  onToggleHistory,
  onDelete,
  onDeleteRecurring,
}: AvailabilityBlocksListProps) {
  const recurringBlocks = blocks.filter((block) => block.block_type === 'recurring');
  const groupedByKey = recurringBlocks.reduce((acc, block) => {
    const start = parseISO(block.start_datetime);
    const end = parseISO(block.end_datetime);
    const dayKey = format(start, 'EEEE', { locale: fr });
    const timeKey = `${format(start, 'HH:mm')}|${format(end, 'HH:mm')}`;
    const key = [dayKey, timeKey].join('|');

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(block);
    return acc;
  }, {} as Record<string, AvailabilityBlock[]>);

  const recurringSummaries = Object.values(groupedByKey)
    .map((group) => {
      const sorted = [...group].sort((a, b) => (
        parseISO(a.start_datetime).getTime() - parseISO(b.start_datetime).getTime()
      ));
      return {
        blocks: sorted,
        first: sorted[0],
        last: sorted[sorted.length - 1],
      };
    })
    .filter((summary): summary is { blocks: AvailabilityBlock[]; first: AvailabilityBlock; last: AvailabilityBlock } => !!summary && summary.blocks.length > 0);

  const visibleBlocks = blocks
    .filter((block) => block.block_type !== 'recurring')
    .filter((block) => {
      if (showHistory) return true;
      return new Date(block.end_datetime) > new Date();
    });

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Périodes bloquées exceptionnelles</h2>
        <button
          onClick={onToggleHistory}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
            showHistory
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {showHistory ? "Masquer l'historique" : "Voir l'historique"}
        </button>
      </div>

      {recurringSummaries.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">Blocages récurrents</h3>
          {recurringSummaries.map(({ first, last, blocks: summaryBlocks }) => {
            const start = parseISO(first.start_datetime);
            const end = parseISO(first.end_datetime);
            const dayLabel = format(start, 'EEEE', { locale: fr });
            const startTime = format(start, 'HH:mm');
            const endTime = format(end, 'HH:mm');
            const endDate = format(parseISO(last.end_datetime), 'dd/MM/yyyy', { locale: fr });
            const recurringIds = summaryBlocks
              .map((block) => block.id)
              .filter((id): id is string => Boolean(id));

            return (
              <div key={`${first.id}-${last.id}`} className="border border-blue-100 bg-blue-50/60 rounded-lg p-3 text-sm text-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">Blocage récurrent</div>
                    <div>
                      Tous les {dayLabel} de {startTime} à {endTime} jusqu'au {endDate}
                    </div>
                    <div className="text-xs text-gray-500">
                      {summaryBlocks.length} occurrence(s) regroupées
                    </div>
                  </div>
                  {recurringIds.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteRecurring(recurringIds)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Chargement...</p>
        </div>
      ) : visibleBlocks.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Aucun blocage configuré</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleBlocks.map((block) => (
            <div
              key={block.id}
              className={`border rounded-lg p-4 transition-colors ${
                new Date(block.end_datetime) < new Date()
                  ? 'border-gray-100 bg-gray-50 opacity-75'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getBlockTypeBadge(block.block_type)}
                    <span className="font-medium text-gray-900">{block.reason}</span>
                    {block.service_type ? (
                      <Badge variant={block.service_type === 'workshop' ? 'warning' : 'info'}>
                        {block.service_type === 'workshop' ? 'Atelier' : 'Étude posturale'}
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Tous les services</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Du {format(new Date(block.start_datetime), 'dd/MM/yyyy', { locale: fr })}
                        {' '}au {format(new Date(block.end_datetime), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(block.start_datetime), 'HH:mm', { locale: fr })}
                        {' '}-{' '}
                        {format(new Date(block.end_datetime), 'HH:mm', { locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
                {block.id && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => onDelete(block.id!)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {visibleBlocks.length === 0 && !showHistory && blocks.length > 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Aucun blocage à venir.{' '}
              <button onClick={onToggleHistory} className="text-blue-600 hover:underline">
                Voir l'historique
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
