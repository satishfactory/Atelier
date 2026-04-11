# Public View — Integration Guide

## What this adds

When someone visits **atelier.satishfactory.com** without being logged in,
they now see a beautiful public-facing version of your studio:

- **Gallery** — finished paintings + masterpieces, with filter buttons
- **Journal** — published blog posts (first 300 chars previewed)
- **Influences** — the masterpiece reference list

Every "deeper" action (click a painting, read full post, view analysis)
triggers a **login prompt**: an elegant modal that explains the space
and offers "Sign in" or "Request access via email".

---

## Files to copy into your project

| File | Where it goes |
|------|--------------|
| `PublicView.jsx` | `src/components/` |
| `PublicGallery.jsx` | `src/components/` |
| `PublicBlog.jsx` | `src/components/` |
| `LoginPrompt.jsx` | `src/components/` |
| `public.css` | `src/components/` |

---

## Step 1 — Copy the files

```bash
cp PublicView.jsx PublicGallery.jsx PublicBlog.jsx LoginPrompt.jsx public.css \
  ~/Projects/atelier/src/components/
```

---

## Step 2 — Import the CSS in PublicView.jsx

Already done — `import './public.css'` is in PublicView.jsx.

---

## Step 3 — Update App.jsx

Open `~/Projects/atelier/src/App.jsx`.

Find the block that handles "no session" (usually showing LoginScreen).
Replace it with:

```jsx
// At top of file, add:
import PublicView from './components/PublicView';

// In your App() function, replace the no-session branch:
if (!session) {
  if (showLogin) {
    return <LoginScreen onSuccess={...} onBack={() => setShowLogin(false)} />;
  }
  return <PublicView onLogin={() => setShowLogin(true)} />;
}
```

See `App-public-wiring.jsx` for the full pattern.

---

## Step 4 — Run the SQL in Supabase

1. Go to your Supabase project (Mantra)
2. Click **SQL Editor** in the left sidebar
3. Paste the contents of `supabase-rls-public.sql`
4. Click **Run**

This allows unauthenticated users to read:
- `paintings` where `status = 'finished'` or `'masterpiece'`
- `blog_posts` where `published = true`

Everything else (sessions, evaluations, WIP work) stays private.

---

## Step 5 — Mark blog posts as published

In Supabase → Table Editor → `blog_posts`:
Toggle `published = true` on any posts you want visible.

Or in SQL:
```sql
UPDATE blog_posts SET published = true WHERE title = 'Your Post Title';
```

---

## Step 6 — Test locally

```bash
# Terminal 1
npm run dev

# Terminal 2
node server.js
```

Open an incognito window → `localhost:5173`
You should see the public view with gallery/journal/influences tabs.

---

## What stays private (never shown publicly)

- WIP paintings
- Companion evaluations and AI conversations
- Session history and journal notes
- Studio state and score history
- Unpublished blog posts
- Artist profile data

---

## Updating the login prompt email

In `LoginPrompt.jsx`, line with `mailto:` — change to your email:
```jsx
<a href="mailto:satish@satishfactory.com">
```

