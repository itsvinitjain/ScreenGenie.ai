import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Settings, 
  Sparkles,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Candidates", href: "/candidates", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex flex-col w-64 border-r border-slate-200 bg-white h-screen sticky top-0 shrink-0 hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center shadow-lg shadow-slate-900/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="font-display font-bold text-xl text-slate-900 tracking-tight">
          ScreenGenie
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link key={item.name} href={item.href} className="block relative group">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-slate-100 rounded-xl border border-slate-200/50"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors",
                  isActive 
                    ? "text-slate-900" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600")} />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
            HR
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Sarah Connor</p>
            <p className="text-xs text-slate-500 truncate">Acme Corp</p>
          </div>
          <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
