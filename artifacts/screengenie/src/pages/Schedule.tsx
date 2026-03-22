import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetScheduleInfo,
  useSubmitSchedule,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Briefcase,
  Video,
  Sparkles,
  Bot,
  Timer,
  AudioLines,
  Code2,
  MessageSquareText,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, setHours, setMinutes } from "date-fns";

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

function generateDates() {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= 10; i++) {
    const d = addDays(today, i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      dates.push(d);
    }
  }
  return dates.slice(0, 5);
}

export default function Schedule() {
  const [, params] = useRoute("/schedule/:candidateId");
  const [, setLocation] = useLocation();
  const candidateId = Number(params?.candidateId);

  const { data: info, isLoading } = useGetScheduleInfo(candidateId, {
    query: { enabled: !!candidateId },
  });

  const submitMutation = useSubmitSchedule();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<{
    interviewId: number;
    scheduledAt: string;
  } | null>(null);

  const [experienceLevel, setExperienceLevel] = useState("medium");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [voiceGender, setVoiceGender] = useState("female");
  const [codingEnabled, setCodingEnabled] = useState(false);
  const [questions, setQuestions] = useState("");

  const availableDates = generateDates();

  const handleSubmit = () => {
    if (!selectedDate || !selectedTime) return;
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);

    submitMutation.mutate(
      {
        candidateId,
        data: {
          scheduledAt: scheduledAt.toISOString(),
          experienceLevel,
          durationMinutes,
          voiceGender,
          codingEnabled,
          questions: questions
            .split("\n")
            .filter((q) => q.trim() !== ""),
        } as any,
      },
      {
        onSuccess: (data) => {
          setScheduled({
            interviewId: data.interviewId,
            scheduledAt: data.scheduledAt,
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100" />
          <div className="h-4 w-48 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <p className="text-slate-500">Candidate not found.</p>
      </div>
    );
  }

  if (scheduled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
            You're All Set!
          </h1>
          <p className="text-slate-600 mb-6">
            Your interview for{" "}
            <span className="font-semibold text-slate-900">
              {info.jobTitle}
            </span>{" "}
            has been scheduled for{" "}
            <span className="font-semibold text-indigo-600">
              {format(new Date(scheduled.scheduledAt), "EEEE, MMMM d 'at' h:mm a")}
            </span>
            .
          </p>
          <Button
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            onClick={() =>
              setLocation(`/interview/${scheduled.interviewId}`)
            }
          >
            <Video className="w-4 h-4" />
            Join Interview Room
          </Button>
          <p className="text-xs text-slate-400 mt-2">
            Interview ID: {scheduled.interviewId}
          </p>
          <p className="text-xs text-slate-400 mt-4">
            You'll receive a confirmation email shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
            Hi {info.candidateName}!
          </h1>
          <p className="text-slate-600">
            Please schedule your interview for
          </p>
          <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">
              {info.jobTitle}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Select a Date
              </h2>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {availableDates.map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedTime(null);
                  }}
                  className={cn(
                    "p-3 rounded-xl border text-center transition-all",
                    selectedDate?.toDateString() === date.toDateString()
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                  )}
                >
                  <div
                    className={cn(
                      "text-xs font-medium",
                      selectedDate?.toDateString() === date.toDateString()
                        ? "text-indigo-200"
                        : "text-slate-400"
                    )}
                  >
                    {format(date, "EEE")}
                  </div>
                  <div className="text-lg font-bold mt-0.5">
                    {format(date, "d")}
                  </div>
                  <div
                    className={cn(
                      "text-xs",
                      selectedDate?.toDateString() === date.toDateString()
                        ? "text-indigo-200"
                        : "text-slate-400"
                    )}
                  >
                    {format(date, "MMM")}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedDate && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Select a Time
                </h2>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {TIME_SLOTS.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      "px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                      selectedTime === time
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                        : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-5">
              <Bot className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                AI Interview Settings
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  Experience Level
                </Label>
                <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                  <SelectTrigger className="w-full border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresher">Fresher / Entry-level (very basic questions)</SelectItem>
                    <SelectItem value="lenient">Lenient / Easy (straightforward questions)</SelectItem>
                    <SelectItem value="medium">Medium / Standard (balanced difficulty)</SelectItem>
                    <SelectItem value="hard">Hard / Expert (system design + edge cases)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Timer className="w-3.5 h-3.5 text-slate-400" />
                  Duration (minutes)
                </Label>
                <Input
                  type="number"
                  min={10}
                  max={90}
                  step={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <AudioLines className="w-3.5 h-3.5 text-slate-400" />
                  Interviewer Voice
                </Label>
                <Select value={voiceGender} onValueChange={setVoiceGender}>
                  <SelectTrigger className="w-full border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Code2 className="w-3.5 h-3.5 text-slate-400" />
                  Coding Challenge
                </Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    checked={codingEnabled}
                    onCheckedChange={setCodingEnabled}
                  />
                  <span className="text-sm text-slate-500">
                    {codingEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <MessageSquareText className="w-3.5 h-3.5 text-slate-400" />
                Custom Questions (optional)
              </Label>
              <Textarea
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                placeholder="One question per line. Leave blank to let AI generate questions automatically."
                rows={4}
                className="border-slate-200 bg-white resize-none text-sm"
              />
              <p className="text-xs text-slate-400">
                Enter custom interview questions, one per line. If left empty, the AI interviewer will
                generate questions based on the job description and experience level.
              </p>
            </div>
          </div>

          {selectedDate && selectedTime && (
            <div className="pt-2">
              <div className="bg-indigo-50/50 rounded-xl p-4 mb-4 border border-indigo-100">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {format(selectedDate, "EEEE, MMMM d")}
                  </span>{" "}
                  at{" "}
                  <span className="font-semibold text-indigo-600">
                    {selectedTime}
                  </span>{" "}
                  — {durationMinutes} minute interview
                </p>
              </div>
              <Button
                size="lg"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending
                  ? "Scheduling..."
                  : "Confirm & Schedule Interview"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
