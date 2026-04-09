# Archive Creation Workflow

**Version:** 1.0
**Date:** 2026-04-02
**Script:** `scripts/archive-workflow.js`
**Trigger:** Run manually whenever new paintings are added to the workbook.

---

## What this workflow does

Takes a new painting row in the workbook and produces, fully automatically:
1. A Supabase `paintings` row with all metadata and AI scores
2. A Supabase `painting_sessions` v1 row with the subject note
3. A Supabase `painting_images` row with the uploaded image
4. A published-ready blog post saved locally as Markdown AND written to `blog_posts` in Supabase
5. A revision note written back to the workbook confirming completion

---

## Prerequisites before running

### In the workbook (`painting-images/atelier_archive_seed_four_paintings_v2.xlsx`)
Each new painting row (in `Archive Import` sheet, after row 9) must have these fields filled:

| Field | Required | Notes |
|-------|----------|-------|
| `filename` | ✅ | Must match an image file in `painting-images/` folder |
| `slug` | ✅ | Lowercase, no spaces, unique. e.g. `lisbon_window` |
| `working_title` | ✅ | Current working title |
| `year` | ✅ | Four-digit year |
| `medium` | ✅ (as `location_series` or separate) | e.g. `Mixed-media Acrylic` |
| `size` | Recommended | e.g. `36x36 inches` |
| `sale_status` | ✅ | `Sold` or `Available` |
| `subject_note` | ✅ | What is depicted — used as session artist_note |
| `process_note` | Recommended | How it was built |
| `influence_refs` | Recommended | Personal references, travel, memory |
| `creative_notes` | Recommended | Artist's own raw reflections |
| `art_review_*` | Optional | If blank, AI generates from the image |

### Image file
- Place in `painting-images/` folder
- Filename must match the `filename` column exactly (case-sensitive)
- Accepted formats: `.jpg`, `.jpeg`, `.png` (any case)
- Minimum recommended size: 1000px on longest edge

### Environment
- `.env.local` must have `SUPABASE_SERVICE_KEY` and `ANTHROPIC_API_KEY` set
- Server does NOT need to be running — this script calls Claude and Supabase directly
- Python 3 with `openpyxl` must be installed (`pip3 install openpyxl`)

---

## How to run

```bash
# Process all new rows (not yet in Supabase):
node scripts/archive-workflow.js

# Dry run — shows what would be processed without writing anything:
node scripts/archive-workflow.js --dry-run

# Force reprocess a specific slug (even if already in Supabase):
node scripts/archive-workflow.js --force lisbon_window
```

---

## What the script does, step by step

```
Step 1 — Read workbook
  └── Python reads Archive Import sheet
  └── Returns all rows as JSON
  └── Skips rows missing slug or filename

Step 2 — Detect new rows
  └── For each row, checks if slug exists in Supabase paintings table
  └── Skips rows already present (unless --force flag)
  └── Reports: N new rows to process

Step 3 — For each new row:

  3a. Find image file
      └── Looks for filename in painting-images/ folder
      └── Tries .jpg / .jpeg / .png variants
      └── Aborts this row if not found

  3b. Upload image to Supabase Storage
      └── Resizes to 1200px wide (full) + 300px wide (thumb)
      └── Uploads to paintings/{slug}/full.jpg and thumb.jpg
      └── Stores public URL

  3c. Insert paintings row
      └── Maps workbook fields to Supabase columns
      └── Sets type = artist_work, artist = Satish
      └── Sets visibility: Sold → "sold", Available → "private"
      └── Stores medium, size, sale_status, location_series in tags[]
      └── Maps art_review_* to viewer_experience, practice_connection, appraisal_strengths
      └── Stores process_note → appraisal_develop
      └── Stores creative_notes + influence_refs → market_positioning

  3d. Insert painting_sessions row (v1)
      └── Sets version = 1, session_date = today
      └── Sets artist_note = subject_note from workbook

  3e. Insert painting_images row
      └── Links image_url to painting_slug with version_label "v1 — archive"

  3f. Run AI scoring (vision)
      └── Downloads image from Storage
      └── Sends to Claude with system prompt + scoring instructions
      └── Extracts 9 score dimensions + 6 bot scores from JSON response
      └── Updates paintings row with all scores + evaluated_at
      └── Updates painting_sessions v1 row with scores

  3g. Generate blog post
      └── Builds prompt from all workbook fields
      └── Sends to Claude Opus with ArtMind system prompt
      └── 350–500 word process journal in artist's voice

  3h. Save blog locally
      └── Writes to output/blogs/{slug}.md

  3i. Insert blog_posts row in Supabase
      └── status = "draft", visibility = "private"
      └── Includes word_count, reading_minutes, generated_by

  3j. Update workbook
      └── Writes revision_note: "Archive workflow completed — {date}"
      └── Writes revision_timestamp: ISO datetime
      └── Saves workbook in place

Step 4 — Print summary report
  └── Rows processed / skipped / failed
  └── Scores for each painting
  └── Blog word counts
  └── Local files written
```

---

## Output locations

| Output | Location |
|--------|----------|
| Painting image (full) | Supabase Storage: `paintings/{slug}/full.jpg` |
| Painting image (thumb) | Supabase Storage: `paintings/{slug}/thumb.jpg` |
| Blog post (local) | `output/blogs/{slug}.md` |
| Blog post (app) | Supabase `blog_posts` table, status=draft |
| Scores | Supabase `paintings` + `painting_sessions` tables |
| Revision note | Workbook column `revision_note` + `revision_timestamp` |

---

## Column mapping: workbook → Supabase

| Workbook | Supabase column | Table |
|----------|----------------|-------|
| slug | slug | paintings |
| working_title | title | paintings |
| year | year | paintings |
| sale_status (Sold) | visibility = "sold" | paintings |
| sale_status (Available) | visibility = "private" | paintings |
| medium + size + sale_status + location_series | tags[] | paintings |
| art_review_composition + colour + space + surface | viewer_experience | paintings |
| art_review_mood | practice_connection | paintings |
| art_review_overall | appraisal_strengths | paintings |
| process_note | appraisal_develop | paintings |
| creative_notes + influence_refs | market_positioning | paintings |
| subject_note | artist_note | painting_sessions |

---

## Idempotency rules

- The script will **never reprocess** a slug already in Supabase (unless `--force`)
- The script will **never overwrite** filled workbook cells (only writes revision_note + revision_timestamp)
- Running the script twice on the same workbook is safe
- If a step fails mid-row, the row is skipped and a warning is printed; no partial data is left

---

## Adding new paintings — checklist

```
□ Add row to workbook Archive Import sheet (after last row)
□ Fill: filename, slug, working_title, year, sale_status, subject_note
□ Recommended: process_note, influence_refs, creative_notes, medium, size
□ Place image file in painting-images/ with matching filename
□ Run: node scripts/archive-workflow.js
□ Check output summary for any errors
□ Review draft blog in app Writing tab
□ Edit blog if needed, then Publish from app
```

---

## Future automation options

Once this workflow is stable, it can be triggered by:
- **File watcher**: detect new image dropped in `painting-images/` → auto-run
- **Cron job**: run nightly, process any new workbook rows
- **GitHub Action**: commit new image + workbook → CI runs workflow
- **Airtable/Notion webhook**: replace xlsx with a live database, trigger on new row

---

## Known limitations (v1.0)

- Scores are AI-estimated from image, not computed via the full ArtMind saliency pipeline
- Blog is a first draft — always review before publishing
- Medium and size are stored as free-text tags, not structured fields
- No de-duplication check on blog_posts (running --force generates a second draft)
