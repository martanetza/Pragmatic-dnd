import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { Card } from "./card";
import { getPeople } from "../../data";

const AllCardList = () => {
  const stableItems = useRef(getPeople({ amount: 2 }));
  const allCardListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    stableItems.current = getPeople({ amount: 2 });
  }, []);

  return (
    <div ref={allCardListRef}>
      {stableItems.current.map((item) => (
        <Card item={item} key={item.userId} />
      ))}
    </div>
  );
};

export default AllCardList;
