import { useEffect, useRef, useState } from "react";

type AvatarState = "idle" | "speaking" | "listening" | "thinking";

interface InterviewerAvatarProps {
  state: AvatarState;
  gender: "male" | "female";
  className?: string;
}

export function InterviewerAvatar({ state, gender, className = "" }: InterviewerAvatarProps) {
  const [blinkOpen, setBlinkOpen] = useState(true);
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouthPhase = useRef(0);
  const [mouthOpen, setMouthOpen] = useState(0);
  const mouthInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const doBlink = () => {
      setBlinkOpen(false);
      setTimeout(() => setBlinkOpen(true), 150);
      blinkTimer.current = setTimeout(doBlink, 2500 + Math.random() * 3000);
    };
    blinkTimer.current = setTimeout(doBlink, 2000 + Math.random() * 2000);
    return () => { if (blinkTimer.current) clearTimeout(blinkTimer.current); };
  }, []);

  useEffect(() => {
    if (mouthInterval.current) {
      clearInterval(mouthInterval.current);
      mouthInterval.current = null;
    }
    if (state === "speaking") {
      mouthInterval.current = setInterval(() => {
        mouthPhase.current += 1;
        const patterns = [0.8, 0.3, 1, 0.5, 0.9, 0.2, 0.7, 0.4, 1, 0.6];
        setMouthOpen(patterns[mouthPhase.current % patterns.length]);
      }, 120);
    } else {
      setMouthOpen(0);
    }
    return () => { if (mouthInterval.current) clearInterval(mouthInterval.current); };
  }, [state]);

  const isMale = gender === "male";
  const skinColor = isMale ? "#D4A574" : "#E8C4A0";
  const skinShadow = isMale ? "#C49464" : "#D4A680";
  const hairColor = isMale ? "#2C1810" : "#1A0A00";
  const suitColor = isMale ? "#2D3748" : "#2B4C7E";
  const suitHighlight = isMale ? "#3D4F65" : "#3B6CB0";
  const shirtColor = "#F7F7F7";
  const lipColor = isMale ? "#C49464" : "#D4726A";

  const eyeOpenH = blinkOpen ? 5 : 0.5;
  const mouthHeight = 1.5 + mouthOpen * 5;
  const mouthWidth = 8 + mouthOpen * 2;
  const mouthY = 72 + (mouthOpen > 0.5 ? -0.5 : 0);

  const headTiltClass =
    state === "listening" ? "animate-avatar-nod" :
    state === "thinking" ? "animate-avatar-think" :
    state === "idle" ? "animate-avatar-breathe" : "";

  const bodyBreathClass = state === "idle" ? "animate-avatar-breathe" : "";

  return (
    <div className={`relative ${className}`}>
      <div className="relative w-48 h-64 md:w-56 md:h-72">
        <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/25 to-blue-500/15 blur-lg opacity-60 -z-10 animate-pulse" />

        <svg
          viewBox="0 0 120 160"
          className="w-full h-full drop-shadow-2xl"
          style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))" }}
        >
          <defs>
            <radialGradient id="skinGrad" cx="50%" cy="40%">
              <stop offset="0%" stopColor={skinColor} />
              <stop offset="100%" stopColor={skinShadow} />
            </radialGradient>
            <linearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={suitHighlight} />
              <stop offset="100%" stopColor={suitColor} />
            </linearGradient>
            <radialGradient id="bgGrad" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#1a2332" />
              <stop offset="100%" stopColor="#0d1117" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="120" height="160" rx="12" fill="url(#bgGrad)" />

          <g className={bodyBreathClass}>
            <path
              d={`M 25 120 Q 30 105, 45 100 L 60 95 L 75 100 Q 90 105, 95 120 L 98 160 L 22 160 Z`}
              fill="url(#suitGrad)"
            />
            <path
              d="M 50 96 L 55 110 L 60 96 L 65 110 L 70 96"
              fill={shirtColor}
              stroke={shirtColor}
              strokeWidth="0.5"
            />
            <path
              d={`M 45 100 L 50 96 L 55 105 L 55 125 L 42 115 Z`}
              fill={suitHighlight}
              opacity="0.6"
            />
            <path
              d={`M 75 100 L 70 96 L 65 105 L 65 125 L 78 115 Z`}
              fill={suitHighlight}
              opacity="0.6"
            />
            {isMale && (
              <g>
                <line x1="60" y1="100" x2="60" y2="118" stroke="#4A6FA5" strokeWidth="3" />
                <polygon points="58.5,99 61.5,99 60,95" fill="#4A6FA5" />
              </g>
            )}
          </g>

          <g className={headTiltClass} style={{ transformOrigin: "60px 80px" }}>
            <ellipse cx="60" cy="90" rx="12" ry="6" fill={skinShadow} opacity="0.5" />

            <ellipse cx="60" cy="62" rx="22" ry="28" fill="url(#skinGrad)" />

            <ellipse cx="60" cy="40" rx={isMale ? 23 : 24} ry={isMale ? 14 : 16} fill={hairColor} />
            {isMale ? (
              <>
                <rect x="37" y="38" width="4" height="25" rx="2" fill={hairColor} />
                <rect x="79" y="38" width="4" height="25" rx="2" fill={hairColor} />
              </>
            ) : (
              <>
                <path d="M 36 45 Q 33 60, 34 85 Q 35 90, 38 85 Q 37 60, 39 48 Z" fill={hairColor} />
                <path d="M 84 45 Q 87 60, 86 85 Q 85 90, 82 85 Q 83 60, 81 48 Z" fill={hairColor} />
                <path d="M 36 42 Q 38 35, 60 32 Q 82 35, 84 42 L 82 44 Q 80 37, 60 34 Q 40 37, 38 44 Z" fill={hairColor} />
              </>
            )}

            <g>
              <ellipse cx="50" cy="58" rx="4.5" ry="3.5" fill="white" />
              <ellipse
                cx="50"
                cy="58"
                rx="4.5"
                ry={eyeOpenH > 1 ? 3.5 : eyeOpenH}
                fill="white"
              />
              <circle cx="50" cy="58" r={eyeOpenH > 1 ? 2 : 0} fill="#2C1810" />
              <circle cx="49" cy="57" r={eyeOpenH > 1 ? 0.7 : 0} fill="white" />
            </g>
            <g>
              <ellipse cx="70" cy="58" rx="4.5" ry="3.5" fill="white" />
              <ellipse
                cx="70"
                cy="58"
                rx="4.5"
                ry={eyeOpenH > 1 ? 3.5 : eyeOpenH}
                fill="white"
              />
              <circle cx="70" cy="58" r={eyeOpenH > 1 ? 2 : 0} fill="#2C1810" />
              <circle cx="69" cy="57" r={eyeOpenH > 1 ? 0.7 : 0} fill="white" />
            </g>

            {isMale ? (
              <>
                <line x1="44" y1="51" x2="55" y2="51.5" stroke={hairColor} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="65" y1="51.5" x2="76" y2="51" stroke={hairColor} strokeWidth="1.2" strokeLinecap="round" />
              </>
            ) : (
              <>
                <path d="M 44 52 Q 49.5 50, 55 52" stroke={hairColor} strokeWidth="0.8" fill="none" />
                <path d="M 65 52 Q 70.5 50, 76 52" stroke={hairColor} strokeWidth="0.8" fill="none" />
              </>
            )}

            <ellipse cx="60" cy="64" rx="2" ry="1.5" fill={skinShadow} opacity="0.4" />

            <ellipse
              cx="60"
              cy={mouthY}
              rx={mouthWidth / 2}
              ry={mouthHeight}
              fill={mouthOpen > 0.3 ? "#3D1010" : lipColor}
              stroke={lipColor}
              strokeWidth="0.8"
              style={{ transition: "ry 0.08s ease, rx 0.08s ease" }}
            />
            {mouthOpen > 0.5 && (
              <ellipse
                cx="60"
                cy={mouthY - mouthHeight * 0.2}
                rx={mouthWidth / 2 - 1}
                ry={0.8}
                fill="white"
                opacity="0.7"
              />
            )}
            {mouthOpen <= 0.3 && state !== "speaking" && (
              <path
                d={`M ${60 - mouthWidth / 2 + 1} 72 Q 60 74, ${60 + mouthWidth / 2 - 1} 72`}
                fill="none"
                stroke={lipColor}
                strokeWidth="1"
                strokeLinecap="round"
              />
            )}

            <ellipse cx="47" cy="67" rx="5" ry="3" fill={skinColor} opacity="0.3" />
            <ellipse cx="73" cy="67" rx="5" ry="3" fill={skinColor} opacity="0.3" />

            <ellipse cx="37" cy="62" rx="3" ry="5" fill={skinColor} opacity="0.8" />
            <ellipse cx="83" cy="62" rx="3" ry="5" fill={skinColor} opacity="0.8" />
          </g>
        </svg>

        <div className="absolute bottom-2 left-2 right-2 z-20">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
            <div className={`w-2 h-2 rounded-full ${
              state === "speaking" ? "bg-primary animate-pulse" :
              state === "listening" ? "bg-green-400 animate-pulse" :
              state === "thinking" ? "bg-amber-400 animate-pulse" :
              "bg-white/40"
            }`} />
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/70">
              {state === "speaking" ? "Speaking" :
               state === "listening" ? "Listening" :
               state === "thinking" ? "Analyzing" :
               "Ready"}
            </span>
          </div>
        </div>
      </div>

      {state === "speaking" && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-[3px]">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="w-[3px] bg-primary/80 rounded-full animate-sound-wave"
              style={{ animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
