// AI reading client with robust JSON parsing and caching

import { getChartHash } from './chartParser';
import { getCachedReading, setCachedReading } from './storage';
import { getTransitsSummary, getPlanetaryPositions } from './ephemeris';

// Robust JSON extraction: strips fences, fixes curly quotes, removes control chars
function robustJsonParse(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Empty AI response');

  let str = raw.trim();

  // Strip markdown code fences
  str = str.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Replace curly quotes with straight quotes
  str = str.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
  str = str.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

  // Replace en/em dashes
  str = str.replace(/[\u2013\u2014]/g, '-');

  // Remove ellipsis character
  str = str.replace(/\u2026/g, '...');

  // Remove any BOM
  str = str.replace(/^\uFEFF/, '');

  // Try direct parse first
  try {
    return JSON.parse(str);
  } catch (e) {
    // Remove control characters inside string values while preserving structure
    str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    // Escape unescaped newlines/tabs inside JSON strings
    // This regex finds content between quotes and escapes literal newlines
    str = str.replace(/"([^"\\]|\\.)*"/g, (match) => {
      return match
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    });

    try {
      return JSON.parse(str);
    } catch (e2) {
      // Last resort: try to find the first { ... } block
      const firstBrace = str.indexOf('{');
      const lastBrace = str.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extracted = str.slice(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(extracted);
        } catch (e3) {
          // Final fallback: aggressively clean
          const cleaned = extracted
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/[\x00-\x1F]/g, ' ');
          return JSON.parse(cleaned);
        }
      }
      throw new Error('Could not parse AI response as JSON');
    }
  }
}

function buildChartContext(chartData) {
  if (!chartData?.planets?.length) return 'No natal chart data available.';

  const parts = ['NATAL CHART:'];
  for (const p of chartData.planets) {
    if (p.sign) {
      let line = `${p.name} in ${p.sign}`;
      if (p.degree) line += ` at ${p.degree.degrees}°${p.degree.minutes}'`;
      if (p.house) line += ` (House ${p.house})`;
      if (p.retrograde) line += ' R';
      parts.push(line);
    }
  }
  if (chartData.houses?.length) {
    parts.push('\nHOUSE CUSPS:');
    for (const h of chartData.houses) {
      parts.push(`House ${h.house}: ${h.sign}${h.degree ? ' ' + h.degree.degrees + '°' : ''}`);
    }
  }
  if (chartData.aspects?.length) {
    parts.push('\nASPECTS:');
    for (const a of chartData.aspects) {
      parts.push(`${a.planet1} ${a.type} ${a.planet2}${a.orb ? ' (orb ' + a.orb + '°)' : ''}`);
    }
  }
  return parts.join('\n');
}

export async function fetchReading(type, date, chartData) {
  const hash = getChartHash(chartData);
  const dateStr = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
  const cacheKey = `${type}_${dateStr}_${hash}`;

  // Check cache
  const cached = getCachedReading(cacheKey);
  if (cached) return cached;

  const transits = getTransitsSummary(new Date(dateStr));
  const positions = getPlanetaryPositions(new Date(dateStr));
  const chartContext = buildChartContext(chartData);

  const transitContext = `TODAY'S SKY (${dateStr}):\n${transits.positions}\nMoon Phase: ${transits.moonPhase}\nPlanetary Day Ruler: ${transits.dayRuler}`;

  let systemPrompt, userPrompt;

  if (type === 'day') {
    systemPrompt = `You are an expert astrologer providing personalized daily readings. You combine transit astrology with natal chart interpretation. Return ONLY raw JSON with no markdown fencing, no backticks around the response, no curly quotes, no special unicode characters inside string values. Use only straight double quotes, straight apostrophes, and basic ASCII punctuation inside all string values. Do not use ellipsis characters, em dashes, or any unicode beyond basic ASCII letters and numbers in string values.`;

    userPrompt = `Given this natal chart and today's transits, generate a personalized daily reading.

${chartContext}

${transitContext}

Return a JSON object with exactly these keys:
{
  "climate": "A 3-4 sentence paragraph about the astrological climate today and how it aspects this person's natal chart specifically. Reference specific transits and natal placements.",
  "journaling_prompt": "One specific, deep, personal journaling question rooted in this person's chart themes and today's transits. Make it introspective and meaningful. Keep it to one or two sentences.",
  "soul_guidance": "2-3 sentences of practical soul guidance for the day connecting the person's nodal axis to current transits. Be specific to their chart.",
  "affirmation": "One short, powerful affirmation statement relevant to today's energy and their chart."
}

CRITICAL: Return ONLY the JSON object. No markdown. No code fences. No backticks. Use only straight quotes and basic ASCII in all string values.`;
  } else if (type === 'week') {
    const weekDays = [];
    const startDate = new Date(dateStr);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const pos = getPlanetaryPositions(d);
      const mp = getTransitsSummary(d);
      weekDays.push(`${d.toDateString()}: ${mp.dayRuler} day, Moon in ${mp.moonSign}, ${mp.moonPhase}`);
    }

    systemPrompt = `You are an expert astrologer providing personalized weekly readings. Return ONLY raw JSON. No markdown fencing, no backticks, no curly quotes, no special unicode. Use only straight quotes and basic ASCII in string values.`;

    userPrompt = `Given this natal chart and this week's transits, generate a personalized weekly reading.

${chartContext}

WEEK OVERVIEW:
${weekDays.join('\n')}

${transitContext}

Return a JSON object with exactly these keys:
{
  "overview": "A paragraph summarizing the week's major astrological themes and how they interact with this person's natal chart.",
  "focus": "A short paragraph about what to focus on this week based on the transits to their chart.",
  "watch_out": "A short paragraph about what to watch out for or handle with care this week.",
  "daily_summaries": ["One sentence energy summary for Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  "journaling_prompt": "A weekly journaling prompt connecting the week's themes to their chart."
}

CRITICAL: Return ONLY the JSON object. No markdown. No code fences. Use only straight quotes and basic ASCII.`;
  } else if (type === 'season') {
    systemPrompt = `You are an expert astrologer providing personalized seasonal readings. Return ONLY raw JSON. No markdown fencing, no backticks, no curly quotes, no special unicode. Use only straight quotes and basic ASCII in string values.`;

    userPrompt = `Given this natal chart and the current planetary positions, generate a personalized seasonal reading.

${chartContext}

${transitContext}

Return a JSON object with exactly these keys:
{
  "overview": "A 3-4 sentence overview of the season's major themes for this person.",
  "north_node_path": "2-3 sentences about how the season supports or challenges their North Node journey.",
  "career_creative": "2-3 sentences about career and creative work themes this season based on their chart.",
  "relationships_family": "2-3 sentences about relationship and family themes.",
  "body_energy": "2-3 sentences about physical energy and body awareness themes.",
  "key_dates": "3-5 key dates or windows to watch this season and why they matter for this chart.",
  "seasonal_intention": "One powerful intention-setting statement for the season."
}

CRITICAL: Return ONLY the JSON object. No markdown. No code fences. Use only straight quotes and basic ASCII.`;
  }

  try {
    const response = await fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        type,
        date: dateStr
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error ${response.status}: ${errText}`);
    }

    const rawText = await response.text();
    const parsed = robustJsonParse(rawText);

    // Cache the result
    setCachedReading(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.error('AI reading error:', err);
    throw err;
  }
}
