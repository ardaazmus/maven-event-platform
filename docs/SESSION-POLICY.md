# Session Policy — MavenForms (M01.6)

**Karar:** Bearer/localStorage + httpOnly cookie fallback korunuyor. Neden: CLOUD-DEBUG-HANDOFF.md §3.2 preview/proxy ortamlarında cookie-only akışın güvenilir olmadığı kanıtlandı; Bearer primary olarak bilinçli seçildi.

**Risk kabulü (geçici):**
- Token JS erişimli → XSS durumunda çalınabilir. Telafi: CSP, output encoding, dependency audit, kısa expiry planlandı.
- Mevcut süre: 30 gün (`SESSION_DURATION` in `src/lib/auth.ts:8`) — pilot için tolere edildi, production için 1 saat + refresh rotation hedef.
- Cookie: `httpOnly:true, secure:(NODE_ENV === production), sameSite:lax` — yalnız local development HTTP istisnasında Secure kapalıdır; production'da `secure:true` zorunludur (`src/lib/auth.ts`).
- HSTS: production response'larında `Strict-Transport-Security: max-age=31536000; includeSubDomains` set edilir (`src/middleware.ts`). Production deployment yine HTTPS/TLS sonlandırması, doğru host/proxy yönlendirmesi ve sertifika yenilemesi ile doğrulanmalıdır; localhost HTTP bu kapının dışındadır.

**Kontroller kanıtlandı (2026-09-01, localhost:3000):**
- `POST /api/auth/login` → 200 + `data.token` (64 hex) + `Set-Cookie: mavenforms_session` (httpOnly)
- `GET /api/auth/me` Bearer → 200, anon → 401, expired → 401 (DB `expiresAt` kontrolü)
- `POST /api/auth/logout` → `Set-Cookie` silinir + `db.session.deleteMany`
- `GET /api/public/forms/:slug` → 200, `Set-Cookie` yok, `data` içinde token/cookie/workspaceId yok (M01.1 DTO)
- Public browser `localStorage` ve `document.cookie` içinde `mavenforms_session` httpOnly olduğundan JS göremez; Bearer token sadece login sonrası `localStorage["mavenforms_token"]` içinde (XSS riski bilinçli).

**Geçiş planı (kalıcı):** HttpOnly Secure SameSite=Strict cookie + CSRF double-submit, Bearer kaldırılacak. MFA ve refresh replay koruması M01.6 sonrası.

**Test:** `tests/policy.test.mjs`, `tests/public-forbidden.test.mjs`, manuel smoke yukarıda.
