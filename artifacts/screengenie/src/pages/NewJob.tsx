import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateJob, CreateJobStatus } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase } from "lucide-react";

export default function NewJob() {
  const [, navigate] = useLocation();
  const createJob = useCreateJob();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [status, setStatus] = useState<CreateJobStatus>(CreateJobStatus.OPEN);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createJob.mutate(
      {
        data: {
          hrId: 1,
          title,
          description,
          skills,
          status,
        },
      },
      {
        onSuccess: (data) => {
          navigate(`/jobs/${data.id}`);
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/jobs")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">
              Create New Job
            </h1>
            <p className="text-slate-500 mt-0.5">
              Define the role to start sourcing candidates.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Job Title <span className="text-rose-500">*</span>
            </label>
            <input
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-slate-900 placeholder:text-slate-400"
              placeholder="e.g. Senior Frontend Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Required Skills
            </label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-slate-900 placeholder:text-slate-400"
              placeholder="e.g. React, TypeScript, Node.js (comma separated)"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              Comma-separated list of skills
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition-all appearance-none text-slate-900"
              value={status}
              onChange={(e) => setStatus(e.target.value as CreateJobStatus)}
            >
              <option value="OPEN">Open - Accepting Candidates</option>
              <option value="DRAFT">Draft - Hidden</option>
              <option value="CLOSED">Closed - Filled/Cancelled</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Job Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none text-slate-900 placeholder:text-slate-400"
              placeholder="Paste the full job description here — responsibilities, qualifications, benefits, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/jobs")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createJob.isPending}>
              {createJob.isPending ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
