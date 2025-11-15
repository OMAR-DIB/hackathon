import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

interface MitreTactic {
  name: string;
  count: number;
}

interface MitreKillChainActivityProps {
  tactics: MitreTactic[];
}

// MITRE ATT&CK color scheme for different tactic categories
const tacticColors: Record<string, string> = {
  'Initial Access': '#dc2626',
  'Execution': '#ea580c',
  'Persistence': '#f59e0b',
  'Privilege Escalation': '#eab308',
  'Defense Evasion': '#84cc16',
  'Credential Access': '#22c55e',
  'Discovery': '#10b981',
  'Lateral Movement': '#14b8a6',
  'Collection': '#06b6d4',
  'Command and Control': '#0ea5e9',
  'Exfiltration': '#3b82f6',
  'Impact': '#6366f1',
  'Reconnaissance': '#8b5cf6',
  'Resource Development': '#a855f7',
  'Pre-Attack': '#c026d3'
};

const getColor = (tacticName: string): string => {
  return tacticColors[tacticName] || '#6b7280';
};

export const MitreKillChainActivity = ({ tactics }: MitreKillChainActivityProps) => {
  const maxCount = Math.max(...tactics.map(t => t.count), 1);
  const totalThreats = tactics.reduce((sum, t) => sum + t.count, 0);

  return (
    <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
      <CardHeader className="border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-xl font-bold text-white">MITRE Kill Chain Activity</CardTitle>
          </div>
          <span className="text-xs text-gray-400 bg-gray-900/50 px-3 py-1 rounded-full border border-gray-700">
            {totalThreats} Total Detections
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {tactics.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-500">
            No MITRE tactics detected
          </div>
        ) : (
          <div className="space-y-3">
            {tactics.map((tactic, index) => {
              const color = getColor(tactic.name);
              const percentage = ((tactic.count / maxCount) * 100).toFixed(0);
              const totalPercentage = ((tactic.count / totalThreats) * 100).toFixed(1);

              return (
                <div
                  key={index}
                  className="group hover:bg-gray-900/30 p-3 rounded-lg transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-3 h-3 rounded-full shadow-lg"
                        style={{
                          backgroundColor: color,
                          boxShadow: `0 0 10px ${color}60`
                        }}
                      />
                      <span className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
                        {tactic.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-500">
                        {totalPercentage}% of total
                      </span>
                      <span
                        className="text-sm font-bold px-3 py-1 rounded-md"
                        style={{
                          backgroundColor: `${color}20`,
                          color: color,
                          border: `1px solid ${color}40`
                        }}
                      >
                        {tactic.count}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-900/50 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out relative group-hover:shadow-lg"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 12px ${color}60`
                      }}
                    >
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {tactics.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-700/50">
            <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
              MITRE ATT&CK Framework
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Initial / Execution</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>Persistence / Privilege</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Defense / Credential</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>Discovery / Collection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>C2 / Exfiltration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Impact / Recon</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
