import { useState } from "react";
import { 
  useGetCandidates, 
  useGetJobs,
  useCreateCandidate, 
  useUpdateCandidate,
  Candidate,
  CreateCandidateStatus
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { UserPlus, Search, Star, Mail, Phone, FileText, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Candidates() {
  const { data: candidates, isLoading: isLoadingCandidates } = useGetCandidates();
  const { data: jobs } = useGetJobs();
  
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    jobId: "",
    status: CreateCandidateStatus.PENDING,
    resumeUrl: ""
  });

  const filteredCandidates = candidates?.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJob = selectedJobFilter === "ALL" || c.jobId.toString() === selectedJobFilter;
    return matchesSearch && matchesJob;
  }) || [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jobId) return alert("Please select a job");

    createCandidate.mutate({
      data: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        jobId: parseInt(formData.jobId),
        status: formData.status as CreateCandidateStatus,
        resumeUrl: formData.resumeUrl || undefined,
      }
    }, {
      onSuccess: () => {
        setIsAddModalOpen(false);
        setFormData({ name: "", email: "", phone: "", jobId: "", status: CreateCandidateStatus.PENDING, resumeUrl: "" });
      }
    });
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    updateCandidate.mutate({
      id,
      data: { status: newStatus as CreateCandidateStatus }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'secondary';
      case 'INVITED': return 'info';
      case 'SCHEDULED': return 'warning';
      case 'INTERVIEWED': return 'default';
      case 'HIRED': return 'success';
      case 'REJECTED': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Candidates</h1>
          <p className="text-slate-500 mt-1">Manage and track your applicants through the pipeline.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="shrink-0 gap-2 rounded-full px-6">
          <UserPlus className="w-4 h-4" /> Add Candidate
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100 transition-all text-sm"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100 transition-all text-sm bg-white min-w-[200px]"
            value={selectedJobFilter}
            onChange={(e) => setSelectedJobFilter(e.target.value)}
          >
            <option value="ALL">All Jobs</option>
            {jobs?.map(job => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Applied For</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Score</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingCandidates ? (
                [1,2,3,4].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-10 w-48 bg-slate-200 rounded-lg" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-6 w-24 bg-slate-200 rounded-full" /></td>
                    <td className="px-6 py-5"><div className="h-6 w-12 bg-slate-200 rounded-full" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  </tr>
                ))
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-slate-400" />
                      </div>
                      <p>No candidates found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate) => {
                  const job = jobs?.find(j => j.id === candidate.jobId);
                  return (
                    <tr key={candidate.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase shrink-0">
                            {candidate.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{candidate.name}</div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {candidate.email}</span>
                              {candidate.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {candidate.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                        {job?.title || `Job #${candidate.jobId}`}
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          className={cn(
                            "text-xs font-semibold rounded-full px-2.5 py-1 focus:outline-none appearance-none cursor-pointer border-transparent bg-transparent border hover:border-slate-200",
                            candidate.status === 'HIRED' ? 'text-emerald-700' :
                            candidate.status === 'REJECTED' ? 'text-rose-700' :
                            candidate.status === 'SCHEDULED' ? 'text-amber-700' :
                            'text-slate-700'
                          )}
                          value={candidate.status}
                          onChange={(e) => handleStatusChange(candidate.id, e.target.value)}
                          disabled={updateCandidate.isPending}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="INVITED">Invited</option>
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="INTERVIEWED">Interviewed</option>
                          <option value="HIRED">Hired</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        {candidate.score != null ? (
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                            candidate.score >= 70
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : candidate.score >= 50
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                          )}>
                            <Star className={cn("w-3.5 h-3.5", 
                              candidate.score >= 70 ? "fill-emerald-400 text-emerald-400" :
                              candidate.score >= 50 ? "fill-amber-400 text-amber-400" :
                              "fill-red-400 text-red-400"
                            )} />
                            {candidate.score}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {candidate.createdAt ? format(new Date(candidate.createdAt), "MMM d, yyyy") : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Add Candidate"
        description="Manually enter a candidate into the system."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Full Name</label>
            <input 
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
              placeholder="John Doe"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email Address</label>
              <input 
                required
                type="email"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                placeholder="john@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Phone (Optional)</label>
              <input 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Assign to Job</label>
            <select 
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition-all"
              value={formData.jobId}
              onChange={e => setFormData({...formData, jobId: e.target.value})}
            >
              <option value="" disabled>Select a job posting</option>
              {jobs?.filter(j => j.status === 'OPEN').map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Resume URL (Optional)</label>
            <input 
              type="url"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
              placeholder="https://linkedin.com/in/..."
              value={formData.resumeUrl}
              onChange={e => setFormData({...formData, resumeUrl: e.target.value})}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCandidate.isPending}>
              {createCandidate.isPending ? "Adding..." : "Add Candidate"}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
