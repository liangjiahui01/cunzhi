#!/usr/bin/env node
import { HttpServer } from "./http-server";

const HTTP_PORT = 19528;

async function main() {
  const server = new HttpServer(HTTP_PORT);
  
  await server.start();
  console.log(`WaitMe HTTP Server running on http://127.0.0.1:${HTTP_PORT}`);
  console.log("Press Ctrl+C to stop");

  const cleanup = () => {
    console.log("\nShutting down...");
    server.stop();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
