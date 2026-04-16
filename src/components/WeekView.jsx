import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { getPlanetaryDayRuler, getMoonPhaseForDate } from '../utils/ephemeris';
import { generateWeekReading } from '../utils/interpreter';
import { getChart, getJournalEntry, saveJournalEntry } from '../utils/storage';

export default function WeekView() {
  const [anchor, setAnchor] = useState(new Date());
  const [journal, setJournal] = useState('');
  const [saved, setSaved] = useState(false);

  const weekStart = startOfWeek(anchor, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekKey = format(weekStart, 'yyyy-MM-dd');

  const journalKey = `week_${weekKey}`;

  const chart = getChart();
  const reading = useMemo(() => {
    if (!chart) return null;
    return generateWeekReading(weekStart, chart);
  }, [weekKey]);

  useEffect(() => {
    setJournal(getJournalEntry(journalKey) || '');
    setSaved(false);
  }, [journalKey]);

  function handleSave() {
    saveJournalEntry(journalKey, journal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Week header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setAnchor(subWeeks(anchor, 1))}
          className="p-2 text-text-secondary hover:text-gold transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-text-primary">
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </h2>
        <button
          onClick={() => setAnchor(addWeeks(anchor, 1))}
          className="p-2 text-text-secondary hover:text-gold transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {reading && (
        <div className="space-y-5">
          {/* Weekly overview */}
          {reading.overview && (
            <section className="bg-void-light border border-border rounded-xl p-5">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-purple-text mb-3">
                Weekly Overview
              </h3>
              <p className="text-text-primary leading-relaxed">{reading.overview}</p>
            </section>
          )}

          {/* Focus and Watch Out cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reading.focus && (
              <section className="bg-gold-glow border border-border-gold rounded-xl p-5">
                <h3 className="font-[family-name:var(--font-heading)] text-sm text-gold/70 uppercase tracking-wider mb-2">
                  Focus
                </h3>
                <p className="text-text-primary text-sm leading-relaxed">{reading.focus}</p>
              </section>
            )}
            {reading.watch_out && (
              <section className="bg-purple-mid border border-purple-text/20 rounded-xl p-5">
                <h3 className="font-[family-name:var(--font-heading)] text-sm text-purple-text/70 uppercase tracking-wider mb-2">
                  Watch Out
                </h3>
                <p className="text-text-primary text-sm leading-relaxed">{reading.watch_out}</p>
              </section>
            )}
          </div>

          {/* Daily summaries */}
          <div className="space-y-2">
            {days.map((day, i) => {
              const ruler = getPlanetaryDayRuler(day);
              const moon = getMoonPhaseForDate(day);
              const summary = reading.daily_summaries?.[i] || '';
              return (
                <div
                  key={i}
                  className="bg-void-light border border-border rounded-lg p-4 flex gap-4"
                >
                  <div className="shrink-0 w-20 text-center">
                    <p className="text-text-primary text-sm font-medium">{format(day, 'EEE')}</p>
                    <p className="text-text-dim text-xs">{format(day, 'MMM d')}</p>
                    <p className="text-xs mt-1">{moon.emoji}</p>
                    <p className="text-text-dim text-[10px]">{ruler}</p>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed flex-1">
                    {summary}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Weekly journaling prompt */}
          {reading.journaling_prompt && (
            <section className="bg-void-light border-l-4 border-l-gold border border-border rounded-xl p-5">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gold mb-3">
                Weekly Journaling Prompt
              </h3>
              <p className="text-text-primary leading-relaxed italic">
                {reading.journaling_prompt}
              </p>
            </section>
          )}

          {/* Weekly journal entry */}
          <div className="bg-void-light border border-border rounded-xl p-5">
            <h3 className="font-[family-name:var(--font-heading)] text-lg text-text-primary mb-3">
              Weekly Reflection
            </h3>
            <textarea
              value={journal}
              onChange={(e) => { setJournal(e.target.value); setSaved(false); }}
              placeholder="Reflect on your week..."
              className="w-full h-32 bg-void border border-border rounded-lg p-4 text-text-primary text-sm resize-none placeholder:text-text-dim/50"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleSave}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  saved
                    ? 'bg-green-900/30 border border-green-500/40 text-green-400'
                    : 'bg-gold/20 border border-gold/40 text-gold hover:bg-gold/30'
                }`}
              >
                {saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
