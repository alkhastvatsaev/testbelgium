/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import RequestDetailAudioPlayer from "../RequestDetailAudioPlayer";

describe("RequestDetailAudioPlayer", () => {
  it("affiche le lecteur avec lecture et téléchargement", () => {
    render(<RequestDetailAudioPlayer url="https://example.com/audio.webm" />);
    expect(screen.getByTestId("backoffice-request-detail-audio-player")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lire le message vocal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /télécharger le message vocal/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /position dans l'enregistrement/i })).toBeInTheDocument();
  });
});
