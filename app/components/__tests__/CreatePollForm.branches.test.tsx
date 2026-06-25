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

describe("CreatePollForm branches", () => {
  it("adds and removes options", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /add option/i }));
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(3);
    fireEvent.click(screen.getAllByLabelText(/remove option/i)[0]);
  });

  it("shows server error on failed create", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 }),
    );
    renderForm();
    fireEvent.change(screen.getByLabelText(/question/i), {
      target: { value: "Q?" },
    });
    const inputs = screen.getAllByRole("textbox").slice(1);
    fireEvent.change(inputs[0], { target: { value: "A" } });
    fireEvent.change(inputs[1], { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: /create poll/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("shows network error on create", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    renderForm();
    fireEvent.change(screen.getByLabelText(/question/i), {
      target: { value: "Q?" },
    });
    const inputs = screen.getAllByRole("textbox").slice(1);
    fireEvent.change(inputs[0], { target: { value: "A" } });
    fireEvent.change(inputs[1], { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: /create poll/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("shows duplicate options validation", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/question/i), {
      target: { value: "Q?" },
    });
    const inputs = screen.getAllByRole("textbox").slice(1);
    fireEvent.change(inputs[0], { target: { value: "Same" } });
    fireEvent.change(inputs[1], { target: { value: "same" } });
    fireEvent.click(screen.getByRole("button", { name: /create poll/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("prevents native form submit", () => {
    renderForm();
    const form = screen
      .getByRole("button", { name: /create poll/i })
      .closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    expect(screen.getByRole("heading", { name: /create poll/i })).toBeVisible();
  });
});
