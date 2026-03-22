import OpenAI from 'openai';

const hasIntegration = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const hasDirectKey = !!process.env.OPENAI_API_KEY;

if (!hasIntegration && !hasDirectKey) {
  throw new Error('Either AI_INTEGRATIONS_OPENAI_BASE_URL/API_KEY or OPENAI_API_KEY must be set');
}

export const openai = new OpenAI(
  hasIntegration
    ? {
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      }
    : {
        apiKey: process.env.OPENAI_API_KEY,
      }
);

export const ttsClient = openai;
