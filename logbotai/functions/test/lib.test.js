import assert from "node:assert/strict";
import test from "node:test";
import {
  chunkText,
  cosineSimilarity,
  normalizeVector,
  sanitizeConversation,
  selectRelevantTexts,
} from "../lib.js";

test("chunkText keeps content within the requested chunk size", () => {
  const chunks = chunkText("one two three four five six seven eight nine ten", 18, 3);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 18));
});

test("normalizeVector mean-pools nested provider output", () => {
  assert.deepEqual(normalizeVector([[1, 3], [3, 5]]), [2, 4]);
});

test("cosineSimilarity rejects incompatible dimensions", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0, 0]), -1);
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
});

test("selectRelevantTexts orders context by vector similarity", () => {
  const texts = selectRelevantTexts([1, 0], [[0, 1], [1, 0]], ["second", "first"]);
  assert.deepEqual(texts, ["first", "second"]);
});

test("conversation roles are limited to user and assistant", () => {
  assert.deepEqual(sanitizeConversation([{ role: "system", content: "answer" }]), [
    { role: "assistant", content: "answer" },
  ]);
});
