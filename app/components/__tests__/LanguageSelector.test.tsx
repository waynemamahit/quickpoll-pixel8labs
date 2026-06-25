import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import i18n from "../../i18n/config";
import { LanguageSelector } from "../LanguageSelector";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("LanguageSelector", () => {
  it("renders and switches language", () => {
    renderWithI18n(<LanguageSelector />);
    const select = screen.getByLabelText(/language/i);
    fireEvent.change(select, { target: { value: "id" } });
    expect(i18n.language).toBe("id");
  });
});
