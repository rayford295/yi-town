-- Our Album: the pictures, in every shelf (the main database yi-photos and yi-photos-shelf-N).
-- Apply to each: npx wrangler d1 execute <database> --remote --file worker/src/photos/pictures.sql -c worker/photos.toml
CREATE TABLE IF NOT EXISTS pictures (
  id    TEXT NOT NULL,
  size  TEXT NOT NULL,                 -- full | thumb
  bytes INTEGER NOT NULL,              -- length of data, so a shelf's fill is one cheap SUM
  data  BLOB NOT NULL,                 -- the JPEG; at most 2,000,000 bytes per row on D1
  PRIMARY KEY (id, size)
);
