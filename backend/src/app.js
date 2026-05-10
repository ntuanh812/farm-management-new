import "dotenv/config";

import Fastify from "fastify";

import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";

import { fileURLToPath } from "url";
import path from "path";

// =========================================================
// ROUTES
// =========================================================
import authRoute from "./routes/auth.route.js";

import employeesRoute from "./routes/employees.route.js";

import accountsRoute from "./routes/accounts.route.js";

import vetDiagnosisRoute from "./routes/vetDiagnosis.route.js";

import pigReportsRoute from "./routes/pigReports.route.js";

import barnsRoute from "./routes/barns.route.js";

import pigsRoute from "./routes/pigs.route.js";

import movementsRoute from "./routes/movements.route.js";

// =========================================================
// APP
// =========================================================
const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

const app = Fastify({
  logger: true,
});

// =========================================================
// PLUGINS
// =========================================================

// CORS
await app.register(cors, {
  origin: true,
  credentials: true,
});

// JWT
await app.register(jwt, {
  secret: process.env.JWT_SECRET,
});

// FILE UPLOAD
await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// STATIC FILES
await app.register(staticFiles, {
  root: path.join(
    __dirname,
    "..",
    "uploads"
  ),

  prefix: "/uploads/",
});

// =========================================================
// ROUTES
// =========================================================

// AUTH
app.register(
  authRoute,
  {
    prefix: "/api/auth",
  }
);

// EMPLOYEES
app.register(
  employeesRoute,
  {
    prefix: "/api/employees",
  }
);

// ACCOUNTS
app.register(
  accountsRoute,
  {
    prefix: "/api/accounts",
  }
);

// VET
app.register(
  vetDiagnosisRoute,
  {
    prefix:
      "/api/vet-diagnosis",
  }
);

// REPORTS
app.register(
  pigReportsRoute,
  {
    prefix:
      "/api/pig-reports",
  }
);

// BARNS
app.register(
  barnsRoute,
  {
    prefix: "/api/barns",
  }
);

// PIGS
app.register(
  pigsRoute,
  {
    prefix: "/api/pigs",
  }
);

app.register(movementsRoute, {
  prefix: "/api/movements",
});

// =========================================================
// HEALTH CHECK
// =========================================================
app.get(
  "/api/health",

  async () => {

    return {
      status: "ok",
      server: "FarmPro Pig",
    };
  }
);

// =========================================================
// 404
// =========================================================
app.setNotFoundHandler(
  (request, reply) => {

    return reply.status(404).send({
      success: false,
      message:
        "API route not found",
    });
  }
);

// =========================================================
// ERROR HANDLER
// =========================================================
app.setErrorHandler(
  (
    error,
    request,
    reply
  ) => {

    console.error(error);

    return reply.status(
      error.statusCode || 500
    ).send({
      success: false,

      message:
        error.message ||
        "Internal Server Error",
    });
  }
);

// =========================================================
// START SERVER
// =========================================================
try {

  await app.listen({
    port:
      Number(
        process.env.PORT
      ) || 3000,

    host: "0.0.0.0",
  });

  console.log(`
=================================
 FARM PRO PIG SERVER RUNNING
=================================
 PORT: ${process.env.PORT || 3000}
=================================
  `);

} catch (err) {

  app.log.error(err);

  process.exit(1);
}