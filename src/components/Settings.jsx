import { useState } from 'react';
import { clearChart, clearAllJournals, clearAllReadings, getSettings, saveSettings } from '../utils/storage';

export default function Settings({ open, onClose, onResetChart }) {
  const [settings, setSettings] = useState(getSettings());
  const [confirmAction, setConfirmAction] = useState(null);

  if (!open) return null;

  function toggle24h() {
    const next = { ...settings, use24h: !settings.use24h };
    setSettings(next);
    saveSettings(next);
  }

  function handleResetChart() {
    clearChart();
    clearAllReadings();
    onResetChart();
    onClose();
  }

  function handleClearJournals() {
    clearAllJournals();
    setConfirmAction(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-void-light border-l border-border h-full p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-[family-name:var(--font-heading)] text-xl text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text-primary transition-colors cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Time format */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-primary text-sm font-medium">24-Hour Time</p>
              <p className="text-text-dim text-xs">Display times in 24h format</p>
            </div>
            <button
              onClick={toggle24h}
              className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                settings.use24h ? 'bg-gold' : 'bg-void-lighter border border-border'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${
                settings.use24h ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <hr className="border-border" />

          {/* Reset chart */}
          <div>
            <p className="text-text-primary text-sm font-medium mb-1">Reset Chart</p>
            <p className="text-text-dim text-xs mb-3">Clear your natal chart data and return to onboarding.</p>
            {confirmAction === 'chart' ? (
              <div className="flex gap-2">
                <button
                  onClick={handleResetChart}
                  className="px-4 py-2 bg-red-900/30 border border-red-500/40 text-red-400 rounded-lg text-sm cursor-pointer"
                >
                  Confirm Reset
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 bg-void border border-border text-text-secondary rounded-lg text-sm cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmAction('chart')}
                className="px-4 py-2 bg-void border border-border text-text-secondary rounded-lg text-sm hover:border-red-500/40 hover:text-red-400 transition-colors cursor-pointer"
              >
                Reset Chart
              </button>
            )}
          </div>

          <hr className="border-border" />

          {/* Clear journals */}
          <div>
            <p className="text-text-primary text-sm font-medium mb-1">Clear All Journal Entries</p>
            <p className="text-text-dim text-xs mb-3">Permanently delete all saved journal entries.</p>
            {confirmAction === 'journals' ? (
              <div className="flex gap-2">
                <button
                  onClick={handleClearJournals}
                  className="px-4 py-2 bg-red-900/30 border border-red-500/40 text-red-400 rounded-lg text-sm cursor-pointer"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 bg-void border border-border text-text-secondary rounded-lg text-sm cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmAction('journals')}
                className="px-4 py-2 bg-void border border-border text-text-secondary rounded-lg text-sm hover:border-red-500/40 hover:text-red-400 transition-colors cursor-pointer"
              >
                Clear Journals
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
