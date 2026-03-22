import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, interviewsTable, sessionsTable, sessionMessagesTable, candidatesTable, jobsTable } from "@workspace/db";
import {
  streamInterviewResponse,
  generateEvaluation,
  getInitialStrictness,
  getVoiceForGender,
  getStrictnessLimits,
  analyzeCodeSubmission,
} from "../lib/interviewAI";
import { textToSpeech, ensureCompatibleFormat } from "../lib/audio";
import { openai } from "../lib/openai";

const router: IRouter = Router();

function getElapsedSeconds(startedAt: Date | null): number {
  if (!startedAt) return 0;
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
}

function getElapsedMinutes(startedAt: Date | null): number {
  return Math.floor(getElapsedSeconds(startedAt) / 60);
}

function isTimeExceeded(startedAt: Date | null, durationMinutes: number): boolean {
  return getElapsedSeconds(startedAt) >= durationMinutes * 60;
}

interface AIResponseMetadata {
  response?: string;
  newStrictness?: number;
  timeAllotted?: number;
  isFollowUp?: boolean;
  questionNumber?: number;
  depthLevel?: number;
  suspicionLevel?: number;
  suspicionNotes?: string;
}

function clampMetadata(metadata: AIResponseMetadata, experienceLevel: string, currentQuestionsAsked: number) {
  const limits = getStrictnessLimits(experienceLevel);
  const strictness = typeof metadata.newStrictness === "number"
    ? Math.max(limits.min, Math.min(limits.max, Math.round(metadata.newStrictness)))
    : limits.initial;
  const timeAllotted = typeof metadata.timeAllotted === "number"
    ? Math.max(30, Math.min(180, Math.round(metadata.timeAllotted)))
    : 60;
  const questionNumber = typeof metadata.questionNumber === "number" && metadata.questionNumber > 0
    ? metadata.questionNumber
    : currentQuestionsAsked + 1;
  return { ...metadata, newStrictness: strictness, timeAllotted, questionNumber };
}

async function getJobDescription(interview: { candidateId: number }): Promise<string> {
  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, interview.candidateId));
  if (!candidate) return "";
  const [job] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, candidate.jobId));
  return job?.description || "";
}

router.post("/sessions", async (req, res): Promise<void> => {
  try {
    const { interviewId, candidateName } = req.body;
    if (!interviewId || !candidateName) {
      res.status(400).json({ error: "interviewId and candidateName are required" });
      return;
    }

    const [interview] = await db
      .select()
      .from(interviewsTable)
      .where(eq(interviewsTable.id, interviewId));

    if (!interview) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }

    const initialStrictness = getInitialStrictness(interview.experienceLevel);

    const [session] = await db
      .insert(sessionsTable)
      .values({
        interviewId,
        candidateName,
        status: "active",
        currentStrictness: initialStrictness,
        questionsAsked: 0,
        startedAt: new Date(),
      })
      .returning();

    res.status(201).json(session);
  } catch (err) {
    console.error("Error creating session:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/sessions/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, id));

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const [interview] = await db
      .select()
      .from(interviewsTable)
      .where(eq(interviewsTable.id, session.interviewId));

    if (!interview) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }

    const messages = await db
      .select()
      .from(sessionMessagesTable)
      .where(eq(sessionMessagesTable.sessionId, session.id))
      .orderBy(sessionMessagesTable.createdAt);

    const elapsedSec = getElapsedSeconds(session.startedAt);
    const remainingSeconds = Math.max(0, interview.durationMinutes * 60 - elapsedSec);

    res.json({
      session,
      interview,
      messages,
      elapsedMinutes: Math.floor(elapsedSec / 60),
      remainingSeconds,
      isTimeUp: elapsedSec >= interview.durationMinutes * 60,
    });
  } catch (err) {
    console.error("Error getting session:", err);
    res.status(500).json({ error: "Failed to get session" });
  }
});

router.post("/sessions/:id/next-question", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, id));

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.status !== "active") {
      res.status(400).json({ error: "Session is not active" });
      return;
    }

    const [interview] = await db
      .select()
      .from(interviewsTable)
      .where(eq(interviewsTable.id, session.interviewId));

    if (!interview) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }

    if (isTimeExceeded(session.startedAt, interview.durationMinutes)) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ type: "done", response: "Thank you for your time. The interview duration has ended. We will now generate your evaluation.", timeUp: true })}\n\n`);
      res.end();
      return;
    }

    const elapsedMinutes = getElapsedMinutes(session.startedAt);
    const elapsedSec = getElapsedSeconds(session.startedAt);
    const remainingMinutes = Math.max(0, (interview.durationMinutes * 60 - elapsedSec) / 60);
    const jobDescription = await getJobDescription(interview);

    const existingMessages = await db
      .select()
      .from(sessionMessagesTable)
      .where(eq(sessionMessagesTable.sessionId, session.id))
      .orderBy(sessionMessagesTable.createdAt);

    const conversationHistory = existingMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let aiResponse = "";
    let metadata: AIResponseMetadata | null = null;

    for await (const event of streamInterviewResponse({
      jobDescription,
      questions: interview.questions || [],
      experienceLevel: interview.experienceLevel,
      durationMinutes: interview.durationMinutes,
      voiceGender: interview.voiceGender,
      candidateName: session.candidateName,
      currentStrictness: session.currentStrictness,
      questionsAsked: session.questionsAsked,
      elapsedMinutes,
      remainingMinutes,
      conversationHistory,
      codingEnabled: interview.codingEnabled,
      candidateTimezone: req.body?.candidateTimezone || "UTC",
    })) {
      if (event.type === "content") {
        res.write(`data: ${JSON.stringify({ type: "content", content: event.data })}\n\n`);
      } else if (event.type === "metadata") {
        metadata = event.data;
      }
    }

    if (metadata) {
      const clamped = clampMetadata(metadata, interview.experienceLevel, session.questionsAsked);
      aiResponse = clamped.response || "";

      const voice = getVoiceForGender(interview.voiceGender || "female");
      const [, , audioBuffer] = await Promise.all([
        db.insert(sessionMessagesTable).values({
          sessionId: session.id,
          role: "interviewer",
          content: aiResponse,
          questionNumber: clamped.questionNumber,
          timeAllotted: clamped.timeAllotted,
        }),
        db
          .update(sessionsTable)
          .set({
            currentStrictness: clamped.newStrictness,
            questionsAsked: clamped.questionNumber,
          })
          .where(eq(sessionsTable.id, session.id)),
        aiResponse ? textToSpeech(aiResponse, voice, "mp3") : Promise.resolve(null),
      ]);

      const audioBase64 = audioBuffer ? audioBuffer.toString("base64") : undefined;

      res.write(
        `data: ${JSON.stringify({
          type: "done",
          response: aiResponse,
          newStrictness: clamped.newStrictness,
          timeAllotted: clamped.timeAllotted,
          questionNumber: clamped.questionNumber,
          audioBase64,
        })}\n\n`
      );
    }

    res.end();
  } catch (err) {
    console.error("Error in next-question:", err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: "error", error: "Internal server error" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "Failed to get next question" });
    }
  }
});

router.post("/sessions/:id/message", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    const { content, candidateTimezone } = req.body;
    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, id));

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.status !== "active") {
      res.status(400).json({ error: "Session is not active" });
      return;
    }

    const [interview] = await db
      .select()
      .from(interviewsTable)
      .where(eq(interviewsTable.id, session.interviewId));

    if (!interview) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }

    if (isTimeExceeded(session.startedAt, interview.durationMinutes)) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ type: "done", response: "Thank you for your time. The interview duration has ended. We will now generate your evaluation.", timeUp: true })}\n\n`);
      res.end();
      return;
    }

    const elapsedMinutes = getElapsedMinutes(session.startedAt);
    const elapsedSec = getElapsedSeconds(session.startedAt);
    const remainingMinutes = Math.max(0, (interview.durationMinutes * 60 - elapsedSec) / 60);
    const jobDescription = await getJobDescription(interview);

    await db.insert(sessionMessagesTable).values({
      sessionId: session.id,
      role: "candidate",
      content,
    });

    const existingMessages = await db
      .select()
      .from(sessionMessagesTable)
      .where(eq(sessionMessagesTable.sessionId, session.id))
      .orderBy(sessionMessagesTable.createdAt);

    const conversationHistory = existingMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let aiResponse = "";
    let metadata: AIResponseMetadata | null = null;

    for await (const event of streamInterviewResponse({
      jobDescription,
      questions: interview.questions || [],
      experienceLevel: interview.experienceLevel,
      durationMinutes: interview.durationMinutes,
      voiceGender: interview.voiceGender,
      candidateName: session.candidateName,
      currentStrictness: session.currentStrictness,
      questionsAsked: session.questionsAsked,
      elapsedMinutes,
      remainingMinutes,
      conversationHistory,
      codingEnabled: interview.codingEnabled,
      candidateTimezone: candidateTimezone || "UTC",
    })) {
      if (event.type === "content") {
        res.write(`data: ${JSON.stringify({ type: "content", content: event.data })}\n\n`);
      } else if (event.type === "metadata") {
        metadata = event.data;
      }
    }

    if (metadata) {
      const clamped = clampMetadata(metadata, interview.experienceLevel, session.questionsAsked);
      aiResponse = clamped.response || "";

      const voice = getVoiceForGender(interview.voiceGender || "female");
      const [, , audioBuffer] = await Promise.all([
        db.insert(sessionMessagesTable).values({
          sessionId: session.id,
          role: "interviewer",
          content: aiResponse,
          questionNumber: clamped.questionNumber,
          timeAllotted: clamped.timeAllotted,
        }),
        db
          .update(sessionsTable)
          .set({
            currentStrictness: clamped.newStrictness,
            questionsAsked: clamped.questionNumber,
          })
          .where(eq(sessionsTable.id, session.id)),
        aiResponse ? textToSpeech(aiResponse, voice, "mp3") : Promise.resolve(null),
      ]);

      const audioBase64 = audioBuffer ? audioBuffer.toString("base64") : undefined;

      res.write(
        `data: ${JSON.stringify({
          type: "done",
          response: aiResponse,
          newStrictness: clamped.newStrictness,
          timeAllotted: clamped.timeAllotted,
          questionNumber: clamped.questionNumber,
          audioBase64,
        })}\n\n`
      );
    }

    res.end();
  } catch (err) {
    console.error("Error in message:", err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: "error", error: "Internal server error" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "Failed to process message" });
    }
  }
});

router.post("/sessions/:id/speak", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    const { text, voice: bodyVoice } = req.body;
    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, id));

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const [interview] = await db
      .select()
      .from(interviewsTable)
      .where(eq(interviewsTable.id, session.interviewId));

    const voice = bodyVoice || getVoiceForGender(interview?.voiceGender || "female");

    const audioBuffer = await textToSpeech(text, voice, "mp3");
    const audioBase64 = audioBuffer.toString("base64");

    res.json({ audioBase64 });
  } catch (err) {
    console.error("Error in speak:", err);
    res.status(500).json({ error: "Failed to generate speech" });
  }
});

router.post("/sessions/:id/transcribe", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    const { audioBase64 } = req.body;
    if (!audioBase64) {
      res.status(400).json({ error: "audioBase64 is required" });
      return;
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const { buffer, format } = await ensureCompatibleFormat(audioBuffer);

    const mimeTypes: Record<string, string> = { wav: "audio/wav", mp3: "audio/mpeg", webm: "audio/webm" };
    const file = new File([buffer], `audio.${format}`, {
      type: mimeTypes[format] || "audio/webm",
    });

    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file,
      response_format: "json",
    });

    res.json({ text: transcription.text });
  } catch (err) {
    console.error("Error in transcribe:", err);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

router.post("/sessions/:id/proctor-event", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    const { type, timestamp, details } = req.body;
    if (!type || !timestamp) {
      res.status(400).json({ error: "type and timestamp required" });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, id));

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const updates: Record<string, unknown> = {};
    const flags = Array.isArray(session.proctoringFlags) ? [...(session.proctoringFlags as string[])] : [];

    if (type === "tab_switch") {
      updates.tabSwitchCount = (session.tabSwitchCount || 0) + 1;
      flags.push(`TAB_SWITCH:${timestamp}`);
    } else if (type === "focus_lost") {
      updates.focusLostCount = (session.focusLostCount || 0) + 1;
      flags.push(`FOCUS_LOST:${timestamp}`);
    } else if (type === "tab_returned" || type === "focus_returned") {
      flags.push(`${type.toUpperCase()}:${timestamp}`);
    } else if (type === "paste_detected") {
      flags.push(`PASTE_DETECTED|${timestamp}|${details || ""}`);
    } else if (type === "looking_away" || type === "face_not_visible") {
      flags.push(`${type.toUpperCase()}|${timestamp}|${details || ""}`);
    }

    updates.proctoringFlags = flags;

    await db.update(sessionsTable).set(updates).where(eq(sessionsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("Error in proctor-event:", err);
    res.status(500).json({ error: "Failed to record proctor event" });
  }
});

router.post("/sessions/:id/code-submission", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    const { code, language, output } = req.body;
    if (!code || !language) {
      res.status(400).json({ error: "code and language are required" });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, id));

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.status !== "active") {
      res.status(400).json({ error: "Session is not active" });
      return;
    }

    const [interview] = await db
      .select()
      .from(interviewsTable)
      .where(eq(interviewsTable.id, session.interviewId));

    if (!interview || !interview.codingEnabled) {
      res.status(400).json({ error: "Coding is not enabled for this interview" });
      return;
    }

    const jobDescription = await getJobDescription(interview);
    const executionOutput = output || "";
    const hasOutput = !!output;
    const executionSuccess = hasOutput && !executionOutput.includes("Error") && !executionOutput.includes("error:");

    const analysis = await analyzeCodeSubmission(
      code,
      language,
      executionOutput,
      jobDescription,
    );

    const structuredSubmission = {
      language: language.toUpperCase(),
      code,
      execution: {
        stdout: executionOutput,
        success: executionSuccess,
        hasOutput,
      },
      approachDescription: analysis.approachDescription,
      aiAssessment: analysis.aiAssessment,
      qualityScore: analysis.qualityScore,
      submittedAt: new Date().toISOString(),
    };

    const content = `[CODE SUBMISSION - ${language.toUpperCase()}]\n\`\`\`${language}\n${code}\n\`\`\`\n\nExecution Output:\n\`\`\`\n${executionOutput || "(not executed)"}\n\`\`\`\n\nApproach: ${analysis.approachDescription}\nAssessment: ${analysis.aiAssessment}\nQuality Score: ${analysis.qualityScore}/10\n\n[STRUCTURED_METADATA]: ${JSON.stringify(structuredSubmission)}`;

    await db.insert(sessionMessagesTable).values({
      sessionId: session.id,
      role: "code",
      content,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Error in code-submission:", err);
    res.status(500).json({ error: "Failed to process code submission" });
  }
});

router.post("/sessions/:id/end", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, id));

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.status === "completed") {
      try {
        const stored = JSON.parse(session.feedback || "{}");
        if (stored._fullEvaluation) {
          res.json(stored._fullEvaluation);
          return;
        }
      } catch {}
      res.json({
        session,
        scores: { overall: session.overallScore },
        feedback: session.feedback,
        strengths: [],
        improvements: [],
        aiSuspicionReport: "",
        finalVerdict: "",
      });
      return;
    }

    const [interview] = await db
      .select()
      .from(interviewsTable)
      .where(eq(interviewsTable.id, session.interviewId));

    if (!interview) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }

    const messages = await db
      .select()
      .from(sessionMessagesTable)
      .where(eq(sessionMessagesTable.sessionId, session.id))
      .orderBy(sessionMessagesTable.createdAt);

    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const elapsedMinutes = getElapsedMinutes(session.startedAt);
    const elapsedSec = getElapsedSeconds(session.startedAt);
    const remainingMinutes = Math.max(0, (interview.durationMinutes * 60 - elapsedSec) / 60);
    const jobDescription = await getJobDescription(interview);

    const evaluation = await generateEvaluation({
      jobDescription,
      questions: interview.questions || [],
      experienceLevel: interview.experienceLevel,
      durationMinutes: interview.durationMinutes,
      voiceGender: interview.voiceGender,
      candidateName: session.candidateName,
      currentStrictness: session.currentStrictness,
      questionsAsked: session.questionsAsked,
      elapsedMinutes,
      remainingMinutes,
      conversationHistory,
      codingEnabled: interview.codingEnabled,
    });

    const responsePayload = {
      scores: {
        technical: evaluation.technical,
        communication: evaluation.communication,
        problemSolving: evaluation.problemSolving,
        confidence: evaluation.confidence,
        depthOfUnderstanding: evaluation.depthOfUnderstanding,
        emotionalResilience: evaluation.emotionalResilience,
        pressureHandling: evaluation.pressureHandling,
        codeQuality: evaluation.codeQuality,
        overall: evaluation.overall,
      },
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      aiSuspicionReport: evaluation.aiSuspicionReport,
      finalVerdict: evaluation.finalVerdict,
    };

    const feedbackJson = JSON.stringify({ _fullEvaluation: responsePayload, text: evaluation.feedback });

    const [updatedSession] = await db
      .update(sessionsTable)
      .set({
        status: "completed",
        endedAt: new Date(),
        overallScore: evaluation.overall,
        feedback: feedbackJson,
      })
      .where(eq(sessionsTable.id, session.id))
      .returning();

    await db
      .update(candidatesTable)
      .set({ status: "INTERVIEWED", score: evaluation.overall })
      .where(eq(candidatesTable.id, interview.candidateId));

    await db
      .update(interviewsTable)
      .set({ status: "COMPLETED", feedback: feedbackJson })
      .where(eq(interviewsTable.id, session.interviewId));

    res.json({ session: updatedSession, ...responsePayload });
  } catch (err) {
    console.error("Error ending session:", err);
    res.status(500).json({ error: "Failed to end session" });
  }
});

export default router;
