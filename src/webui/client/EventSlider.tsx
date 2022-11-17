import React from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { selectEventIndex } from "./store";

export default function EventSlider(): JSX.Element {
  const visibleHistory = useAppSelector(state => state.visibleHistory);
  const visibleEventIdx = useAppSelector(state => state.visibleEventIdx);
  const dispatch = useAppDispatch();

  return (
    <div className="slidecontainer">
      <input
        type="range"
        min="1"
        max={visibleHistory.length + 1}
        value={visibleEventIdx + 1}
        className="slider"
        id="history"
        onChange={ev => dispatch(selectEventIndex(ev.target.valueAsNumber - 1))}
      />
    </div>
  );
}
