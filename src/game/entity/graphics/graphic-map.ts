import { BASE, PAPER, ROCK, SCISSORS } from "../../shape-types";
import GrCircle from "./circle";
import GrSprite from "./sprite";

export const graphicMap = {
  [ROCK]: GrSprite,
  [PAPER]: GrSprite,
  [SCISSORS]: GrSprite,
  [BASE]: GrCircle,
};

export type graphicKey = keyof typeof graphicMap;