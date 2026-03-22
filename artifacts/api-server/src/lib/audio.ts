import { ttsClient } from './openai';

type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export async function textToSpeech(text: string, voice: TTSVoice = 'nova', format: 'mp3' | 'wav' = 'mp3'): Promise<Buffer | null> {
  try {
    const mp3 = await ttsClient.audio.speech.create({ model: 'tts-1', voice, input: text, response_format: format });
    const arrayBuffer = await mp3.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("TTS failed (non-fatal):", (err as Error).message);
    return null;
  }
}

export async function ensureCompatibleFormat(audioBuffer: Buffer): Promise<{buffer: Buffer, format: 'wav'|'mp3'}> {
  return { buffer: audioBuffer, format: 'wav' };
}
