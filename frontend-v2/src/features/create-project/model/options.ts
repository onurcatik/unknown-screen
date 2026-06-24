import type { PlatformId, VoiceStyle } from "@entities/timeline/model";

export type SelectOption<TValue extends string = string> = {
  value: TValue;
  label: string;
  description?: string;
};

export const PLATFORM_OPTIONS: SelectOption<PlatformId>[] = [
  {
    value: "youtube_shorts",
    label: "YouTube Shorts",
    description: "Default 9:16 short-form output target.",
  },
  {
    value: "instagram_reels",
    label: "Instagram Reels",
    description: "Short-form social video with caption-led pacing.",
  },
  {
    value: "tiktok",
    label: "TikTok",
    description: "Fast hook and retention-oriented short video.",
  },
];

export const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: "English", label: "English" },
  { value: "Turkish", label: "Turkish" },
  { value: "Spanish", label: "Spanish" },
  { value: "German", label: "German" },
  { value: "French", label: "French" },
];

export const VOICE_STYLE_OPTIONS: SelectOption<VoiceStyle>[] = [
  { value: "neutral", label: "Neutral", description: "Clean narration without exaggerated tone." },
  { value: "direct", label: "Direct", description: "Concise and assertive delivery." },
  { value: "storytelling", label: "Storytelling", description: "Narrative rhythm for story-driven shorts." },
  { value: "suspenseful", label: "Suspenseful", description: "Builds curiosity before the reveal." },
  { value: "urgent", label: "Urgent", description: "Fast, high-retention framing." },
  { value: "educational", label: "Educational", description: "Clear explanatory pacing." },
  { value: "persuasive", label: "Persuasive", description: "Conversion-oriented presentation." },
];

export const CAPTION_STYLE_OPTIONS: SelectOption[] = [
  { value: "bold_viral", label: "Bold viral" },
  { value: "reddit_story", label: "Reddit story" },
  { value: "clean_minimal", label: "Clean minimal" },
  { value: "karaoke", label: "Karaoke" },
  { value: "corporate_clean", label: "Corporate clean" },
];

export const DEFAULT_CREATE_VALUES = {
  templateId: "top_5_listicle",
  language: "English",
  platform: "youtube_shorts" as PlatformId,
  targetDuration: 45,
  voiceStyle: "neutral" as VoiceStyle,
  captionStyle: "bold_viral",
};

export const TARGET_DURATION_LIMITS = {
  min: 15,
  max: 90,
};
