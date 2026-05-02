/** @jest-environment jsdom */
import { render, waitFor } from "@testing-library/react";
import AutoProcessUploads from "../AutoProcessUploads";

jest.mock("@/core/config/firebase", () => ({
  auth: {
    currentUser: null,
  },
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn((_auth, cb) => {
    cb(null);
    return jest.fn();
  }),
}));

describe("AutoProcessUploads", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it("calls process-uploads endpoint on mount", async () => {
    render(<AutoProcessUploads />);
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/ai/process-uploads",
          expect.objectContaining({ method: "POST" })
        );
      },
      { timeout: 4000 }
    );
  });
});
