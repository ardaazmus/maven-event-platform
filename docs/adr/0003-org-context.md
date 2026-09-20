# ADR-0003 Explicit organization context

- Sorun: `src/lib/auth.ts` `getSessionFromRequest` ilk aktif üyeliği sessiz seçer (`orderBy joinedAt asc`). Çok üyelikte yanlış bağlam riski (ISS-013).
- Karar: tek şirket modunda bile session + explicit `organizationId/workspaceId` claim gerekir; seçim kullanıcı tarafından yapılır, sessiz fallback kalkar.
- Kural: wrong-org kaynak isteği bilgi sızdırmayan 404 verir; yetki kontrolü capability ile birleşir.
- Uygulama (F1-21): `x-workspace-id` claim header'ı; tek üyelikte claimsiz çalışır, çok üyelikte claimsiz/yanlış claim 401; wrong-org kaynak 404 (kaynak katmanı).
