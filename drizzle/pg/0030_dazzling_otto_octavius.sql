DROP INDEX "bing_credentials_user_idx";--> statement-breakpoint
CREATE INDEX "bing_credentials_user_idx" ON "bing_credentials" USING btree ("user_id");