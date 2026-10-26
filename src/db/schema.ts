import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  bigint,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/** Media assets: uploaded videos, split clips, AI generations, renders */
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull().default("video"), // video | image | audio
    origin: text("origin").notNull().default("upload"), // upload | split | ai | render
    name: text("name").notNull(),
    path: text("path").notNull(), // relative to storage root
    thumbPath: text("thumb_path"),
    durationSeconds: real("duration_seconds"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("assets_origin_idx").on(t.origin)]
);

/** Editing / splitting projects */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("edit"), // edit | split
    status: text("status").notNull().default("draft"), // draft | processing | done | failed
    sourceAssetId: uuid("source_asset_id"),
    durationSeconds: real("duration_seconds"),
    width: integer("width"),
    height: integer("height"),
    quality: text("quality").default("1080p"),
    segmentSeconds: real("segment_seconds"),
    clipCount: integer("clip_count").default(0),
    timeline: jsonb("timeline").$type<Record<string, unknown>>().default({}),
    renderAssetId: uuid("render_asset_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("projects_kind_idx").on(t.kind)]
);

/** Serially numbered clips produced by the splitter */
export const clips = pgTable(
  "clips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => assets.id),
    serial: integer("serial").notNull(), // 1..N
    startSeconds: real("start_seconds").notNull(),
    endSeconds: real("end_seconds").notNull(),
    durationSeconds: real("duration_seconds").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("clips_project_idx").on(t.projectId)]
);

/** Async jobs: split, ai-video, ai-image, render */
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(), // split | ai-video | ai-image | render
    status: text("status").notNull().default("queued"), // queued | processing | done | failed
    progress: integer("progress").notNull().default(0),
    label: text("label").notNull().default(""),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
    result: jsonb("result").$type<Record<string, unknown>>().default({}),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("jobs_type_idx").on(t.type), index("jobs_status_idx").on(t.status)]
);

export type Asset = typeof assets.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Clip = typeof clips.$inferSelect;
export type Job = typeof jobs.$inferSelect;
