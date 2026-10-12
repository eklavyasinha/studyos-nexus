// Local-only test server. Deploy dist/, never this script or the project root.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("dist");
const index = process.argv.indexOf("--port");
const port = Number(index >= 0 ? process.argv[index + 1] : 4174);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid preview port.");
const headerText = await readFile(path.join(root, "_headers"), "utf8");
const headers = Object.fromEntries(
  headerText
    .split("\n")
    .filter((line) => /^\s+[^:]+:/.test(line))
    .map((line) => {
      const at = line.indexOf(":");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};
const server = createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method || "")) {
      res.writeHead(405).end();
      return;
    }
    const pathname = decodeURIComponent(
      new URL(req.url || "/", "http://localhost").pathname,
    );
    const segments = pathname.split("/");
    if (
      segments.some(
        (segment) => segment.startsWith(".") || segment.startsWith("_"),
      )
    ) {
      res.writeHead(404).end();
      return;
    }
    let file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      res.writeHead(404).end();
      return;
    }
    let exists = false;
    try {
      exists = (await stat(file)).isFile();
    } catch {
      /* SPA fallback below. */
    }
    if (!exists) {
      if (path.extname(pathname)) {
        res.writeHead(404).end();
        return;
      }
      file = path.join(root, "index.html");
    }
    const content = await readFile(file);
    res.writeHead(200, {
      ...headers,
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    res.writeHead(400).end("Invalid request");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Production + hosting headers preview: http://127.0.0.1:${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
