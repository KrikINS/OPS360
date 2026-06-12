export const TRACKING_TYPES = [
  { value: "Serial", label: "Serial (per-unit serial tracking)" },
  { value: "Stocked", label: "Stocked (quantity tracking)" },
] as const

export type TrackingType = (typeof TRACKING_TYPES)[number]["value"]
