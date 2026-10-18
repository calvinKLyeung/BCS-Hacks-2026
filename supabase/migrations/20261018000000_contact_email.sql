-- Sellers choose the email buyers should contact them at (shown only to signed-in users).
alter table listings add column if not exists contact_email text;
