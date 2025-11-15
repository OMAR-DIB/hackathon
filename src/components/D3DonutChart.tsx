import { useEffect, useRef } from 'react';
import { arc, pie } from 'd3-shape';

interface DonutData {
  name: string;
  value: number;
  color: string;
}

interface D3DonutChartProps {
  data: DonutData[];
  width?: number;
  height?: number;
}

export const D3DonutChart = ({ data, width = 400, height = 400 }: D3DonutChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    const radius = Math.min(width, height) / 2 - 40;
    const innerRadius = radius * 0.6;

    // Create main group centered
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${width / 2},${height / 2})`);
    svg.appendChild(g);

    // Create pie layout
    const pieGenerator = pie<DonutData>()
      .value(d => d.value)
      .sort(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arcGenerator = arc<any>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arcHover = arc<any>()
      .innerRadius(innerRadius)
      .outerRadius(radius + 10);

    const pieData = pieGenerator(data);

    // Draw arcs
    pieData.forEach((d) => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.style.cursor = 'pointer';

      // Create path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pathData = arcGenerator(d as any);
      if (pathData) {
        path.setAttribute('d', pathData);
        path.setAttribute('fill', d.data.color);
        path.setAttribute('opacity', '0.9');
        path.style.filter = `drop-shadow(0 0 8px ${d.data.color}60)`;
        path.style.transition = 'all 0.3s ease';

        // Hover effects
        group.addEventListener('mouseenter', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hoverPath = arcHover(d as any);
          if (hoverPath) {
            path.setAttribute('d', hoverPath);
            path.setAttribute('opacity', '1');
            path.style.filter = `drop-shadow(0 0 16px ${d.data.color})`;
          }
        });
        group.addEventListener('mouseleave', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const normalPath = arcGenerator(d as any);
          if (normalPath) {
            path.setAttribute('d', normalPath);
            path.setAttribute('opacity', '0.9');
            path.style.filter = `drop-shadow(0 0 8px ${d.data.color}60)`;
          }
        });

        // Add label
        const labelRadius = radius * 0.8;
        const angle = (d.startAngle + d.endAngle) / 2;
        const labelX = Math.cos(angle - Math.PI / 2) * labelRadius;
        const labelY = Math.sin(angle - Math.PI / 2) * labelRadius;

        // Value text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(labelX));
        text.setAttribute('y', String(labelY));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#f3f4f6');
        text.setAttribute('font-size', '16px');
        text.setAttribute('font-weight', '700');
        text.style.textShadow = '0 0 8px rgba(0,0,0,0.9)';
        text.textContent = String(d.data.value);

        group.appendChild(path);
        group.appendChild(text);
        g.appendChild(group);
      }
    });

    // Center text with total
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const centerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    centerText.setAttribute('text-anchor', 'middle');
    centerText.setAttribute('dy', '0.35em');
    centerText.setAttribute('fill', '#f3f4f6');
    centerText.setAttribute('font-size', '36px');
    centerText.setAttribute('font-weight', '700');
    centerText.style.textShadow = '0 0 8px rgba(139, 92, 246, 0.8)';
    centerText.textContent = String(total);
    g.appendChild(centerText);

    const centerLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    centerLabel.setAttribute('text-anchor', 'middle');
    centerLabel.setAttribute('dy', '2.5em');
    centerLabel.setAttribute('fill', '#9ca3af');
    centerLabel.setAttribute('font-size', '15px');
    centerLabel.setAttribute('font-weight', '600');
    centerLabel.textContent = 'Total';
    g.appendChild(centerLabel);

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
