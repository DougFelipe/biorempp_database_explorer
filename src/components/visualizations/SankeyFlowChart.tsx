import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey as createSankey, sankeyLinkHorizontal } from 'd3-sankey';
import type { SankeyData, SankeyLink, SankeyNode } from '../../types/assets';
import { parseCompoundFromSankeyId, shortLabel } from '../../utils/visualizationData';

type SankeyNodeDatum = SankeyNode & {
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
};

type SankeyLinkDatum = SankeyLink & {
  source: string | SankeyNodeDatum;
  target: string | SankeyNodeDatum;
  width?: number;
};

interface SankeyFlowChartProps {
  sankeyData: SankeyData;
  onSelectCompound: (cpd: string) => void;
}

export function SankeyFlowChart({ sankeyData, onSelectCompound }: SankeyFlowChartProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svgElement = ref.current;
    if (!svgElement) {
      return;
    }

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    if (sankeyData.nodes.length === 0 || sankeyData.links.length === 0) {
      return;
    }

    const width = 980;
    const height = 560;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const graph = {
      nodes: sankeyData.nodes.map((node) => ({ ...node })),
      links: sankeyData.links.map((link) => ({ ...link })),
    };

    const sankeyGenerator = createSankey<any, any>()
      .nodeId((node: SankeyNodeDatum) => node.id)
      .nodeWidth(14)
      .nodePadding(8)
      .extent([
        [1, 1],
        [width - 1, height - 6],
      ]);

    const layout = sankeyGenerator(graph as any) as {
      nodes: SankeyNodeDatum[];
      links: SankeyLinkDatum[];
    };

    const colorByType: Record<SankeyNode['type'], string> = {
      ko: '#06b6d4',
      compound: '#2563eb',
      toxicity: '#ef4444',
    };

    svg
      .append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(layout.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal<any, any>())
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.32)
      .attr('stroke-width', (link: SankeyLinkDatum) => Math.max(1, link.width ?? 1))
      .append('title')
      .text((link: SankeyLinkDatum) => {
        const source =
          typeof link.source === 'object' && link.source !== null && 'label' in link.source
            ? (link.source as SankeyNodeDatum).label
            : String(link.source);
        const target =
          typeof link.target === 'object' && link.target !== null && 'label' in link.target
            ? (link.target as SankeyNodeDatum).label
            : String(link.target);
        return `${source} -> ${target}: ${link.value}`;
      });

    svg
      .append('g')
      .selectAll('rect')
      .data(layout.nodes)
      .join('rect')
      .attr('x', (node: SankeyNodeDatum) => node.x0 ?? 0)
      .attr('y', (node: SankeyNodeDatum) => node.y0 ?? 0)
      .attr('height', (node: SankeyNodeDatum) => Math.max(1, (node.y1 ?? 0) - (node.y0 ?? 0)))
      .attr('width', (node: SankeyNodeDatum) => Math.max(1, (node.x1 ?? 0) - (node.x0 ?? 0)))
      .attr('fill', (node: SankeyNodeDatum) => colorByType[node.type])
      .style('cursor', 'pointer')
      .on('click', (_event, node: SankeyNodeDatum) => {
        const cpd = parseCompoundFromSankeyId(node.id);
        if (cpd) {
          onSelectCompound(cpd);
        }
      })
      .append('title')
      .text((node: SankeyNodeDatum) => `${node.label} (${node.type})`);

    svg
      .append('g')
      .style('font', '11px ui-sans-serif, system-ui, sans-serif')
      .selectAll('text')
      .data(layout.nodes)
      .join('text')
      .attr('x', (node: SankeyNodeDatum) => ((node.x0 ?? 0) < width / 2 ? (node.x1 ?? 0) + 6 : (node.x0 ?? 0) - 6))
      .attr('y', (node: SankeyNodeDatum) => ((node.y0 ?? 0) + (node.y1 ?? 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (node: SankeyNodeDatum) => ((node.x0 ?? 0) < width / 2 ? 'start' : 'end'))
      .text((node: SankeyNodeDatum) => shortLabel(node.label, 28));
  }, [onSelectCompound, sankeyData]);

  if (sankeyData.nodes.length === 0 || sankeyData.links.length === 0) {
    return <p className="text-sm text-gray-500">No sankey data available for the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <svg ref={ref} className="w-full min-w-[980px]" />
    </div>
  );
}
