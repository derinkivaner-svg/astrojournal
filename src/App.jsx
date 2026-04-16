import { useState, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import Calendar from './components/Calendar';
import DayView from './components/DayView';
import WeekView from './components/WeekView';
import SeasonView from './components/SeasonView';
import TransitsView from './components/TransitsView';
import ChartView from './components/ChartView';
import Settings from './components/Settings';
import { getChart } from './utils/storage';

const TABS = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'week', label: 'Week' },
  { id: 'season', label: 'Season' },
  { id: 'day', label: 'Day' },
  { id: 'transits', label: 'Transits' },
  { id: 'chart', label: 'Your Chart' },
];

function App() {
  const [chart, setChart] = useState(() => getChart());
  const [tab, setTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);

  // If no chart, show onboarding
  if (!chart) {
    return <Onboarding onComplete={(c) => setChart(c)} />;
  }

  function handleSelectDay(date) {
    setSelectedDate(date);
    setTab('day');
  }

  function handleResetChart() {
    setChart(null);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-void-light/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-gold text-lg">✦</span>
          <h1 className="font-[family-name:var(--font-heading)] text-lg text-text-primary font-semibold">
            AstroJournal
          </h1>
        </div>

        {/* Tab nav */}
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
                tab === t.id
                  ? 'bg-gold/15 text-gold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Settings gear */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 text-text-dim hover:text-gold transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M17.4 12.2a1.5 1.5 0 00.3 1.65l.05.06a1.82 1.82 0 01-1.29 3.1 1.82 1.82 0 01-1.29-.53l-.06-.06a1.5 1.5 0 00-1.65-.3 1.5 1.5 0 00-.91 1.37V18a1.82 1.82 0 01-3.64 0v-.09A1.5 1.5 0 008 16.53a1.5 1.5 0 00-1.65.3l-.06.06a1.82 1.82 0 01-2.58-2.58l.06-.06a1.5 1.5 0 00.3-1.65 1.5 1.5 0 00-1.37-.91H2a1.82 1.82 0 010-3.64h.09A1.5 1.5 0 003.47 8a1.5 1.5 0 00-.3-1.65l-.06-.06a1.82 1.82 0 012.58-2.58l.06.06a1.5 1.5 0 001.65.3H7.5a1.5 1.5 0 00.91-1.37V2a1.82 1.82 0 013.64 0v.09a1.5 1.5 0 00.91 1.37 1.5 1.5 0 001.65-.3l.06-.06a1.82 1.82 0 012.58 2.58l-.06.06a1.5 1.5 0 00-.3 1.65V7.5a1.5 1.5 0 001.37.91H18a1.82 1.82 0 010 3.64h-.09a1.5 1.5 0 00-1.37.91z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {tab === 'calendar' && <Calendar onSelectDay={handleSelectDay} />}
        {tab === 'day' && <DayView date={selectedDate} onChangeDate={setSelectedDate} />}
        {tab === 'week' && <WeekView />}
        {tab === 'season' && <SeasonView />}
        {tab === 'transits' && <TransitsView />}
        {tab === 'chart' && <ChartView />}
      </main>

      {/* Settings panel */}
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetChart={handleResetChart}
      />
    </div>
  );
}

export default App;
