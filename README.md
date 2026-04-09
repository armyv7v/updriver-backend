# UpDriver Backend

Backend serverless para el sistema de licenciamiento de UpDriver.

## Stack

- **Vercel** - Serverless functions
- **Node.js** - Runtime
- **JOSE** - JWT signing/verification
- **Zod** - Schema validation
- **UUID** - ID generation

## Estructura

```
updriver-backend/
├── api/
│   └── license/
│       ├── start.ts       # Iniciar activación
│       ├── confirm.ts     # Confirmar activación con firma
│       ├── revalidate.ts  # Revalidar licencia
│       └── _lib/
│           └── store.ts   # Lógica de negocio
├── vercel.json            # Config de Vercel
├── tsconfig.json
└── package.json
```

## Endpoints

### POST /api/license/start
Inicia el proceso de activación.

```json
{
  "licenseCode": "XXXX-XXXX-XXXX-XXXX",
  "installationId": "uuid",
  "deviceFingerprint": "sha256-hex",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----...",
  "appVersion": "1.0.0",
  "platform": "android"
}
```

Response:
```json
{
  "activationId": "uuid",
  "challenge": "random-challenge",
  "licenseStatus": "PENDING_ACTIVATION"
}
```

### POST /api/license/confirm
Confirma la activación con la firma del challenge.

```json
{
  "activationId": "uuid",
  "signature": "base64-signature",
  "installationId": "uuid"
}
```

### POST /api/license/revalidate
Revalida una licencia existente.

```json
{
  "licenseToken": "jwt-token",
  "installationId": "uuid",
  "deviceFingerprint": "sha256-hex"
}
```

## Variables de Entorno

- `JWT_SECRET` - Clave para firmar tokens de licencia
- `JWT_REFRESH_SECRET` - Clave para firmar refresh tokens

## Deploy

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Deploy a Vercel
npx vercel deploy
```

## Notas

- El store usa en memoria (en desarrollo). En producción, reemplazar con PostgreSQL/Redis.
- Los tokens JWT usan HS256 por simplicidad. En producción, usar RS256/ES256.
- La verificación de firma del challenge es simulada por ahora.
