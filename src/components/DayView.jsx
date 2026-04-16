import { useState, useEffect, useMemo } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { getMoonPhaseForDate, getPlanetaryDayRuler, getPlanetaryPositions } from '../utils/ephemeris';
import { generateDayReading } from '../utils/interpreter';
import { getChart, getJournalEntry, saveJournalEntry } from '../utils/storage';

// \uFE0E forces text (not emoji) rendering
const T = '\uFE0E';
const SIGN_GLYPHS = {
  Aries: `♈${T}`, Taurus: `♉${T}`, Gemini: `♊${T}`, Cancer: `♋${T}`,
  Leo: `♌${T}`, Virgo: `♍${T}`, Libra: `♎${T}`, Scorpio: `♏${T}`,
  Sagittarius: `♐${T}`, Capricorn: `♑${T}`, Aquarius: `♒${T}`, Pisces: `♓${T}`,
};

export default function DayView({ date, onChangeDate }) {
  const [journal, setJournal] = useState('');
  const [saved, setSaved] = useState(false);

  const dateStr = format(date, 'yyyy-MM-dd');
  const moonPhase = getMoonPhaseForDate(date);
  const dayRuler = getPlanetaryDayRuler(date);
  const positions = getPlanetaryPositions(date);

  const chart = getChart();
  const reading = useMemo(() => {
    if (!chart) return null;
    return generateDayReading(date, chart);
  }, [dateStr]);

  useEffect(() => {
    setJournal(getJournalEntry(dateStr) || '');
    setSaved(false);
  }, [dateStr]);

  function handleSave() {
    saveJournalEntry(dateStr, journal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCopyForAppleJournal() {
    const parts = [
      `AstroJournal — ${format(date, 'EEEE, MMMM d, yyyy')}`,
      `${moonPhase.emoji} ${moonPhase.phase} | ${dayRuler} Day`,
      '',
    ];
    if (reading) {
      if (reading.climate) parts.push('ASTROLOGICAL CLIMATE', reading.climate, '');
      if (reading.journaling_prompt) parts.push('JOURNALING PROMPT', reading.journaling_prompt, '');
      if (reading.soul_guidance) parts.push('SOUL GUIDANCE', reading.soul_guidance, '');
      if (reading.affirmation) parts.push('AFFIRMATION', reading.affirmation, '');
    }
    if (journal) parts.push('MY JOURNAL', journal);
    navigator.clipboard.writeText(parts.join('\n'));
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Date header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onChangeDate(subDays(date, 1))}
          className="p-2 text-text-secondary hover:text-gold transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-text-primary">
            {format(date, 'EEEE, MMMM d')}
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            {moonPhase.emoji} {moonPhase.phase} &middot; {dayRuler} Day
          </p>
          {!isToday(date) && (
            <button
              onClick={() => onChangeDate(new Date())}
              className="mt-1.5 text-xs text-text-dim hover:text-gold transition-colors cursor-pointer border border-border hover:border-gold/40 rounded-full px-3 py-0.5"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => onChangeDate(addDays(date, 1))}
          className="p-2 text-text-secondary hover:text-gold transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Current sky positions */}
      <div className="mb-6 bg-void-light border border-border rounded-xl p-4">
        <h3 className="text-text-dim text-xs uppercase tracking-wider mb-3">Today's Sky</h3>
        <div className="flex flex-wrap gap-2">
          {positions.map(p => (
            <div key={p.planet} className="flex items-center gap-1.5 bg-void border border-border rounded-lg px-3 py-2">
              <span className="text-xs text-text-secondary font-medium" title={p.planet}>{p.planet}</span>
              <span className="text-lg text-gold" title={p.sign}>{SIGN_GLYPHS[p.sign] || p.sign}</span>
              <span className="text-xs text-text-dim">{p.degree.toFixed(0)}°</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reading sections */}
      {reading && (
        <div className="space-y-5">
          {/* Astrological Climate */}
          {reading.climate && (
            <section className="bg-void-light border border-border rounded-xl p-5">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-purple-text mb-3">
                Astrological Climate
              </h3>
              <p className="text-text-primary leading-relaxed">{reading.climate}</p>
            </section>
          )}

          {/* Journaling Prompt */}
          {reading.journaling_prompt && (
            <section className="bg-void-light border-l-4 border-l-gold border border-border rounded-xl p-5">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gold mb-3">
                Journaling Prompt
              </h3>
              <p className="text-text-primary leading-relaxed italic">
                {reading.journaling_prompt}
              </p>
            </section>
          )}

          {/* Soul Guidance */}
          {reading.soul_guidance && (
            <section className="bg-void-light border border-border rounded-xl p-5">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-purple-text mb-3">
                Soul Guidance
              </h3>
              <p className="text-text-primary leading-relaxed">{reading.soul_guidance}</p>
            </section>
          )}

          {/* Affirmation */}
          {reading.affirmation && (
            <section className="bg-gold-glow border border-border-gold rounded-xl p-5 text-center">
              <h3 className="font-[family-name:var(--font-heading)] text-sm text-gold/70 uppercase tracking-wider mb-2">
                Affirmation
              </h3>
              <p className="font-[family-name:var(--font-heading)] text-xl text-gold">
                {reading.affirmation}
              </p>
            </section>
          )}
        </div>
      )}

      {/* Journal entry */}
      <div className="mt-8 bg-void-light border border-border rounded-xl p-5">
        <h3 className="font-[family-name:var(--font-heading)] text-lg text-text-primary mb-3">
          Journal Entry
        </h3>
        <textarea
          value={journal}
          onChange={(e) => { setJournal(e.target.value); setSaved(false); }}
          placeholder="Write your thoughts for today..."
          className="w-full h-40 bg-void border border-border rounded-lg p-4 text-text-primary text-sm resize-none placeholder:text-text-dim/50"
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
          <button
            onClick={handleCopyForAppleJournal}
            className="px-5 py-2 bg-void border border-border text-text-secondary rounded-lg text-sm font-medium hover:border-border-gold hover:text-gold transition-colors cursor-pointer"
          >
            Copy for Apple Journal
          </button>
        </div>
      </div>
    </div>
  );
}
