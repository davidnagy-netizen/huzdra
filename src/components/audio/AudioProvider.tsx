"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";

export interface Track {
  id: string;
  title: string;
  src: string;
  artistName: string;
  occasionLabel?: string;
  styleLabel?: string;
}

interface AudioState {
  current: Track | null;
  playing: boolean;
  loading: boolean;
  time: number;
  duration: number;
  queue: Track[];
  play: (t: Track, queue?: Track[]) => void;
  toggle: (t?: Track, queue?: Track[]) => void;
  pause: () => void;
  seek: (s: number) => void;
  next: () => void;
  prev: () => void;
}

const Ctx = createContext<AudioState | null>(null);

/**
 * Egyetlen közös <audio> elem az egész oldalon: egyszerre csak egy mintadal szól,
 * és a hang csak lejátszáskor töltődik be (preload="none" → lazy load).
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const play = useCallback((t: Track, q?: Track[]) => {
    const a = ref.current;
    if (!a) return;
    if (q) setQueue(q);
    if (!current || current.id !== t.id) {
      a.src = t.src;
      setCurrent(t);
      setTime(0);
      setDuration(0);
      setLoading(true);
      track("sample_play", { sample_id: t.id, artist: t.artistName });
    }
    a.play().catch(() => setLoading(false));
  }, [current]);

  const pause = useCallback(() => ref.current?.pause(), []);
  const toggle = useCallback(
    (t?: Track, q?: Track[]) => {
      if (t && (!current || current.id !== t.id)) return play(t, q);
      if (ref.current?.paused) ref.current.play().catch(() => {});
      else ref.current?.pause();
    },
    [current, play],
  );
  const seek = useCallback((s: number) => {
    if (ref.current) ref.current.currentTime = s;
  }, []);
  const step = useCallback(
    (dir: 1 | -1) => {
      if (!current || !queue.length) return;
      const i = queue.findIndex((q) => q.id === current.id);
      const n = queue[(i + dir + queue.length) % queue.length];
      if (n) play(n);
    },
    [current, queue, play],
  );

  useEffect(() => {
    const a = ref.current!;
    const on = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      playing: () => setLoading(false),
      waiting: () => setLoading(true),
      timeupdate: () => setTime(a.currentTime),
      loadedmetadata: () => setDuration(Number.isFinite(a.duration) ? a.duration : 0),
      durationchange: () => setDuration(Number.isFinite(a.duration) ? a.duration : 0),
      ended: () => setPlaying(false),
    };
    (Object.keys(on) as (keyof typeof on)[]).forEach((k) => a.addEventListener(k, on[k]));
    return () => (Object.keys(on) as (keyof typeof on)[]).forEach((k) => a.removeEventListener(k, on[k]));
  }, []);

  const value = useMemo<AudioState>(
    () => ({ current, playing, loading, time, duration, queue, play, toggle, pause, seek, next: () => step(1), prev: () => step(-1) }),
    [current, playing, loading, time, duration, queue, play, toggle, pause, seek, step],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <audio ref={ref} preload="none" className="hidden" />
    </Ctx.Provider>
  );
}

export function useAudio() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAudio csak AudioProvideren belül használható");
  return c;
}

export const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
