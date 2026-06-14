// Cloudflare Worker — abuse-limited proxy for MotionDirector sketch generation.
//
// Holds the Anthropic API key server-side (never shipped to the browser) and
// enforces, in layers:
//   1. A HARD GLOBAL DAILY CAP — bounds worst-case spend no matter what.
//   2. A per-IP hourly rate limit — stops one client hammering it.
//   3. A server-pinned model + max_tokens — clients can't crank up cost per call.
//   4. CORS locked to the public site origin (+ localhost for testing).
//
// Counters live in a KV namespace (binding: LIMITS). The key is set as a secret
// (ANTHROPIC_API_KEY). See worker/README.md for deploy steps.

const ALLOWED_ORIGINS = new Set([
  "https://linda-sc.github.io",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
]);

const DAILY_CAP = 100; // hard ceiling on upstream model calls per UTC day
const PER_IP_HOURLY = 5; // generations per IP per hour
const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 2048;
const MAX_IDEA_LEN = 400;

const POSE_NODES = [
  "head", "neck", "chest", "stomach", "hips",
  "leftShoulder", "rightShoulder", "leftElbow", "rightElbow",
  "leftHand", "rightHand", "leftHip", "rightHip",
  "leftKnee", "rightKnee", "leftFoot", "rightFoot",
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://linda-sc.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(status, body, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json(405, { error: "Method not allowed." }, cors);
    if (origin && !ALLOWED_ORIGINS.has(origin)) return json(403, { error: "Forbidden origin." }, cors);

    const now = new Date();
    const day = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const hour = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    const ipKey = `rl:${ip}:${hour}`;
    const dayKey = `global:${day}`;
    const ipCount = parseInt((await env.LIMITS.get(ipKey)) || "0", 10);
    if (ipCount >= PER_IP_HOURLY) {
      return json(429, { error: "You've hit the hourly limit — try again a bit later." }, cors);
    }
    const dayCount = parseInt((await env.LIMITS.get(dayKey)) || "0", 10);
    if (dayCount >= DAILY_CAP) {
      return json(429, { error: "The demo's daily generation limit has been reached. Try again tomorrow." }, cors);
    }

    let idea = "";
    let base = null;
    try {
      const body = await request.json();
      idea = String(body.idea ?? "").trim().slice(0, MAX_IDEA_LEN);
      base = body.base ?? null;
    } catch {
      return json(400, { error: "Invalid request." }, cors);
    }
    if (!idea) return json(400, { error: "Describe an idea first." }, cors);

    // Reserve quota BEFORE calling the model so failed/abusive attempts still
    // count — this keeps the upstream call count strictly bounded by the caps.
    // (KV read-then-write isn't atomic; under a burst a few extra calls may slip
    // through. For a low-traffic demo with a 100/day cap that's a few cents, not
    // a runaway. Use a Durable Object if you need exact counting.)
    await env.LIMITS.put(ipKey, String(ipCount + 1), { expirationTtl: 3600 });
    await env.LIMITS.put(dayKey, String(dayCount + 1), { expirationTtl: 172800 });

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

    let apiResponse;
    try {
      apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system,
          output_config: { format: { type: "json_schema", schema: poseSchema } },
          messages: [{ role: "user", content: userText }],
        }),
      });
    } catch {
      return json(502, { error: "Could not reach the model." }, cors);
    }

    if (!apiResponse.ok) {
      return json(502, { error: `Model error (${apiResponse.status}).` }, cors);
    }
    const payload = await apiResponse.json();
    if (payload.stop_reason === "refusal") {
      return json(502, { error: "The model declined this request." }, cors);
    }
    const textBlock = (payload.content ?? []).find((block) => block.type === "text");
    let pose = null;
    try {
      pose = textBlock ? JSON.parse(textBlock.text) : null;
    } catch {
      pose = null;
    }
    if (!pose || typeof pose !== "object") {
      return json(502, { error: "Model returned an unreadable pose." }, cors);
    }

    return json(200, { pose }, cors);
  },
};
