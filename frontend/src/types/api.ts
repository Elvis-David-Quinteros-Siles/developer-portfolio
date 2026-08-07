/**
 * Tipos espejo de docs/DATABASE.md.
 * La API REST (go-api) expone JSON snake_case dentro del envelope {data, meta}.
 */

export interface Meta {
  request_id: string;
  timestamp: string;
}

export interface Envelope<T> {
  data: T;
  meta: Meta;
}

/** RFC 7807 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  headline: string;
  bio: string;
  photo_url: string | null;
  cv_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  email: string;
  location: string;
  philosophy: string;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  level: 1 | 2 | 3 | 4 | 5;
  years: number;
  description: string;
  display_order: number;
}

export interface SkillCategory {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  skills: Skill[];
}

export interface ProjectImage {
  id: string;
  url: string;
  caption: string;
  display_order: number;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  problem: string;
  solution: string;
  outcome: string;
  stack: string[];
  image_url: string | null;
  architecture_diagram_url: string | null;
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  featured: boolean;
  display_order: number;
  images?: ProjectImage[];
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  location: string;
  start_date: string;
  end_date: string | null;
  description: string;
  achievements: string[];
  tech: string[];
  display_order: number;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issue_date: string;
  expires_at: string | null;
  credential_id: string;
  credential_url: string | null;
  badge_url: string | null;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  start_date: string;
  end_date: string | null;
  description: string;
}

export interface ArchitectureTopic {
  id: string;
  slug: string;
  title: string;
  category: "patterns" | "infra" | "observability";
  description: string;
  diagram_url: string | null;
  display_order: number;
}

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  recaptcha_token?: string;
}

export interface ContactAccepted {
  id: string;
}

/** Tipos del blog (GraphQL — camelCase por convención graphene/strawberry). */
export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  tags: string[];
  publishedAt: string;
  readingMinutes: number;
}

export interface Post extends PostSummary {
  content: string;
}

export interface PostEdge {
  cursor: string;
  node: PostSummary;
}

export interface PostConnection {
  edges: PostEdge[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}
