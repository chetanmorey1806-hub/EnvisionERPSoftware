/**
 * Central icon registry — professional stroke icons (lucide), not emoji.
 *
 * Import from here rather than from `lucide-react` directly, so the whole app
 * shares one vocabulary and swapping the icon set later is a one-file change.
 *
 *   import { Icons } from '../common/icons';
 *   <Icons.students size={18} />
 */
import {
  LayoutDashboard, GraduationCap, FileText, BookOpen, Users, CalendarDays,
  FlaskConical, Award, Trophy, UserCog, Briefcase, PhoneCall, Repeat,
  Rocket, Banknote, Library, Package, TrendingUp, KeyRound, ShieldCheck,
  Settings, Presentation, Bell, BellOff, Search, SlidersHorizontal, X,
  Check, ChevronDown, Menu, Sun, Moon, LogOut, Upload, Download, Plus,
  Trash2, Pencil, Eye, Mail, MessageCircle, Clock, AlertTriangle,
  CircleCheck, CircleX, Inbox, Building2, Star, Wallet, Filter, HelpCircle,
  Folder, Share2, ChevronLeft, ChevronRight, SendHorizontal,
  Hash, Landmark, ScrollText, Monitor, Palette, Keyboard, Database,
  Layers, Save, RotateCcw, Globe, Type,
} from 'lucide-react';

export const Icons = {
  // Navigation / modules
  dashboard: LayoutDashboard,
  students: GraduationCap,
  admissions: FileText,
  courses: BookOpen,
  batches: Users,
  attendance: CalendarDays,
  exams: FlaskConical,
  results: Trophy,
  certificates: Award,
  faculty: Presentation,
  staff: UserCog,
  enquiries: PhoneCall,
  followups: Repeat,
  placements: Rocket,
  fees: Banknote,
  library: Library,
  inventory: Package,
  reports: TrendingUp,
  users: KeyRound,
  roles: ShieldCheck,
  settings: Settings,
  team: Building2,
  wallet: Wallet,
  briefcase: Briefcase,
  star: Star,

  // UI affordances
  bell: Bell,
  bellOff: BellOff,
  search: Search,
  filter: Filter,
  sliders: SlidersHorizontal,
  close: X,
  check: Check,
  chevronDown: ChevronDown,
  menu: Menu,
  sun: Sun,
  moon: Moon,
  logout: LogOut,
  upload: Upload,
  download: Download,
  plus: Plus,
  trash: Trash2,
  edit: Pencil,
  view: Eye,
  mail: Mail,
  chat: MessageCircle,
  send: SendHorizontal,
  clock: Clock,
  warning: AlertTriangle,
  success: CircleCheck,
  error: CircleX,
  empty: Inbox,
  help: HelpCircle,
  folder: Folder,
  share: Share2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,

  // Settings vocabulary
  hash: Hash,           // document numbering
  bank: Landmark,
  terms: ScrollText,
  monitor: Monitor,     // "follow the device"
  palette: Palette,
  keyboard: Keyboard,
  database: Database,
  layers: Layers,       // masters
  save: Save,
  reset: RotateCcw,
  globe: Globe,
  type: Type,
};

/** Notification `type` → icon, used by the bell menu and toasts. */
export const notificationIcon = {
  fee: Banknote,
  admission: FileText,
  enquiry: PhoneCall,
  info: Bell,
  warning: AlertTriangle,
  error: CircleX,
};

export default Icons;
