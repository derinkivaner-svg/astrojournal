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

export default function DayView({ date, onChangeDate, onOpenJournal }) {
  const [journal, setJournal]     = useState('');
  const [saved, setSaved]         = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const [promptsOpen, setPromptsOpen] = useState(false);

  const dateStr    = format(date, 'yyyy-MM-dd');
  const moonPhase  = getMoonPhaseForDate(date);
  const dayRuler   = getPlanetaryDayRuler(date);
  const positions  = getPlanetaryPositions(date);

  const chart   = getChart();
  const reading = useMemo(() => {
    if (!chart) return null;
    return generateDayReading(date, chart);
  }, [dateStr]);

  const prompts = reading?.prompts || [];
  const selectedPrompt = prompts.find(p => p.id === selectedPromptId) || prompts[0] || null;

  useEffect(() => {
    const saved = getJournalEntry(dateStr) || '';
    setJournal(saved);
    setSaved(false);
    setIsEditing(!saved); // start in edit mode only when no existing entry
  }, [dateStr]);

  useEffect(() => {
    setPromptsOpen(false);
    const stored = localStorage.getItem(`promptSel-${dateStr}`);
    if (stored && prompts.some(p => p.id === stored)) {
      setSelectedPromptId(stored);
    } else {
      setSelectedPromptId(prompts[0]?.id || null);
    }
  }, [dateStr, prompts.length]);

  function choosePrompt(id) {
    setSelectedPromptId(id);
    localStorage.setItem(`promptSel-${dateStr}`, id);
    setPromptsOpen(false);
  }

  function handleSave() {
    saveJournalEntry(dateStr, journal);
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCopy() {
    const parts = [
      `AstroJournal — ${format(date, 'EEEE, MMMM d, yyyy')}`,
      `${moonPhase.emoji} ${moonPhase.phase} | ${dayRuler} Day`,
      '',
    ];
    if (reading) {
      if (reading.affirmation)      parts.push('AFFIRMATION', reading.affirmation, '');
      if (reading.climate)          parts.push('ASTROLOGICAL CLIMATE', reading.climate, '');
      if (reading.soul_guidance)    parts.push('SOUL GUIDANCE', reading.soul_guidance, '');
      if (selectedPrompt?.text)     parts.push('JOURNALING PROMPT', selectedPrompt.text, '');
    }
    if (journal) parts.push('MY JOURNAL', journal);
    navigator.clipboard.writeText(parts.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Date header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onChangeDate(subDays(date, 1))}
          className="p-2 text-text-secondary hover:text-gold transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div className="text-center min-w-0">
          <h2 className="font-[family-name:var(--font-heading)] text-xl sm:text-2xl text-text-primary leading-tight">
            {format(date, 'EEE, MMM d')}
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

      {/* Affirmation — shown at top */}
      {reading?.affirmation && (
        <section className="mb-5 bg-gold-glow border border-border-gold rounded-xl p-4 text-center">
          <h3 className="font-[family-name:var(--font-heading)] text-xs text-gold/70 uppercase tracking-wider mb-1.5">
            Today's Affirmation
          </h3>
          <p className="font-[family-name:var(--font-heading)] text-lg text-gold leading-snug">
            {reading.affirmation}
          </p>
        </section>
      )}

      {/* Current sky positions */}
      <div className="mb-5 bg-void-light border border-border rounded-xl p-4">
        <h3 className="text-text-dim text-xs uppercase tracking-wider mb-3">Today's Sky</h3>
        <div className="flex flex-wrap gap-2">
          {positions.map(p => (
            <div key={p.planet} className="flex items-center gap-1 bg-void border border-border rounded-lg px-2 py-1.5 sm:px-3 sm:py-2">
              <span className="text-[11px] sm:text-xs text-text-secondary font-medium" title={p.planet}>{p.planet}</span>
              <span className="text-base sm:text-lg text-gold" title={p.sign}>{SIGN_GLYPHS[p.sign] || p.sign}</span>
              <span className="text-[11px] sm:text-xs text-text-dim">{p.degree.toFixed(0)}°</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reading sections — Climate + Soul Guidance */}
      {reading && (
        <div className="space-y-4 mb-5">
          {reading.climate && (
            <section className="bg-void-light border border-border rounded-xl p-5">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-purple-text mb-3">
                Astrological Climate
              </h3>
              <p className="text-text-primary leading-relaxed">{reading.climate}</p>
            </section>
          )}

          {reading.soul_guidance && (
            <section className="bg-void-light border border-border rounded-xl p-5">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-purple-text mb-3">
                Soul Guidance
              </h3>
              <p className="text-text-primary leading-relaxed">{reading.soul_guidance}</p>
            </section>
          )}
        </div>
      )}

      {/* Journal section */}
      <div className="bg-void-light border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-[family-name:var(--font-heading)] text-lg text-text-primary">
            Journal Entry
          </h3>
          {onOpenJournal && (
            <button
              onClick={onOpenJournal}
              className="text-xs text-text-dim hover:text-gold transition-colors cursor-pointer"
            >
              View all entries →
            </button>
          )}
        </div>

        {/* Journaling Prompt — dropdown of active transit-based prompts */}
        {selectedPrompt && (
          <div className="mb-4">
            {prompts.length > 1 && (
              <div className="relative mb-2">
                <button
                  type="button"
                  onClick={() => setPromptsOpen(!promptsOpen)}
                  className="w-full flex items-center justify-between gap-2 bg-void border border-border hover:border-gold/40 rounded-lg px-3 py-2 text-left cursor-pointer transition-colors"
                  aria-expanded={promptsOpen}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-text-dim text-[10px] uppercase tracking-wider">Prompt source</div>
                    <div className="text-sm text-text-primary truncate">
                      {selectedPrompt.sourceTitle}
                      <span className="text-text-dim"> · {selectedPrompt.sourceDetail}</span>
                    </div>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                    className={`flex-shrink-0 text-text-dim transition-transform ${promptsOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                {promptsOpen && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-void-light border border-border rounded-lg shadow-lg max-h-80 overflow-auto">
                    {prompts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => choosePrompt(p.id)}
                        className={`block w-full text-left px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-void-lighter cursor-pointer transition-colors ${p.id === selectedPrompt.id ? 'bg-gold/10' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-text-primary">{p.sourceTitle}</span>
                          <span className="text-[10px] text-text-dim flex-shrink-0">{p.sourceDetail}</span>
                        </div>
                        <p className="text-xs text-text-secondary italic mt-1 line-clamp-2 leading-snug">
                          {p.text}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="bg-void border-l-2 border-l-gold/60 rounded-r-lg pl-4 pr-3 py-3">
              <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1">Prompt</p>
              <p className="text-text-secondary text-sm leading-relaxed italic">
                {selectedPrompt.text}
              </p>
            </div>
          </div>
        )}

        {/* Entry display: read-only when saved, edit mode when new/editing */}
        {journal && !isEditing ? (
          <div>
            <div className="bg-void border border-border rounded-lg p-4 min-h-[80px]">
              <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">{journal}</p>
            </div>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => setIsEditing(true)}
                className="px-5 py-2 bg-gold/20 border border-gold/40 text-gold rounded-lg text-sm font-medium hover:bg-gold/30 transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={handleCopy}
                className={`px-5 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  copied
                    ? 'bg-green-900/30 border-green-500/40 text-green-400'
                    : 'bg-void border-border text-text-secondary hover:border-border-gold hover:text-gold'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <textarea
              value={journal}
              onChange={(e) => { setJournal(e.target.value); setSaved(false); }}
              placeholder="Write your thoughts for today..."
              className="w-full h-40 bg-void border border-border rounded-lg p-4 text-text-primary text-sm resize-none placeholder:text-text-dim/50 focus:outline-none focus:border-gold/40"
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
              {journal && isEditing && getJournalEntry(dateStr) && (
                <button
                  onClick={() => { setJournal(getJournalEntry(dateStr) || ''); setIsEditing(false); }}
                  className="px-5 py-2 bg-void border border-border text-text-secondary rounded-lg text-sm font-medium hover:border-border-gold hover:text-gold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleCopy}
                className={`px-5 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  copied
                    ? 'bg-green-900/30 border-green-500/40 text-green-400'
                    : 'bg-void border-border text-text-secondary hover:border-border-gold hover:text-gold'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
