import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";
import invariant from "tiny-invariant";

import { IconButton } from "@atlaskit/button/new";
import DropdownMenu, {
  type CustomTriggerProps,
  DropdownItem,
  DropdownItemGroup,
} from "@atlaskit/dropdown-menu";
// eslint-disable-next-line @atlaskit/design-system/no-banned-imports
import mergeRefs from "@atlaskit/ds-lib/merge-refs";
import Heading from "@atlaskit/heading";
// This is the smaller MoreIcon soon to be more easily accessible with the
// ongoing icon project
import MoreIcon from "@atlaskit/icon/glyph/editor/more";
import { easeInOut } from "@atlaskit/motion/curves";
import { mediumDurationMs } from "@atlaskit/motion/durations";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { centerUnderPointer } from "@atlaskit/pragmatic-drag-and-drop/element/center-under-pointer";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { Box, Flex, Inline, Stack, xcss } from "@atlaskit/primitives";
import { token } from "@atlaskit/tokens";

import { type MainMenuCardType } from "../../data";

import { useBoardContext } from "./board-context";
import { Card } from "./card";
import {
  MainMenuCardContext,
  type MainMenuCardContextProps,
  useMainMenuCardContext,
} from "./main-menu-card-context";

const mainMenuCardStyles = xcss({
  width: "900px",
  height: "30%",
  backgroundColor: "elevation.surface.sunken",
  borderRadius: "border.radius.300",
  transition: `background ${mediumDurationMs}ms ${easeInOut}`,
  position: "relative",
});
const leftCardsListStyles = xcss({
  width: "400px",
  height: "100%",
  backgroundColor: "elevation.surface.sunken",
  borderRadius: "border.radius.300",
  transition: `background ${mediumDurationMs}ms ${easeInOut}`,
  position: "relative",
});

const stackStyles = xcss({
  // allow the container to be shrunk by a parent height
  // https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/#the-minimum-size-gotcha-11
  minHeight: "0",

  // ensure our card list grows to be all the available space
  // so that users can easily drop on en empty list
  flexGrow: 1,
});

const scrollContainerStyles = xcss({
  height: "100%",
  overflowY: "auto",
});

const cardListStyles = xcss({
  boxSizing: "border-box",
  minHeight: "100%",
  padding: "space.100",
  gap: "space.100",
});

const mainMenuCardHeaderStyles = xcss({
  paddingInlineStart: "space.200",
  paddingInlineEnd: "space.200",
  paddingBlockStart: "space.100",
  color: "color.text.subtlest",
  userSelect: "none",
});

/**
 * Note: not making `'is-dragging'` a `State` as it is
 * a _parallel_ state to `'is- mainMenuCard-over'`.
 *
 * Our board allows you to be over the  mainMenuCard that is currently dragging
 */
type State =
  | { type: "idle" }
  | { type: "is-card-over" }
  | { type: "is-mainMenuCard-over"; closestEdge: Edge | null }
  | { type: "generate-safari-mainMenuCard-preview"; container: HTMLElement }
  | { type: "generate-mainMenuCard-preview" };

// preventing re-renders with stable state objects
const idle: State = { type: "idle" };
const isCardOver: State = { type: "is-card-over" };

const stateStyles: {
  [key in State["type"]]: ReturnType<typeof xcss> | undefined;
} = {
  idle: xcss({
    cursor: "grab",
  }),
  "is-card-over": xcss({
    backgroundColor: "color.background.selected.hovered",
  }),
  "is-mainMenuCard-over": undefined,
  /**
   * **Browser bug workaround**
   *
   * _Problem_
   * When generating a drag preview for an element
   * that has an inner scroll container, the preview can include content
   * vertically before or after the element
   *
   * _Fix_
   * We make the  mainMenuCard a new stacking context when the preview is being generated.
   * We are not making a new stacking context at all times, as this _can_ mess up
   * other layering components inside of your card
   *
   * _Fix: Safari_
   * We have not found a great workaround yet. So for now we are just rendering
   * a custom drag preview
   */
  "generate-mainMenuCard-preview": xcss({
    isolation: "isolate",
  }),
  "generate-safari-mainMenuCard-preview": undefined,
};

const isDraggingStyles = xcss({
  opacity: 0.4,
});

export const MainMenuCard = memo(function MainMenuCard({
  mainMenuCard,
}: {
  mainMenuCard: MainMenuCardType;
}) {
  const mainMenuCardId = mainMenuCard.mainMenuCardId;
  const mainMenuCardRef = useRef<HTMLDivElement | null>(null);
  const mainMenuCardInnerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<State>(idle);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const { instanceId, registerMainMenuCard } = useBoardContext();

  useEffect(() => {
    invariant(mainMenuCardRef.current);
    invariant(mainMenuCardInnerRef.current);
    invariant(headerRef.current);
    invariant(scrollableRef.current);
    return combine(
      // registerMainMenuCard({
      //   mainMenuCardId,
      //   entry: {
      //     element: mainMenuCardRef.current,
      //   },
      // }),
      // draggable({
      //   element: mainMenuCardRef.current,
      //   dragHandle: headerRef.current,
      //   getInitialData: () => ({
      //     mainMenuCardId,
      //     type: "mainMenuCard",
      //     instanceId,
      //   }),
      //   onGenerateDragPreview: ({ nativeSetDragImage }) => {
      //     const isSafari: boolean =
      //       navigator.userAgent.includes("AppleWebKit") &&
      //       !navigator.userAgent.includes("Chrome");

      //     if (!isSafari) {
      //       setState({ type: "generate-mainMenuCard-preview" });
      //       return;
      //     }
      //     setCustomNativeDragPreview({
      //       getOffset: centerUnderPointer,
      //       render: ({ container }) => {
      //         setState({
      //           type: "generate-safari-mainMenuCard-preview",
      //           container,
      //         });
      //         return () => setState(idle);
      //       },
      //       nativeSetDragImage,
      //     });
      //   },
      //   onDragStart: () => {
      //     setIsDragging(true);
      //   },
      //   onDrop() {
      //     setState(idle);
      //     setIsDragging(false);
      //   },
      // }),
      dropTargetForElements({
        element: mainMenuCardInnerRef.current,
        getData: () => ({ mainMenuCardId }),
        canDrop: ({ source }) => {
          return (
            source.data.instanceId === instanceId && source.data.type === "card"
          );
        },
        getIsSticky: () => true,
        onDragEnter: () => setState(isCardOver),
        onDragLeave: () => setState(idle),
        onDragStart: () => setState(isCardOver),
        onDrop: () => setState(idle),
      })
      // dropTargetForElements({
      //   element: mainMenuCardRef.current,
      //   canDrop: ({ source }) => {
      //     return (
      //       source.data.instanceId === instanceId &&
      //       source.data.type === "mainMenuCard"
      //     );
      //   },
      //   getIsSticky: () => true,
      //   getData: ({ input, element }) => {
      //     const data = {
      //       mainMenuCardId,
      //     };
      //     return attachClosestEdge(data, {
      //       input,
      //       element,
      //       allowedEdges: ["left", "right"],
      //     });
      //   },
      //   onDragEnter: (args) => {
      //     setState({
      //       type: "is-mainMenuCard-over",
      //       closestEdge: extractClosestEdge(args.self.data),
      //     });
      //   },
      //   onDrag: (args) => {
      //     // skip react re-render if edge is not changing
      //     setState((current) => {
      //       const closestEdge: Edge | null = extractClosestEdge(args.self.data);
      //       if (
      //         current.type === "is-mainMenuCard-over" &&
      //         current.closestEdge === closestEdge
      //       ) {
      //         return current;
      //       }
      //       return {
      //         type: "is-mainMenuCard-over",
      //         closestEdge,
      //       };
      //     });
      //   },
      //   onDragLeave: () => {
      //     setState(idle);
      //   },
      //   onDrop: () => {
      //     setState(idle);
      //   },
      // }),
      // autoScrollForElements({
      //   element: scrollableRef.current,
      //   canScroll: ({ source }) =>
      //     source.data.instanceId === instanceId && source.data.type === "card",
      // })
    );
  }, [mainMenuCardId, registerMainMenuCard, instanceId]);

  const stableItems = useRef(mainMenuCard.items);
  useEffect(() => {
    stableItems.current = mainMenuCard.items;
  }, [mainMenuCard.items]);

  const getCardIndex = useCallback((userId: string) => {
    return stableItems.current.findIndex((item) => item.userId === userId);
  }, []);

  const getNumCards = useCallback(() => {
    return stableItems.current.length;
  }, []);

  const contextValue: MainMenuCardContextProps = useMemo(() => {
    return { mainMenuCardId, getCardIndex, getNumCards };
  }, [mainMenuCardId, getCardIndex, getNumCards]);

  const style =
    mainMenuCardId === "leftCards" ? leftCardsListStyles : mainMenuCardStyles;
  return (
    <MainMenuCardContext.Provider value={contextValue}>
      <Flex
        testId={` mainMenuCard-${mainMenuCardId}`}
        ref={mainMenuCardRef}
        xcss={[style, stateStyles[state.type]]}
      >
        {/* This element takes up the same visual space as the  mainMenuCard.
          We are using a separate element so we can have two drop targets
          that take up the same visual space (one for cards, one for  mainMenuCards)
        */}
        <Stack xcss={stackStyles} ref={mainMenuCardInnerRef}>
          <Stack
            xcss={[stackStyles, isDragging ? isDraggingStyles : undefined]}
          >
            <Inline
              xcss={mainMenuCardHeaderStyles}
              ref={headerRef}
              testId={` mainMenuCard-header-${mainMenuCardId}`}
              spread='space-between'
              alignBlock='center'
            >
              <Heading
                level='h300'
                as='span'
                testId={` mainMenuCard-header-title-${mainMenuCardId}`}
              >
                {mainMenuCard.title}
              </Heading>
              <ActionMenu />
            </Inline>
            <Box xcss={scrollContainerStyles} ref={scrollableRef}>
              <div>
                {mainMenuCard.items.map((item) => (
                  <Card item={item} key={item.userId} />
                ))}
              </div>
            </Box>
          </Stack>
        </Stack>
        {state.type === "is-mainMenuCard-over" && state.closestEdge && (
          <DropIndicator
            edge={state.closestEdge}
            gap={token("space.200", "0")}
          />
        )}
      </Flex>
      {state.type === "generate-safari-mainMenuCard-preview"
        ? createPortal(
            <SafariMainMenuCardPreview mainMenuCard={mainMenuCard} />,
            state.container
          )
        : null}
    </MainMenuCardContext.Provider>
  );
});

const safariPreviewStyles = xcss({
  width: "250px",
  backgroundColor: "elevation.surface.sunken",
  borderRadius: "border.radius",
  padding: "space.200",
});

function SafariMainMenuCardPreview({
  mainMenuCard,
}: {
  mainMenuCard: MainMenuCardType;
}) {
  return (
    <Box xcss={[mainMenuCardHeaderStyles, safariPreviewStyles]}>
      <Heading level='h100' as='span'>
        {mainMenuCard.title}
      </Heading>
    </Box>
  );
}

function ActionMenu() {
  return (
    <DropdownMenu trigger={DropdownMenuTrigger}>
      <ActionMenuCards />
    </DropdownMenu>
  );
}

function ActionMenuCards() {
  const { mainMenuCardId } = useMainMenuCardContext();
  const { getMainMenuCards, reorderMainMenuCard } = useBoardContext();

  const mainMenuCards = getMainMenuCards();
  const startIndex = mainMenuCards.findIndex(
    (mainMenuCard) => mainMenuCard.mainMenuCardId === mainMenuCardId
  );

  const moveLeft = useCallback(() => {
    reorderMainMenuCard({
      startIndex,
      finishIndex: startIndex - 1,
    });
  }, [reorderMainMenuCard, startIndex]);

  const moveRight = useCallback(() => {
    reorderMainMenuCard({
      startIndex,
      finishIndex: startIndex + 1,
    });
  }, [reorderMainMenuCard, startIndex]);

  const isMoveLeftDisabled = startIndex === 0;
  const isMoveRightDisabled = startIndex === mainMenuCards.length - 1;

  return (
    <DropdownItemGroup>
      <DropdownItem onClick={moveLeft} isDisabled={isMoveLeftDisabled}>
        Move left
      </DropdownItem>
      <DropdownItem onClick={moveRight} isDisabled={isMoveRightDisabled}>
        Move right
      </DropdownItem>
    </DropdownItemGroup>
  );
}

function DropdownMenuTrigger({
  triggerRef,
  ...triggerProps
}: CustomTriggerProps) {
  return (
    <IconButton
      ref={mergeRefs([triggerRef])}
      appearance='subtle'
      label='Actions'
      spacing='compact'
      icon={MoreIcon}
      {...triggerProps}
    />
  );
}
