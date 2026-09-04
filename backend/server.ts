import express from "express";
import path from "path";
import { spawn, spawnSync, execSync } from "child_process";
import proxy from "express-http-proxy";
import { createServer as createViteServer } from "vite";
import { authRouter, invitationsRouter } from "./server/auth";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON request bodies
  app.use(express.json());

  // Basic healthcheck route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "notify-app" });
  });

  // Dedicated real backend authentication & invitation endpoints
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/invitations", invitationsRouter);

  // 1. Run database seed if python3 is available
  try {
    const checkPython = spawnSync("python3", ["--version"], { stdio: "ignore" });
    if (checkPython.status === 0) {
      console.log("Seeding development database...");
      try {
        execSync("python3 -m backend.seed.development_seed", { stdio: "ignore" });
        console.log("Database seed completed successfully.");
      } catch (seedErr) {
        console.log("Database seed completed with warnings or skipped.");
      }
    }
  } catch (err) {
    console.log("Python environment check skipped.");
  }

  // 2. Spawn FastAPI backend if uvicorn is available
  let uvicornProcess: any = null;
  try {
    const checkUvicorn = spawnSync("python3", ["-c", "import uvicorn"], { stdio: "ignore" });
    if (checkUvicorn.status === 0) {
      console.log("Starting FastAPI backend server on port 8000...");
      uvicornProcess = spawn(
        "python3",
        ["-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"],
        { stdio: "inherit" }
      );

      uvicornProcess.on("error", (err: any) => {
        console.error("FastAPI backend error:", err);
      });

      const cleanup = () => {
        if (uvicornProcess) {
          try {
            uvicornProcess.kill();
          } catch (e) {}
        }
      };

      process.on("exit", cleanup);
      process.on("SIGINT", () => {
        cleanup();
        process.exit();
      });
      process.on("SIGTERM", () => {
        cleanup();
        process.exit();
      });
    } else {
      console.log("FastAPI backend not running in container; full client-side demo and mock system active.");
    }
  } catch (err) {
    console.log("FastAPI process initialization skipped.");
  }

  // 3. Proxy API requests if FastAPI backend is running
  if (uvicornProcess) {
    const proxyOptions = {
      proxyErrorHandler: (err: any, res: any, next: any) => {
        res.status(502).json({ error: "Backend proxy error", message: err.message });
      },
    };
    app.use("/api/v1", proxy("http://127.0.0.1:8000", {
      ...proxyOptions,
      proxyReqPathResolver: (req) => "/api/v1" + req.url,
    }));
    app.use("/docs", proxy("http://127.0.0.1:8000", {
      ...proxyOptions,
      proxyReqPathResolver: (req) => "/docs" + req.url,
    }));
    app.use("/openapi.json", proxy("http://127.0.0.1:8000", {
      ...proxyOptions,
      proxyReqPathResolver: (req) => "/openapi.json" + req.url,
    }));
  }

  // 4. Vite middleware for frontend development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: path.resolve(process.cwd(), "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Notify server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
