export type ComplianceBand = "red" | "amber" | "green";

export function complianceBand(expiresOn: Date, now = new Date()): ComplianceBand {
  const msPerDay = 86_400_000;
  const days = Math.ceil((expiresOn.getTime() - now.getTime()) / msPerDay);
  if (days < 0) return "red";
  if (days <= 30) return "amber";
  return "green";
}

export function complianceStatusLabel(expiresOn: Date, now = new Date()): string {
  const msPerDay = 86_400_000;
  const days = Math.ceil((expiresOn.getTime() - now.getTime()) / msPerDay);
  if (days < 0) return "Expired";
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
