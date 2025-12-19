## Admin Panel setup

This project uses **DB-stored roles**: `admin` / `manager` / `user`.

Roles are stored in `public.user_roles` (migration `015_admin_roles.sql`).

### Assign a role

1) Find the Supabase Auth user id (`auth.users.id`) for a Telegram user:

```sql
select id as telegram_profile_id,
       telegram_id,
       telegram_username,
       auth_user_id
from public.telegram_profiles
where telegram_id = 123456789; -- <-- your telegram id
```

2) Grant role:

```sql
insert into public.user_roles (user_id, role)
values ('<AUTH_USER_ID_UUID>', 'admin')
on conflict (user_id) do update set role = excluded.role;
```

Valid roles: `user`, `manager`, `admin`.

### Smoke checks

- Build:

```bash
npm run build
bash scripts/audit-env-usage.sh
```

- Manage roles via UI:
  - Open `/admin/users` (admin only)
  - Use the role dropdown in the “Действия” column
  - Confirm the change

- Check audit log:
  - Call `GET /api/admin/audit?limit=50&offset=0` as admin (should return recent actions)

- Admin APIs (expected statuses):

```bash
# unauthenticated
curl -i http://localhost:3000/api/admin/overview   # 401
curl -i http://localhost:3000/api/admin/sales      # 401
curl -i http://localhost:3000/api/admin/referrals  # 401

# authenticated as manager (Telegram session cookie):
# - /api/admin/content/meta -> 200
# - /api/admin/overview/sales/referrals -> 403

# authenticated as admin:
# - /api/admin/overview -> 200
# - /api/admin/sales -> 200
# - /api/admin/referrals -> 200
# - /api/admin/users -> 200
# - /api/admin/audit -> 200
```


