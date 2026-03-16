import { useState } from "react";
import { useGetJobs, useCreateJob, useUpdateJob, useDeleteJob, Job, CreateJobStatus } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Plus, Search, MoreHorizontal, FileEdit, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function Jobs() {
  const { data: jobs, isLoading } = useGetJobs();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    skills: "",
    status: CreateJobStatus.OPEN
  });

  const filteredJobs = jobs?.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.skills.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createJob.mutate({
      data: {
        ...formData,
        hrId: 1, // Mocked current user
      }
    }, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        setFormData({ title: "", description: "", skills: "", status: CreateJobStatus.OPEN });
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    
    updateJob.mutate({
      id: selectedJob.id,
      data: {
        ...formData,
        hrId: selectedJob.hrId,
      }
    }, {
      onSuccess: () => {
        setIsEditModalOpen(false);
        setSelectedJob(null);
      }
    });
  };

  const openEditModal = (job: Job) => {
    setSelectedJob(job);
    setFormData({
      title: job.title,
      description: job.description,
      skills: job.skills,
      status: job.status as CreateJobStatus
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this job?")) {
      deleteJob.mutate({ id });
    }
  };

  const JobForm = ({ onSubmit, isPending, submitText }: { onSubmit: any, isPending: boolean, submitText: string }) => (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Job Title</label>
        <input 
          required
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          placeholder="e.g. Senior Frontend Engineer"
          value={formData.title}
          onChange={e => setFormData({...formData, title: e.target.value})}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Required Skills</label>
        <input 
          required
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          placeholder="e.g. React, TypeScript, Node.js"
          value={formData.skills}
          onChange={e => setFormData({...formData, skills: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Status</label>
        <select 
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition-all appearance-none"
          value={formData.status}
          onChange={e => setFormData({...formData, status: e.target.value as CreateJobStatus})}
        >
          <option value="OPEN">Open - Accepting Candidates</option>
          <option value="DRAFT">Draft - Hidden</option>
          <option value="CLOSED">Closed - Filled/Cancelled</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea 
          required
          rows={5}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none"
          placeholder="Describe the role, responsibilities, and requirements..."
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
        />
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitText}
        </Button>
      </div>
    </form>
  );

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Jobs</h1>
          <p className="text-slate-500 mt-1">Manage your active job postings and requirements.</p>
        </div>
        <Button onClick={() => {
          setFormData({ title: "", description: "", skills: "", status: CreateJobStatus.OPEN });
          setIsCreateModalOpen(true);
        }} className="shrink-0 gap-2 rounded-full px-6">
          <Plus className="w-4 h-4" /> New Job
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100 transition-all text-sm"
              placeholder="Search jobs or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Skills Needed</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-48 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-6 w-20 bg-slate-200 rounded-full" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-5"></td>
                  </tr>
                ))
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-slate-400" />
                      </div>
                      <p>No jobs found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{job.title}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[300px] mt-0.5">{job.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={job.status === 'OPEN' ? 'success' : job.status === 'DRAFT' ? 'secondary' : 'default'}>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 flex-wrap max-w-[250px]">
                        {job.skills.split(',').slice(0,3).map(skill => (
                          <span key={skill} className="inline-flex px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium border border-slate-200/60">
                            {skill.trim()}
                          </span>
                        ))}
                        {job.skills.split(',').length > 3 && (
                          <span className="inline-flex px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded-md">
                            +{job.skills.split(',').length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {job.createdAt ? format(new Date(job.createdAt), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(job)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit Job">
                          <FileEdit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(job.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Job">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Job"
        description="Define the role requirements to start finding candidates."
      >
        <JobForm onSubmit={handleCreateSubmit} isPending={createJob.isPending} submitText="Create Job" />
      </Modal>

      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Job"
        description="Update the details for this job posting."
      >
        <JobForm onSubmit={handleEditSubmit} isPending={updateJob.isPending} submitText="Save Changes" />
      </Modal>

    </AppLayout>
  );
}
