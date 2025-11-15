import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SignatureCardProps {
  title: string;
  subtitle?: string;
  count: number;
  status: 'success' | 'warning' | 'error';
  trendData?: number[];
}

const statusConfig = {
  success: {
    label: 'Clean',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    badgeColor: 'bg-green-500/20 text-green-400 border border-green-500/30'
  },
  warning: {
    label: 'Warning',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
  },
  error: {
    label: 'Critical',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30'
  }
};

export const SignatureCard = ({ title, subtitle, count, status, trendData = [] }: SignatureCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = statusConfig[status];

  // Calculate trend direction
  const trendDirection = trendData.length >= 2
    ? trendData[trendData.length - 1] - trendData[0]
    : 0;

  const trendPercentage = trendData.length >= 2 && trendData[0] !== 0
    ? ((trendDirection / trendData[0]) * 100).toFixed(1)
    : '0.0';

  useEffect(() => {
    if (!canvasRef.current || trendData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 4;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate points
    const max = Math.max(...trendData);
    const min = Math.min(...trendData);
    const range = max - min || 1;

    const points = trendData.map((value, index) => ({
      x: padding + (index / (trendData.length - 1)) * (width - padding * 2),
      y: height - padding - ((value - min) / range) * (height - padding * 2)
    }));

    // Draw gradient area under line
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, config.color + '40');
    gradient.addColorStop(1, config.color + '05');

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = config.color;
    ctx.shadowBlur = 4;

    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw points
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = config.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

  }, [trendData, config.color]);

  const TrendIcon = trendDirection > 0 ? TrendingUp : trendDirection < 0 ? TrendingDown : Minus;
  const trendColor = trendDirection > 0 ? 'text-red-400' : trendDirection < 0 ? 'text-green-400' : 'text-gray-400';

  return (
    <Card className="bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-200 tracking-wide">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5 font-medium">{subtitle}</p>
            )}
          </div>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-md whitespace-nowrap ${config.badgeColor}`}>
            {config.label}
          </span>
        </div>

        <div className="flex items-end justify-between mt-4">
          <div>
            <div className="text-3xl font-bold text-gray-100" style={{ color: config.color }}>
              {count.toLocaleString()}
            </div>
            {trendData.length >= 2 && (
              <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                <span className="text-xs font-semibold">
                  {Math.abs(parseFloat(trendPercentage))}% 7d
                </span>
              </div>
            )}
          </div>

          {trendData.length > 0 && (
            <div className="ml-4">
              <canvas
                ref={canvasRef}
                width={140}
                height={50}
                className="opacity-90"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
