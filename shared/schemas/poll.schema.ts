import { z } from "zod";
import {
  MAX_OPTION_LABEL,
  MAX_OPTIONS,
  MAX_QUESTION,
} from "../constants/poll.constants";

export const createPollSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(1, "validation.questionRequired")
      .max(MAX_QUESTION, "validation.questionTooLong"),
    options: z.array(z.string()),
  })
  .transform(({ question, options }) => ({
    question,
    options: options.map((o) => o.trim()).filter((o) => o.length > 0),
  }))
  .refine(({ options }) => options.length >= 2, {
    message: "validation.tooFewOptions",
    path: ["options"],
  })
  .refine(({ options }) => options.length <= MAX_OPTIONS, {
    message: "validation.tooManyOptions",
    path: ["options"],
  })
  .refine(
    ({ options }) =>
      new Set(options.map((o) => o.toLowerCase())).size === options.length,
    { message: "validation.duplicateOptions", path: ["options"] },
  )
  .refine(({ options }) => options.every((o) => o.length <= MAX_OPTION_LABEL), {
    message: "validation.optionTooLong",
    path: ["options"],
  })
  .transform(({ question, options }) => ({
    question,
    options: options.map((label) => ({ label })),
  }));

export const voteSchema = z.object({
  optionId: z.string().min(1, "validation.optionIdRequired"),
  voterToken: z.string().min(1, "validation.voterTokenRequired"),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
