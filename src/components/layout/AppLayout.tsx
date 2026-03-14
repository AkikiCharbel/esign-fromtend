import { useState, useCallback, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, FolderOpen, Send, LogOut, Menu, X, Building2, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { getWorkspace } from '@/api/workspace';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/documents', label: 'Documents', icon: FolderOpen },
  { to: '/submissions', label: 'Submissions', icon: Send },
];

const SETTINGS_ITEMS = [
  { to: '/settings/workspace', label: 'Workspace', icon: Building2 },
  { to: '/settings/members', label: 'Members', icon: Users },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function SidebarContent({
  onNavClick,
}: {
  onNavClick?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: workspace } = useQuery({
    queryKey: ['workspace'],
    queryFn: getWorkspace,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-6">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-lg font-bold text-foreground no-underline"
          onClick={onNavClick}
        >
          eSign
          {workspace?.name && (
            <span className="truncate text-sm font-medium text-muted-foreground">
              — {workspace.name}
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors',
                  isActive
                    ? 'border-l-2 border-primary bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'border-l-2 border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 mb-2 px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Settings
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {SETTINGS_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors',
                  isActive
                    ? 'border-l-2 border-primary bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'border-l-2 border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
            {user?.name ? getInitials(user.name) : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user?.name ?? 'User'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={closeSidebar}
          />
          {/* Sidebar panel */}
          <aside className="relative z-50 flex h-full w-60 flex-col bg-sidebar shadow-lg">
            <button
              onClick={closeSidebar}
              className="absolute right-3 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavClick={closeSidebar} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header with hamburger */}
        <div className="flex h-14 items-center border-b border-border px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-bold text-foreground">eSign</span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
