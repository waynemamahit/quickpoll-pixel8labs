import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import i18n from "../../i18n/config";
import { ThemeSelector } from "../ThemeSelector";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("ThemeSelector", () => {
  it("renders and changes theme", () => {
    renderWithI18n(<ThemeSelector />);
    const select = screen.getByLabelText(/theme/i);
    fireEvent.change(select, { target: { value: "dark" } });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
