import type { GuidedBoxplotGroup } from '../../types/guided';

interface BoxplotChartProps {
	groups: GuidedBoxplotGroup[];
	emptyMessage: string;
	valueFormatter?: (value: number) => string;
	yLabel?: string;
}

export function BoxplotChart({
	groups,
	emptyMessage,
	valueFormatter = (value) => value.toFixed(3),
	yLabel,
}: BoxplotChartProps) {
	if (groups.length === 0) {
		return <p className="text-sm text-gray-500">{emptyMessage}</p>;
	}

	const chartHeight = 340;
	const axisLeft = 46;
	const axisTop = 12;
	const axisBottom = 62;
	const axisHeight = chartHeight - axisTop - axisBottom;
	const axisWidth = Math.max(760, groups.length * 92);
	const svgWidth = axisLeft + axisWidth + 10;
	const svgHeight = chartHeight;

	const palette = ['#6bc1c9', '#f2a1a1', '#f0d16d', '#e7d09f', '#cab9ea', '#99b7ef', '#9ddfbe', '#f3b37a'];
	const ticks = [1, 0.75, 0.5, 0.25, 0];

	const toY = (value: number) => axisTop + (1 - Math.max(0, Math.min(1, value))) * axisHeight;

	return (
		<div className="space-y-3">
			{yLabel ? <p className="text-xs text-gray-600">{yLabel}</p> : null}

			<div className="overflow-x-auto rounded border border-gray-200 bg-white p-2">
				<svg
					role="img"
					aria-label="Boxplot chart"
					width={svgWidth}
					height={svgHeight}
					viewBox={`0 0 ${svgWidth} ${svgHeight}`}
				>
					{ticks.map((tick) => {
						const y = toY(tick);
						return (
							<g key={`tick-${tick}`}>
								<line x1={axisLeft} x2={axisLeft + axisWidth} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />
								<text x={axisLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
									{tick.toFixed(2)}
								</text>
							</g>
						);
					})}

					<line x1={axisLeft} x2={axisLeft} y1={axisTop} y2={axisTop + axisHeight} stroke="#9ca3af" strokeWidth="1.2" />
					<line
						x1={axisLeft}
						x2={axisLeft + axisWidth}
						y1={axisTop + axisHeight}
						y2={axisTop + axisHeight}
						stroke="#9ca3af"
						strokeWidth="1.2"
					/>

					<text
						x={14}
						y={axisTop + axisHeight / 2}
						textAnchor="middle"
						transform={`rotate(-90 14 ${axisTop + axisHeight / 2})`}
						fontSize="11"
						fill="#374151"
					>
						Score
					</text>

					{groups.map((group, idx) => {
						const spacing = axisWidth / Math.max(1, groups.length);
						const centerX = axisLeft + spacing * idx + spacing / 2;
						const boxWidth = Math.min(28, spacing * 0.42);
						const color = palette[idx % palette.length];
						const pointValues = Array.isArray(group.points) ? group.points : [];
						const pointJitter = Math.max(3, boxWidth * 0.42);

						const yMin = toY(group.min);
						const yQ1 = toY(group.q1);
						const yMedian = toY(group.median);
						const yQ3 = toY(group.q3);
						const yMax = toY(group.max);

						return (
							<g key={group.id}>
								<title>
									{`${group.label} | n=${group.count} | min=${valueFormatter(group.min)} q1=${valueFormatter(group.q1)} median=${valueFormatter(group.median)} q3=${valueFormatter(group.q3)} max=${valueFormatter(group.max)}`}
								</title>

								<line x1={centerX} x2={centerX} y1={yMax} y2={yQ3} stroke="#6b7280" strokeWidth="1.2" />
								<line x1={centerX} x2={centerX} y1={yQ1} y2={yMin} stroke="#6b7280" strokeWidth="1.2" />

								<line x1={centerX - 8} x2={centerX + 8} y1={yMax} y2={yMax} stroke="#6b7280" strokeWidth="1.2" />
								<line x1={centerX - 8} x2={centerX + 8} y1={yMin} y2={yMin} stroke="#6b7280" strokeWidth="1.2" />

								<rect
									x={centerX - boxWidth / 2}
									y={yQ3}
									width={boxWidth}
									height={Math.max(1, yQ1 - yQ3)}
									fill={color}
									fillOpacity="0.45"
									stroke={color}
									strokeWidth="1.3"
									rx="2"
								/>

								<line
									x1={centerX - boxWidth / 2}
									x2={centerX + boxWidth / 2}
									y1={yMedian}
									y2={yMedian}
									stroke="#374151"
									strokeWidth="1.5"
								/>

								{pointValues.map((point, pointIdx) => {
									const yPoint = toY(point.toxicity_value);
									const phase = (pointIdx + 1) * 12.9898 + (idx + 1) * 78.233;
									const jitter = Math.sin(phase) * pointJitter;
									const compoundLabel = point.compoundname && point.compoundname.trim() !== '' ? `${point.cpd} (${point.compoundname})` : point.cpd;
									const endpointLabel = point.endpoint || 'selected endpoint';
									return (
										<circle
											key={`${group.id}-pt-${pointIdx}`}
											cx={centerX + jitter}
											cy={yPoint}
											r={2.2}
											fill={color}
											fillOpacity="0.6"
											stroke="#4b5563"
											strokeWidth="0.35"
										>
											<title>{`${group.label} | ${compoundLabel} | ${endpointLabel}: ${valueFormatter(point.toxicity_value)}`}</title>
										</circle>
									);
								})}

								<text
									x={centerX}
									y={axisTop + axisHeight + 20}
									textAnchor="middle"
									fontSize="11"
									fill="#4b5563"
								>
									{group.label.length > 12 ? `${group.label.slice(0, 12)}...` : group.label}
								</text>
							</g>
						);
					})}
				</svg>
			</div>

			<p className="text-[11px] text-gray-500">Classic boxplot with overlay points: whiskers (min/max), box (Q1-Q3), center line (median), dots (sampled data values).</p>
		</div>
	);
}
