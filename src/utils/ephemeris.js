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

// Mean Keplerian orbital elements at J2000.0 and their per-century rates,
// from JPL's "Keplerian Elements for Approximate Positions of the Major Planets"
// (https://ssd.jpl.nasa.gov/planets/approx_pos.html). Valid 1800 AD – 2050 AD
// with ~0.1°–1° accuracy — comfortably precise enough for sign/degree display.
//
// Format per entry: [value_at_J2000, rate_per_julian_century]
//   a    semi-major axis           (AU)
//   e    eccentricity              (dimensionless)
//   I    inclination               (deg)
//   L    mean longitude            (deg)
//   pi   longitude of perihelion   (deg)  (often written ϖ)
//   node longitude of ascending node (deg)
const J2000_ELEMENTS = {
  Mercury: { a:[0.38709927, 0.00000037], e:[0.20563593,  0.00001906], I:[7.00497902,-0.00594749], L:[252.25032350,149472.67411175], pi:[77.45779628, 0.16047689], node:[48.33076593,-0.12534081] },
  Venus:   { a:[0.72333566, 0.00000390], e:[0.00677672, -0.00004107], I:[3.39467605,-0.00078890], L:[181.97909950, 58517.81538729], pi:[131.60246718, 0.00268329], node:[76.67984255,-0.27769418] },
  Earth:   { a:[1.00000261, 0.00000562], e:[0.01671123, -0.00004392], I:[-0.00001531,-0.01294668], L:[100.46457166, 35999.37244981], pi:[102.93768193, 0.32327364], node:[0.0, 0.0] },
  Mars:    { a:[1.52371034, 0.00001847], e:[0.09339410,  0.00007882], I:[1.84969142,-0.00813131], L:[-4.55343205,  19140.30268499], pi:[-23.94362959, 0.44441088], node:[49.55953891,-0.29257343] },
  Jupiter: { a:[5.20288700,-0.00011607], e:[0.04838624, -0.00013253], I:[1.30439695,-0.00183714], L:[34.39644051,   3034.74612775], pi:[14.72847983, 0.21252668], node:[100.47390909, 0.20469106] },
  Saturn:  { a:[9.53667594,-0.00125060], e:[0.05386179, -0.00050991], I:[2.48599187, 0.00193609], L:[49.95424423,   1222.49362201], pi:[92.59887831,-0.41897216], node:[113.66242448,-0.28867794] },
  Uranus:  { a:[19.18916464,-0.00196176], e:[0.04725744,-0.00004397], I:[0.77263783,-0.00242939], L:[313.23810451,   428.48202785], pi:[170.95427630, 0.40805281], node:[74.01692503, 0.04240589] },
  Neptune: { a:[30.06992276, 0.00026291], e:[0.00859048, 0.00005105], I:[1.77004347, 0.00035372], L:[-55.12002969,   218.45945325], pi:[44.96476227,-0.32241464], node:[131.78422574,-0.00508664] },
  Pluto:   { a:[39.48211675,-0.00031596], e:[0.24882730, 0.00005170], I:[17.14001206,0.00004818], L:[238.92903833,   145.20780515], pi:[224.06891629,-0.04062942], node:[110.30393684,-0.01183482] },
};

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// Solve Kepler's equation M = E - e·sin(E). M, E in degrees; e dimensionless.
function solveKepler(Mdeg, e) {
  // Normalize M to [-180, 180]
  let M = ((Mdeg + 180) % 360 + 360) % 360 - 180;
  let E = M + e * R2D * Math.sin(M * D2R);
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * R2D * Math.sin(E * D2R) - M) /
               (1 - e * Math.cos(E * D2R));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

// Heliocentric ecliptic rectangular coordinates (AU) in J2000 reference plane.
function heliocentricXYZ(planetName, T) {
  const el = J2000_ELEMENTS[planetName];
  if (!el) return null;
  const a  = el.a[0]    + el.a[1]    * T;
  const e  = el.e[0]    + el.e[1]    * T;
  const I  = el.I[0]    + el.I[1]    * T;
  const L  = el.L[0]    + el.L[1]    * T;
  const pi = el.pi[0]   + el.pi[1]   * T;
  const N  = el.node[0] + el.node[1] * T;
  const w  = pi - N;     // argument of perihelion
  const M  = L  - pi;    // mean anomaly
  const E  = solveKepler(M, e) * D2R;
  // Orbital-plane position with x toward perihelion
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(Math.max(0, 1 - e*e)) * Math.sin(E);
  // Rotate by (w, I, N) into ecliptic J2000
  const cw = Math.cos(w * D2R), sw = Math.sin(w * D2R);
  const cN = Math.cos(N * D2R), sN = Math.sin(N * D2R);
  const cI = Math.cos(I * D2R), sI = Math.sin(I * D2R);
  const x = (cw*cN - sw*sN*cI) * xp + (-sw*cN - cw*sN*cI) * yp;
  const y = (cw*sN + sw*cN*cI) * xp + (-sw*sN + cw*cN*cI) * yp;
  const z =        (sw*sI)     * xp +         (cw*sI)     * yp;
  return { x, y, z };
}

// Geocentric apparent ecliptic longitude (deg, 0-360) — what astrology uses.
function geocentricEclipticLon(planetName, T) {
  const p = heliocentricXYZ(planetName, T);
  const e = heliocentricXYZ('Earth', T);
  if (!p || !e) return 0;
  const gx = p.x - e.x;
  const gy = p.y - e.y;
  return norm360(Math.atan2(gy, gx) * R2D);
}

function planetLongitude(planet, T) {
  if (planet === 'Sun')  return sunLongitude(T);
  if (planet === 'Moon') return moonLongitude(T);
  return geocentricEclipticLon(planet, T);
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
