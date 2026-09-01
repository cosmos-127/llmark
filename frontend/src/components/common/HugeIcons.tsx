import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  Activity01Icon,
  Activity02Icon,
  AiMagicIcon,
  Analytics01Icon,
  Analytics02Icon,
  Alert01Icon,
  Alert02Icon,
  AlertCircleIcon,
  ArrowDownRight01Icon,
  ArrowUpRight01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  BubbleChatIcon,
  CheckmarkCircle01Icon,
  CheckmarkSquare01Icon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  CircleGaugeIcon,
  Clock01Icon,
  CodeSquareIcon,
  CodeCircleIcon,
  CpuIcon,
  Database01Icon,
  DollarCircleIcon,
  EyeIcon,
  FilterIcon,
  FireIcon,
  FlashIcon,
  GitCompareIcon,
  Globe02Icon,
  Key01Icon,
  Layers01Icon,
  LockKeyIcon,
  Maximize01Icon,
  Minimize01Icon,
  NetworkIcon,
  PlayIcon,
  Rocket01Icon,
  Search01Icon,
  SecurityCheckIcon,
  SecurityIcon,
  ServerIcon,
  Settings01Icon,
  SlidersHorizontalIcon,
  Target01Icon,
  TerminalIcon,
  Time04Icon,
  ViewOffSlashIcon,
  Wifi01Icon,
  Copy01Icon,
  InformationCircleIcon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";

export interface HugeIconProps {
  icon: IconSvgElement;
  className?: string;
  size?: number | string;
  strokeWidth?: number;
  alt?: string;
}

export const HugeIcon: React.FC<HugeIconProps> = ({
  icon,
  className = "h-4 w-4",
  size,
  strokeWidth = 1.75,
}) => (
  <HugeiconsIcon
    icon={icon}
    className={className}
    size={size}
    strokeWidth={strokeWidth}
  />
);

export const Icons = {
  // Navigation & Core App
  Home: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={AiMagicIcon} {...props} />,
  Benchmark: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={FlashIcon} {...props} />,
  Diff: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={GitCompareIcon} {...props} />,
  History: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Time04Icon} {...props} />,
  Settings: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Settings01Icon} {...props} />,
  Sliders: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={SlidersHorizontalIcon} {...props} />,
  Play: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={PlayIcon} {...props} />,
  Rocket: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Rocket01Icon} {...props} />,
  Terminal: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={TerminalIcon} {...props} />,
  Search: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Search01Icon} {...props} />,
  Filter: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={FilterIcon} {...props} />,
  Copy: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Copy01Icon} {...props} />,
  Fire: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={FireIcon} {...props} />,
  Info: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={InformationCircleIcon} {...props} />,
  Key: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Key01Icon} {...props} />,
  Lock: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={LockKeyIcon} {...props} />,
  Server: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={ServerIcon} {...props} />,

  // Metrics, Signals & Telemetry
  Activity: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Activity01Icon} {...props} />,
  ActivityPulse: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Activity02Icon} {...props} />,
  Gauge: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={CircleGaugeIcon} {...props} />,
  Speed: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={CircleGaugeIcon} {...props} />,
  Zap: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={FlashIcon} {...props} />,
  Flash: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={FlashIcon} {...props} />,
  Clock: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Clock01Icon} {...props} />,
  Shield: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={SecurityIcon} {...props} />,
  ShieldCheck: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={SecurityCheckIcon} {...props} />,
  CheckCircle: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={CheckmarkCircle01Icon} {...props} />,
  CheckCircle2: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={CheckmarkCircle02Icon} {...props} />,
  CheckSquare: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={CheckmarkSquare01Icon} {...props} />,
  Check: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={CheckmarkBadge01Icon} {...props} />,
  Dollar: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={DollarCircleIcon} {...props} />,
  DollarSign: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={DollarCircleIcon} {...props} />,
  Cpu: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={CpuIcon} {...props} />,
  Layers: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Layers01Icon} {...props} />,
  Analytics: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Analytics01Icon} {...props} />,
  BarChart: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Analytics02Icon} {...props} />,
  Network: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={NetworkIcon} {...props} />,
  Globe: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Globe02Icon} {...props} />,
  Wifi: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Wifi01Icon} {...props} />,
  Code: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={CodeSquareIcon} {...props} />,
  Braces: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={CodeCircleIcon} {...props} />,
  Eye: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={EyeIcon} {...props} />,
  EyeOff: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={ViewOffSlashIcon} {...props} />,
  Database: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Database01Icon} {...props} />,
  Chat: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={BubbleChatIcon} {...props} />,
  MessagesSquare: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={BubbleChatIcon} {...props} />,
  Alert: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Alert01Icon} {...props} />,
  AlertTriangle: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Alert02Icon} {...props} />,
  AlertCircle: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={AlertCircleIcon} {...props} />,
  Target: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Target01Icon} {...props} />,
  Sparkles: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={AiMagicIcon} {...props} />,

  // UI Utilities
  Maximize: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Maximize01Icon} {...props} />,
  Minimize: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={Minimize01Icon} {...props} />,
  ArrowUpRight: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={ArrowUpRight01Icon} {...props} />,
  ArrowDownRight: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={ArrowDownRight01Icon} {...props} />,
  ArrowRight: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={ArrowRight01Icon} {...props} />,
  ArrowLeft: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={ArrowLeft01Icon} {...props} />,
  Minus: (props: Omit<HugeIconProps, "icon">) => <HugeIcon icon={MinusSignIcon} {...props} />,
};
