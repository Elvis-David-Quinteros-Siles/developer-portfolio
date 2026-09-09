# GitOps: GitHub Actions + GHCR + k3s + Argo CD

Guía operativa del despliegue continuo. El `docker-compose.yml` sigue siendo el
entorno canónico de desarrollo (ADR-0006) y no se toca: lo que aquí se describe
es la ruta de **producción sobre k3s**.

---

## 1. El flujo

```
   git push (main)
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ GitHub Actions — .github/workflows/ci.yml                     │
│                                                               │
│  changes ──► ¿qué servicios cambiaron? (dorny/paths-filter)   │
│      │                                                        │
│      ▼                                                        │
│  build   ──► docker buildx (matriz, caché GHA)                │
│      │       push a GHCR con tag <sha> y latest               │
│      ▼                                                        │
│  deploy  ──► kustomize edit set image ...:<sha>  en k8s/      │
│              git commit -m "deploy: <sha>" && git push        │
└───────────────────────────────────────────────────────────────┘
        │
        │  (nuevo commit en main que solo toca k8s/)
        ▼
┌───────────────────────────────────────────────────────────────┐
│ Argo CD (namespace argocd) — Application "portfolio"          │
│   observa main:k8s/ · automated · prune · selfHeal            │
└───────────────────────────────────────────────────────────────┘
        │  kubectl apply equivalente
        ▼
┌───────────────────────────────────────────────────────────────┐
│ k3s (namespace portfolio)                                     │
│                                                               │
│   frontend      NodePort 30080 ──┐                            │
│   gateway       NodePort 30081 ──┤                            │
│   go-api        ClusterIP  8080  │  (solo interno)            │
│   graphql-api   ClusterIP  8000  │  (solo interno)            │
│   celery-worker sin Service      │                            │
└──────────────────────────────────┼────────────────────────────┘
                                   │
                   ┌───────────────┴────────────────┐
                   │ nginx externo (Docker, en el   │
                   │ host) → TLS + dominio          │
                   └───────────────┬────────────────┘
                                   ▼
                              Internet

   PostgreSQL y Redis siguen en Docker en el host, FUERA del clúster.
   Los pods los alcanzan por la IP del VPS (ver ConfigMap/Secret).
```

Dos propiedades que se ganan con esto:

- **GitHub nunca ve el kubeconfig y el clúster nunca ve un token de GitHub.**
  El CI solo escribe en el repositorio; Argo CD solo lee de él. No hay `kubectl`
  en el pipeline.
- **El estado desplegado es un commit.** Saber qué corre en producción es
  `git log -- k8s/`, y volver atrás es `git revert`.

### Mapa de nombres

| Carpeta / contexto de build | Deployment y Service | Puerto | Imagen GHCR                                |
|-----------------------------|----------------------|--------|--------------------------------------------|
| `frontend/`                 | `frontend`           | 8080   | `developer-portfolio-frontend`             |
| `gateway/`                  | `gateway`            | 8080   | `developer-portfolio-gateway`              |
| `backend-go/`               | `go-api`             | 8080   | `developer-portfolio-backend-go`           |
| `backend-graphql/`          | `graphql-api`        | 8000   | `developer-portfolio-backend-graphql`      |
| `backend-graphql/`          | `celery-worker`      | —      | `developer-portfolio-backend-graphql` (†)  |

(†) El worker **comparte imagen** con `graphql-api`: mismo Dockerfile, mismo
contexto, solo cambia el comando. Por eso el CI construye 4 imágenes y no 5, y
`k8s/kustomization.yaml` tiene 4 entradas en `images:`. Al avanzar el tag de
`backend-graphql`, API y worker avanzan juntos y no pueden desincronizarse.

Los Deployments se llaman `go-api` y `graphql-api` —no `backend-go` /
`backend-graphql`— porque ese nombre **es el DNS** que esperan por defecto el
gateway (`GO_API_URL`, `GRAPHQL_API_URL`) y que ya usaba el compose. Las
carpetas conservan el nombre del contexto de build.

---

## 2. Requisitos previos

- k3s instalado con Traefik deshabilitado (`--disable traefik`).
- Argo CD instalado en el namespace `argocd`.
- Los contenedores de **PostgreSQL y Redis** siguen corriendo en Docker en el
  VPS y **publican su puerto en el host** (`5432` y `6379`), aceptando
  conexiones desde la red de pods de k3s (`10.42.0.0/16`).

Sobre el `docker-compose.yml` actual, eso significa dejar solo los servicios de
datos y publicar sus puertos:

```bash
docker compose up -d postgres redis
# y añadir en un docker-compose.override.yml (sin tocar el archivo original):
#   services:
#     postgres: { ports: ["5432:5432"] }
#     redis:    { ports: ["6379:6379"] }
```

> **Cuidado:** publicar esos puertos los expone en todas las interfaces. Limita
> el bind a la IP privada (`"10.0.0.5:5432:5432"`) o cierra 5432/6379 en el
> firewall a todo lo que no sea la red de pods.

---

## 3. Secretos (una sola vez, a mano)

`k8s/secrets.yaml` **no está en el repositorio** (`.gitignore`) ni en
`resources:` del kustomization. Por eso Argo CD no lo gestiona, y `prune: true`
no lo borrará: prune solo elimina recursos que llevan la anotación de tracking
de Argo CD, y este no la tiene.

```bash
cp k8s/secrets.example.yaml k8s/secrets.yaml
# Edita k8s/secrets.yaml:
#   - sustituye 203.0.113.10 por la IP real del VPS
#   - genera secretos: openssl rand -hex 32
#   - reutiliza las MISMAS contraseñas de PostgreSQL y Redis que ya usa tu .env,
#     porque son los mismos contenedores.
kubectl create namespace portfolio --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/secrets.yaml
```

Para rotar un secreto más adelante: edita `k8s/secrets.yaml`, vuelve a aplicarlo
y reinicia los consumidores (las variables de entorno no se recargan solas):

```bash
kubectl -n portfolio rollout restart deploy/gateway deploy/go-api deploy/graphql-api deploy/celery-worker
```

Y ajusta también lo no sensible en `k8s/configmap.yaml` — sobre todo
`CORS_ORIGINS`, que debe ser tu dominio real (`https://tudominio.com`).

---

## 4. Primer despliegue

```bash
# 1) Validar los manifiestos en local (no necesita clúster)
kubectl kustomize k8s/

# 2) Publicar el trabajo: esto dispara el CI y crea las imágenes en GHCR
git add k8s/ argocd-app.yaml .github/workflows/ci.yml docs/gitops.md .gitignore README.md
git commit -m "feat(gitops): manifiestos k8s, Application de Argo CD y pipeline a GHCR"
git push origin main

# 3) Esperar a que el workflow "ci" termine en verde y haya hecho el commit
#    "deploy: <sha>". Comprueba que las 4 imágenes existen en:
#    https://github.com/Elvis-David-Quinteros-Siles?tab=packages

# 4) Hacer públicas las imágenes en GHCR (ver §6) o crear el imagePullSecret

# 5) Registrar la Application. A partir de aquí, nada más se aplica a mano.
kubectl apply -f argocd-app.yaml

# 6) Seguir la primera sincronización
kubectl -n portfolio get pods -w
```

El orden importa: si aplicas la Application antes de que existan las imágenes,
los pods entran en `ImagePullBackOff`. No es grave —Argo CD reintenta y se
recuperan solos en cuanto las imágenes están— pero es ruido evitable.

---

## 5. Operación diaria

### Desplegar

```bash
git push origin main
```

Eso es todo. El CI construye solo los servicios cuyos archivos cambiaron,
publica las imágenes y commitea los tags nuevos; Argo CD sincroniza en menos de
3 minutos (o al instante con `argocd app sync portfolio`).

Para forzar la reconstrucción de las cuatro imágenes sin cambiar código —por
ejemplo tras un CVE en `python:3.12-slim`— usa el disparo manual: pestaña
**Actions → ci → Run workflow**.

### Rollback

El despliegue es un commit, así que revertirlo es revertir el commit:

```bash
git log --oneline -- k8s/          # localiza el "deploy: <sha>" a deshacer
git revert --no-edit <commit-de-deploy>
git push origin main
```

El revert devuelve los tags anteriores a `k8s/kustomization.yaml`, Argo CD
sincroniza y k8s hace rollback a las imágenes viejas —que siguen en GHCR,
porque cada build publica con tag `<sha>` inmutable, no solo `latest`.

Ese revert solo toca `k8s/**`, así que **no dispara el CI**: no se reconstruye
nada, se reutilizan imágenes ya publicadas. Es un rollback en segundos.

Si necesitas parar la hemorragia *antes* de que llegue el revert:

```bash
kubectl -n portfolio rollout undo deploy/gateway
```

…pero recuerda que con `selfHeal: true` Argo CD lo revertirá a lo que diga el
repo en el siguiente ciclo. Es un parche de emergencia, no un arreglo.

### Ver estado

```bash
# Argo CD
argocd app get portfolio                  # Sync/Health y estado por recurso
argocd app history portfolio              # despliegues anteriores
argocd app sync portfolio                 # forzar sync sin esperar el polling
argocd app diff portfolio                 # qué difiere entre repo y clúster

# Kubernetes
kubectl -n portfolio get pods
kubectl -n portfolio get svc
kubectl -n portfolio logs -f deploy/gateway
kubectl -n portfolio describe pod <pod>   # motivo de un ImagePullBackOff
kubectl -n portfolio rollout status deploy/graphql-api

# Comprobación end-to-end desde el propio VPS
curl -s http://127.0.0.1:30081/healthz
curl -s -I http://127.0.0.1:30080/
```

Si `argocd` no está en el PATH del VPS, todo lo anterior tiene equivalente con
`kubectl -n argocd get application portfolio -o yaml`.

---

## 6. Imágenes de GHCR: públicas o `imagePullSecret`

Los paquetes de GHCR nacen **privados** aunque el repositorio sea público. Con
paquetes privados, k3s falla con `ImagePullBackOff` / `unauthorized`.

### Opción A — hacerlas públicas (recomendada aquí)

El repositorio ya es público y las imágenes no contienen secretos: publicarlas
elimina la necesidad de credenciales en el clúster. Por cada uno de los cuatro
paquetes:

1. `https://github.com/Elvis-David-Quinteros-Siles?tab=packages`
2. Entra en el paquete → **Package settings**
3. **Danger Zone → Change visibility → Public**

Hay que hacerlo una vez por paquete, la primera vez que se publica.

### Opción B — `imagePullSecret`

Si prefieres mantenerlas privadas, crea un PAT clásico con scope
`read:packages` y regístralo en el namespace:

```bash
kubectl -n portfolio create secret docker-registry ghcr-creds \
  --docker-server=ghcr.io \
  --docker-username=Elvis-David-Quinteros-Siles \
  --docker-password=<PAT_CON_read:packages> \
  --docker-email=dquinteros630@gmail.com
```

Y añade en el `spec.template.spec` de **cada** Deployment de `k8s/`:

```yaml
      imagePullSecrets:
        - name: ghcr-creds
```

Alternativa más limpia si eliges esta vía: en lugar de tocar los cinco
Deployments, parchea el ServiceAccount `default` del namespace una sola vez —
Kubernetes lo inyecta automáticamente en todos los pods:

```bash
kubectl -n portfolio patch serviceaccount default \
  -p '{"imagePullSecrets":[{"name":"ghcr-creds"}]}'
```

Ese secret, como `portfolio-secrets`, se crea a mano y queda fuera de Argo CD.

---

## 7. nginx externo: exponer el dominio hacia los NodePorts

El nginx del repositorio (`nginx/`) sigue viviendo en Docker y sigue siendo el
único punto de entrada público. Lo único que cambia es el destino de los
`proxy_pass`: antes eran los servicios del compose, ahora son los NodePorts.

**El detalle que rompe esto si se ignora:** dentro de un contenedor Docker,
`127.0.0.1` es el propio contenedor, no el host. Los NodePorts están en el
host. Hay que darle al contenedor una ruta hacia el host.

`docker-compose.override.yml` (archivo nuevo; no toca el `docker-compose.yml`
canónico):

```yaml
services:
  nginx:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

`nginx/conf.d/default.conf` (bloque a usar en el VPS):

```nginx
# Los servicios ya no viven en la red de Docker: están en k3s, detrás de los
# NodePorts del host. host.docker.internal se resuelve gracias a extra_hosts.
upstream frontend_up { server host.docker.internal:30080; keepalive 16; }
upstream gateway_up  { server host.docker.internal:30081; keepalive 16; }

server {
    listen 80;
    listen [::]:80;
    server_name tudominio.com www.tudominio.com;
    http2 on;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # X-Forwarded-For es OBLIGATORIO: el NodePort hace SNAT y el gateway vería
    # todas las peticiones viniendo de la misma IP, con lo que el rate limiting
    # por IP (ADR-0005) pasaría a ser un límite global. El gateway toma el
    # primer salto de esta cabecera como IP del cliente.
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-ID $request_id;
    proxy_http_version 1.1;
    proxy_set_header Connection "";

    location = /nginx-health {
        access_log off;
        return 200 "ok\n";
    }

    # API, GraphQL y media → gateway (NodePort 30081)
    location /api/ {
        proxy_pass http://gateway_up;
        proxy_read_timeout 30s;
    }

    location = /graphql {
        proxy_pass http://gateway_up;
        proxy_read_timeout 30s;
    }

    location /media/ {
        proxy_pass http://gateway_up;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # Todo lo demás → SPA (NodePort 30080)
    location / {
        proxy_pass http://frontend_up;
    }
}
```

Por qué el enrutado tiene que ser exactamente ese: el nginx **interno del pod
frontend** solo sirve archivos estáticos con fallback a `index.html`; no hace
proxy de `/api`. La SPA llama rutas relativas (`/api`, `/graphql`, `/media`), y
es este nginx externo quien decide qué va a la SPA y qué va al gateway. Si le
mandas `/api/` al frontend, obtendrás el `index.html` con un 200 en vez de
JSON.

Como consecuencia agradable, el navegador nunca ve el puerto del gateway: todo
es el mismo origen y no hay CORS cross-site que resolver. Aun así, mantén
`CORS_ORIGINS` en `k8s/configmap.yaml` apuntando a tu dominio real.

Cierra 30080 y 30081 al exterior en el firewall — solo nginx debe alcanzarlos:

```bash
sudo ufw deny 30080/tcp
sudo ufw deny 30081/tcp
```

### TLS

Termina TLS en este mismo nginx (certbot con el volumen de certificados
montado, o Caddy delante). Nada de esto afecta al clúster: los NodePorts son
HTTP plano dentro del host.

---

## 8. Repositorio privado en Argo CD

El repositorio es público, así que Argo CD clona sin credenciales. Si algún día
pasa a privado, hay que registrarlo **antes** de aplicar `argocd-app.yaml`:

```bash
# Con la CLI (necesita PAT con scope repo)
argocd repo add https://github.com/Elvis-David-Quinteros-Siles/developer-portfolio.git \
  --username Elvis-David-Quinteros-Siles \
  --password <PAT_CON_SCOPE_repo>

argocd repo list    # debe aparecer con Status "Successful"
```

Equivalente declarativo, sin la CLI (el Secret debe llevar la etiqueta
`argocd.argoproj.io/secret-type: repository` para que Argo CD lo descubra):

```bash
kubectl -n argocd create secret generic repo-portfolio \
  --from-literal=type=git \
  --from-literal=url=https://github.com/Elvis-David-Quinteros-Siles/developer-portfolio.git \
  --from-literal=username=Elvis-David-Quinteros-Siles \
  --from-literal=password=<PAT_CON_SCOPE_repo>

kubectl -n argocd label secret repo-portfolio \
  argocd.argoproj.io/secret-type=repository
```

Con el repo privado, además, las imágenes de GHCR también lo serán: hará falta
el `imagePullSecret` de la §6, opción B.

---

## 9. Decisiones y sus motivos

| Decisión | Por qué |
|---|---|
| Tag `<sha>` y no `latest` en los manifiestos | `latest` es mutable: dos pods podrían correr código distinto, y no habría rollback posible. El `<sha>` hace que "qué está desplegado" tenga una respuesta exacta. |
| El CI commitea, no despliega | GitHub nunca necesita credenciales del clúster. Reduce la superficie a un repositorio. |
| `paths-ignore: k8s/**` | El commit `deploy:` solo toca `k8s/`, así que no se re-dispara el CI. Segunda defensa: un push con `GITHUB_TOKEN` no dispara workflows. |
| `concurrency` sin `cancel-in-progress` | Dos ejecuciones a la vez pisarían el push en `k8s/`. Cancelar a media asta dejaría imágenes publicadas sin su commit de tag. |
| `selfHeal: true` | Un `kubectl edit` en caliente se revierte solo. El repo es la única fuente de verdad; si no, GitOps es decorativo. |
| `prune: true` | Borrar un manifiesto del repo lo borra del clúster. Sin esto quedarían recursos huérfanos que nadie recuerda. |
| `runAsUser` numérico explícito | `gateway` y `graphql-api` declaran su `USER` por nombre (`nonroot`, `app`). Con `runAsNonRoot: true` y sin UID numérico, el kubelet rechaza el contenedor: *"image has non-numeric user, cannot verify user is non-root"*. Los UID reales son 65532 (distroless), 100:101 (Django) y 101 (nginx-unprivileged). |
| Probes por HTTP y no `exec` | `gateway` y `go-api` son distroless: no tienen shell. Sus endpoints `/healthz` y `/readyz` ya existían para el compose. |
| Cabecera `Host` forzada en las probes de Django | El kubelet usa la IP del pod como `Host` y `ALLOWED_HOSTS` la rechazaría con 400. Preferible a abrir `ALLOWED_HOSTS` a `*`. |
| `strategy: Recreate` en `graphql-api` y `celery-worker` | El entrypoint migra en cada arranque (no deben solaparse dos instancias) y el PVC de media es `ReadWriteOnce`. |
| Sin `depends_on` equivalente | Las readiness probes lo sustituyen: el pool de PostgreSQL de `go-api` es perezoso, así que el pod arranca y espera en `NotReady` en vez de entrar en CrashLoop. |

---

## 10. Problemas frecuentes

| Síntoma | Causa habitual |
|---|---|
| `ImagePullBackOff` | Paquete de GHCR aún privado (§6) o el CI todavía no ha publicado el tag. `kubectl -n portfolio describe pod <pod>` lo confirma. |
| `graphql-api` responde 400 a todo | Falta el host en `DJANGO_ALLOWED_HOSTS` del ConfigMap. |
| Pods en `CreateContainerConfigError` | El Secret `portfolio-secrets` no existe todavía en el namespace (§3). |
| `go-api` y `gateway` `NotReady` para siempre | Los pods no alcanzan PostgreSQL/Redis en el VPS: puerto no publicado, bind solo a `127.0.0.1`, o firewall bloqueando `10.42.0.0/16`. |
| El rate limiting corta a todos a la vez | Falta `X-Forwarded-For` en el nginx externo: el SNAT del NodePort hace que el gateway vea una sola IP (§7). |
| La Application queda `OutOfSync` sin que nadie tocara nada | Alguien editó con `kubectl` y `selfHeal` está corrigiendo. `argocd app diff portfolio` muestra qué. |
| El CI se dispara en bucle | Un commit del job `deploy` tocó archivos fuera de `k8s/`. Revisa `paths-ignore`. |
| `/api/` devuelve el HTML de la SPA | El nginx externo enruta `/api/` al NodePort 30080 en vez del 30081 (§7). |
