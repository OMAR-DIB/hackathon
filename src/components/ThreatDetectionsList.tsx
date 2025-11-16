import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ThreatItem {
  output: {
    flag: string;
    comments: string;
    confidence: string;
    recommended_action: string;
    mitre_tactics: string[];
  };
}

interface ThreatDetectionsListProps {
  threats: ThreatItem[];
}

const SeverityBadge = ({ severity }: { severity: string }) => {
  const variants: Record<string, { color: string; label: string; bg: string }> = {
    CRITICAL: { color: 'text-red-600', label: 'CRITICAL', bg: 'bg-red-500/20 border-red-500/50' },
    HIGH: { color: 'text-orange-500', label: 'HIGH', bg: 'bg-orange-500/20 border-orange-500/50' },
    MEDIUM: { color: 'text-yellow-500', label: 'MEDIUM', bg: 'bg-yellow-500/20 border-yellow-500/50' },
    LOW: { color: 'text-blue-500', label: 'LOW', bg: 'bg-blue-500/20 border-blue-500/50' }
  };

  const variant = variants[severity] || variants.LOW;

  return (
    <span className={`${variant.bg} ${variant.color} px-3 py-1 rounded-md text-xs font-bold border`}>
      {variant.label}
    </span>
  );
};

const ConfidenceBadge = ({ confidence }: { confidence: string }) => {
  const normalized = confidence.charAt(0).toUpperCase() + confidence.slice(1).toLowerCase();
  const colors: Record<string, string> = {
    'High': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    'Medium': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
    'Low': 'bg-gray-500/20 text-gray-400 border-gray-500/50'
  };

  return (
    <span className={`${colors[normalized] || colors['Low']} px-2.5 py-1 rounded-md text-xs font-semibold border`}>
      {normalized}
    </span>
  );
};

export const ThreatDetectionsList = ({ threats }: ThreatDetectionsListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('ALL');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredThreats = useMemo(() => {
    return threats.filter(threat => {
      const matchesSearch = searchQuery === '' ||
        threat.output.comments.toLowerCase().includes(searchQuery.toLowerCase()) ||
        threat.output.mitre_tactics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSeverity = selectedSeverity === 'ALL' || threat.output.flag === selectedSeverity;
      const matchesConfidence = selectedConfidence === 'ALL' ||
        threat.output.confidence.toLowerCase() === selectedConfidence.toLowerCase();

      return matchesSearch && matchesSeverity && matchesConfidence;
    });
  }, [threats, searchQuery, selectedSeverity, selectedConfidence]);

  const paginatedThreats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredThreats.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredThreats, currentPage]);

  const totalPages = Math.ceil(filteredThreats.length / itemsPerPage);

  const highlightKeywords = (text: string) => {
    const keywords = ['IoC Detected', 'Blocked', 'Ignored', 'Malware', 'DDoS', 'C2', 'Suspicious', 'Attack'];
    let result = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      result = result.replace(regex, '<span class="text-red-400 font-semibold">$1</span>');
    });
    return result;
  };

  return (
    <Card className="holographic-card shadow-2xl">
      <CardHeader className="border-b border-cyan-500/20 pb-4">
        <CardTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-mono uppercase tracking-wider flex items-center gap-2">
          <Filter className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          ⟨ Threat Detections ⟩
          <span className="text-sm text-cyan-400/70 font-normal ml-2">
            ({filteredThreats.length} {filteredThreats.length === 1 ? 'result' : 'results'})
          </span>
        </CardTitle>

        {/* Search and Filters */}
        <div className="mt-4 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search threats, tactics, IoCs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-sm text-cyan-100 placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-mono"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-sm text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer font-mono"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={selectedConfidence}
              onChange={(e) => {
                setSelectedConfidence(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-sm text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer font-mono"
            >
              <option value="ALL">All Confidence</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="space-y-0 max-h-[600px] overflow-y-auto custom-scrollbar">
          {paginatedThreats.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-cyan-400/50 font-mono">
              No threats match your filters
            </div>
          ) : (
            paginatedThreats.map((item, index) => {
              const globalIndex = (currentPage - 1) * itemsPerPage + index;
              const isExpanded = expandedIndex === globalIndex;

              return (
                <div
                  key={globalIndex}
                  className="border-b border-cyan-500/10 hover:bg-slate-900/30 transition-colors"
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedIndex(isExpanded ? null : globalIndex)}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge severity={item.output.flag} />
                        <ConfidenceBadge confidence={item.output.confidence} />
                        {item.output.mitre_tactics && item.output.mitre_tactics.length > 0 && (
                          <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded border border-purple-500/30">
                            {item.output.mitre_tactics.length} {item.output.mitre_tactics.length === 1 ? 'Tactic' : 'Tactics'}
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Preview */}
                    <p
                      className={`text-sm text-cyan-100 leading-relaxed font-mono ${!isExpanded ? 'line-clamp-2' : ''}`}
                      dangerouslySetInnerHTML={{ __html: highlightKeywords(item.output.comments) }}
                    />

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-cyan-500/20 space-y-3">
                        {item.output.mitre_tactics && item.output.mitre_tactics.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-cyan-400/70 mb-2 font-mono uppercase">MITRE ATT&CK Tactics:</p>
                            <div className="flex flex-wrap gap-2">
                              {item.output.mitre_tactics.map((tactic, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-purple-900/40 text-purple-300 px-3 py-1.5 rounded-md border border-purple-500/40 font-medium"
                                >
                                  {tactic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-semibold text-cyan-400/70 mb-2 font-mono uppercase">Recommended Action:</p>
                          <p className="text-sm text-cyan-100 bg-slate-900/50 p-3 rounded-lg border border-cyan-500/30 font-mono">
                            {item.output.recommended_action}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-cyan-500/20">
            <p className="text-sm text-cyan-400/70 font-mono">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredThreats.length)} of {filteredThreats.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-900/50 border border-cyan-500/30 rounded-md text-sm text-cyan-100 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-cyan-400/70 font-mono">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-slate-900/50 border border-cyan-500/30 rounded-md text-sm text-cyan-100 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
