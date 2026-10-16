CREATE TABLE visit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target TEXT NOT NULL,
  title TEXT NOT NULL,
  visited_at INTEGER NOT NULL,
  visitor_key TEXT NOT NULL,
  ip TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT ''
);
CREATE INDEX visit_events_time ON visit_events(visited_at);
CREATE INDEX visit_events_dedupe ON visit_events(visitor_key, target, visited_at);
CREATE INDEX visit_events_target ON visit_events(target, id);
CREATE INDEX visit_events_ip ON visit_events(ip, id);
CREATE TABLE view_totals (
  target TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0
);
-- The insert and aggregate update are atomic, including concurrent requests.
-- Expiring detailed records does not change lifetime totals.
CREATE TRIGGER visit_events_count AFTER INSERT ON visit_events BEGIN
  INSERT INTO view_totals(target, title, views) VALUES (NEW.target, NEW.title, 1)
  ON CONFLICT(target) DO UPDATE SET views = views + 1, title = NEW.title;
END;
