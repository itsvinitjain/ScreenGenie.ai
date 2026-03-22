import { motion } from "framer-motion";
import { type OrbState } from "@/hooks/use-interview-flow";
import { cn } from "@/lib/utils";

interface JarvisOrbProps {
  state: OrbState;
  className?: string;
}

export function JarvisOrb({ state, className }: JarvisOrbProps) {
  const variants = {
    idle: {
      scale: [1, 1.05, 1],
      opacity: [0.8, 1, 0.8],
      rotate: 0,
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    },
    listening: {
      scale: [1, 1.1, 1.05, 1.15, 1],
      opacity: [0.9, 1, 0.9],
      rotate: 0,
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
    },
    thinking: {
      scale: 1,
      opacity: 1,
      rotate: 360,
      transition: { duration: 2, repeat: Infinity, ease: "linear" }
    },
    speaking: {
      scale: [1, 1.2, 1.05, 1.3, 1.1],
      opacity: [1, 0.9, 1],
      rotate: 0,
      transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
    }
  };

  const getGlowColor = () => {
    switch (state) {
      case 'idle': return 'rgba(0, 229, 255, 0.3)';
      case 'listening': return 'rgba(0, 255, 128, 0.5)';
      case 'thinking': return 'rgba(191, 0, 255, 0.6)';
      case 'speaking': return 'rgba(0, 229, 255, 0.8)';
    }
  };

  const getBorderColor = () => {
    switch (state) {
      case 'idle': return 'rgba(0, 229, 255, 0.5)';
      case 'listening': return 'rgba(0, 255, 128, 0.8)';
      case 'thinking': return 'rgba(191, 0, 255, 0.8)';
      case 'speaking': return 'rgba(255, 255, 255, 0.9)';
    }
  };

  return (
    <div className={cn("relative flex items-center justify-center w-64 h-64", className)}>
      <motion.div
        animate={state}
        variants={variants}
        className="absolute inset-0 rounded-full mix-blend-screen"
        style={{
          boxShadow: `0 0 50px 20px ${getGlowColor()}, inset 0 0 30px ${getGlowColor()}`,
          border: `2px solid ${getBorderColor()}`,
        }}
      />
      
      {state === 'thinking' && (
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute w-56 h-56 rounded-full border-t-4 border-l-4 border-accent opacity-80 mix-blend-screen"
        />
      )}

      <motion.div
        animate={state}
        variants={variants}
        className="absolute w-32 h-32 bg-gradient-to-br from-white to-primary/50 rounded-full blur-[2px]"
        style={{
          boxShadow: `0 0 40px ${getGlowColor()}`,
        }}
      />

      <div className="absolute inset-0 rounded-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz4KPC9zdmc+')] mix-blend-screen opacity-50 mask-image-radial" />
    </div>
  );
}
