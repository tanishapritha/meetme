import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for merging tailwind classes with dynamic overrides.
 * Standard in enterprise shadcn-based projects.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
