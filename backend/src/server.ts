import { buildApp } from "./app/app.js";
import { loadEnvironment } from "./config/environment.js";

const environment = loadEnvironment(process.env);
const app = await buildApp({ environment });

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  app.log.info({ signal }, "shutdown signal received");
  await app.close();
};

process.once("SIGINT", (signal) => {
  void shutdown(signal);
});

process.once("SIGTERM", (signal) => {
  void shutdown(signal);
});

try {
  await app.listen({
    host: environment.BACKEND_HOST,
    port: environment.BACKEND_PORT,
  });
} catch (error) {
  app.log.fatal({ error }, "backend startup failed");
  process.exit(1);
}
