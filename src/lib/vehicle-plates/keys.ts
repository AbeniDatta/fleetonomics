import type { Vehicle } from "@/lib/uctracking/schemas";

/** Stable key for plate overrides (device id preferred). */
export function vehicleDeviceKey(v: Pick<Vehicle, "id" | "plate" | "devIdno">): string {
  const dev = v.devIdno?.trim();
  if (dev) return dev;
  const plate = v.plate?.trim();
  if (plate) return plate;
  return v.id;
}

export function formatPlateNumberCell(plateNumber: string | null | undefined): string {
  if (plateNumber == null) return "—";
  const t = plateNumber.trim();
  return t.length > 0 ? t : "—";
}

export function findVehicleByRouteKey(vehicles: Vehicle[], routeKey: string): Vehicle | undefined {
  const k = decodeURIComponent(routeKey).trim().toLowerCase();
  if (!k) return undefined;
  return vehicles.find((v) => {
    const dev = v.devIdno?.trim().toLowerCase();
    const plate = v.plate.trim().toLowerCase();
    const pn = v.plateNumber?.trim().toLowerCase();
    const id = v.id.trim().toLowerCase();
    return plate === k || dev === k || pn === k || id === k;
  });
}
