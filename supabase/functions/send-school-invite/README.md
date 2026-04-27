## send-school-invite

Supabase Edge Function that sends School invite emails after invite records are created.

### Required secrets

Set these in Supabase:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set INVITE_FROM_EMAIL="The Teachers Room <onboarding@your-domain.com>"
supabase secrets set APP_BASE_URL="https://www.theteachersroom.app/profile"
```

`APP_BASE_URL` is optional if the frontend provides `appUrl`, but recommended.

### Deploy

```bash
supabase functions deploy send-school-invite --project-ref xsefgwhywcuzfnawtyru
```

### Notes

- The function verifies caller auth and checks school-admin access via `current_user_is_school_admin`.
- It uses Resend REST API directly.
- Invite creation still happens in Postgres RPC; this function handles delivery only.
