import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetInterview,
  useStartInterview,
  useEndInterview,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type InterviewState = "lobby" | "active" | "thankyou" | "locked";

function AudioVisualizer() {
  const barCount = 32;
  return (
    <div className="flex items-center justify-center gap-[3px] h-40">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-indigo-500 to-cyan-400"
          style={{
            animation: `visualizer ${0.4 + Math.random() * 0.8}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.05}s`,
            height: `${20 + Math.random() * 60}%`,
          }}
        />
      ))}
      <style>{`
        @keyframes visualizer {
          0% { height: 15%; opacity: 0.4; }
          100% { height: ${40 + Math.random() * 50}%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function TabWarning({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white py-3 px-6 flex items-center justify-center gap-3 animate-pulse shadow-2xl">
      <ShieldAlert className="w-5 h-5 shrink-0" />
      <span className="font-semibold text-sm">
        Tab switching is recorded. Please stay on this screen.
      </span>
    </div>
  );
}

export default function InterviewRoom() {
  const [, params] = useRoute("/interview/:interviewId");
  const [, setLocation] = useLocation();
  const interviewId = Number(params?.interviewId);

  const { data: interview, isLoading } = useGetInterview(interviewId, {
    query: { enabled: !!interviewId },
  });

  const startMutation = useStartInterview();
  const endMutation = useEndInterview();

  const [state, setState] = useState<InterviewState>("lobby");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [tabWarning, setTabWarning] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const screenPreviewRef = useRef<HTMLVideoElement>(null);
  const cameraPipRef = useRef<HTMLVideoElement>(null);
  const tabWarningTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (interview && interview.attempts >= 2 && state === "lobby") {
      setState("locked");
    }
  }, [interview, state]);

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

  useEffect(() => {
    if (state === "active" && cameraPipRef.current && cameraStream) {
      cameraPipRef.current.srcObject = cameraStream;
    }
  }, [state, cameraStream]);

  useEffect(() => {
    if (state !== "active") return;

    const handleVisibility = () => {
      if (document.hidden) {
        console.log("[PROCTORING] Tab switch detected at", new Date().toISOString());
        setTabWarning(true);
        if (tabWarningTimeout.current) clearTimeout(tabWarningTimeout.current);
        tabWarningTimeout.current = setTimeout(() => setTabWarning(false), 5000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (tabWarningTimeout.current) clearTimeout(tabWarningTimeout.current);
    };
  }, [state]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop());
      screenStream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream, screenStream]);

  const handleStartInterview = () => {
    setStartError(null);
    startMutation.mutate(
      { id: interviewId },
      {
        onSuccess: () => {
          setState("active");
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
  };

  const handleEndInterview = () => {
    endMutation.mutate(
      { id: interviewId },
      {
        onSuccess: () => {
          cameraStream?.getTracks().forEach((t) => t.stop());
          screenStream?.getTracks().forEach((t) => t.stop());
          setState("thankyou");
        },
      }
    );
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

  if (state === "thankyou") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">
            Thank You!
          </h1>
          <p className="text-slate-300 mb-2">
            Your interview has been completed successfully.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Our team will review your responses and get back to you shortly.
          </p>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={() => setLocation("/")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (state === "active") {
    return (
      <div className="min-h-screen bg-slate-900 relative overflow-hidden">
        <TabWarning visible={tabWarning} />

        <div className="absolute top-6 left-6 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-red-400 font-mono uppercase tracking-wider">
            Recording
          </span>
        </div>

        <div className="flex flex-col items-center justify-center min-h-screen px-6">
          <div className="mb-8 text-center">
            <div className="w-24 h-24 rounded-full bg-indigo-500/10 border-2 border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-12 h-12 text-indigo-400" />
            </div>
            <h2 className="text-xl font-display font-semibold text-white mb-1">
              AI Interviewer
            </h2>
            <p className="text-slate-500 text-xs">Listening...</p>
          </div>

          <AudioVisualizer />

          <div className="mt-12">
            <Button
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white gap-2 px-8 py-6 text-base rounded-full shadow-lg shadow-red-900/50"
              onClick={handleEndInterview}
              disabled={endMutation.isPending}
            >
              <PhoneOff className="w-5 h-5" />
              {endMutation.isPending ? "Ending..." : "End Interview"}
            </Button>
          </div>
        </div>

        <div className="fixed bottom-6 right-6 w-48 h-36 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-slate-800">
          <video
            ref={cameraPipRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-[10px] text-white/70 font-mono bg-black/50 px-1.5 py-0.5 rounded">
            You
          </div>
        </div>
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
            Interview #{interviewId} — Let's make sure everything works before we begin.
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
              disabled={!techCheckReady || startMutation.isPending}
            >
              {startMutation.isPending ? (
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
