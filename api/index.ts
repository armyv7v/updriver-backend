// api/index.ts - Express server for local testing
import express from "express";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "updriver-license-secret-key-change-in-production"
);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "updriver-refresh-secret-key-change-in-production"
);

// In-memory store
const activationRequests = new Map<string, any>();
const licenses = new Map<string, any>();

// Helper: Generate challenge
function generateChallenge(): string {
  return uuidv4();
}

// POST /api/license/start
const StartSchema = z.object({
  licenseCode: z.string().min(1),
  installationId: z.string().uuid(),
  deviceFingerprint: z.string().length(64),
  publicKeyPem: z.string(),
  appVersion: z.string(),
  platform: z.string().default("android"),
});

app.post("/api/license/start", async (req, res) => {
  try {
    const body = StartSchema.parse(req.body);
    
    if (!body.licenseCode.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
      return res.status(400).json({
        error: "Invalid license code format. Expected XXXX-XXXX-XXXX-XXXX"
      });
    }
    
    const challenge = generateChallenge();
    const activationId = uuidv4();
    
    activationRequests.set(activationId, {
      id: activationId,
      licenseCode: body.licenseCode,
      installationId: body.installationId,
      deviceFingerprint: body.deviceFingerprint,
      publicKeyPem: body.publicKeyPem,
      appVersion: body.appVersion,
      platform: body.platform,
      challenge,
      createdAt: Date.now(),
    });
    
    res.json({
      activationId,
      challenge,
      licenseStatus: "PENDING_ACTIVATION"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/license/confirm
const ConfirmSchema = z.object({
  activationId: z.string().uuid(),
  signature: z.string().min(1),
  installationId: z.string().uuid(),
});

app.post("/api/license/confirm", async (req, res) => {
  try {
    const body = ConfirmSchema.parse(req.body);
    const request = activationRequests.get(body.activationId);
    
    if (!request) {
      return res.status(400).json({ error: "Activation not found or expired" });
    }
    
    if (Date.now() - request.createdAt > 5 * 60 * 1000) {
      activationRequests.delete(body.activationId);
      return res.status(400).json({ error: "Activation expired" });
    }
    
    if (request.installationId !== body.installationId) {
      return res.status(400).json({ error: "Installation ID mismatch" });
    }
    
    const licenseId = uuidv4();
    const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
    
    const licenseToken = await new SignJWT({
      sub: licenseId,
      installationId: request.installationId,
      deviceFingerprint: request.deviceFingerprint,
      plan: "premium",
      status: "active",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(Math.floor(Date.now() / 1000))
      .setExpirationTime(Math.floor(expiresAt / 1000))
      .setJti(licenseId)
      .sign(JWT_SECRET);
    
    const refreshToken = await new SignJWT({
      type: "refresh",
      licenseId,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(Math.floor(Date.now() / 1000))
      .setExpirationTime(Math.floor((expiresAt + 30 * 24 * 60 * 60 * 1000) / 1000))
      .sign(JWT_REFRESH_SECRET);
    
    licenses.set(licenseId, {
      id: licenseId,
      installationId: request.installationId,
      deviceFingerprint: request.deviceFingerprint,
      plan: "premium",
      createdAt: Date.now(),
      expiresAt,
    });
    
    activationRequests.delete(body.activationId);
    
    res.json({
      licenseToken,
      refreshToken,
      expiresAtEpochMs: expiresAt,
      plan: "premium",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/license/revalidate
const RevalidateSchema = z.object({
  licenseToken: z.string().min(1),
  installationId: z.string().uuid(),
  deviceFingerprint: z.string().length(64),
});

app.post("/api/license/revalidate", async (req, res) => {
  try {
    const body = RevalidateSchema.parse(req.body);
    
    try {
      const { payload } = await jwtVerify(body.licenseToken, JWT_SECRET);
      const licenseId = payload.jti as string;
      const license = licenses.get(licenseId);
      
      if (!license) {
        return res.status(401).json({ error: "License not found" });
      }
      
      if (license.installationId !== body.installationId) {
        return res.status(401).json({ error: "Installation ID mismatch" });
      }
      
      if (license.deviceFingerprint !== body.deviceFingerprint) {
        return res.status(401).json({ error: "Device fingerprint mismatch" });
      }
      
      if (license.expiresAt < Date.now()) {
        return res.status(401).json({ error: "License expired" });
      }
      
      res.json({
        licenseToken: body.licenseToken,
        expiresAtEpochMs: license.expiresAt,
        plan: license.plan,
      });
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 UpDriver Backend running on http://localhost:${PORT}`);
  console.log(`   POST /api/license/start`);
  console.log(`   POST /api/license/confirm`);
  console.log(`   POST /api/license/revalidate`);
});
