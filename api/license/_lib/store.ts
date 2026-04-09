// api/license/_lib/store.ts - Lógica de negocio del licensing
import { SignJWT, jwtVerify } from "jose";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "updriver-license-secret-key-change-in-production"
);

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "updriver-refresh-secret-key-change-in-production"
);

// In-memory store (replace with database in production)
interface ActivationRequest {
  id: string;
  licenseCode: string;
  installationId: string;
  deviceFingerprint: string;
  publicKeyPem: string;
  appVersion: string;
  platform: string;
  challenge: string;
  createdAt: number;
}

interface License {
  id: string;
  installationId: string;
  deviceFingerprint: string;
  plan: string;
  createdAt: number;
  expiresAt: number;
}

const activationRequests = new Map<string, ActivationRequest>();
const licenses = new Map<string, License>();

// Genera un challenge aleatorio
export function generateChallenge(): string {
  return uuidv4();
}

// Almacena solicitud de activación
export async function storeActivationRequest(data: {
  licenseCode: string;
  installationId: string;
  deviceFingerprint: string;
  publicKeyPem: string;
  appVersion: string;
  platform: string;
  challenge: string;
}): Promise<string> {
  const activationId = uuidv4();
  
  activationRequests.set(activationId, {
    id: activationId,
    licenseCode: data.licenseCode,
    installationId: data.installationId,
    deviceFingerprint: data.deviceFingerprint,
    publicKeyPem: data.publicKeyPem,
    appVersion: data.appVersion,
    platform: data.platform,
    challenge: data.challenge,
    createdAt: Date.now(),
  });
  
  return activationId;
}

// Confirma la activación
export async function confirmActivation(data: {
  activationId: string;
  signature: string;
  installationId: string;
}): Promise<{ success: boolean; error?: string; licenseToken?: string; refreshToken?: string; expiresAtEpochMs?: number; plan?: string }> {
  const request = activationRequests.get(data.activationId);
  
  if (!request) {
    return { success: false, error: "Activation not found or expired" };
  }
  
  // Check expiry (5 minutes)
  if (Date.now() - request.createdAt > 5 * 60 * 1000) {
    activationRequests.delete(data.activationId);
    return { success: false, error: "Activation expired" };
  }
  
  // Verify installationId matches
  if (request.installationId !== data.installationId) {
    return { success: false, error: "Installation ID mismatch" };
  }
  
  // In production: verify the signature against the challenge with the stored public key
  // For now, we simulate success if signature is present
  if (!data.signature) {
    return { success: false, error: "Missing signature" };
  }
  
  // Generate license token
  const licenseId = uuidv4();
  const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
  
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
    .setExpirationTime(Math.floor((expiresAt + 30 * 24 * 60 * 60 * 1000) / 1000)) // 30 days more
    .sign(JWT_REFRESH_SECRET);
  
  // Store license
  licenses.set(licenseId, {
    id: licenseId,
    installationId: request.installationId,
    deviceFingerprint: request.deviceFingerprint,
    plan: "premium",
    createdAt: Date.now(),
    expiresAt,
  });
  
  // Clean up activation request
  activationRequests.delete(data.activationId);
  
  return {
    success: true,
    licenseToken,
    refreshToken,
    expiresAtEpochMs: expiresAt,
    plan: "premium",
  };
}

// Revalida una licencia existente
export async function revalidateLicense(data: {
  licenseToken: string;
  installationId: string;
  deviceFingerprint: string;
}): Promise<{ success: boolean; error?: string; licenseToken?: string; refreshToken?: string; expiresAtEpochMs?: number; plan?: string }> {
  try {
    const { payload } = await jwtVerify(data.licenseToken, JWT_SECRET);
    
    const licenseId = payload.jti as string;
    const license = licenses.get(licenseId);
    
    if (!license) {
      return { success: false, error: "License not found" };
    }
    
    // Verify bindings
    if (license.installationId !== data.installationId) {
      return { success: false, error: "Installation ID mismatch" };
    }
    
    if (license.deviceFingerprint !== data.deviceFingerprint) {
      return { success: false, error: "Device fingerprint mismatch" };
    }
    
    // Check expiry
    if (license.expiresAt < Date.now()) {
      return { success: false, error: "License expired" };
    }
    
    // Return current license (could refresh here if needed)
    return {
      success: true,
      licenseToken: data.licenseToken,
      expiresAtEpochMs: license.expiresAt,
      plan: license.plan,
    };
  } catch (error) {
    return { success: false, error: "Invalid or expired token" };
  }
}

// Get current license (for getCurrentLicense API)
export function getLicense(installationId: string): License | null {
  for (const license of licenses.values()) {
    if (license.installationId === installationId && license.expiresAt > Date.now()) {
      return license;
    }
  }
  return null;
}
