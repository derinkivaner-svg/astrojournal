// Parse Astro-Seek natal chart text export into structured JSON

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter',
  'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node',
  'Chiron', 'Lilith', 'ASC', 'MC', 'Ascendant', 'Midheaven',
  'True Node', 'Mean Node'
];

const SIGN_ABBREVS = {
  'Ari': 'Aries', 'Tau': 'Taurus', 'Gem': 'Gemini', 'Can': 'Cancer',
  'Leo': 'Leo', 'Vir': 'Virgo', 'Lib': 'Libra', 'Sco': 'Scorpio',
  'Sag': 'Sagittarius', 'Cap': 'Capricorn', 'Aqu': 'Aquarius', 'Pis': 'Pisces',
  'Ar': 'Aries', 'Ta': 'Taurus', 'Ge': 'Gemini', 'Cn': 'Cancer',
  'Le': 'Leo', 'Vi': 'Virgo', 'Li': 'Libra', 'Sc': 'Scorpio',
  'Sg': 'Sagittarius', 'Cp': 'Capricorn', 'Aq': 'Aquarius', 'Pi': 'Pisces'
};

const SIGN_SYMBOLS = {
  '♈': 'Aries', '♉': 'Taurus', '♊': 'Gemini', '♋': 'Cancer',
  '♌': 'Leo', '♍': 'Virgo', '♎': 'Libra', '♏': 'Scorpio',
  '♐': 'Sagittarius', '♑': 'Capricorn', '♒': 'Aquarius', '♓': 'Pisces'
};

function resolveSign(str) {
  if (!str) return null;
  const trimmed = str.trim();
  if (SIGNS.includes(trimmed)) return trimmed;
  if (SIGN_ABBREVS[trimmed]) return SIGN_ABBREVS[trimmed];
  if (SIGN_SYMBOLS[trimmed]) return SIGN_SYMBOLS[trimmed];
  for (const sign of SIGNS) {
    if (trimmed.toLowerCase().startsWith(sign.toLowerCase().slice(0, 3))) {
      return sign;
    }
  }
  return null;
}

function parseDegree(str) {
  if (!str) return null;
  const match = str.match(/(\d+)[°\s]+(\d+)?['\s]*(\d+)?/);
  if (match) {
    const deg = parseInt(match[1], 10);
    const min = match[2] ? parseInt(match[2], 10) : 0;
    const sec = match[3] ? parseInt(match[3], 10) : 0;
    return { degrees: deg, minutes: min, seconds: sec, decimal: deg + min / 60 + sec / 3600 };
  }
  const simple = parseFloat(str);
  if (!isNaN(simple)) {
    return { degrees: Math.floor(simple), minutes: Math.round((simple % 1) * 60), seconds: 0, decimal: simple };
  }
  return null;
}

function parseHouse(str) {
  if (!str) return null;
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function parseChartText(text) {
  const result = {
    planets: [],
    houses: [],
    aspects: [],
    raw: text
  };

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Parse planetary positions
  for (const line of lines) {
    for (const planet of PLANETS) {
      const regex = new RegExp(
        `^${planet.replace(/\s+/g, '\\s+')}\\b(.*)`,
        'i'
      );
      const match = line.match(regex);
      if (match) {
        const rest = match[1];
        const isRetrograde = /\bR\b|retrograde|\bRx\b/i.test(rest);

        let sign = null;
        let degree = null;
        let house = null;

        // Try to find sign
        for (const s of SIGNS) {
          if (rest.includes(s)) { sign = s; break; }
        }
        if (!sign) {
          for (const [sym, s] of Object.entries(SIGN_SYMBOLS)) {
            if (rest.includes(sym)) { sign = s; break; }
          }
        }
        if (!sign) {
          for (const [abbr, s] of Object.entries(SIGN_ABBREVS)) {
            const abbrRe = new RegExp(`\\b${abbr}\\b`, 'i');
            if (abbrRe.test(rest)) { sign = s; break; }
          }
        }

        // Try to find degree
        const degMatch = rest.match(/(\d+)[°\s]+(\d+)?['′]?\s*(\d+)?/);
        if (degMatch) {
          degree = parseDegree(degMatch[0]);
        }

        // Try to find house
        const houseMatch = rest.match(/(?:house|h)\s*(\d+)/i) || rest.match(/(\d+)(?:st|nd|rd|th)\s*house/i);
        if (houseMatch) {
          house = parseHouse(houseMatch[1]);
        }

        // Normalize planet names
        let planetName = planet;
        if (planet === 'Ascendant') planetName = 'ASC';
        if (planet === 'Midheaven') planetName = 'MC';
        if (planet === 'True Node' || planet === 'Mean Node') planetName = 'North Node';

        // Don't duplicate
        if (!result.planets.find(p => p.name === planetName)) {
          result.planets.push({
            name: planetName,
            sign,
            degree,
            house,
            retrograde: isRetrograde
          });
        }
        break;
      }
    }
  }

  // If we didn't find a South Node, infer from North Node
  const northNode = result.planets.find(p => p.name === 'North Node');
  if (northNode && !result.planets.find(p => p.name === 'South Node')) {
    const signIndex = SIGNS.indexOf(northNode.sign);
    const oppositeSign = signIndex >= 0 ? SIGNS[(signIndex + 6) % 12] : null;
    result.planets.push({
      name: 'South Node',
      sign: oppositeSign,
      degree: northNode.degree,
      house: northNode.house ? ((northNode.house + 5) % 12) + 1 : null,
      retrograde: false
    });
  }

  // Parse house cusps
  for (const line of lines) {
    const houseMatch = line.match(/(?:House|Cusp)\s*(\d+)\s*[:\-]?\s*(.*)/i);
    if (houseMatch) {
      const houseNum = parseInt(houseMatch[1], 10);
      const rest = houseMatch[2];
      let sign = null;
      for (const s of SIGNS) {
        if (rest.includes(s)) { sign = s; break; }
      }
      if (!sign) {
        for (const [abbr, s] of Object.entries(SIGN_ABBREVS)) {
          if (rest.includes(abbr)) { sign = s; break; }
        }
      }
      const degree = parseDegree(rest);
      if (houseNum >= 1 && houseNum <= 12) {
        result.houses.push({ house: houseNum, sign, degree });
      }
    }
  }

  // Parse aspects
  const ASPECT_TYPES = ['conjunction', 'sextile', 'square', 'trine', 'opposition', 'quincunx', 'semi-sextile'];
  for (const line of lines) {
    for (const aspect of ASPECT_TYPES) {
      if (line.toLowerCase().includes(aspect)) {
        // Try to extract two planets and orb
        const planetNames = [];
        for (const p of PLANETS) {
          if (line.toLowerCase().includes(p.toLowerCase())) {
            planetNames.push(p);
          }
        }
        const orbMatch = line.match(/(\d+[°.]?\d*)\s*(?:orb|°)/i);
        const orb = orbMatch ? parseFloat(orbMatch[1]) : null;
        if (planetNames.length >= 2) {
          result.aspects.push({
            planet1: planetNames[0],
            planet2: planetNames[1],
            type: aspect,
            orb
          });
        }
      }
    }
  }

  // Also try table-format aspect parsing (e.g. "Sun trine Moon 3°12'")
  for (const line of lines) {
    const tableMatch = line.match(
      /(\w[\w\s]*?)\s+(conjunction|sextile|square|trine|opposition|quincunx|semi-sextile)\s+(\w[\w\s]*?)(?:\s+(\d+[°.]?\d*['′]?\d*))?/i
    );
    if (tableMatch) {
      const p1 = tableMatch[1].trim();
      const aspectType = tableMatch[2].toLowerCase();
      const p2 = tableMatch[3].trim();
      const orbStr = tableMatch[4];
      const orb = orbStr ? parseFloat(orbStr) : null;
      if (!result.aspects.find(a => a.planet1 === p1 && a.planet2 === p2 && a.type === aspectType)) {
        result.aspects.push({ planet1: p1, planet2: p2, type: aspectType, orb });
      }
    }
  }

  return result;
}

export function getChartSummary(chart) {
  const planets = chart.planets.filter(p => p.sign);
  const houses = chart.houses.filter(h => h.sign);
  const aspects = chart.aspects;
  return {
    planetsFound: planets.length,
    housesFound: houses.length,
    aspectsFound: aspects.length,
    planets: planets.map(p => `${p.name} in ${p.sign}${p.degree ? ' ' + p.degree.degrees + '°' + p.degree.minutes + "'" : ''}${p.retrograde ? ' R' : ''}${p.house ? ' (House ' + p.house + ')' : ''}`),
    houses: houses.map(h => `House ${h.house}: ${h.sign}${h.degree ? ' ' + h.degree.degrees + '°' : ''}`),
    aspects: aspects.map(a => `${a.planet1} ${a.type} ${a.planet2}${a.orb ? ' (' + a.orb + '°)' : ''}`)
  };
}

export function getChartHash(chart) {
  const str = JSON.stringify(chart.planets.map(p => p.name + p.sign));
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
