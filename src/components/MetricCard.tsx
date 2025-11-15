import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  total: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  trend?: number;
}

export const MetricCard = ({ title, value, total, icon: Icon, color, bgColor, trend }: MetricCardProps) => {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  const trendDirection = trend && trend > 0 ? '+' : '';

  return (
    <div className={`${bgColor} border-l-4 rounded-lg p-4 transition-all duration-300 hover:scale-105 cursor-pointer`}
         style={{ borderColor: color }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold ${trend > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {trendDirection}{trend}%
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-100" style={{ color }}>{value.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{percentage}% of total</p>
        </div>
      </div>
    </div>
  );
};
