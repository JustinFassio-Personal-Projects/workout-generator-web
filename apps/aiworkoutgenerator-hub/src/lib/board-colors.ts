import { cn } from "@/lib/utils";
import type { BoardAccent } from "@/types/board";

/**
 * Map BoardAccent enum to Tailwind CSS classes
 * Uses semantic tokens (info, success, warning, danger, brand)
 *
 * @deprecated This constant only supports the original 5 colors (brand, info, success, warning, danger).
 * For all 15 accent colors, use the hex color functions instead:
 * - getAccentColor() for primary colors
 * - getAccentBorderColor() for border colors
 * - getAccentGlowColor() for glow/shadow colors
 * - getAccentTextColor() for text colors
 *
 * This is a Partial<Record> because it doesn't cover all 15 colors.
 * Accessing unsupported colors will return undefined, which may cause runtime errors.
 */
export const BOARD_ACCENT_CLASSES: Partial<Record<BoardAccent, string>> = {
  brand: "border-primary/20 bg-primary/5 text-primary",
  info: "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400",
  success:
    "border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400",
  warning:
    "border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400",
  danger: "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400",
};

/**
 * Hex color mappings for all 15 accent colors
 */
const ACCENT_COLORS: Record<BoardAccent, string> = {
  brand: "#9FAF6C", // Primary brand color
  info: "#3B82F6", // Blue
  success: "#10B981", // Green
  warning: "#F59E0B", // Amber/Yellow
  danger: "#EF4444", // Red
  amber: "#F59E0B", // Amber
  orange: "#F97316", // Orange
  dark_orange: "#EA580C", // Dark Orange
  red_orange: "#FF4500", // Red-Orange
  red: "#EF4444", // Red
  blue_1: "#DBEAFE", // Light Blue
  blue_2: "#BFDBFE", // Light Blue
  blue_3: "#93C5FD", // Medium Blue
  blue_4: "#60A5FA", // Blue
  blue_5: "#3B82F6", // Dark Blue
};

/**
 * Border colors (slightly darker or with opacity for subtle borders)
 */
const ACCENT_BORDER_COLORS: Record<BoardAccent, string> = {
  brand: "#9FAF6C",
  info: "#3B82F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  amber: "#F59E0B",
  orange: "#F97316",
  dark_orange: "#EA580C",
  red_orange: "#FF4500",
  red: "#EF4444",
  blue_1: "#93C5FD",
  blue_2: "#60A5FA",
  blue_3: "#3B82F6",
  blue_4: "#2563EB",
  blue_5: "#1D4ED8",
};

/**
 * Text colors (contrasting colors for readability on buttons/backgrounds)
 * White for dark backgrounds, dark for light backgrounds
 */
const ACCENT_TEXT_COLORS: Record<BoardAccent, string> = {
  brand: "#FFFFFF", // White text on brand color
  info: "#FFFFFF", // White text on blue
  success: "#FFFFFF", // White text on green
  warning: "#FFFFFF", // White text on amber
  danger: "#FFFFFF", // White text on red
  amber: "#FFFFFF", // White text on amber
  orange: "#FFFFFF", // White text on orange
  dark_orange: "#FFFFFF", // White text on dark orange
  red_orange: "#FFFFFF", // White text on red-orange
  red: "#FFFFFF", // White text on red
  blue_1: "#1E40AF", // Dark text on light blue
  blue_2: "#1E40AF", // Dark text on light blue
  blue_3: "#FFFFFF", // White text on medium blue
  blue_4: "#FFFFFF", // White text on blue
  blue_5: "#FFFFFF", // White text on dark blue
};

/**
 * Glow colors (for box-shadow effects with opacity)
 */
const ACCENT_GLOW_COLORS: Record<BoardAccent, string> = {
  brand: "rgba(159, 175, 108, 0.3)", // Brand with opacity
  info: "rgba(59, 130, 246, 0.3)", // Blue with opacity
  success: "rgba(16, 185, 129, 0.3)", // Green with opacity
  warning: "rgba(245, 158, 11, 0.3)", // Amber with opacity
  danger: "rgba(239, 68, 68, 0.3)", // Red with opacity
  amber: "rgba(245, 158, 11, 0.3)", // Amber with opacity
  orange: "rgba(249, 115, 22, 0.3)", // Orange with opacity
  dark_orange: "rgba(234, 88, 12, 0.3)", // Dark orange with opacity
  red_orange: "rgba(255, 69, 0, 0.3)", // Red-orange with opacity
  red: "rgba(239, 68, 68, 0.3)", // Red with opacity
  blue_1: "rgba(219, 234, 254, 0.5)", // Light blue with opacity
  blue_2: "rgba(191, 219, 254, 0.5)", // Light blue with opacity
  blue_3: "rgba(147, 197, 253, 0.3)", // Medium blue with opacity
  blue_4: "rgba(96, 165, 250, 0.3)", // Blue with opacity
  blue_5: "rgba(59, 130, 246, 0.3)", // Dark blue with opacity
};

/**
 * Get primary accent color (hex)
 */
export function getAccentColor(accent?: BoardAccent): string | undefined {
  if (!accent) return undefined;
  const color = ACCENT_COLORS[accent];
  if (!color && process.env.NODE_ENV === "development") {
    console.warn(`[board-colors] Unknown accent color: ${accent}`);
  }
  return color;
}

/**
 * Get border color (hex)
 */
export function getAccentBorderColor(accent?: BoardAccent): string | undefined {
  if (!accent) return undefined;
  const color = ACCENT_BORDER_COLORS[accent];
  if (!color && process.env.NODE_ENV === "development") {
    console.warn(`[board-colors] Unknown accent color for border: ${accent}`);
  }
  return color;
}

/**
 * Get glow/shadow color (rgba with opacity)
 */
export function getAccentGlowColor(accent?: BoardAccent): string | undefined {
  if (!accent) return undefined;
  const color = ACCENT_GLOW_COLORS[accent];
  if (!color && process.env.NODE_ENV === "development") {
    console.warn(`[board-colors] Unknown accent color for glow: ${accent}`);
  }
  return color;
}

/**
 * Get text color (hex) - contrasting color for readability
 */
export function getAccentTextColor(accent?: BoardAccent): string | undefined {
  if (!accent) return undefined;
  const color = ACCENT_TEXT_COLORS[accent];
  if (!color && process.env.NODE_ENV === "development") {
    console.warn(`[board-colors] Unknown accent color for text: ${accent}`);
  }
  return color;
}

/**
 * Get Tailwind classes for a BoardAccent
 * @deprecated Use getAccentColor() and inline styles instead for all 15 colors
 */
export function getBoardAccentClasses(accent?: BoardAccent): string {
  if (!accent) return "";
  return BOARD_ACCENT_CLASSES[accent] || "";
}

/**
 * Apply accent classes to a component
 * @deprecated Use getAccentColor() and inline styles instead for all 15 colors
 */
export function applyBoardAccent(
  className: string,
  accent?: BoardAccent
): string {
  if (!accent) return className;
  return cn(className, getBoardAccentClasses(accent));
}
