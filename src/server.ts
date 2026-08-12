import "dotenv/config";
import { app } from "./app.js";
import { prisma } from "./lib/prisma.js";

const PORT = Number(process.env.PORT ?? 3000);
const STARTUP_GRACE_MS = 3000;

const startedAt = Date.now();
let isShuttingDown = false;

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function shutdown(signal: string): void {
  if (Date.now() - startedAt < STARTUP_GRACE_MS) {
    return;
  }

  if (isShuttingDown) {
    process.exit(1);
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}, shutting down gracefully...`);

  server.close(() => {
    prisma
      .$disconnect()
      .catch(() => undefined)
      .finally(() => {
        process.exit(0);
      });
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
