// ── Dependency Graph Types (#922) ─────────────────────────────────────────────

export type VulnerabilitySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type DependencyType = "DIRECT" | "INDIRECT" | "CIRCULAR";

export interface ContractVulnerability {
  id: string;
  title: string;
  severity: VulnerabilitySeverity;
  impactedContracts: string[];
}

export interface ContractDependency {
  id: string;
  contractAddress: string;
  contractName: string;
  dependencyType: DependencyType;
}

export interface ContractDependent {
  id: string;
  contractAddress: string;
  contractName: string;
}

export interface ContractWithDeps {
  id: string;
  name: string;
  address: string;
  riskScore: number;
  reachabilityPct: number;
  vulnerabilities: ContractVulnerability[];
  dependencies: ContractDependency[];
  dependents: ContractDependent[];
}

/** The worst severity among a contract's vulnerabilities */
export function getWorstSeverity(
  vulns: ContractVulnerability[],
): VulnerabilitySeverity {
  if (!vulns?.length) return "NONE";
  const order: VulnerabilitySeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"];
  for (const sev of order) {
    if (vulns.some((v) => v.severity === sev)) return sev;
  }
  return "NONE";
}

/** Tailwind text-color class for a severity */
export function severityColor(severity: VulnerabilitySeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "#ff3366"; // terminal-danger
    case "HIGH":
      return "#ff3366";
    case "MEDIUM":
      return "#ffaa00"; // terminal-warning
    case "LOW":
      return "#00d4ff"; // terminal-cyan
    default:
      return "#00ff41"; // terminal-green
  }
}

/** Hex border/fill color for nodes */
export function severityNodeColor(severity: VulnerabilitySeverity): {
  border: string;
  bg: string;
  text: string;
} {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return { border: "#ff3366", bg: "rgba(255, 51, 102, 0.12)", text: "#ff3366" };
    case "MEDIUM":
      return { border: "#ffaa00", bg: "rgba(255, 170, 0, 0.12)", text: "#ffaa00" };
    case "LOW":
      return { border: "#00d4ff", bg: "rgba(0, 212, 255, 0.12)", text: "#00d4ff" };
    default:
      return { border: "#00ff41", bg: "rgba(0, 255, 65, 0.08)", text: "#00ff41" };
  }
}
