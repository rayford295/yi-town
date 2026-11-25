-- Our Album: one row per photo. The pictures are in R2 under full/<id>.jpg and thumb/<id>.jpg.
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
  uploaded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS photos_taken ON photos (taken_at);
