import { useMutation, useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  fallbackArchitectureTopics,
  fallbackCertifications,
  fallbackEducation,
  fallbackExperience,
  fallbackProfile,
  fallbackProjects,
  fallbackSkillCategories,
  findFallbackProject,
} from "@/content/fallback";
import { api } from "@/lib/api";
import type {
  ArchitectureTopic,
  Certification,
  ContactAccepted,
  ContactInput,
  Education,
  Experience,
  Profile,
  Project,
  SkillCategory,
} from "@/types/api";

/**
 * Query resiliente: la UI pinta al instante con el fallback local y, si la
 * API falla, la query resuelve a ese mismo fallback. La web nunca se ve rota.
 */
function useResilientQuery<T>(
  key: readonly unknown[],
  fetcher: () => Promise<T>,
  fallback: T,
): Omit<UseQueryResult<T>, "data"> & { data: T } {
  const query = useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      try {
        return await fetcher();
      } catch {
        return fallback;
      }
    },
  });
  return { ...query, data: query.data ?? fallback };
}

export function useProfile() {
  return useResilientQuery<Profile>(["profile"], api.profile, fallbackProfile);
}

export function useProjects(featured?: boolean) {
  const fallback = featured ? fallbackProjects.filter((p) => p.featured) : fallbackProjects;
  return useResilientQuery<Project[]>(
    ["projects", { featured: featured ?? false }],
    () => api.projects(featured),
    fallback,
  );
}

export function useProject(slug: string) {
  return useQuery<Project | undefined>({
    queryKey: ["project", slug],
    queryFn: async () => {
      try {
        return await api.project(slug);
      } catch {
        return findFallbackProject(slug);
      }
    },
    placeholderData: findFallbackProject(slug),
  });
}

export function useSkillCategories() {
  return useResilientQuery<SkillCategory[]>(["skills"], api.skills, fallbackSkillCategories);
}

export function useExperience() {
  return useResilientQuery<Experience[]>(["experience"], api.experience, fallbackExperience);
}

export function useArchitectureTopics() {
  return useResilientQuery<ArchitectureTopic[]>(
    ["architecture"],
    api.architecture,
    fallbackArchitectureTopics,
  );
}

export function useCertifications() {
  return useResilientQuery<Certification[]>(
    ["certifications"],
    api.certifications,
    fallbackCertifications,
  );
}

export function useEducation() {
  return useResilientQuery<Education[]>(["education"], api.education, fallbackEducation);
}

/** Mutación de contacto — el 429 y demás errores se manejan en el formulario. */
export function useContactMutation() {
  return useMutation<ContactAccepted, Error, ContactInput>({
    mutationFn: (input) => api.contact(input),
  });
}
