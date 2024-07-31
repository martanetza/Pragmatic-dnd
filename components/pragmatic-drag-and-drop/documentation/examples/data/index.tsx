/**
 * These imports are written out explicitly because they
 * need to be statically analyzable to be uploaded to CodeSandbox correctly.
 */

export type Person = {
  userId: string;
  name: string;
  role: string;
};

const names: string[] = ["a", "b"];

const roles: string[] = ["Engineer", "Senior Engineer"];

let sharedLookupIndex: number = 0;

/**
 * Note: this does not use randomness so that it is stable for VR tests
 */
export function getPerson(): Person {
  sharedLookupIndex++;
  return getPersonFromPosition({ position: sharedLookupIndex });
}

export function getPersonFromPosition({
  position,
}: {
  position: number;
}): Person {
  // use the next name
  const name = names[position % names.length];
  // use the next role
  const role = roles[position % roles.length];
  return {
    userId: `id:${position}`,
    name,
    role,
  };
}

export function getPeopleFromPosition({
  amount,
  startIndex,
}: {
  amount: number;
  startIndex: number;
}): Person[] {
  return Array.from({ length: amount }, () =>
    getPersonFromPosition({ position: startIndex++ })
  );
}

export function getPeople({ amount }: { amount: number }): Person[] {
  return Array.from({ length: amount }, () => getPerson());
}

export type MainMenuCardType = {
  title: string;
  mainMenuCardId: string;
  items: Person[];
};
export type MainMenuCardMap = { [mainMenuCardId: string]: MainMenuCardType };

export function getData({
  mainMenuCardCount,
  itemsPerMainMenuCard,
}: {
  mainMenuCardCount: number;
  itemsPerMainMenuCard: number;
}) {
  const mainMenuCardMap: MainMenuCardMap = {};

  for (let i = 0; i < mainMenuCardCount; i++) {
    const mainMenuCard: MainMenuCardType = {
      title: `MainMenuCard ${i}`,
      mainMenuCardId: ` mainMenuCard-${i}`,
      items: getPeople({ amount: itemsPerMainMenuCard }),
    };
    mainMenuCardMap[mainMenuCard.mainMenuCardId] = mainMenuCard;
  }
  const orderedMainMenuCardIds = Object.keys(mainMenuCardMap);

  return {
    mainMenuCardMap,
    orderedMainMenuCardIds,
    lastOperation: null,
  };
}

export function getBasicData() {
  const mainMenuCardMap: MainMenuCardMap = {
    about: {
      title: "About",
      mainMenuCardId: "about",
      items: getPeople({ amount: 2 }),
    },
    contact: {
      title: "Contact",
      mainMenuCardId: "contact",
      items: getPeople({ amount: 2 }),
    },
    services: {
      title: "Services",
      mainMenuCardId: "services",
      items: getPeople({ amount: 2 }),
    },
    leftCards: {
      title: "Left Cards",
      mainMenuCardId: "leftCards",
      items: getPeople({ amount: 10 }),
    },
  };

  const orderedMainMenuCardIds = ["about", "services", "contact"];

  return {
    mainMenuCardMap,
    orderedMainMenuCardIds,
  };
}
