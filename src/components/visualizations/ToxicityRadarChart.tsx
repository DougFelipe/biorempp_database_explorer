import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { CompoundSummary } from '../../types/database';
import type { ToxicityMatrixRow } from '../../types/assets';
import { formatEndpoint, getCompoundLabel, shortLabel } from '../../utils/visualizationData';

interface ToxicityRadarChartProps {
  toxicityRows: ToxicityMatrixRow[];
  compounds: CompoundSummary[];
  selectedCompoundCpd: string | null;
  onSelectCompound: (cpd: string) => void;
}

export function ToxicityRadarChart({
  toxicityRows,
  compounds,
  selectedCompoundCpd,
  onSelectCompound,
}: ToxicityRadarChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [endpointLimit, setEndpointLimit] = useState(12);

  const selectedCompound = useMemo(
    () => compounds.find((compound) => compound.cpd === selectedCompoundCpd) ?? null,
    [compounds, selectedCompoundCpd]
  );

  const radarData = useMemo(() => {
    if (!selectedCompound) {
      return [];
    }

    return toxicityRows
      .filter((row) => row.cpd === selectedCompound.cpd && row.value !== null)
      .map((row) => ({
        endpoint: row.endpoint,
        value: row.value ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, endpointLimit);
  }, [endpointLimit, selectedCompound, toxicityRows]);

  useEffect(() => {
    const svgElement = ref.current;
    if (!svgElement) {
      return;
    }

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    if (!selectedCompound || radarData.length === 0) {
      return;
    }

    const width = 760;
    const height = 560;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 190;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const maxValue = d3.max(radarData, (entry) => entry.value) ?? 1;
    const r = d3.scaleLinear().domain([0, Math.max(1, maxValue)]).range([0, radius]);
    const angle = d3
      .scaleLinear()
      .domain([0, radarData.length])
      .range([0, Math.PI * 2]);

    const grid = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);
    const levels = 5;

    for (let level = 1; level <= levels; level += 1) {
      const levelRadius = (radius * level) / levels;
      grid
        .append('circle')
        .attr('r', levelRadius)
        .attr('fill', 'none')
        .attr('stroke', '#d1d5db')
        .attr('stroke-width', 1);
    }

    const line = d3
      .lineRadial<{ endpoint: string; value: number }>()
      .angle((_entry, index) => angle(index))
      .radius((entry) => r(entry.value))
      .curve(d3.curveLinearClosed);

    grid
      .append('path')
      .datum(radarData)
      .attr('d', line)
      .attr('fill', 'rgba(37,99,235,0.22)')
      .attr('stroke', '#1d4ed8')
      .attr('stroke-width', 2);

    const axes = grid.append('g');
    radarData.forEach((entry, index) => {
      const angleValue = angle(index);
      const x = Math.cos(angleValue - Math.PI / 2) * radius;
      const y = Math.sin(angleValue - Math.PI / 2) * radius;

      axes
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1);

      axes
        .append('text')
        .attr('x', Math.cos(angleValue - Math.PI / 2) * (radius + 16))
        .attr('y', Math.sin(angleValue - Math.PI / 2) * (radius + 16))
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('fill', '#374151')
        .text(shortLabel(formatEndpoint(entry.endpoint), 18));
    });
  }, [radarData, selectedCompound]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Compound</label>
          <select
            value={selectedCompoundCpd || ''}
            onChange={(event) => onSelectCompound(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {compounds.map((compound) => (
              <option key={compound.cpd} value={compound.cpd}>
                {compound.cpd} - {shortLabel(getCompoundLabel(compound), 40)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Endpoint count</label>
          <input
            type="range"
            min={6}
            max={31}
            value={endpointLimit}
            onChange={(event) => setEndpointLimit(Number(event.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Top {endpointLimit} endpoints by value</p>
        </div>
      </div>

      {!selectedCompound || radarData.length === 0 ? (
        <p className="text-sm text-gray-500">No toxicity profile available for the selected compound.</p>
      ) : (
        <svg ref={ref} className="w-full" />
      )}
    </div>
  );
}
