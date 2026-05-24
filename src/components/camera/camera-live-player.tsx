"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type LiveFeedResponse = {
  source: string;
  data?: { hlsUrl: string; playerUrl: string; channel: number };
  error?: string;
};

type Props = {
  devIdno: string;
  channel: number;
  plate: string;
  online?: boolean | null;
  className?: string;
  compact?: boolean;
};

export function CameraLivePlayer({ devIdno, channel, plate, online, className, compact }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error" | "offline">("idle");
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (online === false) {
      setStatus("offline");
      return;
    }

    let cancelled = false;
    let hls: import("hls.js").default | null = null;

    async function start() {
      setStatus("loading");
      setErrorMsg(null);
      try {
        const qs = new URLSearchParams({ devIdno, channel: String(channel) });
        const res = await fetch(`/api/fleet/camera-feeds/live?${qs}`);
        const json = (await res.json()) as LiveFeedResponse;
        if (cancelled) return;
        if (!res.ok || !json.data?.hlsUrl) {
          setStatus("error");
          setErrorMsg(json.error ?? "Could not start live stream");
          setPlayerUrl(json.data?.playerUrl ?? null);
          return;
        }
        setPlayerUrl(json.data.playerUrl);
        const video = videoRef.current;
        if (!video) return;

        const url = json.data.hlsUrl;
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
          await video.play().catch(() => undefined);
          setStatus("playing");
          return;
        }

        const Hls = (await import("hls.js")).default;
        if (!Hls.isSupported()) {
          setStatus("error");
          setErrorMsg("HLS not supported in this browser");
          return;
        }
        hls = new Hls({ enableWorker: true });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled) {
            video.play().catch(() => undefined);
            setStatus("playing");
          }
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal && !cancelled) {
            setStatus("error");
            setErrorMsg("Stream unavailable (device may be offline)");
          }
        });
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg("Failed to connect to camera");
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [devIdno, channel, online]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-vms-border bg-black",
        compact ? "aspect-video" : "aspect-video min-h-[140px]",
        className,
      )}
    >
      <video ref={videoRef} className="h-full w-full object-contain" muted playsInline autoPlay />
      <div className="flex items-center justify-between gap-2 border-t border-vms-border bg-vms-inset/90 px-2 py-1 text-[10px] text-zinc-400 md:text-xs">
        <span className="truncate font-medium text-zinc-200">{plate}</span>
        <span>
          {status === "loading" && "Connecting…"}
          {status === "playing" && <span className="text-emerald-400">Live</span>}
          {status === "offline" && <span className="text-zinc-500">Offline</span>}
          {status === "error" && <span className="text-amber-400">No signal</span>}
        </span>
      </div>
      {(status === "error" || status === "offline") && (
        <div className="border-t border-vms-border bg-vms-inset px-2 py-1.5 text-[10px] text-zinc-500 md:text-xs">
          {status === "offline" ? "Device offline — recordings may still be available below." : errorMsg}
          {playerUrl ? (
            <a href={playerUrl} target="_blank" rel="noreferrer" className="ml-1 text-sky-400 underline">
              Open vendor player
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
