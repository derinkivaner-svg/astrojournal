import { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isToday
} from 'date-fns';
import { getMonthEvents, getMoonPhaseForDate } from '../utils/ephemeris';
import { getAllJournalDates } from '../utils/storage';

const EVENT_COLORS = {
  moon: 'bg-moon-silver/20 text-moon-silver border-moon-silver/30',
  ingress: 'bg-purple-mid text-purple-text border-purple-text/30',
  sun: 'bg-gold-glow text-gold border-gold/30',
  retrograde: 'bg-amber/15 text-amber border-amber/30',
};

const PLANET_GLYPHS = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const SIGN_GLYPHS = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

function getEventGlyphs(ev) {
  if (ev.type === 'lunation') {
    const moon = ev.subtype === 'new_moon' ? '🌑' : '🌕';
    return `${moon}${SIGN_GLYPHS[ev.sign] || ''}`;
  }
  if (ev.type === 'ingress') {
    return `${PLANET_GLYPHS[ev.planet] || ''}${SIGN_GLYPHS[ev.sign] || ''}`;
  }
  if (ev.type === 'retrograde') {
    const mark = ev.subtype === 'station_rx' ? '℞' : 'D';
    return `${PLANET_GLYPHS[ev.planet] || ''}${mark}`;
  }
  return '•';
}

export default function Calendar({ onSelectDay }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const events = useMemo(() => {
    return getMonthEvents(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
  }, [currentMonth.getFullYear(), currentMonth.getMonth()]);

  const journalDates = useMemo(() => new Set(getAllJournalDates()), [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [events]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Month header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 text-text-secondary hover:text-gold transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-text-primary">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 text-text-secondary hover:text-gold transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-text-dim text-xs uppercase tracking-wider py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-t border-l border-border">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const moonPhase = getMoonPhaseForDate(day);
          const dayEvents = eventsByDate[dateStr] || [];
          const hasJournal = journalDates.has(dateStr);

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDay(day)}
              className={`
                border-r border-b border-border min-h-[70px] sm:min-h-[100px] p-1 sm:p-1.5 cursor-pointer
                transition-colors hover:bg-void-lighter
                ${!inMonth ? 'opacity-30' : ''}
                ${today ? 'bg-gold-glow/30' : ''}
              `}
            >
              {/* Day number row */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${today ? 'text-gold' : 'text-text-primary'}`}>
                  {format(day, 'd')}
                </span>
                <div className="flex items-center gap-1">
                  {hasJournal && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
                  )}
                  <span className="text-xs">{moonPhase.emoji}</span>
                </div>
              </div>

              {/* Event glyphs (mobile) */}
              {dayEvents.length > 0 && (
                <div className="flex flex-wrap gap-0.5 sm:hidden" aria-label={`${dayEvents.length} events`}>
                  {dayEvents.slice(0, 4).map((ev, i) => (
                    <span
                      key={i}
                      title={ev.label}
                      className={`inline-flex items-center justify-center leading-none text-[11px] px-1 py-0.5 rounded border ${EVENT_COLORS[ev.color] || EVENT_COLORS.ingress}`}
                    >
                      {getEventGlyphs(ev)}
                    </span>
                  ))}
                  {dayEvents.length > 4 && (
                    <span className="text-[9px] leading-none text-text-dim self-center">+{dayEvents.length - 4}</span>
                  )}
                </div>
              )}

              {/* Event pills (tablet/desktop) */}
              <div className="hidden sm:block space-y-0.5">
                {dayEvents.slice(0, 3).map((ev, i) => (
                  <div
                    key={i}
                    title={ev.label}
                    className={`text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate ${EVENT_COLORS[ev.color] || EVENT_COLORS.ingress}`}
                  >
                    {ev.label}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-text-dim px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
