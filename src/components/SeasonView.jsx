import { useMemo } from 'react';
import { format } from 'date-fns';
import { getCurrentSeason } from '../utils/ephemeris';
import { generateSeasonReading } from '../utils/interpreter';
import { getChart } from '../utils/storage';

const SEASON_EMOJIS = {
  Spring: '🌱', Summer: '☀️', Autumn: '🍂', Winter: '❄️'
};

export default function SeasonView() {
  const season = getCurrentSeason(new Date());
  const chart = getChart();

  const reading = useMemo(() => {
    if (!chart) return null;
    return generateSeasonReading(new Date(), chart);
  }, []);

  const sections = reading ? [
    { key: 'overview', title: 'Season Overview', color: 'purple-text' },
    { key: 'north_node_path', title: 'North Node Path', color: 'gold' },
    { key: 'career_creative', title: 'Career & Creative Work', color: 'purple-text' },
    { key: 'relationships_family', title: 'Relationships & Family', color: 'purple-text' },
    { key: 'body_energy', title: 'Body & Energy', color: 'purple-text' },
    { key: 'key_dates', title: 'Key Dates & Windows', color: 'gold' },
    { key: 'seasonal_intention', title: 'Seasonal Intention', color: 'gold' },
  ] : [];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <span className="text-4xl">{SEASON_EMOJIS[season.name]}</span>
        <h2 className="font-[family-name:var(--font-heading)] text-3xl text-text-primary mt-3">
          {season.name}
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          {format(season.start, 'MMMM d')} – {format(season.end, 'MMMM d, yyyy')}
        </p>
      </div>

      {reading && (
        <div className="space-y-5">
          {sections.map(({ key, title, color }) => {
            const content = reading[key];
            if (!content) return null;

            const isIntention = key === 'seasonal_intention';
            if (isIntention) {
              return (
                <section key={key} className="bg-gold-glow border border-border-gold rounded-xl p-6 text-center">
                  <h3 className="font-[family-name:var(--font-heading)] text-sm text-gold/70 uppercase tracking-wider mb-3">
                    {title}
                  </h3>
                  <p className="font-[family-name:var(--font-heading)] text-xl text-gold leading-relaxed">
                    {content}
                  </p>
                </section>
              );
            }

            return (
              <section key={key} className="bg-void-light border border-border rounded-xl p-5">
                <h3 className={`font-[family-name:var(--font-heading)] text-lg text-${color} mb-3`}>
                  {title}
                </h3>
                <p className="text-text-primary leading-relaxed">{content}</p>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
