import type { CompoundSummary } from '../types/database';
import type { NetworkGraphData, SankeyData } from '../types/assets';

export function shortLabel(value: string, max = 24) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

export function formatEndpoint(endpoint: string) {
  return endpoint
    .replace(/^toxicity:/, '')
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getCompoundLabel(compound: CompoundSummary) {
  return compound.compoundname || compound.cpd;
}

export function parseCompoundFromSankeyId(id: string) {
  return id.startsWith('compound:') ? id.replace('compound:', '') : null;
}

export function toFilteredNetworkGraph(
  network: NetworkGraphData,
  filteredCompounds: Set<string>,
  useFilteredSubgraph: boolean
): NetworkGraphData {
  if (!useFilteredSubgraph || filteredCompounds.size === 0) {
    return network;
  }

  const geneSet = new Set<string>();
  const koSet = new Set<string>();
  const pathwaySet = new Set<string>();

  for (const edge of network.edges) {
    if (edge.kind === 'gene_to_compound' && filteredCompounds.has(edge.target)) {
      geneSet.add(edge.source);
    }
  }

  for (const edge of network.edges) {
    if (edge.kind === 'ko_to_gene' && geneSet.has(edge.target)) {
      koSet.add(edge.source);
    }
  }

  for (const edge of network.edges) {
    if (edge.kind === 'compound_to_pathway' && filteredCompounds.has(edge.source)) {
      pathwaySet.add(edge.target);
    }
  }

  const nodeSet = new Set<string>();
  for (const cpd of filteredCompounds) {
    nodeSet.add(cpd);
  }
  for (const gene of geneSet) {
    nodeSet.add(gene);
  }
  for (const ko of koSet) {
    nodeSet.add(ko);
  }
  for (const pathway of pathwaySet) {
    nodeSet.add(pathway);
  }

  return {
    nodes: network.nodes.filter((node) => nodeSet.has(node.id)),
    edges: network.edges.filter((edge) => {
      if (edge.kind === 'gene_to_compound') {
        return geneSet.has(edge.source) && filteredCompounds.has(edge.target);
      }
      if (edge.kind === 'ko_to_gene') {
        return koSet.has(edge.source) && geneSet.has(edge.target);
      }
      return filteredCompounds.has(edge.source) && pathwaySet.has(edge.target);
    }),
  };
}

export function toFilteredSankeyData(
  sankeyData: SankeyData,
  filteredCompounds: Set<string>,
  useFilteredSubgraph: boolean
): SankeyData {
  if (!useFilteredSubgraph || filteredCompounds.size === 0) {
    return sankeyData;
  }

  const prefixedSet = new Set([...filteredCompounds].map((cpd) => `compound:${cpd}`));

  const links = sankeyData.links.filter((link) => {
    if (link.kind === 'ko_to_compound') {
      return prefixedSet.has(link.target);
    }
    return prefixedSet.has(link.source);
  });

  const nodeSet = new Set<string>();
  for (const link of links) {
    nodeSet.add(link.source);
    nodeSet.add(link.target);
  }

  return {
    nodes: sankeyData.nodes.filter((node) => nodeSet.has(node.id)),
    links,
  };
}
