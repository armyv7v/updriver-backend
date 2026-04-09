// api/license/revalidate.ts - Revalida una licencia existente
import { z } from "zod";
import { revalidateLicense } from "./_lib/store.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const RevalidateSchema = z.object({
  licenseToken: z.string().min(1),
  installationId: z.string().uuid(),
  deviceFingerprint: z.string().length(64),
});

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = RevalidateSchema.parse(request.body);

    const result = await revalidateLicense({
      licenseToken: body.licenseToken,
      installationId: body.installationId,
      deviceFingerprint: body.deviceFingerprint,
    });

    if (!result.success) {
      return response.status(401).json({
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
    console.error("Revalidate error:", error);
    
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
