import React from "react";
import { selectEventIndex } from "./store";
import { useAppDispatch, useAppSelector } from "./hooks";

export default function Slider(): JSX.Element {
  const visibleHistory = useAppSelector(state => state.visibleHistory);
  const currentEventIdx = useAppSelector(state => state.currentEventIdx);
  const dispatch = useAppDispatch();

  return (
    <div className="slidecontainer">
      <input
        type="range"
        min="1"
        max={visibleHistory.length + 1}
        value={currentEventIdx + 1}
        className="slider"
        id="history"
        onChange={ev => dispatch(selectEventIndex(parseInt(ev.target.value) - 1))}
      />
    </div>
  );
}
