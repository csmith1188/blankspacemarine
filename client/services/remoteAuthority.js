import { GameService } from './gameService.js';

/**
 * Authoritative server-backed GameService for logged-in Formbar users.
 * Sends all run actions to Express (/api/game/*) so scores and progress are persisted in SQLite.
 */
export class RemoteServerAuthority extends GameService {
  constructor(basePath = '/api/game') {
    super();
    this.basePath = basePath;
    this._catalogCache = null;
  }

  async _fetchJson(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Server error (${res.status})`);
    }
    return data;
  }

  async _getCatalog() {
    if (!this._catalogCache) {
      this._catalogCache = await this._fetchJson(`${this.basePath}/catalog`);
    }
    return this._catalogCache;
  }

  async getCampaigns() {
    const catalog = await this._getCatalog();
    return catalog.campaigns || [];
  }

  async startRun({ callsign, sector } = {}) {
    return this._fetchJson(`${this.basePath}/runs`, {
      method: 'POST',
      body: JSON.stringify({ callsign, sector })
    });
  }

  async submitAttempt({ runId, puzzleId, code }) {
    return this._fetchJson(`${this.basePath}/runs/${encodeURIComponent(runId)}/submit`, {
      method: 'POST',
      body: JSON.stringify({ puzzleId, code })
    });
  }

  async requestHint({ runId, puzzleId }) {
    return this._fetchJson(`${this.basePath}/runs/${encodeURIComponent(runId)}/hint`, {
      method: 'POST',
      body: JSON.stringify({ puzzleId })
    });
  }

  async pauseRun({ runId }) {
    return this._fetchJson(`${this.basePath}/runs/${encodeURIComponent(runId)}/pause`, {
      method: 'POST'
    });
  }

  async resumeRun({ runId }) {
    return this._fetchJson(`${this.basePath}/runs/${encodeURIComponent(runId)}/resume`, {
      method: 'POST'
    });
  }

  async getLeaderboard() {
    return this._fetchJson(`${this.basePath}/leaderboard`);
  }
}
