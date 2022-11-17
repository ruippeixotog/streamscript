import React from "react";
import EventText from "./EventText";
import EventSlider from "./EventSlider";
import EventTypeFilters from "./EventTypeFilters";

export default function EventControls(): JSX.Element {
  return (
    <>
      <EventSlider />
      <EventText />
      <EventTypeFilters />
    </>
  );
}
