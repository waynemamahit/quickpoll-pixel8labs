import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import i18n from "../../i18n/config";
import { CreatePollForm } from "../CreatePollForm";

function renderForm() {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <CreatePollForm />
      </I18nextProvider>
    </MemoryRouter>,
  );
}

describe("CreatePollForm", () => {
  it("shows validation errors for empty submit", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /create poll/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("submits valid poll", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "p1", creatorToken: "c1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderForm();
    fireEvent.change(screen.getByLabelText(/question/i), {
      target: { value: "Lunch?" },
    });
    const inputs = screen.getAllByRole("textbox").slice(1);
    fireEvent.change(inputs[0], { target: { value: "Pizza" } });
    fireEvent.change(inputs[1], { target: { value: "Salad" } });
    fireEvent.click(screen.getByRole("button", { name: /create poll/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/polls",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
