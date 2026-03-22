import { useState } from "react";
import {
  useGetJobResults,
  useRunAiEvaluation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trophy,
  Sparkles,
  Star,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  X,
  Crown,
  Medal,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  TrendingUp,
  ShieldAlert,
  Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";

function parseFullEvaluation(feedback: string | null | undefined) {
  if (!feedback) return null;
  try {
    const parsed = JSON.parse(feedback);
    if (parsed._fullEvaluation) return parsed._fullEvaluation;
    if (parsed.finalVerdict || parsed.scores) return parsed;
    return null;
  } catch {
    return null;
  }
}

function getVerdictColor(verdict: string) {
  const v = verdict.toUpperCase();
  if (v.includes("STRONG HIRE")) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (v === "HIRE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v.includes("LEAN HIRE")) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  if (v.includes("LEAN NO")) return "bg-orange-50 text-orange-700 border-orange-200";
  if (v.includes("STRONG NO")) return "bg-red-100 text-red-800 border-red-300";
  if (v.includes("NO HIRE")) return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function getScoreBadgeColor(score: number) {
  if (score >= 70) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (score >= 50) return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-red-50 text-red-700 border border-red-200";
}

interface JobResultsProps {
  jobId: number;
}

function getStatusColor(status: string) {
  switch (status) {
    case "HIRED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "REJECTED":
      return "bg-red-50 text-red-700 border border-red-200";
    case "INTERVIEWED":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-200";
  }
}

export default function JobResults({ jobId }: JobResultsProps) {
  const { data: results, isLoading } = useGetJobResults(jobId, {
    query: { enabled: !!jobId },
  });
  const evaluateMutation = useRunAiEvaluation();
  const queryClient = useQueryClient();

  const [evalResult, setEvalResult] = useState<{
    evaluated: number;
    hired: number;
    rejected: number;
  } | null>(null);
  const [reportCandidate, setReportCandidate] = useState<(typeof evaluatedCandidates)[number] | null>(null);

  const handleEvaluate = () => {
    setEvalResult(null);
    evaluateMutation.mutate(
      { id: jobId },
      {
        onSuccess: (data) => {
          setEvalResult(data);
          queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/results`] });
          queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
        },
      }
    );
  };

  const evaluatedCandidates = (results || []).filter(
    (c) => c.status === "HIRED" || c.status === "REJECTED" || (c.status === "INTERVIEWED" && c.score != null)
  );

  const interviewedCount = (results || []).filter(
    (c) => c.status === "INTERVIEWED" && c.score == null
  ).length;

  const topTenPercentThreshold = evaluatedCandidates.length > 0
    ? Math.max(1, Math.ceil(evaluatedCandidates.length * 0.1))
    : 0;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-32 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {evalResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              AI Evaluation Complete!
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              {evalResult.evaluated} candidate(s) evaluated — {evalResult.hired} hired, {evalResult.rejected} rejected
            </p>
          </div>
          <button onClick={() => setEvalResult(null)} className="ml-auto p-1 text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {interviewedCount > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-900">
                {interviewedCount} candidate(s) ready for evaluation
              </p>
              <p className="text-xs text-indigo-600">
                Run the AI evaluator to score and rank candidates
              </p>
            </div>
          </div>
          <Button
            onClick={handleEvaluate}
            disabled={evaluateMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {evaluateMutation.isPending ? "Evaluating..." : "Run AI Evaluation"}
          </Button>
        </div>
      )}

      {evaluatedCandidates.length === 0 && interviewedCount === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">
            No evaluated candidates yet. Candidates must complete their interviews first.
          </p>
        </div>
      ) : evaluatedCandidates.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">
                Candidate Leaderboard
              </h2>
              <p className="text-xs text-slate-500">
                Ranked by AI evaluation score — Top {topTenPercentThreshold > 0 ? `${topTenPercentThreshold}` : "10%"} highlighted
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Verdict
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluatedCandidates.map((candidate, idx) => {
                  const isTopTen = idx < topTenPercentThreshold;
                  return (
                    <tr
                      key={candidate.id}
                      className={cn(
                        "transition-colors",
                        isTopTen
                          ? "bg-amber-50/50 hover:bg-amber-50"
                          : "hover:bg-slate-50/80"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {idx === 0 ? (
                            <Crown className="w-5 h-5 text-amber-500" />
                          ) : idx <= 2 ? (
                            <Medal className={cn("w-5 h-5", idx === 1 ? "text-slate-400" : "text-amber-700")} />
                          ) : (
                            <span className="text-sm font-mono text-slate-400 w-5 text-center">
                              {idx + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm uppercase shrink-0",
                              isTopTen
                                ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                                : "bg-indigo-100 text-indigo-700"
                            )}
                          >
                            {candidate.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 text-sm">
                              {candidate.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {candidate.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {candidate.score != null ? (
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                              getScoreBadgeColor(candidate.score)
                            )}>
                              {candidate.score}
                            </span>
                            {isTopTen && (
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const evalData = parseFullEvaluation(candidate.feedback);
                          if (evalData?.finalVerdict) {
                            return (
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border",
                                getVerdictColor(evalData.finalVerdict)
                              )}>
                                <Gavel className="w-3 h-3" />
                                {evalData.finalVerdict}
                              </span>
                            );
                          }
                          return <span className="text-xs text-slate-400">&mdash;</span>;
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                            getStatusColor(candidate.status)
                          )}
                        >
                          {candidate.status === "HIRED" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : candidate.status === "REJECTED" ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <Star className="w-3 h-3" />
                          )}
                          {candidate.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => setReportCandidate(candidate)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Report
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <ReportDialog
        candidate={reportCandidate}
        onClose={() => setReportCandidate(null)}
      />
    </div>
  );
}

function ReportDialog({ candidate, onClose }: { candidate: any; onClose: () => void }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!candidate) return null;

  const evalData = parseFullEvaluation(candidate.feedback);
  const plainFeedback = evalData ? null : candidate.feedback;

  return (
    <Dialog open={!!candidate} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm uppercase">
              {candidate.name.charAt(0)}
            </div>
            <div>
              <div className="text-lg">{candidate.name}</div>
              <div className="text-xs text-slate-500 font-normal">
                {candidate.email}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                AI Score
              </p>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-slate-900 tabular-nums">
                  {candidate.score}
                </span>
                <span className="text-lg text-slate-400">/100</span>
                {evalData?.finalVerdict && (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ml-2",
                    getVerdictColor(evalData.finalVerdict)
                  )}>
                    <Gavel className="w-3.5 h-3.5" />
                    {evalData.finalVerdict}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold",
                    getStatusColor(candidate.status)
                  )}
                >
                  {candidate.status === "HIRED" ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : candidate.status === "REJECTED" ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Star className="w-3.5 h-3.5" />
                  )}
                  {candidate.status}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div
                  className={cn(
                    "h-full rounded-full",
                    (candidate.score || 0) >= 70
                      ? "bg-emerald-500"
                      : (candidate.score || 0) >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                  )}
                  style={{ width: `${candidate.score || 0}%` }}
                />
              </div>
            </div>
          </div>

          {evalData?.feedback && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  AI Feedback
                </h3>
              </div>
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {evalData.feedback}
                </p>
              </div>
            </div>
          )}

          {!evalData && plainFeedback && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  AI Feedback
                </h3>
              </div>
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {plainFeedback}
                </p>
              </div>
            </div>
          )}

          {evalData?.strengths && evalData.strengths.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection("strengths")}
                className="flex items-center gap-2 mb-3 w-full text-left group"
              >
                {expandedSections.strengths ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <ThumbsUp className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Strengths
                </h3>
                <span className="text-xs text-slate-400 ml-auto">
                  {evalData.strengths.length} item(s)
                </span>
              </button>
              {expandedSections.strengths && (
                <ul className="space-y-2 pl-6">
                  {evalData.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {evalData?.improvements && evalData.improvements.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection("improvements")}
                className="flex items-center gap-2 mb-3 w-full text-left group"
              >
                {expandedSections.improvements ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Areas for Improvement
                </h3>
                <span className="text-xs text-slate-400 ml-auto">
                  {evalData.improvements.length} item(s)
                </span>
              </button>
              {expandedSections.improvements && (
                <ul className="space-y-2 pl-6">
                  {evalData.improvements.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {evalData?.aiSuspicionReport && (
            <div>
              <button
                onClick={() => toggleSection("suspicion")}
                className="flex items-center gap-2 mb-3 w-full text-left group"
              >
                {expandedSections.suspicion ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <ShieldAlert className="w-4 h-4 text-yellow-600" />
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  AI Suspicion Report
                </h3>
              </button>
              {expandedSections.suspicion && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800 leading-relaxed whitespace-pre-line">
                    {evalData.aiSuspicionReport}
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <button
              onClick={() => toggleSection("transcript")}
              className="flex items-center gap-2 mb-3 w-full text-left group"
            >
              {expandedSections.transcript ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Interview Transcript
              </h3>
            </button>
            {expandedSections.transcript && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                  {candidate.transcript || "No transcript available."}
                </pre>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
