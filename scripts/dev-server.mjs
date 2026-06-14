import { createReadStream, existsSync, watch } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const root = resolve(".");
const port = Number(process.env.PORT ?? 8787);
const clients = new Set();

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendReload() {
  for (const client of clients) {
    client.write("event: reload\ndata: now\n\n");
  }
}

function serveFile(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = resolve(join(root, pathname));

  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

// Built-in node names for a pose (kept in sync with autonomousNodes in src/app.js).
const POSE_NODES = [
  "head", "neck", "chest", "stomach", "hips",
  "leftShoulder", "rightShoulder", "leftElbow", "rightElbow",
  "leftHand", "rightHand", "leftHip", "rightHip",
  "leftKnee", "rightKnee", "leftFoot", "rightFoot",
];

// POST /api/generate — local-only proxy to Claude. Holds the API key server-side
// so it is never shipped to the browser. The hosted (GitHub Pages) build has no
// backend, so this route does not exist there and the button degrades gracefully.
async function handleGenerate(request, response) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const sendJson = (status, payload) => {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(payload));
  };

  if (!apiKey) {
    sendJson(503, { error: "Set ANTHROPIC_API_KEY in your environment and restart `npm run dev` to enable sketch generation." });
    return;
  }

  let raw = "";
  for await (const chunk of request) raw += chunk;
  let idea = "";
  let base = null;
  try {
    const parsed = JSON.parse(raw || "{}");
    idea = String(parsed.idea ?? "").trim();
    base = parsed.base ?? null;
  } catch {
    sendJson(400, { error: "Invalid request body." });
    return;
  }
  if (!idea) {
    sendJson(400, { error: "Describe an idea first." });
    return;
  }

  const poseSchema = {
    type: "object",
    additionalProperties: false,
    required: POSE_NODES,
    properties: Object.fromEntries(POSE_NODES.map((node) => [node, {
      type: "object",
      additionalProperties: false,
      required: ["x", "y"],
      properties: { x: { type: "number" }, y: { type: "number" } },
    }])),
  };

  const system = [
    "You are a junior animator for MotionDirector. You author a single full-body keyframe POSE as 2D skeleton node coordinates.",
    "A pose is 17 nodes, each {x, y}, in the rig's coordinate space: x runs left→right roughly 250–650 (body centered near 450), y runs top→bottom roughly 120 (head) to 700 (feet). Larger y is lower on screen.",
    "Use the provided rest pose as the anchor and move nodes to express the idea while keeping the body coherent: limbs stay attached, proportions stay believable, joints bend the right way.",
    "Favor asymmetry — never mirror left/right limbs exactly; twinning reads stiff.",
    "Return only the pose object conforming to the schema. No commentary.",
  ].join("\n");

  const userText = `Idea: ${idea}\n\nRest pose (anchor) for reference:\n${JSON.stringify(base ?? {})}`;

  try {
    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 2048,
        system,
        output_config: { format: { type: "json_schema", schema: poseSchema } },
        messages: [{ role: "user", content: userText }],
      }),
    });

    if (!apiResponse.ok) {
      const detail = await apiResponse.text();
      console.error("[generate] Claude API error", apiResponse.status, detail);
      sendJson(502, { error: `Claude API error (${apiResponse.status}).` });
      return;
    }

    const payload = await apiResponse.json();
    if (payload.stop_reason === "refusal") {
      sendJson(502, { error: "The model declined this request." });
      return;
    }
    const textBlock = (payload.content ?? []).find((block) => block.type === "text");
    const pose = textBlock ? JSON.parse(textBlock.text) : null;
    if (!pose || typeof pose !== "object") {
      sendJson(502, { error: "Model returned an unreadable pose." });
      return;
    }
    sendJson(200, { pose });
  } catch (error) {
    console.error("[generate]", error);
    sendJson(502, { error: "Could not reach the model." });
  }
}

const server = createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/generate") {
    handleGenerate(request, response);
    return;
  }

  if (request.url === "/__events") {
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream",
    });
    response.write("event: ready\ndata: connected\n\n");
    clients.add(response);
    request.on("close", () => clients.delete(response));
    return;
  }

  serveFile(request, response);
});

watch(root, { recursive: true }, (_event, filename) => {
  if (!filename) return;
  if (filename.startsWith(".git") || filename.includes("node_modules")) return;
  if (!/\.(css|html|js|json|mjs)$/.test(filename)) return;
  sendReload();
});

server.listen(port, "127.0.0.1", () => {
  console.log(`MotionDirector dev server listening at http://127.0.0.1:${port}`);
});
