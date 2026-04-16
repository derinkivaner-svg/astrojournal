import { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { getPlanetaryPositions } from '../utils/ephemeris';
import { getChart } from '../utils/storage';

const PLANET_GLYPHS = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const SIGN_GLYPHS = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const ASPECT_TYPES = {
  conjunction: { angle: 0, orb: 8, symbol: '☌', label: 'Conjunction', nature: 'fusion' },
  sextile: { angle: 60, orb: 5, symbol: '⚹', label: 'Sextile', nature: 'opportunity' },
  square: { angle: 90, orb: 7, symbol: '□', label: 'Square', nature: 'tension' },
  trine: { angle: 120, orb: 8, symbol: '△', label: 'Trine', nature: 'harmony' },
  opposition: { angle: 180, orb: 8, symbol: '☍', label: 'Opposition', nature: 'awareness' },
};

const NATURE_COLORS = {
  fusion: 'text-gold border-gold/30 bg-gold-glow',
  opportunity: 'text-green-400 border-green-400/30 bg-green-900/15',
  tension: 'text-amber border-amber/30 bg-amber/10',
  harmony: 'text-purple-text border-purple-text/30 bg-purple-mid',
  awareness: 'text-moon-silver border-moon-silver/30 bg-moon-silver/10',
};

const NATURE_BADGE = {
  fusion: 'bg-gold/20 text-gold',
  opportunity: 'bg-green-900/30 text-green-400',
  tension: 'bg-amber/15 text-amber',
  harmony: 'bg-purple-mid text-purple-text',
  awareness: 'bg-moon-silver/15 text-moon-silver',
};

// ─── Transit interpretation data ───

const PLANET_THEMES = {
  Sun: { domain: 'identity, vitality, and purpose', transit: 'illuminates and energizes' },
  Moon: { domain: 'emotions, instincts, and inner needs', transit: 'stirs feelings around' },
  Mercury: { domain: 'communication, thinking, and perception', transit: 'activates mental focus on' },
  Venus: { domain: 'love, beauty, values, and pleasure', transit: 'softens and attracts energy toward' },
  Mars: { domain: 'drive, courage, action, and desire', transit: 'ignites willpower around' },
  Jupiter: { domain: 'expansion, wisdom, and abundance', transit: 'expands possibilities for' },
  Saturn: { domain: 'discipline, structure, and mastery', transit: 'tests and consolidates' },
  Uranus: { domain: 'change, freedom, and innovation', transit: 'shakes up and liberates' },
  Neptune: { domain: 'imagination, spirituality, and transcendence', transit: 'dissolves old patterns around' },
  Pluto: { domain: 'transformation, power, and rebirth', transit: 'profoundly transforms' },
};

const ASPECT_MEANINGS = {
  conjunction: {
    easy: 'This is a powerful merging of energies. The transit planet fuses with your natal planet, amplifying its themes and demanding your attention. This is neither easy nor hard — it is intense and initiating.',
    action: 'Lean into the intensity. This is a seed moment — what you start or commit to now carries the signature of both planets.',
  },
  sextile: {
    easy: 'A gentle, supportive aspect that opens doors if you choose to walk through them. The opportunity is real but requires you to notice and act on it.',
    action: 'Stay alert for small openings — conversations, invitations, or ideas that feel aligned. The universe is nudging, not pushing.',
  },
  square: {
    easy: 'Friction and tension are present, but this is productive pressure. Something needs to change, and this aspect is the catalyst. Avoid forcing outcomes.',
    action: 'Do not resist the discomfort. Ask what needs to shift. The tension is pointing toward growth you have been avoiding.',
  },
  trine: {
    easy: 'Natural flow and ease between these planetary energies. Talents and gifts surface effortlessly. The risk is taking this grace for granted.',
    action: 'Use this window actively. The ease can breed complacency — channel the harmony into something concrete.',
  },
  opposition: {
    easy: 'A see-saw between two poles of your experience. Others may mirror back what you cannot see in yourself. Projection is likely.',
    action: 'Look for the middle path. What you are rejecting in others or situations may be what you need to integrate within yourself.',
  },
};

const HOUSE_THEMES = {
  1: 'self-image and personal direction',
  2: 'finances, resources, and self-worth',
  3: 'communication, learning, and local community',
  4: 'home, family, and emotional foundations',
  5: 'creativity, romance, and self-expression',
  6: 'health, daily routines, and service',
  7: 'partnerships and close relationships',
  8: 'shared resources, intimacy, and transformation',
  9: 'higher learning, travel, and philosophy',
  10: 'career, public life, and legacy',
  11: 'friendships, community, and future vision',
  12: 'solitude, spirituality, and the unconscious',
};

function norm360(deg) {
  return ((deg % 360) + 360) % 360;
}

function findAllTransitAspects(transitPositions, natalPlanets) {
  const aspects = [];
  const transitPlanets = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const natalNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'ASC', 'MC'];

  for (const transit of transitPositions) {
    if (!transitPlanets.includes(transit.planet)) continue;
    for (const natal of natalPlanets) {
      if (!natal.sign || !natalNames.includes(natal.name)) continue;
      const signIdx = SIGNS.indexOf(natal.sign);
      if (signIdx < 0) continue;
      const natalLon = signIdx * 30 + (natal.degree?.decimal || 15);

      const diff = Math.abs(norm360(transit.longitude - natalLon));
      const angle = diff > 180 ? 360 - diff : diff;

      for (const [name, asp] of Object.entries(ASPECT_TYPES)) {
        if (Math.abs(angle - asp.angle) <= asp.orb) {
          const exactness = 1 - Math.abs(angle - asp.angle) / asp.orb;
          aspects.push({
            id: `${transit.planet}-${name}-${natal.name}`,
            transitPlanet: transit.planet,
            transitSign: transit.sign,
            transitDegree: transit.degree,
            natalPlanet: natal.name,
            natalSign: natal.sign,
            natalHouse: natal.house,
            aspectType: name,
            aspectSymbol: asp.symbol,
            aspectLabel: asp.label,
            nature: asp.nature,
            orb: Math.abs(angle - asp.angle).toFixed(1),
            exactness,
          });
        }
      }
    }
  }

  // Deduplicate (keep tightest per transit-natal pair)
  const seen = new Map();
  for (const a of aspects) {
    const key = `${a.transitPlanet}-${a.natalPlanet}`;
    if (!seen.has(key) || a.exactness > seen.get(key).exactness) {
      seen.set(key, a);
    }
  }

  return [...seen.values()].sort((a, b) => b.exactness - a.exactness);
}

// Find when the aspect is exact (scan nearby days)
function findExactDate(transitPlanet, natalLon, aspectAngle, centerDate) {
  let closest = null;
  let closestDiff = 999;
  for (let i = -15; i <= 30; i++) {
    const d = addDays(centerDate, i);
    const positions = getPlanetaryPositions(d);
    const tp = positions.find(p => p.planet === transitPlanet);
    if (!tp) continue;
    const diff = Math.abs(norm360(tp.longitude - natalLon));
    const angle = diff > 180 ? 360 - diff : diff;
    const dist = Math.abs(angle - aspectAngle);
    if (dist < closestDiff) {
      closestDiff = dist;
      closest = d;
    }
  }
  return closest;
}

function buildInterpretation(aspect) {
  const tInfo = PLANET_THEMES[aspect.transitPlanet];
  const nInfo = PLANET_THEMES[aspect.natalPlanet] || { domain: 'your personal expression', transit: 'activates' };
  const aspInfo = ASPECT_MEANINGS[aspect.aspectType];

  const parts = [];

  // What is happening
  parts.push(`Transit ${aspect.transitPlanet} in ${aspect.transitSign} is forming a ${aspect.aspectLabel.toLowerCase()} to your natal ${aspect.natalPlanet} in ${aspect.natalSign}${aspect.natalHouse ? ' (House ' + aspect.natalHouse + ')' : ''}. This aspect ${tInfo.transit} your ${nInfo.domain}.`);

  // House context
  if (aspect.natalHouse && HOUSE_THEMES[aspect.natalHouse]) {
    parts.push(`With this transit activating your ${ordinal(aspect.natalHouse)} house, themes of ${HOUSE_THEMES[aspect.natalHouse]} are especially highlighted right now.`);
  }

  // Aspect quality
  parts.push(aspInfo.easy);

  // Action guidance
  parts.push(aspInfo.action);

  return parts.join('\n\n');
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Find upcoming transits (next 30 days) not yet active ───

function findUpcomingTransits(natalPlanets, today) {
  const upcoming = [];
  const seen = new Set();

  for (let i = 1; i <= 30; i++) {
    const d = addDays(today, i);
    const positions = getPlanetaryPositions(d);
    const aspects = findAllTransitAspects(positions, natalPlanets);
    for (const a of aspects) {
      if (!seen.has(a.id) && a.exactness > 0.7) {
        seen.add(a.id);
        upcoming.push({ ...a, approxDate: d });
      }
    }
  }

  // Remove ones already active today
  const todayPositions = getPlanetaryPositions(today);
  const todayAspects = findAllTransitAspects(todayPositions, natalPlanets);
  const todayIds = new Set(todayAspects.map(a => a.id));

  return upcoming.filter(a => !todayIds.has(a.id)).slice(0, 10);
}

export default function TransitsView() {
  const [expanded, setExpanded] = useState(null);
  const today = new Date();
  const chart = getChart();

  const { active, upcoming } = useMemo(() => {
    if (!chart) return { active: [], upcoming: [] };
    const positions = getPlanetaryPositions(today);
    const active = findAllTransitAspects(positions, chart.planets);
    const upcoming = findUpcomingTransits(chart.planets, today);
    return { active, upcoming };
  }, [format(today, 'yyyy-MM-dd')]);

  function toggleExpand(id) {
    setExpanded(expanded === id ? null : id);
  }

  function renderTransitCard(aspect, section) {
    const isOpen = expanded === `${section}-${aspect.id}`;
    const colorClass = NATURE_COLORS[aspect.nature] || NATURE_COLORS.fusion;
    const badgeClass = NATURE_BADGE[aspect.nature] || NATURE_BADGE.fusion;

    return (
      <div key={`${section}-${aspect.id}`} className={`border rounded-xl overflow-hidden transition-colors ${colorClass}`}>
        <button
          onClick={() => toggleExpand(`${section}-${aspect.id}`)}
          className="w-full text-left p-4 cursor-pointer flex items-center gap-3"
        >
          {/* Planet glyphs */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-2xl" title={aspect.transitPlanet}>
              {PLANET_GLYPHS[aspect.transitPlanet]}
            </span>
            <span className="text-sm text-text-dim">{aspect.aspectSymbol}</span>
            <span className="text-2xl" title={aspect.natalPlanet}>
              {PLANET_GLYPHS[aspect.natalPlanet] || aspect.natalPlanet.charAt(0)}
            </span>
          </div>

          {/* Description */}
          <div className="flex-1 min-w-0">
            <p className="text-text-primary text-sm font-medium">
              {aspect.transitPlanet} {aspect.aspectLabel} {aspect.natalPlanet}
            </p>
            <p className="text-text-dim text-xs">
              {SIGN_GLYPHS[aspect.transitSign]} {aspect.transitSign} {aspect.transitDegree?.toFixed(0)}° → {SIGN_GLYPHS[aspect.natalSign]} {aspect.natalSign}
              {aspect.orb && <span className="ml-2">orb {aspect.orb}°</span>}
            </p>
          </div>

          {/* Nature badge */}
          <span className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-medium ${badgeClass}`}>
            {aspect.nature}
          </span>

          {/* Chevron */}
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`shrink-0 text-text-dim transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Expanded content */}
        {isOpen && (
          <div className="px-4 pb-5 pt-1 border-t border-inherit">
            <div className="text-text-primary text-sm leading-relaxed space-y-3">
              {buildInterpretation(aspect).split('\n\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-[family-name:var(--font-heading)] text-3xl text-text-primary">
          Transits
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          How the current sky aspects your natal chart
        </p>
      </div>

      {/* Active now */}
      {active.length > 0 && (
        <div className="mb-8">
          <h3 className="text-text-dim text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            Active Now
          </h3>
          <div className="space-y-2">
            {active.map(a => renderTransitCard(a, 'active'))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-text-dim text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-text/50" />
            Coming Up (Next 30 Days)
          </h3>
          <div className="space-y-2">
            {upcoming.map(a => (
              <div key={`upcoming-${a.id}`}>
                <div className="text-text-dim text-[10px] uppercase tracking-wider mb-1 ml-1">
                  ~{format(a.approxDate, 'MMM d')}
                </div>
                {renderTransitCard(a, 'upcoming')}
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && upcoming.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary">No significant transits detected for your chart right now.</p>
        </div>
      )}
    </div>
  );
}
