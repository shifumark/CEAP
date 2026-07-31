-- A person could previously hold at most one Scholar record, ever
-- (scholars.user_id was globally unique) — a second application getting
-- approved under a different program silently reused their existing
-- Scholar row instead of creating a new one, so the second approval was
-- never actually reflected anywhere. Relaxed to one Scholar record per
-- (user, program) pair instead, so someone can be a Scholar in more
-- than one program at once.
DROP INDEX "scholars_user_id_key";
CREATE UNIQUE INDEX "scholars_user_id_scholarship_id_key" ON "scholars"("user_id", "scholarship_id");
CREATE INDEX "scholars_user_id_idx" ON "scholars"("user_id");
