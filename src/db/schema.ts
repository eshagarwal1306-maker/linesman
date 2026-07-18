import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const network = pgEnum("network", ["devnet", "mainnet"]);

export const setupState = pgEnum("setup_state", [
  "guest_created",
  "subscribed",
  "activated",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletPublicKey: text("wallet_public_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const walletNonces = pgTable("wallet_nonces", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletPublicKey: text("wallet_public_key").notNull(),
  nonceHash: text("nonce_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const txlineCredentials = pgTable(
  "txline_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    network: network("network").notNull(),
    encryptedJwt: text("encrypted_jwt").notNull(),
    encryptedApiToken: text("encrypted_api_token"),
    subscriptionTxSignature: text("subscription_tx_signature"),
    serviceLevelId: integer("service_level_id"),
    durationWeeks: integer("duration_weeks"),
    setupState: setupState("setup_state").notNull(),
    subscriptionCreatedAt: timestamp("subscription_created_at", {
      withTimezone: true,
    }),
    guestJwtExpiresAt: timestamp("guest_jwt_expires_at", {
      withTimezone: true,
    }).notNull(),
    subscriptionExpiresAt: timestamp("subscription_expires_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("txline_credentials_user_id_network_unique").on(
      table.userId,
      table.network,
    ),
    check(
      "txline_credentials_duration_weeks_check",
      sql`(${table.setupState} = 'guest_created' AND ${table.durationWeeks} IS NULL)
        OR (${table.setupState} IN ('subscribed', 'activated')
          AND ${table.durationWeeks} IS NOT NULL
          AND ${table.durationWeeks} = 4)`,
    ),
    check(
      "txline_credentials_service_level_check",
      sql`(${table.setupState} = 'guest_created' AND ${table.serviceLevelId} IS NULL)
        OR (${table.setupState} IN ('subscribed', 'activated')
          AND ${table.network} = 'devnet'
          AND ${table.serviceLevelId} IS NOT NULL
          AND ${table.serviceLevelId} = 1)
        OR (${table.setupState} IN ('subscribed', 'activated')
          AND ${table.network} = 'mainnet'
          AND ${table.serviceLevelId} IS NOT NULL
          AND ${table.serviceLevelId} IN (1, 12))`,
    ),
  ],
);

/**
 * Raw TxLINE SSE packets, recorded verbatim (zero transformation on write —
 * the replay engine decodes on read). Powers the Replay tab + Showcase mode
 * once `pnpm record` has captured a live session.
 */
export const recordings = pgTable(
  "recordings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordingId: text("recording_id").notNull(),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
    kind: text("kind").notNull(), // "odds" | "score" | "heartbeat"
    raw: jsonb("raw").notNull(),
  },
  (table) => [
    index("recordings_recording_id_ts_idx").on(table.recordingId, table.ts),
  ],
);

/** Venue price polls captured alongside a recording so replay can reproduce both sides of the gap. */
export const venueSnapshots = pgTable(
  "venue_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordingId: text("recording_id").notNull(),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
    venue: text("venue").notNull(),
    raw: jsonb("raw").notNull(),
  },
  (table) => [
    index("venue_snapshots_recording_id_ts_idx").on(table.recordingId, table.ts),
  ],
);
