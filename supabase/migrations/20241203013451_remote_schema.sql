alter table "public"."calls" drop column "bot_transcription";

alter table "public"."calls" drop column "cbo_transcription";

alter table "public"."calls" drop column "extracted_data";

alter table "public"."calls" add column "fk_transcriptions" bigint;

alter table "public"."transcriptions" disable row level security;

alter table "public"."calls" add constraint "calls_fk_transcriptions_fkey" FOREIGN KEY (fk_transcriptions) REFERENCES transcriptions(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."calls" validate constraint "calls_fk_transcriptions_fkey";


