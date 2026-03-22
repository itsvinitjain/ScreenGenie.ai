import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetInterview,
  useStartInterview,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  PhoneOff,
  Sparkles,
  Lock,
  Play,
  Clock,
  Activity,
  Code2,
  MessageSquare,
  GripVertical,
  Camera,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateSessionMutation, useSession, useEndSessionMutation } from "@/hooks/use-sessions";
import { useInterviewFlow } from "@/hooks/use-interview-flow";
import { InterviewerAvatar } from "@/components/interview/InterviewerAvatar";
import { JarvisOrb } from "@/components/interview/JarvisOrb";
import { StrictnessMeter } from "@/components/interview/StrictnessMeter";
import { CodeEditor } from "@/components/interview/CodeEditor";
import { CameraProctor } from "@/components/interview/CameraProctor";

type InterviewState = "lobby" | "prestart" | "active" | "thankyou" | "locked";

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function InterviewRoom() {
  const [, params] = useRoute("/interview/:interviewId");
  const [, setLocation] = useLocation();
  const interviewId = Number(params?.interviewId);

  const { data: interview, isLoading } = useGetInterview(interviewId, {
    query: { enabled: !!interviewId },
  });

  const startMutation = useStartInterview();
  const createSessionMutation = useCreateSessionMutation();
  const endSessionMutation = useEndSessionMutation();

  const [state, setState] = useState<InterviewState>("lobby");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [preStartCountdown, setPreStartCountdown] = useState<number | null>(null);

  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const screenPreviewRef = useRef<HTMLVideoElement>(null);
  const preStartRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: sessionData } = useSession(sessionId!);

  const {
    orbState,
    currentQuestionText,
    transcript,
    isRecording,
    isTimeUp,
    audioUnlocked,
    unlockAudio,
    triggerNextQuestion,
    submitAnswer,
    forceEndInterview,
  } = useInterviewFlow(sessionId!, (interview as any)?.voiceGender || "female");

  const initialized = useRef(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoEndTriggered = useRef(false);
  const endTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [splitPercent, setSplitPercent] = useState(40);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mobileTab, setMobileTab] = useState<"interview" | "code">("interview");

  const [evaluation, setEvaluation] = useState<any>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (preStartRef.current) clearInterval(preStartRef.current);
    };
  }, []);

  useEffect(() => {
    if (interview && interview.attempts >= 2 && state === "lobby") {
      setState("locked");
    }
  }, [interview, state]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop());
      screenStream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream, screenStream]);

  useEffect(() => {
    if (
      state === "active" &&
      sessionData?.session?.startedAt &&
      sessionData?.interview?.durationMinutes
    ) {
      const startTime = new Date(sessionData.session.startedAt).getTime();
      const durationMs = sessionData.interview.durationMinutes * 60 * 1000;
      const endTime = startTime + durationMs;

      const updateCountdown = () => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setCountdown(remaining);

        if (remaining <= 0 && !autoEndTriggered.current) {
          autoEndTriggered.current = true;
          if (countdownRef.current) clearInterval(countdownRef.current);
          forceEndInterview().then(() => {
            endTimeoutRef.current = setTimeout(() => {
              if (!mountedRef.current) return;
              endSessionMutation.mutateAsync({ id: sessionId! }).then((data: any) => {
                if (mountedRef.current) {
                  setEvaluation(data?.evaluation || null);
                  setState("thankyou");
                }
              });
            }, 8000);
          });
        }
      };

      updateCountdown();
      countdownRef.current = setInterval(updateCountdown, 1000);

      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [
    state,
    sessionData?.session?.startedAt,
    sessionData?.interview?.durationMinutes,
    sessionId,
    endSessionMutation,
    forceEndInterview,
  ]);

  useEffect(() => {
    if (isTimeUp && !autoEndTriggered.current && sessionId) {
      autoEndTriggered.current = true;
      forceEndInterview().then(() => {
        endTimeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          endSessionMutation.mutateAsync({ id: sessionId }).then((data: any) => {
            if (mountedRef.current) {
              setEvaluation(data?.evaluation || null);
              setState("thankyou");
            }
          });
        }, 8000);
      });
    }
  }, [isTimeUp, sessionId, endSessionMutation, forceEndInterview]);

  useEffect(() => {
    if (
      state === "active" &&
      audioUnlocked &&
      sessionData?.session &&
      !initialized.current &&
      sessionData.session.status === "active" &&
      sessionData.session.questionsAsked === 0
    ) {
      initialized.current = true;
      triggerNextQuestion();
    }
  }, [state, audioUnlocked, sessionData?.session, triggerNextQuestion]);

  const requestCamera = useCallback(async () => {
    try {
      setMediaError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setCameraStream(stream);
      setHasCameraPermission(true);
      setHasMicPermission(true);
      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = stream;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Camera/Mic access denied";
      setMediaError(message);
    }
  }, []);

  const testScreenShare = useCallback(async () => {
    try {
      setMediaError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setScreenStream(stream);
      setHasScreenShare(true);
      if (screenPreviewRef.current) {
        screenPreviewRef.current.srcObject = stream;
      }
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        setScreenStream(null);
        setHasScreenShare(false);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Screen share denied";
      setMediaError(message);
    }
  }, []);

  const handleStartInterview = async () => {
    setStartError(null);
    unlockAudio();
    try {
      startMutation.mutate(
        { id: interviewId },
        {
          onSuccess: async () => {
            try {
              let candidateName = "Candidate";
              if (interview?.candidateId) {
                const res = await fetch(`/api/candidates/${interview.candidateId}`);
                if (res.ok) {
                  const candidate = await res.json();
                  candidateName = candidate.name || candidateName;
                }
              }

              createSessionMutation.mutate(
                { interviewId, candidateName },
                {
                  onSuccess: (data: any) => {
                    setSessionId(data.id);
                    setState("prestart");

                    setPreStartCountdown(5);
                    preStartRef.current = setInterval(() => {
                      setPreStartCountdown((prev) => {
                        if (prev === null || prev <= 1) {
                          if (preStartRef.current) clearInterval(preStartRef.current);
                          preStartRef.current = null;
                          setState("active");
                          return null;
                        }
                        return prev - 1;
                      });
                    }, 1000);
                  },
                  onError: () => {
                    setStartError("Failed to create session. Please try again.");
                  },
                }
              );
            } catch {
              setStartError("Failed to create session. Please try again.");
            }
          },
          onError: (err: any) => {
            if (err?.response?.status === 403) {
              setState("locked");
            } else {
              setStartError("Failed to start interview. Please try again.");
            }
          },
        }
      );
    } catch {
      setStartError("Failed to start interview. Please try again.");
    }
  };

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(70, Math.max(25, pct)));
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const handleSubmitCode = useCallback(
    async (code: string, language: string, output: string) => {
      if (isTimeUp || !sessionId) return;
      try {
        await fetch(`/api/sessions/${sessionId}/code-submission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language, output }),
        });
      } catch (err) {
        console.error("Failed to submit code:", err);
      }
    },
    [sessionId, isTimeUp]
  );

  const handleMaxViolations = useCallback(async () => {
    if (!sessionId) return;
    autoEndTriggered.current = true;
    try {
      const data: any = await endSessionMutation.mutateAsync({ id: sessionId });
      setEvaluation(data?.evaluation || null);
    } catch {}
    if (mountedRef.current) setState("thankyou");
  }, [sessionId, endSessionMutation]);

  const handleEndSession = async () => {
    if (!sessionId) return;
    if (confirm("Are you sure you want to terminate the interview early?")) {
      try {
        const data: any = await endSessionMutation.mutateAsync({ id: sessionId });
        setEvaluation(data?.evaluation || null);
      } catch {}
      setState("thankyou");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-500/30" />
          <div className="h-4 w-48 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Interview not found.</p>
      </div>
    );
  }

  if (state === "locked") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950/20 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-3">
            Access Restricted
          </h1>
          <p className="text-red-300 text-lg mb-2">
            Maximum connection attempts reached.
          </p>
          <p className="text-slate-400 text-sm">
            Contact HR for further assistance.
          </p>
        </div>
      </div>
    );
  }

  if (state === "prestart" && preStartCountdown !== null) {
    const humanAvatarEnabled = (interview as any)?.humanAvatarEnabled ?? false;
    const voiceGender = (interview as any)?.voiceGender || "female";

    return (
      <div className="min-h-screen bg-black text-foreground relative overflow-hidden flex flex-col items-center justify-center font-sans">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black opacity-80" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg text-center px-6">
          {humanAvatarEnabled ? (
            <InterviewerAvatar state="idle" gender={voiceGender as "male" | "female"} />
          ) : (
            <JarvisOrb state="idle" className="scale-125 md:scale-150" />
          )}

          <div className="space-y-4">
            <p className="text-sm font-mono uppercase tracking-widest text-primary/80">
              Preparing your interview
            </p>
            <div className="relative w-28 h-28 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="hsl(217 91% 60% / 0.15)"
                  strokeWidth="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - preStartCountdown / 5)}`}
                  style={{ transition: "stroke-dashoffset 0.9s ease-in-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-white font-mono">
                  {preStartCountdown}
                </span>
              </div>
            </div>
            <p className="text-white/60 text-sm">
              Interview starts in{" "}
              <span className="text-white font-semibold">{preStartCountdown}</span>{" "}
              {preStartCountdown === 1 ? "second" : "seconds"}
            </p>
            <p className="text-xs text-white/40">
              Get ready. Your interviewer will greet you shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "thankyou") {
    const overallScore = evaluation?.scores?.overall ?? sessionData?.session?.overallScore;
    const finalVerdict = evaluation?.finalVerdict;
    const feedbackText = evaluation?.feedback ?? sessionData?.session?.feedback;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">
            Thank You!
          </h1>
          <p className="text-slate-300 mb-4">
            Your interview has been completed successfully.
          </p>

          {overallScore !== undefined && overallScore !== null && (
            <div className="mb-4 p-4 bg-slate-800/60 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
                Overall Score
              </p>
              <p className="text-4xl font-bold text-emerald-400 font-mono">
                {overallScore}
                <span className="text-lg text-slate-500">/100</span>
              </p>
            </div>
          )}

          {finalVerdict && (
            <div className="mb-4 p-3 bg-slate-800/40 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
                Verdict
              </p>
              <p className="text-lg font-semibold text-white">{finalVerdict}</p>
            </div>
          )}

          {feedbackText && (
            <div className="mb-6 p-4 bg-slate-800/40 rounded-lg border border-slate-700 text-left">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">
                Feedback
              </p>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {feedbackText}
              </p>
            </div>
          )}

          <p className="text-slate-500 text-sm mb-8">
            Our team will review your responses and get back to you shortly.
          </p>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={() => setLocation("/")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (state === "active" && sessionId) {
    const codingEnabled = (interview as any)?.codingEnabled ?? false;
    const humanAvatarEnabled = (interview as any)?.humanAvatarEnabled ?? false;
    const voiceGender = (interview as any)?.voiceGender || "female";

    const isFinalWarning = countdown !== null && countdown <= 10 && countdown > 0;
    const isLowTime = countdown !== null && countdown < 300;
    const isCriticalTime = countdown !== null && countdown < 60;
    const isCodingPhase = codingEnabled && countdown !== null && countdown <= 600 && countdown > 0;
    const progressPercent =
      countdown !== null && sessionData?.interview?.durationMinutes
        ? Math.round(
            ((sessionData.interview.durationMinutes * 60 - countdown) /
              (sessionData.interview.durationMinutes * 60)) *
              100
          )
        : 0;

    const interviewPanel = (
      <div className={`flex flex-col ${codingEnabled ? "h-full" : "flex-1"}`}>
        <main
          className={`flex-1 flex flex-col items-center justify-center relative z-10 px-4 ${
            codingEnabled ? "py-4" : ""
          }`}
        >
          {humanAvatarEnabled ? (
            <InterviewerAvatar
              state={orbState}
              gender={voiceGender as "male" | "female"}
              className={`mb-8 ${codingEnabled ? "" : "mb-12"} transition-transform duration-1000`}
            />
          ) : (
            <JarvisOrb
              state={orbState}
              className={`mb-8 ${
                codingEnabled
                  ? "scale-100 md:scale-110"
                  : "mb-12 scale-125 md:scale-150"
              } transition-transform duration-1000`}
            />
          )}

          <div className="h-8 flex items-center justify-center mb-6">
            {orbState === "thinking" && !isTimeUp && (
              <span className="text-accent font-mono animate-pulse tracking-widest uppercase text-sm">
                {(sessionData?.session?.questionsAsked || 0) === 0
                  ? "Preparing Your Interview..."
                  : "Processing Response..."}
              </span>
            )}
            {orbState === "speaking" && !isTimeUp && (
              <span className="text-primary font-mono animate-pulse tracking-widest uppercase text-sm">
                AI is Speaking...
              </span>
            )}
            {orbState === "listening" && !isTimeUp && (
              <span className="text-green-400 font-mono animate-pulse tracking-widest uppercase flex items-center gap-2 text-sm">
                <Mic className="w-4 h-4" /> Recording Audio...
              </span>
            )}
            {isTimeUp && (
              <span className="text-red-400 font-mono animate-pulse tracking-widest uppercase flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4" /> Interview Complete
              </span>
            )}
          </div>

          <div
            className={`w-full mx-auto flex items-end justify-center ${
              codingEnabled ? "max-w-xl h-28" : "max-w-3xl h-40"
            }`}
          >
            <p
              className={`text-center font-light text-white/90 leading-relaxed drop-shadow-lg ${
                codingEnabled ? "text-base md:text-lg" : "text-xl md:text-2xl"
              }`}
            >
              {currentQuestionText ||
                transcript ||
                (orbState === "listening" ? "Speak your answer..." : "")}
            </p>
          </div>
        </main>

        <div
          className={`relative z-10 px-4 pb-4 flex justify-center items-center gap-4 ${
            codingEnabled
              ? "pt-2"
              : "p-6 md:p-8 border-t border-white/5 bg-gradient-to-t from-black to-transparent"
          }`}
        >
          <Button
            variant="destructive"
            size="sm"
            className="opacity-50 hover:opacity-100"
            onClick={handleEndSession}
            disabled={isTimeUp}
          >
            <AlertTriangle className="w-4 h-4 mr-2" /> Terminate
          </Button>

          {!codingEnabled && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>AI Detection Active</span>
            </div>
          )}

          <div className="flex items-center justify-center h-10 px-4 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-muted-foreground pointer-events-none">
            <MicOff className="w-3.5 h-3.5 mr-1.5 text-red-500 opacity-50" />
            Mute Disabled
          </div>

          <Button
            size={codingEnabled ? "default" : "lg"}
            variant={orbState === "listening" ? "glow" : "secondary"}
            className={`${codingEnabled ? "w-36" : "w-48"} font-display uppercase tracking-widest`}
            onClick={submitAnswer}
            disabled={orbState !== "listening" || isTimeUp}
          >
            {isTimeUp
              ? "Time Up"
              : orbState === "listening"
                ? "Submit Answer"
                : "Standby"}
          </Button>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-black text-foreground relative overflow-hidden flex flex-col font-sans">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black opacity-80" />
          {orbState === "speaking" && (
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
          )}
          {orbState === "listening" && (
            <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
          )}
          {orbState === "thinking" && (
            <div className="absolute inset-0 bg-accent/5 animate-pulse" />
          )}
        </div>

        {isCodingPhase && !isFinalWarning && !isTimeUp && (
          <div className="relative z-20 bg-gradient-to-r from-accent/90 to-primary/90 text-white text-center py-2.5 px-4 shadow-[0_0_20px_rgba(var(--accent),0.3)]">
            <div className="flex items-center justify-center gap-3 font-mono font-bold tracking-widest uppercase text-sm">
              <Code2 className="w-5 h-5 animate-pulse" />
              Coding Phase — Use the Code Editor
              <Code2 className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        )}

        {isFinalWarning && (
          <div className="relative z-20 bg-red-600 text-white text-center py-3 px-4 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]">
            <div className="flex items-center justify-center gap-3 font-mono font-bold tracking-widest uppercase text-sm">
              <AlertTriangle className="w-5 h-5" />
              Interview ending in {countdown} seconds
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        )}

        {isTimeUp && (
          <div className="relative z-20 bg-red-900/90 text-white text-center py-3 px-4">
            <div className="flex items-center justify-center gap-3 font-mono font-bold tracking-widest uppercase text-sm">
              <Clock className="w-5 h-5" />
              Interview Complete — Generating Report...
            </div>
          </div>
        )}

        <header className="relative z-10 flex justify-between items-start p-4 md:p-6">
          <div className="flex items-start gap-4">
            <CameraProctor
              sessionId={sessionId}
              isActive={!isTimeUp}
              onMaxViolations={handleMaxViolations}
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-primary font-display tracking-widest text-sm uppercase">
                <Activity className="w-4 h-4 animate-pulse" />
                System Active
                {codingEnabled && (
                  <span className="ml-2 flex items-center gap-1 text-accent">
                    <Code2 className="w-3.5 h-3.5" />
                    <span className="text-[10px]">CODE MODE</span>
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {sessionData?.interview?.title || interview?.title || "Evaluation"}
              </div>
              <div className="text-muted-foreground text-xs font-mono mt-0.5">
                CANDIDATE: {sessionData?.session?.candidateName} // SESSION: {sessionId}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 w-64">
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 text-right">
                <div className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-1">
                  Time Remaining
                </div>
                <div
                  className={`text-xl font-mono font-bold tracking-wider ${
                    isCriticalTime
                      ? "text-red-500 animate-pulse"
                      : isLowTime
                        ? "text-yellow-400"
                        : "text-primary"
                  }`}
                >
                  <Clock className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                  {countdown !== null ? formatTime(countdown) : "--:--"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-1">
                  Questions
                </div>
                <div className="text-xl font-mono text-accent font-bold">
                  {sessionData?.session?.questionsAsked || 0}
                </div>
              </div>
            </div>

            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isCriticalTime
                    ? "bg-red-500"
                    : isLowTime
                      ? "bg-yellow-400"
                      : "bg-primary"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <StrictnessMeter level={sessionData?.session?.currentStrictness || 5} />
          </div>
        </header>

        {codingEnabled && (
          <div className="md:hidden relative z-10 flex border-b border-white/10">
            <button
              onClick={() => setMobileTab("interview")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-mono transition-colors ${
                mobileTab === "interview"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Interview
            </button>
            <button
              onClick={() => setMobileTab("code")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-mono transition-colors ${
                mobileTab === "code"
                  ? "text-accent border-b-2 border-accent bg-accent/5"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <Code2 className="w-4 h-4" /> Code Editor
            </button>
          </div>
        )}

        {codingEnabled ? (
          <div className="flex-1 relative z-10 flex min-h-0" ref={containerRef}>
            <div
              className="hidden md:flex flex-col"
              style={{ width: `${splitPercent}%` }}
            >
              {interviewPanel}
            </div>

            <div
              className="hidden md:flex items-center justify-center w-2 cursor-col-resize group hover:bg-primary/10 transition-colors flex-shrink-0"
              onMouseDown={handleDividerMouseDown}
            >
              <div className="w-0.5 h-12 bg-white/10 group-hover:bg-primary/40 rounded-full transition-colors" />
            </div>

            <div
              className="hidden md:block p-3"
              style={{ width: `calc(${100 - splitPercent}% - 8px)` }}
            >
              <CodeEditor
                onSubmitCode={handleSubmitCode}
                disabled={isTimeUp}
                sessionId={sessionId}
              />
            </div>

            <div className="md:hidden flex-1 flex flex-col">
              {mobileTab === "interview" ? (
                interviewPanel
              ) : (
                <div className="flex-1 p-3">
                  <CodeEditor
                    onSubmitCode={handleSubmitCode}
                    disabled={isTimeUp}
                    sessionId={sessionId}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          interviewPanel
        )}
      </div>
    );
  }

  const techCheckReady = hasCameraPermission && hasMicPermission;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            Tech Check Lobby
          </h1>
          <p className="text-slate-400">
            Interview #{interviewId} — Let's make sure everything works before we
            begin.
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 space-y-6">
          {mediaError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{mediaError}</p>
            </div>
          )}

          {startError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{startError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasCameraPermission ? (
                    <Video className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VideoOff className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="text-sm font-medium text-slate-300">Camera</span>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    hasCameraPermission
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-700 text-slate-500"
                  )}
                >
                  {hasCameraPermission ? "Ready" : "Not connected"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasMicPermission ? (
                    <Mic className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <MicOff className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="text-sm font-medium text-slate-300">Microphone</span>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    hasMicPermission
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-700 text-slate-500"
                  )}
                >
                  {hasMicPermission ? "Ready" : "Not connected"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor
                    className={cn(
                      "w-4 h-4",
                      hasScreenShare ? "text-emerald-400" : "text-slate-500"
                    )}
                  />
                  <span className="text-sm font-medium text-slate-300">
                    Screen Share
                  </span>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    hasScreenShare
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-700 text-slate-500"
                  )}
                >
                  {hasScreenShare ? "Tested" : "Not tested"}
                </span>
              </div>

              <div className="pt-2 space-y-2">
                {!hasCameraPermission && (
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    onClick={requestCamera}
                  >
                    <Video className="w-4 h-4" />
                    Enable Camera & Mic
                  </Button>
                )}
                {!hasScreenShare && (
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white gap-2"
                    onClick={testScreenShare}
                  >
                    <Monitor className="w-4 h-4" />
                    Test Screen Share
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700 relative">
                {cameraStream ? (
                  <video
                    ref={cameraPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600">
                    <VideoOff className="w-8 h-8 mb-2" />
                    <p className="text-xs">Camera preview</p>
                  </div>
                )}
              </div>

              {screenStream && (
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                  <video
                    ref={screenPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <Button
              size="lg"
              className={cn(
                "w-full py-6 text-base rounded-xl gap-2 transition-all",
                techCheckReady
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/50"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              )}
              onClick={handleStartInterview}
              disabled={
                !techCheckReady ||
                startMutation.isPending ||
                createSessionMutation.isPending
              }
            >
              {startMutation.isPending || createSessionMutation.isPending ? (
                "Starting..."
              ) : techCheckReady ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  Start Interview
                </>
              ) : (
                "Enable camera & microphone to continue"
              )}
            </Button>
            {techCheckReady && (
              <p className="text-center text-xs text-slate-500 mt-2">
                Attempt {(interview.attempts || 0) + 1} of 2
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
