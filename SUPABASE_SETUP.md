# Supabase setup for Notify

Identity is Supabase Auth; the database is Supabase PostgreSQL. This is the
configuration that lives in the dashboard rather than in the repository.

Run `python -m backend.seed.verify_supabase` at any point — it reports the
current email configuration and then exercises the whole stack.

---

## 1. Fixing `429 over_email_send_rate_limit` on sign-up

**Symptom**

```
POST /auth/v1/signup 429 (Too Many Requests)
{"code":429,"error_code":"over_email_send_rate_limit","msg":"email rate limit exceeded"}
```

**Cause** — the project is using Supabase's *built-in* email service. It allows
only a couple of messages an hour and Supabase documents it as suitable for
testing only. Every sign-up sends a confirmation email, so after two or three
attempts sign-up starts failing.

**Nothing is left half-done.** The limit is checked before the account is
created, so a 429 means no `auth.users` row and no profile. Retrying later is
safe and needs no cleanup.

Pick one of the two fixes below.

### Option A — turn off email confirmation (fastest, development only)

Dashboard → **Authentication → Providers → Email** → untick **Confirm email** → Save.

Sign-up then returns a session immediately and sends no email at all, so the
limit cannot be reached. The application already handles both modes: with
confirmation off it completes the account and goes straight to the dashboard;
with it on it shows the "check your email" screen.

Turn it back on before real users sign up — without it, anyone can register an
address they do not own.

### Option B — use Brevo SMTP (correct for production)

Dashboard → **Authentication → Emails → SMTP Settings** → enable **Custom SMTP**.

Get the credentials from **Brevo → SMTP & API → SMTP**. The password is a
generated **SMTP key**, not your Brevo account password, and the login normally
looks like `9xxxxx001@smtp-brevo.com`.

| Field | Value |
|---|---|
| Host | `smtp-relay.brevo.com` |
| Port | `587` (or `2525` if 587 is blocked) |
| Username | *your Brevo SMTP login* |
| Password | *your Brevo SMTP key* |
| Sender email | `no-reply@notify.co.rw` |
| Sender name | `Notify Kigali` |

The sender address must be verified in **Brevo → Senders, Domains & Dedicated
IPs**, otherwise Brevo refuses the message. Verifying the whole domain (with the
DKIM/SPF records Brevo gives you) is worth doing — it also keeps the mail out of
spam folders.

Then raise **Rate limit for sending emails** under
Authentication → Rate Limits (the default of 30/hour is usually plenty).

> Connectivity to `smtp-relay.brevo.com` was checked from this machine: both 587
> and 2525 answer, advertise STARTTLS and accept PLAIN/LOGIN authentication.

### The application's own email

The steps above cover **account** email — confirmation and password reset, which
Supabase Auth sends. Rent reminders, lease notices and receipts are sent by the
backend, and are configured separately in `backend/.env`:

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your-brevo-smtp-login>
SMTP_PASSWORD=<your-brevo-smtp-key>
```

Until the key is set the backend stays in simulated mode: messages are logged
and reported as `simulated` rather than silently dropped. Check it with:

```bash
python -m backend.scripts.test_email you@example.com
```

It prints the configuration it is using, sends a real message, and explains the
usual failures (wrong key, unverified sender, blocked port) instead of just
showing an SMTP traceback.

---

## 1b. Fixing `500 Error sending confirmation email`

**Symptom**

```
POST /auth/v1/signup 500 (Internal Server Error)
{"code":"unexpected_failure","message":"Error sending confirmation email"}
```

A 500 rather than a 429 means custom SMTP *is* switched on — Supabase tried to
send and the mail server refused it. The account is not created.

**First, prove where the fault is.** The backend uses the same Brevo credentials,
so test them independently:

```bash
python -m backend.scripts.test_email you@example.com
```

* **That fails too** → the credentials or the sender are wrong. The command says
  which.
* **That succeeds** → the credentials are fine and the wrong values are the ones
  stored in the Supabase dashboard. Go through the table below field by field.

**Read the real error.** Supabase records the SMTP rejection verbatim:
Dashboard → **Logs → Auth Logs**, then filter for the failed sign-up. That line
names the cause exactly, rather than leaving you guessing.

**Read the SMTP code in the auth log — it points straight at the cause.**

| Code in the auth log | Cause | Fix |
|---|---|---|
| `535 5.7.8 Authentication failed` | The username or the key is wrong | See below — this is the common one |
| `525 5.7.1 Unauthorized IP address` | Brevo's IP allowlist is on and Supabase is not on it | See below |
| `550` / `553` | Sender refused | Verify it under Brevo → Senders, Domains & Dedicated IPs |
| `504 Gateway Timeout` (no SMTP code) | The connection hung rather than being refused | See below |
| `dial tcp` / timeout | Wrong host or port | `smtp-relay.brevo.com`, port `587` |
| `x509` / TLS error | Port and encryption mismatch | `587` uses STARTTLS; `465` uses implicit TLS |

**`535` in detail.** Brevo has two credentials that look interchangeable and are
not:

* the **username** is the SMTP login, `…@smtp-brevo.com` — *not* the email
  address you sign in to Brevo with;
* the **password** is the SMTP key from SMTP & API → **SMTP**, starting
  `xsmtpsib-` — *not* your account password, and *not* the v3 API key, which
  starts `xkeysib-`.

Either one wrong produces exactly `535 5.7.8 Authentication failed`, as does a
key that lost characters when it was pasted. Trailing whitespace does *not*
cause it — Brevo tolerates that — so a 535 means the value is genuinely wrong,
not merely untidy.

If the key has been regenerated in Brevo since it was pasted into Supabase, the
old one stops working while the copy in `backend/.env` keeps working. That
mismatch looks exactly like this.

The values in `backend/.env` are the ones proven to authenticate; copy
`SMTP_USER` and `SMTP_PASSWORD` from there into the dashboard verbatim.

**`525` in detail — this one means you are nearly there.** A 525 is only
reachable *after* a successful login, so seeing it is proof the credentials are
finally right. Brevo has an **Authorized IPs** feature that restricts which
machines may relay through SMTP, and Supabase's servers are not on the list.

Brevo emails you whenever an unknown IP tries to connect, with a link to
authorize it — that alert is the quickest way through.

Brevo has no on/off switch for this. The restriction is active whenever the
authorized list is non-empty, so you control it by what you put in the
**Authorize IP addresses** box (Brevo → SMTP & API → SMTP → Authorized IPs).

Two workable answers:

* **Paste the exact IP** that Brevo blocked — it is named in the alert email it
  sent you. Least privilege, but Supabase sends from AWS addresses that are not
  published as a stable list, so it can stop working without warning and need
  re-adding.
* **Paste `0.0.0.0/0` and `::/0`** to allow any address. This restores Brevo's
  default posture: accounts start with no IP restriction at all, and the SMTP
  key remains the thing that actually authenticates. Choose this if you would
  rather not be paged the next time Supabase moves.

Emptying the list entirely has the same effect as the second option, if the UI
lets you remove every entry.

**`504` in detail.** A 504 carries no SMTP code because nothing answered: the
connection hung until Supabase's gateway gave up. Two things cause that.

* **The IP allowlist is still blocking, but silently.** A firewall that refuses
  gives you `525`; one that drops gives you a timeout. If the previous error was
  `525`, assume the allowlist is still the problem and finish turning it off.
* **Port and encryption disagree.** `465` expects TLS from the first byte;
  `587` and `2525` start in the clear and upgrade with STARTTLS. Pairing `465`
  with STARTTLS hangs instead of failing, which looks exactly like this.

Brevo answers on all three ports, so any correct pairing is fine. The backend
picks the right mode automatically from the port number.

A key regenerated in Brevo invalidates the previous one everywhere. If sign-up
starts working but rent reminders stop, the new key reached the Supabase
dashboard but not `backend/.env` — put the same key in both, then confirm with
`python -m backend.scripts.test_email you@example.com`.

**Values verified working from this project** — the same ones that sent
successfully from the backend:

| Supabase field | Value |
|---|---|
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | your `…@smtp-brevo.com` SMTP login |
| Password | your `xsmtpsib-…` SMTP key |
| Sender email | a sender verified in Brevo |
| Sender name | `Notify App` |

Every field must be re-entered and **saved** — Supabase does not always keep a
partially filled form, and a blank sender address alone will produce this 500.

---

## 2. Redirect URLs

Dashboard → **Authentication → URL Configuration**.

* **Site URL**: `http://localhost:3000`
* **Redirect URLs**: add both of
  * `http://localhost:3000/verify-email`
  * `http://localhost:3000/reset-password`

Without these the links in the confirmation and password-reset emails bounce.
Add the production origin the same way when you deploy.

---

## 3. Roles

A role is never taken from the browser at face value.

* The sign-up form puts its choice in `user_metadata.requested_role`.
* The `handle_new_auth_user` trigger reads it but **clamps it to `LANDLORD` or
  `TENANT`** — the two roles anyone may choose for themselves.
* `SYSTEM_ADMIN` comes only from `app_metadata`, which requires the service-role
  key, so it can be granted only by the backend or from the dashboard.
* `profiles.role` is protected by the `guard_profile_privileges` trigger: a
  client (PostgREST `authenticated`/`anon`) cannot change its own role or status.

To make someone an administrator:

```sql
-- Supabase SQL editor
update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"SYSTEM_ADMIN"}'::jsonb
 where email = 'someone@example.com';
```

The `on_auth_user_updated` trigger copies it to `public.profiles` immediately.

---

## 4. Applying the schema

| File | When |
|---|---|
| `supabase_v2_migration.sql` | A fresh project. **Destructive** — drops every table in `public` first. |
| `supabase_v2_patch.sql` | An existing v2 database. Idempotent and safe to re-run. |

Then seed and verify:

```bash
# from the project root, not from backend/
python -m backend.seed.supabase_seed --apply     # add --reset to start clean
python -m backend.seed.verify_supabase
```

Test accounts, all with password `NotifyTest123!`:

| Email | Role |
|---|---|
| `admin@notify.test` | SYSTEM_ADMIN |
| `landlord@notify.test` | LANDLORD |
| `tenant@notify.test` | TENANT |
| `landlord2@notify.test` | LANDLORD (exists to prove isolation between landlords) |

---

## 5. Keys

* `SUPABASE_ANON_KEY` is publishable. It belongs in the browser bundle and is
  useless on its own, because Row Level Security denies the `anon` role
  everything.
* `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely and can mint a session for
  any account. Backend only. It must never appear in `frontend/`, in a
  `VITE_*` variable, or in a commit.
