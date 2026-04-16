import { useState } from 'react';
import { parseChartText, getChartSummary } from '../utils/chartParser';
import { saveChart } from '../utils/storage';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState('paste'); // 'paste' | 'confirm'
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState(null);
  const [summary, setSummary] = useState(null);

  function handleParse() {
    if (!text.trim()) {
      setError('Please paste your chart data.');
      return;
    }
    try {
      const chart = parseChartText(text);
      const sum = getChartSummary(chart);
      if (sum.planetsFound < 3) {
        setError(`Only found ${sum.planetsFound} planets. Please paste the full natal chart text including planetary positions, house cusps, and aspects from Astro-Seek.`);
        return;
      }
      setParsed(chart);
      setSummary(sum);
      setStep('confirm');
      setError('');
    } catch (e) {
      setError('Could not parse chart data. Please check the format and try again.');
    }
  }

  function handleConfirm() {
    saveChart(parsed);
    onComplete(parsed);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">✦</div>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold text-text-primary mb-2">
            AstroJournal
          </h1>
          <p className="text-text-secondary text-lg">
            Your personal AI-powered astrology journal
          </p>
        </div>

        {step === 'paste' && (
          <div className="bg-void-light border border-border rounded-xl p-8">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gold mb-4">
              Set Up Your Chart
            </h2>
            <div className="text-text-secondary mb-6 space-y-3">
              <p>
                To personalize your readings, paste your natal chart data from{' '}
                <span className="text-purple-text">astro-seek.com</span> or{' '}
                <span className="text-purple-text">astro.com</span>.
              </p>
              <div className="bg-void border border-border rounded-lg p-4 text-sm">
                <p className="text-gold mb-2 font-medium">What to copy:</p>
                <ol className="list-decimal list-inside space-y-1 text-text-dim">
                  <li>Go to your natal chart on Astro-Seek or Astro.com</li>
                  <li>Find the text table showing planetary positions</li>
                  <li>Copy the full text including planets, signs, degrees, houses</li>
                  <li>Also include house cusps and aspects if available</li>
                </ol>
              </div>
              <p className="text-text-dim text-sm">
                The data looks something like: "Sun Aries 15°23' House 10" — lines listing each planet with its sign, degree, and house.
              </p>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your natal chart text here..."
              className="w-full h-64 bg-void border border-border rounded-lg p-4 text-text-primary text-sm font-mono resize-none focus:border-gold/50 placeholder:text-text-dim/50"
            />

            {error && (
              <p className="text-amber mt-3 text-sm">{error}</p>
            )}

            <button
              onClick={handleParse}
              className="mt-4 w-full py-3 bg-gold/20 border border-gold/40 text-gold rounded-lg font-medium hover:bg-gold/30 transition-colors cursor-pointer"
            >
              Parse Chart Data
            </button>
          </div>
        )}

        {step === 'confirm' && summary && (
          <div className="bg-void-light border border-border rounded-xl p-8">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gold mb-4">
              Chart Parsed Successfully
            </h2>
            <p className="text-text-secondary mb-6">
              Please verify the data below is correct.
            </p>

            <div className="space-y-4">
              {/* Planets */}
              <div>
                <h3 className="text-purple-text text-sm font-medium uppercase tracking-wider mb-2">
                  Planets Found ({summary.planetsFound})
                </h3>
                <div className="bg-void border border-border rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {summary.planets.map((p, i) => (
                      <p key={i} className="text-text-primary text-sm">{p}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Houses */}
              {summary.housesFound > 0 && (
                <div>
                  <h3 className="text-purple-text text-sm font-medium uppercase tracking-wider mb-2">
                    House Cusps ({summary.housesFound})
                  </h3>
                  <div className="bg-void border border-border rounded-lg p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {summary.houses.map((h, i) => (
                        <p key={i} className="text-text-primary text-sm">{h}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Aspects */}
              {summary.aspectsFound > 0 && (
                <div>
                  <h3 className="text-purple-text text-sm font-medium uppercase tracking-wider mb-2">
                    Aspects ({summary.aspectsFound})
                  </h3>
                  <div className="bg-void border border-border rounded-lg p-4 max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {summary.aspects.map((a, i) => (
                        <p key={i} className="text-text-primary text-sm">{a}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('paste')}
                className="flex-1 py-3 bg-void border border-border text-text-secondary rounded-lg font-medium hover:border-border-gold transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 bg-gold/20 border border-gold/40 text-gold rounded-lg font-medium hover:bg-gold/30 transition-colors cursor-pointer"
              >
                Confirm & Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
