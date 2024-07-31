"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import invariant from "tiny-invariant";

import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import * as liveRegion from "@atlaskit/pragmatic-drag-and-drop-live-region";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";

import {
  type MainMenuCardMap,
  type MainMenuCardType,
  getBasicData,
  type Person,
} from "./pragmatic-drag-and-drop/documentation/examples/data/";
import Board from "./pragmatic-drag-and-drop/documentation/examples/pieces/board/board";
import {
  BoardContext,
  type BoardContextValue,
} from "./pragmatic-drag-and-drop/documentation/examples/pieces/board/board-context";
import { MainMenuCard } from "./pragmatic-drag-and-drop/documentation/examples/pieces/board/main-menu-card";
import { createRegistry } from "./pragmatic-drag-and-drop/documentation/examples/pieces/board/registry";
import AllCardList from "./pragmatic-drag-and-drop/documentation/examples/pieces/board/all-cards-list";

type Outcome =
  | {
      type: " mainMenuCard-reorder";
      mainMenuCardId: string;
      startIndex: number;
      finishIndex: number;
    }
  | {
      type: "card-reorder";
      mainMenuCardId: string;
      startIndex: number;
      finishIndex: number;
    }
  | {
      type: "card-move";
      finishMainMenuCardId: string;
      itemIndexInStartMainMenuCard: number;
      itemIndexInFinishMainMenuCard: number;
    };

type Trigger = "pointer" | "keyboard";

type Operation = {
  trigger: Trigger;
  outcome: Outcome;
};

type BoardState = {
  mainMenuCardMap: MainMenuCardMap;
  orderedMainMenuCardIds: string[];
  lastOperation: Operation | null;
};

export default function MenuBoard() {
  const [data, setData] = useState<BoardState>(() => {
    const base = getBasicData();
    return {
      ...base,
      lastOperation: null,
    };
  });

  const stableData = useRef(data);
  useEffect(() => {
    stableData.current = data;
  }, [data]);

  const [registry] = useState(createRegistry);

  const { lastOperation } = data;

  useEffect(() => {
    if (lastOperation === null) {
      return;
    }
    const { outcome, trigger } = lastOperation;

    if (outcome.type === " mainMenuCard-reorder") {
      const { startIndex, finishIndex } = outcome;

      const { mainMenuCardMap, orderedMainMenuCardIds } = stableData.current;
      const sourceMainMenuCard =
        mainMenuCardMap[orderedMainMenuCardIds[finishIndex]];

      const entry = registry.getMainMenuCard(sourceMainMenuCard.mainMenuCardId);
      triggerPostMoveFlash(entry.element);

      liveRegion.announce(
        `You've moved ${sourceMainMenuCard.title} from position ${
          startIndex + 1
        } to position ${finishIndex + 1} of ${orderedMainMenuCardIds.length}.`
      );

      return;
    }

    if (outcome.type === "card-reorder") {
      const { mainMenuCardId, startIndex, finishIndex } = outcome;

      const { mainMenuCardMap } = stableData.current;
      const mainMenuCard = mainMenuCardMap[mainMenuCardId];
      const item = mainMenuCard.items[finishIndex];

      const entry = registry.getCard(item.userId);
      triggerPostMoveFlash(entry.element);

      if (trigger !== "keyboard") {
        return;
      }

      liveRegion.announce(
        `You've moved ${item.name} from position ${
          startIndex + 1
        } to position ${finishIndex + 1} of ${
          mainMenuCard.items.length
        } in the ${mainMenuCard.title}  mainMenuCard.`
      );

      return;
    }

    if (outcome.type === "card-move") {
      const {
        finishMainMenuCardId,
        itemIndexInStartMainMenuCard,
        itemIndexInFinishMainMenuCard,
      } = outcome;

      const data = stableData.current;
      const destinationMainMenuCard =
        data.mainMenuCardMap[finishMainMenuCardId];
      console.log("destinationMainMenuCard", destinationMainMenuCard);
      const item = destinationMainMenuCard.items[itemIndexInFinishMainMenuCard];

      const finishPosition =
        typeof itemIndexInFinishMainMenuCard === "number"
          ? itemIndexInFinishMainMenuCard + 1
          : destinationMainMenuCard.items.length;

      const entry = registry.getCard(item.userId);
      triggerPostMoveFlash(entry.element);

      if (trigger !== "keyboard") {
        return;
      }

      liveRegion.announce(
        `You've moved ${item.name} from position ${
          itemIndexInStartMainMenuCard + 1
        } to position ${finishPosition} in the ${
          destinationMainMenuCard.title
        }  mainMenuCard.`
      );

      /**
       * Because the card has moved  mainMenuCard, it will have remounted.
       * This means we need to manually restore focus to it.
       */
      entry.actionMenuTrigger.focus();

      return;
    }
  }, [lastOperation, registry]);

  useEffect(() => {
    return liveRegion.cleanup();
  }, []);

  const getMainMenuCards = useCallback(() => {
    const { mainMenuCardMap, orderedMainMenuCardIds } = stableData.current;
    return orderedMainMenuCardIds.map(
      (mainMenuCardId) => mainMenuCardMap[mainMenuCardId]
    );
  }, []);

  const reorderMainMenuCard = useCallback(
    ({
      startIndex,
      finishIndex,
      trigger = "keyboard",
    }: {
      startIndex: number;
      finishIndex: number;
      trigger?: Trigger;
    }) => {
      setData((data) => {
        const outcome: Outcome = {
          type: " mainMenuCard-reorder",
          mainMenuCardId: data.orderedMainMenuCardIds[startIndex],
          startIndex,
          finishIndex,
        };

        return {
          ...data,
          orderedMainMenuCardIds: reorder({
            list: data.orderedMainMenuCardIds,
            startIndex,
            finishIndex,
          }),
          lastOperation: {
            outcome,
            trigger: trigger,
          },
        };
      });
    },
    []
  );

  const reorderCard = useCallback(
    ({
      mainMenuCardId,
      startIndex,
      finishIndex,
      trigger = "keyboard",
    }: {
      mainMenuCardId: string;
      startIndex: number;
      finishIndex: number;
      trigger?: Trigger;
    }) => {
      setData((data) => {
        const sourceMainMenuCard = data.mainMenuCardMap[mainMenuCardId];
        const updatedItems = reorder({
          list: sourceMainMenuCard.items,
          startIndex,
          finishIndex,
        });

        const updatedSourceMainMenuCard: MainMenuCardType = {
          ...sourceMainMenuCard,
          items: updatedItems,
        };

        const updatedMap: MainMenuCardMap = {
          ...data.mainMenuCardMap,
          [mainMenuCardId]: updatedSourceMainMenuCard,
        };

        const outcome: Outcome | null = {
          type: "card-reorder",
          mainMenuCardId,
          startIndex,
          finishIndex,
        };

        return {
          ...data,
          mainMenuCardMap: updatedMap,
          lastOperation: {
            trigger: trigger,
            outcome,
          },
        };
      });
    },
    []
  );

  const moveCard = useCallback(
    ({
      startMainMenuCardId,
      finishMainMenuCardId,
      itemIndexInStartMainMenuCard,
      itemIndexInFinishMainMenuCard,
      trigger = "keyboard",
    }: {
      startMainMenuCardId: string;
      finishMainMenuCardId: string;
      itemIndexInStartMainMenuCard: number;
      itemIndexInFinishMainMenuCard?: number;
      trigger?: "pointer" | "keyboard";
    }) => {
      // invalid cross  mainMenuCard movement
      if (startMainMenuCardId === finishMainMenuCardId) {
        return;
      }
      setData((data) => {
        const sourceMainMenuCard = data.mainMenuCardMap[startMainMenuCardId];
        console.log("sourceMainMenuCard", sourceMainMenuCard);
        const destinationMainMenuCard =
          data.mainMenuCardMap[finishMainMenuCardId];
        const item: Person =
          sourceMainMenuCard.items[itemIndexInStartMainMenuCard];

        const destinationItems = Array.from(destinationMainMenuCard.items);
        // Going into the first position if no index is provided
        const newIndexInDestination = itemIndexInFinishMainMenuCard ?? 0;
        destinationItems.splice(newIndexInDestination, 0, item);

        const updatedMap = {
          ...data.mainMenuCardMap,
          [startMainMenuCardId]: {
            ...sourceMainMenuCard,
            items: sourceMainMenuCard.items.filter(
              (i) => i.userId !== item.userId
            ),
          },
          [finishMainMenuCardId]: {
            ...destinationMainMenuCard,
            items: destinationItems,
          },
        };

        const outcome: Outcome | null = {
          type: "card-move",
          finishMainMenuCardId,
          itemIndexInStartMainMenuCard,
          itemIndexInFinishMainMenuCard: newIndexInDestination,
        };

        return {
          ...data,
          mainMenuCardMap: updatedMap,
          lastOperation: {
            outcome,
            trigger: trigger,
          },
        };
      });
    },
    []
  );

  const [instanceId] = useState(() => Symbol("instance-id"));

  useEffect(() => {
    return combine(
      monitorForElements({
        canMonitor({ source }) {
          return source.data.instanceId === instanceId;
        },
        onDrop(args) {
          const { location, source } = args;
          // didn't drop on anything
          if (!location.current.dropTargets.length) {
            return;
          }
          // need to handle drop

          // 1. remove element from original position
          // 2. move to new position

          if (source.data.type === "mainMenuCard") {
            const startIndex: number = data.orderedMainMenuCardIds.findIndex(
              (mainMenuCardId) => mainMenuCardId === source.data.mainMenuCardId
            );

            const target = location.current.dropTargets[0];
            const indexOfTarget: number = data.orderedMainMenuCardIds.findIndex(
              (id) => id === target.data.mainMenuCardId
            );
            const closestEdgeOfTarget: Edge | null = extractClosestEdge(
              target.data
            );

            const finishIndex = getReorderDestinationIndex({
              startIndex,
              indexOfTarget,
              closestEdgeOfTarget,
              axis: "horizontal",
            });

            reorderMainMenuCard({
              startIndex,
              finishIndex,
              trigger: "pointer",
            });
          }
          // Dragging a card
          if (source.data.type === "card") {
            const itemId = source.data.itemId;
            invariant(typeof itemId === "string");
            // TODO: these lines not needed if item has  mainMenuCardId on it
            const [, startMainMenuCardRecord] = location.initial.dropTargets;
            const sourceId = startMainMenuCardRecord.data.mainMenuCardId;
            console.log("sourceId", sourceId);
            invariant(typeof sourceId === "string");
            const sourceMainMenuCard = data.mainMenuCardMap[sourceId];
            const itemIndex = sourceMainMenuCard.items.findIndex(
              (item) => item.userId === itemId
            );

            if (location.current.dropTargets.length === 1) {
              const [destinationMainMenuCardRecord] =
                location.current.dropTargets;
              const destinationId =
                destinationMainMenuCardRecord.data.mainMenuCardId;
              invariant(typeof destinationId === "string");
              const destinationMainMenuCard =
                data.mainMenuCardMap[destinationId];
              invariant(destinationMainMenuCard);

              // reordering in same  mainMenuCard
              if (sourceMainMenuCard === destinationMainMenuCard) {
                const destinationIndex = getReorderDestinationIndex({
                  startIndex: itemIndex,
                  indexOfTarget: sourceMainMenuCard.items.length - 1,
                  closestEdgeOfTarget: null,
                  axis: "vertical",
                });
                reorderCard({
                  mainMenuCardId: sourceMainMenuCard.mainMenuCardId,
                  startIndex: itemIndex,
                  finishIndex: destinationIndex,
                  trigger: "pointer",
                });
                return;
              }

              // moving to a new  mainMenuCard
              moveCard({
                itemIndexInStartMainMenuCard: itemIndex,
                startMainMenuCardId: sourceMainMenuCard.mainMenuCardId,
                finishMainMenuCardId: destinationMainMenuCard.mainMenuCardId,
                trigger: "pointer",
              });
              return;
            }

            // dropping in a  mainMenuCard (relative to a card)
            if (location.current.dropTargets.length === 2) {
              console.log(
                "location.current.dropTargets",
                location.current.dropTargets
              );
              const [destinationCardRecord, destinationMainMenuCardRecord] =
                location.current.dropTargets;
              const destinationMainMenuCardId =
                destinationMainMenuCardRecord.data.mainMenuCardId;
              invariant(typeof destinationMainMenuCardId === "string");
              const destinationMainMenuCard =
                data.mainMenuCardMap[destinationMainMenuCardId];

              const indexOfTarget = destinationMainMenuCard.items.findIndex(
                (item) => item.userId === destinationCardRecord.data.itemId
              );
              const closestEdgeOfTarget: Edge | null = extractClosestEdge(
                destinationCardRecord.data
              );

              // case 1: ordering in the same  mainMenuCard
              if (sourceMainMenuCard === destinationMainMenuCard) {
                const destinationIndex = getReorderDestinationIndex({
                  startIndex: itemIndex,
                  indexOfTarget,
                  closestEdgeOfTarget,
                  axis: "vertical",
                });
                reorderCard({
                  mainMenuCardId: sourceMainMenuCard.mainMenuCardId,
                  startIndex: itemIndex,
                  finishIndex: destinationIndex,
                  trigger: "pointer",
                });
                return;
              }

              // case 2: moving into a new  mainMenuCard relative to a card

              const destinationIndex =
                closestEdgeOfTarget === "bottom"
                  ? indexOfTarget + 1
                  : indexOfTarget;

              moveCard({
                itemIndexInStartMainMenuCard: itemIndex,
                startMainMenuCardId: sourceMainMenuCard.mainMenuCardId,
                finishMainMenuCardId: destinationMainMenuCard.mainMenuCardId,
                itemIndexInFinishMainMenuCard: destinationIndex,
                trigger: "pointer",
              });
            }
          }
        },
      })
    );
  }, [data, instanceId, moveCard, reorderCard, reorderMainMenuCard]);

  const contextValue: BoardContextValue = useMemo(() => {
    return {
      getMainMenuCards,
      reorderMainMenuCard,
      reorderCard,
      moveCard,
      registerCard: registry.registerCard,
      registerMainMenuCard: registry.registerMainMenuCard,
      instanceId,
    };
  }, [
    getMainMenuCards,
    reorderMainMenuCard,
    reorderCard,
    registry,
    moveCard,
    instanceId,
  ]);

  return (
    <BoardContext.Provider value={contextValue}>
      <Board>
        <div>
          <MainMenuCard mainMenuCard={data.mainMenuCardMap["leftCards"]} />
        </div>
        <div>
          {data.orderedMainMenuCardIds.map((mainMenuCardId) => {
            return (
              <MainMenuCard
                mainMenuCard={data.mainMenuCardMap[mainMenuCardId]}
                key={mainMenuCardId}
              />
            );
          })}
        </div>
      </Board>
    </BoardContext.Provider>
  );
}
