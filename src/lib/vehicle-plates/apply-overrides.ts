import type { Vehicle } from "@/lib/uctracking/schemas";
import { vehicleDeviceKey } from "./keys";
import { listPlateOverridesMap } from "./store";

export async function applyVehiclePlateOverrides(vehicles: Vehicle[]): Promise<Vehicle[]> {
  const overrides = await listPlateOverridesMap();
  if (overrides.size === 0) {
    return vehicles.map((v) => ({ ...v, plateNumber: v.plateNumber ?? null }));
  }

  return vehicles.map((v) => {
    const key = vehicleDeviceKey(v);
    const plateNumber = overrides.get(key) ?? overrides.get(v.plate) ?? overrides.get(v.id) ?? null;
    return { ...v, plateNumber };
  });
}
