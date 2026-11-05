export const moods = ["Calm", "Dreamy", "Energetic", "Focused", "Melancholy", "Warm"] as const;
export type Mood = (typeof moods)[number];
