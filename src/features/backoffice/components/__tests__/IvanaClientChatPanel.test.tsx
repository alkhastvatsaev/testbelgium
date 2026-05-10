/** @jest-environment jsdom */
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import IvanaClientChatPanel from "../IvanaClientChatPanel";
import { publishClientPortalMessage } from "../../ivanaChatPortalBridge";

describe("IvanaClientChatPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("affiche le message d’accueil et la zone de saisie", () => {
    render(<IvanaClientChatPanel />);
    expect(screen.getByTestId("ivana-client-chat-panel")).toBeInTheDocument();
    expect(
      screen.getByText(/Bonjour — écrivez-nous pour toute question/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ivana-chat-bubble-ivana")).toBeInTheDocument();
    expect(screen.getByTestId("ivana-chat-attach")).toBeInTheDocument();
    expect(screen.getByTestId("ivana-chat-input")).toBeInTheDocument();
    expect(screen.getByTestId("ivana-chat-send")).toBeInTheDocument();
  });

  it("envoie un message utilisateur et affiche une réponse IVANA", async () => {
    jest.useFakeTimers();
    render(<IvanaClientChatPanel />);
    const input = screen.getByTestId("ivana-chat-input");
    fireEvent.change(input, { target: { value: "Bonjour, j’ai une urgence" } });
    fireEvent.click(screen.getByTestId("ivana-chat-send"));
    expect(screen.getAllByTestId("ivana-chat-bubble-user").length).toBe(1);
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() => {
      expect(screen.getAllByTestId("ivana-chat-bubble-ivana").length).toBeGreaterThanOrEqual(2);
    });
    jest.useRealTimers();
  });

  it("côté inbox : affiche un message reçu depuis le portail client", () => {
    render(<IvanaClientChatPanel acceptPortalMessages />);
    act(() => {
      publishClientPortalMessage({
        id: "portal-msg-1",
        text: "Message depuis la page société",
        createdAt: Date.now(),
      });
    });
    expect(screen.getByTestId("ivana-chat-bubble-client")).toBeInTheDocument();
    expect(screen.getByText("Message depuis la page société")).toBeInTheDocument();
  });
});
