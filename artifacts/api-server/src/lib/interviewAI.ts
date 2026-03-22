import { openai } from "./openai";

interface InterviewContext {
  jobDescription: string;
  questions: string[];
  experienceLevel: string;
  durationMinutes: number;
  voiceGender: string;
  candidateName: string;
  currentStrictness: number;
  questionsAsked: number;
  elapsedMinutes: number;
  conversationHistory: { role: string; content: string }[];
  codingEnabled?: boolean;
  remainingMinutes?: number;
  candidateTimezone?: string;
}

const STRICTNESS_LIMITS: Record<string, { min: number; max: number; initial: number }> = {
  fresher: { min: 1, max: 4, initial: 2 },
  lenient: { min: 2, max: 6, initial: 4 },
  medium: { min: 3, max: 8, initial: 5 },
  hard: { min: 5, max: 10, initial: 7 },
};

const DIFFICULTY_DESCRIPTIONS: Record<string, string> = {
  fresher: "Entry-level / Fresher — ask very basic, foundational questions. Expect minimal experience. Be encouraging and patient. Focus on fundamentals, willingness to learn, and basic problem-solving.",
  lenient: "Lenient / Easy — ask straightforward questions. Accept general answers. Be friendly and give hints if the candidate struggles. Focus on practical knowledge over theory.",
  medium: "Medium / Standard — balanced difficulty. Expect solid fundamentals and some depth. Push for 'why' and 'how'. Ask scenario-based questions. Standard industry interview difficulty.",
  hard: "Hard / Expert — system design, optimization, edge cases, trade-offs. Demand deep technical knowledge. Challenge every answer. Ask about architecture decisions, scalability, failure modes. No hand-holding.",
};

const CODING_PHASE_QUESTIONS: Record<string, string> = {
  fresher: `CODING PHASE QUESTIONS (pick appropriate ones):
- Write a function to reverse a string
- FizzBuzz implementation
- Find the largest number in an array
- Check if a string is a palindrome
- Simple array filtering or mapping
- Basic sorting implementation
Ask ONE coding question, explain it clearly, and tell the candidate to use the code editor.`,
  lenient: `CODING PHASE QUESTIONS (pick appropriate ones):
- Two Sum problem (find pairs that sum to target)
- Implement a basic stack or queue
- String manipulation (anagram check, character frequency)
- Simple linked list operations
- Array deduplication with order preserved
- Basic recursion (factorial, fibonacci)
Ask ONE coding question, explain it clearly, and tell the candidate to use the code editor.`,
  medium: `CODING PHASE QUESTIONS (pick appropriate ones):
- Binary search implementation with edge cases
- Valid parentheses / bracket matching
- Merge two sorted arrays in-place
- Implement a basic LRU cache concept
- Tree traversal (BFS or DFS)
- Find the longest substring without repeating characters
- Debounce/throttle function implementation
Ask ONE coding question, explain it clearly, and tell the candidate to use the code editor.`,
  hard: `CODING PHASE QUESTIONS (pick appropriate ones):
- Design and implement a rate limiter
- Serialize/deserialize a binary tree
- Implement a trie with insert, search, and prefix matching
- Minimum window substring
- Design a simple event emitter with once/on/off/emit
- Implement Promise.all from scratch
- Graph shortest path (Dijkstra or BFS on weighted graph)
- Implement a concurrent task scheduler with max parallelism
Ask ONE coding question, explain it clearly, and tell the candidate to use the code editor.`,
};

export function getStrictnessLimits(experienceLevel: string) {
  return STRICTNESS_LIMITS[experienceLevel] || STRICTNESS_LIMITS.medium;
}

export function getInitialStrictness(experienceLevel: string): number {
  return getStrictnessLimits(experienceLevel).initial;
}

function buildSystemPrompt(ctx: InterviewContext): string {
  const limits = getStrictnessLimits(ctx.experienceLevel);
  const remainingMinutes = ctx.remainingMinutes ?? Math.max(0, ctx.durationMinutes - ctx.elapsedMinutes);
  const progressPercent = Math.min(100, Math.round((ctx.elapsedMinutes / ctx.durationMinutes) * 100));
  const difficultyDesc = DIFFICULTY_DESCRIPTIONS[ctx.experienceLevel] || DIFFICULTY_DESCRIPTIONS.medium;

  const remainingSeconds = remainingMinutes * 60;
  const inCodingPhase = ctx.codingEnabled && remainingSeconds <= 600 && remainingSeconds > 0;
  const codingPhaseQuestions = CODING_PHASE_QUESTIONS[ctx.experienceLevel] || CODING_PHASE_QUESTIONS.medium;

  return `You are an elite senior technical interviewer with 25+ years of hiring experience at Google, Meta, and top startups. You are sharp, perceptive, and waste NO words. You speak like a seasoned professional — direct, crisp, and confident. NEVER ramble. NEVER repeat the candidate's answer back to them. You are interviewing ${ctx.candidateName}.

JOB DESCRIPTION:
${ctx.jobDescription}

INTERVIEW PARAMETERS:
- Difficulty mode: ${ctx.experienceLevel.toUpperCase()}
- Difficulty behavior: ${difficultyDesc}
- Total interview duration: ${ctx.durationMinutes} minutes
- Time elapsed: ${ctx.elapsedMinutes} minutes (${progressPercent}% complete)
- Time remaining: ${remainingMinutes} minutes
- Current strictness level: ${ctx.currentStrictness}/10
- Strictness range for ${ctx.experienceLevel}: ${limits.min}-${limits.max}
- Questions asked so far: ${ctx.questionsAsked}

${ctx.questions.length > 0 ? `PREPARED QUESTIONS (use as starting points, but go DEEPER based on answers):\n${ctx.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}` : "Generate appropriate technical and behavioral questions based on the job description."}

RESPONSE STYLE — CRITICAL:
- Be EXTREMELY CONCISE. Maximum 1-2 short sentences for acknowledgment, then the next question. Total response must be under 40 words ideally, never exceed 60 words.
- NEVER summarize or paraphrase what the candidate just said. NEVER say "That's a great answer" or "Interesting point about X." Instead, react briefly: "Good.", "Right.", "Fair enough.", "Hmm, okay." — then immediately ask the next question.
- Sound like a real busy interviewer who values time. Be warm but efficient. No filler, no fluff, no padding.
- Ask ONE clear question at a time. Never stack multiple questions in one response.

CONTINUOUS INTERVIEW RULES:
1. This is a CONTINUOUS interview that MUST run for the full ${ctx.durationMinutes} minutes. NEVER end early. ALWAYS have another question ready.
2. After the candidate answers, give a 2-5 word reaction and immediately ask the next question. Zero idle time.
3. Examples of good responses: "Solid. Now tell me — how would you handle database sharding at scale?", "Right. What's your take on microservices vs monolith?", "Interesting. Walk me through a time you debugged a production outage."

PROGRESSIVE DEPTH STRATEGY:
- Early phase (0-25% time): Start with introductory/warm-up questions. Gauge baseline knowledge.
- Mid phase (25-50% time): Go deeper into technical concepts. Ask "why" and "how" questions.
- Deep phase (50-75% time): Challenge with complex scenarios, system design, edge cases, trade-offs.
- Final phase (75-100% time): Hardest questions. Stress-test knowledge gaps found earlier. Ask about real-world experience with failures.
- ALWAYS increase depth when the candidate answers well. If they struggle, probe the same area differently before moving on.

STRICTNESS BEHAVIOR (currently ${ctx.currentStrictness}/10):
- At higher strictness: Challenge vague answers, demand specifics, interrupt hand-waving, push for concrete examples, ask "can you go deeper?"
- At lower strictness: Be more encouraging, accept general answers, rephrase questions if candidate struggles
- Adjust based on answer quality: strong answers → increase strictness, weak answers → slightly decrease
- Never go below ${limits.min} or above ${limits.max}

AI/CHEATING DETECTION — CRITICAL:
You MUST actively monitor for signs the candidate is reading from external sources:
- Suspiciously perfect, textbook-like answers that sound copy-pasted
- Unnatural pauses followed by suddenly fluent, overly detailed responses
- Answers that feel rehearsed or read aloud (lacking natural speech patterns)
- Knowledge that seems inconsistent — very deep on one topic then completely blank on a related one
- Overly structured responses (numbered lists, perfect formatting) when speaking naturally

If you suspect AI assistance or reading:
- Ask rapid follow-up questions on the same topic to test real understanding
- Ask them to explain in simpler terms or with a personal example
- Switch topics abruptly and return to test consistency
- Ask opinion-based questions that AI tools cannot easily answer (e.g., "What's your unpopular opinion about React?")
- Note your suspicion level in the "suspicionLevel" field (0-10)

EVALUATION CRITERIA — Track these throughout:
1. EMOTIONS: How does the candidate handle pressure? Do they stay calm or get flustered?
2. CONFIDENCE: Are they confident in their answers? Do they hedge too much or overstate?
3. KNOWLEDGE: Breadth and depth of technical/domain knowledge
4. DEPTH OF UNDERSTANDING: Can they explain WHY, not just WHAT? Do they understand underlying principles?
5. COMMUNICATION: Clarity, structure, conciseness of explanations
6. WORKING UNDER PRESSURE: How do they handle hard questions, being challenged, or being wrong?
${ctx.codingEnabled ? `
LIVE CODE EDITOR — IMPORTANT:
The candidate has a live code editor available. They can write and execute code during the interview.
- When you see a message starting with "[CODE SUBMISSION", the candidate has shared their code with you.
- Review the code carefully: correctness, efficiency, style, edge cases, naming conventions.
- Ask follow-up questions about their code: "Why did you choose this approach?", "What's the time complexity?", "How would you handle edge case X?"
- You may ask the candidate to write code to solve specific problems. Say something like "Go ahead and write that in the code editor, then share it with me."
- Evaluate code quality as part of your technical assessment: clean code, proper error handling, good naming, efficient algorithms.
- If the execution output shows errors, ask them to debug and fix the issues.
${inCodingPhase ? `
*** CODING PHASE ACTIVE — LAST ${remainingMinutes} MINUTES ***
You are now in the DEDICATED CODING PHASE. For the remainder of the interview, you MUST focus exclusively on coding questions.
- Transition naturally: "Alright, let's shift gears. For the last portion of our interview, I'd like to see you code. Let me give you a problem."
- Only ask coding problems from now on. Do NOT return to verbal Q&A.
- After the candidate submits code, review it and ask follow-up questions about complexity, edge cases, or optimizations.
- If they haven't submitted yet, encourage them to use the code editor.
- DOMAIN-AWARE SELECTION: Choose coding problems that relate to the JOB DESCRIPTION above. For example, if the role involves web APIs, ask HTTP/REST problems; if it involves data, ask data processing problems; if it involves frontend, ask DOM/UI problems. Adapt to the candidate's demonstrated strengths and weaknesses from the conversation so far.
- Use the difficulty-appropriate question bank below as inspiration, but you may also create original problems tailored to the job requirements and candidate level.

${codingPhaseQuestions}
` : ''}` : ''}
RESPONSE FORMAT — Always respond with valid JSON:
{
  "response": "Your spoken response. MUST be under 60 words. Brief reaction (2-5 words) + one clear question. Like an experienced interviewer who values time.",
  "newStrictness": <number between ${limits.min} and ${limits.max}>,
  "timeAllotted": <seconds for candidate to respond, 30-180>,
  "isFollowUp": <boolean>,
  "questionNumber": <current question number>,
  "depthLevel": <1-5, how deep this question goes: 1=surface, 5=expert>,
  "suspicionLevel": <0-10, how likely candidate is using AI/reading, 0=no suspicion>,
  "suspicionNotes": "<brief note if suspicion > 3, otherwise empty string>"${inCodingPhase ? ',\n  "isCodingQuestion": true' : ''}
}`;
}

export async function* streamInterviewResponse(ctx: InterviewContext) {
  const isFirstQuestion = ctx.conversationHistory.length === 0;

  if (isFirstQuestion) {
    const limits = getStrictnessLimits(ctx.experienceLevel);
    const firstQ = ctx.questions.length > 0 ? ctx.questions[0] : null;
    const difficultyDesc = DIFFICULTY_DESCRIPTIONS[ctx.experienceLevel] || DIFFICULTY_DESCRIPTIONS.medium;
    const remainingMinutes = ctx.remainingMinutes ?? Math.max(0, ctx.durationMinutes - ctx.elapsedMinutes);
    const startInCodingPhase = ctx.codingEnabled && remainingMinutes <= 10 && remainingMinutes > 0;
    const codingPhaseQuestions = CODING_PHASE_QUESTIONS[ctx.experienceLevel] || CODING_PHASE_QUESTIONS.medium;

    const codingPhaseInstructions = startInCodingPhase
      ? `\nIMPORTANT: This is a short interview and you are starting directly in the CODING PHASE. Instead of a warm-up question, greet them briefly and immediately give them a coding problem to solve in the code editor.\n${codingPhaseQuestions}`
      : '';

    let timeGreeting = "Hello";
    try {
      const now = new Date();
      const candidateTime = new Date(now.toLocaleString("en-US", { timeZone: ctx.candidateTimezone || "UTC" }));
      const hour = candidateTime.getHours();
      if (hour >= 5 && hour < 12) timeGreeting = "Good morning";
      else if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
      else timeGreeting = "Good evening";
    } catch { /* fallback to Hello */ }

    const quickPrompt = `You are an elite, experienced technical interviewer — sharp, warm, and professionally courteous. You waste no words but you ALWAYS start with proper formal greetings. Starting interview with ${ctx.candidateName} for: ${ctx.jobDescription.substring(0, 200)}.
Difficulty: ${ctx.experienceLevel.toUpperCase()} — ${difficultyDesc}

CRITICAL GREETING INSTRUCTIONS — You MUST follow this exact format for the FIRST response:
1. Start with a proper time-appropriate greeting: "${timeGreeting}, ${ctx.candidateName}."
2. Introduce yourself briefly and welcome them to the interview.
3. Mention the role they're interviewing for and the approximate duration (${ctx.durationMinutes} minutes).
4. Make them feel at ease with a brief encouraging line.
5. Then transition into your first question naturally.

Example format: "${timeGreeting}, ${ctx.candidateName}. I'm your interviewer today — welcome to your interview for this role. We have about ${ctx.durationMinutes} minutes together. Take your time, and feel free to think out loud. Let's start — [first question]."

Keep TOTAL response between 40-60 words. Be professional, warm, and human.
${startInCodingPhase ? codingPhaseInstructions : (firstQ ? `Use this as your first question (rephrase naturally): "${firstQ}"` : `Ask a warm-up question appropriate for ${ctx.experienceLevel} difficulty.`)}

Respond with valid JSON:
{"response":"<your formal greeting + introduction + first question>","newStrictness":${limits.initial},"timeAllotted":60,"isFollowUp":false,"questionNumber":1,"depthLevel":1,"suspicionLevel":0,"suspicionNotes":""}`;

    const quickStream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: quickPrompt },
      ],
      stream: true,
      response_format: { type: "json_object" },
    });

    let fullResponse = "";
    for await (const chunk of quickStream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        yield { type: "content" as const, data: content };
      }
    }

    try {
      const parsed = JSON.parse(fullResponse);
      const responseText = parsed.response || `Hello ${ctx.candidateName}! Welcome to your interview. Let's start with a warm-up question — could you tell me a bit about your background and experience?`;
      yield {
        type: "metadata" as const,
        data: {
          newStrictness: parsed.newStrictness ?? limits.initial,
          timeAllotted: parsed.timeAllotted ?? 60,
          isFollowUp: false,
          questionNumber: 1,
          response: responseText,
          depthLevel: 1,
          suspicionLevel: 0,
          suspicionNotes: "",
        },
      };
    } catch {
      yield {
        type: "metadata" as const,
        data: {
          newStrictness: limits.initial,
          timeAllotted: 60,
          isFollowUp: false,
          questionNumber: 1,
          response: fullResponse,
          depthLevel: 1,
          suspicionLevel: 0,
          suspicionNotes: "",
        },
      };
    }
    return;
  }

  const systemPrompt = buildSystemPrompt(ctx);

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of ctx.conversationHistory) {
    messages.push({
      role: msg.role === "interviewer" ? "assistant" : "user",
      content: msg.content,
    });
  }

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: 1024,
    messages,
    stream: true,
    response_format: { type: "json_object" },
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      yield { type: "content" as const, data: content };
    }
  }

  try {
    const parsed = JSON.parse(fullResponse);
    yield {
      type: "metadata" as const,
      data: {
        newStrictness: parsed.newStrictness,
        timeAllotted: parsed.timeAllotted,
        isFollowUp: parsed.isFollowUp,
        questionNumber: parsed.questionNumber,
        response: parsed.response,
        depthLevel: parsed.depthLevel,
        suspicionLevel: parsed.suspicionLevel,
        suspicionNotes: parsed.suspicionNotes,
      },
    };
  } catch {
    yield {
      type: "metadata" as const,
      data: {
        newStrictness: ctx.currentStrictness,
        timeAllotted: 60,
        isFollowUp: false,
        questionNumber: ctx.questionsAsked + 1,
        response: fullResponse,
        depthLevel: 1,
        suspicionLevel: 0,
        suspicionNotes: "",
      },
    };
  }
}

export async function generateEvaluation(ctx: InterviewContext): Promise<{
  technical: number;
  communication: number;
  problemSolving: number;
  confidence: number;
  depthOfUnderstanding: number;
  emotionalResilience: number;
  pressureHandling: number;
  codeQuality: number | null;
  overall: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  aiSuspicionReport: string;
  finalVerdict: string;
}> {
  const difficultyDesc = DIFFICULTY_DESCRIPTIONS[ctx.experienceLevel] || DIFFICULTY_DESCRIPTIONS.medium;

  interface ParsedSubmission {
    language: string;
    code: string;
    execution: { stdout: string; success: boolean; hasOutput: boolean };
    approachDescription: string;
    aiAssessment: string;
    qualityScore: number;
    submittedAt: string;
  }

  const codeSubmissions: ParsedSubmission[] = ctx.conversationHistory
    .filter(m => m.content.startsWith("[CODE SUBMISSION"))
    .map(m => {
      const metadataMatch = m.content.match(/\[STRUCTURED_METADATA\]: (.+)$/);
      if (metadataMatch) {
        try {
          const parsed = JSON.parse(metadataMatch[1]);
          return {
            language: String(parsed.language || "unknown"),
            code: String(parsed.code || ""),
            execution: {
              stdout: String(parsed.execution?.stdout || ""),
              success: Boolean(parsed.execution?.success),
              hasOutput: Boolean(parsed.execution?.hasOutput),
            },
            approachDescription: String(parsed.approachDescription || "Not analyzed"),
            aiAssessment: String(parsed.aiAssessment || "Not analyzed"),
            qualityScore: Number(parsed.qualityScore) || 5,
            submittedAt: String(parsed.submittedAt || ""),
          };
        } catch { /* fall through */ }
      }
      return {
        language: "unknown", code: m.content,
        execution: { stdout: "", success: false, hasOutput: false },
        approachDescription: "Not analyzed", aiAssessment: "Not analyzed",
        qualityScore: 5, submittedAt: "",
      };
    });

  const codeSubmissionSummary = codeSubmissions.length > 0
    ? `\nCODE SUBMISSIONS (${codeSubmissions.length} total):\n${codeSubmissions.map((s, i) => 
        `Submission ${i + 1}: Language=${s.language}, Execution=${s.execution.hasOutput ? (s.execution.success ? "SUCCESS" : "ERRORS DETECTED") : "NOT EXECUTED"}, Quality=${s.qualityScore}/10\nApproach: ${s.approachDescription}\nAI Assessment: ${s.aiAssessment}\nCode:\n${s.code}\n${s.execution.hasOutput ? `Output: ${s.execution.stdout}` : ""}`
      ).join("\n---\n")}\n\nUse the per-submission approach descriptions, AI assessments, and quality scores above as input for the Code Quality dimension. Evaluate correctness, code style, efficiency, error handling, and approach quality.\n`
    : '';

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: `You are a senior interviewer writing a comprehensive evaluation report. Analyze the ENTIRE conversation carefully. You must evaluate on ALL of the following dimensions.

JOB DESCRIPTION:
${ctx.jobDescription}

CANDIDATE: ${ctx.candidateName}
DIFFICULTY MODE: ${ctx.experienceLevel.toUpperCase()} — ${difficultyDesc}
TOTAL QUESTIONS ASKED: ${ctx.questionsAsked}
INTERVIEW DURATION: ${ctx.elapsedMinutes} minutes out of ${ctx.durationMinutes} planned
FINAL STRICTNESS: ${ctx.currentStrictness}/10
${codeSubmissionSummary}
EVALUATION DIMENSIONS — Score each 1-100:
1. TECHNICAL KNOWLEDGE: Accuracy, breadth, depth of technical answers
2. COMMUNICATION: Clarity, structure, ability to explain complex topics simply
3. PROBLEM SOLVING: Analytical thinking, breaking down problems, reasoning through edge cases
4. CONFIDENCE: How assertively they answered, owned their knowledge, admitted gaps honestly vs hedging
5. DEPTH OF UNDERSTANDING: Did they show "why" not just "what"? Could they reason from first principles?
6. EMOTIONAL RESILIENCE: How they handled tough questions, being challenged, moments of uncertainty
7. PRESSURE HANDLING: Performance under stress, time pressure, rapid-fire questions
8. CODE QUALITY (if code was submitted): Clean code, efficiency, proper error handling, good naming, algorithm choice, debugging ability. If no code was submitted, score based on verbal technical discussion.
9. OVERALL: Holistic assessment — would you hire this person for the role?

AI SUSPICION REPORT:
- Analyze the conversation for signs of AI-assisted answers or reading from screens
- Look for: unnatural fluency, copy-paste style answers, inconsistent depth, suspiciously perfect responses
- Rate the likelihood of cheating and explain your reasoning

Respond with valid JSON:
{
  "technical": <1-100>,
  "communication": <1-100>,
  "problemSolving": <1-100>,
  "confidence": <1-100>,
  "depthOfUnderstanding": <1-100>,
  "emotionalResilience": <1-100>,
  "pressureHandling": <1-100>,
  "codeQuality": <1-100 or null if no code was submitted>,
  "overall": <1-100>,
  "feedback": "<detailed 2-3 paragraph evaluation covering all dimensions>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>", ...],
  "improvements": ["<area 1>", "<area 2>", "<area 3>", ...],
  "aiSuspicionReport": "<detailed analysis of whether candidate appeared to use AI tools or read from external sources>",
  "finalVerdict": "<STRONG HIRE | HIRE | LEAN HIRE | LEAN NO HIRE | NO HIRE | STRONG NO HIRE>"
}`,
    },
  ];

  for (const msg of ctx.conversationHistory) {
    messages.push({
      role: msg.role === "interviewer" ? "assistant" : "user",
      content: msg.content,
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: 4096,
    messages,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return {
      technical: 50,
      communication: 50,
      problemSolving: 50,
      confidence: 50,
      depthOfUnderstanding: 50,
      emotionalResilience: 50,
      pressureHandling: 50,
      codeQuality: null,
      overall: 50,
      feedback: "Unable to generate detailed evaluation.",
      strengths: ["Completed the interview"],
      improvements: ["Could not fully evaluate performance"],
      aiSuspicionReport: "Unable to assess.",
      finalVerdict: "LEAN NO HIRE",
    };
  }
}

export interface CodeAnalysis {
  approachDescription: string;
  aiAssessment: string;
  qualityScore: number;
}

export async function analyzeCodeSubmission(
  code: string,
  language: string,
  executionOutput: string,
  jobDescription: string,
): Promise<CodeAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 512,
      messages: [
        {
          role: "system",
          content: `Analyze a code submission from a job interview. Respond with JSON only.
Job context: ${jobDescription.substring(0, 300)}`,
        },
        {
          role: "user",
          content: `Language: ${language}
Code:
\`\`\`
${code.substring(0, 2000)}
\`\`\`
Execution output: ${executionOutput.substring(0, 500) || "(not executed)"}

Respond with JSON:
{
  "approachDescription": "<1-2 sentence summary of the algorithm/approach used>",
  "aiAssessment": "<2-3 sentence assessment: correctness, efficiency, code quality, edge case handling>",
  "qualityScore": <1-10 score>
}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        approachDescription: String(parsed.approachDescription || ""),
        aiAssessment: String(parsed.aiAssessment || ""),
        qualityScore: Number(parsed.qualityScore) || 5,
      };
    }
  } catch { /* fall through */ }
  return {
    approachDescription: "Unable to analyze approach",
    aiAssessment: "Analysis unavailable",
    qualityScore: 5,
  };
}

type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export function getVoiceForGender(gender: string): TTSVoice {
  if (gender === "male") {
    return "echo";
  }
  return "nova";
}
