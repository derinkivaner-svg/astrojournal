// Rule-based astrology interpretation engine
// Generates personalized readings from natal chart + current transits with no AI dependency

import { getPlanetaryPositions, getMoonPhaseForDate, getPlanetaryDayRuler, getCurrentSeason, getMonthEvents } from './ephemeris';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays } from 'date-fns';

// ─── PLANET MEANINGS ───

const PLANET_THEMES = {
  Sun: { domain: 'identity, vitality, purpose', verb: 'illuminates', energy: 'yang' },
  Moon: { domain: 'emotions, intuition, inner needs', verb: 'nurtures', energy: 'yin' },
  Mercury: { domain: 'communication, thought, learning', verb: 'activates the mind around', energy: 'neutral' },
  Venus: { domain: 'love, beauty, values, pleasure', verb: 'softens and attracts', energy: 'yin' },
  Mars: { domain: 'drive, courage, action, desire', verb: 'energizes and pushes', energy: 'yang' },
  Jupiter: { domain: 'expansion, wisdom, abundance', verb: 'expands and blesses', energy: 'yang' },
  Saturn: { domain: 'discipline, structure, responsibility', verb: 'tests and strengthens', energy: 'yin' },
  Uranus: { domain: 'change, freedom, innovation', verb: 'disrupts and liberates', energy: 'yang' },
  Neptune: { domain: 'imagination, spirituality, transcendence', verb: 'dissolves boundaries around', energy: 'yin' },
  Pluto: { domain: 'transformation, power, rebirth', verb: 'transforms and deepens', energy: 'yin' },
};

// ─── SIGN MEANINGS ───

const SIGN_THEMES = {
  Aries: { element: 'fire', mode: 'cardinal', theme: 'initiative and courage', shadow: 'impatience', body: 'head and face', keyword: 'I am' },
  Taurus: { element: 'earth', mode: 'fixed', theme: 'stability and sensuality', shadow: 'stubbornness', body: 'throat and neck', keyword: 'I have' },
  Gemini: { element: 'air', mode: 'mutable', theme: 'curiosity and connection', shadow: 'restlessness', body: 'hands and lungs', keyword: 'I think' },
  Cancer: { element: 'water', mode: 'cardinal', theme: 'nurturing and emotional depth', shadow: 'over-protection', body: 'chest and stomach', keyword: 'I feel' },
  Leo: { element: 'fire', mode: 'fixed', theme: 'creativity and self-expression', shadow: 'ego attachment', body: 'heart and spine', keyword: 'I create' },
  Virgo: { element: 'earth', mode: 'mutable', theme: 'service and refinement', shadow: 'perfectionism', body: 'digestive system', keyword: 'I analyze' },
  Libra: { element: 'air', mode: 'cardinal', theme: 'harmony and partnership', shadow: 'indecision', body: 'kidneys and lower back', keyword: 'I balance' },
  Scorpio: { element: 'water', mode: 'fixed', theme: 'depth and transformation', shadow: 'control', body: 'reproductive system', keyword: 'I transform' },
  Sagittarius: { element: 'fire', mode: 'mutable', theme: 'adventure and meaning', shadow: 'overextension', body: 'hips and thighs', keyword: 'I explore' },
  Capricorn: { element: 'earth', mode: 'cardinal', theme: 'mastery and ambition', shadow: 'rigidity', body: 'bones and joints', keyword: 'I achieve' },
  Aquarius: { element: 'air', mode: 'fixed', theme: 'innovation and community', shadow: 'detachment', body: 'circulatory system', keyword: 'I envision' },
  Pisces: { element: 'water', mode: 'mutable', theme: 'compassion and transcendence', shadow: 'escapism', body: 'feet and lymphatic system', keyword: 'I believe' },
};

// ─── ASPECT MEANINGS ───

const ASPECT_TYPES = {
  conjunction: { angle: 0, orb: 8, nature: 'fusion', description: 'merges with' },
  sextile: { angle: 60, orb: 6, nature: 'opportunity', description: 'supports' },
  square: { angle: 90, orb: 7, nature: 'tension', description: 'challenges' },
  trine: { angle: 120, orb: 8, nature: 'flow', description: 'harmonizes with' },
  opposition: { angle: 180, orb: 8, nature: 'awareness', description: 'opposes' },
};

// ─── HOUSE MEANINGS ───

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

// ─── DAY RULER THEMES ───

const DAY_RULER_THEMES = {
  Sun: 'This is a day of vitality and self-expression. Your creative power is heightened.',
  Moon: 'Emotions run closer to the surface today. Honor your inner rhythms and intuitive hits.',
  Mars: 'Energy and drive are amplified. Channel any restlessness into decisive action.',
  Mercury: 'Mental clarity is available. Good for conversations, writing, and making connections.',
  Jupiter: 'Optimism and generosity flow more easily. Think big and stay open to opportunity.',
  Venus: 'Beauty, pleasure, and connection are favored. Slow down and enjoy what you love.',
  Saturn: 'Structure and discipline come naturally. Tackle what requires patience and persistence.',
};

// ─── MOON PHASE THEMES ───

const MOON_PHASE_THEMES = {
  'New Moon': 'A time of new beginnings. Set intentions and plant seeds for what you want to grow.',
  'Waxing Crescent': 'Momentum is building. Take the first small steps toward your new intentions.',
  'First Quarter': 'A turning point. Challenges that arise now are showing you what needs adjustment.',
  'Waxing Gibbous': 'Refine and adjust. What you started is taking shape — stay committed.',
  'Full Moon': 'Illumination and culmination. What has been hidden comes into the light.',
  'Waning Gibbous': 'Gratitude and sharing. Integrate the lessons of the full moon.',
  'Last Quarter': 'Release and let go. Clear what no longer serves you.',
  'Waning Crescent': 'Rest and surrender. Prepare the inner ground for the next cycle.',
};

// ─── TRANSIT-NATAL INTERACTION PROMPTS ───

const TRANSIT_NATAL_PROMPTS = {
  'Sun-Sun': { prompt: 'What does being truly yourself look like today? Where are you dimming your light to fit in?', theme: 'authentic self-expression' },
  'Sun-Moon': { prompt: 'How are your public self and private needs aligned right now? What emotional truth are you not sharing?', theme: 'inner-outer harmony' },
  'Sun-Mercury': { prompt: 'What message are you meant to communicate today? What thought keeps circling that deserves voice?', theme: 'mindful expression' },
  'Sun-Venus': { prompt: 'What do you truly value, and are your choices reflecting that? Where could you let more beauty in?', theme: 'values alignment' },
  'Sun-Mars': { prompt: 'Where in your life are you holding back energy that wants to move? What would you do if fear were not a factor?', theme: 'courage and action' },
  'Sun-Jupiter': { prompt: 'What possibility are you not letting yourself believe in? Where is life asking you to expand?', theme: 'expansion and faith' },
  'Sun-Saturn': { prompt: 'What responsibility have you been avoiding that, once embraced, could set you free? What structure needs building?', theme: 'discipline and maturity' },
  'Moon-Sun': { prompt: 'What emotional need have you been neglecting in favor of productivity? When did you last feel truly held?', theme: 'emotional honoring' },
  'Moon-Moon': { prompt: 'What pattern from your past is showing up in how you care for yourself today? What does your inner child need?', theme: 'emotional patterns' },
  'Moon-Venus': { prompt: 'How do you show love to yourself versus how you show it to others? What would self-tenderness look like right now?', theme: 'self-love' },
  'Moon-Mars': { prompt: 'What are you angry about that you have not allowed yourself to feel? How can you honor both your softness and your fire?', theme: 'emotional courage' },
  'Moon-Saturn': { prompt: 'Where are you being too hard on yourself emotionally? What boundary actually protects your heart?', theme: 'emotional boundaries' },
  'Mercury-Sun': { prompt: 'What idea has been trying to get your attention? If you could teach one thing today, what would it be?', theme: 'mental clarity' },
  'Mercury-Moon': { prompt: 'What are you feeling that you have not put into words yet? How could naming your emotions change them?', theme: 'emotional articulation' },
  'Mercury-Mercury': { prompt: 'How is your inner dialogue serving or sabotaging you? What would you say to yourself if you were your own best friend?', theme: 'self-talk' },
  'Mercury-Venus': { prompt: 'What conversation could deepen a relationship today? What compliment are you withholding?', theme: 'heartfelt communication' },
  'Mercury-Mars': { prompt: 'Where do you need to speak up more directly? What truth have you been softening too much?', theme: 'assertive expression' },
  'Mercury-Jupiter': { prompt: 'What are you learning right now that could change everything? Where is your mind ready to stretch beyond its comfort zone?', theme: 'expanded thinking' },
  'Mercury-Saturn': { prompt: 'What plan needs more concrete steps? Where would structured thinking solve a problem you have been avoiding?', theme: 'disciplined thought' },
  'Venus-Sun': { prompt: 'What brings you genuine joy that you have been putting off? How are you nourishing your creative spirit?', theme: 'joy and creativity' },
  'Venus-Moon': { prompt: 'What does comfort mean to you right now? Are you giving yourself permission to receive?', theme: 'receptivity' },
  'Venus-Venus': { prompt: 'What relationship in your life deserves more attention? What do you find beautiful that others overlook?', theme: 'beauty and connection' },
  'Venus-Mars': { prompt: 'Where are desire and harmony pulling you in different directions? What would it look like to want something unapologetically?', theme: 'desire and diplomacy' },
  'Venus-Saturn': { prompt: 'What commitment are you ready to make or deepen? Where does love ask for patience?', theme: 'committed love' },
  'Mars-Sun': { prompt: 'What goal needs bold, decisive action? Where have you been overthinking instead of moving?', theme: 'decisive action' },
  'Mars-Moon': { prompt: 'What frustration is actually a signal pointing you toward something important? How do you honor anger without being consumed by it?', theme: 'passionate feeling' },
  'Mars-Mercury': { prompt: 'What debate or discussion are you ready to have? Where do your words need more edge and honesty?', theme: 'fierce truth' },
  'Mars-Venus': { prompt: 'How do you balance going after what you want with staying open to what comes? Where does passion meet grace in your life?', theme: 'passion and grace' },
  'Mars-Mars': { prompt: 'What are you competing with, and is it the right fight? Where does your ambition need redirection?', theme: 'directed willpower' },
  'Mars-Jupiter': { prompt: 'What big leap are you being called to take? Where is your courage meeting opportunity?', theme: 'bold expansion' },
  'Mars-Saturn': { prompt: 'Where are you pushing against a wall that requires strategy instead of force? What delayed effort is about to pay off?', theme: 'strategic patience' },
  'Jupiter-Sun': { prompt: 'What part of your life is ready for a growth spurt? Where could generosity change everything?', theme: 'generous expansion' },
  'Jupiter-Moon': { prompt: 'What emotional abundance are you overlooking? Where is your intuition pointing you toward something larger?', theme: 'emotional abundance' },
  'Jupiter-Venus': { prompt: 'What relationship or creative project could flourish with more faith and less control?', theme: 'abundant love' },
  'Jupiter-Saturn': { prompt: 'Where do wisdom and discipline meet in your life right now? What long-term vision deserves your sustained effort?', theme: 'wise building' },
  'Saturn-Sun': { prompt: 'What foundational work are you being asked to do on yourself? Where does responsibility feel like freedom?', theme: 'self-mastery' },
  'Saturn-Moon': { prompt: 'What emotional maturity is this moment asking of you? Where do you need firmer inner ground?', theme: 'emotional maturity' },
  'Saturn-Venus': { prompt: 'What relationship truth are you ready to face? Where does real love require real commitment?', theme: 'love and commitment' },
  'Saturn-Mars': { prompt: 'Where is frustration actually building the muscle you need? What long game deserves your daily discipline?', theme: 'endurance' },
  'Saturn-Saturn': { prompt: 'What lesson are you being asked to learn for the second time? Where have you outgrown an old structure?', theme: 'structural review' },
};

// Fallback prompts by transiting planet (when no specific combo exists)
const TRANSIT_PLANET_PROMPTS = {
  Sun: 'What part of you is asking to be seen more fully today?',
  Moon: 'What does your emotional body need that your mind keeps overriding?',
  Mercury: 'What thought pattern could you rewrite today to better serve your growth?',
  Venus: 'Where in your life could you choose beauty, pleasure, or connection over efficiency?',
  Mars: 'What are you willing to fight for, and what are you ready to stop fighting against?',
  Jupiter: 'Where are you playing too small for the life that wants to find you?',
  Saturn: 'What uncomfortable truth, once accepted, would actually simplify your life?',
  Uranus: 'What convention are you following out of habit rather than conviction?',
  Neptune: 'What dream have you been dismissing as impractical that deserves a second look?',
  Pluto: 'What are you holding onto that has already transformed beyond recognition?',
};

// ─── AFFIRMATIONS BY ELEMENT ───

const ELEMENT_AFFIRMATIONS = {
  fire: [
    'I trust my inner spark to light the way.',
    'My passion is a compass. I follow it boldly.',
    'I am alive with purpose and creative fire.',
    'My courage creates the path others follow.',
    'I give myself permission to shine fully.',
  ],
  earth: [
    'I am grounded, steady, and worthy of abundance.',
    'I trust the timing of my own unfolding.',
    'My patience is a form of power.',
    'I build with intention and harvest with gratitude.',
    'My body is wise. I listen to what it knows.',
  ],
  water: [
    'I honor the wisdom of my emotions.',
    'My sensitivity is my strength, not my weakness.',
    'I flow with what is, trusting where the current takes me.',
    'I am safe to feel deeply and love openly.',
    'My intuition speaks the truth my mind has not caught up to yet.',
  ],
  air: [
    'My ideas have value and deserve to be shared.',
    'I communicate with clarity and compassion.',
    'I give my mind space to wander and wonder.',
    'Connection feeds my soul. I reach out today.',
    'I think clearly and choose wisely.',
  ],
};

// ─── SOUL GUIDANCE BY NODE AXIS ───

const NODE_GUIDANCE = {
  Aries: { north: 'stepping into independence and self-trust', south: 'releasing over-accommodation and people-pleasing' },
  Taurus: { north: 'cultivating inner stability and self-worth', south: 'releasing attachment to crisis and intensity' },
  Gemini: { north: 'embracing curiosity and diverse perspectives', south: 'releasing dogmatic certainty' },
  Cancer: { north: 'honoring emotional needs and vulnerability', south: 'releasing over-reliance on achievement for identity' },
  Leo: { north: 'expressing your unique creative light', south: 'releasing hiding behind group identity' },
  Virgo: { north: 'embodying service and practical discernment', south: 'releasing escapism and boundary dissolution' },
  Libra: { north: 'learning partnership and diplomatic grace', south: 'releasing excessive self-focus' },
  Scorpio: { north: 'embracing depth, intimacy, and shared power', south: 'releasing material attachment and comfort-seeking' },
  Sagittarius: { north: 'seeking meaning, truth, and broader horizons', south: 'releasing information hoarding and scattered energy' },
  Capricorn: { north: 'building mastery and long-term structures', south: 'releasing emotional dependency and clinging to the past' },
  Aquarius: { north: 'serving the collective and honoring your uniqueness', south: 'releasing ego-driven self-expression' },
  Pisces: { north: 'surrendering to faith, compassion, and flow', south: 'releasing the need to control and perfect everything' },
};

// ─── LUNATION HOUSE PROMPTS ───
// Journaling prompts for New/Full Moon by the house they fall in

const NEW_MOON_HOUSE_PROMPTS = {
  1: 'This New Moon at {deg}° {sign} falls in your 1st house of self and identity. What new version of yourself is ready to emerge? What intention can you set about how you show up in the world?',
  2: 'This New Moon at {deg}° {sign} falls in your 2nd house of resources and self-worth. What new relationship with money, security, or your own value are you ready to begin? What do you truly need to feel abundant?',
  3: 'This New Moon at {deg}° {sign} falls in your 3rd house of communication and learning. What conversation needs to be started? What idea or skill are you ready to explore with fresh eyes?',
  4: 'This New Moon at {deg}° {sign} falls in your 4th house of home and emotional roots. What do you want to plant in your inner foundation? What does home need to become for you right now?',
  5: 'This New Moon at {deg}° {sign} falls in your 5th house of creativity and joy. What creative spark is asking for space? Where could you invite more play and authentic self-expression into your life?',
  6: 'This New Moon at {deg}° {sign} falls in your 6th house of health and daily rituals. What one daily habit could you begin today that would change everything in six months? What does your body need that you keep ignoring?',
  7: 'This New Moon at {deg}° {sign} falls in your 7th house of partnerships. What new chapter in a close relationship is possible? What do you need to give — or ask for — to deepen real intimacy?',
  8: 'This New Moon at {deg}° {sign} falls in your 8th house of transformation and shared power. What are you ready to release so completely that it cannot return? What truth about your deepest desires needs to be acknowledged?',
  9: 'This New Moon at {deg}° {sign} falls in your 9th house of meaning and expansion. What belief system is ready for an upgrade? Where is life calling you to think bigger, travel further, or learn something that changes your worldview?',
  10: 'This New Moon at {deg}° {sign} falls in your 10th house of career and public life. What legacy intention can you set right now? If your professional life could start fresh today, what would you build?',
  11: 'This New Moon at {deg}° {sign} falls in your 11th house of community and future vision. What dream for the future deserves a concrete first step? Which community or cause is calling for your energy?',
  12: 'This New Moon at {deg}° {sign} falls in your 12th house of the unconscious and surrender. What needs to end quietly before something new can begin? What would you discover if you spent today in stillness and honest self-reflection?',
};

const FULL_MOON_HOUSE_PROMPTS = {
  1: 'This Full Moon at {deg}° {sign} illuminates your 1st house. What truth about who you are is now impossible to ignore? Where has a mask you wear outlived its usefulness?',
  2: 'This Full Moon at {deg}° {sign} illuminates your 2nd house. What has come to fruition regarding your finances, possessions, or sense of self-worth? What are you finally ready to value — or stop undervaluing?',
  3: 'This Full Moon at {deg}° {sign} illuminates your 3rd house. What message or realization is crystallizing? What have you been thinking but not saying that now demands expression?',
  4: 'This Full Moon at {deg}° {sign} illuminates your 4th house. What emotional truth is surfacing about your family, home, or inner life? What feeling have you buried that is now asking to be seen?',
  5: 'This Full Moon at {deg}° {sign} illuminates your 5th house. What creative work or romance is reaching a climax? Where have you been holding back your full, unfiltered self-expression?',
  6: 'This Full Moon at {deg}° {sign} illuminates your 6th house. What health pattern or daily routine has reached a breaking point? What is your body telling you that your mind has been overriding?',
  7: 'This Full Moon at {deg}° {sign} illuminates your 7th house. What relationship dynamic is now fully visible? What balance between your needs and another person\'s has been revealed?',
  8: 'This Full Moon at {deg}° {sign} illuminates your 8th house. What power dynamic, debt, or emotional entanglement is coming to a head? What transformation is completing inside you?',
  9: 'This Full Moon at {deg}° {sign} illuminates your 9th house. What belief or philosophy has proven itself — or failed you? What have you learned recently that changed how you see the world?',
  10: 'This Full Moon at {deg}° {sign} illuminates your 10th house. What career milestone or public recognition is manifesting? What does the world see in you now that you might not yet see in yourself?',
  11: 'This Full Moon at {deg}° {sign} illuminates your 11th house. What friendship or group dynamic is being revealed? Is the future you have been working toward still the one you want?',
  12: 'This Full Moon at {deg}° {sign} illuminates your 12th house. What has been hidden is now coming to light. What secret, fear, or unconscious pattern can you finally name and release?',
};

// ─── SUN INGRESS HOUSE THEMES ───

const SUN_INGRESS_HOUSE_MESSAGES = {
  1: 'The Sun now moves through your 1st house for the next ~30 days, putting the spotlight on you — your appearance, vitality, and personal direction. This is your annual season of self-renewal. How you present yourself matters more now.',
  2: 'The Sun now moves through your 2nd house, activating themes of money, possessions, and self-worth for the next month. This is your annual window for financial clarity and reconnecting with what you truly value.',
  3: 'The Sun now moves through your 3rd house, energizing communication, short trips, siblings, and daily learning. For the next month, your words carry extra weight. Conversations started now can shape the months ahead.',
  4: 'The Sun now moves through your 4th house, drawing your energy inward toward home, family, and emotional foundations. This month favors domestic improvements, family healing, and tending to your inner world.',
  5: 'The Sun now moves through your 5th house, igniting creativity, romance, children, and self-expression. For the next month, follow what brings genuine joy. Creative projects started now carry special vitality.',
  6: 'The Sun now moves through your 6th house, focusing on health, daily routines, work habits, and service. This month rewards practical improvements — diet changes, exercise commitments, and workflow refinements stick better now.',
  7: 'The Sun now moves through your 7th house, illuminating partnerships and close relationships. For the next month, others serve as mirrors. What you attract and react to reveals what you need to integrate within.',
  8: 'The Sun now moves through your 8th house, deepening themes of shared resources, intimacy, taxes, and psychological transformation. This month favors going beneath the surface in every area of life.',
  9: 'The Sun now moves through your 9th house, expanding toward travel, higher education, philosophy, and meaning-making. This month pulls you beyond your usual horizons. Say yes to what broadens your perspective.',
  10: 'The Sun now moves through your 10th house, placing career, reputation, and public life center stage. This is your annual window of professional visibility — what you put out into the world gets noticed more now.',
  11: 'The Sun now moves through your 11th house, activating friendships, group involvements, and long-term aspirations. This month connects you with like-minded people and clarifies which communities you belong in.',
  12: 'The Sun now moves through your 12th house, your annual season of rest, retreat, and inner work. This month favors solitude, spiritual practice, therapy, and tying up loose ends before your next solar cycle begins.',
};

// ─── HELPER: Find which natal house a given ecliptic longitude falls in ───

function findHouseForLongitude(longitude, houses) {
  if (!houses || houses.length < 12) return null;

  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  // Convert house cusps to ecliptic longitude
  const cusps = houses.map(h => {
    const signIdx = SIGNS.indexOf(h.sign);
    if (signIdx < 0) return 0;
    return norm360(signIdx * 30 + (h.degree?.decimal || 0));
  }).sort((a, b) => {
    // Sort by house number (houses array should be in order)
    return 0; // keep original order
  });

  // Build cusp array sorted by house number
  const cuspLons = [];
  for (let i = 1; i <= 12; i++) {
    const h = houses.find(x => x.house === i);
    if (!h) continue;
    const signIdx = SIGNS.indexOf(h.sign);
    if (signIdx < 0) continue;
    cuspLons[i] = norm360(signIdx * 30 + (h.degree?.decimal || 0));
  }

  // Find which house contains the longitude
  for (let i = 1; i <= 12; i++) {
    const nextHouse = i === 12 ? 1 : i + 1;
    const cuspStart = cuspLons[i];
    const cuspEnd = cuspLons[nextHouse];
    if (cuspStart === undefined || cuspEnd === undefined) continue;

    if (cuspEnd > cuspStart) {
      if (longitude >= cuspStart && longitude < cuspEnd) return i;
    } else {
      // Wraps around 0°
      if (longitude >= cuspStart || longitude < cuspEnd) return i;
    }
  }

  // Fallback: use sign-based whole-sign houses from ASC
  return null;
}

// Fallback: whole-sign house from ASC sign
function findWholeSignHouse(sign, ascSign) {
  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const ascIdx = SIGNS.indexOf(ascSign);
  const signIdx = SIGNS.indexOf(sign);
  if (ascIdx < 0 || signIdx < 0) return null;
  return ((signIdx - ascIdx + 12) % 12) + 1;
}

// ─── HELPER: Detect if Sun just entered a new sign (ingress day) ───

function detectSunIngress(date, prevDate) {
  const positions = getPlanetaryPositions(date);
  const prevPositions = getPlanetaryPositions(prevDate);
  const sun = positions.find(p => p.planet === 'Sun');
  const prevSun = prevPositions.find(p => p.planet === 'Sun');
  if (sun && prevSun && sun.sign !== prevSun.sign) {
    return sun.sign;
  }
  return null;
}

// ─── HELPER: Find transit aspects to natal chart ───

function norm360(deg) {
  return ((deg % 360) + 360) % 360;
}

function findTransitAspects(transitPositions, natalPlanets) {
  const aspects = [];
  const mainTransits = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const mainNatals = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

  for (const transit of transitPositions) {
    if (!mainTransits.includes(transit.planet)) continue;
    for (const natal of natalPlanets) {
      if (!natal.sign || !mainNatals.includes(natal.name)) continue;
      // Convert natal to ecliptic longitude
      const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      const signIdx = SIGNS.indexOf(natal.sign);
      if (signIdx < 0) continue;
      const natalLon = signIdx * 30 + (natal.degree?.decimal || 15);

      const diff = Math.abs(norm360(transit.longitude - natalLon));
      const angle = diff > 180 ? 360 - diff : diff;

      for (const [name, asp] of Object.entries(ASPECT_TYPES)) {
        if (Math.abs(angle - asp.angle) <= asp.orb) {
          aspects.push({
            transitPlanet: transit.planet,
            transitSign: transit.sign,
            natalPlanet: natal.name,
            natalSign: natal.sign,
            natalHouse: natal.house,
            aspectType: name,
            aspectNature: asp.nature,
            aspectDesc: asp.description,
            orb: Math.abs(angle - asp.angle),
            exactness: 1 - Math.abs(angle - asp.angle) / asp.orb, // 1 = exact, 0 = wide
          });
        }
      }
    }
  }

  // Sort by exactness (tightest aspect first)
  aspects.sort((a, b) => b.exactness - a.exactness);
  return aspects;
}

// ─── HELPER: Seeded pseudo-random for consistent daily variety ───

function dayHash(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = ((h << 5) - h) + dateStr.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

// ─── GENERATE DAY READING ───

export function generateDayReading(date, chartData) {
  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const dateStr = format(date, 'yyyy-MM-dd');
  const seed = dayHash(dateStr);
  const positions = getPlanetaryPositions(date);
  const moonPhase = getMoonPhaseForDate(date);
  const dayRuler = getPlanetaryDayRuler(date);
  const aspects = findTransitAspects(positions, chartData.planets);

  // Find the user's natal Sun sign element for affirmation
  const natalSun = chartData.planets.find(p => p.name === 'Sun');
  const sunElement = natalSun ? SIGN_THEMES[natalSun.sign]?.element : 'fire';

  // Find North Node for guidance
  const northNode = chartData.planets.find(p => p.name === 'North Node');
  const nodeSign = northNode?.sign || 'Aries';

  // Find ASC for whole-sign house fallback
  const asc = chartData.planets.find(p => p.name === 'ASC');
  const ascSign = asc?.sign || natalSun?.sign || 'Aries';

  // ── DETECT LUNATION (New/Full Moon) ──
  const isNewMoon = moonPhase.phase === 'New Moon';
  const isFullMoon = moonPhase.phase === 'Full Moon';
  const isLunation = isNewMoon || isFullMoon;

  let lunationHouse = null;
  let lunationSign = null;
  let lunationDegree = null;
  if (isLunation) {
    const moonPos = positions.find(p => p.planet === 'Moon');
    if (moonPos) {
      lunationSign = moonPos.sign;
      lunationDegree = Math.round(moonPos.degree);
      // Try house cusps first, fall back to whole-sign
      lunationHouse = findHouseForLongitude(moonPos.longitude, chartData.houses);
      if (!lunationHouse) {
        lunationHouse = findWholeSignHouse(lunationSign, ascSign);
      }
    }
  }

  // ── DETECT SUN INGRESS ──
  const prevDate = addDays(date, -1);
  const sunIngressSign = detectSunIngress(date, prevDate);
  let sunIngressMessage = null;
  if (sunIngressSign) {
    // Find which house this Sun sign falls in for the user
    const sunPos = positions.find(p => p.planet === 'Sun');
    let sunHouse = null;
    if (sunPos) {
      sunHouse = findHouseForLongitude(sunPos.longitude, chartData.houses);
      if (!sunHouse) {
        sunHouse = findWholeSignHouse(sunIngressSign, ascSign);
      }
    }
    if (sunHouse && SUN_INGRESS_HOUSE_MESSAGES[sunHouse]) {
      sunIngressMessage = SUN_INGRESS_HOUSE_MESSAGES[sunHouse];
    }
  }

  // ── CLIMATE ──
  const moonSign = positions.find(p => p.planet === 'Moon')?.sign || 'Aries';
  const moonTheme = SIGN_THEMES[moonSign];
  const rulerInfo = PLANET_THEMES[dayRuler];

  let climateParts = [];
  climateParts.push(`The Moon moves through ${moonSign} today, coloring the emotional atmosphere with themes of ${moonTheme.theme}. ${MOON_PHASE_THEMES[moonPhase.phase]}`);

  // Add Sun ingress notification if it happened today
  if (sunIngressMessage) {
    climateParts.push(sunIngressMessage);
  }

  if (aspects.length > 0) {
    const top = aspects[0];
    const transitInfo = PLANET_THEMES[top.transitPlanet];
    climateParts.push(`The most significant transit today is ${top.transitPlanet} in ${top.transitSign} forming a ${top.aspectType} to your natal ${top.natalPlanet} in ${top.natalSign}${top.natalHouse ? ' (House ' + top.natalHouse + ', the area of ' + HOUSE_THEMES[top.natalHouse] + ')' : ''}. This ${top.aspectNature} aspect ${transitInfo.verb} your ${PLANET_THEMES[top.natalPlanet]?.domain || 'personal expression'}.`);
    if (aspects.length > 1) {
      const second = aspects[1];
      climateParts.push(`${second.transitPlanet} also ${second.aspectDesc} your natal ${second.natalPlanet}, adding a ${second.aspectNature} undercurrent to ${PLANET_THEMES[second.natalPlanet]?.domain || 'your day'}.`);
    }
  } else {
    climateParts.push(`${DAY_RULER_THEMES[dayRuler]} As a ${dayRuler} day, themes of ${rulerInfo.domain} are naturally emphasized.`);
  }

  // ── JOURNALING PROMPT ──
  // Priority: Lunation house prompt > Transit-natal prompt > Fallback
  let journalingPrompt;
  if (isLunation && lunationHouse) {
    const templates = isNewMoon ? NEW_MOON_HOUSE_PROMPTS : FULL_MOON_HOUSE_PROMPTS;
    const template = templates[lunationHouse];
    if (template) {
      journalingPrompt = template
        .replace('{deg}', lunationDegree || '?')
        .replace('{sign}', lunationSign || '?');
    }
  }

  if (!journalingPrompt) {
    if (aspects.length > 0) {
      const top = aspects[0];
      const key = `${top.transitPlanet}-${top.natalPlanet}`;
      const specific = TRANSIT_NATAL_PROMPTS[key];
      if (specific) {
        journalingPrompt = specific.prompt;
      } else {
        journalingPrompt = TRANSIT_PLANET_PROMPTS[top.transitPlanet] || TRANSIT_PLANET_PROMPTS.Sun;
      }
    } else {
      journalingPrompt = TRANSIT_PLANET_PROMPTS[dayRuler] || 'What is asking for your attention today that you keep postponing?';
    }
  }

  // ── SOUL GUIDANCE ──
  const nodeInfo = NODE_GUIDANCE[nodeSign];
  let soulGuidance;
  if (aspects.length > 0) {
    const top = aspects[0];
    if (top.aspectNature === 'tension') {
      soulGuidance = `Today's ${top.aspectType} between transit ${top.transitPlanet} and your natal ${top.natalPlanet} may create friction, but it is pushing you toward growth. Your North Node in ${nodeSign} reminds you that your soul path is about ${nodeInfo.north}. Use this tension as fuel rather than resistance — the discomfort is a sign you are stretching into who you are becoming.`;
    } else if (top.aspectNature === 'flow' || top.aspectNature === 'opportunity') {
      soulGuidance = `The ${top.aspectType} between transit ${top.transitPlanet} and your natal ${top.natalPlanet} offers a window of ease. Your North Node in ${nodeSign} calls you toward ${nodeInfo.north}. Let this supportive energy carry you closer to that path today — what feels effortless right now is pointing you in the right direction.`;
    } else {
      soulGuidance = `The ${top.aspectType} between transit ${top.transitPlanet} and your natal ${top.natalPlanet} brings ${top.aspectNature} energy to your day. Your soul journey through the North Node in ${nodeSign} is about ${nodeInfo.north}, while ${nodeInfo.south}. Today is a day to notice which of these patterns you are living from.`;
    }
  } else {
    soulGuidance = `Your North Node in ${nodeSign} continues its quiet pull toward ${nodeInfo.north}. Even on quieter transit days like today, you can align with this path by ${nodeInfo.south.replace('releasing', 'gently releasing')} and choosing growth over comfort. Small choices compound into transformation.`;
  }

  // ── AFFIRMATION ──
  const affirmations = ELEMENT_AFFIRMATIONS[sunElement] || ELEMENT_AFFIRMATIONS.fire;
  const affirmation = pick(affirmations, seed);

  return {
    climate: climateParts.join(' '),
    journaling_prompt: journalingPrompt,
    soul_guidance: soulGuidance,
    affirmation,
  };
}

// ─── GENERATE WEEK READING ───

export function generateWeekReading(weekStartDate, chartData) {
  const days = eachDayOfInterval({
    start: startOfWeek(weekStartDate, { weekStartsOn: 0 }),
    end: endOfWeek(weekStartDate, { weekStartsOn: 0 }),
  });

  const natalSun = chartData.planets.find(p => p.name === 'Sun');
  const northNode = chartData.planets.find(p => p.name === 'North Node');
  const nodeSign = northNode?.sign || 'Aries';
  const nodeInfo = NODE_GUIDANCE[nodeSign];
  const sunSign = natalSun?.sign || 'Aries';
  const sunTheme = SIGN_THEMES[sunSign];

  // Collect the week's most notable aspects
  const weekAspects = [];
  for (const day of days) {
    const positions = getPlanetaryPositions(day);
    const dayAspects = findTransitAspects(positions, chartData.planets);
    if (dayAspects.length > 0) weekAspects.push({ day, aspect: dayAspects[0] });
  }

  // Find the most exact aspect of the week
  const peakAspect = weekAspects.sort((a, b) => b.aspect.exactness - a.aspect.exactness)[0];

  // Overview
  let overview;
  if (peakAspect) {
    const a = peakAspect.aspect;
    overview = `This week's signature transit is ${a.transitPlanet} in ${a.transitSign} forming a ${a.aspectType} to your natal ${a.natalPlanet} in ${a.natalSign}. This brings themes of ${PLANET_THEMES[a.transitPlanet]?.domain || 'change'} into contact with your ${PLANET_THEMES[a.natalPlanet]?.domain || 'personal expression'}. As a ${sunSign} Sun, your approach to this energy will be filtered through ${sunTheme.theme}. Pay attention to how this transit unfolds across the week — ${a.aspectNature === 'tension' ? 'the friction is productive if you work with it rather than against it' : 'the flow is inviting you to lean in and receive'}.`;
  } else {
    overview = `This is a relatively quiet transit week for your chart, which makes it ideal for integration and reflection. As a ${sunSign} Sun, use this window to reconnect with ${sunTheme.theme}. Sometimes the most important growth happens in the pauses between intense transits.`;
  }

  // Focus
  let focus;
  if (peakAspect) {
    const a = peakAspect.aspect;
    focus = `Direct your attention toward ${PLANET_THEMES[a.natalPlanet]?.domain || 'self-understanding'} this week. The ${a.transitPlanet} ${a.aspectType} is activating this area of your life, and conscious engagement with it will yield the best results.${a.natalHouse ? ' House ' + a.natalHouse + ' matters — themes of ' + HOUSE_THEMES[a.natalHouse] + ' are in the spotlight.' : ''}`;
  } else {
    focus = `With no major transits pressing on your chart this week, focus on maintenance and intention-setting. Revisit your goals, organize your environment, and invest in the routines that keep you grounded.`;
  }

  // Watch out
  let watchOut;
  const tensionAspects = weekAspects.filter(wa => wa.aspect.aspectNature === 'tension' || wa.aspect.aspectNature === 'awareness');
  if (tensionAspects.length > 0) {
    const t = tensionAspects[0].aspect;
    watchOut = `Be mindful of ${t.aspectNature} energy between transit ${t.transitPlanet} and your natal ${t.natalPlanet}. This could show up as ${t.aspectNature === 'tension' ? 'frustration, impatience, or forced changes' : 'polarized thinking or projection onto others'}. The ${sunTheme.shadow} tendency of your Sun sign may surface — notice it without acting from it.`;
  } else {
    watchOut = `No major challenging aspects this week, but watch for complacency. Comfortable weeks can lull you into autopilot. Stay intentional about ${nodeInfo.north} even when nothing is forcing your hand.`;
  }

  // Daily summaries
  const dailySummaries = days.map(day => {
    const ruler = getPlanetaryDayRuler(day);
    const moonPhase = getMoonPhaseForDate(day);
    const moonSign = getPlanetaryPositions(day).find(p => p.planet === 'Moon')?.sign || '';
    const dayAspects = findTransitAspects(getPlanetaryPositions(day), chartData.planets);

    let summary = `${ruler} day with Moon in ${moonSign}. `;
    if (dayAspects.length > 0) {
      const top = dayAspects[0];
      summary += `Transit ${top.transitPlanet} ${top.aspectDesc} your natal ${top.natalPlanet} — themes of ${PLANET_THEMES[top.natalPlanet]?.domain || 'personal growth'} are active.`;
    } else {
      summary += `A quieter day for your chart. ${DAY_RULER_THEMES[ruler].split('.')[0]}.`;
    }
    return summary;
  });

  // Weekly journaling prompt
  const journalingPrompt = peakAspect
    ? `Reflecting on the week's ${peakAspect.aspect.transitPlanet}-${peakAspect.aspect.natalPlanet} ${peakAspect.aspect.aspectType}: ${TRANSIT_PLANET_PROMPTS[peakAspect.aspect.transitPlanet]}`
    : `What area of your life has been asking for more attention lately? What would change if you gave it just ten minutes of honest reflection each day this week?`;

  return {
    overview,
    focus,
    watch_out: watchOut,
    daily_summaries: dailySummaries,
    journaling_prompt: journalingPrompt,
  };
}

// ─── GENERATE SEASON READING ───

export function generateSeasonReading(date, chartData) {
  const season = getCurrentSeason(date);
  const natalSun = chartData.planets.find(p => p.name === 'Sun');
  const northNode = chartData.planets.find(p => p.name === 'North Node');
  const natalMoon = chartData.planets.find(p => p.name === 'Moon');
  const natalVenus = chartData.planets.find(p => p.name === 'Venus');
  const natalMars = chartData.planets.find(p => p.name === 'Mars');
  const natalSaturn = chartData.planets.find(p => p.name === 'Saturn');
  const nodeSign = northNode?.sign || 'Aries';
  const nodeInfo = NODE_GUIDANCE[nodeSign];
  const sunSign = natalSun?.sign || 'Aries';
  const sunTheme = SIGN_THEMES[sunSign];
  const moonSign = natalMoon?.sign || 'Cancer';
  const moonTheme = SIGN_THEMES[moonSign];

  const seasonElement = {
    Spring: 'fire', Summer: 'fire', Autumn: 'earth', Winter: 'water'
  }[season.name] || 'earth';

  const seasonMode = {
    Spring: 'cardinal initiation', Summer: 'fixed sustaining', Autumn: 'mutable releasing', Winter: 'cardinal introspection'
  }[season.name];

  // Overview
  const overview = `${season.name} brings the energy of ${seasonMode} to your chart. As a ${sunSign} Sun with a ${moonSign} Moon, this season invites you to balance ${sunTheme.theme} with ${moonTheme.theme}. The ${seasonElement} quality of this season ${seasonElement === sunTheme.element ? 'resonates strongly with your natal Sun — you may feel especially in your element' : 'offers a complementary energy to your natal Sun — lean into what feels unfamiliar for growth'}. Pay attention to the areas of life where you feel the most pull — that is where the season wants to work through you.`;

  // North Node Path
  const northNodePath = `Your North Node in ${nodeSign} is your soul's compass this season. The call toward ${nodeInfo.north} grows stronger during ${season.name}, particularly when transits activate your nodal axis. Practice ${nodeInfo.south} as a conscious discipline rather than waiting for life to force the release. Each small choice toward your North Node builds the life your soul came here to live.`;

  // Career & Creative
  const mc = chartData.planets.find(p => p.name === 'MC');
  const mcSign = mc?.sign || sunSign;
  const careerCreative = `With your Midheaven in ${mcSign}, ${season.name} season highlights themes of ${SIGN_THEMES[mcSign]?.theme || 'ambition'} in your public and professional life.${natalMars ? ` Your natal Mars in ${natalMars.sign} gives you a ${SIGN_THEMES[natalMars.sign]?.theme || 'driven'} approach to pursuing goals — channel this energy into projects that align with your deeper values, not just external expectations.` : ''} Creative inspiration this season comes through your ${moonSign} Moon — ${moonTheme.keyword.toLowerCase()} is your creative mantra.`;

  // Relationships & Family
  const venusSign = natalVenus?.sign || 'Taurus';
  const relationshipsFamily = `Your natal Venus in ${venusSign} shapes how you give and receive love. This season asks you to explore ${SIGN_THEMES[venusSign]?.theme || 'connection'} more deeply in your closest relationships.${natalVenus?.house ? ` With Venus in your ${natalVenus.house}${['st','nd','rd'][natalVenus.house-1]||'th'} house, the area of ${HOUSE_THEMES[natalVenus.house]} is where relational growth happens most naturally.` : ''} Family dynamics may echo your Moon in ${moonSign} patterns — notice when you are reacting from old conditioning versus responding from present awareness.`;

  // Body & Energy
  const marsSign = natalMars?.sign || 'Aries';
  const bodyEnergy = `Your natal Mars in ${marsSign} governs your physical vitality and how you move energy through your body. ${season.name} season supports ${SIGN_THEMES[marsSign]?.body || 'overall vitality'} awareness. ${sunTheme.body ? `Pay attention to your ${sunTheme.body} — as a ${sunSign} Sun, this area holds tension when you are out of alignment.` : ''} Match your exercise and rest rhythms to the ${seasonElement} quality of the season: ${seasonElement === 'fire' ? 'active, dynamic movement' : seasonElement === 'earth' ? 'steady, grounding practices' : seasonElement === 'water' ? 'fluid, intuitive movement' : 'breath-focused, social activities'}.`;

  // Key Dates
  const events = getMonthEvents(date.getFullYear(), date.getMonth() + 1);
  const keyDateLines = [];
  for (const ev of events.slice(0, 5)) {
    keyDateLines.push(`${ev.date}: ${ev.label} — ${ev.type === 'lunation' ? 'a powerful moment for intention-setting and emotional clarity' : ev.type === 'retrograde' ? 'review and reconsider before moving forward' : 'a shift in energy that opens new possibilities'}.`);
  }
  const keyDates = keyDateLines.length > 0
    ? keyDateLines.join(' ')
    : `This month has a quieter transit pattern. Use the steadiness to build momentum on projects already in motion.`;

  // Seasonal Intention
  const seed = dayHash(format(date, 'yyyy-MM'));
  const intentions = [
    `I align with ${nodeInfo.north} and trust the growth it brings.`,
    `I honor both my ${sunSign} light and my ${moonSign} depth this season.`,
    `I release ${nodeInfo.south.replace('releasing ', '')} and step into my fullest expression.`,
    `I build with patience what my soul knows is possible.`,
    `I move through this season with ${sunTheme.theme.split(' and ')[0]} and trust.`,
  ];
  const seasonalIntention = pick(intentions, seed);

  return {
    overview,
    north_node_path: northNodePath,
    career_creative: careerCreative,
    relationships_family: relationshipsFamily,
    body_energy: bodyEnergy,
    key_dates: keyDates,
    seasonal_intention: seasonalIntention,
  };
}
