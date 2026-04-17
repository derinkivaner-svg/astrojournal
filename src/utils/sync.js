// Sync layer between localStorage (used as local cache / offline store)
// and Supabase (source of truth when a user is logged in).
//
// Design:
//  - Reads always come from localStorage (kept synchronous for simplicity).
//  - On login, pullRemoteIntoLocal() merges the authenticated user's data
//    into localStorage using last-write-wins on updated_at.
//  - On write, the sync functions are fire-and-forget — they push to
//    Supabase in the background if a user is logged in, and silently no-op
//    otherwise. Failures are logged, not surfaced, so the local UX never
//    stalls on network.
//
// Keys on localStorage:
//   astrojournal_chart                    → chart JSON
//   astrojournal_journals                 → { [entry_key]: body }
//   astrojournal_journal_meta             → { [entry_key]: updated_at_iso }
//   astrojournal_chart_meta               → { updated_at_iso }

import { supabase } from './supabase';

const CHART_KEY         = 'astrojournal_chart';
const JOURNAL_KEY       = 'astrojournal_journals';
const JOURNAL_META_KEY  = 'astrojournal_journal_meta';
const CHART_META_KEY    = 'astrojournal_chart_meta';

// ─── Local helpers ────────────────────────────────────────────────────

function readJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function markJournalUpdated(entryKey, iso) {
  const meta = readJSON(JOURNAL_META_KEY, {});
  meta[entryKey] = iso;
  writeJSON(JOURNAL_META_KEY, meta);
}

function markChartUpdated(iso) {
  writeJSON(CHART_META_KEY, { updated_at: iso });
}

// ─── Remote pulls ─────────────────────────────────────────────────────

export async function pullRemoteIntoLocal(userId) {
  if (!userId) return;

  // Chart
  try {
    const { data: remoteChart } = await supabase
      .from('charts')
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (remoteChart?.data) {
      const localMeta  = readJSON(CHART_META_KEY, null);
      const localIso   = localMeta?.updated_at || null;
      const remoteIso  = remoteChart.updated_at;
      if (!localIso || remoteIso > localIso) {
        writeJSON(CHART_KEY, remoteChart.data);
        markChartUpdated(remoteIso);
      } else if (localIso > remoteIso) {
        // Local is newer — push it up
        const localChart = readJSON(CHART_KEY, null);
        if (localChart) await pushChart(userId, localChart, localIso);
      }
    } else {
      // Nothing remote — if local exists, push it
      const localChart = readJSON(CHART_KEY, null);
      if (localChart) await pushChart(userId, localChart);
    }
  } catch (err) {
    console.warn('pullRemoteIntoLocal(chart):', err?.message || err);
  }

  // Journal entries
  try {
    const { data: remoteEntries } = await supabase
      .from('journal_entries')
      .select('entry_key, body, updated_at')
      .eq('user_id', userId);

    const localEntries = readJSON(JOURNAL_KEY, {});
    const localMeta    = readJSON(JOURNAL_META_KEY, {});
    const mergedEntries = { ...localEntries };
    const mergedMeta    = { ...localMeta };

    const remoteByKey = {};
    for (const row of remoteEntries || []) {
      remoteByKey[row.entry_key] = row;
      const localIso  = localMeta[row.entry_key];
      if (!localIso || row.updated_at > localIso) {
        mergedEntries[row.entry_key] = row.body;
        mergedMeta[row.entry_key]    = row.updated_at;
      }
    }

    writeJSON(JOURNAL_KEY, mergedEntries);
    writeJSON(JOURNAL_META_KEY, mergedMeta);

    // Push up any local entries that are newer (or absent) on the remote
    for (const [key, body] of Object.entries(localEntries)) {
      if (!body) continue;
      const remote = remoteByKey[key];
      const localIso = localMeta[key];
      if (!remote || (localIso && localIso > remote.updated_at)) {
        await pushJournalEntry(userId, key, body, localIso);
      }
    }
  } catch (err) {
    console.warn('pullRemoteIntoLocal(journals):', err?.message || err);
  }
}

// ─── Remote pushes (fire-and-forget) ──────────────────────────────────

export async function pushChart(userId, chart, updatedAtIso) {
  if (!userId || !chart) return;
  const iso = updatedAtIso || new Date().toISOString();
  try {
    const { error } = await supabase
      .from('charts')
      .upsert({ user_id: userId, data: chart, updated_at: iso }, { onConflict: 'user_id' });
    if (error) throw error;
    markChartUpdated(iso);
  } catch (err) {
    console.warn('pushChart:', err?.message || err);
  }
}

export async function pushJournalEntry(userId, entryKey, body, updatedAtIso) {
  if (!userId || !entryKey) return;
  const iso = updatedAtIso || new Date().toISOString();
  try {
    if (body) {
      const { error } = await supabase
        .from('journal_entries')
        .upsert(
          { user_id: userId, entry_key: entryKey, body, updated_at: iso },
          { onConflict: 'user_id,entry_key' }
        );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('user_id', userId)
        .eq('entry_key', entryKey);
      if (error) throw error;
    }
    markJournalUpdated(entryKey, iso);
  } catch (err) {
    console.warn('pushJournalEntry:', err?.message || err);
  }
}

// ─── Called from storage.js on local writes ───────────────────────────

function currentUserId() {
  // supabase.auth.getSession is async; cache the uid synchronously via
  // AuthContext when possible. As a fallback, read the token from storage.
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const blob = JSON.parse(localStorage.getItem(key));
        return blob?.user?.id || null;
      }
    }
  } catch {}
  return null;
}

export function notifyChartWritten(chart) {
  const iso = new Date().toISOString();
  markChartUpdated(iso);
  const uid = currentUserId();
  if (uid) pushChart(uid, chart, iso);
}

export function notifyJournalWritten(entryKey, body) {
  const iso = new Date().toISOString();
  markJournalUpdated(entryKey, iso);
  const uid = currentUserId();
  if (uid) pushJournalEntry(uid, entryKey, body, iso);
}

// ─── Called on logout to avoid leaking data across accounts ───────────

export function clearUserLocalData() {
  try {
    localStorage.removeItem(CHART_KEY);
    localStorage.removeItem(CHART_META_KEY);
    localStorage.removeItem(JOURNAL_KEY);
    localStorage.removeItem(JOURNAL_META_KEY);
  } catch {}
}
