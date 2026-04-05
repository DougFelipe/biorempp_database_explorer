import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { NetworkGraphData, NetworkGraphNode } from '../../types/assets';
import { shortLabel } from '../../utils/visualizationData';

type NetworkNodePoint = NetworkGraphNode & d3.SimulationNodeDatum;

type NetworkLinkPoint = {
  source: NetworkNodePoint;
  target: NetworkNodePoint;
  kind: 'ko_to_gene' | 'gene_to_compound' | 'compound_to_pathway';
};

interface NetworkGraphCanvasProps {
  graph: NetworkGraphData;
  highlightedCompounds: Set<string>;
  onSelectCompound: (cpd: string) => void;
}

export function NetworkGraphCanvas({
  graph,
  highlightedCompounds,
  onSelectCompound,
}: NetworkGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 960, height: 620 });
  const [renderLevel, setRenderLevel] = useState(0);
  const renderLevelRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const width = Math.max(720, Math.floor(entry.contentRect.width));
      setDimensions({ width, height: 620 });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    renderLevelRef.current = 0;
    setRenderLevel(0);
  }, [graph.nodes.length, graph.edges.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const nodeById = new Map<string, NetworkNodePoint>();
    const nodes: NetworkNodePoint[] = graph.nodes.map((node) => {
      const point: NetworkNodePoint = {
        ...node,
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
      };
      nodeById.set(point.id, point);
      return point;
    });

    const links: NetworkLinkPoint[] = graph.edges
      .map((edge) => {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        if (!source || !target) {
          return null;
        }
        return {
          source,
          target,
          kind: edge.kind,
        };
      })
      .filter((link): link is NetworkLinkPoint => Boolean(link));

    const sampledLinks = links.filter((_link, index) => index % 3 === 0);
    const transformRef = { current: d3.zoomIdentity };
    let hoveredNode: NetworkNodePoint | null = null;
    let slowFrames = 0;
    let lastFrame = performance.now();

    const getNodeRadius = (node: NetworkNodePoint) => {
      if (node.type === 'compound') {
        return 4.6;
      }
      if (node.type === 'pathway') {
        return 4;
      }
      if (node.type === 'gene') {
        return 3.5;
      }
      return 3.2;
    };

    const nodeColor = (node: NetworkNodePoint) => {
      if (node.type === 'compound') {
        if (highlightedCompounds.size > 0 && !highlightedCompounds.has(node.id)) {
          return '#93c5fd';
        }
        return '#2563eb';
      }
      if (node.type === 'gene') {
        return '#f97316';
      }
      if (node.type === 'pathway') {
        return '#22c55e';
      }
      return '#06b6d4';
    };

    const findNearestNode = (screenX: number, screenY: number) => {
      const [x, y] = transformRef.current.invert([screenX, screenY]);
      let nearest: NetworkNodePoint | null = null;
      let bestDistance = Infinity;

      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        const dx = (node.x ?? 0) - x;
        const dy = (node.y ?? 0) - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = getNodeRadius(node) + 3;
        if (distance <= radius && distance < bestDistance) {
          nearest = node;
          bestDistance = distance;
        }
      }

      return nearest;
    };

    const draw = () => {
      context.clearRect(0, 0, dimensions.width, dimensions.height);
      context.save();
      context.translate(transformRef.current.x, transformRef.current.y);
      context.scale(transformRef.current.k, transformRef.current.k);

      const activeLevel = renderLevelRef.current;
      const edgesToDraw = activeLevel < 2 ? links : sampledLinks;

      context.globalAlpha = activeLevel === 0 ? 0.26 : 0.14;
      context.strokeStyle = '#94a3b8';
      context.lineWidth = activeLevel === 0 ? 0.6 : 0.45;
      for (const link of edgesToDraw) {
        context.beginPath();
        context.moveTo(link.source.x ?? 0, link.source.y ?? 0);
        context.lineTo(link.target.x ?? 0, link.target.y ?? 0);
        context.stroke();
      }

      context.globalAlpha = 1;
      for (const node of nodes) {
        context.beginPath();
        context.arc(node.x ?? 0, node.y ?? 0, getNodeRadius(node), 0, Math.PI * 2);
        context.fillStyle = nodeColor(node);
        context.fill();
      }

      if (hoveredNode) {
        context.beginPath();
        context.strokeStyle = '#0f172a';
        context.lineWidth = 1.2;
        context.arc(hoveredNode.x ?? 0, hoveredNode.y ?? 0, getNodeRadius(hoveredNode) + 2.6, 0, Math.PI * 2);
        context.stroke();

        context.fillStyle = '#0f172a';
        context.font = '12px ui-sans-serif, system-ui, sans-serif';
        context.fillText(shortLabel(hoveredNode.label, 36), (hoveredNode.x ?? 0) + 8, (hoveredNode.y ?? 0) - 8);
      }

      context.restore();

      const now = performance.now();
      const delta = now - lastFrame;
      lastFrame = now;

      if (delta > 34) {
        slowFrames += 1;
      } else {
        slowFrames = Math.max(0, slowFrames - 1);
      }

      if (slowFrames > 28 && renderLevelRef.current < 2) {
        renderLevelRef.current += 1;
        setRenderLevel(renderLevelRef.current);
        slowFrames = 0;
      }
    };

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<NetworkNodePoint, NetworkLinkPoint>(links)
          .id((node) => node.id)
          .distance((link) => {
            if (link.kind === 'compound_to_pathway') {
              return 32;
            }
            if (link.kind === 'gene_to_compound') {
              return 28;
            }
            return 24;
          })
          .strength(0.18)
      )
      .force('charge', d3.forceManyBody().strength(-38))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collide', d3.forceCollide<NetworkNodePoint>().radius((node) => getNodeRadius(node) + 1.4))
      .alpha(1)
      .alphaDecay(0.04)
      .on('tick', draw);

    const zoomBehavior = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 7])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        draw();
      });

    const dragBehavior = d3
      .drag<HTMLCanvasElement, unknown>()
      .subject((event) => findNearestNode(event.x, event.y))
      .on('start', (event) => {
        if (!event.active) {
          simulation.alphaTarget(0.2).restart();
        }
        event.subject.fx = transformRef.current.invertX(event.x);
        event.subject.fy = transformRef.current.invertY(event.y);
      })
      .on('drag', (event) => {
        event.subject.fx = transformRef.current.invertX(event.x);
        event.subject.fy = transformRef.current.invertY(event.y);
      })
      .on('end', (event) => {
        if (!event.active) {
          simulation.alphaTarget(0);
        }
        event.subject.fx = null;
        event.subject.fy = null;
      });

    const selection = d3.select(canvas);
    selection.call(zoomBehavior);
    selection.call(dragBehavior);

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      hoveredNode = findNearestNode(event.clientX - rect.left, event.clientY - rect.top);
      canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
      draw();
    };

    const handleClick = () => {
      if (hoveredNode && hoveredNode.type === 'compound') {
        onSelectCompound(hoveredNode.id);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    draw();

    return () => {
      simulation.stop();
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      selection.on('.zoom', null);
      selection.on('.drag', null);
    };
  }, [dimensions, graph, highlightedCompounds, onSelectCompound]);

  if (graph.nodes.length === 0 || graph.edges.length === 0) {
    return <p className="text-sm text-gray-500">No graph data available for the current filters.</p>;
  }

  return (
    <div ref={containerRef} className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          {graph.nodes.length} nodes / {graph.edges.length} edges
        </span>
        <span>Render mode level {renderLevel}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full border border-gray-200 rounded-lg bg-white"
      />
    </div>
  );
}
