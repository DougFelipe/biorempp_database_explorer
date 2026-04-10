const GROUP_DEFINITIONS = [
  {
    key: 'ecotoxicity',
    title: 'Ecotoxicity',
    endpoints: ['avian', 'crustacean', 'fathead_minnow', 'honey_bee', 't._pyriformis', 'biodegradation'],
  },
  {
    key: 'genotoxicity_carcinogenicity',
    title: 'Genotoxicity & Carcinogenicity',
    endpoints: ['genomic_ames_mutagenesis', 'genomic_carcinogenesis', 'genomic_micronucleus'],
  },
  {
    key: 'nuclear_receptors',
    title: 'Nuclear Receptors (NR)',
    endpoints: [
      'nr_ahr',
      'nr_ar',
      'nr_ar_lbd',
      'nr_aromatase',
      'nr_er',
      'nr_er_lbd',
      'nr_gr',
      'nr_ppar_gamma',
      'nr_tr',
    ],
  },
  {
    key: 'stress_response',
    title: 'Stress Response (SR)',
    endpoints: ['sr_are', 'sr_atad5', 'sr_hse', 'sr_mmp', 'sr_p53'],
  },
  {
    key: 'organ_irritation',
    title: 'Organ / Irritation',
    endpoints: [
      'eye_corrosion',
      'eye_irritation',
      'skin_sensitisation',
      'liver_injury_i',
      'liver_injury_ii',
      'respiratory_disease',
      'herg_i_inhibitor',
      'herg_ii_inhibitor',
    ],
  },
];

const groupByEndpoint = new Map();
const endpointSortIndex = new Map();
for (const group of GROUP_DEFINITIONS) {
  group.endpoints.forEach((endpoint, idx) => {
    groupByEndpoint.set(endpoint, group.key);
    endpointSortIndex.set(endpoint, idx);
  });
}

const groupSortIndex = new Map([
  ['ecotoxicity', 0],
  ['genotoxicity_carcinogenicity', 1],
  ['nuclear_receptors', 2],
  ['stress_response', 3],
  ['organ_irritation', 4],
  ['other', 5],
]);

export function formatEndpoint(endpoint) {
  const normalized = String(endpoint || '')
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

export function getEndpointGroupKey(endpoint) {
  return groupByEndpoint.get(endpoint) ?? 'other';
}

export function getEndpointGroupTitle(groupKey) {
  if (groupKey === 'other') {
    return 'Other';
  }
  return GROUP_DEFINITIONS.find((group) => group.key === groupKey)?.title ?? 'Other';
}

export function getEndpointSortTuple(endpoint) {
  const groupKey = getEndpointGroupKey(endpoint);
  return [
    groupSortIndex.get(groupKey) ?? 999,
    endpointSortIndex.get(endpoint) ?? 999,
    formatEndpoint(endpoint),
  ];
}

export const TOXICITY_ENDPOINT_GROUPS = [
  ...GROUP_DEFINITIONS.map((group) => ({
    key: group.key,
    title: group.title,
    endpoints: [...group.endpoints],
  })),
  {
    key: 'other',
    title: 'Other',
    endpoints: [],
  },
];

