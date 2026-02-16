CREATE TABLE IF NOT EXISTS calendar_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_date date NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('journal', 'task', 'doc')),
  label text NOT NULL,
  file_path text,
  content_preview text,
  synced_at timestamptz DEFAULT now(),
  UNIQUE(item_date, item_type, label)
);
CREATE INDEX IF NOT EXISTS idx_calendar_items_date ON calendar_items(item_date);
