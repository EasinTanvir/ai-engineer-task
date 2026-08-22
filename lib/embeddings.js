import { pipeline } from "@huggingface/transformers";

const embeddingModel = "onnx-community/all-MiniLM-L6-v2-ONNX";
let extractorPromise;

export async function embedText(text) {
  extractorPromise ??= pipeline("feature-extraction", embeddingModel);
  const extractor = await extractorPromise;
  const result = await extractor(text, { pooling: "mean", normalize: true });
  const embedding = Array.from(result.data);
  if (embedding.length !== 384) {
    throw new Error(`Expected a 384-dimensional embedding, received ${embedding.length}.`);
  }
  return embedding;
}
