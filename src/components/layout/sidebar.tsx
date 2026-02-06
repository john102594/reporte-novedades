'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Factory,
  Settings,
  ClipboardList,
  BarChart3,
  Users,
  Database,
  AlertTriangle,
  Menu,
  FileText,
  Search,
  CheckCircle2,
  ListTodo,
  PackagePlus
} from 'lucide-react';
import { useState } from 'react';
import { ModeToggle } from '@/components/mode-toggle';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Production',
    href: '/production',
    icon: Factory,
  },
  {
    title: 'Prod. Summary',
    href: '/production/summary',
    icon: FileText,
  },
  {
    title: 'OT Search',
    href: '/production/ot',
    icon: Search,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },


  {
    title: 'Variation Analysis',
    href: '/variation-analysis',
    icon: AlertTriangle,
  },
  {
    title: 'Action Plans',
    href: '/action-plans',
    icon: CheckCircle2,
  },
  {
    title: 'Activities',
    href: '/activities',
    icon: ListTodo,
  },
  {
    title: 'Additional Var.',
    href: '/additional-variations',
    icon: PackagePlus,
  },
  {
    title: 'Masters',
    href: '/masters',
    icon: Database,
    submenu: [
      { title: 'Areas', href: '/masters/areas', icon: Factory },
      { title: 'Machines', href: '/masters/machines', icon: Settings },
      { title: 'Operators', href: '/masters/operators', icon: Users },
      { title: 'Users', href: '/masters/users', icon: Users },
      { title: 'Standards', href: '/masters/standards', icon: ClipboardList },
      { title: 'Causes', href: '/masters/causes', icon: AlertTriangle },
      { title: 'Variation Types', href: '/masters/variation-types', icon: PackagePlus },
    ],
  },
];

import { logout } from '@/app/actions/auth';
import { LogOut } from 'lucide-react';

interface SidebarProps {
  user?: {
    name: string | null;
    role: string;
  } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  // Filter menu items based on role (RBAC + ABAC)
  const filteredMenu = menuItems.map(item => {
    // Filter submenu items for Masters
    if (item.title === 'Masters' && item.submenu) {
      const filteredSubmenu = item.submenu.filter(sub => {
        // Only ADMIN can see Areas
        if (sub.title === 'Areas') {
          return user?.role === 'ADMIN';
        }
        return true;
      });
      return { ...item, submenu: filteredSubmenu };
    }
    return item;
  }).filter(item => {
    // Masters visible to MANAGER, ADMIN, COORDINATOR
    if (item.title === 'Masters') {
      return user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'COORDINATOR';
    }
    if (item.title === 'Prod. Summary') {
      const allowed = ['MANAGER', 'ADMIN', 'COORDINATOR', 'GESTOR'];
      return user?.role && allowed.includes(user.role);
    }
    return true;
  });

  return (
    <div className={cn(
      "h-screen bg-card/50 backdrop-blur-xl border-r border-border transition-all duration-300 flex flex-col",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        {!collapsed && (
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent">
            FlexFlow
          </h1>
        )}
        <div className="flex items-center gap-2">
            <ModeToggle />
            <button onClick={() => setCollapsed(!collapsed)} className="p-2 hover:bg-accent rounded-lg">
                <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredMenu.map((item) => {
          // Prevent /production from matching /production/summary
          const isActive = item.href === '/production' 
            ? pathname === '/production'
            : pathname.startsWith(item.href);
          
          return (
            <div key={item.href}>
              <Link
                href={item.submenu ? item.submenu[0].href : item.href}
                onClick={(e) => {
                   if (item.submenu) {
                       e.preventDefault();
                       toggleGroup(item.title);
                   }
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(124,58,237,0.1)]" 
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />
                )}
                <item.icon className={cn("w-5 h-5 relative z-10", isActive ? "text-primary" : "group-hover:text-primary transition-colors")} />
                {!collapsed && <span className="font-medium relative z-10">{item.title}</span>}
              </Link>

              {/* Submenu */}
              {item.submenu && (isActive || expandedGroups.includes(item.title)) && !collapsed && (
                <div className="ml-4 mt-2 space-y-1 border-l border-border/50 pl-3">
                  {item.submenu.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                         pathname === sub.href
                          ? "bg-accent text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                      )}
                    >
                      <sub.icon className="w-4 h-4 opacity-70" />
                      <span>{sub.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center font-bold text-white text-xs">
             {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.name || 'User'}</span>
              <span className="text-xs text-muted-foreground">{user?.role || 'Role'}</span>
            </div>
          )}
        </div>
        
        <button 
            onClick={() => logout()} 
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="text-sm font-medium">Log out</span>}
        </button>
      </div>
    </div>
  );
}
