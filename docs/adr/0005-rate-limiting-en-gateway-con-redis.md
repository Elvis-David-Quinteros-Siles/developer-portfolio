# ADR-0005: Rate limiting centralizado en el gateway con Redis

**Estado:** Aceptada · **Fecha:** 2026-08-06

## Contexto
El formulario de contacto y las APIs públicas necesitan protección contra
abuso. Opciones: `limit_req` de Nginx (por proceso, no compartido), límites en
cada backend (duplicación), o límite centralizado con estado compartido.

## Decisión
**Ventana deslizante en Redis, implementada en el gateway** (patrón Strategy:
la política es intercambiable). Límites por IP configurables por entorno:
- global: `RATE_LIMIT_GLOBAL` (default 100 req/min)
- `/api/v1/contact` y `submitContact`: `RATE_LIMIT_CONTACT` (default 5 req/hora)

Respuesta al exceder: `429` RFC 7807 + `Retry-After`. Si Redis no está
disponible el gateway hace **fail-open** con log de advertencia (disponibilidad
sobre protección para un portafolio; la decisión inversa es un cambio de una
línea en la estrategia).

## Consecuencias
- (+) Estado compartido → el límite sobrevive a réplicas del gateway.
- (+) Backends libres de esa responsabilidad (SRP).
- (−) Dependencia del gateway sobre Redis: mitigada con fail-open.
