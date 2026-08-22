import "dotenv/config";
import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const models = await client.models.list();
console.log(models.data.map((model) => model.id).join("\n"));
