/**
 * Deep Research editor (create/edit). Fetches item when slug present.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { parsePastedHtml } from '@/lib/deep-research/parse-html';
import type { DeepResearch } from '@/types/deep-research';
import {
  equipmentZoneOptions,
  experienceOptions,
  injuryOptions,
  goalOptions,
  dietTypeOptions,
  nutritionGoalOptions,
  dietaryRestrictionOptions,
  macroFocusOptions,
  DAYS_PER_WEEK_MIN,
  DAYS_PER_WEEK_MAX,
} from '@/data/deep-research-profile-options';

const AUTO_SAVE_DELAY_MS = 30000;

function toggleArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

const DeepResearchEditor: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const isEditing = !!slug;

  const [item, setItem] = useState<DeepResearch | null>(null);
  const [loading, setLoading] = useState(isEditing);

  const [title, setTitle] = useState('');
  const [slugVal, setSlugVal] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [equipmentZones, setEquipmentZones] = useState<string[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<string[]>([]);
  const [injuriesAddressed, setInjuriesAddressed] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [daysPerWeekMin, setDaysPerWeekMin] = useState<number | null>(null);
  const [daysPerWeekMax, setDaysPerWeekMax] = useState<number | null>(null);
  const [dietTypes, setDietTypes] = useState<string[]>([]);
  const [nutritionGoals, setNutritionGoals] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [macroFocus, setMacroFocus] = useState<string[]>([]);

  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      if (!isEditing || !slug) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/deep-research/${slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error('Deep research not found');
            navigate('/deep-research');
            return;
          }
          throw new Error('Failed to fetch');
        }
        const data = await res.json();
        const i = data.item as DeepResearch;
        setItem(i);
        setTitle(i.title || '');
        setSlugVal(i.slug || '');
        setExcerpt(i.excerpt || '');
        setHtmlContent(i.html_content || '');
        setSeoTitle(i.seo_title || '');
        setSeoDescription(i.seo_description || '');
        setStatus(i.status || 'draft');
        setEquipmentZones(i.equipment_zones || []);
        setExperienceLevels(i.experience_levels || []);
        setInjuriesAddressed(i.injuries_addressed || []);
        setGoals(i.goals || []);
        setDaysPerWeekMin(i.days_per_week_min ?? null);
        setDaysPerWeekMax(i.days_per_week_max ?? null);
        setDietTypes(i.diet_types || []);
        setNutritionGoals(i.nutrition_goals || []);
        setDietaryRestrictions(i.dietary_restrictions || []);
        setMacroFocus(i.macro_focus || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load');
        navigate('/deep-research');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isEditing, slug, navigate]);

  useEffect(() => {
    if (!isEditing) setHasChanges(title !== '' || htmlContent !== '');
  }, [isEditing, title, htmlContent]);

  useEffect(() => {
    if (isEditing && item) {
      const changed =
        title !== item.title ||
        slugVal !== item.slug ||
        excerpt !== (item.excerpt || '') ||
        htmlContent !== item.html_content ||
        seoTitle !== (item.seo_title || '') ||
        seoDescription !== (item.seo_description || '') ||
        status !== item.status ||
        JSON.stringify(equipmentZones) !== JSON.stringify(item.equipment_zones || []) ||
        JSON.stringify(experienceLevels) !== JSON.stringify(item.experience_levels || []) ||
        JSON.stringify(injuriesAddressed) !== JSON.stringify(item.injuries_addressed || []) ||
        JSON.stringify(goals) !== JSON.stringify(item.goals || []) ||
        daysPerWeekMin !== (item.days_per_week_min ?? null) ||
        daysPerWeekMax !== (item.days_per_week_max ?? null) ||
        JSON.stringify(dietTypes) !== JSON.stringify(item.diet_types || []) ||
        JSON.stringify(nutritionGoals) !== JSON.stringify(item.nutrition_goals || []) ||
        JSON.stringify(dietaryRestrictions) !== JSON.stringify(item.dietary_restrictions || []) ||
        JSON.stringify(macroFocus) !== JSON.stringify(item.macro_focus || []);
      setHasChanges(changed);
    }
  }, [
    title,
    slugVal,
    excerpt,
    htmlContent,
    seoTitle,
    seoDescription,
    status,
    equipmentZones,
    experienceLevels,
    injuriesAddressed,
    goals,
    daysPerWeekMin,
    daysPerWeekMax,
    dietTypes,
    nutritionGoals,
    dietaryRestrictions,
    macroFocus,
    item,
    isEditing,
  ]);

  function generateSlug() {
    const newSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlugVal(newSlug);
  }

  function handleParseFromHtml() {
    if (!htmlContent.trim()) return;
    const parsed = parsePastedHtml(htmlContent);
    if (parsed.title) setTitle(parsed.title);
    if (parsed.excerpt) setExcerpt(parsed.excerpt || '');
    if (parsed.bodyHtml) setHtmlContent(parsed.bodyHtml);
    if (parsed.title && !slugVal) {
      setSlugVal(
        parsed.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  }

  const handleSave = useCallback(
    async (publishStatus?: 'draft' | 'published') => {
      setSaving(true);
      setError(null);
      const finalStatus = publishStatus || status;

      try {
        const payload = {
          title,
          slug: slugVal,
          excerpt,
          html_content: htmlContent,
          seo_title: seoTitle || null,
          seo_description: seoDescription || null,
          status: finalStatus,
          equipment_zones: equipmentZones,
          experience_levels: experienceLevels,
          injuries_addressed: injuriesAddressed,
          goals,
          days_per_week_min: daysPerWeekMin,
          days_per_week_max: daysPerWeekMax,
          diet_types: dietTypes,
          nutrition_goals: nutritionGoals,
          dietary_restrictions: dietaryRestrictions,
          macro_focus: macroFocus,
        };

        const url = isEditing
          ? `/api/admin/deep-research/${item?.slug}`
          : '/api/admin/deep-research';
        const method = isEditing ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save');
        }

        const { item: savedItem } = await res.json();
        setItem(savedItem);
        setLastSaved(new Date());
        setHasChanges(false);

        if (!isEditing || slugVal !== item?.slug) {
          navigate(`/deep-research/${savedItem.slug}/edit`);
        }
        toast.success('Saved');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save';
        setError(msg);
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    },
    [
      title,
      slugVal,
      excerpt,
      htmlContent,
      seoTitle,
      seoDescription,
      status,
      equipmentZones,
      experienceLevels,
      injuriesAddressed,
      goals,
      daysPerWeekMin,
      daysPerWeekMax,
      dietTypes,
      nutritionGoals,
      dietaryRestrictions,
      macroFocus,
      isEditing,
      item?.slug,
      navigate,
    ]
  );

  useEffect(() => {
    if (hasChanges && status === 'draft' && isEditing) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => handleSave('draft'), AUTO_SAVE_DELAY_MS);
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [hasChanges, status, isEditing, handleSave]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        handleSave('published');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (hasChanges) {
        e.preventDefault();
        (e as { returnValue?: string }).returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasChanges]);

  const inputBase =
    'w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-[#ffbf00]/50 focus:outline-none focus:ring-1 focus:ring-[#ffbf00]/50';
  const chipBase =
    'rounded border px-2 py-1 text-xs transition-colors cursor-pointer ' +
    'border-white/20 bg-white/5 text-white/70 hover:border-[#ffbf00]/50 hover:text-white';
  const chipActive =
    'border-[#ffbf00]/50 bg-[#ffbf00]/20 text-[#ffbf00]';

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-6 py-4">
        <Link
          to="/deep-research"
          className="flex items-center gap-2 text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </Link>
        <div className="flex items-center gap-3">
          {lastSaved && !hasChanges && (
            <span className="text-sm text-green-400">Saved {lastSaved.toLocaleTimeString()}</span>
          )}
          {hasChanges && <span className="text-sm text-amber-400">Unsaved changes</span>}
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="rounded border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={saving}
            className="rounded border border-[#ffbf00]/50 bg-[#ffbf00]/10 px-4 py-2 text-sm font-medium text-[#ffbf00] transition-colors hover:bg-[#ffbf00]/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid flex-1 overflow-hidden lg:grid-cols-[1fr_380px]">
        <div className="overflow-y-auto p-6">
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-white/80">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-0 bg-transparent text-2xl font-bold text-white placeholder-white/30 focus:outline-none"
              placeholder="Deep research title"
            />
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-white/80">Slug</label>
              <button
                type="button"
                onClick={generateSlug}
                className="text-xs text-[#ffbf00] hover:underline"
              >
                Generate ↻
              </button>
            </div>
            <input
              type="text"
              value={slugVal}
              onChange={(e) => setSlugVal(e.target.value)}
              className={inputBase}
              placeholder="url-slug"
            />
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-white/80">Excerpt</label>
              <span className="text-xs text-white/40">{excerpt.length}/160</span>
            </div>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className={`${inputBase} resize-y`}
              placeholder="Brief description for cards and SEO..."
              rows={3}
              maxLength={300}
            />
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-white/80">HTML Content</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleParseFromHtml}
                  className="rounded border border-green-500/30 bg-green-500/15 px-2 py-1 text-xs text-green-400 hover:bg-green-500/25"
                >
                  Parse from HTML
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                >
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
            </div>
            <p className="mb-2 text-xs text-white/50">
              Paste full HTML. Use &quot;Parse from HTML&quot; to extract title, excerpt, and body.
            </p>
            {showPreview ? (
              <div
                className="min-h-[400px] overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-4"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            ) : (
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className={`${inputBase} min-h-[400px] font-mono text-sm`}
                placeholder="Paste your HTML here..."
                rows={20}
                spellCheck={false}
              />
            )}
          </div>
        </div>

        <aside className="overflow-y-auto border-l border-white/10 bg-black/20 p-6">
          <div className="mb-6 border-b border-white/10 pb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
              Status
            </h3>
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                  className="accent-[#ffbf00]"
                />
                <span>Draft</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={status === 'published'}
                  onChange={() => setStatus('published')}
                  className="accent-[#ffbf00]"
                />
                <span>Published</span>
              </label>
            </div>
          </div>

          <div className="mb-6 border-b border-white/10 pb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
              Profile Metadata
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-white/60">Equipment zones</label>
                <div className="flex flex-wrap gap-1">
                  {equipmentZoneOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${chipBase} ${equipmentZones.includes(opt.value) ? chipActive : ''}`}
                      onClick={() => setEquipmentZones((prev) => toggleArray(prev, opt.value))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Experience levels</label>
                <div className="flex flex-wrap gap-1">
                  {experienceOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${chipBase} ${experienceLevels.includes(opt.value) ? chipActive : ''}`}
                      onClick={() => setExperienceLevels((prev) => toggleArray(prev, opt.value))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Injuries addressed</label>
                <div className="flex flex-wrap gap-1">
                  {injuryOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${chipBase} ${injuriesAddressed.includes(opt.value) ? chipActive : ''}`}
                      onClick={() => setInjuriesAddressed((prev) => toggleArray(prev, opt.value))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Goals</label>
                <div className="flex flex-wrap gap-1">
                  {goalOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${chipBase} ${goals.includes(opt.value) ? chipActive : ''}`}
                      onClick={() => setGoals((prev) => toggleArray(prev, opt.value))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Days per week (min/max)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={DAYS_PER_WEEK_MIN}
                    max={DAYS_PER_WEEK_MAX}
                    value={daysPerWeekMin ?? ''}
                    onChange={(e) => {
                      const v = e.target.value ? parseInt(e.target.value, 10) : null;
                      setDaysPerWeekMin(
                        typeof v === 'number' && !isNaN(v) ? v : null
                      );
                    }}
                    placeholder="Min"
                    className="w-16 rounded border border-white/20 bg-white/5 px-2 py-1.5 text-sm text-white focus:border-[#ffbf00]/50 focus:outline-none"
                  />
                  <span className="text-white/50">–</span>
                  <input
                    type="number"
                    min={DAYS_PER_WEEK_MIN}
                    max={DAYS_PER_WEEK_MAX}
                    value={daysPerWeekMax ?? ''}
                    onChange={(e) => {
                      const v = e.target.value ? parseInt(e.target.value, 10) : null;
                      setDaysPerWeekMax(
                        typeof v === 'number' && !isNaN(v) ? v : null
                      );
                    }}
                    placeholder="Max"
                    className="w-16 rounded border border-white/20 bg-white/5 px-2 py-1.5 text-sm text-white focus:border-[#ffbf00]/50 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Diet types</label>
                <div className="flex flex-wrap gap-1">
                  {dietTypeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${chipBase} ${dietTypes.includes(opt.value) ? chipActive : ''}`}
                      onClick={() => setDietTypes((prev) => toggleArray(prev, opt.value))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Nutrition goals</label>
                <div className="flex flex-wrap gap-1">
                  {nutritionGoalOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${chipBase} ${nutritionGoals.includes(opt.value) ? chipActive : ''}`}
                      onClick={() => setNutritionGoals((prev) => toggleArray(prev, opt.value))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Dietary restrictions</label>
                <div className="flex flex-wrap gap-1">
                  {dietaryRestrictionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${chipBase} ${dietaryRestrictions.includes(opt.value) ? chipActive : ''}`}
                      onClick={() =>
                        setDietaryRestrictions((prev) => toggleArray(prev, opt.value))
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Macro focus</label>
                <div className="flex flex-wrap gap-1">
                  {macroFocusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${chipBase} ${macroFocus.includes(opt.value) ? chipActive : ''}`}
                      onClick={() => setMacroFocus((prev) => toggleArray(prev, opt.value))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
              SEO Overrides
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-white/60">Meta Title</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className={inputBase}
                  placeholder="Custom SEO title"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Meta Description</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  className={`${inputBase} resize-y`}
                  placeholder="Custom meta description"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DeepResearchEditor;
