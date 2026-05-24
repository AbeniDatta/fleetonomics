/** Vendor API channel index (CHN param) for each physical camera. */
export const DMS_CAMERA_CHANNEL = 0;
export const ADAS_CAMERA_CHANNEL = 1;

export type CameraRole = "DMS" | "ADAS";

export function channelForRole(role: CameraRole): number {
  return role === "DMS" ? DMS_CAMERA_CHANNEL : ADAS_CAMERA_CHANNEL;
}

export function roleForChannel(channel: number): CameraRole | null {
  if (channel === DMS_CAMERA_CHANNEL) return "DMS";
  if (channel === ADAS_CAMERA_CHANNEL) return "ADAS";
  return null;
}

export function cameraLabel(channel: number): string {
  return `Camera ${channel + 1}`;
}
