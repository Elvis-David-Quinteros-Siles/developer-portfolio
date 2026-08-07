# ADR-0003: Django dueño único del esquema; Go como read side

**Estado:** Aceptada · **Fecha:** 2026-08-06

## Contexto
Dos backends comparten PostgreSQL. Dos sistemas de migraciones sobre las mismas
tablas (golang-migrate + Django ORM) crean conflictos de ownership, drift y
órdenes de despliegue frágiles.

## Decisión
- **Django ORM es el único dueño del esquema** (migraciones, constraints, índices).
- **go-api opera en solo lectura** sobre esas tablas vía repositorios (pgx).
- La única escritura originada en Go (contacto) se **delega a Django** mediante
  la mutation `submitContact` con token interno de servicio (CONTRACTS §6),
  materializando el flujo Cliente → Gateway → Go → Django → PostgreSQL.

Esto implementa **CQRS a nivel de sistema**: Django = write side + contenido,
Go = read side de alto rendimiento.

## Consecuencias
- (+) Un solo escritor por tabla: sin conflictos de esquema ni de consistencia.
- (+) La integración entre servicios es explícita y demostrable (requisito).
- (+) El arranque ordenado es trivial: go-api espera al health de graphql-api
  (que solo está healthy tras migrar).
- (−) Go depende de Django para el contacto: mitigado con timeout de 5 s y
  respuesta 503 explícita (fail fast, sin escritura fantasma).
