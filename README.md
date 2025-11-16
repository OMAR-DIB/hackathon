# SOC Analyst Automation Platform

[The Show Case Video](google.com)

## Overview

This platform automates threat intelligence analysis for Security Operations Centers (SOC) by processing firewall logs through a multi-stage enrichment and AI-powered assessment pipeline. Built for the 42Beirut vs Teknologiia hackathon, it demonstrates how workflow automation can augment security analyst capabilities while managing API costs and processing time efficiently.

## Table of Contents

- [The Challenge](#the-challenge)
- [Our Approach](#our-approach)
- [Architecture Overview](#architecture-overview)
- [Workflow Stages](#workflow-stages)
- [Key Design Decisions](#key-design-decisions)
- [Frontend Integration](#frontend-integration)

---

## The Challenge

When we first received the firewall log dataset, we had no prior experience analyzing security logs at scale. The data contained dozens of fields, many of which were sparsely populated or completely empty. Our first task was understanding which data points actually mattered for identifying threats.

### What We Discovered

Through systematic analysis, we identified the fields that exhibited consistent patterns useful for threat detection:

- **Network identifiers**: Source IP, Destination IP, geolocation
- **Traffic characteristics**: Protocol, ports, payload size
- **Infrastructure context**: Device information, proxy configuration
- **Security signals**: Firewall actions, IDS/IPS alerts, malware indicators

Other fields like timestamps and session IDs showed essentially random variation and provided little value for distinguishing malicious activity from legitimate traffic.

### A Critical Insight

We discovered that the `Action Taken` field revealed something crucial about our data:

- **"Blocked"** entries were connections the firewall had already rejected
- **"Logged"** entries were suspicious connections that **actually reached our network**

This became the cornerstone of our strategy. Logged traffic represented the highest priority because these were potential threats that successfully bypassed our initial defenses.

---

## Our Approach

### Static Risk Assessment

We developed a weighted scoring system that assigns each log entry a risk score from 0 to 100 based on established attack patterns and security indicators.

**Scoring Weights:**
- Malware indicators: 4x (highest priority)
- Security alerts and IDS/IPS detections: 3x each
- Anomaly scores: 2x
- Firewall actions: 1x
- Port-based risk: 0.5x (contextual indicator)

**Classification Thresholds:**
- **SUSPICIOUS** (score > 70): Multiple concurrent threat indicators
- **WARNING** (score 40-70): Single concerning indicator or moderate anomalies
- **NORMAL** (score < 40): Low-risk traffic within expected parameters

### Solving the Data Completeness Problem

One of our biggest challenges was that most security log fields had missing values. While IP enrichment APIs are plentiful, we found virtually no third-party services for enriching fields like `Alerts/Warnings`, `IDS/IPS Alerts`, or `Malware Indicators`.

**Our solution** was to build a context-aware transformation system that:

1. Identifies missing values in security-critical fields
2. Applies intelligent defaults based on security best practices
3. Generates natural language explanations for each transformation

For example, an empty alert field becomes `"No Alert"` rather than being left blank. This explicit statement helps both human analysts and AI models understand that the absence of an alert is meaningful information, not incomplete data.

**Why this matters:** Large language models struggle with implicit information. By converting missing data into explicit statements with contextual narratives, we dramatically improve the accuracy of AI-powered threat assessment.

---

## Architecture Overview

The platform is built on n8n, an open-source workflow automation tool, and processes logs through seven distinct stages:

1. Data ingestion and sampling
2. Traffic classification (logged vs. blocked)
3. Static risk analysis with field enrichment
4. Tiered IP intelligence gathering
5. Multi-model AI threat assessment
6. Data aggregation and output
7. API endpoint for real-time access

---

## Workflow Stages

### Stage 1: Data Ingestion

**Components:** CSV reader → JSON parser → Random sampler

The workflow loads the firewall log CSV and randomly samples entries for processing. During development, we used 150-entry samples for rapid iteration. Production deployments can process the full dataset by adjusting a single parameter.

Random sampling provides a statistically representative cross-section of traffic patterns while reducing processing time during testing.

### Stage 2: Traffic Classification

**Components:** Action-based filters → Separate processing branches

The workflow splits into two paths based on firewall action:

- **Logged traffic**: Receives full static analysis and high-priority enrichment
- **Blocked traffic**: Receives identical analysis but lower enrichment priority

This separation allows us to focus expensive API calls on threats that actually penetrated our defenses.

### Stage 3: Static Analysis and Field Enrichment

**Components:** Custom JavaScript transformation engine

This stage performs two critical functions:

1. **Risk Scoring**: Calculates weighted risk scores using the algorithm described earlier
2. **Field Completion**: Fills missing security fields with context-aware defaults

The output includes a detailed transformation narrative explaining what data was filled and why. Here's an example:

```
STATIC LOG ANALYSIS - TRANSFORMATION NARRATIVE
Entry Timestamp: 2024-01-15 14:23:11
Connection: 192.168.1.100 → 203.0.113.45:443
Protocol: TCP

ORIGINAL STATE:
5 fields missing out of 18

TRANSFORMATIONS APPLIED:
• Alerts/Warnings: Filled missing alert field → 'No Alert'
• Malware Indicators: Filled missing malware field → 'Clean'

ANALYSIS SUMMARY:
• No security alert was generated for this traffic
• No malware signatures detected
• Firewall action: Logged
• Low anomaly score (23/100) - within normal parameters

STATIC RISK SCORE: 35/100
CLASSIFICATION: NORMAL
```

### Stage 4: Intelligent IP Enrichment

**Components:** Score-based filtering → Batch processor → Concurrent API calls

To manage API costs and rate limits, we implemented tiered enrichment:

**Full Enrichment** (Score ≥ 75, Logged traffic only):
- VirusTotal or AlienVault (threat intelligence, rotated randomly)
- IPInfo or IPApi (geographic context, rotated randomly)
- Shodan (open port and service detection)
- RIPE (network ownership and allocation)
- AbuseIPDB (historical abuse reports)

**Technical implementation:**
- Processes 10 entries per batch to avoid rate limiting
- Executes all 5 API calls concurrently within each batch using Promise.all()
- Randomly selects between alternative providers for load distribution and redundancy

**Why only "Logged" traffic?** Blocked connections were already stopped at the perimeter. We prioritize enrichment budget on threats that reached our network.

### Stage 5: Multi-Model AI Assessment

**Components:** Data serialization → Parallel LLM analysis → Consensus aggregation

We employ a three-model ensemble approach:

1. **DeepSeek** analyzes each log entry focusing on pattern detection and behavioral correlation
2. **GPT-4 Turbo** provides independent assessment emphasizing threat intelligence matching
3. **GPT-4** reconciles discrepancies between the first two models

**How it works:**

Both initial models receive identical prompts requesting:
- Severity classification (CRITICAL/HIGH/MEDIUM/LOW/INFO)
- Confidence level (high/medium/low)
- MITRE ATT&CK tactic mapping
- Recommended actions (immediate/investigate/monitor/none)
- Detailed commentary with evidence

The consensus model receives both assessments and is instructed to:
- Synthesize areas of agreement into a unified assessment
- Adjudicate disagreements by evaluating evidence quality
- Default to higher severity when uncertain (conservative security posture)
- Document the reasoning process

**Configuration details:**
- Temperature: 0.2-0.3 (low randomness for consistent security assessments)
- Output format: Enforced JSON schema for reliable parsing
- Response validation: Structured output parser ensures all required fields are present

This approach reduces false positives while catching threats that a single model might miss.

### Stage 6: Data Aggregation

**Components:** Multi-stream merge → JSON serialization → File output

The workflow combines three data sources:

1. Original log entries with static risk scores and transformation narratives
2. IP enrichment data from external threat intelligence APIs
3. LLM consensus assessment with confidence and recommendations

**Final output structure:**

```json
{
  "Source IP Address": "192.168.1.100",
  "Destination IP Address": "203.0.113.45",
  "static_risk_score": 85,
  "risk_classification": "SUSPICIOUS",
  "transformation_narrative": "...",
  
  "geo": {
    "city": "Unknown",
    "country": "US",
    "org": "Example ISP"
  },
  
  "threat": {
    "malicious": true,
    "detected_urls": 12,
    "last_analysis_stats": {...}
  },
  
  "shodan": {
    "ports": [22, 80, 443],
    "vulns": ["CVE-2023-12345"]
  },
  
  "abuseipdb": {
    "abuseConfidenceScore": 89,
    "totalReports": 45
  },
  
  "flag": "HIGH",
  "confidence": "high",
  "recommended_action": "investigate",
  "mitre_tactics": ["Initial Access", "Reconnaissance"],
  "model_agreement": "partial",
  "consensus_reasoning": "DeepSeek identified reconnaissance patterns while GPT-4 noted the IP's abuse history. Combined evidence supports HIGH severity classification."
}
```

### Stage 7: API Endpoint and Real-Time Access

**Components:** Webhook trigger → File reader → JSON parser

A dedicated webhook endpoint (`/get-threats`) serves processed results to external systems without re-running the analysis pipeline. This enables:

- Dashboard integration for security analysts
- Automated alerting systems
- Historical threat analysis tools
- SIEM (Security Information and Event Management) integration

---

## Key Design Decisions

### 1. Prioritization by Firewall Action
We enrich logged traffic more aggressively than blocked traffic because logged entries represent threats that successfully reached our network perimeter.

### 2. Hand-Rolled Semantic Enrichment
Since comprehensive log enrichment APIs don't exist beyond IP analysis, we built a custom solution that transforms missing data into explicit, contextually meaningful statements that both humans and AI can interpret accurately.

### 3. Weighted Risk Scoring
Our algorithm prioritizes actual threat indicators (malware detections, security alerts) over contextual information (port numbers, protocols) to reduce false positives.

### 4. Tiered API Consumption
Only high-risk entries receive expensive multi-source enrichment. This dramatically reduces API costs while ensuring critical threats get maximum scrutiny.

### 5. Dual-LLM Validation
Independent analysis by two models, followed by consensus arbitration, significantly reduces both false positives and false negatives compared to single-model approaches.

### 6. Batch Processing with Concurrency
We balance speed (parallel API requests) with rate limit compliance (batch processing) to maximize throughput without violating API terms of service.

### 7. Conservative Security Posture
When models disagree, the consensus model defaults to higher severity classifications. In security operations, false negatives (missed threats) are far more costly than false positives.

---

## Frontend Integration

### Auto-Refresh Behavior

The threat dashboard implements an automatic 30-second refresh cycle that continuously polls the `/get-threats` endpoint. **This is an intentional feature, not a bug.**

**Why we implemented this:**

1. **Real-time awareness**: Security analysts see newly identified threats as soon as they're processed
2. **Live workflow monitoring**: As the n8n workflow processes batches, the dashboard updates incrementally
3. **Continuous threat surveillance**: Aligns with SOC operational requirements for persistent monitoring

**Design considerations:**

The 30-second interval balances competing requirements:
- Short enough to feel responsive for critical alerts
- Long enough to avoid overwhelming the API endpoint
- Smooth enough to avoid disruptive user experience

During active workflow execution, users will notice the dashboard refreshing periodically. This is expected behavior ensuring analysts always view the most current threat intelligence available.

---

## Technical Stack

- **Workflow Engine**: n8n (self-hosted)
- **AI Models**: DeepSeek, OpenAI GPT-4 Turbo
- **Threat Intelligence APIs**: VirusTotal, AlienVault OTX, Shodan, AbuseIPDB
- **Geolocation APIs**: IPInfo, IPApi
- **Network Intelligence**: RIPE NCC

