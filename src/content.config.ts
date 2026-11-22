import { existsSync } from "node:fs";
import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { ACCENTS } from "./lib/accents.ts";

const text = z.string().trim().min(1);
const stack = z.array(text).min(1);

const screenshot = z
  .strictObject({
    base: z.string().regex(/^\/img\/projects\/[a-z0-9-]+$/),
    widths: z.array(z.number().int().positive()).min(1),
    alt: text,
    caption: text.optional(),
  })
  .superRefine(({ base, widths }, context) => {
    for (const width of widths) {
      for (const format of ["avif", "webp"]) {
        const path = `public${base}-${width}.${format}`;
        if (!existsSync(path)) {
          context.addIssue({ code: "custom", message: `Missing ${path}` });
        }
      }
    }
  });

const links = z.strictObject({
  live: z.url({ protocol: /^https$/ }),
  source: z.url({ protocol: /^https$/ }),
  landing: z.url({ protocol: /^https$/ }).optional(),
  landingSource: z.url({ protocol: /^https$/ }).optional(),
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
  screenshots: z.array(screenshot),
};

const featuredProject = z.strictObject({
  ...projectBase,
  tier: z.literal("featured"),
  accent: z.enum(ACCENTS),
  stats: z.array(text).min(1),
  caseStudy: z.array(z.strictObject({ label: text, text })).min(1),
});

const moreProject = z.strictObject({
  ...projectBase,
  tier: z.literal("more"),
  accent: z.enum(ACCENTS).optional(),
});

const projects = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/projects" }),
  schema: z.discriminatedUnion("tier", [featuredProject, moreProject]),
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
    tagline: text,
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
