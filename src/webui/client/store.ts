import { configureStore, Draft, PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import Graph from "../../compiler/graph";
import { WSEvent } from "../types";
import { enableMapSet, original } from "immer";

enableMapSet();

type MainState = {
  // server state
  graph: Graph | null,
  serverHistory: WSEvent[],
  // derived state
  visibleHistory: WSEvent[],
  // client state
  currentEventIdx: number,
  openedSubgraphs: Set<string>,
};

const initialState: MainState = {
  graph: null,
  serverHistory: [],
  visibleHistory: [],
  currentEventIdx: 0,
  openedSubgraphs: new Set()
};

function updateVisibleHistory(state: Draft<MainState>): void {
  const currEvent = state.visibleHistory[state.currentEventIdx - 1];

  state.visibleHistory = [];
  for (let i = 0; i < state.serverHistory.length; i++) {
    const ev = state.serverHistory[i];
    if (!ev.graphName || state.openedSubgraphs.has(ev.graphName)) {
      state.visibleHistory.push(ev);
    }
    if (currEvent !== undefined && original(ev) === original(currEvent)) {
      state.currentEventIdx = state.visibleHistory.length;
    }
  }
}

const mainSlice = createSlice({
  name: "main",
  initialState,
  reducers: {
    wsGraph: (state, action: PayloadAction<Graph>) => {
      state.graph = action.payload;
    },
    wsHistory: (state, action: PayloadAction<WSEvent[]>) => {
      state.serverHistory = action.payload;
      updateVisibleHistory(state);
    },
    wsEvent: (state, action: PayloadAction<WSEvent>) => {
      state.serverHistory.push(action.payload);
      updateVisibleHistory(state);
    },
    selectEventIndex: (state, action: PayloadAction<number>) => {
      state.currentEventIdx = action.payload;
    },
    openSubgraph: (state, action: PayloadAction<string>) => {
      state.openedSubgraphs.add(action.payload);
      updateVisibleHistory(state);
    },
    closeSubgraph: (state, action: PayloadAction<string>) => {
      state.openedSubgraphs.delete(action.payload);
      updateVisibleHistory(state);
    }
  },
});

const store = configureStore({
  reducer: mainSlice.reducer,
  middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false }),
});

// Action creators are generated for each case reducer function
export const { wsGraph, wsHistory, wsEvent, selectEventIndex, openSubgraph, closeSubgraph } = mainSlice.actions;

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
