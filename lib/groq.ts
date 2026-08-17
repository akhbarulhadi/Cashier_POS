import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "dummy_groq_api_key",
});

export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY;
  return Boolean(key && !key.toLowerCase().includes("dummy") && key.startsWith("gsk_"));
}
