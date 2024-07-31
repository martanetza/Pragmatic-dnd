import React, { forwardRef, memo, type ReactNode, useEffect } from "react";

import { autoScrollWindowForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { Box, xcss } from "@atlaskit/primitives";

import { useBoardContext } from "./board-context";

type BoardProps = {
  children: ReactNode;
};

const boardStyles = xcss({
  display: "flex",
  justifyContent: "space-around",
  gap: "space.200",
  flexDirection: "row",
  height: "100vh",
  background: "lightgrey",
  width: "100%",
  overflow: "auto",
});

// eslint-disable-next-line react/display-name
const Board = forwardRef<HTMLDivElement, BoardProps>(
  ({ children }: BoardProps, ref) => {
    const { instanceId } = useBoardContext();

    useEffect(() => {
      return autoScrollWindowForElements({
        canScroll: ({ source }) => source.data.instanceId === instanceId,
      });
    }, [instanceId]);

    return (
      <Box xcss={boardStyles} ref={ref}>
        {children}
      </Box>
    );
  }
);

export default memo(Board);
