# Guía de Contenido — de demo a real

El seed instala contenido de demostración. Esta guía indica dónde sustituirlo
por tu contenido real. **Es el paso que más eleva el portafolio**: métricas
concretas, capturas reales y voz propia.

## Dónde vive cada cosa

| Contenido | Dónde cambiarlo |
|---|---|
| Perfil (bio, headline, enlaces) | Admin de Django (`profile`) o mutation `updateProfile` |
| Proyectos, skills, experiencia, certificaciones, educación, posts | Admin de Django (edición viva) o `backend-graphql/portfolio/management/commands/seed_demo.py` (canónico, versionado) |
| Foto profesional | Sube vía admin/`uploadImage` → `/media/`, o `frontend/public/` y URL en profile |
| CV | Sustituye `frontend/public/cv.pdf` |
| Textos fijos de la UI y fallback offline | `frontend/src/content/fallback.ts` (mantenlo sincronizado con el seed) |

## Acceso al admin de Django

Solo red interna. En dev:
```bash
docker compose exec graphql-api python manage.py shell   # o publica :8000 temporalmente
```
Credenciales: `ADMIN_USERNAME` / `ADMIN_PASSWORD` del `.env`, en `/django-admin/`.

## Recomendación: edita el seed, no solo el admin

El admin es cómodo pero efímero (vive en el volumen de Postgres). Editar
`seed_demo.py` deja tu contenido **versionado en git** y reproducible en
cualquier despliegue desde cero. Flujo sugerido:

1. Edita `seed_demo.py` con tu contenido real.
2. `docker compose exec graphql-api python manage.py seed_demo --refresh`
3. Actualiza `frontend/src/content/fallback.ts` con los mismos datos.
4. Commit.

## Qué escribir (anti-genérico)

- **Proyectos**: problema→solución→resultado con números ("de 40 min a 6 min",
  "p99 bajo 120 ms", "0 downtime en la migración"). Enlaces a repos reales.
- **Bio**: 1ª persona, opiniones técnicas propias, qué defiendes y por qué.
- **Posts**: experiencias vividas (incidentes, decisiones, trade-offs) valen
  más que tutoriales introductorios.
- **Skills**: sé honesto con niveles y años — la credibilidad se nota.
