import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  AlertCircle,
  Activity,
  Shield,
  Target,
  AlertOctagon,
  TrendingUp,
  Globe2,
  ListFilter,
  FileWarning,
  AlertOctagonIcon,
  CheckCircle2,
} from 'lucide-react';
import { SankeyChart } from '@/components/SankeyChart';
import { D3DonutChart } from '@/components/D3DonutChart';
import { TimelineChart } from '@/components/TimelineChart';
import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

// ---------- DATA TYPES ----------

type ThreatItem = {
  output: {
    flag: string;
    comments: string;
    confidence: string;
    recommended_action?: string;
    mitre_tactics?: string[];
  };
};

// ---------- HELPER FUNCTIONS ----------

const isThreat = (flag: string) => flag === 'HIGH' || flag === 'MEDIUM';

const calculateMetrics = (threatData: ThreatItem[]) => {
  const flags = threatData.map((item) => item.output.flag);

  const critical = flags.filter((f) => f === 'CRITICAL').length;
  const high = flags.filter((f) => f === 'HIGH').length;
  const medium = flags.filter((f) => f === 'MEDIUM').length;
  const low = flags.filter((f) => f === 'LOW').length;
  const info = flags.filter((f) => f === 'INFO').length;

  const totalLogs = threatData.length;
  const threatsDetected = high + medium;
  const cleanTraffic = info + low;

  const anomalyKeywords = ['anomaly score', 'anomalous', 'unusual', 'suspicious'];
  const anomalies = threatData.filter((item) =>
    anomalyKeywords.some((k) =>
      item.output.comments.toLowerCase().includes(k.toLowerCase()),
    ),
  ).length;

  const ignoredAlerts = threatData.filter((item) =>
    item.output.comments.toLowerCase().includes('action was \'ignored\'') ||
    item.output.comments.toLowerCase().includes('action taken was \'ignored\'') ||
    item.output.comments.toLowerCase().includes('ignored')
  ).length;

  const proxyBypass = threatData.filter((item) =>
    item.output.comments.toLowerCase().includes('direct connection') ||
    item.output.comments.toLowerCase().includes('bypassing proxy') ||
    item.output.comments.toLowerCase().includes('without proxy')
  ).length;

  const missingFirewallLogs = threatData.filter((item) =>
    item.output.comments.toLowerCase().includes('firewall logs are missing') ||
    item.output.comments.toLowerCase().includes('no log entry') ||
    item.output.comments.toLowerCase().includes('missing entries')
  ).length;

  const outdatedSystems = threatData.filter((item) =>
    item.output.comments.toLowerCase().includes('outdated browser') ||
    item.output.comments.toLowerCase().includes('windows 98') ||
    item.output.comments.toLowerCase().includes('ios 10.3.4') ||
    item.output.comments.toLowerCase().includes('outdated')
  ).length;

  const complianceIssues = ignoredAlerts + proxyBypass + missingFirewallLogs + outdatedSystems;
  const complianceScore =
    totalLogs > 0 ? Math.max(0, Math.round(100 - (complianceIssues / totalLogs) * 100)) : 100;

  return {
    critical,
    high,
    medium,
    low,
    info,
    totalLogs,
    threatsDetected,
    cleanTraffic,
    anomalies,
    ignoredAlerts,
    proxyBypass,
    missingFirewallLogs,
    outdatedSystems,
    complianceScore,
  };
};

const getThreatTimelineData = (threatData: ThreatItem[]) => {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const dataByHour = hours.map(() => ({ high: 0, medium: 0, low: 0, info: 0 }));

  threatData.forEach((item, index) => {
    const bucket = index % 24;
    const flag = item.output.flag;
    if (flag === 'HIGH') dataByHour[bucket].high++;
    else if (flag === 'MEDIUM') dataByHour[bucket].medium++;
    else if (flag === 'LOW') dataByHour[bucket].low++;
    else if (flag === 'INFO') dataByHour[bucket].info++;
  });

  return hours.map((date, idx) => ({
    date,
    ...dataByHour[idx],
  }));
};

const mitrePhaseMap: Record<string, string> = {
  'Reconnaissance': 'Recon',
  'Resource Development': 'Resource Development',
  'Initial Access': 'Initial Access',
  'Execution': 'Execution',
  'Persistence': 'Execution',
  'Privilege Escalation': 'Privilege Escalation',
  'Defense Evasion': 'Defense Evasion',
  'Credential Access': 'Privilege Escalation',
  'Discovery': 'Recon',
  'Lateral Movement': 'Privilege Escalation',
  'Collection': 'Exfiltration',
  'Command and Control': 'Command & Control',
  'Exfiltration': 'Exfiltration',
  'Impact': 'Impact',
};

const getKillChainData = (threatData: ThreatItem[]) => {
  const phaseCounts: Record<string, number> = {};

  threatData.forEach((item) => {
    item.output.mitre_tactics?.forEach((tactic) => {
      const phase = mitrePhaseMap[tactic] || 'Other';
      phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
    });
  });

  return Object.entries(phaseCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

const ipv4Regex = /(\d{1,3}(?:\.\d{1,3}){3})/g;
const sourceRegex = /source IP\s+(\d{1,3}(?:\.\d{1,3}){3})/i;
const destRegex = /destination (?:IP|system)\s+(\d{1,3}(?:\.\d{1,3}){3})/i;
const countryRegex = /\b(in|from)\s+([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*)/;

type RankedItem = { key: string; count: number; severity: string };

const getTopSources = (threatData: ThreatItem[], limit = 5): RankedItem[] => {
  const map: Record<string, { count: number; severityScore: number }> = {};

  threatData.forEach((item) => {
    const comments = item.output.comments;
    const match = comments.match(sourceRegex) || comments.match(ipv4Regex);
    if (!match) return;

    const ip = match[1];
    if (!map[ip]) map[ip] = { count: 0, severityScore: 0 };

    map[ip].count += 1;
    if (item.output.flag === 'HIGH') map[ip].severityScore += 3;
    else if (item.output.flag === 'MEDIUM') map[ip].severityScore += 2;
    else if (item.output.flag === 'LOW') map[ip].severityScore += 1;
  });

  return Object.entries(map)
    .map(([key, value]) => ({
      key,
      count: value.count,
      severity: value.severityScore >= 6 ? 'HIGH' : value.severityScore >= 3 ? 'MEDIUM' : 'LOW',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

const getTopDestinations = (threatData: ThreatItem[], limit = 5): RankedItem[] => {
  const map: Record<string, { count: number; severityScore: number }> = {};

  threatData.forEach((item) => {
    const comments = item.output.comments;
    const match = comments.match(destRegex);
    if (!match) return;

    const ip = match[1];
    if (!map[ip]) map[ip] = { count: 0, severityScore: 0 };

    map[ip].count += 1;
    if (item.output.flag === 'HIGH') map[ip].severityScore += 3;
    else if (item.output.flag === 'MEDIUM') map[ip].severityScore += 2;
    else if (item.output.flag === 'LOW') map[ip].severityScore += 1;
  });

  return Object.entries(map)
    .map(([key, value]) => ({
      key,
      count: value.count,
      severity: value.severityScore >= 6 ? 'HIGH' : value.severityScore >= 3 ? 'MEDIUM' : 'LOW',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

const getGeoDistribution = (threatData: ThreatItem[], limit = 5) => {
  const map: Record<string, number> = {};

  threatData.forEach((item) => {
    const comments = item.output.comments;
    const match = comments.match(countryRegex);
    if (match && match[2]) {
      const country = match[2];
      map[country] = (map[country] || 0) + 1;
    }
  });

  return Object.entries(map)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

const getAnomalyScore = (comments: string) => {
  const match = comments.match(/anomaly score\s*\((\d+(\.\d+)?)\/100\)/i);
  if (match) return parseFloat(match[1]);
  return 0;
};

const getAnomalySpotlight = (threatData: ThreatItem[]) => {
  return threatData
    .map((item, index) => ({
      index,
      flag: item.output.flag,
      comments: item.output.comments,
      confidence: item.output.confidence,
      mitre_tactics: item.output.mitre_tactics || [],
      anomalyScore: getAnomalyScore(item.output.comments),
    }))
    .filter(
      (i) =>
        isThreat(i.flag) &&
        (i.comments.toLowerCase().includes('anomaly score') ||
          i.comments.toLowerCase().includes('icmp') ||
          i.comments.toLowerCase().includes('dns') ||
          i.comments.toLowerCase().includes('tunneling') ||
          i.comments.toLowerCase().includes('proxy')),
    )
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
    .slice(0, 5);
};

const getConfidenceLevels = (threatData: ThreatItem[]) => {
  const confidenceMap: Record<string, number> = {};
  threatData.forEach((item) => {
    const conf = item.output.confidence;
    const normalized = conf.charAt(0).toUpperCase() + conf.slice(1).toLowerCase();
    confidenceMap[normalized] = (confidenceMap[normalized] || 0) + 1;
  });
  return Object.entries(confidenceMap).map(([name, value]) => ({ name, value }));
};

const getSankeyData = (threatData: ThreatItem[]) => {
  const flagToConfidence: Record<string, Record<string, number>> = {};

  threatData.forEach((item) => {
    const flag = item.output.flag;
    const conf = item.output.confidence;
    const normalized = conf.charAt(0).toUpperCase() + conf.slice(1).toLowerCase();

    if (!flagToConfidence[flag]) {
      flagToConfidence[flag] = {};
    }
    flagToConfidence[flag][normalized] = (flagToConfidence[flag][normalized] || 0) + 1;
  });

  const severityColors: Record<string, string> = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#f59e0b',
    LOW: '#3b82f6',
    INFO: '#10b981',
  };

  const confidenceColors: Record<string, string> = {
    High: '#8b5cf6',
    Medium: '#6366f1',
    Low: '#ec4899',
  };

  const severityNodes = Object.keys(flagToConfidence).map((flag) => ({
    name: flag,
    color: severityColors[flag] || '#6b7280',
  }));

  const uniqueConfidences = new Set<string>();
  Object.values(flagToConfidence).forEach((conf) => {
    Object.keys(conf).forEach((c) => uniqueConfidences.add(c));
  });

  const confidenceNodes = Array.from(uniqueConfidences).map((conf) => ({
    name: conf,
    color: confidenceColors[conf] || '#9ca3af',
  }));

  const nodes = [...severityNodes, ...confidenceNodes];
  const links: Array<{ source: number; target: number; value: number }> = [];

  Object.entries(flagToConfidence).forEach(([flag, confidences]) => {
    const sourceIndex = nodes.findIndex((n) => n.name === flag);
    Object.entries(confidences).forEach(([conf, count]) => {
      const targetIndex = nodes.findIndex((n) => n.name === conf);
      if (sourceIndex !== -1 && targetIndex !== -1) {
        links.push({ source: sourceIndex, target: targetIndex, value: count });
      }
    });
  });

  return { nodes, links };
};

// ---------- BADGES ----------

const SeverityBadge = ({ severity }: { severity: string }) => {
  const variants: Record<string, { color: string; label: string }> = {
    CRITICAL: { color: 'bg-red-600', label: 'CRITICAL' },
    HIGH: { color: 'bg-orange-600', label: 'HIGH' },
    MEDIUM: { color: 'bg-yellow-500', label: 'MEDIUM' },
    LOW: { color: 'bg-blue-500', label: 'LOW' },
    INFO: { color: 'bg-green-500', label: 'INFO' },
  };

  const variant = variants[severity] || variants.INFO;

  return (
    <span className={`${variant.color} px-3 py-1 rounded text-white text-xs font-semibold`}>
      {variant.label}
    </span>
  );
};

const ConfidenceBadge = ({ confidence }: { confidence: string }) => {
  const colors: Record<string, string> = {
    HIGH: 'bg-red-500',
    High: 'bg-red-500',
    MEDIUM: 'bg-yellow-500',
    Medium: 'bg-yellow-500',
    LOW: 'bg-blue-500',
    Low: 'bg-blue-500',
  };

  return (
    <span className={`${colors[confidence] || 'bg-gray-500'} px-2 py-1 rounded text-white text-xs`}>
      {confidence}
    </span>
  );
};

// ---------- DASHBOARD UI ----------

export default function Dashboard() {
  const [threatData, setThreatData] = useState<ThreatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const response = await fetch('http://localhost:5678/webhook/get-threats');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const response_data = await response.json();
        
        // Handle different response formats
        let threats: ThreatItem[] = [];
        if (Array.isArray(response_data)) {
          threats = response_data;
        } else if (response_data && typeof response_data === 'object') {
          // If data is wrapped in an object, try common property names
          threats = response_data.data || response_data.threats || response_data.results || [];
        }
        
        if (!Array.isArray(threats)) {
          throw new Error('Invalid data format: expected an array of threats');
        }
        
        console.log(`Loaded ${threats.length} threat records from API`);
        setThreatData(threats);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch threat data');
        setLoading(false);
      }
    };

    fetchThreats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchThreats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading threat data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error: {error}</div>
          <div className="text-gray-400 text-sm">Make sure the API at http://localhost:5678/webhook/get-threats is running</div>
        </div>
      </div>
    );
  }

  // Ensure threatData is an array before processing
  if (!Array.isArray(threatData) || threatData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-xl">No threat data available</div>
      </div>
    );
  }

  const metricsData = calculateMetrics(threatData);
  const timelineData = getThreatTimelineData(threatData);
  const killChainData = getKillChainData(threatData);
  const topSources = getTopSources(threatData);
  const topDestinations = getTopDestinations(threatData);
  const geoData = getGeoDistribution(threatData);
  const anomalySpotlight = getAnomalySpotlight(threatData);
  const confidenceData = getConfidenceLevels(threatData);
  const confidenceTotal = confidenceData.reduce((sum, d) => sum + d.value, 0);
  const sankeyData = getSankeyData(threatData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              42Beirut x Teknologiia — SOC Wall
            </h1>
            <p className="text-gray-400">
              Enterprise Automated Log Enrichment &amp; Threat Intelligence Monitoring
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ListFilter className="w-4 h-4" />
            <span>View: Enterprise Network • Focus: Abnormal Behavior &amp; Compliance</span>
          </div>
        </div>

        {/* TOP KPI BAR */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 md:p-6 mb-6 shadow-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {/* Active Threats */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertOctagonIcon className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-xs font-medium text-gray-400">Active Threats</p>
              </div>
              <p className="text-2xl font-bold text-red-500">{metricsData.threatsDetected}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                HIGH + MEDIUM ({Math.round(
                  (metricsData.threatsDetected / Math.max(metricsData.totalLogs, 1)) * 100,
                )}
                %)
              </p>
            </div>

            {/* High Severity */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                <p className="text-xs font-medium text-gray-400">High Severity</p>
              </div>
              <p className="text-2xl font-bold text-orange-500">{metricsData.high}</p>
            </div>

            {/* Medium Severity */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                <p className="text-xs font-medium text-gray-400">Medium Severity</p>
              </div>
              <p className="text-2xl font-bold text-yellow-500">{metricsData.medium}</p>
            </div>

            {/* Anomalous Events */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="w-5 h-5 text-amber-400 mr-2" />
                <p className="text-xs font-medium text-gray-400">Anomalous Events</p>
              </div>
              <p className="text-2xl font-bold text-amber-400">{metricsData.anomalies}</p>
              <p className="text-[11px] text-gray-500 mt-1">Detected abnormal behavior</p>
            </div>

            {/* Total Logs */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="w-5 h-5 text-indigo-500 mr-2" />
                <p className="text-xs font-medium text-gray-400">Total Logs</p>
              </div>
              <p className="text-2xl font-bold text-indigo-500">{metricsData.totalLogs}</p>
            </div>

            {/* Clean Traffic */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Shield className="w-5 h-5 text-green-500 mr-2" />
                <p className="text-xs font-medium text-gray-400">Clean Traffic</p>
              </div>
              <p className="text-2xl font-bold text-green-500">{metricsData.cleanTraffic}</p>
            </div>

            {/* Compliance Score */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5 text-purple-400 mr-2" />
                <p className="text-xs font-medium text-gray-400">Compliance Score</p>
              </div>
              <p className="text-2xl font-bold text-purple-400">
                {metricsData.complianceScore}%
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Lower = more issues</p>
            </div>

            {/* Ignored Alerts */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <FileWarning className="w-5 h-5 text-pink-400 mr-2" />
                <p className="text-xs font-medium text-gray-400">Ignored Alerts</p>
              </div>
              <p className="text-2xl font-bold text-pink-400">{metricsData.ignoredAlerts}</p>
              <p className="text-[11px] text-gray-500 mt-1">Review incident handling</p>
            </div>
          </div>
        </div>

        {/* THREATS OVER TIME + COMPLIANCE PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                Threat Volume (Last 24h)
                <span className="text-xs font-normal text-gray-500">
                  High vs Medium vs Noise
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineChart data={timelineData} width={900} height={300} />
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  High
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  Medium
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  Low
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  Info
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance panel */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                Compliance & Hygiene
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileWarning className="w-4 h-4 text-pink-400" />
                    Ignored Alerts
                  </span>
                  <span className="font-semibold">{metricsData.ignoredAlerts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-amber-400" />
                    Proxy Bypass Attempts
                  </span>
                  <span className="font-semibold">{metricsData.proxyBypass}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    Missing Firewall Logs
                  </span>
                  <span className="font-semibold">{metricsData.missingFirewallLogs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Outdated Systems
                  </span>
                  <span className="font-semibold">{metricsData.outdatedSystems}</span>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Compliance score is computed from the ratio of ignored alerts, proxy bypass,
                  missing logs, and outdated systems over total analyzed logs.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KILL CHAIN + GEO + CONFIDENCE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Kill Chain */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">
                MITRE Kill Chain Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={killChainData} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        borderColor: '#4B5563',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Geo distribution */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                Top Attack Regions
                <Globe2 className="w-4 h-4 text-blue-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {geoData.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No clear geo information detected in threat summaries.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {geoData.map((g, idx) => (
                    <div
                      key={g.country}
                      className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">#{idx + 1}</span>
                        <span className="text-gray-200">{g.country}</span>
                      </div>
                      <span className="text-xs text-gray-400">{g.count} events</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Confidence distribution */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">
                Confidence Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full flex justify-center" style={{ minHeight: '260px' }}>
                <D3DonutChart
                  data={confidenceData.map((d) => ({
                    name: `${d.name} (${Math.round((d.value / Math.max(confidenceTotal, 1)) * 100)}%)`,
                    value: d.value,
                    color:
                      d.name === 'High'
                        ? '#8b5cf6'
                        : d.name === 'Medium'
                        ? '#6366f1'
                        : '#ec4899',
                  }))}
                  width={260}
                  height={260}
                />
              </div>
              <div className="mt-3 text-xs text-gray-400 space-y-1">
                {confidenceData.map((d) => (
                  <div key={d.name} className="flex justify-between">
                    <span>{d.name}</span>
                    <span>
                      {d.value} (
                      {Math.round((d.value / Math.max(confidenceTotal, 1)) * 100)}
                      %)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SOURCES / DESTINATIONS / THREAT FLOW */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-6">
          {/* Top sources */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Top Source IPs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {topSources.length === 0 && (
                  <p className="text-gray-400">No structured source IP info detected.</p>
                )}
                {topSources.map((src) => (
                  <div
                    key={src.key}
                    className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-gray-200 text-xs font-mono">{src.key}</p>
                      <p className="text-[11px] text-gray-500">{src.count} events</p>
                    </div>
                    <SeverityBadge severity={src.severity} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top destinations */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">
                Top Destination IPs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {topDestinations.length === 0 && (
                  <p className="text-gray-400">No structured destination IP info detected.</p>
                )}
                {topDestinations.map((dst) => (
                  <div
                    key={dst.key}
                    className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-gray-200 text-xs font-mono">{dst.key}</p>
                      <p className="text-[11px] text-gray-500">{dst.count} events</p>
                    </div>
                    <SeverityBadge severity={dst.severity} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Threat Flow */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">
                Threat Flow: Severity to Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full" style={{ minHeight: '260px' }}>
                <SankeyChart data={sankeyData} width={600} height={260} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-gray-400 mb-2">Severity Levels</p>
                  <div className="space-y-1">
                    {sankeyData.nodes
                      .filter((n) => ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(n.name))
                      .map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-300">{item.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-400 mb-2">Confidence Levels</p>
                  <div className="space-y-1">
                    {sankeyData.nodes
                      .filter(
                        (n) =>
                          !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(n.name),
                      )
                      .map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-300">{item.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ANOMALY SPOTLIGHT + THREAT LIST */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Anomaly Spotlight */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                Anomaly Spotlight
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {anomalySpotlight.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No anomaly-rich events detected in the current dataset.
                  </p>
                )}
                {anomalySpotlight.map((item) => (
                  <div
                    key={item.index}
                    className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:bg-gray-900/70 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <SeverityBadge severity={item.flag} />
                      <div className="flex items-center gap-2">
                        <ConfidenceBadge confidence={item.confidence} />
                        {item.anomalyScore > 0 && (
                          <span className="text-xs text-amber-300">
                            Anomaly {item.anomalyScore}/100
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-2 line-clamp-3">
                      {item.comments}
                    </p>
                    {item.mitre_tactics && item.mitre_tactics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.mitre_tactics.map((tactic, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] bg-purple-900/40 text-purple-300 px-2 py-1 rounded"
                          >
                            {tactic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rotating threat list */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                Latest High/Medium Threats
                <Target className="w-4 h-4 text-red-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {threatData
                  .filter((item) => isThreat(item.output.flag))
                  .slice(0, 3)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-900/60 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <SeverityBadge severity={item.output.flag} />
                        <ConfidenceBadge confidence={item.output.confidence} />
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-3">
                        {item.output.comments}
                      </p>
                    </div>
                  ))}
                {metricsData.threatsDetected > 3 && (
                  <p className="text-[11px] text-gray-500">
                    Showing 3 of {metricsData.threatsDetected} active threats.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Built for SOC wall monitoring — React, TypeScript, Tailwind CSS &amp; shadcn/ui</p>
          <p className="mt-1">Powered by n8n Automation | 42Beirut x Teknologiia Hackathon 2025</p>
        </div>
      </div>
    </div>
  );
}
