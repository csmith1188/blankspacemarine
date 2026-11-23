/**
 * Async GameService contract for Blank Space Marine.
 *
 * The UI and GameController talk ONLY to this interface using plain JSON-serializable DTOs.
 * Today it is backed by LocalAuthority (in-browser). Later, swap in a RemoteServerAuthority
 * (fetch / WebSocket) implementing the exact same async methods without changing UI code.
 */

export class GameService {
  /** @returns {Promise<Array>} Campaign catalog metadata */
  async getCampaigns() {
    throw new Error('Not implemented: getCampaigns');
  }

  /**
   * Starts a new speed-run session.
   * @param {{ callsign?: string, sector?: string|number }} options
   * @returns {Promise<object>} RunSessionDTO with first sanitized puzzle
   */
  async startRun(_options) {
    throw new Error('Not implemented: startRun');
  }

  /**
   * Submits edited code for the active puzzle in a run.
   * @param {{ runId: string, puzzleId: string, code: string }} payload
   * @returns {Promise<object>} SubmissionResultDTO
   */
  async submitAttempt(_payload) {
    throw new Error('Not implemented: submitAttempt');
  }

  /**
   * Requests a tactical hint for the active puzzle (may apply a small score penalty).
   * @param {{ runId: string, puzzleId: string }} payload
   * @returns {Promise<object>} HintDTO
   */
  async requestHint(_payload) {
    throw new Error('Not implemented: requestHint');
  }

  /**
   * Pauses an active run so elapsed time does not advance while paused.
   * @param {{ runId: string }} payload
   * @returns {Promise<object>}
   */
  async pauseRun(_payload) {
    throw new Error('Not implemented: pauseRun');
  }

  /**
   * Resumes a paused run.
   * @param {{ runId: string }} payload
   * @returns {Promise<object>}
   */
  async resumeRun(_payload) {
    throw new Error('Not implemented: resumeRun');
  }

  /**
   * Retrieves top speed-run scores.
   * @returns {Promise<Array>} LeaderboardEntryDTO[]
   */
  async getLeaderboard() {
    throw new Error('Not implemented: getLeaderboard');
  }
}
