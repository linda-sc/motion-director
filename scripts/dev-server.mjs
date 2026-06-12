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

const server = createServer((request, response) => {
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
