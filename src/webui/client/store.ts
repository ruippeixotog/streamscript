import { configureStore, Draft, PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import Graph from "../../compiler/graph";
import { EDGE_TYPES, NODE_TYPES, WSEvent, WSEventEdgeType, WSEventNodeType } from "../types";
import { enableMapSet, original } from "immer";

enableMapSet();

type MainState = {
  // server state
  graph: Graph | null,
  serverHistory: WSEvent[],
  // client state
  currentEventIdx: number,
  visibleEventTypes: Set<WSEventNodeType | WSEventEdgeType>,
  openedSubgraphs: Set<string>,
  // derived state
  visibleHistory: WSEvent[],
  visibleToServerMapping: number[],
  visibleEventIdx: number
};

const initialState: MainState = {
  graph: null,
  serverHistory: [],
  currentEventIdx: 0,
  visibleEventTypes: new Set([...NODE_TYPES, ...EDGE_TYPES]),
  openedSubgraphs: new Set(),
  visibleHistory: [],
  visibleToServerMapping: [],
  visibleEventIdx: 0
};

function updateVisibleHistory(state: Draft<MainState>): void {
  const currEvent = state.visibleHistory[state.visibleEventIdx - 1];

  state.visibleHistory = [];
  state.visibleToServerMapping = [0];
  for (let i = 0; i < state.serverHistory.length; i++) {
    const ev = state.serverHistory[i];

    const isSubgraphShown = !ev.graphName || state.openedSubgraphs.has(ev.graphName);
    const isEventTypeShown = state.visibleEventTypes.has(ev.event);

    if (isSubgraphShown && isEventTypeShown) {
      state.visibleHistory.push(ev);
      state.visibleToServerMapping.push(i + 1);
    }
    if (currEvent !== undefined && original(ev) === original(currEvent)) {
      state.visibleEventIdx = state.visibleHistory.length;
      state.currentEventIdx = state.visibleToServerMapping[state.visibleEventIdx];
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
      state.visibleEventIdx = action.payload;
      state.currentEventIdx = state.visibleToServerMapping[action.payload];
    },
    showEventType: (state, action: PayloadAction<WSEventNodeType | WSEventEdgeType>) => {
      state.visibleEventTypes.add(action.payload);
      updateVisibleHistory(state);
    },
    hideEventType: (state, action: PayloadAction<WSEventNodeType | WSEventEdgeType>) => {
      state.visibleEventTypes.delete(action.payload);
      updateVisibleHistory(state);
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
export const { wsGraph, wsHistory, wsEvent, selectEventIndex, showEventType, hideEventType, openSubgraph, closeSubgraph } = mainSlice.actions;

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
