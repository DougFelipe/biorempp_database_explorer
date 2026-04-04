import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import type { CompoundSummary } from '../types/database';

interface CompoundVisualizationsProps {
  compounds: CompoundSummary[];
  loading: boolean;
  error: string | null;
}

type HeatmapCell = {
  cpd: string;
  pathway: string;
  value: number;
  label: string;
};

function shortLabel(value: string, max = 22) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

function compoundLabel(compound: CompoundSummary) {
  return compound.compoundname || compound.cpd;
}

function drawBarplot(svgElement: SVGSVGElement, data: CompoundSummary[]) {
  const svg = d3.select(svgElement);
  svg.selectAll('*').remove();

  if (data.length === 0) {
    return;
  }

  const width = Math.max(900, data.length * 55 + 160);
  const height = 360;
  const margin = { top: 20, right: 24, bottom: 125, left: 70 };
  const labelByCpd = new Map<string, string>(
    data.map((compound) => [compound.cpd, compoundLabel(compound)])
  );

  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img');

  const x = d3
    .scaleBand<string>()
    .domain(data.map((compound) => compound.cpd))
    .range([margin.left, width - margin.right])
    .padding(0.15);

  const yMax = d3.max(data, (compound) => compound.gene_count) ?? 1;
  const y = d3
    .scaleLinear()
    .domain([0, Math.max(1, yMax)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append('g')
    .selectAll('rect')
    .data(data)
    .join('rect')
    .attr('x', (compound: CompoundSummary) => x(compound.cpd) ?? 0)
    .attr('y', (compound: CompoundSummary) => y(compound.gene_count))
    .attr('width', x.bandwidth())
    .attr('height', (compound: CompoundSummary) => y(0) - y(compound.gene_count))
    .attr('fill', '#2563eb')
    .append('title')
    .text((compound: CompoundSummary) => `${compoundLabel(compound)}: ${compound.gene_count} genes`);

  svg
    .append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat((cpd: string) => shortLabel(labelByCpd.get(cpd) ?? cpd)))
    .selectAll('text')
    .attr('transform', 'rotate(-35)')
    .attr('text-anchor', 'end');

  svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6));

  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', height - 8)
    .attr('text-anchor', 'middle')
    .attr('fill', '#374151')
    .attr('font-size', 12)
    .text('Compound');

  svg
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(height / 2))
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .attr('fill', '#374151')
    .attr('font-size', 12)
    .text('Gene count');
}

function drawScatter(svgElement: SVGSVGElement, data: CompoundSummary[]) {
  const svg = d3.select(svgElement);
  svg.selectAll('*').remove();

  if (data.length === 0) {
    return;
  }

  const width = 920;
  const height = 360;
  const margin = { top: 20, right: 24, bottom: 50, left: 64 };
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img');

  const xMax = d3.max(data, (compound) => compound.gene_count) ?? 1;
  const yMax = d3.max(data, (compound) => compound.toxicity_score) ?? 1;

  const x = d3
    .scaleLinear()
    .domain([0, Math.max(1, xMax)])
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain([0, Math.max(1, yMax)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const classes = Array.from(new Set(data.map((compound) => compound.compoundclass || 'Unknown'))).sort();
  const color = d3.scaleOrdinal<string, string>(d3.schemeTableau10).domain(classes);

  svg
    .append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(8));
  svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6));

  svg
    .append('g')
    .selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', (compound: CompoundSummary) => x(compound.gene_count))
    .attr('cy', (compound: CompoundSummary) => y(compound.toxicity_score))
    .attr('r', 4)
    .attr('opacity', 0.85)
    .attr('fill', (compound: CompoundSummary) => color(compound.compoundclass || 'Unknown'))
    .append('title')
    .text(
      (compound: CompoundSummary) =>
        `${compoundLabel(compound)}\nGene count: ${compound.gene_count}\nToxicity score: ${compound.toxicity_score.toFixed(4)}`
    );

  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', height - 12)
    .attr('text-anchor', 'middle')
    .attr('fill', '#374151')
    .attr('font-size', 12)
    .text('Gene count');

  svg
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(height / 2))
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .attr('fill', '#374151')
    .attr('font-size', 12)
    .text('Toxicity score');
}

function drawHeatmap(svgElement: SVGSVGElement, compounds: CompoundSummary[]) {
  const svg = d3.select(svgElement);
  svg.selectAll('*').remove();

  if (compounds.length === 0) {
    return;
  }

  const topCompounds = compounds.slice(0, 20);
  const pathwayFrequency = new Map<string, number>();

  for (const compound of compounds) {
    for (const pathway of compound.pathways) {
      pathwayFrequency.set(pathway, (pathwayFrequency.get(pathway) ?? 0) + 1);
    }
  }

  const topPathways = [...pathwayFrequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 15)
    .map(([pathway]) => pathway);

  if (topPathways.length === 0) {
    return;
  }

  const cellSize = 24;
  const width = Math.max(900, topPathways.length * cellSize + 280);
  const height = Math.max(320, topCompounds.length * cellSize + 130);
  const margin = { top: 30, right: 24, bottom: 70, left: 250 };
  const labelByCpd = new Map<string, string>(
    topCompounds.map((compound) => [compound.cpd, compoundLabel(compound)])
  );

  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img');

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
  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, 1]);

  const matrix: HeatmapCell[] = topCompounds.flatMap((compound) =>
    topPathways.map((pathway) => ({
      cpd: compound.cpd,
      pathway,
      value: compound.pathways.includes(pathway) ? 1 : 0,
      label: compoundLabel(compound),
    }))
  );

  svg
    .append('g')
    .selectAll('rect')
    .data(matrix)
    .join('rect')
    .attr('x', (item: HeatmapCell) => x(item.pathway) ?? 0)
    .attr('y', (item: HeatmapCell) => y(item.cpd) ?? 0)
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('fill', (item: HeatmapCell) => color(item.value))
    .attr('stroke', '#e5e7eb')
    .attr('stroke-width', 0.5)
    .append('title')
    .text((item: HeatmapCell) => `${item.label} x ${item.pathway}: ${item.value === 1 ? 'Present' : 'Absent'}`);

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
    .call(d3.axisLeft(y).tickFormat((cpd: string) => shortLabel(labelByCpd.get(cpd) ?? cpd, 26)));
}

export function CompoundVisualizations({ compounds, loading, error }: CompoundVisualizationsProps) {
  const barRef = useRef<SVGSVGElement>(null);
  const scatterRef = useRef<SVGSVGElement>(null);
  const heatmapRef = useRef<SVGSVGElement>(null);

  const topBarData = useMemo(
    () =>
      [...compounds]
        .sort((a, b) => b.gene_count - a.gene_count || a.cpd.localeCompare(b.cpd))
        .slice(0, 20),
    [compounds]
  );

  const scatterData = useMemo(
    () => [...compounds].sort((a, b) => a.cpd.localeCompare(b.cpd)),
    [compounds]
  );

  const heatmapData = useMemo(
    () =>
      [...compounds]
        .sort((a, b) => b.gene_count - a.gene_count || a.cpd.localeCompare(b.cpd))
        .slice(0, 40),
    [compounds]
  );

  useEffect(() => {
    if (barRef.current) {
      drawBarplot(barRef.current, topBarData);
    }
  }, [topBarData]);

  useEffect(() => {
    if (scatterRef.current) {
      drawScatter(scatterRef.current, scatterData);
    }
  }, [scatterData]);

  useEffect(() => {
    if (heatmapRef.current) {
      drawHeatmap(heatmapRef.current, heatmapData);
    }
  }, [heatmapData]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Visual Analytics (Phase 1)</h3>
        <p className="text-sm text-gray-600">
          Barplot, scatter and heatmap driven by static assets (`/assets/v0.0.2`) and synchronized with the active compound filters.
        </p>
      </div>

      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-gray-600">
          Loading visualization assets...
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6 text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && compounds.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-gray-600">
          No compounds available for the current filter set.
        </div>
      )}

      {!loading && !error && compounds.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">CompoundRankingBarChart</h4>
            <div className="overflow-x-auto">
              <svg ref={barRef} className="w-full min-w-[900px]" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">PrioritizationScatter</h4>
            <svg ref={scatterRef} className="w-full" />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">CompoundPathwayHeatmap</h4>
            <div className="overflow-x-auto">
              <svg ref={heatmapRef} className="w-full min-w-[900px]" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
