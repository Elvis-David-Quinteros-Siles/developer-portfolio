"""Seed idempotente con contenido demo profesional en español.

Por defecto solo CREA lo que falta (get_or_create con claves naturales):
re-ejecutarlo en cada arranque del contenedor no pisa ediciones hechas vía
admin o updateProfile. Con --refresh fuerza el contenido demo canónico.
"""
from __future__ import annotations

import datetime
import logging

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from portfolio.models import (
    ArchitectureTopic,
    Certification,
    Education,
    Experience,
    Post,
    Profile,
    Project,
    SkillCategory,
    Skill,
)

logger = logging.getLogger("portfolio.seed")


def _upsert(model, lookup: dict, defaults: dict, refresh: bool) -> tuple[object, bool]:
    if refresh:
        obj, created = model.all_objects.update_or_create(**lookup, defaults={**defaults, "deleted_at": None})
    else:
        obj, created = model.all_objects.get_or_create(**lookup, defaults=defaults)
    return obj, created


class Command(BaseCommand):
    help = "Carga contenido demo (idempotente). --refresh restaura el contenido canónico."

    def add_arguments(self, parser):
        parser.add_argument("--refresh", action="store_true", help="Sobrescribe con el contenido demo")

    @transaction.atomic
    def handle(self, *args, **options):
        refresh: bool = options["refresh"]
        created_count = 0

        created_count += self._seed_profile(refresh)
        created_count += self._seed_skills(refresh)
        created_count += self._seed_projects(refresh)
        created_count += self._seed_experience(refresh)
        created_count += self._seed_certifications(refresh)
        created_count += self._seed_education(refresh)
        created_count += self._seed_posts(refresh)
        created_count += self._seed_architecture(refresh)

        logger.info("seed_demo.done", extra={"objects_created": created_count, "refresh": refresh})
        self.stdout.write(self.style.SUCCESS(f"seed_demo OK (objetos creados: {created_count})"))

    # ------------------------------------------------------------- profile --
    def _seed_profile(self, refresh: bool) -> int:
        if Profile.objects.exists() and not refresh:
            return 0
        defaults = dict(
            full_name="Elvis Quinteros",
            headline="Ingeniero de Software Backend · Arquitectura de Sistemas Distribuidos",
            bio=(
                "Ingeniero de software con más de 8 años diseñando y operando sistemas "
                "backend de alta disponibilidad. Especializado en arquitecturas orientadas "
                "a eventos, APIs (REST y GraphQL) y plataformas cloud-native sobre "
                "Kubernetes. Me interesa la intersección entre diseño de dominio (DDD), "
                "observabilidad y entrega continua: sistemas que se pueden razonar, medir "
                "y evolucionar con seguridad."
            ),
            photo_url="/media/seed/profile/elvis-quinteros.webp",
            cv_url="/media/seed/profile/cv-elvis-quinteros.pdf",
            github_url="https://github.com/elvisquinteros",
            linkedin_url="https://www.linkedin.com/in/elvis-quinteros",
            email="dquinteros630@gmail.com",
            location="Santa Cruz de la Sierra, Bolivia",
            philosophy=(
                "Creo en la arquitectura como una disciplina de decisiones explícitas: "
                "cada dependencia, cada contrato y cada trade-off debe estar escrito y "
                "ser defendible. Primero el dominio, después el framework. Software "
                "simple por fuera, riguroso por dentro, y siempre observable en producción."
            ),
        )
        existing = Profile.all_objects.order_by("created_at").first()
        if existing is None:
            Profile.objects.create(**defaults)
            return 1
        if refresh:
            for field, value in defaults.items():
                setattr(existing, field, value)
            existing.deleted_at = None
            existing.save()
        return 0

    # -------------------------------------------------------------- skills --
    def _seed_skills(self, refresh: bool) -> int:
        created = 0
        data = {
            ("Lenguajes", "lenguajes", 1): [
                ("Go", "simple-icons:go", 5, "6.0", "Servicios de alto rendimiento, CLIs y workers concurrentes"),
                ("Python", "simple-icons:python", 5, "8.0", "Backends Django/FastAPI, tooling y automatización"),
                ("TypeScript", "simple-icons:typescript", 4, "5.0", "APIs Node y tipado de contratos compartidos"),
                ("SQL", "simple-icons:postgresql", 5, "8.0", "Modelado, tuning de consultas y planes de ejecución"),
            ],
            ("Backend & APIs", "backend-apis", 2): [
                ("Django", "simple-icons:django", 5, "7.0", "ORM avanzado, Celery y despliegues productivos"),
                ("GraphQL", "simple-icons:graphql", 4, "4.0", "Schemas federables, DataLoaders y diseño de contratos"),
                ("gRPC", "simple-icons:trpc", 3, "3.0", "Comunicación interna de baja latencia entre servicios"),
                ("REST / OpenAPI", "simple-icons:openapiinitiative", 5, "8.0", "Diseño contract-first y versionado de APIs"),
            ],
            ("Datos & Mensajería", "datos-mensajeria", 3): [
                ("PostgreSQL", "simple-icons:postgresql", 5, "8.0", "Particionado, índices parciales/GIN y replicación"),
                ("Redis", "simple-icons:redis", 4, "6.0", "Cache, rate-limiting y colas ligeras"),
                ("Apache Kafka", "simple-icons:apachekafka", 4, "4.0", "Event streaming, exactly-once y esquemas Avro"),
                ("RabbitMQ", "simple-icons:rabbitmq", 3, "3.0", "Colas de trabajo y patrones de reintento"),
            ],
            ("DevOps & Cloud", "devops-cloud", 4): [
                ("Docker", "simple-icons:docker", 5, "7.0", "Imágenes multi-stage, hardening y compose"),
                ("Kubernetes", "simple-icons:kubernetes", 4, "5.0", "Operación de clusters, HPA y GitOps"),
                ("Terraform", "simple-icons:terraform", 4, "4.0", "Infraestructura como código multi-cloud"),
                ("GitHub Actions", "simple-icons:githubactions", 4, "5.0", "Pipelines CI/CD con gates de calidad"),
            ],
            ("Arquitectura & Metodologías", "arquitectura-metodologias", 5): [
                ("Domain-Driven Design", "simple-icons:diagramsdotnet", 4, "5.0", "Bounded contexts, agregados y lenguaje ubicuo"),
                ("Arquitectura Hexagonal", "simple-icons:hexo", 4, "5.0", "Puertos y adaptadores; dominio independiente del framework"),
                ("CQRS / Event Sourcing", "simple-icons:eventstore", 3, "3.0", "Separación de lectura/escritura y proyecciones"),
            ],
            ("Observabilidad & Calidad", "observabilidad-calidad", 6): [
                ("Prometheus", "simple-icons:prometheus", 4, "4.0", "Métricas, alerting y SLOs"),
                ("Grafana", "simple-icons:grafana", 4, "4.0", "Dashboards y correlación métricas/logs/trazas"),
                ("OpenTelemetry", "simple-icons:opentelemetry", 3, "2.5", "Trazabilidad distribuida extremo a extremo"),
            ],
        }
        for (cat_name, cat_slug, order), skills in data.items():
            category, was_created = _upsert(
                SkillCategory,
                {"slug": cat_slug},
                {"name": cat_name, "display_order": order},
                refresh,
            )
            created += int(was_created)
            for index, (name, icon, level, years, description) in enumerate(skills, start=1):
                _, was_created = _upsert(
                    Skill,
                    {"category": category, "name": name},
                    {
                        "icon": icon,
                        "level": level,
                        "years": years,
                        "description": description,
                        "display_order": index,
                    },
                    refresh,
                )
                created += int(was_created)
        return created

    # ------------------------------------------------------------ projects --
    def _seed_projects(self, refresh: bool) -> int:
        created = 0
        projects = [
            dict(
                slug="plataforma-pagos-eventos",
                title="Plataforma de pagos orientada a eventos",
                summary="Núcleo transaccional de pagos con garantías exactly-once y conciliación automática.",
                description=(
                    "## Contexto\n\nPlataforma que procesa pagos de múltiples adquirentes "
                    "con conciliación diaria automática y trazabilidad completa de cada "
                    "transacción a través de un event log inmutable."
                ),
                problem=(
                    "El monolito de pagos perdía transacciones bajo picos de carga y la "
                    "conciliación manual tomaba 2 días por ciclo, con errores frecuentes."
                ),
                solution=(
                    "Rediseño hacia una arquitectura orientada a eventos sobre Kafka: "
                    "outbox pattern para publicación atómica, consumidores idempotentes, "
                    "sagas para flujos de reverso y un read model en PostgreSQL para "
                    "conciliación en tiempo real."
                ),
                outcome=(
                    "Cero transacciones perdidas en 18 meses, conciliación de 2 días a "
                    "20 minutos y throughput sostenido de 1.200 tx/s con p99 < 180 ms."
                ),
                stack=["Go", "Kafka", "PostgreSQL", "Redis", "Kubernetes", "Prometheus"],
                image_url="/media/seed/projects/pagos-cover.webp",
                architecture_diagram_url="/media/seed/projects/pagos-arquitectura.svg",
                github_url="https://github.com/elvisquinteros/payments-platform",
                demo_url="",
                video_url="",
                featured=True,
                display_order=1,
            ),
            dict(
                slug="api-federada-catalogo",
                title="API GraphQL federada de catálogo",
                summary="Grafo unificado de productos, precios e inventario para web y apps móviles.",
                description=(
                    "## Contexto\n\nCapa de API que federa tres dominios (catálogo, precios, "
                    "inventario) en un único grafo consumido por web, iOS y Android."
                ),
                problem=(
                    "Cada frontend integraba 7 microservicios REST con contratos "
                    "inconsistentes; un cambio de backend rompía clientes en cascada y "
                    "las pantallas hacían decenas de round-trips."
                ),
                solution=(
                    "Schema GraphQL federado con ownership por dominio, DataLoaders para "
                    "eliminar N+1, persisted queries y un pipeline de contract-testing "
                    "que valida compatibilidad de schema en CI antes de cada despliegue."
                ),
                outcome=(
                    "Tiempo de integración de nuevas pantallas reducido 60%, payloads 45% "
                    "más pequeños y cero breaking changes en producción desde su adopción."
                ),
                stack=["Python", "Strawberry", "GraphQL", "PostgreSQL", "Redis", "Docker"],
                image_url="/media/seed/projects/catalogo-cover.webp",
                architecture_diagram_url="/media/seed/projects/catalogo-arquitectura.svg",
                github_url="https://github.com/elvisquinteros/catalog-graph",
                demo_url="",
                video_url="",
                featured=True,
                display_order=2,
            ),
            dict(
                slug="pipeline-telemetria-iot",
                title="Pipeline de telemetría IoT agroindustrial",
                summary="Ingesta y análisis de 40k sensores de campo con alertas en tiempo casi real.",
                description=(
                    "## Contexto\n\nSistema de ingesta para sensores de humedad, temperatura "
                    "y riego distribuidos en campos agroindustriales, con tableros "
                    "operativos y alertas tempranas."
                ),
                problem=(
                    "Los datos llegaban por lotes cada 6 horas; las heladas y fallas de "
                    "riego se detectaban tarde, con pérdidas directas de cultivo."
                ),
                solution=(
                    "Ingesta MQTT → workers Go con backpressure, almacenamiento en "
                    "TimescaleDB, reglas de alerta evaluadas en streaming y despliegue "
                    "edge en gateways rurales con sincronización tolerante a cortes."
                ),
                outcome=(
                    "Latencia de dato de 6 horas a menos de 30 segundos y detección de "
                    "eventos críticos con 25 minutos de anticipación promedio."
                ),
                stack=["Go", "MQTT", "TimescaleDB", "Grafana", "Kubernetes", "Terraform"],
                image_url="/media/seed/projects/iot-cover.webp",
                architecture_diagram_url="/media/seed/projects/iot-arquitectura.svg",
                github_url="https://github.com/elvisquinteros/agro-telemetry",
                demo_url="",
                video_url="",
                featured=False,
                display_order=3,
            ),
            dict(
                slug="migracion-monolito-hexagonal",
                title="Migración de monolito a servicios hexagonales",
                summary="Strangler fig sobre un ERP legado: extracción incremental sin ventanas de corte.",
                description=(
                    "## Contexto\n\nERP de logística con 10 años de historia, sin tests y "
                    "con acoplamiento total entre UI, negocio y acceso a datos."
                ),
                problem=(
                    "Cada release del monolito requería una ventana de mantenimiento de "
                    "4 horas y el equipo no podía desplegar más de una vez al mes."
                ),
                solution=(
                    "Patrón strangler fig: fachada de rutas, extracción de bounded "
                    "contexts a servicios hexagonales (puertos/adaptadores), tests de "
                    "caracterización sobre el legado y CDC para sincronizar datos durante "
                    "la transición."
                ),
                outcome=(
                    "Despliegues diarios sin downtime, lead time de cambios de 30 días a "
                    "2 días y 78% del tráfico servido por los servicios nuevos en un año."
                ),
                stack=["Python", "Django", "Celery", "PostgreSQL", "RabbitMQ", "Docker"],
                image_url="/media/seed/projects/migracion-cover.webp",
                architecture_diagram_url="/media/seed/projects/migracion-arquitectura.svg",
                github_url="https://github.com/elvisquinteros/strangler-migration",
                demo_url="",
                video_url="",
                featured=False,
                display_order=4,
            ),
        ]
        for data in projects:
            slug = data.pop("slug")
            _, was_created = _upsert(Project, {"slug": slug}, data, refresh)
            created += int(was_created)
        return created

    # ---------------------------------------------------------- experience --
    def _seed_experience(self, refresh: bool) -> int:
        created = 0
        experiences = [
            dict(
                company="Nubeo Technologies",
                role="Arquitecto de Software Senior",
                location="Remoto (LATAM)",
                start_date=datetime.date(2022, 3, 1),
                end_date=None,
                description=(
                    "Responsable de la arquitectura de la plataforma de pagos y del "
                    "programa de modernización técnica (12 ingenieros, 3 squads)."
                ),
                achievements=[
                    "Diseñé la arquitectura event-driven que procesa +1.200 tx/s con p99 < 180 ms",
                    "Implanté ADRs y contract-testing como práctica estándar de los equipos",
                    "Reduje el costo de infraestructura 32% con autoscaling y right-sizing en Kubernetes",
                ],
                tech=["Go", "Kafka", "PostgreSQL", "Kubernetes", "Terraform", "Prometheus"],
                display_order=1,
            ),
            dict(
                company="Andina Digital Labs",
                role="Ingeniero Backend Senior",
                location="Santa Cruz de la Sierra, Bolivia",
                start_date=datetime.date(2019, 6, 1),
                end_date=datetime.date(2022, 2, 28),
                description=(
                    "Desarrollo de APIs y servicios para banca digital: onboarding, "
                    "scoring y notificaciones transaccionales."
                ),
                achievements=[
                    "Lideré la migración del core de notificaciones a colas con reintentos idempotentes (99.98% de entrega)",
                    "Diseñé la API GraphQL de onboarding consumida por 4 clientes distintos",
                    "Introduje observabilidad con OpenTelemetry, reduciendo el MTTR de 3 h a 25 min",
                ],
                tech=["Python", "Django", "Celery", "GraphQL", "Redis", "RabbitMQ", "Docker"],
                display_order=2,
            ),
            dict(
                company="Soluciones Tigre SRL",
                role="Desarrollador Backend",
                location="Santa Cruz de la Sierra, Bolivia",
                start_date=datetime.date(2016, 8, 1),
                end_date=datetime.date(2019, 5, 31),
                description=(
                    "Desarrollo de sistemas de gestión logística y facturación para "
                    "clientes del sector retail y transporte."
                ),
                achievements=[
                    "Automaticé la facturación electrónica de 3 clientes grandes (de 2 días manuales a 1 hora)",
                    "Optimicé consultas críticas de inventario (de 40 s a < 500 ms) con índices y particionado",
                ],
                tech=["Python", "Django", "PostgreSQL", "Linux", "Nginx"],
                display_order=3,
            ),
        ]
        for data in experiences:
            lookup = {
                "company": data.pop("company"),
                "role": data.pop("role"),
                "start_date": data.pop("start_date"),
            }
            _, was_created = _upsert(Experience, lookup, data, refresh)
            created += int(was_created)
        return created

    # ------------------------------------------------------ certifications --
    def _seed_certifications(self, refresh: bool) -> int:
        created = 0
        certifications = [
            dict(
                name="Certified Kubernetes Administrator (CKA)",
                issuer="Cloud Native Computing Foundation",
                issue_date=datetime.date(2024, 5, 12),
                expires_at=datetime.date(2027, 5, 12),
                credential_id="CKA-2405-018342",
                credential_url="https://training.linuxfoundation.org/certification/verify",
                badge_url="/media/seed/certifications/cka.png",
            ),
            dict(
                name="AWS Certified Solutions Architect – Associate",
                issuer="Amazon Web Services",
                issue_date=datetime.date(2023, 9, 3),
                expires_at=datetime.date(2026, 9, 3),
                credential_id="AWS-SAA-7Q2KX91",
                credential_url="https://aws.amazon.com/verification",
                badge_url="/media/seed/certifications/aws-saa.png",
            ),
            dict(
                name="Professional Scrum Master I (PSM I)",
                issuer="Scrum.org",
                issue_date=datetime.date(2021, 11, 20),
                expires_at=None,
                credential_id="PSM-I-664120",
                credential_url="https://www.scrum.org/certificates/verify",
                badge_url="/media/seed/certifications/psm1.png",
            ),
        ]
        for data in certifications:
            lookup = {"name": data.pop("name"), "issuer": data.pop("issuer")}
            _, was_created = _upsert(Certification, lookup, data, refresh)
            created += int(was_created)
        return created

    # ----------------------------------------------------------- education --
    def _seed_education(self, refresh: bool) -> int:
        created = 0
        education = [
            dict(
                institution="Universidad Autónoma Gabriel René Moreno (UAGRM)",
                degree="Ingeniería en Sistemas",
                field="Ingeniería de Software",
                start_date=datetime.date(2011, 2, 1),
                end_date=datetime.date(2016, 12, 15),
                description=(
                    "Tesis: plataforma de monitoreo distribuido para laboratorios "
                    "universitarios con colas de mensajes y tableros en tiempo real."
                ),
            ),
            dict(
                institution="Universidad Privada de Santa Cruz de la Sierra (UPSA)",
                degree="Diplomado en Arquitectura de Software",
                field="Arquitectura y diseño de sistemas distribuidos",
                start_date=datetime.date(2020, 3, 1),
                end_date=datetime.date(2020, 12, 10),
                description=(
                    "Énfasis en DDD, microservicios, mensajería y patrones de "
                    "integración empresarial (EIP)."
                ),
            ),
        ]
        for data in education:
            lookup = {
                "institution": data.pop("institution"),
                "degree": data.pop("degree"),
            }
            _, was_created = _upsert(Education, lookup, data, refresh)
            created += int(was_created)
        return created

    # --------------------------------------------------------------- posts --
    def _seed_posts(self, refresh: bool) -> int:
        created = 0
        now = timezone.now()
        posts = [
            dict(
                slug="idempotencia-apis-distribuidas",
                title="Idempotencia en APIs distribuidas: más allá del retry",
                excerpt=(
                    "Reintentar es fácil; reintentar sin duplicar efectos es diseño. "
                    "Claves de idempotencia, outbox y deduplicación en la práctica."
                ),
                content=(
                    "## El problema\n\n"
                    "En cuanto una llamada atraviesa la red, el cliente ya no puede saber si "
                    "el efecto ocurrió: un timeout es indistinguible de un éxito lento. La única "
                    "respuesta robusta es reintentar, y reintentar exige **idempotencia**.\n\n"
                    "## Claves de idempotencia\n\n"
                    "```http\n"
                    "POST /api/v1/payments\n"
                    "Idempotency-Key: 7f9c2ba4-e88f-11ed-a05b-0242ac120003\n"
                    "```\n\n"
                    "El servidor persiste la clave junto con el resultado de la primera ejecución "
                    "y responde el mismo resultado ante repeticiones. Tres detalles que suelen "
                    "olvidarse:\n\n"
                    "1. La clave debe guardarse **en la misma transacción** que el efecto.\n"
                    "2. Necesita TTL y estrategia de limpieza.\n"
                    "3. Una repetición con el mismo key pero distinto payload es un `409`.\n\n"
                    "## Outbox pattern\n\n"
                    "Para efectos que cruzan servicios (publicar un evento tras confirmar un pago), "
                    "el patrón outbox garantiza atomicidad: se escribe el evento en una tabla local "
                    "dentro de la transacción y un relay lo publica después. El consumidor, a su vez, "
                    "deduplica por `event_id`.\n\n"
                    "## Conclusión\n\n"
                    "La idempotencia no es una feature: es la condición de posibilidad de los "
                    "reintentos, y los reintentos son la condición de posibilidad de operar "
                    "sistemas distribuidos con calma."
                ),
                cover_url="/media/seed/posts/idempotencia.webp",
                tags=["distributed-systems", "apis", "patterns"],
                published=True,
                published_at=now - datetime.timedelta(days=12),
                reading_minutes=8,
            ),
            dict(
                slug="saga-pattern-transacciones-distribuidas",
                title="Sagas: transacciones distribuidas sin two-phase commit",
                excerpt=(
                    "Cómo coordinar consistencia entre servicios con sagas coreografiadas "
                    "y orquestadas, y cuándo conviene cada una."
                ),
                content=(
                    "## Por qué no 2PC\n\n"
                    "El two-phase commit acopla la disponibilidad de todos los participantes: "
                    "si uno se cae con locks tomados, el resto espera. En sistemas de alta "
                    "disponibilidad eso es inaceptable; las **sagas** cambian locks por "
                    "compensaciones.\n\n"
                    "## Anatomía de una saga\n\n"
                    "Una saga es una secuencia de transacciones locales. Si el paso *n* falla, "
                    "se ejecutan las compensaciones de los pasos *n-1..1*:\n\n"
                    "```text\n"
                    "reservar_stock → cobrar_pago → generar_envio\n"
                    "     ↓ (falla cobrar_pago)\n"
                    "liberar_stock ← [compensación]\n"
                    "```\n\n"
                    "## ¿Coreografía u orquestación?\n\n"
                    "- **Coreografía**: cada servicio reacciona a eventos. Menos acoplamiento, "
                    "pero el flujo global queda implícito y cuesta razonarlo.\n"
                    "- **Orquestación**: un coordinador dirige los pasos. El flujo es explícito y "
                    "testeable; el orquestador es un punto a operar con cuidado.\n\n"
                    "Mi regla práctica: coreografía para flujos de 2-3 pasos entre dominios "
                    "cercanos; orquestación cuando hay ramificaciones, timeouts de negocio o "
                    "compensaciones complejas.\n\n"
                    "## Lecciones de producción\n\n"
                    "Toda compensación debe ser idempotente, todo paso debe tener timeout de "
                    "negocio (no solo de red) y el estado de la saga debe ser consultable: "
                    "cuando algo quede a medias —y va a pasar— operaciones necesita verlo."
                ),
                cover_url="/media/seed/posts/sagas.webp",
                tags=["distributed-systems", "patterns", "kafka"],
                published=True,
                published_at=now - datetime.timedelta(days=45),
                reading_minutes=10,
            ),
            dict(
                slug="observabilidad-opentelemetry-django",
                title="Observabilidad real en Django con OpenTelemetry",
                excerpt=(
                    "Logs con request_id, métricas RED y trazas distribuidas: qué "
                    "instrumentar primero para reducir el MTTR de verdad."
                ),
                content=(
                    "## Tres señales, un contexto\n\n"
                    "Logs, métricas y trazas solo son útiles si comparten contexto. El pegamento "
                    "es la propagación: `X-Request-ID` (o `traceparent` en W3C Trace Context) debe "
                    "viajar del edge al worker.\n\n"
                    "## Logs estructurados con request_id\n\n"
                    "```python\n"
                    "logger.info(\n"
                    "    \"request.completed\",\n"
                    "    extra={\"request_id\": rid, \"status\": 200, \"latency_ms\": 42.3},\n"
                    ")\n"
                    "```\n\n"
                    "Un middleware toma el header, lo deja en un `ContextVar` y el formatter JSON "
                    "lo añade a cada línea. Con eso, `grep request_id` reconstruye el viaje "
                    "completo de una petición entre servicios.\n\n"
                    "## Métricas RED primero\n\n"
                    "Antes de dashboards exóticos: **R**ate, **E**rrors, **D**uration por endpoint. "
                    "Con esas tres series y alertas sobre error rate y p99 se cubre el 80% de los "
                    "incidentes.\n\n"
                    "## Trazas donde duele\n\n"
                    "Instrumentar todo desde el día uno es ruido. Empiezo por los bordes (HTTP, "
                    "colas, DB) y profundizo solo en los spans que aparecen en incidentes. En un "
                    "equipo real esto bajó el MTTR de horas a minutos: la traza señala el servicio "
                    "culpable antes de abrir un solo log.\n\n"
                    "## Cierre\n\n"
                    "La observabilidad no es una herramienta que se instala, es una propiedad que "
                    "se diseña: contexto propagado, señales correlacionadas y hábito de mirar los "
                    "datos antes de opinar."
                ),
                cover_url="/media/seed/posts/observabilidad.webp",
                tags=["observability", "django", "opentelemetry"],
                published=True,
                published_at=now - datetime.timedelta(days=90),
                reading_minutes=9,
            ),
        ]
        for data in posts:
            slug = data.pop("slug")
            _, was_created = _upsert(Post, {"slug": slug}, data, refresh)
            created += int(was_created)
        return created

    # -------------------------------------------------------- architecture --
    def _seed_architecture(self, refresh: bool) -> int:
        created = 0
        topics = [
            dict(
                slug="clean-architecture",
                title="Clean Architecture",
                category="patterns",
                description=(
                    "## Regla de dependencia\n\n"
                    "Las dependencias apuntan hacia adentro: el dominio no conoce frameworks, "
                    "bases de datos ni transporte. Entidades y casos de uso en el centro; "
                    "controladores, ORMs y UIs en los anillos externos.\n\n"
                    "**En este portfolio**: los resolvers GraphQL son adaptadores finos que "
                    "delegan en `portfolio/services/` (casos de uso); el dominio no importa "
                    "Strawberry ni conoce HTTP."
                ),
                diagram_url="/media/seed/architecture/clean-architecture.svg",
                display_order=1,
            ),
            dict(
                slug="ddd",
                title="Domain-Driven Design",
                category="patterns",
                description=(
                    "## Diseño guiado por el dominio\n\n"
                    "Bounded contexts con lenguaje ubicuo propio, agregados que protegen "
                    "invariantes y context mapping explícito entre equipos.\n\n"
                    "**En este portfolio**: cada tabla sin FK es su propio aggregate root; "
                    "las únicas composiciones (categoría→skill, proyecto→imagen) reflejan "
                    "invariantes reales del dominio."
                ),
                diagram_url="/media/seed/architecture/ddd.svg",
                display_order=2,
            ),
            dict(
                slug="hexagonal",
                title="Arquitectura Hexagonal (Ports & Adapters)",
                category="patterns",
                description=(
                    "## Puertos y adaptadores\n\n"
                    "El núcleo expone puertos (interfaces); los adaptadores concretos —HTTP, "
                    "colas, persistencia— se conectan por fuera. El dominio es testeable sin "
                    "infraestructura.\n\n"
                    "**En este portfolio**: `EmailNotifier` es un puerto con dos adaptadores "
                    "(log estructurado y stub SMTP); cambiar de estrategia no toca la tarea "
                    "Celery ni el dominio."
                ),
                diagram_url="/media/seed/architecture/hexagonal.svg",
                display_order=3,
            ),
            dict(
                slug="cqrs",
                title="CQRS",
                category="patterns",
                description=(
                    "## Separar lecturas de escrituras\n\n"
                    "Modelos distintos para comandos y consultas permiten optimizar cada lado: "
                    "el write side protege invariantes; el read side sirve consultas rápidas.\n\n"
                    "**En este sistema**: CQRS a nivel de sistema (ADR-0003) — Django es el "
                    "write side y dueño del esquema; go-api es el read side de alto "
                    "rendimiento sobre las mismas tablas."
                ),
                diagram_url="/media/seed/architecture/cqrs.svg",
                display_order=4,
            ),
            dict(
                slug="event-driven",
                title="Arquitectura orientada a eventos",
                category="patterns",
                description=(
                    "## Comunicación por eventos\n\n"
                    "Los servicios publican hechos inmutables y otros reaccionan: desacopla "
                    "temporalmente, habilita escalado independiente y deja un log auditable. "
                    "Exige idempotencia, ordering explícito y diseño de esquemas de eventos.\n\n"
                    "**En este sistema**: el contacto encola `notify_contact_message` en Redis; "
                    "el worker Celery procesa con retries exponenciales sin bloquear la request."
                ),
                diagram_url="/media/seed/architecture/event-driven.svg",
                display_order=5,
            ),
            dict(
                slug="kubernetes-cicd",
                title="Kubernetes y CI/CD",
                category="infra",
                description=(
                    "## Entrega continua sobre Kubernetes\n\n"
                    "Pipelines que construyen imágenes inmutables, promueven por entornos con "
                    "GitOps y despliegan con rolling updates + health probes. Infraestructura "
                    "declarativa (Terraform) y observabilidad como gate de despliegue.\n\n"
                    "**En este sistema**: contenedores non-root con healthchecks, migraciones "
                    "como paso de arranque ordenado y dependencias expresadas en el compose "
                    "(go-api espera al health de graphql-api)."
                ),
                diagram_url="/media/seed/architecture/kubernetes-cicd.svg",
                display_order=6,
            ),
        ]
        for data in topics:
            slug = data.pop("slug")
            _, was_created = _upsert(ArchitectureTopic, {"slug": slug}, data, refresh)
            created += int(was_created)
        return created
