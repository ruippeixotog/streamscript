import React from "react";
import { EDGE_TYPES, NODE_TYPES } from "../types";
import { useAppDispatch, useAppSelector } from "./hooks";
import { hideEventType, showEventType } from "./store";

export default function EventTypeFilters(): JSX.Element {
  const visibleEventTypes = useAppSelector(state => state.visibleEventTypes);
  const dispatch = useAppDispatch();

  return (
    <div id="event-type-filters">
      {[...NODE_TYPES, ...EDGE_TYPES].map(type => (
        <label key={type}>
          {type}
          <input
            type="checkbox"
            checked={visibleEventTypes.has(type)}
            onChange={ev =>
              dispatch(ev.target.checked ? showEventType(type) : hideEventType(type))
            }
          />
        </label>
      ))}
    </div>
  );
}
