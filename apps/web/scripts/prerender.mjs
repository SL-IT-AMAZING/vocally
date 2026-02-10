/**
 * Post-build prerender script.
 *
 * After `vite build` produces dist/, this script uses Vite's SSR capabilities
 * to render each route to static HTML. The resulting files are written back into
 * dist/ so that crawlers (like Paddle's verification bot) see real content
 * instead of an empty <div id="root"></div>.
 *
 * Usage: node scripts/prerender.mjs
 */

import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.mjs";
import { IntlProvider } from "react-intl";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

// Routes to prerender. These are the pages Paddle's crawler (and search engines)
// need to see as static HTML.
const ROUTES = ["/", "/terms", "/privacy", "/refund", "/pricing"];

async function prerender() {
  // Spin up a Vite dev server in SSR/middleware mode — no HTTP listener,
  // just the transform pipeline so we can ssrLoadModule our app code.
  const vite = await createServer({
    root: ROOT,
    server: { middlewareMode: true },
    appType: "custom",
    // Silence console output during prerender
    logLevel: "warn",
  });

  try {
    // Load app modules through Vite so import.meta.glob, CSS modules,
    // babel-plugin-formatjs, etc. all get processed. Node_modules (react,
    // react-router-dom, react-intl) are imported directly at the top to
    // avoid Vite 7 SSR runner CJS/ESM conflicts.
    const { default: App } = await vite.ssrLoadModule("/src/App.tsx");
    const { getIntlConfig } = await vite.ssrLoadModule("/src/i18n/index.ts");

    const templateHtml = fs.readFileSync(
      path.join(DIST, "index.html"),
      "utf-8",
    );

    // Use the default (English) locale for prerendered pages.
    const intlConfig = getIntlConfig();
    const locale = intlConfig.defaultLocale || "en";
    const messages = intlConfig.messages || {};

    for (const route of ROUTES) {
      const appHtml = renderToString(
        createElement(
          IntlProvider,
          { locale, defaultLocale: locale, messages },
          createElement(StaticRouter, { location: route }, createElement(App)),
        ),
      );

      // Inject the rendered HTML into the template.
      // Replace the empty <div id="root"></div> with the prerendered content.
      const html = templateHtml.replace(
        '<div id="root"></div>',
        `<div id="root">${appHtml}</div>`,
      );

      // Write the file. For "/" → dist/index.html, for "/terms" → dist/terms/index.html
      if (route === "/") {
        fs.writeFileSync(path.join(DIST, "index.html"), html, "utf-8");
        console.log(`  ✓ / → dist/index.html`);
      } else {
        const dir = path.join(DIST, route.slice(1));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
        console.log(`  ✓ ${route} → dist${route}/index.html`);
      }
    }

    console.log(`\nPrerendered ${ROUTES.length} routes.`);
  } finally {
    await vite.close();
  }
}

prerender().catch((err) => {
  console.error("Prerender failed:", err);
  process.exit(1);
});
