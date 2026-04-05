import type { CompoundFilters, CompoundSummary } from '../types/database';

function parseReferenceList(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function containsReference(compound: CompoundSummary, referenceAg: string) {
  return parseReferenceList(compound.reference_ag).includes(referenceAg);
}

export function applyCompoundFilters(compounds: CompoundSummary[], filters: CompoundFilters) {
  return compounds.filter((compound) => {
    if (filters.compoundclass && compound.compoundclass !== filters.compoundclass) {
      return false;
    }

    if (filters.reference_ag && !containsReference(compound, filters.reference_ag)) {
      return false;
    }

    if (filters.pathway && !compound.pathways.includes(filters.pathway)) {
      return false;
    }

    if (filters.gene && !compound.genes.includes(filters.gene)) {
      return false;
    }

    if (filters.ko_count_min !== undefined && compound.ko_count < filters.ko_count_min) {
      return false;
    }

    if (filters.ko_count_max !== undefined && compound.ko_count > filters.ko_count_max) {
      return false;
    }

    if (filters.gene_count_min !== undefined && compound.gene_count < filters.gene_count_min) {
      return false;
    }

    if (filters.gene_count_max !== undefined && compound.gene_count > filters.gene_count_max) {
      return false;
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      const name = (compound.compoundname || '').toLowerCase();
      const cpd = compound.cpd.toLowerCase();
      if (!name.includes(search) && !cpd.includes(search)) {
        return false;
      }
    }

    return true;
  });
}

export function getCompoundFilterMetadata(compounds: CompoundSummary[]) {
  const classSet = new Set<string>();
  const referenceSet = new Set<string>();
  const geneSet = new Set<string>();
  const pathwaySet = new Set<string>();

  for (const compound of compounds) {
    if (compound.compoundclass) {
      classSet.add(compound.compoundclass);
    }

    for (const referenceAg of parseReferenceList(compound.reference_ag)) {
      referenceSet.add(referenceAg);
    }

    for (const gene of compound.genes) {
      if (gene) {
        geneSet.add(gene);
      }
    }

    for (const pathway of compound.pathways) {
      if (pathway) {
        pathwaySet.add(pathway);
      }
    }
  }

  return {
    compoundClasses: [...classSet].sort((a, b) => a.localeCompare(b)),
    referenceAGs: [...referenceSet].sort((a, b) => a.localeCompare(b)),
    genes: [...geneSet].sort((a, b) => a.localeCompare(b)),
    pathways: [...pathwaySet].sort((a, b) => a.localeCompare(b)),
  };
}
