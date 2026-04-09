// api/license/start.ts - Inicia el proceso de activación
import { z } from "zod";
import { generateChallenge, storeActivationRequest } from "./_lib/store.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const StartActivationSchema = z.object({
  licenseCode: z.string().min(1),
  installationId: z.string().uuid(),
  deviceFingerprint: z.string().length(64), // SHA-256 hex
  publicKeyPem: z.string(),
  appVersion: z.string(),
  platform: z.string().default("android"),
});

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = StartActivationSchema.parse(request.body);

    // Validate license code format
    if (!body.licenseCode.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
      return response.status(400).json({
        error: "Invalid license code format. Expected XXXX-XXXX-XXXX-XXXX",
      });
    }

    // Generate challenge
    const challenge = generateChallenge();

    // Store activation request (in-memory for now, replace with DB later)
    const activationId = await storeActivationRequest({
      licenseCode: body.licenseCode,
      installationId: body.installationId,
      deviceFingerprint: body.deviceFingerprint,
      publicKeyPem: body.publicKeyPem,
      appVersion: body.appVersion,
      platform: body.platform,
      challenge,
    });

    return response.status(200).json({
      activationId,
      challenge,
      licenseStatus: "PENDING_ACTIVATION",
    });
  } catch (error) {
    console.error("Start activation error:", error);
    
    if (error instanceof z.ZodError) {
      return response.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }

    return response.status(500).json({
      error: "Internal server error",
    });
  }
}
