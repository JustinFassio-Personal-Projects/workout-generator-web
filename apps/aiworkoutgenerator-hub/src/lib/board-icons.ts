import {
  Bell,
  Sparkles,
  Calendar,
  Tag,
  Megaphone,
  Info,
  CheckCircle,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import type { BoardIconKey } from "@/types/board";

/**
 * Map BoardIconKey enum to lucide-react icons
 */
export const BOARD_ICONS: Record<BoardIconKey, LucideIcon> = {
  bell: Bell,
  sparkles: Sparkles,
  calendar: Calendar,
  tag: Tag,
  megaphone: Megaphone,
  info: Info,
  check: CheckCircle,
  alert: AlertCircle,
};

/**
 * Get icon component for a BoardIconKey
 */
export function getBoardIcon(iconKey?: BoardIconKey): LucideIcon | null {
  if (!iconKey) return null;
  return BOARD_ICONS[iconKey] || null;
}
