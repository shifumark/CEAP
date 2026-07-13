// Load server/.env here too (not just in index.ts) — ES module imports
// are evaluated before any of index.ts's own top-level statements run,
// so by the time index.ts's dotenv.config() call executes, this module
// may have already been loaded transitively (e.g. via routes -> AuthService)
// with process.env not yet populated. Side-effect import guarantees this
// file's own env vars are loaded regardless of import order.
import 'dotenv/config';

// Fails fast at startup rather than silently falling back to a
// known-weak default — a missing JWT_SECRET in a real deployment must
// never be allowed to slip by unnoticed, since it would let anyone forge
// tokens for any role.
const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 16) {
  throw new Error(
    'JWT_SECRET is missing or too short. Set a long random value in server/.env (see server/.env.example).'
  );
}

export const JWT_SECRET = secret;
