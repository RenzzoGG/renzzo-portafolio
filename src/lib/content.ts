import { getCollection, getEntry, type CollectionEntry } from "astro:content";

type Project = CollectionEntry<"projects">;
export type FeaturedProject = Project & {
  data: Extract<Project["data"], { tier: "featured" }>;
};
export type MoreProject = Project & {
  data: Extract<Project["data"], { tier: "more" }>;
};

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) =>
  a.data.order - b.data.order;

export async function getProfile() {
  const entry = await getEntry("profile", "main");
  if (!entry) throw new Error("Missing profile entry");
  return entry.data;
}

export async function getProjects() {
  const projects = (await getCollection("projects")).sort(byOrder);
  return {
    all: projects,
    featured: projects.filter(
      (project): project is FeaturedProject => project.data.tier === "featured",
    ),
    more: projects.filter(
      (project): project is MoreProject => project.data.tier === "more",
    ),
  };
}

export const getSkills = async () =>
  (await getCollection("skills")).sort(byOrder);

export const getEducation = async () =>
  (await getCollection("experience"))
    .filter((item) => item.data.kind === "education")
    .sort(byOrder);

export const getCertifications = async () =>
  (await getCollection("certifications")).sort(byOrder);

export const getServices = async () =>
  (await getCollection("services")).sort(byOrder);

/** "Stocktill — Multi-Store POS…" becomes "Stocktill". */
export const shortTitle = (title: string) => title.split(" — ")[0] ?? title;

/** The CV download link, defined once in the profile. */
export function getCvLink(profile: Awaited<ReturnType<typeof getProfile>>) {
  const link = profile.contact.links.find((item) => item.download);
  if (!link) throw new Error("Profile needs a contact link with download");
  return link;
}

export interface CvProject {
  id: string;
  title: string;
  type: string;
  text: string;
  stack: string[];
  links: { label: string; href: string; display?: string }[];
}

/**
 * Projects as the CV lists them. Entries that share a repo and a cvLine
 * (UIFlow's landing and dashboard) merge into one item.
 */
export function toCvProjects(
  projects: Project[],
  labels: { source: string; landing: string },
): CvProject[] {
  const withLine = projects.filter((project) => project.data.cvLine);
  const items: CvProject[] = [];
  const seen = new Set<string>();

  for (const project of withLine) {
    const { data } = project;
    if (seen.has(data.links.source)) continue;
    seen.add(data.links.source);

    const siblings = withLine.filter(
      (other) => other.data.links.source === data.links.source,
    );
    const primary =
      siblings.find((other) => other.data.type === "Web app") ?? project;
    const sibling = siblings.find((other) => other !== primary);
    const landing = primary.data.links.landing ?? sibling?.data.links.live;

    const line = primary.data.cvLine ?? "";
    const combined = /^(.+?) — (.+?): (.+)$/.exec(line);

    items.push({
      id: primary.id,
      title: combined?.[1] ?? primary.data.title,
      type: combined?.[2] ?? primary.data.type,
      text: combined?.[3] ?? line,
      stack: primary.data.stack,
      links: [
        {
          label: "Live",
          href: primary.data.links.live,
          display: primary.data.links.live.replace(/^https:\/\//, ""),
        },
        ...(landing ? [{ label: labels.landing, href: landing }] : []),
        { label: labels.source, href: primary.data.links.source },
      ],
    });
  }
  return items;
}
