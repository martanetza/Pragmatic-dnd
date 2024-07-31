import React, {
  forwardRef,
  Fragment,
  memo,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import ReactDOM from "react-dom";
import invariant from "tiny-invariant";

import Avatar from "@atlaskit/avatar";
import { IconButton } from "@atlaskit/button/new";
import DropdownMenu, {
  DropdownItem,
  DropdownItemGroup,
} from "@atlaskit/dropdown-menu";
// eslint-disable-next-line @atlaskit/design-system/no-banned-imports
import mergeRefs from "@atlaskit/ds-lib/merge-refs";
import Heading from "@atlaskit/heading";
// This is the smaller MoreIcon soon to be more easily accessible with the
// ongoing icon project
import MoreIcon from "@atlaskit/icon/glyph/editor/more";
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
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { dropTargetForExternal } from "@atlaskit/pragmatic-drag-and-drop/external/adapter";
import { Box, Grid, Stack, xcss } from "@atlaskit/primitives";
import { token } from "@atlaskit/tokens";

import { type MainMenuCardType, type Person } from "../../data/";

import { useBoardContext } from "./board-context";
import { useMainMenuCardContext } from "./main-menu-card-context";

type State =
  | { type: "idle" }
  | { type: "preview"; container: HTMLElement; rect: DOMRect }
  | { type: "dragging" };

const idleState: State = { type: "idle" };
const draggingState: State = { type: "dragging" };

const noMarginStyles = xcss({ margin: "space.0" });
const baseStyles = xcss({
  width: "100%",
  padding: "space.100",
  backgroundColor: "elevation.surface",
  borderRadius: "border.radius.200",
  position: "relative",
  ":hover": {
    backgroundColor: "elevation.surface.hovered",
  },
});

const stateStyles: {
  [Key in State["type"]]: ReturnType<typeof xcss> | undefined;
} = {
  idle: xcss({
    cursor: "grab",
    boxShadow: "elevation.shadow.raised",
  }),
  dragging: xcss({
    opacity: 0.4,
    boxShadow: "elevation.shadow.raised",
  }),
  // no shadow for preview - the platform will add it's own drop shadow
  preview: undefined,
};

const buttonMainMenuCardStyles = xcss({
  alignSelf: "start",
});

type CardPrimitiveProps = {
  closestEdge: Edge | null;
  item: Person;
  state: State;
  actionMenuTriggerRef?: Ref<HTMLButtonElement>;
};

function MoveToOtherMainMenuCardItem({
  targetMainMenuCard,
  startIndex,
}: {
  targetMainMenuCard: MainMenuCardType;
  startIndex: number;
}) {
  const { moveCard } = useBoardContext();
  const { mainMenuCardId } = useMainMenuCardContext();

  const onClick = useCallback(() => {
    moveCard({
      startMainMenuCardId: mainMenuCardId,
      finishMainMenuCardId: targetMainMenuCard.mainMenuCardId,
      itemIndexInStartMainMenuCard: startIndex,
    });
  }, [mainMenuCardId, moveCard, startIndex, targetMainMenuCard.mainMenuCardId]);

  return (
    <DropdownItem onClick={onClick}>{targetMainMenuCard.title}</DropdownItem>
  );
}

function LazyDropdownItems({ userId }: { userId: string }) {
  const { getMainMenuCards, reorderCard } = useBoardContext();
  const { mainMenuCardId, getCardIndex, getNumCards } =
    useMainMenuCardContext();

  const numCards = getNumCards();
  const startIndex = getCardIndex(userId);

  const moveToTop = useCallback(() => {
    reorderCard({ mainMenuCardId, startIndex, finishIndex: 0 });
  }, [mainMenuCardId, reorderCard, startIndex]);

  const moveUp = useCallback(() => {
    reorderCard({ mainMenuCardId, startIndex, finishIndex: startIndex - 1 });
  }, [mainMenuCardId, reorderCard, startIndex]);

  const moveDown = useCallback(() => {
    reorderCard({ mainMenuCardId, startIndex, finishIndex: startIndex + 1 });
  }, [mainMenuCardId, reorderCard, startIndex]);

  const moveToBottom = useCallback(() => {
    reorderCard({ mainMenuCardId, startIndex, finishIndex: numCards - 1 });
  }, [mainMenuCardId, reorderCard, startIndex, numCards]);

  const isMoveUpDisabled = startIndex === 0;
  const isMoveDownDisabled = startIndex === numCards - 1;

  const moveMainMenuCardOptions = getMainMenuCards().filter(
    (mainMenuCard) => mainMenuCard.mainMenuCardId !== mainMenuCardId
  );

  return (
    <Fragment>
      <DropdownItemGroup title='Reorder'>
        <DropdownItem onClick={moveToTop} isDisabled={isMoveUpDisabled}>
          Move to top
        </DropdownItem>
        <DropdownItem onClick={moveUp} isDisabled={isMoveUpDisabled}>
          Move up
        </DropdownItem>
        <DropdownItem onClick={moveDown} isDisabled={isMoveDownDisabled}>
          Move down
        </DropdownItem>
        <DropdownItem onClick={moveToBottom} isDisabled={isMoveDownDisabled}>
          Move to bottom
        </DropdownItem>
      </DropdownItemGroup>
      {moveMainMenuCardOptions.length ? (
        <DropdownItemGroup title='Move to'>
          {moveMainMenuCardOptions.map((mainMenuCard) => (
            <MoveToOtherMainMenuCardItem
              key={mainMenuCard.mainMenuCardId}
              targetMainMenuCard={mainMenuCard}
              startIndex={startIndex}
            />
          ))}
        </DropdownItemGroup>
      ) : null}
    </Fragment>
  );
}

const CardPrimitive = forwardRef<HTMLDivElement, CardPrimitiveProps>(
  function CardPrimitive(
    { closestEdge, item, state, actionMenuTriggerRef },
    ref
  ) {
    const { name, role, userId } = item;

    return (
      <Grid
        ref={ref}
        testId={`item-${userId}`}
        alignItems='center'
        xcss={[baseStyles, stateStyles[state.type]]}
      >
        <Stack space='space.050' grow='fill'>
          <Heading level='h400' as='span'>
            {name}
          </Heading>
          <Box as='small' xcss={noMarginStyles}>
            {role}
          </Box>
        </Stack>
        <Box xcss={buttonMainMenuCardStyles}>
          <DropdownMenu
            trigger={({ triggerRef, ...triggerProps }) => (
              <IconButton
                ref={
                  actionMenuTriggerRef
                    ? mergeRefs([triggerRef, actionMenuTriggerRef])
                    : // Workaround for IconButton typing issue
                      mergeRefs([triggerRef])
                }
                icon={MoreIcon}
                label={`Move ${name}`}
                appearance='default'
                spacing='compact'
                {...triggerProps}
              />
            )}
          >
            <LazyDropdownItems userId={userId} />
          </DropdownMenu>
        </Box>

        {closestEdge && (
          <DropIndicator edge={closestEdge} gap={token("space.100", "0")} />
        )}
      </Grid>
    );
  }
);

export const Card = memo(function Card({ item }: { item: Person }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { userId } = item;
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [state, setState] = useState<State>(idleState);

  const actionMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const { instanceId, registerCard } = useBoardContext();
  useEffect(() => {
    invariant(actionMenuTriggerRef.current);
    invariant(ref.current);

    return registerCard({
      cardId: userId,
      entry: {
        element: ref.current,
        actionMenuTrigger: actionMenuTriggerRef.current,
      },
    });
  }, [registerCard, userId]);

  useEffect(() => {
    const element = ref.current;
    invariant(element);
    return combine(
      draggable({
        element: element,
        getInitialData: () => ({ type: "card", itemId: userId, instanceId }),
        onGenerateDragPreview: ({ location, source, nativeSetDragImage }) => {
          const rect = source.element.getBoundingClientRect();
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({
              element,
              input: location.current.input,
            }),
            render({ container }) {
              setState({ type: "preview", container, rect });
              return () => setState(draggingState);
            },
          });
        },

        onDragStart: () => setState(draggingState),
        onDrop: () => setState(idleState),
      }),
      dropTargetForExternal({
        element: element,
      }),
      dropTargetForElements({
        element: element,
        canDrop: ({ source }) => {
          return (
            source.data.instanceId === instanceId && source.data.type === "card"
          );
        },
        getIsSticky: () => true,
        getData: ({ input, element }) => {
          const data = { type: "card", itemId: userId };

          return attachClosestEdge(data, {
            input,
            element,
            allowedEdges: ["top", "bottom"],
          });
        },
        onDragEnter: (args) => {
          if (args.source.data.itemId !== userId) {
            setClosestEdge(extractClosestEdge(args.self.data));
          }
        },
        onDrag: (args) => {
          if (args.source.data.itemId !== userId) {
            setClosestEdge(extractClosestEdge(args.self.data));
          }
        },
        onDragLeave: () => {
          setClosestEdge(null);
        },
        onDrop: () => {
          setClosestEdge(null);
        },
      })
    );
  }, [instanceId, item, userId]);

  return (
    <Fragment>
      <CardPrimitive
        ref={ref}
        item={item}
        state={state}
        closestEdge={closestEdge}
        actionMenuTriggerRef={actionMenuTriggerRef}
      />
      {state.type === "preview" &&
        ReactDOM.createPortal(
          <Box
            style={{
              /**
               * Ensuring the preview has the same dimensions as the original.
               *
               * Using `border-box` sizing here is not necessary in this
               * specific example, but it is safer to include generally.
               */
              // eslint-disable-next-line @atlaskit/ui-styling-standard/enforce-style-prop -- Ignored via go/DSP-18766
              boxSizing: "border-box",
              width: state.rect.width,
              height: state.rect.height,
            }}
          >
            <CardPrimitive item={item} state={state} closestEdge={null} />
          </Box>,
          state.container
        )}
    </Fragment>
  );
});
