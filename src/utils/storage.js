// localStorage utilities for AstroJournal

const CHART_KEY = 'astrojournal_chart';
const JOURNAL_KEY = 'astrojournal_journals';
const READINGS_KEY = 'astrojournal_readings';
const SETTINGS_KEY = 'astrojournal_settings';

export function getChart() {
  try {
    const data = localStorage.getItem(CHART_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function saveChart(chart) {
  localStorage.setItem(CHART_KEY, JSON.stringify(chart));
}

export function clearChart() {
  localStorage.removeItem(CHART_KEY);
}

export function getJournalEntry(dateStr) {
  try {
    const all = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '{}');
    return all[dateStr] || null;
  } catch { return null; }
}

export function saveJournalEntry(dateStr, text) {
  try {
    const all = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '{}');
    if (text) {
      all[dateStr] = text;
    } else {
      delete all[dateStr];
    }
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(all));
  } catch {}
}

export function getAllJournalDates() {
  try {
    const all = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '{}');
    // Only return daily entries (yyyy-MM-dd format); weekly keys start with "week_"
    return Object.keys(all).filter(k => all[k] && /^\d{4}-\d{2}-\d{2}$/.test(k));
  } catch { return []; }
}

export function clearAllJournals() {
  localStorage.removeItem(JOURNAL_KEY);
}

export function getCachedReading(key) {
  try {
    const all = JSON.parse(localStorage.getItem(READINGS_KEY) || '{}');
    return all[key] || null;
  } catch { return null; }
}

export function setCachedReading(key, data) {
  try {
    const all = JSON.parse(localStorage.getItem(READINGS_KEY) || '{}');
    all[key] = data;
    localStorage.setItem(READINGS_KEY, JSON.stringify(all));
  } catch {}
}

export function clearAllReadings() {
  localStorage.removeItem(READINGS_KEY);
}

export function getSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : { use24h: false };
  } catch { return { use24h: false }; }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
