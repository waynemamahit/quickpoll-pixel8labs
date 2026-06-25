import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import i18n from "../../i18n/config";
import { ShareLink } from "../ShareLink";

describe("ShareLink", () => {
  it("copies share link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <I18nextProvider i18n={i18n}>
        <ShareLink pollId="abc" />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
  });
});
