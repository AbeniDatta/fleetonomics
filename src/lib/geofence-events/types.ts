export type GeofenceEventKind = "exit" | "cross";

export type GeofenceEvent = {
  id: string;
  userId: string;
  fenceId: string;
  fenceName: string;
  vehicleId: string;
  plate: string;
  kind: GeofenceEventKind;
  message: string;
  at: string; // ISO
  lat: number;
  lng: number;
};

