// api/license/confirm.ts - Confirma la activación con la firma del challenge
import { z } from "zod";
import { confirmActivation as confirmActivationFlow } from "./_lib/store.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const ConfirmActivationSchema = z.object({
  activationId: z.string().uuid(),
  signature: z.string().min(1), // Base64 encoded ECDSA signature
  installationId: z.string().uuid(),
});

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = ConfirmActivationSchema.parse(request.body);

    // Verify signature and confirm activation
    const result = await confirmActivationFlow({
      activationId: body.activationId,
      signature: body.signature,
      installationId: body.installationId,
    });

    if (!result.success) {
      return response.status(400).json({
        error: result.error,
      });
    }

    return response.status(200).json({
      licenseToken: result.licenseToken,
      refreshToken: result.refreshToken,
      expiresAtEpochMs: result.expiresAtEpochMs,
      plan: result.plan,
    });
  } catch (error) {
    console.error("Confirm activation error:", error);
    
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
