# ADR-0006: Docker Compose canónico, diseño portable a Kubernetes

**Estado:** Aceptada · **Fecha:** 2026-08-06

## Contexto
El entorno objetivo inmediato es un único host con Docker; el requisito pide
estar "preparado para Kubernetes" sin operarlo aún.

## Decisión
Compose es el entorno canónico de desarrollo y despliegue, pero **cada decisión
de diseño se toma como si el destino fuera Kubernetes**:
stateless total, configuración 12-factor por entorno, health checks
liveness/readiness en todos los servicios, imágenes multi-stage mínimas
(distroless/alpine) corriendo como usuario no-root, redes segmentadas
(edge/internal/data) que mapean 1:1 a NetworkPolicies, y un único punto de
entrada publicado.

Mapa de migración: servicios → Deployments; postgres/redis → StatefulSet u
servicios gestionados; nginx → Ingress; `.env` → ConfigMap/Secret;
`depends_on` → initContainers/probes.

## Consecuencias
- (+) Cero re-arquitectura al migrar; solo traducción de manifiestos.
- (+) Compose queda simple y reproducible (`docker compose up -d`).
- (−) No se mantienen manifiestos K8s todavía (YAGNI): se documenta el mapa.
