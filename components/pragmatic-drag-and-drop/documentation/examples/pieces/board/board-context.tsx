import { createContext, useContext } from "react";

import invariant from "tiny-invariant";

import type { CleanupFn } from "@atlaskit/pragmatic-drag-and-drop/types";

import type { MainMenuCardType } from "../../data/";

export type BoardContextValue = {
  getMainMenuCards: () => MainMenuCardType[];

  reorderMainMenuCard: (args: {
    startIndex: number;
    finishIndex: number;
  }) => void;

  reorderCard: (args: {
    mainMenuCardId: string;
    startIndex: number;
    finishIndex: number;
  }) => void;

  moveCard: (args: {
    startMainMenuCardId: string;
    finishMainMenuCardId: string;
    itemIndexInStartMainMenuCard: number;
    itemIndexInFinishMainMenuCard?: number;
  }) => void;

  registerCard: (args: {
    cardId: string;
    entry: {
      element: HTMLElement;
      actionMenuTrigger: HTMLElement;
    };
  }) => CleanupFn;

  registerMainMenuCard: (args: {
    mainMenuCardId: string;
    entry: {
      element: HTMLElement;
    };
  }) => CleanupFn;

  instanceId: symbol;
};

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext(): BoardContextValue {
  const value = useContext(BoardContext);
  invariant(value, "cannot find BoardContext provider");
  return value;
}
