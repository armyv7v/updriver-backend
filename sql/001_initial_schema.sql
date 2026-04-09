-- Crear tabla de usuarios (usuarios finales que compran licencias)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'basic' CHECK (plan IN ('basic', 'premium', 'enterprise')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de códigos de licencia (generados por admin)
CREATE TABLE IF NOT EXISTS license_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(19) UNIQUE NOT NULL, -- XXXX-XXXX-XXXX-XXXX
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generated_by VARCHAR(255) NOT NULL, -- email del admin que lo generó
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  installation_id UUID NULL, -- el device que lo usó
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de licencias activas
CREATE TABLE IF NOT EXISTS active_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_code_id UUID NOT NULL REFERENCES license_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  installation_id UUID NOT NULL,
  device_fingerprint VARCHAR(64) NOT NULL,
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de admins (usuarios que gestionan licencias)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de auditoría (rastrear cambios)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- 'create_user', 'generate_license', 'revoke_license', etc.
  entity_type VARCHAR(50) NOT NULL, -- 'user', 'license_code', 'admin', etc.
  entity_id UUID,
  changes JSONB, -- antes y después
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar queries
CREATE INDEX IF NOT EXISTS idx_license_codes_user_id ON license_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_license_codes_code ON license_codes(code);
CREATE INDEX IF NOT EXISTS idx_license_codes_status ON license_codes(status);
CREATE INDEX IF NOT EXISTS idx_active_licenses_user_id ON active_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_active_licenses_installation_id ON active_licenses(installation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Crear vistas útiles
CREATE OR REPLACE VIEW user_license_summary AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.plan,
  u.status,
  COUNT(lc.id) as total_codes_generated,
  COUNT(CASE WHEN lc.status = 'active' THEN 1 END) as active_licenses,
  COUNT(CASE WHEN lc.expires_at > NOW() THEN 1 END) as valid_licenses,
  MAX(lc.created_at) as last_license_generated
FROM users u
LEFT JOIN license_codes lc ON u.id = lc.user_id
GROUP BY u.id, u.email, u.name, u.plan, u.status;
