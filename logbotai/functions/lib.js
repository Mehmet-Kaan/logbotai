export function chunkText(text, maxCharacters = 1800, overlapCharacters = 150) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= maxCharacters) return [normalized];

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    const targetEnd = Math.min(start + maxCharacters, normalized.length);
    let end = targetEnd;

    if (targetEnd < normalized.length) {
      const paragraphBreak = normalized.lastIndexOf("\n", targetEnd);
      const wordBreak = normalized.lastIndexOf(" ", targetEnd);
      const candidate = Math.max(paragraphBreak, wordBreak);
      if (candidate > start + Math.floor(maxCharacters * 0.6)) end = candidate;
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    start = Math.max(end - overlapCharacters, start + 1);
  }

  return chunks;
}

export function meanVectors(vectors) {
  const usable = vectors.filter(
    (vector) => Array.isArray(vector) && vector.length > 0 && vector.every(Number.isFinite),
  );
  if (!usable.length) return [];

  const dimensions = Math.min(...usable.map((vector) => vector.length));
  return Array.from({ length: dimensions }, (_, index) =>
    usable.reduce((sum, vector) => sum + vector[index], 0) / usable.length,
  );
}

export function normalizeVector(value) {
  if (!Array.isArray(value) || value.length === 0) return [];
  if (value.every(Number.isFinite)) return value;
  return meanVectors(value.map(normalizeVector));
}

export function cosineSimilarity(leftValue, rightValue) {
  const left = normalizeVector(leftValue);
  const right = normalizeVector(rightValue);
  if (!left.length || left.length !== right.length) return -1;

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator ? dotProduct / denominator : -1;
}

export function selectRelevantTexts(queryEmbedding, storedEmbeddings, originalTexts, limit = 5) {
  if (!Array.isArray(storedEmbeddings) || !Array.isArray(originalTexts)) return [];

  return storedEmbeddings
    .map((embedding, index) => ({
      index,
      similarity: cosineSimilarity(queryEmbedding, embedding),
    }))
    .filter(({ index, similarity }) => similarity > -1 && typeof originalTexts[index] === "string")
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit)
    .map(({ index }) => originalTexts[index]);
}

export function buildContext(texts, maxCharacters = 30000) {
  let remaining = maxCharacters;
  const selected = [];

  for (const text of texts) {
    if (remaining <= 0) break;
    const normalized = String(text || "").trim();
    if (!normalized) continue;
    const excerpt = normalized.slice(0, remaining);
    selected.push(excerpt);
    remaining -= excerpt.length;
  }

  return selected.join("\n\n---\n\n");
}

export function sanitizeConversation(conversation, limit = 8) {
  if (!Array.isArray(conversation)) return [];

  return conversation
    .filter((message) => message && typeof message.content === "string")
    .slice(-limit)
    .map((message) => ({
      role: message.role === "user" ? "user" : "assistant",
      content: message.content.slice(0, 4000),
    }));
}

export function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}
