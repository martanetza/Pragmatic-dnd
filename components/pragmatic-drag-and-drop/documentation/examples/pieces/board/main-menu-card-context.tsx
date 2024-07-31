import { createContext, useContext } from "react";

import invariant from "tiny-invariant";

export type MainMenuCardContextProps = {
  mainMenuCardId: string;
  getCardIndex: (userId: string) => number;
  getNumCards: () => number;
};

export const MainMenuCardContext =
  createContext<MainMenuCardContextProps | null>(null);
export function useMainMenuCardContext(): MainMenuCardContextProps {
  console.log("useMainMenuCardContext");
  const value = useContext(MainMenuCardContext);
  invariant(value, "cannot find MainMenuCardContext provider");
  return value;
}
