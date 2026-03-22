import { openai } from './openai';

type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export async function textToSpeech(text: string, voice: TTSVoice = 'nova', format: 'mp3' | 'wav' = 'mp3'): Promise<Buffer> {
  const mp3 = await openai.audio.speech.create({ model: 'tts-1', voice, input: text, response_format: format });
  const arrayBuffer = await mp3.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function ensureCompatibleFormat(audioBuffer: Buffer): Promise<{buffer: Buffer, format: 'wav'|'mp3'}> {
  return { buffer: audioBuffer, format: 'wav' };
}
