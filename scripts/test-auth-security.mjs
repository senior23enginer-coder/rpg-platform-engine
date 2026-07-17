import { readFileSync } from "node:fs";

const files = {
  app: readFileSync("src/App.tsx", "utf8"),
  auth: readFileSync("src/screens/AuthScreen.tsx", "utf8"),
  profile: readFileSync("src/types/profile.ts", "utf8"),
  storage: readFileSync("src/lib/appMetadataStorage.ts", "utf8"),
  security: readFileSync("src/lib/authSecurity.ts", "utf8"),
};

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(files.security.includes("PBKDF2"), "Falta derivacion PBKDF2 para passwords");
assert(files.security.includes("createPasswordHash"), "Falta createPasswordHash");
assert(files.security.includes("verifyPassword"), "Falta verifyPassword");
assert(files.auth.includes("verifyPassword(password"), "Login no valida contra hash");
assert(!files.auth.includes("password === loginAccount.password"), "Login compara password plano directamente");
assert(files.auth.includes("redactPasswordFields"), "Login no migra passwords legacy a hash");
assert(files.profile.includes("passwordHash?: string"), "Perfil no soporta passwordHash");
assert(files.profile.includes("blocked?: boolean"), "Perfil no soporta bloqueo de usuario");
assert(files.storage.includes("auditLog"), "Metadata no tiene auditLog");
assert(files.app.includes("trackAudit(\"auth.login\""), "Falta auditoria de login");
assert(files.app.includes("trackAudit(\"auth.logout\""), "Falta auditoria de logout");
assert(files.app.includes("trackAudit(\"admin.user.update\""), "Falta auditoria de cambios de usuarios");

console.log("Auth and security audit");
console.log("=======================");
console.log("Password hashing: PBKDF2");
console.log("Legacy migration: enabled");
console.log("Account blocking: model-ready");
console.log("Audit log: auth/admin events");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log("OK: seguridad base verificable.");
