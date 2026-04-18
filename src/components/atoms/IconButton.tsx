import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Heart,
  Home,
  Info,
  Link as LinkIcon,
  Lock,
  Mail,
  Maximize2,
  Menu,
  Minimize2,
  Minus,
  MoreHorizontal,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Star,
  Trash2,
  Unlock,
  Upload,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export type IconName = 'X' | 'Minimize2' | 'Maximize2' | 'ChevronDown' | 'ChevronUp' | 'ChevronRight' | 'ChevronLeft' | 'Settings' | 'Trash2' | 'Plus' | 'Minus' | 'RefreshCw' | 'Edit' | 'Save' | 'Search' | 'Bell' | 'Info' | 'AlertTriangle' | 'Check' | 'Menu' | 'MoreHorizontal' | 'MoreVertical' | 'Download' | 'Upload' | 'Copy' | 'ExternalLink' | 'Eye' | 'EyeOff' | 'Lock' | 'Unlock' | 'Star' | 'Heart' | 'Home' | 'User' | 'Users' | 'Mail' | 'Phone' | 'Link' | 'Filter' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export const ICON_LIST: IconName[] = ['X', 'Minimize2', 'Maximize2', 'ChevronDown', 'ChevronUp', 'ChevronRight', 'ChevronLeft', 'Settings', 'Trash2', 'Plus', 'Minus', 'RefreshCw', 'Edit', 'Save', 'Search', 'Bell', 'Info', 'AlertTriangle', 'Check', 'Menu', 'MoreHorizontal', 'MoreVertical', 'Download', 'Upload', 'Copy', 'ExternalLink', 'Eye', 'EyeOff', 'Lock', 'Unlock', 'Star', 'Heart', 'Home', 'User', 'Users', 'Mail', 'Phone', 'Link', 'Filter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

export interface IconButtonProps {
  icon?: IconName;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'solid' | 'danger';
  label?: string;
  disabled?: boolean;
  tooltip?: string;
}

const sizeMap = { sm: 14, md: 18, lg: 22 };
const paddingMap = { sm: 'p-1', md: 'p-1.5', lg: 'p-2' };

const variantMap: Record<string, string> = {
  ghost: 'text-hr-muted hover:text-hr-text hover:bg-hr-border/40',
  outline: 'text-hr-text border border-hr-border hover:bg-hr-border/40',
  solid: 'bg-hr-primary text-white hover:bg-hr-primary/80',
  danger: 'text-red-400 hover:text-red-500 hover:bg-red-500/10',
};

const iconMap: Record<IconName, LucideIcon> = {
  X,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Settings,
  Trash2,
  Plus,
  Minus,
  RefreshCw,
  Edit,
  Save,
  Search,
  Bell,
  Info,
  AlertTriangle,
  Check,
  Menu,
  MoreHorizontal,
  MoreVertical,
  Download,
  Upload,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Star,
  Heart,
  Home,
  User,
  Users,
  Mail,
  Phone,
  Link: LinkIcon,
  Filter,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
};

export function IconButton({ icon = 'X', size = 'md', variant = 'ghost', disabled = false, tooltip }: IconButtonProps) {
  const IconComponent = iconMap[icon];

  return (
    <button
      disabled={disabled}
      title={tooltip}
      className={cn(
        'rounded transition-colors inline-flex items-center justify-center shrink-0',
        paddingMap[size],
        variantMap[variant],
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
      )}
    >
      {IconComponent ? <IconComponent size={sizeMap[size]} /> : <span className="text-xs">{icon}</span>}
    </button>
  );
}
