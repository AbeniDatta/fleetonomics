/** Leaflet-style [lat, lng] vertices, closed polygon (first point not repeated at end). */
export type GeofenceRing = [number, number][];

export type SavedGeofence = {
  id: string;
  userId: string;
  name: string;
  ring: GeofenceRing;
  /** If false, shape is shown but exit/cross alarms are not evaluated for this fence. */
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};
