import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import {
  buildContext,
  chunkText,
  clampNumber,
  normalizeVector,
  sanitizeConversation,
  selectRelevantTexts,
} from "./lib.js";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

const EMBEDDING_MODEL = "text-embedding-3-small";
const OPENAI_CHAT_MODEL = "gpt-4o-mini";
const MAX_FILES_PER_REQUEST = 10;
const MAX_FILE_CHARACTERS = 120000;
const VALID_VOICES = new Set(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);

if (!getApps().length) initializeApp();

let openaiClient;

function getOpenAIClient() {
  openaiClient ||= new OpenAI({ apiKey: OPENAI_API_KEY.value() });
  return openaiClient;
}

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function requireString(value, name, maximumLength) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${name} is required.`);
    error.status = 400;
    throw error;
  }
  if (value.length > maximumLength) {
    const error = new Error(`${name} is too large.`);
    error.status = 413;
    throw error;
  }
  return value.trim();
}

async function createEmbedding(text) {
  const chunks = chunkText(text);
  const output = await getOpenAIClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: chunks,
  });
  const vector = normalizeVector(output.data.map(({ embedding }) => embedding));
  if (!vector.length) throw new Error("The embedding provider returned an empty vector.");
  return vector;
}

async function getRelevantContext(requestBody) {
  const question = requireString(requestBody.question, "question", 4000);
  const queryEmbedding = await createEmbedding(question);
  const relevantTexts = selectRelevantTexts(
    queryEmbedding,
    requestBody.storedEmbeddings,
    requestBody.originalTexts,
  );

  if (!relevantTexts.length) {
    const error = new Error("No compatible document embeddings were supplied.");
    error.status = 400;
    throw error;
  }

  return { question, context: buildContext(relevantTexts) };
}

function chatMessages(question, context, conversation) {
  return [
    {
      role: "system",
      content:
        "You answer questions using only the supplied document context. " +
        "If the context does not contain the answer, say so clearly.\n\n" +
        `Document context:\n${context}`,
    },
    ...sanitizeConversation(conversation),
    { role: "user", content: question },
  ];
}

function parsePodcastLines(script, presenterVoice, guestVoice) {
  return script
    .split("\n")
    .map((line) => line.trim().replace(/^[-*\s]+/, "").replace(/\*\*/g, ""))
    .filter(Boolean)
    .map((line) => {
      const guest = /^Guest\s*:/i.test(line);
      const presenter = /^Presenter\s*:/i.test(line);
      return {
        voice: guest ? guestVoice : presenter ? presenterVoice : presenterVoice,
        text: line.replace(/^(Presenter|Guest)\s*:\s*/i, "").trim(),
      };
    })
    .filter(({ text }) => text);
}

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false, limit: "20mb" }));

// Firebase Hosting preserves the rewritten URL. Direct function URLs do not.
app.use((request, _response, next) => {
  if (request.url === "/api") request.url = "/";
  else if (request.url.startsWith("/api/")) request.url = request.url.slice(4);
  next();
});

app.get(["/health", "/wakeup"], (_request, response) => {
  response.json({ status: "ok" });
});

app.use(
  asyncRoute(async (request, response, next) => {
    if (request.method === "OPTIONS") return next();

    const match = request.get("authorization")?.match(/^Bearer\s+(.+)$/i);
    if (!match) return response.status(401).json({ message: "Authentication is required." });

    try {
      request.user = await getAuth().verifyIdToken(match[1]);
      return next();
    } catch (error) {
      console.warn("Rejected Firebase ID token:", error.code || error.message);
      return response.status(401).json({ message: "The authentication token is invalid." });
    }
  }),
);

app.post(
  "/huggingfaceEmbedding",
  asyncRoute(async (request, response) => {
    const files = request.body?.filesContents;
    if (!Array.isArray(files) || files.length === 0) {
      return response.status(400).json({ message: "filesContents must contain at least one file." });
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return response.status(413).json({
        message: `Upload at most ${MAX_FILES_PER_REQUEST} files at a time.`,
      });
    }

    const seenContent = new Set();
    const uniqueFiles = [];

    for (const file of files) {
      const name = requireString(file?.name, "file name", 300);
      const content = requireString(file?.content, `${name} content`, MAX_FILE_CHARACTERS);
      if (seenContent.has(content)) continue;
      seenContent.add(content);
      uniqueFiles.push({ name, content });
    }

    const embedded = await Promise.all(
      uniqueFiles.map(async ({ name, content }) => ({
        name,
        embeddedText: await createEmbedding(content),
      })),
    );

    response.json({ message: "success", embedded });
  }),
);

app.post(
  "/groqChat",
  asyncRoute(async (request, response) => {
    const { question, context } = await getRelevantContext(request.body || {});
    const completion = await getOpenAIClient().chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      messages: chatMessages(question, context, request.body?.conversation),
      temperature: clampNumber(request.body?.temperature, 0, 1, 0.2),
      max_tokens: Math.round(clampNumber(request.body?.maxTokens, 1, 2048, 1024)),
    });

    response.json({ message: "success", answer: completion.choices[0]?.message?.content || "" });
  }),
);

app.post(
  "/chat",
  asyncRoute(async (request, response) => {
    const { question, context } = await getRelevantContext(request.body || {});
    const completion = await getOpenAIClient().chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      messages: chatMessages(question, context, request.body?.conversation),
      temperature: clampNumber(request.body?.temperature, 0, 1, 0.2),
    });

    response.json({ message: "success", answer: completion.choices[0]?.message?.content || "" });
  }),
);

app.post(
  "/getTextSnippGroq",
  asyncRoute(async (request, response) => {
    const textToLocate = requireString(request.body?.textToLocate, "textToLocate", 12000);
    const allText = requireString(request.body?.allText, "allText", 120000).slice(0, 30000);
    const completion = await getOpenAIClient().chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Locate the source passage in the supplied document. Return only the shortest exact " +
            "sentence or paragraph that supports the supplied answer. If none exists, return NOT_FOUND.",
        },
        { role: "user", content: `Document:\n${allText}\n\nAnswer to locate:\n${textToLocate}` },
      ],
    });

    response.json({
      message: "success",
      textSnipp: completion.choices[0]?.message?.content || "NOT_FOUND",
    });
  }),
);

app.post(
  "/generatePodcast",
  asyncRoute(async (request, response) => {
    const allText = requireString(request.body?.allText, "allText", 60000).slice(0, 20000);
    const title = requireString(request.body?.title, "title", 200);
    const presenterVoice = VALID_VOICES.has(request.body?.presenterVoice)
      ? request.body.presenterVoice
      : "alloy";
    const guestVoice = VALID_VOICES.has(request.body?.guestVoice) ? request.body.guestVoice : "nova";

    const scriptResponse = await getOpenAIClient().chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content:
            "Turn the document into a concise, engaging two-person podcast. Return only dialogue " +
            "lines beginning with 'Presenter:' or 'Guest:'.",
        },
        { role: "user", content: allText },
      ],
    });

    const lines = parsePodcastLines(
      scriptResponse.choices[0]?.message?.content || "",
      presenterVoice,
      guestVoice,
    );
    if (!lines.length) throw new Error("The podcast script was empty.");

    const audioParts = await Promise.all(
      lines.map(async ({ voice, text }) => {
        const speech = await getOpenAIClient().audio.speech.create({
          model: "tts-1",
          voice,
          input: text,
        });
        return Buffer.from(await speech.arrayBuffer());
      }),
    );

    const podcastBase64 = `data:audio/mpeg;base64,${Buffer.concat(audioParts).toString("base64")}`;
    response.json({ message: "Podcast generated successfully", podcastBase64, title });
  }),
);

app.get("/questionsAsked", (_request, response) => {
  response.json([]);
});

app.use((request, response) => {
  response.status(404).json({ message: `Unknown API route: ${request.method} ${request.path}` });
});

app.use((error, _request, response, _next) => {
  const status = Number.isInteger(error.status) ? error.status : 500;
  console.error("API request failed:", error);
  response.status(status).json({
    message: status >= 500 ? "The API request failed. Check the function logs." : error.message,
  });
});

export { app };

export const api = onRequest(
  {
    region: "europe-west1",
    memory: "1GiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 3,
    concurrency: 10,
    invoker: "public",
    secrets: [OPENAI_API_KEY],
  },
  app,
);
