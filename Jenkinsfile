// =============================================================================
// CI/CD del stack de Docker Compose.
//
// El pipeline construye, verifica, publica y despliega el MISMO artefacto: las
// imágenes que pasan el smoke test son exactamente las que llegan al servidor,
// etiquetadas con el SHA del commit. El servidor no compila nada.
//
// Requisitos del agente (Linux): Docker Engine con Compose v2.24+, git y sh.
// No hace falta Node ni Go instalados: la calidad se verifica dentro de los
// Dockerfiles (stages `test` en Go, `lint` en el frontend).
//
// Credenciales esperadas en Jenkins:
//   portfolio-registry    Username/Password  → login al registry de imágenes
//   portfolio-deploy-key  SSH private key    → solo si DEPLOY_TARGET no es local
//
// Los secretos de producción NO pasan por Jenkins: viven en el `.env` del
// servidor, gestionado fuera de banda. El pipeline genera su propio `.env`
// efímero con valores aleatorios para el smoke test.
//
// El job debe ser "Pipeline script from SCM" para que el checkout sea implícito.
// =============================================================================

pipeline {
    agent any

    options {
        timestamps()
        // Dos builds a la vez competirían por el daemon de Docker y por el
        // despliegue. El segundo espera.
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '30'))
    }

    parameters {
        string(
            name: 'REGISTRY',
            defaultValue: 'ghcr.io/elvis-david-quinteros-siles',
            description: 'Registry y namespace donde se publican las imágenes (en minúsculas: GHCR rechaza mayúsculas).'
        )
        string(
            name: 'DEPLOY_TARGET',
            defaultValue: 'local',
            description: '"local" si Jenkins corre en el propio servidor; si no, usuario@host para desplegar por SSH.'
        )
        string(
            name: 'PROJECT_DIR',
            defaultValue: '/opt/portfolio',
            description: 'Ruta del checkout del repositorio en el servidor.'
        )
        booleanParam(
            name: 'PUSH_IMAGES',
            defaultValue: true,
            description: 'Publicar las imágenes en el registry (solo tiene efecto en main).'
        )
        booleanParam(
            name: 'DEPLOY',
            defaultValue: true,
            description: 'Desplegar en el servidor tras publicar (solo tiene efecto en main).'
        )
    }

    environment {
        IMAGE_PREFIX = 'portfolio'
        // Proyecto de compose aislado por build: el stack de CI no puede tocar
        // el de producción aunque compartan el host. Se pasa con -p en cada
        // comando, sin depender de la precedencia sobre el `name:` del archivo.
        COMPOSE_PROJECT_NAME = "portfolio-ci-${env.BUILD_NUMBER}"
        // Servicios con imagen propia. celery-worker no está en la lista:
        // reutiliza la de graphql-api (mismo contexto de build).
        SERVICES = 'nginx frontend gateway go-api graphql-api'
        REGISTRY_CREDENTIALS_ID = 'portfolio-registry'
        DEPLOY_SSH_KEY_ID = 'portfolio-deploy-key'
    }

    stages {
        stage('Preparar') {
            steps {
                script {
                    env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                    env.IMAGE_TAG = env.GIT_SHA.take(12)

                    // La condición `branch 'main'` solo funciona en jobs
                    // multibranch: en un Pipeline normal BRANCH_NAME no existe y
                    // publicar/desplegar se saltarían en silencio. Se resuelve la
                    // rama de las tres fuentes posibles, en orden.
                    def raw = env.BRANCH_NAME                      // job multibranch
                    if (!raw) { raw = env.GIT_BRANCH }            // plugin de git
                    if (!raw) {                                   // último recurso
                        raw = sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD').trim()
                    }
                    env.GIT_BRANCH_NAME = raw.replaceFirst(/^origin\//, '')
                    env.IS_MAIN = (env.GIT_BRANCH_NAME == 'main').toString()

                    currentBuild.displayName = "#${env.BUILD_NUMBER} · ${env.IMAGE_TAG}"
                    echo "Rama: ${env.GIT_BRANCH_NAME} · desplegable: ${env.IS_MAIN}"
                }
                sh 'docker compose version'
                // .env efímero: secretos aleatorios y NGINX_PORT=0 (puerto libre).
                sh 'sh scripts/ci-env.sh .env'
            }
        }

        stage('Build de imágenes') {
            // Aquí está la puerta de calidad principal: los Dockerfiles de Go
            // corren `go vet` y `go test` en una stage de la que hereda el
            // build, y el del frontend corre eslint y tsc. Si algo falla, la
            // imagen no llega a existir y el pipeline se corta en seco.
            steps {
                sh 'docker compose -p "$COMPOSE_PROJECT_NAME" build --pull'
            }
        }

        stage('Verificar Django') {
            // Lo que no cabe en el Dockerfile: que no haya drift entre los
            // modelos y las migraciones ya escritas. Sin base de datos: `check`
            // y `makemigrations --check` no la tocan.
            steps {
                sh '''
                    set -eu
                    # Compose nombra lo que construye como <proyecto>-<servicio>.
                    # Si esa convención cambiara, mejor un error claro aquí que un
                    # `docker run` fallando por una imagen inexistente.
                    image="${COMPOSE_PROJECT_NAME}-graphql-api"
                    docker image inspect "$image" >/dev/null 2>&1 || {
                        echo "ERROR: no existe la imagen $image tras el build." >&2
                        docker images --format '{{.Repository}}:{{.Tag}}' | head -20 >&2
                        exit 1
                    }

                    manage() {
                        docker run --rm --entrypoint python \
                            -e DJANGO_SECRET_KEY=ci-dummy \
                            -e DATABASE_URL=postgres://ci:ci@127.0.0.1:5432/ci \
                            -e REDIS_URL=redis://127.0.0.1:6379/0 \
                            -e JWT_SECRET=ci-dummy \
                            -e INTERNAL_SERVICE_TOKEN=ci-dummy \
                            "$image" manage.py "$@"
                    }
                    manage check
                    manage makemigrations portfolio --check --dry-run
                '''
            }
        }

        stage('Smoke end-to-end') {
            // Levanta los 8 contenedores (con el Postgres embebido, no el de
            // producción) y ejerce el flujo completo, incluido el POST de
            // contacto Go → Django → PostgreSQL → Celery.
            steps {
                sh '''
                    set -eu
                    dc() { docker compose -p "$COMPOSE_PROJECT_NAME" "$@"; }
                    dc up -d --wait --wait-timeout 300
                    # NGINX_PORT=0: Docker asignó un puerto libre, lo resolvemos.
                    port=$(dc port nginx 80 | head -n1 | sed 's/.*://')
                    # `localhost` y no 127.0.0.1: el Host llega hasta Django y
                    # DJANGO_ALLOWED_HOSTS valida el dominio (sin puerto).
                    sh scripts/smoke-test.sh "http://localhost:${port}"
                '''
            }
        }

        stage('Publicar imágenes') {
            when {
                expression { env.IS_MAIN == 'true' && params.PUSH_IMAGES }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: env.REGISTRY_CREDENTIALS_ID,
                    usernameVariable: 'REG_USER',
                    passwordVariable: 'REG_PASSWORD'
                )]) {
                    sh '''
                        set -eu
                        registry_host=$(printf '%s' "$REGISTRY" | cut -d/ -f1)
                        printf '%s' "$REG_PASSWORD" | docker login "$registry_host" -u "$REG_USER" --password-stdin

                        for service in $SERVICES; do
                            remote="${REGISTRY}/${IMAGE_PREFIX}-${service}"
                            docker tag "${COMPOSE_PROJECT_NAME}-${service}" "${remote}:${IMAGE_TAG}"
                            docker tag "${COMPOSE_PROJECT_NAME}-${service}" "${remote}:latest"
                            docker push "${remote}:${IMAGE_TAG}"
                            docker push "${remote}:latest"
                        done
                    '''
                }
            }
        }

        stage('Desplegar') {
            when {
                expression { env.IS_MAIN == 'true' && params.DEPLOY }
            }
            steps {
                script {
                    // Un parámetro vacío se trata como `local`: intentar un ssh a
                    // "" daría un error mucho más difícil de leer.
                    def target = (params.DEPLOY_TARGET ?: 'local').trim()
                    if (!target) { target = 'local' }
                    // El servidor se pone en el mismo commit que las imágenes:
                    // los compose files y el smoke test tienen que ser los de
                    // este build, no los del despliegue anterior.
                    writeFile file: '.deploy-remote.sh', text: """set -eu
cd '${params.PROJECT_DIR}'
git fetch --prune origin
git checkout -q '${env.GIT_SHA}'
IMAGE_TAG='${env.IMAGE_TAG}' \\
REGISTRY='${params.REGISTRY}' \\
IMAGE_PREFIX='${env.IMAGE_PREFIX}' \\
sh scripts/deploy.sh
"""
                    if (target == 'local') {
                        sh 'sh .deploy-remote.sh'
                    } else {
                        sshagent([env.DEPLOY_SSH_KEY_ID]) {
                            sh "ssh -o StrictHostKeyChecking=accept-new '${target}' sh -s < .deploy-remote.sh"
                        }
                    }
                }
            }
        }
    }

    post {
        failure {
            // Antes del teardown: sin esto el log del fallo se pierde.
            sh '''
                docker compose -p "$COMPOSE_PROJECT_NAME" ps || true
                docker compose -p "$COMPOSE_PROJECT_NAME" logs --tail 150 || true
            '''
        }
        cleanup {
            sh '''
                docker compose -p "$COMPOSE_PROJECT_NAME" down -v --remove-orphans --rmi local || true
                registry_host=$(printf '%s' "${REGISTRY:-}" | cut -d/ -f1)
                if [ -n "$registry_host" ]; then docker logout "$registry_host" >/dev/null 2>&1 || true; fi
                rm -f .env .deploy-remote.sh
            '''
        }
    }
}
