import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { CompoundSummary } from '../../types/database';
import { getCompoundLabel, shortLabel } from '../../utils/visualizationData';

interface CompoundPathwayHeatmapProps {
  compounds: CompoundSummary[];
  onSelectCompound: (cpd: string) => void;
}

export function CompoundPathwayHeatmap({
  compounds,
  onSelectCompound,
}: CompoundPathwayHeatmapProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svgElement = ref.current;
    if (!svgElement) {
      return;
    }

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    if (compounds.length === 0) {
      return;
    }

    const topCompounds = [...compounds]
      .sort((a, b) => b.gene_count - a.gene_count || a.cpd.localeCompare(b.cpd))
      .slice(0, 20);

    const pathwayFrequency = new Map<string, number>();
    for (const compound of compounds) {
      for (const pathway of compound.pathways) {
        pathwayFrequency.set(pathway, (pathwayFrequency.get(pathway) ?? 0) + 1);
      }
    }

    const topPathways = [...pathwayFrequency.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 18)
      .map(([pathway]) => pathway);

    if (topPathways.length === 0) {
      return;
    }

    const width = Math.max(960, topPathways.length * 36 + 280);
    const height = Math.max(360, topCompounds.length * 30 + 110);
    const margin = { top: 20, right: 24, bottom: 90, left: 250 };

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const x = d3
      .scaleBand<string>()
      .domain(topPathways)
      .range([margin.left, width - margin.right])
      .padding(0.05);

    const y = d3
      .scaleBand<string>()
      .domain(topCompounds.map((compound) => compound.cpd))
      .range([margin.top, height - margin.bottom])
      .padding(0.05);

    const matrix = topCompounds.flatMap((compound) =>
      topPathways.map((pathway) => ({
        cpd: compound.cpd,
        pathway,
        value: compound.pathways.includes(pathway) ? 1 : 0,
      }))
    );

    svg
      .append('g')
      .selectAll('rect')
      .data(matrix)
      .join('rect')
      .attr('x', (entry) => x(entry.pathway) ?? 0)
      .attr('y', (entry) => y(entry.cpd) ?? 0)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', (entry) => (entry.value ? '#2563eb' : '#e5e7eb'))
      .style('cursor', 'pointer')
      .on('click', (_event, entry) => onSelectCompound(entry.cpd))
      .append('title')
      .text((entry) => `${entry.cpd} x ${entry.pathway}: ${entry.value ? 'Present' : 'Absent'}`);

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat((pathway: string) => shortLabel(pathway, 18)))
      .selectAll('text')
      .attr('transform', 'rotate(-35)')
      .attr('text-anchor', 'end');

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(
        d3
          .axisLeft(y)
          .tickFormat((cpd: string) => shortLabel(getCompoundLabel(topCompounds.find((item) => item.cpd === cpd) ?? topCompounds[0]), 28))
      );
  }, [compounds, onSelectCompound]);

  if (compounds.length === 0) {
    return <p className="text-sm text-gray-500">No compounds available for the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <svg ref={ref} className="w-full min-w-[960px]" />
    </div>
  );
}
