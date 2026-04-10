import type { GuidedSummaryCardResult } from '../../types/guided';

interface GuidedSummaryCardsProps {
  cards: GuidedSummaryCardResult[];
}

function formatValue(value: GuidedSummaryCardResult['value']) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return value;
}

export function GuidedSummaryCards({ cards }: GuidedSummaryCardsProps) {
  if (!cards.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.id} className="rounded border border-gray-200 px-3 py-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</p>
          <p className="text-lg font-semibold text-gray-900">{formatValue(card.value)}</p>
          {card.hint ? <p className="text-xs text-gray-500 mt-1">{card.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

