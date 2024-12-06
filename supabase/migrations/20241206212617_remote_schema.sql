alter table "public"."calls" drop constraint "calls_fk_transcriptions_fkey";

alter table "public"."analysis" drop column "extracted_num_beds";

alter table "public"."analysis" add column "num_avail_beds" smallint;

alter table "public"."analysis" add column "num_total_beds" smallint;

alter table "public"."analysis" disable row level security;

alter table "public"."calls" drop column "fk_transcriptions";

alter table "public"."calls" add column "fk_transcription_bot" bigint;

alter table "public"."calls" add column "fk_transcription_cbo" bigint;

alter table "public"."events" disable row level security;

alter table "public"."transcriptions" add column "isBot" boolean;

alter table "public"."calls" add constraint "calls_fk_transcription_bot_fkey" FOREIGN KEY (fk_transcription_bot) REFERENCES transcriptions(id) not valid;

alter table "public"."calls" validate constraint "calls_fk_transcription_bot_fkey";

alter table "public"."calls" add constraint "calls_fk_transcription_cbo_fkey" FOREIGN KEY (fk_transcription_cbo) REFERENCES transcriptions(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."calls" validate constraint "calls_fk_transcription_cbo_fkey";


