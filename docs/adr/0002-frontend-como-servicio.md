# ADR-0002: Frontend SPA como servicio propio

**Estado:** Aceptada · **Fecha:** 2026-08-06

## Contexto
El bundle estático podría servirse desde el propio Nginx edge, ahorrando un
contenedor.

## Decisión
El frontend es un servicio independiente: multi-stage build (node:22 → nginx
sin privilegios en :8080) con su propio health check. El edge solo hace proxy.

## Consecuencias
- (+) Despliegue y rollback del frontend independiente del edge y los backends.
- (+) La imagen es autocontenida → portable a cualquier orquestador o CDN.
- (+) El edge queda sin conocimiento del artefacto (desacoplamiento real).
- (−) Un contenedor más; coste marginal (~10 MB imagen, ~5 MB RAM).
