import React, { useState, useEffect, useCallback } from 'react';
import { getBrand, saveBrand, type BrandInput } from '../store';

const FIELDS: { key: keyof BrandInput; label: string; placeholder: string; multiline?: boolean }[] = [
  {
    key: 'brandName',
    label: 'Brand Name',
    placeholder: 'e.g. Peak Protein',
  },
  {
    key: 'usp',
    label: 'Unique Selling Proposition (USP)',
    placeholder: 'e.g. 30g protein per serving, zero artificial sweeteners, made from 100% grass-fed whey',
    multiline: true,
  },
  {
    key: 'tone',
    label: 'Tone of Voice',
    placeholder: 'e.g. Bold, energetic, science-backed but approachable',
  },
  {
    key: 'audience',
    label: 'Target Audience',
    placeholder: 'e.g. Men 25–35 who lift 4x/week, care about clean ingredients',
    multiline: true,
  },
  {
    key: 'visualGuidelines',
    label: 'Visual Guidelines',
    placeholder: 'e.g. Dark backgrounds, electric blue accent, gym/athletic lifestyle imagery',
    multiline: true,
  },
];

function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  const color =
    pct < 40 ? 'bg-red-400' : pct < 70 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-zinc-500 font-display">Profile completion</span>
        <span className={`text-xs font-bold font-mono ${pct < 40 ? 'text-red-500' : pct < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BrandPage() {
  const [form, setForm] = useState<BrandInput>(() => getBrand());
  const [refUrlInput, setRefUrlInput] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    saveBrand(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [form]);

  const handleAddRefUrl = () => {
    const url = refUrlInput.trim();
    if (!url) return;
    setForm((prev) => ({
      ...prev,
      referenceAssetUrls: [...(prev.referenceAssetUrls ?? []), url],
    }));
    setRefUrlInput('');
  };

  const handleRemoveRefUrl = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      referenceAssetUrls: (prev.referenceAssetUrls ?? []).filter((_, i) => i !== idx),
    }));
  };

  // Count filled fields for progress bar
  const filledCount = FIELDS.filter((f) => {
    const val = form[f.key];
    return typeof val === 'string' ? val.trim().length > 0 : false;
  }).length + ((form.referenceAssetUrls?.length ?? 0) > 0 ? 1 : 0);

  const totalCount = FIELDS.length + 1; // +1 for reference URLs

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-8 py-6">
        <h1 className="text-xl font-bold font-display text-zinc-900">Brand Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Tell AdForge about your brand so it can remake ads in your style. Stored locally — never sent to a server until you generate.
        </p>
      </div>

      <div className="flex-1 px-8 py-6">
        <div className="max-w-2xl space-y-6">
          {/* Progress bar */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-card p-5">
            <ProgressBar filled={filledCount} total={totalCount} />
            <p className="mt-2 text-xs text-zinc-400">
              At minimum, fill in <strong>Brand Name</strong> or <strong>USP</strong> to enable ad generation.
            </p>
          </div>

          {/* Form fields */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-card p-6 space-y-5">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`brand-${field.key}`}
                  className="block text-sm font-semibold text-zinc-700 mb-1.5"
                >
                  {field.label}
                </label>
                {field.multiline ? (
                  <textarea
                    id={`brand-${field.key}`}
                    value={(form[field.key] as string) ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  />
                ) : (
                  <input
                    id={`brand-${field.key}`}
                    type="text"
                    value={(form[field.key] as string) ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                )}
              </div>
            ))}

            {/* Reference URLs */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
                Reference Asset URLs
                <span className="ml-1.5 text-xs font-normal text-zinc-400">(product photos, logos — must be public)</span>
              </label>

              {/* Chips */}
              {(form.referenceAssetUrls ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {(form.referenceAssetUrls ?? []).map((url, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 max-w-xs"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover bg-zinc-100 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="text-xs text-indigo-700 font-mono truncate max-w-[180px]">{url}</span>
                      <button
                        onClick={() => handleRemoveRefUrl(idx)}
                        className="text-indigo-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  id="brand-ref-url-input"
                  type="url"
                  value={refUrlInput}
                  onChange={(e) => setRefUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRefUrl()}
                  placeholder="https://example.com/product.jpg"
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm font-mono text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  id="btn-add-ref-url"
                  onClick={handleAddRefUrl}
                  disabled={!refUrlInput.trim()}
                  className="px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 text-zinc-700 text-sm font-semibold rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-400">
                These images are sent directly to the AI — use publicly accessible URLs. Up to 3 are used per generation.
              </p>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              id="btn-save-brand"
              onClick={handleSave}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-all duration-150 flex items-center gap-2 shadow-md shadow-indigo-200"
            >
              {saved ? (
                <>
                  <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                'Save Brand Profile'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
