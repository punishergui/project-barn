"use client";

import {
  BarChart3,
  Bell,
  FolderOpen,
  LayoutDashboard,
  Moon,
  Receipt,
  Settings,
  Sun,
  Trophy,
  UserCircle
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Drawer } from "vaul";

import BarnLogo from "@/components/BarnLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiClientJson } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AppNotification {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  notif_type: string;
}

type ActiveProfile = {
  avatar_url: string | null;
  name: string;
  role: string;
};

type AuthStatusResponse = {
  is_parent?: boolean;
  profile_id?: number | null;
  name?: string | null;
  role?: string | null;
};

function TopBar({
  profile,
  unreadCount,
  onToggleNotifications
}: {
  profile: ActiveProfile | null;
  unreadCount: number;
  onToggleNotifications: () => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-amber-900/30 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-600">
      <div className="mx-auto flex h-full max-w-lg items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BarnLogo size={28} className="h-[21px] w-[28px] text-amber-50" />
          <span className="font-serif text-lg text-amber-50">Project Barn</span>
        </Link>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onToggleNotifications} className="relative text-amber-200" aria-label="Toggle notifications">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-amber-200"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/settings">
            <Avatar className="h-8 w-8 rounded-full border border-amber-500 bg-primary text-primary-foreground">
              {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.name ?? "Profile"} /> : null}
              <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : <UserCircle size={16} />}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/shows", label: "Shows", icon: Trophy },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 }
];

function BottomNav({ isParent, onOpenAdmin }: { isParent: boolean; onOpenAdmin: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 h-16 border-t border-amber-900/30 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-600">
      <div className="mx-auto flex h-full max-w-lg items-stretch">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5",
                isActive ? "text-white" : "text-amber-200/80"
              )}
            >
              {isActive ? <div className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-white" /> : null}
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        {isParent && (
          <button type="button" onClick={onOpenAdmin} className="flex flex-col items-center gap-0.5 text-amber-200/80">
            <Settings size={20} />
            <span className="text-[10px]">Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ActiveProfile | null>(null);
  const [isParent, setIsParent] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    apiClientJson<{ active_profile: ActiveProfile | null }>("/session", { signal: controller.signal })
      .then((data) => setProfile(data.active_profile))
      .catch(() => {});

    apiClientJson<AuthStatusResponse>("/auth/status", { signal: controller.signal })
      .then((data) => {
        if (typeof data.is_parent === "boolean") {
          setIsParent(data.is_parent);
          return;
        }
        setIsParent((data.role ?? "") === "parent");
      })
      .catch(() => setIsParent(false));

    apiClientJson<AppNotification[]>("/notifications", { signal: controller.signal })
      .then((data) => {
        setNotifications(data);
        setUnreadCount(data.filter((notification) => !notification.is_read).length);
      })
      .catch(() => {
        setNotifications([]);
        setUnreadCount(0);
      });

    return () => controller.abort();
  }, []);

  async function markAllRead() {
    try {
      await apiClientJson("/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore failures and keep existing state.
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <TopBar profile={profile} unreadCount={unreadCount} onToggleNotifications={() => setNotifOpen((value) => !value)} />
      {notifOpen && (
        <div className="fixed left-0 right-0 top-14 z-50 max-h-96 overflow-y-auto rounded-b-2xl border-b border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</span>
            <button onClick={markAllRead} className="text-xs font-medium text-primary">
              Mark all read
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications</p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "border-b border-border px-4 py-3 text-sm",
                  notification.is_read ? "text-muted-foreground" : "font-medium text-foreground"
                )}
              >
                <p>{notification.message}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(notification.created_at).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      )}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4">{children}</main>
      <BottomNav isParent={isParent} onOpenAdmin={() => setAdminOpen(true)} />
      <Drawer.Root open={adminOpen} onOpenChange={setAdminOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card p-6 pb-10 shadow-xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
            <h2 className="mb-4 font-serif text-xl text-foreground">Admin</h2>
            <div className="flex flex-col gap-3">
              <a href="/admin/profiles" className="rounded-xl bg-secondary px-4 py-3 text-sm text-foreground">
                Manage Profiles
              </a>
              <a href="/admin/feed-inventory" className="rounded-xl bg-secondary px-4 py-3 text-sm text-foreground">
                Feed Inventory
              </a>
              <a href="/admin/custom-options" className="rounded-xl bg-secondary px-4 py-3 text-sm text-foreground">
                Custom Dropdown Options
              </a>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
