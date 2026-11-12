"use client";

import {
  Building2,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UploadCloud,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { InstallAppButton } from "@/components/pwa/pwa-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/sidebar";
import { initials, cn } from "@/lib/utils";
import { ROLE_LABELS, type AppRole, type Permissions } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  visible: boolean;
};

type AppShellProps = {
  organizationName: string;
  user: { displayName: string; email: string; role: AppRole };
  permissions: Permissions;
  defaultCollapsed: boolean;
  children: React.ReactNode;
};

function navigation(permissions: Permissions): NavItem[] {
  return [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      visible: true,
    },
    {
      href: "/employees",
      label: "Employees",
      icon: Users,
      visible: true,
    },
    {
      href: "/attendance",
      label: "Attendance",
      icon: CalendarCheck,
      visible:
        permissions.can_mark_attendance || permissions.can_view_team_attendance,
    },
    {
      href: "/organization",
      label: "Organization",
      icon: Building2,
      visible: permissions.can_manage_organization,
    },
    {
      href: "/users",
      label: "Users & roles",
      icon: ShieldCheck,
      visible: permissions.can_manage_users,
    },
    {
      href: "/imports",
      label: "Import & export",
      icon: UploadCloud,
      visible: permissions.can_import,
    },
    {
      href: "/audit",
      label: "Audit log",
      icon: ClipboardList,
      visible: permissions.can_view_audit,
    },
    {
      href: "/profile",
      label: "My profile",
      icon: UserRound,
      visible: true,
    },
  ];
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  organizationName,
  user,
  permissions,
  collapsed,
  onToggle,
  onNavigate,
}: {
  organizationName: string;
  user: AppShellProps["user"];
  permissions: Permissions;
  collapsed: boolean;
  /** Provided only on desktop; the mobile drawer is always expanded. */
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navigation(permissions).filter((item) => item.visible);

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-4 p-3",
        collapsed && "items-center px-2",
      )}
    >
      <div
        className={cn(
          "flex w-full items-center gap-2",
          collapsed ? "flex-col" : "px-1",
        )}
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
          title={collapsed ? organizationName : undefined}
        >
          <ShieldCheck aria-hidden className="size-4" />
        </span>

        {collapsed ? null : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{organizationName}</p>
            <p className="truncate text-xs text-muted-foreground">
              Employee management
            </p>
          </div>
        )}

        {onToggle ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("shrink-0 text-muted-foreground", collapsed && "mt-1")}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden />
            ) : (
              <PanelLeftClose aria-hidden />
            )}
          </Button>
        ) : null}
      </div>

      <nav aria-label="Main" className="flex w-full flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
                collapsed ? "size-10 justify-center" : "px-3 py-2.5",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon aria-hidden className="size-4 shrink-0" />
              {collapsed ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 rounded-md border bg-popover px-2 py-1 text-xs font-medium whitespace-nowrap text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-focus-visible:opacity-100 group-hover:opacity-100"
                >
                  {item.label}
                </span>
              ) : (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="w-full space-y-3">
        <Separator />
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed ? "justify-center" : "px-2",
          )}
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
            title={collapsed ? `${user.displayName} · ${ROLE_LABELS[user.role]}` : undefined}
          >
            {initials(user.displayName)}
          </span>
          {collapsed ? null : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          )}
        </div>

        <div className={cn(collapsed && "flex justify-center")}>
          <ThemeToggle compact={collapsed} />
        </div>

        {collapsed ? null : <InstallAppButton />}

        <form
          action="/auth/signout"
          method="post"
          className={cn(collapsed && "flex justify-center")}
        >
          <Button
            type="submit"
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            aria-label={collapsed ? "Sign out" : undefined}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              !collapsed && "w-full justify-start text-muted-foreground",
            )}
          >
            <LogOut aria-hidden />
            {collapsed ? null : "Sign out"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  organizationName,
  user,
  permissions,
  defaultCollapsed,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    // Keep the page behind the drawer from scrolling on touch devices.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "hidden shrink-0 border-r bg-card transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="sticky top-0 h-dvh">
          <SidebarContent
            organizationName={organizationName}
            user={user}
            permissions={permissions}
            collapsed={collapsed}
            onToggle={toggleSidebar}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <Menu aria-hidden />
          </Button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {organizationName}
          </p>
          <ThemeToggle compact />
        </header>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] overflow-y-auto overscroll-contain border-r bg-card shadow-xl"
            >
              <div className="flex justify-end p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                >
                  <X aria-hidden />
                </Button>
              </div>
              <SidebarContent
                organizationName={organizationName}
                user={user}
                permissions={permissions}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        ) : null}

        <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
