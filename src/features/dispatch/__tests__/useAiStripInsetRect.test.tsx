/** @jest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { useAiStripInsetRect } from "../useAiStripInsetRect";
import { AI_STRIP_EDGE_INSET_PX } from "../aiStripAnchor";

describe("useAiStripInsetRect", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it("retourne null si aucun ancre (#spotlight-search / #map-container)", async () => {
    document.body.innerHTML = `<div class="dashboard-layout"></div>`;
    const { result } = renderHook(() => useAiStripInsetRect());
    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it("calcule left/width à partir de #spotlight-search (hors HUD)", async () => {
    document.body.innerHTML = `
      <div class="dashboard-layout mode-presentation">
        <div id="spotlight-search"></div>
      </div>`;

    const anchor = document.getElementById("spotlight-search")!;
    jest.spyOn(anchor, "getBoundingClientRect").mockReturnValue({
      left: 100,
      width: 320,
      top: 0,
      height: 40,
      right: 420,
      bottom: 40,
      x: 100,
      y: 0,
      toJSON() {
        return {};
      },
    });

    global.ResizeObserver = class {
      observe = jest.fn();
      disconnect = jest.fn();
      unobserve = jest.fn();
    };

    const { result } = renderHook(() => useAiStripInsetRect());

    await waitFor(() => {
      expect(result.current).toEqual({
        left: 100 + AI_STRIP_EDGE_INSET_PX,
        width: 320 - AI_STRIP_EDGE_INSET_PX * 2,
      });
    });
  });
});
