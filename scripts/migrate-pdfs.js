import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { pipeline } from "@huggingface/transformers";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { count, inArray } from "drizzle-orm";
import { PDFParse } from "pdf-parse";

import { documentChunks } from "../db/schema.js";
import { closeDatabase, db, ensureSchema } from "./db.js";

const pdfDirectory = resolve(process.cwd(), "pdf");
const embeddingModel = "onnx-community/all-MiniLM-L6-v2-ONNX";
const documentMetadata = {
  "05_Northstar_Logistics_Enterprise_Agreement.pdf": { sourceType: "agreement", versionStatus: "current", authorityRank: 1, accountScope: "ACCT-001" },
  "06_LumenWorks_Service_Agreement.pdf": { sourceType: "agreement", versionStatus: "current", authorityRank: 1, accountScope: "ACCT-002" },
  "03_Cancellation_and_Service_Credit_SOP_v4.pdf": { sourceType: "sop", versionStatus: "current", authorityRank: 2, accountScope: null },
  "01_Support_Policy_v3_CURRENT.pdf": { sourceType: "policy", versionStatus: "current", authorityRank: 3, accountScope: null },
  "04_Product_Operations_Guide_and_Known_Issues.pdf": { sourceType: "product_guide", versionStatus: "current", authorityRank: 3, accountScope: null },
  "02_Support_Policy_v2_DEPRECATED.pdf": { sourceType: "policy", versionStatus: "deprecated", authorityRank: 99, accountScope: null },
};

async function extractText(fileName) {
  const parser = new PDFParse({ data: await readFile(resolve(pdfDirectory, fileName)) });
  try { return (await parser.getText()).text.trim(); } finally { await parser.destroy(); }
}

async function migratePdfs() {
  await ensureSchema();
  const expectedFiles = Object.keys(documentMetadata);
  const actualFiles = (await readdir(pdfDirectory)).filter((file) => file.endsWith(".pdf")).sort();
  if (actualFiles.length !== expectedFiles.length || expectedFiles.some((file) => !actualFiles.includes(file))) {
    throw new Error("The pdf directory does not match the required six-file document set.");
  }

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const embed = await pipeline("feature-extraction", embeddingModel);
  const chunksToInsert = [];
  for (const sourceFile of expectedFiles) {
    const content = await extractText(sourceFile);
    if (!content) throw new Error(`No text could be extracted from ${sourceFile}.`);
    const chunks = await splitter.splitText(content);
    for (const [chunkIndex, content] of chunks.entries()) {
      const result = await embed(content, { pooling: "mean", normalize: true });
      const embedding = Array.from(result.data);
      if (embedding.length !== 384) throw new Error(`Expected a 384-dimensional embedding for ${sourceFile}.`);
      chunksToInsert.push({ ...documentMetadata[sourceFile], sourceFile, chunkIndex, content, embedding });
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(documentChunks).where(inArray(documentChunks.sourceFile, expectedFiles));
    await tx.insert(documentChunks).values(chunksToInsert);
  });
  const [chunkCount] = await db.select({ value: count() }).from(documentChunks);
  console.log(`Migrated document_chunks=${chunkCount.value} across ${expectedFiles.length} PDFs`);
}

migratePdfs().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(closeDatabase);
