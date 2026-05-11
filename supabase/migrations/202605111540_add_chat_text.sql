alter table public."Chat"
  add column if not exists "text" text;

update public."Chat"
set "text" = coalesce("text", "last_message", "title")
where "text" is null;
