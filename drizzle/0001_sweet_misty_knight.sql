CREATE TABLE "recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"raw" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venue_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"venue" text NOT NULL,
	"raw" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "recordings_recording_id_ts_idx" ON "recordings" USING btree ("recording_id","ts");--> statement-breakpoint
CREATE INDEX "venue_snapshots_recording_id_ts_idx" ON "venue_snapshots" USING btree ("recording_id","ts");