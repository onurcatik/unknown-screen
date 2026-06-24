import type { ApiSuccessResponse } from "../../../shared/model/api";

export const KNOWN_TEMPLATE_IDS = [
  "top_5_listicle",
  "reddit_story",
  "ai_news",
  "motivational_short",
  "product_promo",
  "quiz",
  "myth_vs_fact",
  "educational_micro_lesson",
  "history_facts",
  "before_after",
] as const;

export type KnownTemplateId = (typeof KNOWN_TEMPLATE_IDS)[number];
export type TemplateId = KnownTemplateId | (string & {});

export type CaptionStyle =
  | "bold_viral"
  | "reddit_story"
  | "clean_minimal"
  | "karaoke"
  | "corporate_clean"
  | (string & {});

export type Template = {
  id: TemplateId;
  name: string;
  description: string;
  recommended_duration: number;
  scene_count: number;
  hook_style: string;
  tone: string;
  caption_style: CaptionStyle;
  visual_style: string;
  cta: string;
  [key: string]: unknown;
};

export type TemplatesResponse = ApiSuccessResponse<{
  templates: Template[];
}>;

export function isKnownTemplateId(value: string): value is KnownTemplateId {
  return (KNOWN_TEMPLATE_IDS as readonly string[]).includes(value);
}
