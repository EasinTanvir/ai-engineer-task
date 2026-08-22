import "dotenv/config";

import { ChatGroq } from "@langchain/groq";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is required.");
}

export const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-120b",
  temperature: 0,
});
