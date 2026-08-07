# ADR-0001: Microservicios con API Gateway propio en Go

**Estado:** Aceptada · **Fecha:** 2026-08-06

## Contexto
El sistema debe demostrar arquitectura distribuida real. Nginx ya actúa como
reverse proxy; cabía preguntarse si un gateway adicional es redundante.

## Decisión
Mantener **dos capas con responsabilidades distintas**:
- **Nginx (edge):** terminación de conexión, compresión, caché de estáticos,
  HTTP/2, cabeceras de seguridad. Configuración declarativa, cero lógica.
- **Gateway (Go):** lógica programable transversal — rate limiting con Redis,
  validación JWT para rutas admin, generación/propagación de `X-Request-ID`,
  CORS dinámico por entorno, logging estructurado por request.

## Consecuencias
- (+) Separación limpia infraestructura/aplicación; el gateway sobrevive
  intacto a una migración a Kubernetes (Nginx → Ingress).
- (+) Un solo lugar para políticas cross-cutting; los backends quedan simples.
- (−) Un salto de red extra (~sub-ms en red interna de Docker): aceptable.
