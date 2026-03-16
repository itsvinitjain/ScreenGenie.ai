import { useGetDashboardStats } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  Briefcase, 
  Users, 
  CalendarClock, 
  CheckCircle2, 
  TrendingUp,
  Activity
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  const mockChartData = [
    { name: 'Mon', applicants: 4 },
    { name: 'Tue', applicants: 7 },
    { name: 'Wed', applicants: 12 },
    { name: 'Thu', applicants: 8 },
    { name: 'Fri', applicants: 15 },
    { name: 'Sat', applicants: 3 },
    { name: 'Sun', applicants: 5 },
  ];

  if (isLoading || !stats) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const statCards = [
    { label: "Total Jobs", value: stats.totalJobs, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Active Postings", value: stats.activeJobs, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Total Candidates", value: stats.totalCandidates, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
    { label: "Pending Interviews", value: stats.pendingInterviews, icon: CalendarClock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    { label: "Completed", value: stats.completedInterviews, icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
    { label: "Hired", value: stats.hiredCandidates, icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Overview</h1>
          <p className="text-slate-500 mt-1">Here's what's happening with your hiring pipeline today.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={stat.label}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-slate-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.border} border`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              {/* Decorative background accent */}
              <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${stat.bg} opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out`} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-display font-semibold text-slate-900 mb-6">Applicants this week</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="applicants" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-display font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="flex-1 flex flex-col gap-3">
              <button className="flex items-center gap-3 w-full p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group text-left">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Post a new job</p>
                  <p className="text-xs text-slate-500">Create a listing to find talent</p>
                </div>
              </button>
              <button className="flex items-center gap-3 w-full p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group text-left">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Add candidate</p>
                  <p className="text-xs text-slate-500">Manually add to your pipeline</p>
                </div>
              </button>
              <button className="flex items-center gap-3 w-full p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group text-left">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <CalendarClock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Schedule interview</p>
                  <p className="text-xs text-slate-500">Set up a screening session</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
