import type { CameraRole } from "@/lib/uctracking/camera-channels";

export type CameraRecordingRow = {
  id: string;
  devIdno: string;
  plate: string;
  role: CameraRole;
  channel: number;
  fileName: string | null;
  beginAt: string;
  endAt: string | null;
  durationSec: number | null;
  fileSizeBytes: number | null;
  playbackPath: string | null;
  syncedAt: string;
};
