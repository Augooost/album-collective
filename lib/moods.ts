export const moods = ["Calm", "Dreamy", "Energetic", "Focused", "Melancholy", "Warm"] as const;
export const MAX_MOOD_TAGS = 12;
export const MAX_MOOD_LENGTH = 32;

export function uniqueMoods(values: readonly string[]) {
  const tags = new Map<string, string>();
  for (const value of values) {
    const label = value.trim().replace(/\s+/g, " ");
    const key = label.toLowerCase();
    if (label && !tags.has(key)) tags.set(key, label);
  }
  return [...tags.values()];
}

export function readMoodTags(entry: { mood: string | null; moodTags: string[] }) {
  return entry.moodTags.length ? entry.moodTags : entry.mood ? [entry.mood] : [];
}
