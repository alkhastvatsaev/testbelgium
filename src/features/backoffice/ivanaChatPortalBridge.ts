/**
 * Pont hub société → inbox carte : les messages envoyés depuis le chat client
 * déclenchent un événement window consommé par {@link IvanaClientChatPanel} côté back-office.
 */
export const IVANA_PORTAL_MESSAGE_EVENT = "map-belgique-ivana-portal-message" as const;

export type ClientPortalChatPayload = {
  id: string;
  text: string;
  images?: string[];
  createdAt: number;
};

export function publishClientPortalMessage(payload: ClientPortalChatPayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ClientPortalChatPayload>(IVANA_PORTAL_MESSAGE_EVENT, { detail: payload }),
  );
}
