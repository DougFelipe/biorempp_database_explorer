import type { GuidedScatterPoint } from '@/features/guided-analysis/types';

interface ScatterPointRendererProps {
  points: GuidedScatterPoint[];
  yMetricLabel: string;
  classColorMap: Map<string, string>;
  getX: (point: GuidedScatterPoint) => number;
  getY: (point: GuidedScatterPoint) => number;
  getRadius: (point: GuidedScatterPoint) => number;
  onSelectCompound: (cpd: string) => void;
}

export function ScatterPointRenderer({
  points,
  yMetricLabel,
  classColorMap,
  getX,
  getY,
  getRadius,
  onSelectCompound,
}: ScatterPointRendererProps) {
  return (
    <>
      {points.map((point) => {
        const classKey = point.compoundclass || 'Unclassified';
        const color = classColorMap.get(classKey) || '#64748b';

        return (
          <circle
            key={point.cpd}
            data-testid={`scatter-point-${point.cpd}`}
            cx={getX(point)}
            cy={getY(point)}
            r={getRadius(point)}
            fill={color}
            fillOpacity={0.75}
            stroke="#1f2937"
            strokeOpacity={0.25}
            strokeWidth={0.75}
            className="cursor-pointer"
            onClick={() => onSelectCompound(point.cpd)}
          >
            <title>
              {`${point.compoundname || point.cpd} (${point.cpd}) | class=${
                point.compoundclass || 'Unclassified'
              } | gene_count=${point.gene_count} | ${yMetricLabel}=${point.y_value.toFixed(
                3
              )} | pathway_count=${point.pathway_count}`}
            </title>
          </circle>
        );
      })}
    </>
  );
}
