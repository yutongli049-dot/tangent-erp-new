// lib/constants.ts

export type BusinessId = "sine" | "cus" | "tangent";

export interface BusinessUnit {
  id: BusinessId;
  label: string;
  type: "company" | "unit";
}

export const BUSINESS_UNITS: BusinessUnit[] = [
  { id: "tangent", label: "Tangent Group (All)", type: "company" },
  { id: "sine", label: "Sine Studio (驾校)", type: "unit" },
  { id: "cus", label: "CuS Academy (教培)", type: "unit" },
];

export const DEFAULT_BUSINESS_ID: BusinessId = "sine";