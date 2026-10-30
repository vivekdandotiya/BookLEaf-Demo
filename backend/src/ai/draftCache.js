/**
 * In-memory draft response cache
 * Keys: `${ticketId}:${lastMessageId || 'initial'}`
 * Avoids duplicate OpenAI API requests when an admin reopens a ticket without new messages.
 */

class DraftCache {
  constructor(ttlMs = 60 * 60 * 1000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  get(ticketId, lastMessageId = 'initial') {
    const key = `${ticketId}:${lastMessageId}`;
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.draft;
  }

  set(ticketId, lastMessageId = 'initial', draft) {
    const key = `${ticketId}:${lastMessageId}`;
    this.cache.set(key, {
      draft,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(ticketId) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${ticketId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const draftCache = new DraftCache();
