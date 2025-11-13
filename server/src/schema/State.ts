import { MapSchema, Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string")
  id: string = "";

  @type("string")
  name: string = "Driver";

  @type("string")
  platformId: string = "";

  @type("number")
  x: number = 0;

  @type("number")
  y: number = 0;

  @type("number")
  z: number = 0;

  @type("number")
  yaw: number = 0;

  @type("boolean")
  pressing: boolean = false;

  @type("number")
  steering: number = 0;

  @type("number")
  steeringIntensity: number = 0;

  @type("number")
  distance: number = 0;

  @type("number")
  opacity: number = 1;

  @type("boolean")
  eliminated: boolean = false;

  @type("number")
  timeAlive: number = 0;

  @type("number")
  betAmount: number = 0;

  @type("boolean")
  isWinner: boolean = false;

  @type("boolean")
  ready: boolean = false;
}

export class DriftState extends Schema {
  @type({ map: Player })
  players: MapSchema<Player> = new MapSchema<Player>();

  @type("number")
  seed: number = Date.now();

  @type("string")
  status: string = "waiting";

  @type("string")
  roomType: string = "public";

  @type("number")
  betAmount: number = 2;

  @type("string")
  inviteCode: string = "";

  @type("number")
  prizePool: number = 0;

  @type("number")
  countdown: number = 0;

  @type("string")
  winnerId: string = "";

  @type("number")
  playerCount: number = 0;

  @type("string")
  hostId: string = "";
}
