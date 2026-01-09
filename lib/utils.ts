import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateTPS(tokens: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return parseFloat(((tokens / durationMs) * 1000).toFixed(2));
}

export function calculateAvgResponseTime(durations: number[]): number {
  if (durations.length === 0) return 0;
  const total = durations.reduce((acc, curr) => acc + curr, 0);
  return parseFloat((total / durations.length / 1000).toFixed(2));
}

