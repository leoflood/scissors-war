import Shape from "./entity/shape";
import Vector2D from "./vector-2d";
import Player from "./player";
import { GameMode, SINGLE_PLAYER, TWO_PLAYERS } from "./game-modes";
import Ai from "./player/ai";
import { shapeKey, shapeMap } from "./entity/shape-map";

const secondPlayerClassMap = {
  [SINGLE_PLAYER]: Ai,
  [TWO_PLAYERS]: Player,
};

export default class Game {

  shapes: Map<string, Shape> = new Map();
  players: Map<number, Player | Ai> = new Map();
  tickTime = Date.now();

  private _shapeAddedEvents: ((shape: Shape) => any)[] = [];

  constructor(
    mode: GameMode,
    player1BasePosition: Vector2D = new Vector2D(200, 200),
    player2BasePosition: Vector2D = new Vector2D(1080, 520)
  ) {
    this.players.set(1, new Player(1, player1BasePosition));
    this.players.set(2, new secondPlayerClassMap[mode](2, player2BasePosition));
  }

  onShapeAdded(callback: (shape: Shape) => any) {
    this._shapeAddedEvents.push(callback);
  }

  getPlayer(team: number) {
    const player = this.players.get(team);
    if (!player) throw new Error(`There is no player ${team}`);
    return player;
  }

  buyShape(shape: Shape) {
    const player = this.getPlayer(shape.team);

    if (player.gold - shape.gold < 0) return;
    player.subtractGold(shape.gold);
    player.updateLastTimeBought(this.tickTime);

    this.addShape(shape);
  }

  addShape(shape: Shape) {
    this.shapes.set(shape.uuid, shape);
    this._shapeAddedEvents.forEach((event) => event(shape));
  }

  createShape(shapeType: shapeKey, team: 1 | 2) {
    const ShapeClass = shapeMap[shapeType];

    const position = this.players.get(team)?.startPosition.clone();

    if (!position) throw new Error("Position is undefined");

    return new ShapeClass({ team, position });
  }

  public moveShapeTo(shape: Shape, x: number, y: number, speed?: number) {
    let speedToUse = speed ? speed : shape.speed;

    const originalMovement = shape.getMovementTo(x, y, speedToUse);
    const movement = originalMovement.clone();

    if (movement.isZero()) {
      return;
    }

    for (let otherShape of this.shapes.values()) {
      if (shape === otherShape) {
        continue;
      }

      // The player will not collide with his allies
      if (
        shape.team === otherShape.team &&
        (otherShape.shapeIgnoredByAllies ||
          shape.timeCreated < otherShape.timeCreated)
      ) {
        continue;
      }

      const isXColliding = shape.isCollidingWith(
        otherShape,
        shape.position.x + movement.x,
        shape.position.y
      );
      const isYColliding = shape.isCollidingWith(
        otherShape,
        shape.position.x,
        shape.position.y + movement.y
      );

      if (isXColliding) {
        const distanceToShape1 = shape.getDistance(
          otherShape.position.x,
          otherShape.position.y
        );
        const distanceToShape2 = shape.getDistance(
          otherShape.position.x,
          otherShape.position.y,
          movement.x,
          0
        );

        if (distanceToShape1 < distanceToShape2) {
          movement.setX(0);
        }
      }
      if (isYColliding) {
        const distanceToShape1 = shape.getDistance(
          otherShape.position.x,
          otherShape.position.y
        );
        const distanceToShape2 = shape.getDistance(
          otherShape.position.x,
          otherShape.position.y,
          0,
          movement.y
        );

        if (distanceToShape1 < distanceToShape2) {
          movement.setY(0);
        }
      }
      if (movement.isZero()) {
        shape.move(originalMovement.getOrthogonal(shape.timeCreated % 2 === 0));
        return;
      }
    }

    shape.move(movement);
  }

  public getTheCloserEnemyOf(position: Vector2D, team: number) {
    let distance = Number.POSITIVE_INFINITY;
    let closerEnemy: Shape | null = null;

    this.shapes.forEach((a) => {
      if (a.team === team || a.isDead) {
        return;
      }

      const distanceToShape = position.getDistance(a.position);

      if (distanceToShape < distance) {
        closerEnemy = a;
        distance = distanceToShape;
      }
    });

    return closerEnemy!;
  }

  public getTheCloserEnemyOfShape(shape: Shape) {
    return this.getTheCloserEnemyOf(shape.position, shape.team);
  }

  canPlayerBuy(team: number) {
    const player = this.getPlayer(team);
    return player.checkIfCanBuy(this.tickTime);
  }

  getEnemyPlayer(team: number) {
    return this.getPlayer(team === 1 ? 2 : 1);
  }

  tick() {
    this.tickTime = Date.now();

    this.shapes.forEach((a) => {
      a.think(this);
    });

    // Removes dead shapes
    this.shapes.forEach((a) => {
      if (a.isDead) {
        this.shapes.delete(a.uuid);
        a.die();
        this.getEnemyPlayer(a.team).earnGold(a.gold / 2);
      }
    });

    this.players.forEach((p) => {
      p.think(this);
      p.checkToEarnGold(this.tickTime);
    });
  }
}
