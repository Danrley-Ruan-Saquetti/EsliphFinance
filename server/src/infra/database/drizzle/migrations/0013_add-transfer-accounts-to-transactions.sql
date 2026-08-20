ALTER TABLE "transactions" ALTER COLUMN "account_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "source_account_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "destination_account_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_account_id_accounts_id_fk" FOREIGN KEY ("source_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_destination_account_id_accounts_id_fk" FOREIGN KEY ("destination_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_source_account_id_index" ON "transactions" USING btree ("source_account_id");--> statement-breakpoint
CREATE INDEX "transactions_destination_account_id_index" ON "transactions" USING btree ("destination_account_id");