import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import type { CompoundSummary } from '../../types/database';
import { getCompoundLabel, shortLabel } from '../../utils/visualizationData';

interface CompoundRankingBarChartProps {
  compounds: CompoundSummary[];
  topN: number;
  onSelectCompound: (cpd: string) => void;
}

export function CompoundRankingBarChart({
  compounds,
  topN,
  onSelectCompound,
}: CompoundRankingBarChartProps) {
  const ref = useRef<SVGSVGElement>(null);

  const topCompounds = useMemo(
    () =>
      [...compounds]
        .filter((compound) => compound.toxicity_risk_mean !== null)
        .sort((a, b) => b.gene_count - a.gene_count || a.cpd.localeCompare(b.cpd))
        .slice(0, topN),
    [compounds, topN]
  );

  useEffect(() => {
    const svgElement = ref.current;
    if (!svgElement) {
      return;
    }

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    if (topCompounds.length === 0) {
      return;
    }

    const width = Math.max(900, topCompounds.length * 56 + 180);
    const height = 360;
    const margin = { top: 20, right: 24, bottom: 125, left: 70 };

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const x = d3
      .scaleBand<string>()
      .domain(topCompounds.map((compound) => compound.cpd))
      .range([margin.left, width - margin.right])
      .padding(0.16);

    const yMax = d3.max(topCompounds, (compound) => compound.gene_count) ?? 1;
    const y = d3
      .scaleLinear()
      .domain([0, Math.max(1, yMax)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append('g')
      .selectAll('rect')
      .data(topCompounds)
      .join('rect')
      .attr('x', (compound: CompoundSummary) => x(compound.cpd) ?? 0)
      .attr('y', (compound: CompoundSummary) => y(compound.gene_count))
      .attr('width', x.bandwidth())
      .attr('height', (compound: CompoundSummary) => y(0) - y(compound.gene_count))
      .attr('fill', '#2563eb')
      .style('cursor', 'pointer')
      .on('click', (_event, compound: CompoundSummary) => onSelectCompound(compound.cpd))
      .append('title')
      .text((compound: CompoundSummary) => `${getCompoundLabel(compound)}: ${compound.gene_count} genes`);

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .tickFormat((cpd: string) =>
            shortLabel(getCompoundLabel(topCompounds.find((item) => item.cpd === cpd) ?? topCompounds[0]), 20)
          )
      )
      .selectAll('text')
      .attr('transform', 'rotate(-35)')
      .attr('text-anchor', 'end');

    svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6));
  }, [onSelectCompound, topCompounds]);

  if (topCompounds.length === 0) {
    return <p className="text-sm text-gray-500">No compounds available for the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <svg ref={ref} className="w-full min-w-[900px]" />
    </div>
  );
}
