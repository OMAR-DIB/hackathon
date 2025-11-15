import { useEffect, useRef, useState } from 'react';

interface TimelineData {
  date: string;
  high: number;
  medium: number;
  low: number;
  info: number;
}

interface EnhancedTimelineChartProps {
  data: TimelineData[];
  width?: number;
  height?: number;
}

export const EnhancedTimelineChart = ({ data, width = 900, height = 320 }: EnhancedTimelineChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: any } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { top: 40, right: 20, bottom: 70, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling
    const maxValue = Math.max(
      ...data.map(d => Math.max(d.high, d.medium, d.low, d.info))
    );
    const yMax = Math.ceil(maxValue * 1.1 / 10) * 10; // Round up to nearest 10

    // Draw background gradient
    const bgGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    bgGradient.addColorStop(0, 'rgba(31, 41, 55, 0.3)');
    bgGradient.addColorStop(1, 'rgba(17, 24, 39, 0.1)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

    // Draw grid lines
    const gridLines = 6;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw lines and areas
    const lines = [
      { key: 'info' as const, color: '#10b981', label: 'Info', gradient: 'rgba(16, 185, 129, 0.15)' },
      { key: 'low' as const, color: '#6b7280', label: 'Low', gradient: 'rgba(107, 114, 128, 0.15)' },
      { key: 'medium' as const, color: '#f59e0b', label: 'Medium', gradient: 'rgba(245, 158, 11, 0.15)' },
      { key: 'high' as const, color: '#ef4444', label: 'High', gradient: 'rgba(239, 68, 68, 0.15)' }
    ];

    lines.forEach(line => {
      // Draw area under line
      ctx.beginPath();
      data.forEach((point, index) => {
        const x = padding.left + (index / (data.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (point[line.key] / yMax) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = line.gradient;
      ctx.fill();

      // Draw line
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = line.color;
      ctx.shadowBlur = 8;

      data.forEach((point, index) => {
        const x = padding.left + (index / (data.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (point[line.key] / yMax) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw points
      data.forEach((point, index) => {
        const x = padding.left + (index / (data.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (point[line.key] / yMax) * chartHeight;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = line.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });

    // Draw X-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';

    data.forEach((point, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight + 25;
      ctx.fillText(point.date, x, y);
    });

    // Draw Y-axis labels
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px sans-serif';
    for (let i = 0; i <= gridLines; i++) {
      const value = Math.round((yMax / gridLines) * (gridLines - i));
      const y = padding.top + (chartHeight / gridLines) * i + 5;
      ctx.fillText(value.toString(), padding.left - 15, y);
    }

    // Draw Y-axis label
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6b7280';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('THREAT COUNT', 0, 0);
    ctx.restore();

  }, [data, width, height]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { top: 40, right: 20, bottom: 70, left: 70 };
    const chartWidth = width - padding.left - padding.right;

    if (x >= padding.left && x <= padding.left + chartWidth &&
        y >= padding.top && y <= height - padding.bottom) {

      const index = Math.round(((x - padding.left) / chartWidth) * (data.length - 1));
      if (index >= 0 && index < data.length) {
        const point = data[index];
        const total = point.high + point.medium + point.low + point.info;
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          data: {
            date: point.date,
            high: point.high,
            medium: point.medium,
            low: point.low,
            info: point.info,
            total
          }
        });
        return;
      }
    }
    setTooltip(null);
  };

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        style={{ cursor: 'crosshair' }}
      />

      {/* Fixed Legend */}
      <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
        <div className="space-y-2">
          {[
            { label: 'High', color: '#ef4444' },
            { label: 'Medium', color: '#f59e0b' },
            { label: 'Low', color: '#6b7280' },
            { label: 'Info', color: '#10b981' }
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-semibold text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bg-gray-900 border border-purple-500/50 rounded-lg p-3 shadow-2xl pointer-events-none z-50"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y - 80,
            transform: 'translateY(-50%)'
          }}
        >
          <p className="text-sm font-bold text-white mb-2 border-b border-gray-700 pb-1">{tooltip.data.date}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-xs text-red-400">High:</span>
              <span className="text-xs font-bold text-white">{tooltip.data.high} ({((tooltip.data.high / tooltip.data.total) * 100).toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs text-amber-400">Medium:</span>
              <span className="text-xs font-bold text-white">{tooltip.data.medium} ({((tooltip.data.medium / tooltip.data.total) * 100).toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs text-gray-400">Low:</span>
              <span className="text-xs font-bold text-white">{tooltip.data.low} ({((tooltip.data.low / tooltip.data.total) * 100).toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs text-green-400">Info:</span>
              <span className="text-xs font-bold text-white">{tooltip.data.info} ({((tooltip.data.info / tooltip.data.total) * 100).toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 mt-1 border-t border-gray-700">
              <span className="text-xs text-purple-400 font-semibold">Total:</span>
              <span className="text-xs font-bold text-purple-300">{tooltip.data.total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
