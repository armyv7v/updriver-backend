// api/index.js - Express server for local testing
import express from "express";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "updriver-license-secret-key-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "updriver-refresh-secret-key-change-in-production";

// In-memory store
const activationRequests = new Map();
const licenses = new Map();

// Helper: Generate challenge
function generateChallenge() {
  return uuidv4();
}

// POST /api/license/start
app.post("/api/license/start", async (req, res) => {
  try {
    const { licenseCode, installationId, deviceFingerprint, publicKeyPem, appVersion, platform } = req.body;
    
    // Validation
    if (!licenseCode || !installationId || !deviceFingerprint || !publicKeyPem) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    if (!licenseCode.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
      return res.status(400).json({
        error: "Invalid license code format. Expected XXXX-XXXX-XXXX-XXXX"
      });
    }
    
    if (deviceFingerprint.length !== 64) {
      return res.status(400).json({ error: "deviceFingerprint must be 64 chars (SHA-256 hex)" });
    }
    
    const challenge = generateChallenge();
    const activationId = uuidv4();
    
    activationRequests.set(activationId, {
      id: activationId,
      licenseCode,
      installationId,
      deviceFingerprint,
      publicKeyPem,
      appVersion: appVersion || "1.0.0",
      platform: platform || "android",
      challenge,
      createdAt: Date.now(),
    });
    
    res.json({
      activationId,
      challenge,
      licenseStatus: "PENDING_ACTIVATION"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/license/confirm
app.post("/api/license/confirm", async (req, res) => {
  try {
    const { activationId, signature, installationId } = req.body;
    
    if (!activationId || !signature || !installationId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const request = activationRequests.get(activationId);
    
    if (!request) {
      return res.status(400).json({ error: "Activation not found or expired" });
    }
    
    if (Date.now() - request.createdAt > 5 * 60 * 1000) {
      activationRequests.delete(activationId);
      return res.status(400).json({ error: "Activation expired" });
    }
    
    if (request.installationId !== installationId) {
      return res.status(400).json({ error: "Installation ID mismatch" });
    }
    
    const licenseId = uuidv4();
    const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
    
    const licenseToken = jwt.sign({
      sub: licenseId,
      installationId: request.installationId,
      deviceFingerprint: request.deviceFingerprint,
      plan: "premium",
      status: "active",
    }, JWT_SECRET, {
      expiresIn: "1y",
      jwtid: licenseId,
    });
    
    const refreshToken = jwt.sign({
      type: "refresh",
      licenseId,
    }, JWT_REFRESH_SECRET, {
      expiresIn: "395d", // ~13 months
    });
    
    licenses.set(licenseId, {
      id: licenseId,
      installationId: request.installationId,
      deviceFingerprint: request.deviceFingerprint,
      plan: "premium",
      createdAt: Date.now(),
      expiresAt,
    });
    
    activationRequests.delete(activationId);
    
    res.json({
      licenseToken,
      refreshToken,
      expiresAtEpochMs: expiresAt,
      plan: "premium",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/license/revalidate
app.post("/api/license/revalidate", async (req, res) => {
  try {
    const { licenseToken, installationId, deviceFingerprint } = req.body;
    
    if (!licenseToken || !installationId || !deviceFingerprint) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    try {
      const decoded = jwt.verify(licenseToken, JWT_SECRET);
      const licenseId = decoded.jti;
      const license = licenses.get(licenseId);
      
      if (!license) {
        return res.status(401).json({ error: "License not found" });
      }
      
      if (license.installationId !== installationId) {
        return res.status(401).json({ error: "Installation ID mismatch" });
      }
      
      if (license.deviceFingerprint !== deviceFingerprint) {
        return res.status(401).json({ error: "Device fingerprint mismatch" });
      }
      
      if (license.expiresAt < Date.now()) {
        return res.status(401).json({ error: "License expired" });
      }
      
      res.json({
        licenseToken,
        expiresAtEpochMs: license.expiresAt,
        plan: license.plan,
      });
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (error) {
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
