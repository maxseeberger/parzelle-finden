-- Spider improvements: waitlist URL storage + Immowelt as a proper source

-- 1. Add warteliste_url — direct link to the sub-page where you can register
--    (e.g. /Freie-Parzellen/, /Aufnahme/, /Mitglied-werden/)
ALTER TABLE vereine ADD COLUMN IF NOT EXISTS warteliste_url text;

-- 2. Add immowelt as a recognised listing source
--    (previously the scraper piggy-backed on 'kleinanzeigen' to work around the enum)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'immowelt'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'listing_source')
  ) THEN
    ALTER TYPE listing_source ADD VALUE 'immowelt';
  END IF;
END$$;

-- 3. Update quality_score formula to also reward warteliste_url presence (+10)
--    and regenerate all existing scores

CREATE OR REPLACE FUNCTION update_verein_quality_score()
RETURNS trigger AS $$
BEGIN
  NEW.quality_score := (
    CASE WHEN NEW.warteliste_status = 'offen'       THEN 30 ELSE 0 END +
    CASE WHEN NEW.warteliste_status = 'geschlossen' THEN 10 ELSE 0 END +
    CASE WHEN NEW.website        IS NOT NULL AND NEW.website        != '' THEN 20 ELSE 0 END +
    CASE WHEN NEW.warteliste_url IS NOT NULL AND NEW.warteliste_url != '' THEN 10 ELSE 0 END +
    CASE WHEN NEW.email          IS NOT NULL AND NEW.email          != '' THEN 15 ELSE 0 END +
    CASE WHEN NEW.phone          IS NOT NULL AND NEW.phone          != '' THEN 10 ELSE 0 END +
    CASE WHEN NEW.parzellen_anzahl  IS NOT NULL THEN 15 ELSE 0 END +
    CASE WHEN NEW.warteliste_laenge IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN NEW.jahresbeitrag     IS NOT NULL THEN  5 ELSE 0 END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recalculate all existing scores
UPDATE vereine SET quality_score = (
  CASE WHEN warteliste_status = 'offen'       THEN 30 ELSE 0 END +
  CASE WHEN warteliste_status = 'geschlossen' THEN 10 ELSE 0 END +
  CASE WHEN website        IS NOT NULL AND website        != '' THEN 20 ELSE 0 END +
  CASE WHEN warteliste_url IS NOT NULL AND warteliste_url != '' THEN 10 ELSE 0 END +
  CASE WHEN email          IS NOT NULL AND email          != '' THEN 15 ELSE 0 END +
  CASE WHEN phone          IS NOT NULL AND phone          != '' THEN 10 ELSE 0 END +
  CASE WHEN parzellen_anzahl  IS NOT NULL THEN 15 ELSE 0 END +
  CASE WHEN warteliste_laenge IS NOT NULL THEN 10 ELSE 0 END +
  CASE WHEN jahresbeitrag     IS NOT NULL THEN  5 ELSE 0 END
);
