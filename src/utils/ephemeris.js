// Ephemeris engine for calculating planetary positions, ingresses, moon phases, retrogrades
// Uses simplified astronomical algorithms (VSOP87-lite / Meeus) for accuracy sufficient for astrology

import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays } from 'date-fns';

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const SIGN_EMOJIS = {
  'Aries': '♈', 'Taurus': '♉', 'Gemini': '♊', 'Cancer': '♋',
  'Leo': '♌', 'Virgo': '♍', 'Libra': '♎', 'Scorpio': '♏',
  'Sagittarius': '♐', 'Capricorn': '♑', 'Aquarius': '♒', 'Pisces': '♓'
};

// Julian Day Number from Date
function dateToJD(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate() + date.getHours() / 24 + date.getMinutes() / 1440;
  let Y = y, M = m;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5;
}

// Centuries since J2000.0
function julianCenturies(jd) {
  return (jd - 2451545.0) / 36525.0;
}

// Normalize angle to 0-360
function norm360(deg) {
  return ((deg % 360) + 360) % 360;
}

// Sun's ecliptic longitude (Meeus simplified)
function sunLongitude(T) {
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mrad = M * Math.PI / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad);
  const sunLon = L0 + C;
  // Apparent longitude (nutation)
  const omega = norm360(125.04 - 1934.136 * T);
  const apparent = sunLon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180);
  return norm360(apparent);
}

// Moon's ecliptic longitude (simplified Meeus)
function moonLongitude(T) {
  const Lp = norm360(218.3165 + 481267.8813 * T);
  const D = norm360(297.8502 + 445267.1115 * T);
  const M = norm360(357.5291 + 35999.0503 * T);
  const Mp = norm360(134.9634 + 477198.8676 * T);
  const F = norm360(93.2721 + 483202.0175 * T);

  const Drad = D * Math.PI / 180;
  const Mrad = M * Math.PI / 180;
  const Mprad = Mp * Math.PI / 180;
  const Frad = F * Math.PI / 180;

  let lon = Lp
    + 6.289 * Math.sin(Mprad)
    + 1.274 * Math.sin(2 * Drad - Mprad)
    + 0.658 * Math.sin(2 * Drad)
    + 0.214 * Math.sin(2 * Mprad)
    - 0.186 * Math.sin(Mrad)
    - 0.114 * Math.sin(2 * Frad)
    + 0.059 * Math.sin(2 * Drad - 2 * Mprad)
    + 0.057 * Math.sin(2 * Drad - Mrad - Mprad)
    + 0.053 * Math.sin(2 * Drad + Mprad)
    + 0.046 * Math.sin(2 * Drad - Mrad)
    - 0.041 * Math.sin(Mrad - Mprad)
    - 0.035 * Math.sin(Drad)
    - 0.031 * Math.sin(Mprad + Mrad);

  return norm360(lon);
}

// Planetary mean longitudes (simplified, sufficient for sign-level accuracy)
// Based on Meeus / VSOP87 truncated
const PLANET_ELEMENTS = {
  Mercury: { L0: 252.2509, L1: 149472.6746, perturbations: true },
  Venus: { L0: 181.9798, L1: 58517.8157, perturbations: true },
  Mars: { L0: 355.4330, L1: 19140.2993, perturbations: true },
  Jupiter: { L0: 34.3515, L1: 3034.9057, perturbations: false },
  Saturn: { L0: 50.0774, L1: 1222.1138, perturbations: false },
  Uranus: { L0: 314.0550, L1: 428.4677, perturbations: false },
  Neptune: { L0: 304.3487, L1: 218.4862, perturbations: false },
  Pluto: { L0: 238.9290, L1: 145.2078, perturbations: false }
};

function planetLongitude(planet, T) {
  if (planet === 'Sun') return sunLongitude(T);
  if (planet === 'Moon') return moonLongitude(T);

  const el = PLANET_ELEMENTS[planet];
  if (!el) return 0;

  let L = norm360(el.L0 + el.L1 * T);

  // Add simplified perturbation terms for inner planets
  if (planet === 'Mercury') {
    const M = norm360(174.7948 + 149472.5153 * T) * Math.PI / 180;
    L += 23.44 * Math.sin(M) + 2.98 * Math.sin(2 * M);
  } else if (planet === 'Venus') {
    const M = norm360(50.4161 + 58517.8039 * T) * Math.PI / 180;
    L += 0.77 * Math.sin(M);
  } else if (planet === 'Mars') {
    const M = norm360(19.3730 + 19139.8585 * T) * Math.PI / 180;
    L += 10.69 * Math.sin(M) + 0.58 * Math.sin(2 * M);
  } else if (planet === 'Jupiter') {
    const M = norm360(20.0202 + 3034.6114 * T) * Math.PI / 180;
    L += 5.55 * Math.sin(M) + 0.17 * Math.sin(2 * M);
  } else if (planet === 'Saturn') {
    const M = norm360(317.0207 + 1222.1138 * T) * Math.PI / 180;
    L += 6.40 * Math.sin(M) + 0.57 * Math.sin(2 * M);
  }

  return norm360(L);
}

// Get zodiac sign from ecliptic longitude
function getSign(longitude) {
  const index = Math.floor(norm360(longitude) / 30);
  return SIGNS[index];
}

function getSignDegree(longitude) {
  return norm360(longitude) % 30;
}

// Moon phase calculation
function getMoonPhase(date) {
  const jd = dateToJD(date);
  const T = julianCenturies(jd);
  const sunLon = sunLongitude(T);
  const moonLon = moonLongitude(T);
  const elongation = norm360(moonLon - sunLon);

  if (elongation < 11.25 || elongation >= 348.75) return { phase: 'New Moon', emoji: '🌑', angle: elongation };
  if (elongation < 33.75) return { phase: 'Waxing Crescent', emoji: '🌒', angle: elongation };
  if (elongation < 56.25) return { phase: 'Waxing Crescent', emoji: '🌒', angle: elongation };
  if (elongation < 78.75) return { phase: 'Waxing Crescent', emoji: '🌒', angle: elongation };
  if (elongation < 101.25) return { phase: 'First Quarter', emoji: '🌓', angle: elongation };
  if (elongation < 123.75) return { phase: 'Waxing Gibbous', emoji: '🌔', angle: elongation };
  if (elongation < 146.25) return { phase: 'Waxing Gibbous', emoji: '🌔', angle: elongation };
  if (elongation < 168.75) return { phase: 'Waxing Gibbous', emoji: '🌔', angle: elongation };
  if (elongation < 191.25) return { phase: 'Full Moon', emoji: '🌕', angle: elongation };
  if (elongation < 213.75) return { phase: 'Waning Gibbous', emoji: '🌖', angle: elongation };
  if (elongation < 236.25) return { phase: 'Waning Gibbous', emoji: '🌖', angle: elongation };
  if (elongation < 258.75) return { phase: 'Waning Gibbous', emoji: '🌖', angle: elongation };
  if (elongation < 281.25) return { phase: 'Last Quarter', emoji: '🌗', angle: elongation };
  if (elongation < 303.75) return { phase: 'Waning Crescent', emoji: '🌘', angle: elongation };
  if (elongation < 326.25) return { phase: 'Waning Crescent', emoji: '🌘', angle: elongation };
  return { phase: 'Waning Crescent', emoji: '🌘', angle: elongation };
}

// Find exact new/full moons in a month (by scanning daily and refining)
function findLunations(year, month) {
  const events = [];
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month + 1, 0); // include buffer

  let prevDate = null;
  let prevElongation = null;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const jd = dateToJD(d);
    const T = julianCenturies(jd);
    const sunLon = sunLongitude(T);
    const moonLon = moonLongitude(T);
    const elong = norm360(moonLon - sunLon);

    if (prevElongation !== null) {
      // New Moon: elongation wraps from high (near 360) to low (near 0)
      if (prevElongation > 300 && elong < 60) {
        // Unwrap and linearly interpolate the exact conjunction moment
        const elongUnwrapped = elong + 360;
        const frac = (360 - prevElongation) / (elongUnwrapped - prevElongation);
        const exact = evaluateLunationAt(prevDate, frac);
        if (exact.date.getMonth() === month - 1) {
          events.push(buildLunationEvent(exact, 'new_moon'));
        }
      }
      // Full Moon: elongation crosses 180 monotonically
      if (prevElongation < 180 && elong >= 180) {
        const frac = (180 - prevElongation) / (elong - prevElongation);
        const exact = evaluateLunationAt(prevDate, frac);
        if (exact.date.getMonth() === month - 1) {
          events.push(buildLunationEvent(exact, 'full_moon'));
        }
      }
    }
    prevDate = d;
    prevElongation = elong;
  }

  return events;
}

// Given a starting date and a fractional day offset, compute the Moon's
// longitude at that exact moment. Used to get accurate sign/degree at
// the true conjunction or opposition rather than at the detection midnight.
function evaluateLunationAt(startDate, frac) {
  const exactMs = startDate.getTime() + frac * 24 * 60 * 60 * 1000;
  const date = new Date(exactMs);
  const jd = dateToJD(date);
  const T = julianCenturies(jd);
  return { date, moonLon: moonLongitude(T) };
}

function buildLunationEvent({ date, moonLon }, subtype) {
  const sign = getSign(moonLon);
  const degree = Math.round(getSignDegree(moonLon));
  const label = subtype === 'new_moon'
    ? `New Moon in ${sign} ${degree}°`
    : `Full Moon in ${sign} ${degree}°`;
  return {
    date: format(date, 'yyyy-MM-dd'),
    type: 'lunation',
    subtype,
    label,
    sign,
    degree,
    color: 'moon',
  };
}

// Find planetary ingresses in a given month
function findIngresses(year, month) {
  const events = [];
  const planets = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const start = new Date(year, month - 1, 0); // day before month
  const end = new Date(year, month, 1); // day after month

  for (const planet of planets) {
    let prevSign = null;
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const jd = dateToJD(d);
      const T = julianCenturies(jd);
      const lon = planetLongitude(planet, T);
      const sign = getSign(lon);

      if (prevSign && sign !== prevSign && d.getMonth() === month - 1) {
        events.push({
          date: format(d, 'yyyy-MM-dd'),
          type: 'ingress',
          planet,
          sign,
          label: `${planet} enters ${sign}`,
          emoji: SIGN_EMOJIS[sign],
          color: planet === 'Sun' ? 'sun' : 'ingress'
        });
      }
      prevSign = sign;
    }
  }

  return events;
}

// Detect retrograde stations by checking if a planet's longitude decreases day-to-day
function findRetrogrades(year, month) {
  const events = [];
  const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const start = new Date(year, month - 1, -1);
  const end = new Date(year, month, 2);

  for (const planet of planets) {
    let prevLon = null;
    let prevDirect = null; // true = direct, false = retrograde

    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const jd = dateToJD(d);
      const T = julianCenturies(jd);
      const lon = planetLongitude(planet, T);

      if (prevLon !== null) {
        let diff = lon - prevLon;
        // Handle wrapping around 0/360
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        const isDirect = diff > 0;

        if (prevDirect !== null && isDirect !== prevDirect && d.getMonth() === month - 1) {
          if (!isDirect) {
            // Station retrograde
            const sign = getSign(lon);
            events.push({
              date: format(d, 'yyyy-MM-dd'),
              type: 'retrograde',
              subtype: 'station_rx',
              planet,
              sign,
              label: `${planet} Rx begins`,
              color: 'retrograde'
            });
          } else {
            // Station direct
            const sign = getSign(lon);
            events.push({
              date: format(d, 'yyyy-MM-dd'),
              type: 'retrograde',
              subtype: 'station_direct',
              planet,
              sign,
              label: `${planet} goes Direct`,
              color: 'retrograde'
            });
          }
        }
        prevDirect = isDirect;
      }
      prevLon = lon;
    }
  }

  return events;
}

// Get all transit events for a given month
export function getMonthEvents(year, month) {
  const lunations = findLunations(year, month);
  const ingresses = findIngresses(year, month);
  const retrogrades = findRetrogrades(year, month);
  return [...lunations, ...ingresses, ...retrogrades];
}

// Get moon phase for a specific date
export function getMoonPhaseForDate(date) {
  return getMoonPhase(date);
}

// Get current planetary positions for a date
export function getPlanetaryPositions(date) {
  const jd = dateToJD(date);
  const T = julianCenturies(jd);
  const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  return planets.map(planet => {
    const lon = planetLongitude(planet, T);
    const sign = getSign(lon);
    const degree = getSignDegree(lon);
    return { planet, longitude: lon, sign, degree: Math.round(degree * 100) / 100 };
  });
}

// Get the planetary day ruler
const DAY_RULERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
export function getPlanetaryDayRuler(date) {
  return DAY_RULERS[date.getDay()];
}

// Get current astronomical season
export function getCurrentSeason(date) {
  const year = date.getFullYear();
  // Approximate equinox/solstice dates
  const seasons = [
    { name: 'Winter', start: new Date(year - 1, 11, 21), end: new Date(year, 2, 19) },
    { name: 'Spring', start: new Date(year, 2, 20), end: new Date(year, 5, 19) },
    { name: 'Summer', start: new Date(year, 5, 20), end: new Date(year, 8, 21) },
    { name: 'Autumn', start: new Date(year, 8, 22), end: new Date(year, 11, 20) },
    { name: 'Winter', start: new Date(year, 11, 21), end: new Date(year + 1, 2, 19) }
  ];
  for (const s of seasons) {
    if (date >= s.start && date <= s.end) {
      return { name: s.name, start: s.start, end: s.end };
    }
  }
  return seasons[0];
}

// Get transits summary text for AI prompt
export function getTransitsSummary(date) {
  const positions = getPlanetaryPositions(date);
  const moonPhase = getMoonPhaseForDate(date);
  const ruler = getPlanetaryDayRuler(date);
  return {
    positions: positions.map(p => `${p.planet} in ${p.sign} at ${p.degree.toFixed(1)}°`).join(', '),
    moonPhase: moonPhase.phase,
    moonSign: positions.find(p => p.planet === 'Moon')?.sign || '',
    dayRuler: ruler
  };
}
