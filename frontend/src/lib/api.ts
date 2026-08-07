import type {
  ArchitectureTopic,
  Certification,
  ContactAccepted,
  ContactInput,
  Education,
  Envelope,
  Experience,
  ProblemDetails,
  Profile,
  Project,
  SkillCategory,
} from "@/types/api";

/**
 * Capa de acceso REST. SIEMPRE rutas relativas: nginx (edge) enruta
 * /api/ → gateway → go-api. Ver docs/CONTRACTS.md §2-3.
 */
const API_BASE = "/api/v1";
const DEFAULT_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | null;

  constructor(status: number, message: string, problem: ProblemDetails | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json", ...init?.headers },
      signal: controller.signal,
      ...init,
    });

    if (!res.ok) {
      let problem: ProblemDetails | null = null;
      try {
        problem = (await res.json()) as ProblemDetails;
      } catch {
        // cuerpo no-JSON: se conserva solo el status
      }
      throw new ApiError(res.status, problem?.detail ?? problem?.title ?? res.statusText, problem);
    }

    const envelope = (await res.json()) as Envelope<T>;
    return envelope.data;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  profile: () => request<Profile>("/profile"),
  projects: (featured?: boolean) =>
    request<Project[]>(`/projects${featured ? "?featured=true" : ""}`),
  project: (slug: string) => request<Project>(`/projects/${encodeURIComponent(slug)}`),
  skills: () => request<SkillCategory[]>("/skills"),
  experience: () => request<Experience[]>("/experience"),
  architecture: () => request<ArchitectureTopic[]>("/architecture"),
  certifications: () => request<Certification[]>("/certifications"),
  education: () => request<Education[]>("/education"),
  contact: (input: ContactInput) =>
    request<ContactAccepted>("/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
};
