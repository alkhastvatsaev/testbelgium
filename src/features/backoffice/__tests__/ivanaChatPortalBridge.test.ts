/** @jest-environment jsdom */
import {
  IVANA_PORTAL_MESSAGE_EVENT,
  publishClientPortalMessage,
  type ClientPortalChatPayload,
} from "../ivanaChatPortalBridge";

describe("ivanaChatPortalBridge", () => {
  it("émet un CustomEvent avec le détail du message", () => {
    const handler = jest.fn();
    window.addEventListener(IVANA_PORTAL_MESSAGE_EVENT, handler);
    const payload: ClientPortalChatPayload = {
      id: "m1",
      text: "Bonjour depuis le portail",
      createdAt: 42,
    };
    publishClientPortalMessage(payload);
    expect(handler).toHaveBeenCalledTimes(1);
    const ev = handler.mock.calls[0][0] as CustomEvent<ClientPortalChatPayload>;
    expect(ev.detail).toEqual(payload);
    window.removeEventListener(IVANA_PORTAL_MESSAGE_EVENT, handler);
  });
});
