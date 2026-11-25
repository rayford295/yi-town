-- Our Album: one row per photo, in the main database (yi-photos).
-- Apply with: npx wrangler d1 execute yi-photos --remote --file worker/src/photos/schema.sql -c worker/photos.toml
CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,        -- sha-256 of the original file, first 32 hex digits
  taken_at    TEXT NOT NULL,           -- local wall-clock time, YYYY-MM-DDTHH:mm:ss
  date_source TEXT NOT NULL,           -- exif | file | manual
  lat         REAL,
  lng         REAL,
  place       TEXT,                    -- city name from OpenStreetMap, at upload
  caption_zh  TEXT,
  caption_en  TEXT,
  tags        TEXT NOT NULL DEFAULT '[]',  -- JSON array
  who         TEXT NOT NULL,           -- jingyi | yifan
  name        TEXT NOT NULL DEFAULT '',
  w           INTEGER NOT NULL,
  h           INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL,
  shelf       INTEGER NOT NULL DEFAULT 0   -- which database holds its pictures: 0 = this one, 1 = SHELF1, …
);
CREATE INDEX IF NOT EXISTS photos_taken ON photos (taken_at);
