-- Atelier — pgvector migration
-- Run in Supabase SQL editor before using "Find similar paintings"
-- Safe to re-run (all statements are idempotent)

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to paintings
ALTER TABLE paintings ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Similarity search function
CREATE OR REPLACE FUNCTION similar_paintings(
  query_embedding vector(1536),
  exclude_slug    text,
  match_count     int DEFAULT 3
)
RETURNS TABLE (
  slug          text,
  title         text,
  image_url     text,
  score_overall smallint,
  artist        text,
  status        text,
  similarity    float8
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.slug, p.title, p.image_url, p.score_overall, p.artist, p.status,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM paintings p
  WHERE p.slug    != exclude_slug
    AND p.embedding IS NOT NULL
    AND p.type     = 'artist_work'
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
