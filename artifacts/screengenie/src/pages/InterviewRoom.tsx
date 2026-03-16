import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Video, ArrowLeft, Clock } from "lucide-react";

export default function InterviewRoom() {
  const [, params] = useRoute("/interview/:interviewId");
  const [, setLocation] = useLocation();
  const interviewId = params?.interviewId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-24 h-24 rounded-full bg-indigo-500/20 border-2 border-indigo-400/30 flex items-center justify-center mx-auto mb-8">
          <Video className="w-12 h-12 text-indigo-300" />
        </div>
        <h1 className="text-3xl font-display font-bold text-white mb-3">
          Interview Room
        </h1>
        <p className="text-slate-400 mb-2">
          Interview #{interviewId}
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-300 font-medium">
            Waiting for interview to begin...
          </span>
        </div>
        <p className="text-slate-500 text-sm mb-8">
          The AI interview room will be available when your scheduled time arrives.
        </p>
        <Button
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white gap-2"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
