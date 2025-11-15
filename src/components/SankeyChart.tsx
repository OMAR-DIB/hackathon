import { useEffect, useRef } from 'react';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

interface NodeData {
  name: string;
  color?: string;
}

interface LinkData {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: Array<NodeData>;
  links: Array<LinkData>;
}

interface SankeyChartProps {
  data: SankeyData;
  width?: number;
  height?: number;
}

export const SankeyChart = ({ data, width = 800, height = 400 }: SankeyChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    const margin = { top: 35, right: 10, bottom: 10, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const sankeyGenerator = sankey()
      .nodeWidth(20)
      .nodePadding(30)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .nodeAlign((node: any) => node.sourceLinks.length ? 0 : 1) // Source nodes left, target nodes right
      .extent([[margin.left + 50, margin.top], [innerWidth - margin.right - 50, innerHeight - margin.bottom]]);

    const graph = sankeyGenerator({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes: data.nodes.map(d => ({ ...d })) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      links: data.links.map(d => ({ ...d })) as any
    });

    const { nodes, links } = graph;

    // Create SVG group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);

    // Add side labels
    const leftLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    leftLabel.setAttribute('x', String(margin.left + 50));
    leftLabel.setAttribute('y', '20');
    leftLabel.setAttribute('text-anchor', 'start');
    leftLabel.setAttribute('fill', '#9ca3af');
    leftLabel.setAttribute('font-size', '14px');
    leftLabel.setAttribute('font-weight', '700');
    leftLabel.textContent = 'SEVERITY';
    g.appendChild(leftLabel);

    const rightLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rightLabel.setAttribute('x', String(innerWidth - margin.right - 50));
    rightLabel.setAttribute('y', '20');
    rightLabel.setAttribute('text-anchor', 'end');
    rightLabel.setAttribute('fill', '#9ca3af');
    rightLabel.setAttribute('font-size', '14px');
    rightLabel.setAttribute('font-weight', '700');
    rightLabel.textContent = 'CONFIDENCE';
    g.appendChild(rightLabel);

    // Draw links with gradients
    links.forEach((link, i) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = sankeyLinkHorizontal()(link as any);

      if (d) {
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-opacity', '0.4');
        path.setAttribute('stroke-width', String(Math.max(1, link.width || 0)));
        path.style.transition = 'all 0.3s ease';
        path.style.filter = 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.3))';

        // Create gradient for each link
        const gradientId = `gradient-${i}`;
        const defs = svg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        if (!svg.querySelector('defs')) svg.appendChild(defs);

        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', gradientId);
        gradient.setAttribute('gradientUnits', 'userSpaceOnUse');

        const sourceNode = typeof link.source === 'number' ? nodes[link.source] : link.source;
        const targetNode = typeof link.target === 'number' ? nodes[link.target] : link.target;

        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stop1.setAttribute('stop-color', (sourceNode as any).color || '#6b7280');

        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stop2.setAttribute('stop-color', (targetNode as any).color || '#9ca3af');

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);

        path.setAttribute('stroke', `url(#${gradientId})`);

        // Hover effect with glow
        path.addEventListener('mouseenter', () => {
          path.setAttribute('stroke-opacity', '0.8');
          path.style.filter = 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))';
        });
        path.addEventListener('mouseleave', () => {
          path.setAttribute('stroke-opacity', '0.4');
          path.style.filter = 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.3))';
        });

        g.appendChild(path);
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(node.x0 || 0));
      rect.setAttribute('y', String(node.y0 || 0));
      rect.setAttribute('height', String((node.y1 || 0) - (node.y0 || 0)));
      rect.setAttribute('width', String((node.x1 || 0) - (node.x0 || 0)));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rect.setAttribute('fill', (node as any).color || '#6b7280');
      rect.setAttribute('opacity', '0.95');
      rect.setAttribute('rx', '6');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rect.style.filter = `drop-shadow(0 0 8px ${(node as any).color || '#6b7280'}80)`;
      rect.style.transition = 'all 0.3s ease';

      // Add hover effect to nodes
      rect.addEventListener('mouseenter', () => {
        rect.setAttribute('opacity', '1');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rect.style.filter = `drop-shadow(0 0 12px ${(node as any).color || '#6b7280'})`;
      });
      rect.addEventListener('mouseleave', () => {
        rect.setAttribute('opacity', '0.95');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rect.style.filter = `drop-shadow(0 0 8px ${(node as any).color || '#6b7280'}80)`;
      });

      g.appendChild(rect);

      // Add labels
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const x = (node.x0 || 0) < width / 2 ? (node.x1 || 0) + 6 : (node.x0 || 0) - 6;
      const y = ((node.y1 || 0) + (node.y0 || 0)) / 2;

      text.setAttribute('x', String(x));
      text.setAttribute('y', String(y));
      text.setAttribute('dy', '0.35em');
      text.setAttribute('text-anchor', (node.x0 || 0) < width / 2 ? 'start' : 'end');
      text.setAttribute('fill', '#f3f4f6');
      text.setAttribute('font-size', '14px');
      text.setAttribute('font-weight', '700');
      text.style.textShadow = '0 0 4px rgba(0,0,0,0.5)';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text.textContent = `${(node as any).name}`;
      g.appendChild(text);
    });

  }, [data, width, height]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ width: '100%', height: 'auto' }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    />
  );
};
