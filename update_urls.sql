-- Connect to your database using psql
-- psql -h hostname -U username -d database_name

-- Set the old and new bucket URLs
-- \set old_bucket_url '\'https://mvc-dev.nyc3.digitaloceanspaces.com\''
-- \set old_bucket_url '\'https://mvc-dev.s3.us-east-005.backblazeb2.com\''
\set old_bucket_url '\'https://mvcdev.s3.us-east-005.backblazeb2.com\''
-- \set old_bucket_url '\'https://s3.us-east-005.backblazeb2.com/mvc-dev\''
-- \set new_bucket_url '\'https://s3.us-east-005.backblazeb2.com/mvcdev\''
\set new_bucket_url '\'https://mvcdevcdn.represent.org\''

-- Update main file URLs
UPDATE files
SET url = REPLACE(url, :old_bucket_url, :new_bucket_url)
WHERE url LIKE :old_bucket_url || '%';

-- Update thumbnail URLs in the formats JSON field
UPDATE files
SET formats = jsonb_set(
  formats,
  '{thumbnail,url}',
  to_jsonb(REPLACE(formats#>>'{thumbnail,url}', :old_bucket_url, :new_bucket_url)),
  true
)
WHERE formats ? 'thumbnail';

UPDATE files
SET formats = jsonb_set(
  formats,
  '{small,url}',
  to_jsonb(REPLACE(formats#>>'{small,url}', :old_bucket_url, :new_bucket_url)),
  true
)
WHERE formats ? 'small';

UPDATE files
SET formats = jsonb_set(
  formats,
  '{medium,url}',
  to_jsonb(REPLACE(formats#>>'{medium,url}', :old_bucket_url, :new_bucket_url)),
  true
)
WHERE formats ? 'medium';

UPDATE files
SET formats = jsonb_set(
  formats,
  '{large,url}',
  to_jsonb(REPLACE(formats#>>'{large,url}', :old_bucket_url, :new_bucket_url)),
  true
)
WHERE formats ? 'large';

-- Verify the updates
SELECT id, url, formats 
FROM files 
WHERE url LIKE :new_bucket_url || '%'
LIMIT 5;
