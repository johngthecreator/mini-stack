import type { BunRequest } from "bun";
import { extname } from "path";
import { routes } from "@/app/routes";
import {
  createTables,
  hasChanged,
  loadPrevious,
  saveNew,
  type HTTPMethod,
} from "./utils";

const mimeTypes: Record<string, string> = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
};

const template = await Bun.file("./public/index.html").text();

const models = await Bun.file("./app/db/schema.yaml").text();

const prevModels = await loadPrevious();

if (hasChanged(prevModels, models)) {
  console.log("Models changed, recreating tables.");
  createTables(models);
  saveNew(models);
} else {
  console.log("Models unchanged.");
}

Bun.serve({
  async fetch(req: BunRequest) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Serve static client bundles
    if (pathname.startsWith("/dist/client/")) {
      try {
        const filePath = `.${pathname}`;
        const ext = extname(filePath);
        const contentType = mimeTypes[ext] || "application/octet-stream";
        const file = await Bun.file(filePath).arrayBuffer();
        return new Response(file, { headers: { "Content-Type": contentType } });
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    }

    // Match route from routes.ts
    const route = routes.find((r) => r.path === pathname);
    if (!route) {
      return new Response("Not Found", { status: 404 });
    }

    const method = req.method as HTTPMethod;
    if (route.api && typeof route.api === "object") {
      const handler = route.api[method];
      if (handler) {
        return handler(req);
      } else {
        return new Response("Method Not Allowed", { status: 405 });
      }
    }

    let props = {};
    if (route.loader) {
      const result = await route.loader(req);
      if (result instanceof Response) return result;
      props = result;
    }

    const React = require("react");
    const ReactDOMServer = require("react-dom/server");
    const htmlContent = ReactDOMServer.renderToString(
      React.createElement(route.view, props)
    );

    // Insert SSR HTML and loader data into template
    const page = template
      .replace("{{SSR_CONTENT}}", htmlContent)
      .replace("{{LOADER_DATA}}", JSON.stringify(props));

    return new Response(page, {
      headers: { "Content-Type": "text/html" },
    });
  },
  port: 3000,
});
