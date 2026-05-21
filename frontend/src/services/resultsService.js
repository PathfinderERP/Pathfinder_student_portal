/**
 * resultsService.js
 *
 * Shared singleton for fetching `my_results` data.
 *
 * Problem it solves:
 *   Six components (Dashboard, Exams, Results, Performance, AdvancedAnalytics,
 *   StudyPlanner) each independently call /api/tests/my_results/ on every page
 *   load, creating 6 simultaneous identical HTTP requests.
 *
 * Solution:
 *   • In-memory cache with 5-minute TTL — avoids any network round-trip on
 *     subsequent renders within the same session.
 *   • Promise sharing — if a fetch is already in flight, every subsequent
 *     caller receives the SAME promise instead of starting a new request.
 */

import axios from 'axios';
import { getBaseApiUrl } from './apiConfig';

// ── Internal state ──────────────────────────────────────────────────────────
let _cache = null;           // { data, expiresAt }
let _inflight = null;        // shared Promise while a fetch is in progress
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the current user's results.
 *
 * @param {object} opts
 * @param {boolean} [opts.force=false]  Skip cache and force a fresh fetch.
 *                                      Pass `true` from a manual refresh button.
 * @returns {Promise<Array>}  Resolved results array.
 */
export const getMyResults = async ({ force = false } = {}) => {
    // 1. Return cached data if still fresh
    if (!force && _cache && Date.now() < _cache.expiresAt) {
        return _cache.data;
    }

    // 2. If a request is already in-flight, share it
    if (_inflight) {
        return _inflight;
    }

    const token = localStorage.getItem('auth_token');
    const apiUrl = getBaseApiUrl();

    if (!token) return [];

    const url = `${apiUrl}/api/tests/my_results/${force ? '?refresh=1' : ''}`;

    // 3. Start a new fetch and store the promise so concurrent callers share it
    _inflight = axios
        .get(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
            const data = Array.isArray(res.data) ? res.data : [];
            _cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
            return data;
        })
        .catch(() => {
            return [];
        })
        .finally(() => {
            _inflight = null; // clear the in-flight reference when done
        });

    return _inflight;
};

/**
 * Synchronously read the current in-memory cache.
 * Returns the cached array if it is still fresh, otherwise null.
 * Use this to avoid a loading flash when navigating back to a tab.
 */
export const getCachedResults = () => {
    if (_cache && Date.now() < _cache.expiresAt) {
        return _cache.data;
    }
    return null;
};

/**
 * Manually invalidate the in-memory cache (e.g. after exam submission).
 */
export const invalidateResultsCache = () => {
    _cache = null;
    _inflight = null;
};

