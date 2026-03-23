import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy API requests to Supabase to bypass adblockers
  app.use(
    "/api/supabase",
    createProxyMiddleware({
      target: "https://vxyahrkunsmywmfrwpxl.supabase.co",
      changeOrigin: true,
      pathRewrite: (path) => {
        let newPath = path.replace(/^\/api\/supabase/, "");
        newPath = newPath.replace(/\/rest\/v1\/ap_records/, "/rest/v1/agent_payments");
        return newPath;
      },
    })
  );

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
