-- Shared battles for the player link.
--
-- One row per room. `state` is the sanitised PlayerView as JSON — never the
-- DM's own combatants, which carry hit points, armour class and notes.
--
-- `write_key` is the DM's secret. It is stored as issued rather than hashed:
-- it is 130 bits of randomness with no value outside this table, and hashing
-- it would buy nothing that the randomness has not already bought.
CREATE TABLE IF NOT EXISTS rooms (
  code       TEXT PRIMARY KEY,
  write_key  TEXT NOT NULL,
  state      TEXT NOT NULL,
  updated    INTEGER NOT NULL
);

-- The sweep deletes by age, so that is what needs the index.
CREATE INDEX IF NOT EXISTS rooms_updated ON rooms (updated);
