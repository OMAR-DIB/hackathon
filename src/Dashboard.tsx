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
        
        // Parse the new data format
        const parsedData = (result.data || []).map((item: any) => {
          try {
            // New format: choices[0].message.content contains JSON string
            if (item.choices?.[0]?.message?.content) {
              const jsonText = item.choices[0].message.content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
              const parsed = JSON.parse(jsonText);
              return {
                output: {
                  flag: parsed.flag || 'INFO',
                  comments: parsed.comments || '',
                  confidence: parsed.confidence || 'low',
                  recommended_action: parsed.recommended_action || 'none',
                  mitre_tactics: parsed.mitre_tactics || [],
                }
              };
            }
            // Alternative format: content.parts[0].text
            if (item.content?.parts?.[0]?.text) {
              const jsonText = item.content.parts[0].text
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
              const parsed = JSON.parse(jsonText);
              return {
                output: {
                  flag: parsed.flag || 'INFO',
                  comments: parsed.comments || '',
                  confidence: parsed.confidence || 'low',
                  recommended_action: parsed.recommended_action || 'none',
                  mitre_tactics: parsed.mitre_tactics || [],
                }
              };
            }
            // Old format: output directly
            if (item.output) {
              return item;
            }
          } catch (parseErr) {
            console.error('Error parsing threat data JSON:', parseErr, item);
          }
          return null;
        }).filter((item: any) => item !== null);
        
        setThreatData(parsedData);
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
    const flags = threatData.map((item) => item?.output?.flag).filter(Boolean);
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
        item?.output?.comments?.toLowerCase().includes(k.toLowerCase()),
      ),
    ).length;

    const ignoredAlerts = threatData.filter((item) =>
      item?.output?.comments?.toLowerCase().includes('action was \'ignored\'') ||
      item?.output?.comments?.toLowerCase().includes('action taken was \'ignored\'') ||
      item?.output?.comments?.toLowerCase().includes('ignored')
    ).length;

    const proxyBypass = threatData.filter((item) =>
      item?.output?.comments?.toLowerCase().includes('direct connection') ||
      item?.output?.comments?.toLowerCase().includes('bypassing proxy') ||
      item?.output?.comments?.toLowerCase().includes('without proxy')
    ).length;

    const missingFirewallLogs = threatData.filter((item) =>
      item?.output?.comments?.toLowerCase().includes('firewall logs are missing') ||
      item?.output?.comments?.toLowerCase().includes('no log entry') ||
      item?.output?.comments?.toLowerCase().includes('missing entries')
    ).length;

    const outdatedSystems = threatData.filter((item) =>
      item?.output?.comments?.toLowerCase().includes('outdated browser') ||
      item?.output?.comments?.toLowerCase().includes('windows 98') ||
      item?.output?.comments?.toLowerCase().includes('ios 10.3.4') ||
      item?.output?.comments?.toLowerCase().includes('outdated')
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
      item?.output?.mitre_tactics?.forEach((tactic) => {
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
      const conf = item?.output?.confidence || 'low';
      const normalized = conf.charAt(0).toUpperCase() + conf.slice(1).toLowerCase();
      confidenceMap[normalized] = (confidenceMap[normalized] || 0) + 1;
    });
    return Object.entries(confidenceMap).map(([name, value]) => ({ name, value }));
  };

  // ---------- SANKEY ----------
  const getSankeyData = () => {
    const flagToConfidence: Record<string, Record<string, number>> = {};
    threatData.forEach((item) => {
      const flag = item?.output?.flag || 'INFO';
      const conf = item?.output?.confidence || 'low';
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
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex items-center justify-center relative">
        <div className="text-center">
          <Activity className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
          <p className="text-cyan-300 text-xl font-mono neon-text">⟨ Loading threat data... ⟩</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex items-center justify-center relative">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] pulse-neon" />
          <p className="text-red-300 text-xl mb-2 font-mono neon-text">⟨ Error loading threat data ⟩</p>
          <p className="text-cyan-400/70 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-slate-950 p-4 md:p-8 relative">

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}

        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2 neon-text">

              42Beirut x Teknologiia — SOC Wall

            </h1>

            <p className="text-cyan-300/70 font-mono text-sm">

              ⟨ Enterprise Automated Log Enrichment &amp; Threat Intelligence Monitoring ⟩

            </p>

          </div>

          <div className="flex items-center gap-2 text-xs text-cyan-400/80 font-mono cyber-border px-3 py-2 rounded bg-cyan-500/5">

            <ListFilter className="w-4 h-4" />

            <span>View: Enterprise Network • Focus: Abnormal Behavior &amp; Compliance</span>

          </div>

        </div>

        {/* TOP KPI BAR */}

        <div className="holographic-card rounded-xl p-4 md:p-6 mb-6 shadow-2xl neon-glow relative overflow-hidden">

          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">

            {/* Active Threats */}

            <div className="text-center group hover:scale-105 transition-transform duration-200">

              <p className="text-xs font-medium text-cyan-300/70 font-mono uppercase tracking-wider mb-3">Active Threats</p>

              <div className="flex items-center justify-center mb-3">

                <AlertOctagonIcon className="w-8 h-8 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] pulse-neon" />

              </div>

              <p className="text-2xl font-bold text-red-400" style={{textShadow: '0 0 10px rgba(239,68,68,0.8)'}}>{metricsData.threatsDetected}</p>

              <p className="text-[11px] text-cyan-400/50 mt-1 font-mono">

                HIGH + MEDIUM ({Math.round(

                  (metricsData.threatsDetected / Math.max(metricsData.totalLogs, 1)) * 100,

                )}

                %)

              </p>

            </div>

            {/* High Severity */}

            <div className="text-center group hover:scale-105 transition-transform duration-200">

              <p className="text-xs font-medium text-cyan-300/70 font-mono uppercase tracking-wider mb-3">High Severity</p>

              <div className="flex items-center justify-center mb-3">

                <AlertTriangle className="w-8 h-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />

              </div>

              <p className="text-2xl font-bold text-orange-400" style={{textShadow: '0 0 10px rgba(251,146,60,0.8)'}}>{metricsData.high}</p>

            </div>

            {/* Medium Severity */}

            <div className="text-center group hover:scale-105 transition-transform duration-200">

              <p className="text-xs font-medium text-cyan-300/70 font-mono uppercase tracking-wider mb-3">Medium Severity</p>

              <div className="flex items-center justify-center mb-3">

                <AlertCircle className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />

              </div>

              <p className="text-2xl font-bold text-yellow-400" style={{textShadow: '0 0 10px rgba(250,204,21,0.8)'}}>{metricsData.medium}</p>

            </div>

            {/* Anomalous Events */}

            <div className="text-center group hover:scale-105 transition-transform duration-200">

              <p className="text-xs font-medium text-cyan-300/70 font-mono uppercase tracking-wider mb-3">Anomalous Events</p>

              <div className="flex items-center justify-center mb-3">

                <Activity className="w-8 h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />

              </div>

              <p className="text-2xl font-bold text-amber-400" style={{textShadow: '0 0 10px rgba(251,191,36,0.8)'}}>{metricsData.anomalies}</p>

              <p className="text-[11px] text-cyan-400/50 mt-1 font-mono">Detected abnormal behavior</p>

            </div>

            {/* Total Logs */}

            <div className="text-center group hover:scale-105 transition-transform duration-200">

              <p className="text-xs font-medium text-cyan-300/70 font-mono uppercase tracking-wider mb-3">Total Logs</p>

              <div className="flex items-center justify-center mb-3">

                <Activity className="w-8 h-8 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" />

              </div>

              <p className="text-2xl font-bold text-indigo-400" style={{textShadow: '0 0 10px rgba(129,140,248,0.8)'}}>{metricsData.totalLogs}</p>

            </div>

            {/* Clean Traffic */}

            <div className="text-center group hover:scale-105 transition-transform duration-200">

              <p className="text-xs font-medium text-cyan-300/70 font-mono uppercase tracking-wider mb-3">Clean Traffic</p>

              <div className="flex items-center justify-center mb-3">

                <Shield className="w-8 h-8 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]" />

              </div>

              <p className="text-2xl font-bold text-green-400" style={{textShadow: '0 0 10px rgba(74,222,128,0.8)'}}>{metricsData.cleanTraffic}</p>

            </div>

            {/* Compliance Score */}

            <div className="text-center group hover:scale-105 transition-transform duration-200">

              <p className="text-xs font-medium text-cyan-300/70 font-mono uppercase tracking-wider mb-3">Compliance Score</p>

              <div className="flex items-center justify-center mb-3">

                <CheckCircle2 className="w-8 h-8 text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" />

              </div>

              <p className="text-2xl font-bold text-purple-400" style={{textShadow: '0 0 10px rgba(192,132,252,0.8)'}}>

                {metricsData.complianceScore}%

              </p>

              <p className="text-[11px] text-cyan-400/50 mt-1 font-mono">Lower = more issues</p>

            </div>

            {/* Ignored Alerts */}

            <div className="text-center group hover:scale-105 transition-transform duration-200">

              <p className="text-xs font-medium text-cyan-300/70 font-mono uppercase tracking-wider mb-3">Ignored Alerts</p>

              <div className="flex items-center justify-center mb-3">

                <FileWarning className="w-8 h-8 text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]" />

              </div>

              <p className="text-2xl font-bold text-pink-400" style={{textShadow: '0 0 10px rgba(244,114,182,0.8)'}}>{metricsData.ignoredAlerts}</p>

              <p className="text-[11px] text-cyan-400/50 mt-1 font-mono">Review incident handling</p>

            </div>

          </div>

        </div>

        {/* KILL CHAIN + CONFIDENCE + THREAT FLOW */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* Kill Chain */}

          <Card className="holographic-card shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300">

            <CardHeader className="pb-3 border-b border-cyan-500/20">

              <CardTitle className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-mono uppercase tracking-wider">

                ⟨ MITRE Kill Chain Activity ⟩

              </CardTitle>

            </CardHeader>

            <CardContent className="pt-0 flex items-center justify-center">

              <div className="w-full h-56">

                <ResponsiveContainer width="100%" height="100%">

                  <BarChart data={killChainData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 255, 0.1)" horizontal={true} vertical={false} />

                    <XAxis type="number" hide />

                    <YAxis

                      type="category"

                      dataKey="name"

                      tick={{ fill: '#22d3ee', fontSize: 11, fontFamily: 'monospace' }}

                      axisLine={{ stroke: 'rgba(0, 255, 255, 0.2)' }}

                      tickLine={false}

                      width={90}

                    />

                    <Tooltip

                      contentStyle={{

                        backgroundColor: 'rgba(13, 17, 28, 0.95)',

                        borderColor: '#22d3ee',

                        borderWidth: 1,

                        borderRadius: 8,

                        fontSize: 12,

                        color: '#22d3ee',

                        boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)',

                        fontFamily: 'monospace',

                      }}

                      labelStyle={{ color: '#22d3ee', fontWeight: 'bold' }}

                      itemStyle={{ color: '#a855f7' }}

                      cursor={{ fill: 'rgba(0, 255, 255, 0.05)' }}

                    />

                    <Bar 

                      dataKey="value" 

                      fill="url(#colorGradient)" 

                      radius={[0, 6, 6, 0]}

                    />

                    <defs>

                      <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">

                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />

                        <stop offset="50%" stopColor="#a855f7" stopOpacity={0.9} />

                        <stop offset="100%" stopColor="#ec4899" stopOpacity={1} />

                      </linearGradient>

                    </defs>

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </CardContent>

          </Card>

          {/* Confidence distribution */}

          <Card className="holographic-card shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">

            <CardHeader className="pb-3 border-b border-cyan-500/20">

              <CardTitle className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-mono uppercase tracking-wider">

                ⟨ Confidence Distribution ⟩

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

              <div className="mt-2 text-xs text-cyan-300/70 font-mono space-y-1">

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

          <Card className="holographic-card shadow-2xl hover:shadow-pink-500/20 transition-all duration-300">

            <CardHeader className="pb-3 border-b border-cyan-500/20">

              <CardTitle className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 font-mono uppercase tracking-wider">

                ⟨ Threat Flow: Severity to Confidence ⟩

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

            threats={threatData.filter(item => item?.output?.flag !== 'INFO')}

          />

        </div>

        {/* Footer */}

        <div className="mt-8 text-center text-sm text-cyan-400/50 font-mono">

          <p className="mb-1">⟨ Built for SOC wall monitoring — React, TypeScript, Tailwind CSS &amp; shadcn/ui ⟩</p>

          <p className="text-purple-400/50">⟨ Powered by n8n Automation | 42Beirut x Teknologiia Hackathon 2025 ⟩</p>

          <div className="mt-3 w-32 h-0.5 mx-auto bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>

        </div>

      </div>

    </div>

  );

}

