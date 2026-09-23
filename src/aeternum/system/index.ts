/**
 * L6 — SYSTEM COMPONENTS FEDERATION INDEX
 * Host: N05
 *
 * This file is intentionally an index of the distributed L6 surfaces.
 * It does not duplicate execution engines from the owning nuclei.
 */
export const L6_SYSTEM_COMPONENTS = [
  "command-processing",
  "command-processing-ui",
  "eru-audit",
  "full-cognition",
  "module-detail",
  "omni-mode",
  "quantum-core",
  "icons",
  "synthesis-loader",
] as const;

export type L6SystemComponentId = typeof L6_SYSTEM_COMPONENTS[number];

export interface L6SystemComponentDescriptor {
  id: L6SystemComponentId;
  host: "N01" | "N02" | "N03" | "N04" | "N05" | "N06" | "N07" | "SARA";
  kind: "engine" | "ui" | "projection" | "policy" | "support";
}

export const L6_SYSTEM_COMPONENT_DESCRIPTOR: readonly L6SystemComponentDescriptor[] = [
  { id: "command-processing", host: "N01", kind: "engine" },
  { id: "command-processing-ui", host: "N04", kind: "ui" },
  { id: "eru-audit", host: "SARA", kind: "policy" },
  { id: "full-cognition", host: "N06", kind: "engine" },
  { id: "module-detail", host: "N03", kind: "projection" },
  { id: "omni-mode", host: "N07", kind: "policy" },
  { id: "quantum-core", host: "N06", kind: "engine" },
  { id: "icons", host: "N02", kind: "support" },
  { id: "synthesis-loader", host: "N04", kind: "projection" },
] as const;
