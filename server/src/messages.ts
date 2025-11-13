export const MESSAGE = {
  INPUT: "input",
  NAME: "name",
  START_MATCH: "start_match",
  POSITION: "position",
  POSITION_UPDATE: "position_update",
  LOBBY_INFO: "lobby_info",
  PLAYER_READY: "player_ready"
} as const;

export type MessageType = (typeof MESSAGE)[keyof typeof MESSAGE];

export interface InputPayload {
  pressing: boolean;
  steering?: number;
  intensity?: number;
}

export interface NamePayload {
  name: string;
}

export interface StartMatchPayload {
  force?: boolean;
}

export interface PositionPayload {
  x: number;
  y: number;
  z: number;
  yaw: number;
  distance: number;
  eliminated: boolean;
}

export interface PlayerReadyPayload {
  ready: boolean;
}
