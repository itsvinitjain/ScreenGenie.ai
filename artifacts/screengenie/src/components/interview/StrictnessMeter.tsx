import { cn } from "@/lib/utils";

interface StrictnessMeterProps {
  level: number; // 1 to 10
  className?: string;
}

export function StrictnessMeter({ level, className }: StrictnessMeterProps) {
  const percentage = (level / 10) * 100;
  
  let color = "from-green-400 to-green-600";
  let shadowColor = "rgba(74, 222, 128, 0.5)";
  
  if (level > 4) {
    color = "from-yellow-400 to-orange-500";
    shadowColor = "rgba(250, 204, 21, 0.5)";
  }
  if (level > 7) {
    color = "from-red-500 to-rose-600";
    shadowColor = "rgba(239, 68, 68, 0.5)";
  }

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      <div className="flex justify-between items-center text-xs font-display tracking-widest text-muted-foreground uppercase">
        <span>Relaxed</span>
        <span className="text-primary font-bold">Strictness: {level}/10</span>
        <span>Intense</span>
      </div>
      <div className="h-3 w-full bg-background/50 rounded-full border border-white/10 overflow-hidden relative">
        <div 
          className={cn("h-full bg-gradient-to-r transition-all duration-1000 ease-out", color)}
          style={{ 
            width: `${percentage}%`,
            boxShadow: `0 0 10px ${shadowColor}` 
          }}
        />
        {/* Notches */}
        <div className="absolute inset-0 flex justify-between px-[10%]">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-full w-px bg-background/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
