import invariant from "tiny-invariant";

import type { CleanupFn } from "@atlaskit/pragmatic-drag-and-drop/types";

export type CardEntry = {
  element: HTMLElement;
  actionMenuTrigger: HTMLElement;
};

export type MainMenuCardEntry = {
  element: HTMLElement;
};

/**
 * Registering cards and their action menu trigger element,
 * so that we can restore focus to the trigger when a card moves between  mainMenuCards.
 */
export function createRegistry() {
  const cards = new Map<string, CardEntry>();
  const mainMenuCards = new Map<string, MainMenuCardEntry>();

  function registerCard({
    cardId,
    entry,
  }: {
    cardId: string;
    entry: CardEntry;
  }): CleanupFn {
    cards.set(cardId, entry);
    return function cleanup() {
      cards.delete(cardId);
    };
  }

  function registerMainMenuCard({
    mainMenuCardId,
    entry,
  }: {
    mainMenuCardId: string;
    entry: MainMenuCardEntry;
  }): CleanupFn {
    mainMenuCards.set(mainMenuCardId, entry);
    return function cleanup() {
      cards.delete(mainMenuCardId);
    };
  }

  function getCard(cardId: string): CardEntry {
    const entry = cards.get(cardId);
    invariant(entry);
    return entry;
  }

  function getMainMenuCard(mainMenuCardId: string): MainMenuCardEntry {
    const entry = mainMenuCards.get(mainMenuCardId);
    invariant(entry);
    return entry;
  }

  return { registerCard, registerMainMenuCard, getCard, getMainMenuCard };
}
