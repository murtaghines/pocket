import { TrendingUp, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { INVESTMENT_PLATFORMS_BY_COUNTRY } from '@/lib/onboardingConstants';

interface StepInvestmentsProps {
  country: string;
  selectedPlatforms: string[];
  onPlatformsChange: (platforms: string[]) => void;
}

export function StepInvestments({ country, selectedPlatforms, onPlatformsChange }: StepInvestmentsProps) {
  const [customPlatform, setCustomPlatform] = useState('');
  const platforms = INVESTMENT_PLATFORMS_BY_COUNTRY[country] || INVESTMENT_PLATFORMS_BY_COUNTRY['OTHER'];

  const togglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      onPlatformsChange(selectedPlatforms.filter(p => p !== platform));
    } else {
      onPlatformsChange([...selectedPlatforms, platform]);
    }
  };

  const addCustomPlatform = () => {
    const trimmed = customPlatform.trim();
    if (trimmed && !selectedPlatforms.includes(trimmed)) {
      onPlatformsChange([...selectedPlatforms, trimmed]);
      setCustomPlatform('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-gray-500">
        <TrendingUp className="w-5 h-5" />
        <p className="text-sm">Select the platforms where you invest. You can skip this step.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {platforms.map((platform) => (
          <button
            key={platform}
            type="button"
            onClick={() => togglePlatform(platform)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selectedPlatforms.includes(platform)
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            }`}
          >
            {platform}
          </button>
        ))}
      </div>

      {/* Custom platform input */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Add another platform..."
          value={customPlatform}
          onChange={(e) => setCustomPlatform(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomPlatform())}
          className="flex-1 h-10 text-sm border border-gray-200 rounded-xl"
        />
        <button
          type="button"
          onClick={addCustomPlatform}
          disabled={!customPlatform.trim()}
          className="h-10 w-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Selected custom platforms (not in preset list) */}
      {selectedPlatforms.filter(p => !platforms.includes(p)).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedPlatforms.filter(p => !platforms.includes(p)).map((platform) => (
            <span
              key={platform}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-primary text-white"
            >
              {platform}
              <button type="button" onClick={() => togglePlatform(platform)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
