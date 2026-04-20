import { useState, useRef } from 'react';
import { getChart } from '../utils/storage';

// ─── Glyphs ───────────────────────────────────────────────────────────────
// \uFE0E forces text (not emoji) rendering on all platforms
const T = '\uFE0E';

const SIGN_GLYPHS = {
  Aries:`♈${T}`,Taurus:`♉${T}`,Gemini:`♊${T}`,Cancer:`♋${T}`,
  Leo:`♌${T}`,Virgo:`♍${T}`,Libra:`♎${T}`,Scorpio:`♏${T}`,
  Sagittarius:`♐${T}`,Capricorn:`♑${T}`,Aquarius:`♒${T}`,Pisces:`♓${T}`,
};
const PLANET_GLYPHS = {
  Sun:`☉${T}`,Moon:`☽${T}`,Mercury:`☿${T}`,Venus:`♀${T}`,Mars:`♂${T}`,
  Jupiter:`♃${T}`,Saturn:`♄${T}`,Uranus:`♅${T}`,Neptune:`♆${T}`,Pluto:`♇${T}`,
  'North Node':`☊${T}`,'South Node':`☋${T}`,Chiron:`⚷${T}`,Lilith:`⚸${T}`,
  ASC:'Ac', MC:'Mc',
};

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

// ─── Color scheme (white background) ─────────────────────────────────────
const PLANET_COLORS = {
  Sun:'#9a6600', Moon:'#3a5070', Mercury:'#5533aa', Venus:'#993366',
  Mars:'#bb2200', Jupiter:'#7a3a00', Saturn:'#2d5c2d', Uranus:'#006688',
  Neptune:'#1a2d8c', Pluto:'#5a0099', 'North Node':'#8B6B14',
  'South Node':'#8B6B14', Chiron:'#4a6070', Lilith:'#882244',
  ASC:'#7a5500', MC:'#7a5500',
};

const SIGN_ELEMENTS = {
  Aries:'fire',Taurus:'earth',Gemini:'air',Cancer:'water',
  Leo:'fire',Virgo:'earth',Libra:'air',Scorpio:'water',
  Sagittarius:'fire',Capricorn:'earth',Aquarius:'air',Pisces:'water',
};
const ELEMENT_BG    = { fire:'#FEF0EC', earth:'#EDFAED', air:'#ECF3FF', water:'#EDEEFF' };
const ELEMENT_COLOR = { fire:'#8B2200', earth:'#1a5c1a', air:'#0a2c8c', water:'#2a1a8c' };

// Alternating backgrounds for each natal house segment, so the eye can
// pick up the house change at a glance without fighting the sign colors.
const HOUSE_BG_ODD  = '#ffffff';
const HOUSE_BG_EVEN = '#eceff5';

const ASPECT_COLORS = {
  conjunction:'#c9a840', sextile:'#1a8040', square:'#cc2200',
  trine:'#5533aa', opposition:'#336688', quincunx:'#999',
};

// ─── Tooltip data ─────────────────────────────────────────────────────────
const PLANET_THEMES = {
  Sun:'Your identity, vitality, and core life purpose.',
  Moon:'Your emotional nature, instincts, and deepest needs.',
  Mercury:'Your mind, communication style, and way of learning.',
  Venus:'Your approach to love, beauty, values, and pleasure.',
  Mars:'Your drive, ambition, courage, and desire.',
  Jupiter:'Your philosophy, sense of abundance, and growth direction.',
  Saturn:'Your discipline, karmic lessons, and path to mastery.',
  Uranus:'Your urge for freedom, originality, and change.',
  Neptune:'Your spiritual longing, imagination, and ideals.',
  Pluto:'Your depth, power, and capacity for transformation.',
  'North Node':"Your soul's evolutionary direction and growth purpose.",
  'South Node':'Inherited gifts and patterns from the past to release.',
  Chiron:"Your deepest wound and the healer's gift within.",
  Lilith:'Your raw, untamed power and primal instincts.',
  ASC:'Your rising sign — how you appear and meet the world.',
  MC:'Your midheaven — vocation, public reputation, and legacy.',
};
const SIGN_THEMES = {
  Aries:'initiative, courage, and the pioneering spirit',
  Taurus:'stability, sensuality, and patient determination',
  Gemini:'curiosity, adaptability, and the meeting of minds',
  Cancer:'nurturing, emotional intelligence, and protective instinct',
  Leo:'creative self-expression, warmth, and generous leadership',
  Virgo:'discernment, service, and devoted attention to detail',
  Libra:'harmony, fairness, and the art of relationship',
  Scorpio:'depth, intensity, and transformative power',
  Sagittarius:'adventure, truth-seeking, and expansive vision',
  Capricorn:'ambition, discipline, and the long climb toward mastery',
  Aquarius:'innovation, independence, and visionary community',
  Pisces:'compassion, transcendence, and boundless imagination',
};
const HOUSE_THEMES = {
  1:'Self-image, personal direction, and how you meet the world.',
  2:'Material resources, finances, and sense of self-worth.',
  3:'Communication, local community, siblings, and learning.',
  4:'Home, family, roots, and emotional foundations.',
  5:'Creativity, romance, children, and joyful self-expression.',
  6:'Health, daily routines, work habits, and service.',
  7:'Partnerships, marriage, and close one-on-one relationships.',
  8:'Shared resources, intimacy, transformation, and hidden depths.',
  9:'Higher learning, philosophy, long travel, and spiritual quest.',
  10:'Career, vocation, public reputation, and lasting legacy.',
  11:'Friendships, community, social ideals, and future vision.',
  12:'Solitude, spirituality, the unconscious, and hidden matters.',
};
const ASPECT_MEANINGS = {
  conjunction:'A powerful fusion — both planets merge and intensify.',
  sextile:'Gentle opportunity — doors open when you step through.',
  square:'Productive tension — a friction point that drives growth.',
  trine:'Natural ease and flow — gifts that come effortlessly.',
  opposition:'Awareness axis — balance through integration of opposites.',
  quincunx:'Adjustment needed — two areas require constant fine-tuning.',
};

// ─── Detailed placement interpretation data ───────────────────────────────

const PLANET_FULL = {
  Sun:     { domain: 'your core identity, life force, and sense of purpose', verb: 'you shine and express yourself' },
  Moon:    { domain: 'your emotional landscape, instincts, and inner comfort needs', verb: 'you feel, react, and seek safety' },
  Mercury: { domain: 'your mind, communication style, and the way you process information', verb: 'you think, speak, and learn' },
  Venus:   { domain: 'your capacity for love, beauty, pleasure, and what you value most', verb: 'you love, attract, and create beauty' },
  Mars:    { domain: 'your will, physical energy, courage, and desire', verb: 'you act, assert, and pursue' },
  Jupiter: { domain: 'your sense of expansion, faith, abundance, and where you seek meaning', verb: 'you grow, explore, and find faith' },
  Saturn:  { domain: 'your relationship with structure, responsibility, time, and mastery', verb: 'you commit, endure, and build' },
  Uranus:  { domain: 'your need for freedom, originality, and radical change', verb: 'you rebel, innovate, and awaken' },
  Neptune: { domain: 'your spiritual longings, imagination, and relationship with the unseen', verb: 'you dream, dissolve, and transcend' },
  Pluto:   { domain: 'your deepest transformations, hidden power, and cycles of death and rebirth', verb: 'you transform, surrender, and regenerate' },
  'North Node': { domain: "your soul's evolutionary direction and the qualities you are growing toward in this lifetime", verb: 'you are called to evolve' },
  'South Node': { domain: 'your past-life patterns, innate gifts, and the comfort zones your soul is moving away from', verb: 'you carry forward' },
  Chiron:  { domain: 'your deepest wound and your greatest gift as a healer once you have walked through it', verb: 'you wound and heal' },
  Lilith:  { domain: 'your raw, untamed power — the part of you that refuses to be suppressed or domesticated', verb: 'you reclaim power' },
  ASC:     { domain: 'your outer persona, physical presence, and the first impression you make on the world', verb: 'you present yourself' },
  MC:      { domain: 'your public vocation, reputation, and the legacy you are building over a lifetime', verb: 'you achieve and are seen' },
};

const SIGN_FULL = {
  Aries:       { gift: 'courage, raw initiative, and the ability to start what others won\'t dare', shadow: 'impulsivity, aggression, and burning out before the finish line', mode: 'cardinal fire', approach: 'bold and direct' },
  Taurus:      { gift: 'endurance, sensory wisdom, and the capacity to build lasting, tangible value', shadow: 'stubbornness, possessiveness, and resistance to necessary change', mode: 'fixed earth', approach: 'steady and grounded' },
  Gemini:      { gift: 'intellectual agility, wit, and a natural ability to bridge ideas and people', shadow: 'scattered focus, superficiality, and chronic restlessness', mode: 'mutable air', approach: 'curious and versatile' },
  Cancer:      { gift: 'profound empathy, intuitive knowing, and the ability to make others feel held', shadow: 'emotional over-protection, moodiness, and difficulty letting go', mode: 'cardinal water', approach: 'nurturing and intuitive' },
  Leo:         { gift: 'magnetic warmth, creative generosity, and a natural gift for leadership and presence', shadow: 'ego attachment, need for constant validation, and drama when unseen', mode: 'fixed fire', approach: 'radiant and expressive' },
  Virgo:       { gift: 'precision, healing instinct, and a devoted commitment to improvement and service', shadow: 'harsh self-criticism, perfectionism, and chronic worry about inadequacy', mode: 'mutable earth', approach: 'discerning and precise' },
  Libra:       { gift: 'diplomatic grace, refined aesthetic vision, and a true gift for creating harmony', shadow: 'indecision, people-pleasing, and suppressing your own needs for peace', mode: 'cardinal air', approach: 'balanced and relational' },
  Scorpio:     { gift: 'depth perception, emotional intensity, and extraordinary transformative capacity', shadow: 'control, jealousy, obsession, and difficulty releasing what no longer serves', mode: 'fixed water', approach: 'deep and investigative' },
  Sagittarius: { gift: 'expansive vision, philosophical insight, and a contagious faith in what is possible', shadow: 'overextension, bluntness, and avoidance of detail or commitment', mode: 'mutable fire', approach: 'expansive and idealistic' },
  Capricorn:   { gift: 'strategic long-term mastery, quiet ambition, and the discipline to build something that lasts', shadow: 'rigidity, emotional suppression, and equating worth with productivity', mode: 'cardinal earth', approach: 'structured and ambitious' },
  Aquarius:    { gift: 'visionary originality, humanitarian awareness, and the ability to see what others miss', shadow: 'emotional detachment, contrarianism, and disconnection from personal intimacy', mode: 'fixed air', approach: 'innovative and independent' },
  Pisces:      { gift: 'boundless compassion, creative imagination, and deep spiritual sensitivity', shadow: 'escapism, boundary dissolution, and difficulty separating self from others\' pain', mode: 'mutable water', approach: 'fluid and empathic' },
};

function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function buildDetailedAnalysis(planet) {
  const pf = PLANET_FULL[planet.name];
  const sf = planet.sign ? SIGN_FULL[planet.sign] : null;
  const hTheme = planet.house ? HOUSE_THEMES[planet.house] : null;
  if (!pf || !sf) return [];

  const paras = [];

  // Core expression
  paras.push(
    `${planet.name} governs ${pf.domain}. In ${planet.sign}, ${pf.verb} with a ${sf.approach} quality — filtered through ${planet.sign}'s energy of ${SIGN_THEMES[planet.sign]}. This is a ${sf.mode} placement, meaning this part of you operates in a ${sf.mode.split(' ')[0]} register.`
  );

  // House context
  if (hTheme) {
    paras.push(
      `Placed in the ${ordinal(planet.house)} house, this energy plays out most visibly in the realm of ${hTheme.toLowerCase().replace(/\.$/, '')}. This is where ${planet.name}'s themes and ${planet.sign}'s style meet real life most directly.`
    );
  }

  // Gift
  paras.push(`✦ Gift: ${sf.gift}.`);

  // Shadow
  paras.push(`◈ Shadow: ${sf.shadow}. When this placement is under pressure or unexpressed, these patterns tend to surface first — not as flaws, but as signals pointing back toward the gift.`);

  // Retrograde note
  if (planet.retrograde) {
    paras.push(`℞ Retrograde: ${planet.name} was retrograde at your birth, suggesting its themes are more internalised and deeply personal. You may have had to unlearn external definitions of what this planet means before discovering your own relationship with it.`);
  }

  return paras;
}

// ─── SVG geometry ─────────────────────────────────────────────────────────
const CX = 280, CY = 280;

/*
  Ring layout (560×560 SVG, outer→inner):
  ┌──────────────────────────────┐  R=268  outer edge
  │  ZODIAC RING  (24 px)        │
  ├──────────────────────────────┤  R=244  zodiac inner / hnum outer
  │  HOUSE № STRIP  (30 px)      │
  ├──────────────────────────────┤  R=214  planet zone outer
  │  PLANET ZONE   (124 px)      │  ← radial stacking: 3 rings
  │    outer ring     R≈190      │
  │    middle ring    R≈158      │
  │    inner ring     R≈126      │
  ├──────────────────────────────┤  R=90   inner circle
  │  CENTER  (Sun/Moon/Rising)   │
  └──────────────────────────────┘
*/
const R = {
  zodiacOuter: 268,
  zodiacInner: 244,
  hnumInner:   214,
  // Planet stacking radii — spaced 32 px apart, all within planet zone
  p1: 190, p2: 158, p3: 126,
  innerR:  90,
  aspectR: 68,
};
const PLANET_RADII = [R.p1, R.p2, R.p3]; // preference order for collision avoidance
const PLANET_CIRC  = 14; // planet circle radius (px)
const COL_THRESH   = 13; // minimum angular gap (ecliptic °) before collision

// ─── Helpers ──────────────────────────────────────────────────────────────
function getEclLon(sign, degree) {
  const idx = SIGNS.indexOf(sign);
  return idx < 0 ? 0 : idx * 30 + (degree?.decimal || 0);
}
function toAngle(lon, ascLon) {
  return ((270 - (lon - ascLon)) % 360 + 360) % 360;
}
function polarXY(angleDeg, r) {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}
function angularDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function sectorPath(startLon, endLon, r1, r2, ascLon) {
  const a1 = toAngle(startLon, ascLon);
  const a2 = toAngle(endLon, ascLon);
  const span = ((a1 - a2) % 360 + 360) % 360;
  const large = span > 180 ? 1 : 0;
  const [x1,y1] = polarXY(a1,r1), [x2,y2] = polarXY(a2,r1);
  const [x3,y3] = polarXY(a2,r2), [x4,y4] = polarXY(a1,r2);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r1} ${r1} 0 ${large} 0 ${x2.toFixed(1)} ${y2.toFixed(1)} L${x3.toFixed(1)} ${y3.toFixed(1)} A${r2} ${r2} 0 ${large} 1 ${x4.toFixed(1)} ${y4.toFixed(1)}Z`;
}

function getHouseCusps(chart, ascLon) {
  // First pass: read parsed house data
  const cusps = Array.from({ length: 12 }, (_, i) => {
    const cusp = chart.houses?.find(h => h.house === i + 1);
    if (cusp?.sign) return getEclLon(cusp.sign, cusp.degree);
    return null;
  });

  // House 1 is always the Ascendant (exact degree)
  cusps[0] = ascLon;

  // House 10 = MC if not parsed from house data
  if (cusps[9] === null) {
    const mc = chart.planets?.find(p => p.name === 'MC');
    if (mc?.sign) cusps[9] = getEclLon(mc.sign, mc.degree);
  }

  // Fill any remaining nulls with equal-house fallback
  return cusps.map((c, i) =>
    c !== null ? c : ((ascLon + i * 30) % 360 + 360) % 360
  );
}

// Radial collision avoidance: keeps exact angle, shifts radius if overlap detected
function assignRadii(rawPositions) {
  const sorted = [...rawPositions].sort((a, b) => a.lon - b.lon);
  const placed = [];
  for (const p of sorted) {
    let r = PLANET_RADII[0];
    for (const candidate of PLANET_RADII) {
      const collides = placed.some(q =>
        q.assignedR === candidate && angularDiff(p.lon, q.lon) < COL_THRESH
      );
      if (!collides) { r = candidate; break; }
    }
    placed.push({ ...p, assignedR: r });
  }
  return placed;
}

// ─── Tooltip builders ─────────────────────────────────────────────────────
function buildPlanetTooltip(planet) {
  const theme = PLANET_THEMES[planet.name] || '';
  const signTheme = planet.sign ? SIGN_THEMES[planet.sign] || '' : '';
  const degStr = planet.degree
    ? `${planet.degree.degrees}°${String(planet.degree.minutes).padStart(2,'0')}'` : '';
  const heading =
    `${planet.name}${planet.retrograde?' ℞':''} in ${planet.sign||'?'} ${degStr}${planet.house?` · H${planet.house}`:''}`;
  const body = signTheme
    ? `${theme} Through ${planet.sign}, this expresses with ${signTheme}.`
    : theme;
  return { heading, body };
}
function buildHouseTooltip(n, sign) {
  const heading = `House ${n}${sign?` — ${sign} ${SIGN_GLYPHS[sign]||''}`:''}`;
  const body = HOUSE_THEMES[n] + (sign && SIGN_THEMES[sign]
    ? ` ${sign}'s energy of ${SIGN_THEMES[sign]} colors this area.` : '');
  return { heading, body };
}
function buildAspectTooltip(a) {
  return {
    heading: `${a.planet1} ${a.type} ${a.planet2}${a.orb!=null?` · ${a.orb}° orb`:''}`,
    body: ASPECT_MEANINGS[a.type] || '',
  };
}

const FONT = "'Segoe UI Symbol','Apple Symbols','Noto Sans Symbols',serif";
const SANS = "'Inter','Helvetica Neue',sans-serif";
const MAIN_ASPECTS = ['conjunction','sextile','square','trine','opposition'];

function aspectKey(a) {
  return `${a.planet1}-${a.type}-${a.planet2}`;
}

// ─── Component ────────────────────────────────────────────────────────────
export default function ChartView() {
  const [tooltip, setTooltip]               = useState(null);
  const [expanded, setExpanded]             = useState(null); // planet name
  const [expandedAspect, setExpandedAspect] = useState(null); // aspect key
  const containerRef   = useRef(null);
  const placementRefs  = useRef({}); // planet name → DOM node
  const aspectRefs     = useRef({}); // aspect key → DOM node
  const chart = getChart();
  if (!chart) return null;

  const ascPlanet = chart.planets.find(p => p.name === 'ASC');
  const ascLon = ascPlanet?.sign ? getEclLon(ascPlanet.sign, ascPlanet.degree) : 0;
  const houseCusps = getHouseCusps(chart, ascLon);
  const planets = chart.planets.filter(p => p.sign && SIGNS.includes(p.sign));

  const planetLons = {};
  for (const p of planets) planetLons[p.name] = getEclLon(p.sign, p.degree);

  function showTooltip(e, content) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ content, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  const hideTooltip = () => setTooltip(null);

  function scrollToRef(node) {
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handlePlanetClick(planetName) {
    setExpanded(planetName);
    hideTooltip();
    // Wait a tick so the accordion starts opening before we scroll.
    requestAnimationFrame(() => scrollToRef(placementRefs.current[planetName]));
  }

  function handleAspectClick(aspect) {
    const key = aspectKey(aspect);
    setExpandedAspect(key);
    hideTooltip();
    requestAnimationFrame(() => scrollToRef(aspectRefs.current[key]));
  }

  // ── Precompute ──────────────────────────────────────────────────────────

  // Zodiac ring
  const zodiacSegs = SIGNS.map((sign, i) => {
    const [tx, ty] = polarXY(toAngle(i * 30 + 15, ascLon), (R.zodiacOuter + R.zodiacInner) / 2);
    const el = SIGN_ELEMENTS[sign];
    return { sign, d: sectorPath(i*30,(i+1)*30,R.zodiacOuter,R.zodiacInner,ascLon), tx, ty, el };
  });

  // House data
  const houseData = houseCusps.map((lon, i) => {
    const nextLon = houseCusps[(i+1)%12];
    const span = ((nextLon - lon) % 360 + 360) % 360;
    const midAngle = toAngle(lon + span/2, ascLon);
    const cuspAngle = toAngle(lon, ascLon);
    const [hx, hy] = polarXY(midAngle, (R.zodiacInner + R.hnumInner) / 2);
    const [lx1,ly1] = polarXY(cuspAngle, R.zodiacOuter + 2);
    const [lx2,ly2] = polarXY(cuspAngle, 0);
    const signIdx = Math.floor(((lon%360)+360)%360/30)%12;
    return {
      houseNum: i+1, hx, hy,
      lx1,ly1,lx2,ly2,
      sectorD: sectorPath(lon, lon+span, R.zodiacInner, R.innerR, ascLon),
      cuspSign: SIGNS[signIdx],
      isAsc: i === 0,
    };
  });

  // Planet positions with collision avoidance
  const rawPositions = planets.map(p => ({
    planet: p,
    lon: planetLons[p.name],
    svgAngle: toAngle(planetLons[p.name], ascLon),
  }));
  const spreadPositions = assignRadii(rawPositions).map(p => {
    const [x, y] = polarXY(p.svgAngle, p.assignedR);
    return { planet: p.planet, x, y, r: p.assignedR };
  });

  // Aspect lines
  const aspectLines = (chart.aspects || [])
    .filter(a => MAIN_ASPECTS.includes(a.type)
      && planetLons[a.planet1] !== undefined
      && planetLons[a.planet2] !== undefined)
    .map(a => {
      const [x1,y1] = polarXY(toAngle(planetLons[a.planet1], ascLon), R.aspectR);
      const [x2,y2] = polarXY(toAngle(planetLons[a.planet2], ascLon), R.aspectR);
      return { aspect:a, x1,y1,x2,y2, color: ASPECT_COLORS[a.type]||'#999' };
    });

  // Center key placements
  const sunP  = planets.find(p => p.name === 'Sun');
  const moonP = planets.find(p => p.name === 'Moon');
  const ascP  = planets.find(p => p.name === 'ASC');

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="font-[family-name:var(--font-heading)] text-3xl text-text-primary">
          Your Chart
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          Hover to preview · tap a planet or aspect to jump to its details
        </p>
      </div>

      {/* ── Chart Wheel ── */}
      <div ref={containerRef} className="relative select-none">
        <svg
          viewBox="0 0 560 560"
          className="w-full max-w-[560px] mx-auto block rounded-full shadow-lg"
          onMouseLeave={hideTooltip}
          style={{ fontFamily: FONT, background: 'white' }}
        >
          {/* 1. White base */}
          <circle cx={CX} cy={CY} r={R.zodiacOuter+5} fill="white" />

          {/* 2. Zodiac element segments */}
          {zodiacSegs.map(({ sign, d, tx, ty, el }) => (
            <g key={sign} className="cursor-pointer"
               onMouseEnter={e => showTooltip(e,{ heading:`${sign} ${SIGN_GLYPHS[sign]}`, body:SIGN_THEMES[sign] })}>
              <path d={d} fill={ELEMENT_BG[el]} stroke={ELEMENT_COLOR[el]} strokeWidth="0.3" strokeOpacity="0.4" />
              <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
                    fontSize="17" fontWeight="700" fill={ELEMENT_COLOR[el]}
                    style={{ pointerEvents:'none' }}>
                {SIGN_GLYPHS[sign]}
              </text>
            </g>
          ))}

          {/* 3. Degree tick marks inside zodiac ring */}
          {Array.from({ length: 360 }, (_, lon) => {
            if (lon % 30 === 0) return null; // sign boundaries already shown by sector borders
            const angle = toAngle(lon, ascLon);
            const isTen  = lon % 10 === 0;
            const isFive = lon % 5  === 0;
            const len = isTen ? 10 : isFive ? 7 : 4;
            const sw  = isTen ? 0.7 : isFive ? 0.5 : 0.35;
            const [x1, y1] = polarXY(angle, R.zodiacInner);
            const [x2, y2] = polarXY(angle, R.zodiacInner + len);
            return (
              <line key={lon} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="rgba(0,0,0,0.28)" strokeWidth={sw}
                    style={{ pointerEvents: 'none' }} />
            );
          })}

          {/* 4a. Zodiac ring borders */}
          <circle cx={CX} cy={CY} r={R.zodiacOuter} fill="none" stroke="#2a2a2a" strokeWidth="1.2" />
          <circle cx={CX} cy={CY} r={R.zodiacInner} fill="none" stroke="#555"    strokeWidth="0.8" />

          {/* 4. Alternating per-house backgrounds (from zodiac inner edge
               to inner circle). Two colors by odd/even so it's easy to see
               where one house ends and the next begins. */}
          {houseData.map(({ houseNum, sectorD }) => (
            <path key={`hbg-${houseNum}`} d={sectorD}
                  fill={houseNum % 2 ? HOUSE_BG_ODD : HOUSE_BG_EVEN}
                  stroke="none" style={{ pointerEvents: 'none' }} />
          ))}

          {/* 5. House cusp lines — run full length from edge to center */}
          {houseData.map(({ lx1,ly1,lx2,ly2,isAsc }, i) => (
            <line key={`cusp-${i}`}
              x1={lx2} y1={ly2} x2={lx1} y2={ly1}
              stroke={isAsc ? '#c9a84c' : '#aaa'}
              strokeWidth={isAsc ? 1.6 : 0.7}
              style={{ pointerEvents:'none' }}
            />
          ))}

          {/* 6. Strip borders drawn on top of cusp lines for clean intersection */}
          <circle cx={CX} cy={CY} r={R.zodiacInner} fill="none" stroke="#555" strokeWidth="0.8" />
          <circle cx={CX} cy={CY} r={R.hnumInner}   fill="none" stroke="#aaa" strokeWidth="0.6" />

          {/* 7. House hover targets */}
          {houseData.map(({ houseNum, sectorD, cuspSign }) => (
            <path key={`ht-${houseNum}`} d={sectorD} fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={e => showTooltip(e, buildHouseTooltip(houseNum, cuspSign))} />
          ))}

          {/* 8. Aspect lines (inside inner circle) */}
          {aspectLines.map(({ aspect, x1,y1,x2,y2,color }, i) => (
            <g key={`asp-${i}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={color} strokeWidth="1" opacity="0.45"
                    style={{ pointerEvents:'none' }} />
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="transparent" strokeWidth="10"
                    className="cursor-pointer"
                    onMouseEnter={e => showTooltip(e, buildAspectTooltip(aspect))}
                    onClick={() => handleAspectClick(aspect)} />
            </g>
          ))}

          {/* 9. Inner circle — white cover for aspect web center */}
          <circle cx={CX} cy={CY} r={R.innerR} fill="white" stroke="#ccc" strokeWidth="0.7" />

          {/* 10. Center content — Sun / Moon / Rising */}
          {sunP && (
            <text x={CX} y={ascP ? CY - 20 : moonP ? CY - 10 : CY}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="11.5" fontWeight="600" fill={PLANET_COLORS.Sun}
                  style={{ fontFamily: FONT, pointerEvents:'none' }}>
              {`☉${T} ${sunP.sign}`}
            </text>
          )}
          {moonP && (
            <text x={CX} y={ascP ? CY : sunP ? CY : CY}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="11.5" fontWeight="600" fill={PLANET_COLORS.Moon}
                  style={{ fontFamily: FONT, pointerEvents:'none' }}>
              {`☽${T} ${moonP.sign}`}
            </text>
          )}
          {ascP && (
            <text x={CX} y={sunP ? CY + 20 : moonP ? CY + 10 : CY}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="11.5" fontWeight="600" fill={PLANET_COLORS.ASC}
                  style={{ fontFamily: FONT, pointerEvents:'none' }}>
              {`↑ ${ascP.sign}`}
            </text>
          )}

          {/* 11. Planet circles + glyphs (with radial collision avoidance) */}
          {spreadPositions.map(({ planet, x, y }) => {
            const color = PLANET_COLORS[planet.name] || '#444';
            const glyph = PLANET_GLYPHS[planet.name] || planet.name.charAt(0);
            return (
              <g key={planet.name} className="cursor-pointer"
                 onMouseEnter={e => showTooltip(e, buildPlanetTooltip(planet))}
                 onClick={() => handlePlanetClick(planet.name)}>
                <circle cx={x} cy={y} r={PLANET_CIRC}
                        fill="white" stroke={color} strokeWidth="1.4" />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                      fontSize="13" fontWeight="700" fill={color}
                      style={{ pointerEvents:'none' }}>
                  {glyph}
                </text>
                {planet.retrograde && (
                  <text x={x+PLANET_CIRC-1} y={y-PLANET_CIRC+1}
                        fontSize="7" fontWeight="700" fill={color}
                        style={{ pointerEvents:'none' }}>ℛ</text>
                )}
              </g>
            );
          })}

          {/* 12. House numbers — rendered last, always on top of strip */}
          {houseData.map(({ houseNum, hx, hy }) => {
            const isAngle = [1,4,7,10].includes(houseNum);
            return (
              <text key={`hn-${houseNum}`} x={hx} y={hy}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={isAngle ? 12 : 10.5}
                    fontWeight={isAngle ? '800' : '600'}
                    fill={isAngle ? '#7a5500' : '#555'}
                    style={{ pointerEvents:'none', fontFamily: SANS }}>
                {houseNum}
              </text>
            );
          })}

          {/* 13. ASC / DSC labels just inside zodiac ring */}
          {ascPlanet && (() => {
            const [ax,ay] = polarXY(toAngle(ascLon,        ascLon), R.zodiacInner - 5);
            const [dx,dy] = polarXY(toAngle(ascLon + 180,  ascLon), R.zodiacInner - 5);
            return (<>
              <text x={ax} y={ay} textAnchor="middle" dominantBaseline="central"
                    fontSize="7.5" fontWeight="800" fill="#c9a84c"
                    style={{ pointerEvents:'none', fontFamily: SANS }}>ASC</text>
              <text x={dx} y={dy} textAnchor="middle" dominantBaseline="central"
                    fontSize="7.5" fontWeight="700" fill="#aaa"
                    style={{ pointerEvents:'none', fontFamily: SANS }}>DSC</text>
            </>);
          })()}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div className="absolute z-50 pointer-events-none"
               style={{
                 left: tooltip.x > 370 ? tooltip.x - 14 : tooltip.x + 14,
                 top:  tooltip.y > 400 ? tooltip.y - 90 : tooltip.y - 10,
                 transform: tooltip.x > 370 ? 'translateX(-100%)' : 'none',
               }}>
            <div className="bg-void border border-border rounded-xl shadow-xl p-3 max-w-[230px]">
              <p className="text-gold text-xs font-semibold mb-1 leading-snug">
                {tooltip.content.heading}
              </p>
              <p className="text-text-secondary text-xs leading-relaxed">
                {tooltip.content.body}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Natal placements list (expandable) ── */}
      <div className="mt-6">
        <h3 className="text-text-dim text-xs uppercase tracking-wider mb-3">Natal Placements</h3>
        <div className="space-y-2">
          {planets.map(p => {
            const color = PLANET_COLORS[p.name] || '#444';
            const glyph = PLANET_GLYPHS[p.name] || p.name.charAt(0);
            const isOpen = expanded === p.name;
            const analysis = buildDetailedAnalysis(p);
            const hasAnalysis = analysis.length > 0;
            return (
              <div key={p.name}
                   ref={(el) => { placementRefs.current[p.name] = el; }}
                   className="bg-void-light border border-border rounded-xl overflow-hidden transition-colors scroll-mt-20">
                {/* Header row */}
                <button
                  onClick={() => hasAnalysis && setExpanded(isOpen ? null : p.name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${hasAnalysis ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}
                >
                  {/* Planet glyph */}
                  <span style={{ color }} className="text-xl shrink-0 w-6 text-center">{glyph}</span>

                  {/* Name + position */}
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-semibold leading-tight">
                      {p.name}{p.retrograde ? ' ℞' : ''}
                    </p>
                    <p className="text-text-dim text-xs mt-0.5">
                      {SIGN_GLYPHS[p.sign]} {p.sign}
                      {p.degree ? ` ${p.degree.degrees}°${String(p.degree.minutes).padStart(2,'0')}'` : ''}
                      {p.house ? ` · House ${p.house}` : ''}
                    </p>
                  </div>

                  {/* One-line teaser */}
                  <p className="text-text-dim text-xs hidden sm:block max-w-[160px] truncate shrink-0">
                    {SIGN_THEMES[p.sign] || ''}
                  </p>

                  {/* Chevron */}
                  {hasAnalysis && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                         className={`shrink-0 text-text-dim transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>

                {/* Expanded analysis */}
                {isOpen && (
                  <div className="px-4 pb-5 pt-1 border-t border-border">
                    <div className="space-y-3 mt-3">
                      {analysis.map((para, i) => {
                        // Style gift / shadow / retrograde lines differently
                        const isGift = para.startsWith('✦');
                        const isShadow = para.startsWith('◈');
                        const isRetro = para.startsWith('℞');
                        return (
                          <p key={i} className={`text-sm leading-relaxed ${
                            isGift   ? 'text-gold' :
                            isShadow ? 'text-amber' :
                            isRetro  ? 'text-purple-text' :
                            i === 0  ? 'text-text-primary' :
                            'text-text-secondary'
                          }`}>
                            {para}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Aspects list (expandable) ── */}
      {chart.aspects?.filter(a => MAIN_ASPECTS.includes(a.type)).length > 0 && (
        <div className="mt-6">
          <h3 className="text-text-dim text-xs uppercase tracking-wider mb-3">Natal Aspects</h3>
          <div className="space-y-2">
            {chart.aspects.filter(a => MAIN_ASPECTS.includes(a.type)).map((a, i) => {
              const color  = ASPECT_COLORS[a.type] || '#888';
              const key    = aspectKey(a);
              const isOpen = expandedAspect === key;
              const g1     = PLANET_GLYPHS[a.planet1] || a.planet1?.charAt(0) || '?';
              const g2     = PLANET_GLYPHS[a.planet2] || a.planet2?.charAt(0) || '?';
              const c1     = PLANET_COLORS[a.planet1] || '#666';
              const c2     = PLANET_COLORS[a.planet2] || '#666';
              return (
                <div key={i}
                     ref={(el) => { aspectRefs.current[key] = el; }}
                     className="bg-void-light border border-border rounded-xl overflow-hidden scroll-mt-20">
                  <button
                    onClick={() => setExpandedAspect(isOpen ? null : key)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {/* Aspect type badge */}
                    <span style={{ color, borderColor: color + '44' }}
                          className="text-xs font-bold capitalize border rounded-full px-2 py-0.5 shrink-0 min-w-[56px] text-center bg-white/5">
                      {a.type}
                    </span>

                    {/* Planets */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span style={{ color: c1 }} className="text-base">{g1}</span>
                      <span className="text-text-dim text-xs">{a.planet1}</span>
                      <span className="text-text-dim text-xs mx-1">·</span>
                      <span style={{ color: c2 }} className="text-base">{g2}</span>
                      <span className="text-text-dim text-xs">{a.planet2}</span>
                    </div>

                    {/* Orb */}
                    {a.orb != null && (
                      <span className="text-text-dim text-xs shrink-0">{a.orb}° orb</span>
                    )}

                    {/* Chevron */}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                         className={`shrink-0 text-text-dim transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-0 border-t border-border">
                      <p className="text-text-secondary text-sm leading-relaxed mt-3">
                        {ASPECT_MEANINGS[a.type] || ''}
                      </p>
                      <p className="text-text-dim text-xs mt-2">
                        <span style={{ color: c1 }}>{g1} {a.planet1}</span>
                        {' '}forms a {a.type} with{' '}
                        <span style={{ color: c2 }}>{g2} {a.planet2}</span>
                        {a.orb != null ? ` within a ${a.orb}° orb.` : '.'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
