import { useEffect, useRef } from 'react';

interface TimelineData {
  date: string;
  high: number;
  medium: number;
  low: number;
  info: number;
}

interface TimelineChartProps {
  data: TimelineData[];
  width?: number;
  height?: number;
}

export const TimelineChart = ({ data, width = 800, height = 300 }: TimelineChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { top: 30, right: 20, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling
    const maxValue = Math.max(
      ...data.map(d => Math.max(d.high, d.medium, d.low, d.info))
    );

    // Draw grid lines
    const gridLines = 5;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw lines
    const lines = [
      { key: 'info' as const, color: '#10b981', label: 'Info' },
      { key: 'high' as const, color: '#ef4444', label: 'High' },
      { key: 'medium' as const, color: '#f59e0b', label: 'Medium' },
      { key: 'low' as const, color: '#6b7280', label: 'Low' }
    ];

    lines.forEach(line => {
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      data.forEach((point, index) => {
        const x = padding.left + (index / (data.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (point[line.key] / maxValue) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw points
      data.forEach((point, index) => {
        const x = padding.left + (index / (data.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (point[line.key] / maxValue) * chartHeight;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = line.color;
        ctx.fill();
      });
    });

    // Draw X-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    data.forEach((point, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight + 20;
      ctx.fillText(point.date, x, y);
    });

    // Draw Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const value = Math.round((maxValue / gridLines) * (gridLines - i));
      const y = padding.top + (chartHeight / gridLines) * i + 5;
      ctx.fillText(value.toString(), padding.left - 10, y);
    }

    // Draw legend
    const legendY = height - 20;
    let legendX = padding.left;

    lines.forEach(line => {
      // Color dot
      ctx.beginPath();
      ctx.arc(legendX, legendY, 4, 0, Math.PI * 2);
      ctx.fillStyle = line.color;
      ctx.fill();

      // Label
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'left';
      ctx.fillText(line.label, legendX + 10, legendY + 4);

      legendX += 100;
    });

  }, [data, width, height]);

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto"
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
};
