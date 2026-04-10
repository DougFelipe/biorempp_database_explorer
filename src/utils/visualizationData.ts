import type { CompoundSummary } from '../types/database';

export function shortLabel(value: string, max = 24) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

export function formatEndpoint(endpoint: string) {
  const normalized = endpoint
    .replace(/^toxicity:/, '')
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const titled = normalized.replace(/\b\w/g, (char) => char.toUpperCase());
  return titled
    .replace(/\bHerg\b/g, 'hERG')
    .replace(/\bNr\b/g, 'NR')
    .replace(/\bSr\b/g, 'SR')
    .replace(/\bI\b/g, 'I')
    .replace(/\bIi\b/g, 'II');
}

export function getCompoundLabel(compound: CompoundSummary) {
  return compound.compoundname || compound.cpd;
}
