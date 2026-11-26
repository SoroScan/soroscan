// ── Mock data for the dependency graph (tests / Storybook only) ───────────────
//
// This module is intentionally never imported by production code. The live
// contract-dependencies page sources data from the GraphQL API via
// `DependenciesForContract` and `mapCallGraphToContracts`.

import type { ContractWithDeps, DependencyType, VulnerabilitySeverity } from "./types";

/** Mock data generator for testing 100+ nodes */
export function generateMockContracts(count: number): ContractWithDeps[] {
  const severities: VulnerabilitySeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"];
  const depTypes: DependencyType[] = ["DIRECT", "INDIRECT", "CIRCULAR"];
  const contracts: ContractWithDeps[] = [];

  for (let i = 0; i < count; i++) {
    const id = `contract_${i}`;
    const sev = severities[i % severities.length];
    const hasDep = i > 0;
    const depIdx = hasDep ? Math.floor(Math.random() * i) : 0;

    contracts.push({
      id,
      name: `Contract_${i}`,
      address: `C${id.toUpperCase().replace("_", "")}...${i.toString(16).padStart(4, "0")}`,
      riskScore: Math.random() * 10,
      reachabilityPct: Math.random() * 100,
      vulnerabilities:
        sev !== "NONE"
          ? [
              {
                id: `vuln_${i}`,
                title: `Vulnerability ${i}`,
                severity: sev,
                impactedContracts: hasDep ? [`contract_${depIdx}`] : [],
              },
            ]
          : [],
      dependencies: hasDep
        ? [
            {
              id: `dep_${i}`,
              contractAddress: contracts[depIdx].address,
              contractName: contracts[depIdx].name,
              dependencyType: depTypes[i % depTypes.length],
            },
          ]
        : [],
      dependents: [],
    });
  }

  // Populate dependents (back-references)
  for (const contract of contracts) {
    for (const dep of contract.dependencies) {
      const target = contracts.find((c) => c.name === dep.contractName);
      if (target) {
        target.dependents.push({
          id: `dependent_${contract.id}`,
          contractAddress: contract.address,
          contractName: contract.name,
        });
      }
    }
  }

  return contracts;
}

/** Hardcoded representative mock for UI rendering */
export const MOCK_CONTRACTS: ContractWithDeps[] = [
  {
    id: "router",
    name: "Router",
    address: "CDROUTER...0001",
    riskScore: 8.2,
    reachabilityPct: 92,
    vulnerabilities: [
      {
        id: "v1",
        title: "Reentrancy in swap()",
        severity: "HIGH",
        impactedContracts: ["vault", "token"],
      },
    ],
    dependencies: [
      { id: "d1", contractAddress: "CDVAULT...0002", contractName: "Vault", dependencyType: "DIRECT" },
      { id: "d2", contractAddress: "CDORACLE...0003", contractName: "Oracle", dependencyType: "DIRECT" },
    ],
    dependents: [],
  },
  {
    id: "vault",
    name: "Vault",
    address: "CDVAULT...0002",
    riskScore: 7.1,
    reachabilityPct: 75,
    vulnerabilities: [
      { id: "v2", title: "Unchecked return value", severity: "MEDIUM", impactedContracts: ["token"] },
    ],
    dependencies: [
      { id: "d3", contractAddress: "CDTOKEN...0004", contractName: "Token", dependencyType: "DIRECT" },
      { id: "d4", contractAddress: "CDFEE...0005", contractName: "FeeCollector", dependencyType: "DIRECT" },
    ],
    dependents: [{ id: "dep1", contractAddress: "CDROUTER...0001", contractName: "Router" }],
  },
  {
    id: "oracle",
    name: "Oracle",
    address: "CDORACLE...0003",
    riskScore: 3.5,
    reachabilityPct: 45,
    vulnerabilities: [],
    dependencies: [
      { id: "d5", contractAddress: "CDPRICE...0006", contractName: "PriceFeed", dependencyType: "DIRECT" },
    ],
    dependents: [{ id: "dep2", contractAddress: "CDROUTER...0001", contractName: "Router" }],
  },
  {
    id: "token",
    name: "Token",
    address: "CDTOKEN...0004",
    riskScore: 9.5,
    reachabilityPct: 88,
    vulnerabilities: [
      { id: "v3", title: "Integer overflow in mint()", severity: "CRITICAL", impactedContracts: [] },
    ],
    dependencies: [],
    dependents: [
      { id: "dep3", contractAddress: "CDVAULT...0002", contractName: "Vault" },
    ],
  },
  {
    id: "feeCollector",
    name: "FeeCollector",
    address: "CDFEE...0005",
    riskScore: 2.1,
    reachabilityPct: 30,
    vulnerabilities: [],
    dependencies: [
      { id: "d6", contractAddress: "CDTREASURY...0007", contractName: "Treasury", dependencyType: "DIRECT" },
    ],
    dependents: [{ id: "dep4", contractAddress: "CDVAULT...0002", contractName: "Vault" }],
  },
  {
    id: "priceFeed",
    name: "PriceFeed",
    address: "CDPRICE...0006",
    riskScore: 4.2,
    reachabilityPct: 40,
    vulnerabilities: [
      { id: "v4", title: "Price manipulation vulnerability", severity: "MEDIUM", impactedContracts: ["oracle"] },
    ],
    dependencies: [],
    dependents: [{ id: "dep5", contractAddress: "CDORACLE...0003", contractName: "Oracle" }],
  },
  {
    id: "treasury",
    name: "Treasury",
    address: "CDTREASURY...0007",
    riskScore: 1.8,
    reachabilityPct: 20,
    vulnerabilities: [],
    dependencies: [],
    dependents: [{ id: "dep6", contractAddress: "CDFEE...0005", contractName: "FeeCollector" }],
  },
];
