# Auth user lookup rollback

Run against the database that took `20261123160000_auth_user_by_email.sql`. The session route falls back to paging `listUsers` and a non-atomic metadata update once the functions are gone.

```sql
drop function if exists bucket.auth_user_by_email(text);
drop function if exists bucket.bind_google_sub(uuid, text);
```
