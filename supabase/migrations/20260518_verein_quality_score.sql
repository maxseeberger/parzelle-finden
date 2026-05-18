-- Add quality_score column to vereine
ALTER TABLE vereine ADD COLUMN IF NOT EXISTS quality_score integer DEFAULT 0;

-- Score formula:
--  +30  warteliste offen
--  +10  warteliste geschlossen (at least known)
--  +20  has website
--  +15  has email
--  +10  has phone
--  +15  has parzellen_anzahl (size info)
--  +10  has warteliste_laenge (waitlist info)
--  +5   has jahresbeitrag (fee info)
-- Max possible: 115

UPDATE vereine SET quality_score = (
  CASE WHEN warteliste_status = 'offen'        THEN 30 ELSE 0 END +
  CASE WHEN warteliste_status = 'geschlossen'  THEN 10 ELSE 0 END +
  CASE WHEN website   IS NOT NULL AND website  != '' THEN 20 ELSE 0 END +
  CASE WHEN email     IS NOT NULL AND email    != '' THEN 15 ELSE 0 END +
  CASE WHEN phone     IS NOT NULL AND phone    != '' THEN 10 ELSE 0 END +
  CASE WHEN parzellen_anzahl  IS NOT NULL THEN 15 ELSE 0 END +
  CASE WHEN warteliste_laenge IS NOT NULL THEN 10 ELSE 0 END +
  CASE WHEN jahresbeitrag     IS NOT NULL THEN  5 ELSE 0 END
);

-- Index for fast ORDER BY quality_score DESC
CREATE INDEX IF NOT EXISTS vereine_quality_score_idx ON vereine (quality_score DESC);

-- Trigger to keep score up to date on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_verein_quality_score()
RETURNS trigger AS $$
BEGIN
  NEW.quality_score := (
    CASE WHEN NEW.warteliste_status = 'offen'        THEN 30 ELSE 0 END +
    CASE WHEN NEW.warteliste_status = 'geschlossen'  THEN 10 ELSE 0 END +
    CASE WHEN NEW.website   IS NOT NULL AND NEW.website  != '' THEN 20 ELSE 0 END +
    CASE WHEN NEW.email     IS NOT NULL AND NEW.email    != '' THEN 15 ELSE 0 END +
    CASE WHEN NEW.phone     IS NOT NULL AND NEW.phone    != '' THEN 10 ELSE 0 END +
    CASE WHEN NEW.parzellen_anzahl  IS NOT NULL THEN 15 ELSE 0 END +
    CASE WHEN NEW.warteliste_laenge IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN NEW.jahresbeitrag     IS NOT NULL THEN  5 ELSE 0 END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verein_quality_score ON vereine;
CREATE TRIGGER trg_verein_quality_score
  BEFORE INSERT OR UPDATE ON vereine
  FOR EACH ROW EXECUTE FUNCTION update_verein_quality_score();
