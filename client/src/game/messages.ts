export const MESSAGE = {
  INPUT: "input",
  NAME: "name",
  START_MATCH: "start_match",
  POSITION: "position",
  POSITION_UPDATE: "position_update",
  LOBBY_INFO: "lobby_info",
  PLAYER_READY: "player_ready"
} as const;

export type MessageKey = keyof typeof MESSAGE;
