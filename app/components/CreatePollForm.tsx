import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import type { z } from "zod";
import {
  MAX_OPTION_LABEL,
  MAX_OPTIONS,
  MAX_QUESTION,
} from "../../shared/constants/poll.constants";
import { createPollSchema } from "../../shared/schemas/poll.schema";

type FieldErrors = Record<string, string>;

function mapZodErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] = issue.message;
  }
  return result;
}

export function CreatePollForm(): React.ReactElement {
  const { t } = useTranslation(["common", "validation"]);
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [optionKeys, setOptionKeys] = useState<string[]>(() => [
    crypto.randomUUID(),
    crypto.randomUUID(),
  ]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const addOption = (): void => {
    if (options.length < MAX_OPTIONS) {
      setOptions([...options, ""]);
      setOptionKeys([...optionKeys, crypto.randomUUID()]);
    }
  };

  const removeOption = (index: number): void => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
      setOptionKeys(optionKeys.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string): void => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const handleSubmit = async (): Promise<void> => {
    setFormError(null);
    setErrors({});

    const parsed = createPollSchema.safeParse({ question, options });
    if (!parsed.success) {
      setErrors(mapZodErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, options }),
      });

      if (!response.ok) {
        setFormError(t("errors:createFailed", { ns: "errors" }));
        return;
      }

      const data = (await response.json()) as {
        id: string;
        creatorToken: string;
      };
      navigate(`/p/${data.id}#c=${data.creatorToken}`);
    } catch {
      setFormError(t("errors:generic", { ns: "errors" }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="create-poll-heading">
      <h1 id="create-poll-heading" className="text-2xl font-bold mb-6">
        {t("createPoll")}
      </h1>
      <form
        className="space-y-6"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="form-control w-full">
          <label className="label" htmlFor="question">
            <span className="label-text">{t("question")}</span>
          </label>
          <input
            id="question"
            type="text"
            className="input input-bordered w-full"
            placeholder={t("questionPlaceholder")}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={MAX_QUESTION}
            aria-invalid={!!errors.question}
            aria-describedby={errors.question ? "question-error" : undefined}
          />
          {errors.question && (
            <p
              id="question-error"
              className="text-error text-sm mt-1"
              role="alert"
            >
              {t(errors.question, { ns: "validation", max: MAX_QUESTION })}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="label-text font-medium mb-2">
            {t("options")}
          </legend>
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={optionKeys[index]} className="flex gap-2 items-start">
                <div className="form-control flex-1">
                  <label className="sr-only" htmlFor={`option-${index}`}>
                    {t("optionPlaceholder", { number: index + 1 })}
                  </label>
                  <input
                    id={`option-${index}`}
                    type="text"
                    className="input input-bordered w-full"
                    placeholder={t("optionPlaceholder", { number: index + 1 })}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    maxLength={MAX_OPTION_LABEL}
                    aria-invalid={!!errors.options}
                  />
                </div>
                {options.length > 2 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-square btn-sm mt-1"
                    onClick={() => removeOption(index)}
                    aria-label={t("removeOption")}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.options && (
            <p className="text-error text-sm mt-1" role="alert">
              {t(errors.options, { ns: "validation", max: MAX_OPTIONS })}
            </p>
          )}
          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              className="btn btn-outline btn-sm mt-3 gap-1"
              onClick={addOption}
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("addOption")}
            </button>
          )}
        </fieldset>

        {formError && (
          <p className="text-error" role="alert">
            {formError}
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={submitting}
          onClick={() => void handleSubmit()}
        >
          {submitting ? t("creating") : t("submit")}
        </button>
      </form>
    </section>
  );
}
