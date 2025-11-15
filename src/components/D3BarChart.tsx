import { useEffect, useRef } from 'react';
import { scaleLinear, scaleBand } from 'd3-scale';
import { max } from 'd3-array';

interface BarData {
  name: string;
  count: number;
}

interface D3BarChartProps {
  data: BarData[];
  width?: number;
  height?: number;
  color?: string;
}

export const D3BarChart = ({ data, width = 800, height = 400, color = '#8b5cf6' }: D3BarChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    const margin = { top: 20, right: 20, bottom: 120, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create scales
    const xScale = scaleBand()
      .domain(data.map(d => d.name))
      .range([0, innerWidth])
      .padding(0.3);

    const yScale = scaleLinear()
      .domain([0, max(data, d => d.count) || 0])
      .range([innerHeight, 0])
      .nice();

    // Create main group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);

    // Add grid lines
    const gridLines = yScale.ticks(5);
    gridLines.forEach(tick => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('x2', String(innerWidth));
      line.setAttribute('y1', String(yScale(tick)));
      line.setAttribute('y2', String(yScale(tick)));
      line.setAttribute('stroke', '#374151');
      line.setAttribute('stroke-dasharray', '3,3');
      line.setAttribute('opacity', '0.5');
      g.appendChild(line);
    });

    // Create gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'barGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('y2', '100%');

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', color);
    stop1.setAttribute('stop-opacity', '1');

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', color);
    stop2.setAttribute('stop-opacity', '0.6');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Draw bars
    data.forEach((d) => {
      const barGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      barGroup.style.cursor = 'pointer';

      const barX = xScale(d.name) || 0;
      const barY = yScale(d.count);
      const barHeight = innerHeight - barY;
      const barWidth = xScale.bandwidth();

      // Create bar with rounded top
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(barX));
      rect.setAttribute('y', String(barY));
      rect.setAttribute('width', String(barWidth));
      rect.setAttribute('height', String(barHeight));
      rect.setAttribute('fill', 'url(#barGradient)');
      rect.setAttribute('rx', '8');
      rect.setAttribute('ry', '8');
      rect.style.filter = `drop-shadow(0 0 8px ${color}60)`;
      rect.style.transition = 'all 0.3s ease';

      // Add value label on top
      const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valueText.setAttribute('x', String(barX + barWidth / 2));
      valueText.setAttribute('y', String(barY - 5));
      valueText.setAttribute('text-anchor', 'middle');
      valueText.setAttribute('fill', '#e5e7eb');
      valueText.setAttribute('font-size', '14px');
      valueText.setAttribute('font-weight', '700');
      valueText.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
      valueText.textContent = String(d.count);

      // Hover effects
      barGroup.addEventListener('mouseenter', () => {
        rect.style.filter = `drop-shadow(0 0 16px ${color})`;
        rect.setAttribute('opacity', '1');
      });
      barGroup.addEventListener('mouseleave', () => {
        rect.style.filter = `drop-shadow(0 0 8px ${color}60)`;
        rect.setAttribute('opacity', '1');
      });

      barGroup.appendChild(rect);
      barGroup.appendChild(valueText);
      g.appendChild(barGroup);
    });

    // X-axis labels with truncation
    data.forEach((d) => {
      const labelX = (xScale(d.name) || 0) + xScale.bandwidth() / 2;
      const maxLabelLength = 25;
      const displayName = d.name.length > maxLabelLength
        ? d.name.substring(0, maxLabelLength) + '...'
        : d.name;

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(labelX));
      text.setAttribute('y', String(innerHeight + 15));
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('transform', `rotate(-45, ${labelX}, ${innerHeight + 15})`);
      text.setAttribute('fill', '#9ca3af');
      text.setAttribute('font-size', '11px');
      text.style.cursor = 'help';
      text.textContent = displayName;

      // Add title for tooltip on hover
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = d.name;
      text.appendChild(title);

      g.appendChild(text);
    });

    // Y-axis labels
    yScale.ticks(5).forEach(tick => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '-10');
      text.setAttribute('y', String(yScale(tick)));
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('fill', '#9ca3af');
      text.setAttribute('font-size', '13px');
      text.setAttribute('dy', '0.35em');
      text.textContent = String(tick);
      g.appendChild(text);
    });

  }, [data, width, height, color]);

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
