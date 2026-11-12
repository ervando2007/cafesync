// Idle timeout for a signed-in session. Shared by the server (JWT/cookie
// lifetime in auth.ts) and the client idle watcher so both agree.
export const SESSION_IDLE_SECONDS = 15 * 60;
