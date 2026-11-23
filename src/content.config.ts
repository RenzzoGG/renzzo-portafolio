import { defineCollection, type SchemaContext } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { ACCENTS } from "./lib/accents.ts";

const text = z.string().trim().min(1);
const stack = z.array(text).min(1);

const links = z.strictObject({
  live: z.url({ protocol: /^https$/ }),
  source: z.url({ protocol: /^https$/ }),
  landing: z.url({ protocol: /^https$/ }).optional(),
  landingSource: z.url({ protocol: /^https$/ }).optional(),
});

const projectSchema = ({ image }: SchemaContext) => {
  const screenshot = z.strictObject({
    src: image(),
    alt: text,
    caption: text.optional(),
  });

  const projectBase = {
    title: text,
    type: text,
    order: z.number().int().positive(),
    links,
    stack,
    summary: text,
    cvLine: text.optional(),
    disclaimer: text.optional(),
    screenshots: z.array(screenshot).min(1),
  };

  return z.discriminatedUnion("tier", [
    z.strictObject({
      ...projectBase,
      tier: z.literal("featured"),
      accent: z.enum(ACCENTS),
      oneLiner: text,
      stats: z.array(text).min(1),
      caseStudy: z.array(z.strictObject({ label: text, text })).min(1),
    }),
    z.strictObject({
      ...projectBase,
      tier: z.literal("more"),
      accent: z.enum(ACCENTS).optional(),
    }),
  ]);
};

const projects = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/projects" }),
  schema: projectSchema,
});

const skills = defineCollection({
  loader: file("src/content/skills.yaml"),
  schema: z.strictObject({
    id: text,
    group: text,
    order: z.number().int().positive(),
    items: z.array(text).min(1),
  }),
});

const experience = defineCollection({
  loader: file("src/content/experience.yaml"),
  schema: z.strictObject({
    id: text,
    kind: z.enum(["education", "work"]),
    title: text,
    titleEs: text.optional(),
    organization: text,
    status: text,
    order: z.number().int().positive(),
  }),
});

const certifications = defineCollection({
  loader: file("src/content/certifications.yaml"),
  schema: z.strictObject({
    id: text,
    title: text,
    issuer: text,
    url: z.url({ protocol: /^https$/ }),
    onCv: z.boolean(),
    order: z.number().int().positive(),
  }),
});

const services = defineCollection({
  loader: file("src/content/services.yaml"),
  schema: z.strictObject({
    id: text,
    title: text,
    text,
    stack,
    order: z.number().int().positive(),
  }),
});

const profile = defineCollection({
  loader: file("src/content/profile.yaml"),
  schema: z.strictObject({
    id: z.literal("main"),
    name: text,
    role: text,
    heroStack: text,
    hero: z.strictObject({ headline: text, subline: text }),
    cvRole: text,
    location: text,
    remote: text,
    languages: text,
    domain: text,
    about: text,
    cvSummary: text,
    meta: z.strictObject({
      title: text,
      description: text,
      ogDescription: text,
      ogImageAlt: text,
    }),
    degree: z.strictObject({ en: text, es: text }),
    servicesLink: z.strictObject({ label: text, href: text }),
    platzi: z.strictObject({
      label: text,
      url: z.url({ protocol: /^https$/ }),
    }),
    contact: z.strictObject({
      heading: text,
      intro: text,
      links: z
        .array(
          z.strictObject({
            label: text,
            value: text,
            href: text,
            download: z.boolean().optional(),
          }),
        )
        .min(1),
    }),
    footer: text,
    ui: z.strictObject({
      skipLink: text,
      nav: z.array(z.strictObject({ label: text, href: text })).min(1),
      heroActions: z.strictObject({ primary: text, secondary: text }),
      headings: z.strictObject({
        about: text,
        work: text,
        more: text,
        skills: text,
        education: text,
        certifications: text,
        services: text,
        cv: text,
      }),
      workIndex: text,
      facts: z.strictObject({ location: text, work: text, languages: text }),
      project: z.strictObject({
        live: text,
        source: text,
        landing: text,
        landingSource: text,
        details: text,
      }),
      cvActions: z.strictObject({ download: text, view: text }),
      cvHeadings: z.strictObject({
        summary: text,
        skills: text,
        projects: text,
        education: text,
        certifications: text,
      }),
      motion: z.strictObject({ label: text, on: text, off: text }),
      tilt: z.strictObject({ label: text, on: text, off: text }),
      newTab: text,
    }),
  }),
});

export const collections = {
  projects,
  skills,
  experience,
  certifications,
  services,
  profile,
};
