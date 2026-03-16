import { useState, useCallback, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import {
  useGetJob,
  useGetCandidates,
  useBulkCreateCandidates,
  useTriggerInterviewInvites,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Users,
  X,
  Mail,
  Phone,
  Star,
  Send,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";
import Papa from "papaparse";
import { cn } from "@/lib/utils";
import JobResults from "./JobResults";

type TabType = "pipeline" | "results";

interface CsvRow {
  name: string;
  email: string;
  phone: string;
}

export default function JobDetail() {
  const [, navigate] = useLocation();
  const [matched, params] = useRoute("/jobs/:jobId");
  const jobId = params?.jobId ? parseInt(params.jobId) : 0;

  const { data: job, isLoading: isJobLoading } = useGetJob(jobId, {
    query: { enabled: !!jobId },
  });
  const { data: candidates, isLoading: isCandidatesLoading } = useGetCandidates(
    { jobId },
    { query: { enabled: !!jobId } }
  );
  const bulkCreate = useBulkCreateCandidates();
  const triggerInvites = useTriggerInterviewInvites();
  const queryClient = useQueryClient();

  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
  } | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    invited: number;
    emails: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerInvites = () => {
    if (!jobId) return;
    setInviteResult(null);
    triggerInvites.mutate(
      { id: jobId },
      {
        onSuccess: (data) => {
          setInviteResult({ invited: data.invited, emails: data.emailsSent });
          queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
        },
      }
    );
  };

  const [activeTab, setActiveTab] = useState<TabType>("pipeline");
  const pendingCount = candidates?.filter((c) => c.status === "PENDING").length || 0;

  const parseCsvFile = useCallback((file: File) => {
    setCsvError(null);
    setImportResult(null);

    if (!file.name.endsWith(".csv")) {
      setCsvError("Please upload a .csv file");
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase(),
      complete: (results) => {
        const rows: CsvRow[] = [];
        const errors: string[] = [];

        results.data.forEach((row, idx) => {
          const name = row["name"]?.trim();
          const email = row["email"]?.trim();
          const phone = row["phone"]?.trim() || "";

          if (!name || !email) {
            errors.push(`Row ${idx + 2}: Missing name or email`);
            return;
          }

          rows.push({ name, email, phone });
        });

        if (rows.length === 0) {
          setCsvError(
            errors.length > 0
              ? errors.join("; ")
              : "No valid rows found. Ensure CSV has Name, Email, Phone columns."
          );
          return;
        }

        setCsvData(rows);
        if (errors.length > 0) {
          setCsvError(`${errors.length} row(s) skipped due to missing data`);
        }
      },
      error: (error) => {
        setCsvError(`Failed to parse CSV: ${error.message}`);
      },
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) parseCsvFile(file);
    },
    [parseCsvFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseCsvFile(file);
    },
    [parseCsvFile]
  );

  const handleImport = () => {
    if (csvData.length === 0 || !jobId) return;

    bulkCreate.mutate(
      {
        data: {
          jobId,
          candidates: csvData.map((c) => ({
            name: c.name,
            email: c.email,
            phone: c.phone || undefined,
          })),
        },
      },
      {
        onSuccess: (data) => {
          setImportResult({ imported: data.imported, failed: data.failed });
          setCsvData([]);
        },
      }
    );
  };

  const clearCsv = () => {
    setCsvData([]);
    setCsvError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "HIRED":
        return "text-emerald-700 bg-emerald-50";
      case "REJECTED":
        return "text-rose-700 bg-rose-50";
      case "SCHEDULED":
        return "text-amber-700 bg-amber-50";
      case "INTERVIEWED":
        return "text-purple-700 bg-purple-50";
      case "INVITED":
        return "text-blue-700 bg-blue-50";
      default:
        return "text-slate-700 bg-slate-100";
    }
  };

  if (isJobLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-8 w-32 bg-slate-200 animate-pulse rounded-lg" />
          <div className="h-48 bg-slate-200 animate-pulse rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">
            Job not found
          </h2>
          <p className="text-slate-500 mt-1">
            This job posting doesn't exist or has been removed.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/jobs")}
          >
            Back to Jobs
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate("/jobs")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-display font-bold text-slate-900">
                  {job.title}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                    job.status === "OPEN"
                      ? "bg-emerald-50 text-emerald-700"
                      : job.status === "DRAFT"
                        ? "bg-slate-100 text-slate-600"
                        : "bg-red-50 text-red-700"
                  )}
                >
                  {job.status}
                </span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mt-2 max-w-2xl">
                {job.description}
              </p>
              <div className="flex gap-2 flex-wrap mt-4">
                {job.skills.split(",").map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium border border-slate-200/60"
                  >
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right text-sm text-slate-500 shrink-0">
              <p>
                Created{" "}
                {job.createdAt
                  ? format(new Date(job.createdAt), "MMM d, yyyy")
                  : "-"}
              </p>
              <p className="mt-1 font-medium text-slate-700">
                {candidates?.length || 0} candidate(s)
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("pipeline")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "pipeline"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Users className="w-4 h-4" />
            Pipeline
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "results"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Trophy className="w-4 h-4" />
            Results
          </button>
        </div>

        {activeTab === "results" ? (
          <JobResults jobId={jobId} />
        ) : (
        <>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">
                Candidate Upload
              </h2>
              <p className="text-sm text-slate-500">
                Import candidates from a CSV file with Name, Email, Phone
                columns.
              </p>
            </div>
          </div>

          {importResult && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  Import complete!
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {importResult.imported} candidate(s) imported successfully
                  {importResult.failed > 0 &&
                    `, ${importResult.failed} failed`}
                  .
                </p>
              </div>
              <button
                onClick={clearCsv}
                className="ml-auto p-1 text-emerald-600 hover:text-emerald-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {csvData.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
                isDragOver
                  ? "border-indigo-400 bg-indigo-50/50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileSpreadsheet
                className={cn(
                  "w-12 h-12 mx-auto mb-4",
                  isDragOver ? "text-indigo-500" : "text-slate-300"
                )}
              />
              <p className="text-sm font-medium text-slate-700">
                {isDragOver
                  ? "Drop your CSV here"
                  : "Drag & drop a CSV file here"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                or click to browse. Required columns: Name, Email, Phone
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {csvData.length}
                  </span>{" "}
                  candidate(s) ready to import
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearCsv}>
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleImport}
                    disabled={bulkCreate.isPending}
                  >
                    <Users className="w-3.5 h-3.5 mr-1.5" />
                    {bulkCreate.isPending
                      ? "Importing..."
                      : `Import ${csvData.length} Candidates`}
                  </Button>
                </div>
              </div>

              {csvError && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {csvError}
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">
                          #
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Phone
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {csvData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {row.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {row.email}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {row.phone || (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {inviteResult && inviteResult.invited > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                {inviteResult.invited} candidate(s) invited!
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                Emails sent to: {inviteResult.emails.join(", ")}
              </p>
            </div>
            <button onClick={() => setInviteResult(null)} className="ml-auto p-1 text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {inviteResult && inviteResult.invited === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">No pending candidates to invite.</p>
            <button onClick={() => setInviteResult(null)} className="ml-auto p-1 text-amber-600 hover:text-amber-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-600" />
              </div>
              <h2 className="text-lg font-display font-semibold text-slate-900">
                Candidates ({candidates?.length || 0})
              </h2>
            </div>
            <Button
              onClick={handleTriggerInvites}
              disabled={triggerInvites.isPending || pendingCount === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Send className="w-4 h-4" />
              {triggerInvites.isPending
                ? "Sending..."
                : `Trigger Interview Invites${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Applied
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isCandidatesLoading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-10 w-48 bg-slate-200 rounded-lg" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-20 bg-slate-200 rounded-full" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-12 bg-slate-200 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-slate-200 rounded" />
                      </td>
                    </tr>
                  ))
                ) : candidates?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-8 h-8 text-slate-300" />
                        <p className="text-sm">
                          No candidates yet. Upload a CSV above to get started.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  candidates?.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm uppercase shrink-0">
                            {candidate.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 text-sm">
                              {candidate.name}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {candidate.email}
                              </span>
                              {candidate.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />{" "}
                                  {candidate.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                            getStatusColor(candidate.status)
                          )}
                        >
                          {candidate.status.charAt(0) +
                            candidate.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {candidate.score != null ? (
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {candidate.score}/100
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Not scored
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {candidate.createdAt
                          ? format(
                              new Date(candidate.createdAt),
                              "MMM d, yyyy"
                            )
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>
    </AppLayout>
  );
}
