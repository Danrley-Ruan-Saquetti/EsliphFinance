CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"account_group_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"initial_balance" bigint NOT NULL,
	"icon" varchar(60) NOT NULL,
	"color" char(7) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_account_group_id_account_groups_id_fk" FOREIGN KEY ("account_group_id") REFERENCES "public"."account_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_owner_id_index" ON "accounts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "accounts_account_group_id_index" ON "accounts" USING btree ("account_group_id");