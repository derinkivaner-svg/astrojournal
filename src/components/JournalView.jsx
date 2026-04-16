import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { getAllJournalDates, getJournalEntry } from '../utils/storage';
import { getMoonPhaseForDate, getPlanetaryDayRuler } from '../utils/ephemeris';

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" className="shrink-0">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 20 20" fill="none"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function JournalView({ onNavigateToDay }) {
  const [search, setSearch]       = useState('');
  const [expanded, setExpanded]   = useState(null);   // dateStr of open entry
  const [selecting, setSelecting] = useState(false);  // multi-select mode
  const [selected, setSelected]   = useState(new Set());

  // Load all entries newest-first
  const entries = useMemo(() => {
    const dates = getAllJournalDates().sort((a, b) => b.localeCompare(a));
    return dates.map(dateStr => {
      const date  = parseISO(dateStr);
      const text  = getJournalEntry(dateStr) || '';
      const moon  = getMoonPhaseForDate(date);
      const ruler = getPlanetaryDayRuler(date);
      return { dateStr, date, text, moon, ruler };
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      e.text.toLowerCase().includes(q) ||
      e.dateStr.includes(q) ||
      format(e.date, 'MMMM d yyyy EEEE').toLowerCase().includes(q)
    );
  }, [entries, search]);

  // Multi-select helpers
  function toggleSelect(dateStr) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
      return next;
    });
  }
  function selectAll()   { setSelected(new Set(filtered.map(e => e.dateStr))); }
  function selectNone()  { setSelected(new Set()); }
  function exitSelect()  { setSelecting(false); setSelected(new Set()); }

  function handleExport() {
    const toExport = entries.filter(e => selected.has(e.dateStr))
                            .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    if (!toExport.length) return;
    const parts = ['AstroJournal — Exported Entries', '='.repeat(40), ''];
    for (const { date, text, moon, ruler } of toExport) {
      parts.push(
        format(date, 'EEEE, MMMM d, yyyy'),
        `${moon.emoji} ${moon.phase}  ·  ${ruler} Day`,
        '-'.repeat(32),
        text,
        ''
      );
    }
    downloadText(`astrojournal-${format(new Date(),'yyyy-MM-dd')}.txt`, parts.join('\n'));
    exitSelect();
  }

  if (entries.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-64 text-center">
        <p className="text-4xl mb-4">✦</p>
        <h3 className="font-[family-name:var(--font-heading)] text-xl text-text-primary mb-2">
          No journal entries yet
        </h3>
        <p className="text-text-secondary text-sm">
          Head to the Day view to write your first entry.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-text-primary">
            Journal
          </h2>
          <p className="text-text-dim text-sm mt-0.5">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        {/* Action buttons */}
        {selecting ? (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={selectAll}
                    className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
              All
            </button>
            <span className="text-border text-xs">|</span>
            <button onClick={selectNone}
                    className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
              None
            </button>
            <button
              onClick={handleExport}
              disabled={selected.size === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selected.size > 0
                  ? 'bg-gold/20 border border-gold/40 text-gold hover:bg-gold/30'
                  : 'bg-void border border-border text-text-dim cursor-not-allowed'
              }`}
            >
              Export{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
            <button onClick={exitSelect}
                    className="px-3 py-1.5 bg-void border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSelecting(true)}
            className="px-3 py-1.5 bg-void border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Export
          </button>
        )}
      </div>

      {/* Search — hidden in select mode */}
      {!selecting && (
        <div className="relative mb-5">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entries…"
            className="w-full bg-void-light border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-dim/60 focus:outline-none focus:border-gold/40"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-primary transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Entry list */}
      {filtered.length === 0 ? (
        <p className="text-text-dim text-sm text-center py-10">No entries match your search.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ dateStr, date, text, moon, ruler }) => {
            const isOpen     = expanded === dateStr;
            const isChecked  = selected.has(dateStr);
            const preview    = text.length > 120 ? text.slice(0, 120).trimEnd() + '…' : text;

            return (
              <article
                key={dateStr}
                className={`bg-void-light border rounded-xl overflow-hidden transition-colors ${
                  selecting && isChecked ? 'border-gold/50 bg-gold/5' : 'border-border'
                }`}
              >
                {/* Entry header */}
                <button
                  className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-void-lighter transition-colors cursor-pointer"
                  onClick={() => {
                    if (selecting) { toggleSelect(dateStr); }
                    else           { setExpanded(isOpen ? null : dateStr); }
                  }}
                >
                  {/* Checkbox in select mode, moon emoji otherwise */}
                  {selecting ? (
                    <span className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isChecked ? 'bg-gold border-gold' : 'border-border bg-void'
                    }`}>
                      {isChecked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  ) : (
                    <span className="text-xl leading-none mt-0.5 shrink-0">{moon.emoji}</span>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 mb-1">
                      <h3 className="font-[family-name:var(--font-heading)] text-sm sm:text-base text-text-primary font-semibold">
                        {format(date, 'EEE, MMM d, yyyy')}
                      </h3>
                      <span className="text-text-dim text-xs shrink-0">{ruler} Day</span>
                    </div>
                    <p className="text-text-dim text-xs mb-2">{moon.phase}</p>
                    {!isOpen && !selecting && (
                      <p className="text-text-secondary text-sm leading-relaxed">{preview}</p>
                    )}
                    {selecting && (
                      <p className="text-text-secondary text-sm leading-relaxed">{preview}</p>
                    )}
                  </div>

                  {!selecting && <ChevronIcon open={isOpen} />}
                </button>

                {/* Expanded full entry */}
                {isOpen && !selecting && (
                  <div className="px-5 pb-5">
                    <div className="border-t border-border pt-4">
                      <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                        {text}
                      </p>
                      <button
                        onClick={() => onNavigateToDay(date)}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs text-gold border border-gold/30 rounded-full px-3 py-1.5 hover:bg-gold/10 transition-colors cursor-pointer"
                      >
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                          <path d="M10 3H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M15 3l2 2-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Open in Day View
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
