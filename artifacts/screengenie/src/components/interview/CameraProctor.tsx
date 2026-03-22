import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, Eye, AlertTriangle, ShieldAlert } from "lucide-react";

interface ProctoringEvent {
  type: "tab_switch" | "focus_lost" | "focus_returned" | "tab_returned" | "paste_detected" | "face_not_visible" | "looking_away";
  timestamp: string;
  details?: string;
}

interface CameraProcterProps {
  sessionId: number;
  isActive: boolean;
  onMaxViolations?: () => void;
  onPasteDetected?: () => void;
}

const MAX_TAB_WARNINGS = 4;

export function CameraProctor({ sessionId, isActive, onMaxViolations }: CameraProcterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [focusLosses, setFocusLosses] = useState(0);
  const [warningOverlay, setWarningOverlay] = useState<string | null>(null);
  const [warningCount, setWarningCount] = useState(0);
  const [faceVisible, setFaceVisible] = useState(true);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const faceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lookAwayStartRef = useRef<number | null>(null);
  const consecutiveNoFaceRef = useRef(0);
  const terminatedRef = useRef(false);
  const tabSwitchCountRef = useRef(0);
  const lastFaceWarningRef = useRef(0);

  const reportViolation = useCallback(async (event: ProctoringEvent) => {
    try {
      await fetch(`/api/sessions/${sessionId}/proctor-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } catch {}
  }, [sessionId]);

  const showWarningOverlay = useCallback((message: string, duration: number = 5000) => {
    setWarningOverlay(message);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = setTimeout(() => setWarningOverlay(null), duration);
  }, []);

  const handleTabViolation = useCallback(() => {
    if (terminatedRef.current) return;

    tabSwitchCountRef.current += 1;
    const newCount = tabSwitchCountRef.current;
    setTabSwitches(newCount);
    setWarningCount((prev) => prev + 1);
    reportViolation({ type: "tab_switch", timestamp: new Date().toISOString() });

    const remaining = MAX_TAB_WARNINGS - newCount;
    if (newCount >= MAX_TAB_WARNINGS) {
      terminatedRef.current = true;
      showWarningOverlay(
        "FINAL WARNING: You have exceeded the maximum number of tab switches. Your interview will be terminated.",
        8000
      );
      setTimeout(() => {
        onMaxViolations?.();
      }, 3000);
    } else if (remaining === 1) {
      showWarningOverlay(
        `WARNING ${newCount}/${MAX_TAB_WARNINGS}: Tab switch detected! This is your LAST warning. One more violation will end your interview.`,
        6000
      );
    } else {
      showWarningOverlay(
        `WARNING ${newCount}/${MAX_TAB_WARNINGS}: Tab switch detected! You have ${remaining} warnings remaining. Do NOT switch tabs during the interview.`,
        5000
      );
    }
  }, [reportViolation, showWarningOverlay, onMaxViolations]);

  useEffect(() => {
    if (!isActive) return;

    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false })
      .then((stream) => {
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraOn(true);
      })
      .catch(() => {
        if (mounted) setCameraError(true);
      });

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !cameraOn) return;

    const checkFace = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = 160;
      canvas.height = 120;
      ctx.drawImage(video, 0, 0, 160, 120);

      const centerX = 80;
      const centerY = 50;
      const sampleSize = 40;
      const imageData = ctx.getImageData(
        centerX - sampleSize / 2,
        centerY - sampleSize / 2,
        sampleSize,
        sampleSize
      );

      let skinPixels = 0;
      let totalPixels = 0;
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalPixels++;

        if (
          r > 80 && g > 40 && b > 20 &&
          r > g && r > b &&
          Math.abs(r - g) > 15 &&
          r - b > 15 &&
          r < 250 && g < 230 && b < 210
        ) {
          skinPixels++;
        }
      }

      const skinRatio = skinPixels / totalPixels;
      const hasFace = skinRatio > 0.08;

      if (!hasFace) {
        consecutiveNoFaceRef.current++;

        if (consecutiveNoFaceRef.current >= 5) {
          if (!lookAwayStartRef.current) {
            lookAwayStartRef.current = Date.now();
          }

          const lookAwayDuration = Date.now() - lookAwayStartRef.current;
          const timeSinceLastWarning = Date.now() - lastFaceWarningRef.current;

          if (lookAwayDuration > 10000 && timeSinceLastWarning > 30000) {
            lastFaceWarningRef.current = Date.now();
            setFaceVisible(false);
            showWarningOverlay(
              "ATTENTION: Your face is not clearly visible. Please look at the screen and ensure your camera has a clear view of your face.",
              4000
            );
            reportViolation({
              type: "looking_away",
              timestamp: new Date().toISOString(),
              details: `Face not visible for ${Math.round(lookAwayDuration / 1000)}s`,
            });
          }
        }
      } else {
        if (consecutiveNoFaceRef.current >= 5) {
          setFaceVisible(true);
        }
        consecutiveNoFaceRef.current = 0;
        lookAwayStartRef.current = null;
      }
    };

    faceCheckIntervalRef.current = setInterval(checkFace, 1500);

    return () => {
      if (faceCheckIntervalRef.current) clearInterval(faceCheckIntervalRef.current);
    };
  }, [isActive, cameraOn, reportViolation, showWarningOverlay]);

  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabViolation();
      } else {
        reportViolation({ type: "tab_returned", timestamp: new Date().toISOString() });
      }
    };

    const handleBlur = () => {
      setFocusLosses((prev) => prev + 1);
      reportViolation({ type: "focus_lost", timestamp: new Date().toISOString() });
    };

    const handleFocus = () => {
      reportViolation({ type: "focus_returned", timestamp: new Date().toISOString() });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isActive, handleTabViolation, reportViolation]);

  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (faceCheckIntervalRef.current) clearInterval(faceCheckIntervalRef.current);
    };
  }, []);

  if (!isActive) return null;

  const hasViolations = tabSwitches > 0 || focusLosses > 0;

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="relative w-44 h-[132px] rounded-lg overflow-hidden border-2 border-white/15 bg-black shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)", display: cameraOn ? "block" : "none" }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-red-400 bg-black">
              <CameraOff className="w-6 h-6" />
              <span className="text-[10px] font-mono">Camera Denied</span>
            </div>
          )}
          {!cameraOn && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 bg-black">
              <Camera className="w-6 h-6 animate-pulse" />
            </div>
          )}

          <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
            {cameraOn ? (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-mono uppercase tracking-wider shadow-md">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                REC
              </div>
            ) : (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 text-white/50 text-[9px] font-mono uppercase">
                OFF
              </div>
            )}
          </div>

          {!faceVisible && cameraOn && (
            <div className="absolute top-1.5 right-1.5">
              <div className="px-1.5 py-0.5 rounded bg-yellow-600/90 text-white text-[8px] font-mono uppercase animate-pulse">
                NO FACE
              </div>
            </div>
          )}

          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-[8px] font-mono">
              <Eye className="w-2.5 h-2.5 text-primary" />
              <span className="text-primary">PROCTORED</span>
            </div>
            {tabSwitches > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-900/80 text-[8px] font-mono text-red-300">
                {tabSwitches}/{MAX_TAB_WARNINGS}
              </div>
            )}
          </div>
        </div>

        {hasViolations && (
          <div className="w-44 flex flex-col gap-0.5 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
            {tabSwitches > 0 && (
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-red-400">Tab switches</span>
                <span className={`font-bold ${tabSwitches >= 3 ? "text-red-300 animate-pulse" : "text-red-400"}`}>
                  {tabSwitches}/{MAX_TAB_WARNINGS}
                </span>
              </div>
            )}
            {focusLosses > 0 && (
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-red-400">Focus lost</span>
                <span className="text-red-300 font-bold">{focusLosses}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {warningOverlay && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-lg mx-4 p-8 rounded-2xl bg-red-950/90 border-2 border-red-500/50 shadow-[0_0_60px_rgba(239,68,68,0.3)]">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-red-400 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-red-400 uppercase tracking-widest">
                Proctoring Alert
              </h2>
              <p className="text-white/90 text-sm leading-relaxed font-mono">
                {warningOverlay}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {Array.from({ length: MAX_TAB_WARNINGS }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < tabSwitches ? "bg-red-500" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                This incident has been recorded
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
