import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] ?? 8099);

// Serves the fixture sites at http://localhost:<port>/<site>/<page>.html so
// the batch entry point (Section 9) can be exercised against a local
// address, per the brief's note that test company sites may be local.
const server = http.createServer(async (req, res) => {
  const requestedPath = decodeURIComponent(req.url ?? "/").split("?")[0];
  const relativePath = requestedPath.endsWith("/") ? `${requestedPath}index.html` : requestedPath;
  const filePath = path.join(__dirname, relativePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Fixture sites serving on http://localhost:${port}`);
  console.log(`  http://localhost:${port}/sample-company-site/index.html`);
  console.log(`  http://localhost:${port}/no-hiring-site/index.html`);
});
