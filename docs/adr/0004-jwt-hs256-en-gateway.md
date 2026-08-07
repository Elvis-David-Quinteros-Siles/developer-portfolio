# ADR-0004: JWT HS256 con secreto compartido, validado en el gateway

**Estado:** Aceptada · **Fecha:** 2026-08-06

## Contexto
Las rutas de administración (mensajes de contacto, updateProfile, uploads)
requieren autenticación. Alternativas: sesión con cookies, OAuth2/OIDC externo,
JWT asimétrico (RS256), JWT simétrico (HS256).

## Decisión
JWT **HS256** con `JWT_SECRET` compartido vía entorno. El **gateway valida
firma y expiración** antes de reenviar `/api/v1/admin/*`; los backends
re-validan (defensa en profundidad, cada servicio debe ser seguro por sí solo).
Emisión: `POST /api/v1/auth/login` (go-api) y `adminLogin` (graphql-api),
credenciales admin por entorno. TTL 1 h, claims `sub`, `role=admin`, `iat`, `exp`.

## Consecuencias
- (+) Stateless, sin round-trip a DB por request; simple de operar.
- (+) Validación en el borde corta tráfico no autorizado antes de tocar backends.
- (−) Rotación de secreto requiere redeploy coordinado — aceptable para un
  sistema de un solo operador; la ruta de evolución (RS256/JWKS) queda aislada
  en el middleware de auth de cada servicio.
