import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Automatically resolves conflicts (e.g., if both 'bg-red-500' and 'bg-blue-500' are present, keeps the last one)
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return twMerge(inputs.filter(Boolean).join(' '));
}
