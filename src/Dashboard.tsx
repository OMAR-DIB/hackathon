import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {

  AlertTriangle,

  AlertCircle,

  Activity,

  Shield,

  ListFilter,

  FileWarning,

  AlertOctagonIcon,

  CheckCircle2,

} from 'lucide-react';

import { SankeyChart } from '@/components/SankeyChart';

import { D3DonutChart } from '@/components/D3DonutChart';

// import { SignatureCard } from '@/components/SignatureCard';

import { ThreatDetectionsList } from '@/components/ThreatDetectionsList';

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

    recommended_action: string;

    mitre_tactics: string[];

  };

};

// ---------- DASHBOARD UI ----------

export default function Dashboard() {
  const [threatData, setThreatData] = useState<ThreatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch threat data from webhook
  useEffect(() => {
    const fetchThreatData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('http://localhost:5678/webhook/get-threats');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setThreatData(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch threat data');
        console.error('Error fetching threat data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreatData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchThreatData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // ---------- METRICS & HELPERS ----------
  const calculateMetrics = () => {
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

  // ---------- MITRE KILL CHAIN AGGREGATION ----------
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

  const getKillChainData = () => {
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

  // ---------- CONFIDENCE ----------
  const getConfidenceLevels = () => {
    const confidenceMap: Record<string, number> = {};
    threatData.forEach((item) => {
      const conf = item.output.confidence;
      const normalized = conf.charAt(0).toUpperCase() + conf.slice(1).toLowerCase();
      confidenceMap[normalized] = (confidenceMap[normalized] || 0) + 1;
    });
    return Object.entries(confidenceMap).map(([name, value]) => ({ name, value }));
  };

  // ---------- SANKEY ----------
  const getSankeyData = () => {
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

  // Calculate all data
  const metricsData = calculateMetrics();
  const killChainData = getKillChainData();
  const confidenceData = getConfidenceLevels();
  const confidenceTotal = confidenceData.reduce((sum, d) => sum + d.value, 0);
  const sankeyData = getSankeyData();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading threat data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white text-xl mb-2">Error loading threat data</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

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

        {/* KILL CHAIN + CONFIDENCE + THREAT FLOW */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* Kill Chain */}

          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">

            <CardHeader className="pb-3">

              <CardTitle className="text-lg font-bold text-white">

                MITRE Kill Chain Activity

              </CardTitle>

            </CardHeader>

            <CardContent className="pt-0">

              <div className="w-full h-56">

                <ResponsiveContainer width="100%" height="100%">

                  <BarChart data={killChainData} layout="vertical" margin={{ left: 40 }}>

                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

                    <XAxis type="number" hide />

                    <YAxis

                      type="category"

                      dataKey="name"

                      tick={{ fill: '#9CA3AF', fontSize: 10 }}

                    />

                    <Tooltip

                      contentStyle={{

                        backgroundColor: '#1f2937',

                        borderColor: '#8b5cf6',

                        borderRadius: 8,

                        fontSize: 12,

                        color: '#f3f4f6',

                      }}

                      labelStyle={{ color: '#f3f4f6' }}

                      itemStyle={{ color: '#e5e7eb' }}

                    />

                    <Bar dataKey="value" fill="#8b5cf6" />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </CardContent>

          </Card>

          {/* Confidence distribution */}

          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">

            <CardHeader className="pb-3">

              <CardTitle className="text-lg font-bold text-white">

                Confidence Distribution

              </CardTitle>

            </CardHeader>

            <CardContent className="pt-0">

              <div className="w-full flex justify-center" style={{ minHeight: '220px' }}>

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

                  width={220}

                  height={220}

                />

              </div>

              <div className="mt-2 text-xs text-gray-400 space-y-1">

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

          {/* Threat Flow */}

          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">

            <CardHeader className="pb-3">

              <CardTitle className="text-lg font-bold text-white">

                Threat Flow: Severity to Confidence

              </CardTitle>

            </CardHeader>

            <CardContent className="pt-0">

              <div className="w-full" style={{ minHeight: '220px' }}>

                <SankeyChart data={sankeyData} width={400} height={220} />

              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">

                <div>

                  <p className="font-semibold text-gray-400 mb-1.5 text-[10px]">Severity Levels</p>

                  <div className="space-y-0.5">

                    {sankeyData.nodes

                      .filter((n) => ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(n.name))

                      .map((item, index) => (

                        <div key={index} className="flex items-center gap-1.5">

                          <div className="w-2 h-2 rounded" style={{ backgroundColor: item.color }} />

                          <span className="text-gray-300 text-[10px]">{item.name}</span>

                        </div>

                      ))}

                  </div>

                </div>

                <div>

                  <p className="font-semibold text-gray-400 mb-1.5 text-[10px]">Confidence Levels</p>

                  <div className="space-y-0.5">

                    {sankeyData.nodes

                      .filter(

                        (n) =>

                          !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(n.name),

                      )

                      .map((item, index) => (

                        <div key={index} className="flex items-center gap-1.5">

                          <div className="w-2 h-2 rounded" style={{ backgroundColor: item.color }} />

                          <span className="text-gray-300 text-[10px]">{item.name}</span>

                        </div>

                      ))}

                  </div>

                </div>

              </div>

            </CardContent>

          </Card>

        </div>

        {/* THREAT DETECTIONS LIST */}

        <div className="mb-6">

          <ThreatDetectionsList

            threats={threatData.filter(item => item.output.flag !== 'INFO')}

          />

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

