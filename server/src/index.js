const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { PrismaClient } = require("@prisma/client");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const port = Number(process.env.PORT || 3014);
const jwtSecret = process.env.JWT_SECRET;
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, "../uploads");
const debugMode = process.env.DEBUG_MODE === "true";

if (!process.env.DATABASE_URL || !jwtSecret) {
  throw new Error("DATABASE_URL y JWT_SECRET son obligatorios.");
}

fs.mkdirSync(uploadDir, { recursive: true });

const prisma = new PrismaClient();
const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "3mb" }));

function sendError(response, status, message) {
  response.status(status).json({ error: message });
}

function authenticate(request, response, next) {
  const header = request.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    request.admin = jwt.verify(token, jwtSecret);
    next();
  } catch {
    sendError(response, 401, "La sesión venció. Volvé a ingresar.");
  }
}

function validateContent(content) {
  if (!content || typeof content !== "object") return false;
  if (!content.company || !content.history) return false;
  if (!Array.isArray(content.categories) || !Array.isArray(content.projects)) return false;
  return Buffer.byteLength(JSON.stringify(content), "utf8") <= 2 * 1024 * 1024;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Esperá unos minutos antes de volver a intentar." }
});

const allowedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"]
]);

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadDir),
  filename: (_request, file, callback) => {
    const extension = allowedTypes.get(file.mimetype);
    callback(null, `${Date.now()}-${crypto.randomUUID()}.${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      callback(new Error("Tipo de archivo no permitido."));
      return;
    }
    callback(null, true);
  }
});

app.get("/health", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ ok: true, service: "mapale-api" });
  } catch {
    sendError(response, 503, "Base de datos no disponible.");
  }
});

app.get("/api/content", async (_request, response) => {
  const record = await prisma.siteContent.findUnique({ where: { id: "main" } });
  if (!record) {
    sendError(response, 404, "El contenido todavía no fue inicializado.");
    return;
  }
  response.set("Cache-Control", "no-store");
  response.json(record.data);
});

app.get("/api/config", (_request, response) => {
  response.set("Cache-Control", "no-store");
  response.json({
    debug: debugMode,
    adminUsername: debugMode ? String(process.env.ADMIN_USERNAME || "") : ""
  });
});

app.post("/api/admin/login", loginLimiter, async (request, response) => {
  const username = String(request.body?.username || "").trim();
  const password = String(request.body?.password || "");
  const admin = username ? await prisma.adminUser.findUnique({ where: { username } }) : null;
  const valid = admin ? await bcrypt.compare(password, admin.passwordHash) : false;

  if (!valid) {
    sendError(response, 401, "Usuario o contraseña incorrectos.");
    return;
  }

  const token = jwt.sign({ sub: admin.id, username: admin.username }, jwtSecret, { expiresIn: "8h" });
  response.json({ token, username: admin.username });
});

app.get("/api/admin/content", authenticate, async (_request, response) => {
  const record = await prisma.siteContent.findUnique({ where: { id: "main" } });
  if (!record) {
    sendError(response, 404, "El contenido todavía no fue inicializado.");
    return;
  }
  response.set("Cache-Control", "no-store");
  response.json({ content: record.data, version: record.version, updatedAt: record.updatedAt });
});

app.put("/api/admin/content", authenticate, async (request, response) => {
  const expectedVersion = Number(request.body?.version);
  const content = request.body?.content;

  if (!Number.isInteger(expectedVersion) || !validateContent(content)) {
    sendError(response, 400, "El contenido enviado no es válido.");
    return;
  }

  const update = await prisma.siteContent.updateMany({
    where: { id: "main", version: expectedVersion },
    data: { data: content, version: { increment: 1 } }
  });

  if (!update.count) {
    sendError(response, 409, "El contenido cambió desde que abriste el panel. Recargá antes de publicar.");
    return;
  }

  const saved = await prisma.siteContent.findUnique({ where: { id: "main" } });
  response.json({ version: saved.version, updatedAt: saved.updatedAt });
});

app.post("/api/admin/assets", authenticate, (request, response) => {
  upload.single("file")(request, response, (error) => {
    if (error) {
      sendError(response, 400, error.message || "No se pudo subir el archivo.");
      return;
    }
    if (!request.file) {
      sendError(response, 400, "Elegí un archivo para subir.");
      return;
    }
    response.status(201).json({ path: `/uploads/${request.file.filename}` });
  });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  sendError(response, 500, "Ocurrió un error interno.");
});

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Mapale API listening on 127.0.0.1:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
