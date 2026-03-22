import { useState, useCallback, useRef } from 'react';
import { useAudioRecorder } from './use-audio-recorder';
import { useQueryClient } from '@tanstack/react-query';

export type OrbState = 'idle' | 'thinking' | 'speaking' | 'listening';

async function consumeSSE(
  url: string,
  body: any,
  onComplete: (data: any) => Promise<void>,
  onError: (err: any) => void
) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let doneData: any = null;
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split('\n\n');
      buffer = frames.pop() || "";

      for (const frame of frames) {
        const lines = frame.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'done') {
                doneData = data;
              }
            } catch {
            }
          }
        }
      }
    }

    if (buffer.trim()) {
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'done') {
              doneData = data;
            }
          } catch {
          }
        }
      }
    }

    await onComplete(doneData);
  } catch (err) {
    onError(err);
  }
}

async function apiTextToSpeech(sessionId: number, text: string, voice: string): Promise<string> {
  const res = await fetch(`/api/sessions/${sessionId}/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice })
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  const data = await res.json();
  return data.audioBase64;
}

async function apiTranscribe(sessionId: number, audioBase64: string): Promise<string> {
  const res = await fetch(`/api/sessions/${sessionId}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64 })
  });
  if (!res.ok) throw new Error(`Transcribe failed: ${res.status}`);
  const data = await res.json();
  return data.text;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new Blob([arr], { type: mimeType });
}

export function useInterviewFlow(sessionId: number, voiceGender: string = 'female') {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [currentQuestionText, setCurrentQuestionText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  const invalidateSession = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
  }, [queryClient, sessionId]);

  const getVoice = useCallback(() => {
    return voiceGender === 'male' ? 'onyx' : 'nova';
  }, [voiceGender]);

  const unlockAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch {}
    const silent = audioRef.current;
    silent.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    silent.play().then(() => silent.pause()).catch(() => {});
    setAudioUnlocked(true);
  }, []);

  const cleanupBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const playAudioBase64 = useCallback((audioBase64: string): Promise<void> => {
    return new Promise((resolve) => {
      cleanupBlobUrl();
      const blob = base64ToBlob(audioBase64, 'audio/mpeg');
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = blobUrl;

      audioRef.current.onplay = () => setOrbState('speaking');
      audioRef.current.onended = () => {
        cleanupBlobUrl();
        setOrbState('listening');
        startRecording();
        resolve();
      };
      audioRef.current.onerror = (e) => {
        console.error("Audio playback error:", e);
        cleanupBlobUrl();
        setOrbState('listening');
        startRecording();
        resolve();
      };

      audioRef.current.play().catch((playErr) => {
        console.error("Audio play() blocked:", playErr);
        cleanupBlobUrl();
        setOrbState('listening');
        startRecording();
        resolve();
      });
    });
  }, [startRecording, cleanupBlobUrl]);

  const speakText = useCallback((text: string, preloadedAudio?: string): Promise<void> => {
    setCurrentQuestionText(text);
    setOrbState('speaking');

    if (preloadedAudio) {
      return playAudioBase64(preloadedAudio);
    }

    return new Promise(async (resolve) => {
      try {
        const audioBase64 = await apiTextToSpeech(sessionId, text, getVoice());
        if (audioBase64) {
          await playAudioBase64(audioBase64);
          resolve();
        } else {
          console.error("TTS returned empty audio");
          setOrbState('listening');
          startRecording();
          resolve();
        }
      } catch (err) {
        console.error("TTS Error:", err);
        setOrbState('listening');
        startRecording();
        resolve();
      }
    });
  }, [sessionId, getVoice, startRecording, playAudioBase64]);

  const handleTimeUp = useCallback(async (finalMessage: string) => {
    setIsTimeUp(true);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    try {
      await stopRecording();
    } catch {}
    setCurrentQuestionText(finalMessage);
    setOrbState('speaking');
    try {
      const audioBase64 = await apiTextToSpeech(sessionId, finalMessage, getVoice());
      if (audioBase64) {
        cleanupBlobUrl();
        const blob = base64ToBlob(audioBase64, 'audio/mpeg');
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = blobUrl;
        audioRef.current.onended = () => {
          cleanupBlobUrl();
          setOrbState('idle');
        };
        audioRef.current.onerror = () => {
          cleanupBlobUrl();
          setOrbState('idle');
        };
        await audioRef.current.play();
      } else {
        setOrbState('idle');
      }
    } catch {
      setOrbState('idle');
    }
  }, [sessionId, getVoice, stopRecording, cleanupBlobUrl]);

  const forceEndInterview = useCallback(async () => {
    if (isTimeUp) return;
    setIsTimeUp(true);
    busyRef.current = true;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
    cleanupBlobUrl();
    try { await stopRecording(); } catch {}

    const farewell = "That brings us to the end of our time together. Thank you so much for taking the time to speak with me today. You did a wonderful job, and I really enjoyed our conversation. We will now prepare your evaluation report. Best of luck!";
    setCurrentQuestionText(farewell);
    setOrbState('speaking');

    try {
      const audioBase64 = await apiTextToSpeech(sessionId, farewell, getVoice());
      if (audioBase64) {
        cleanupBlobUrl();
        const blob = base64ToBlob(audioBase64, 'audio/mpeg');
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = blobUrl;
        audioRef.current.onended = () => {
          cleanupBlobUrl();
          setOrbState('idle');
        };
        audioRef.current.onerror = () => {
          cleanupBlobUrl();
          setOrbState('idle');
        };
        await audioRef.current.play();
      } else {
        setOrbState('idle');
      }
    } catch {
      setOrbState('idle');
    }
  }, [sessionId, getVoice, stopRecording, cleanupBlobUrl, isTimeUp]);

  const triggerNextQuestion = useCallback(async () => {
    if (busyRef.current || isTimeUp) return;
    busyRef.current = true;
    setOrbState('thinking');
    setCurrentQuestionText("");
    setTranscript("");

    await consumeSSE(
      `/api/sessions/${sessionId}/next-question`,
      { candidateTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      async (doneData) => {
        invalidateSession();
        if (doneData?.timeUp) {
          await handleTimeUp(doneData.response || "Time is up. Thank you.");
          busyRef.current = false;
          return;
        }
        const responseText = doneData?.response || "";
        if (responseText) {
          await speakText(responseText, doneData?.audioBase64);
        } else {
          setOrbState('idle');
        }
        busyRef.current = false;
      },
      (err) => {
        console.error("Next Question SSE Error:", err);
        setOrbState('idle');
        busyRef.current = false;
      }
    );
  }, [sessionId, invalidateSession, speakText, handleTimeUp, isTimeUp]);

  const submitAnswer = useCallback(async () => {
    if (orbState !== 'listening' || busyRef.current || isTimeUp) return;
    busyRef.current = true;

    setOrbState('thinking');
    let answerText = "";

    try {
      const base64Audio = await stopRecording();
      if (base64Audio) {
        answerText = await apiTranscribe(sessionId, base64Audio);
        setTranscript(answerText);
      } else {
        answerText = "I have no answer.";
      }

      setCurrentQuestionText("");

      await consumeSSE(
        `/api/sessions/${sessionId}/message`,
        { content: answerText, candidateTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        async (doneData) => {
          invalidateSession();
          if (doneData?.timeUp) {
            await handleTimeUp(doneData.response || "Time is up. Thank you.");
            busyRef.current = false;
            return;
          }
          const responseText = doneData?.response || "";
          if (responseText) {
            await speakText(responseText, doneData?.audioBase64);
          } else {
            setOrbState('idle');
          }
          busyRef.current = false;
        },
        (err) => {
          console.error("Message SSE Error:", err);
          setOrbState('idle');
          busyRef.current = false;
        }
      );
    } catch (err) {
      console.error("Submit Answer Error:", err);
      setOrbState('idle');
      busyRef.current = false;
    }
  }, [sessionId, orbState, stopRecording, invalidateSession, speakText, handleTimeUp, isTimeUp]);

  return {
    orbState,
    currentQuestionText,
    transcript,
    isRecording,
    isTimeUp,
    audioUnlocked,
    unlockAudio,
    triggerNextQuestion,
    submitAnswer,
    forceEndInterview
  };
}
