"use client";

import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UploadCloud,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  onNavigate,
}: {
  organizationName: string;
  user: AppShellProps["user"];
  permissions: Permissions;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navigation(permissions).filter((item) => item.visible);

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{organizationName}</p>
          <p className="truncate text-xs text-muted-foreground">Employee management</p>
        </div>
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon aria-hidden className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3">
        <Separator />
        <div className="flex items-center gap-3 px-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {initials(user.displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
          >
            <LogOut aria-hidden />
            Sign out
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
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent
            organizationName={organizationName}
            user={user}
            permissions={permissions}
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
          <p className="truncate text-sm font-semibold">{organizationName}</p>
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
              className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r bg-card shadow-xl"
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
