import { expect, test } from "bun:test";
import { ranks, resultCopy } from "./net";

test("result copy: single winner, small tie, big tie, nobody", () => {
  expect(resultCopy(["Mira"], "target")).toEqual(["Mira wins", "Reached the target first."]);
  expect(resultCopy(["Mira", "Jun"], "host")).toEqual(["Mira & Jun win", "The host ended the game with a tie at the top."]);
  expect(resultCopy(["A", "B", "C", "D"], "host")[0]).toBe("4-way tie");
  expect(resultCopy([], "host")).toEqual(["Nobody wins", "The host ended the game, so the leader wins."]);
});

test("ranks: ties share a rank", () => {
  expect(ranks([600, 600, 450, 0])).toEqual([1, 1, 3, 4]);
  expect(ranks([0, 0, 0])).toEqual([1, 1, 1]);
});
