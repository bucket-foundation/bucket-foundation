alter table bucket.apple_revoke_pending add column if not exists seal_user_id uuid;

alter table bucket.apple_tokens drop constraint if exists apple_tokens_refresh_token_enc_check;
alter table bucket.apple_tokens add constraint apple_tokens_refresh_token_enc_check check (refresh_token_enc like 'v1.%' or refresh_token_enc like 'v2.%');
alter table bucket.apple_revoke_pending drop constraint if exists apple_revoke_pending_refresh_token_enc_check;
alter table bucket.apple_revoke_pending add constraint apple_revoke_pending_refresh_token_enc_check check (refresh_token_enc like 'v1.%' or refresh_token_enc like 'v2.%');
