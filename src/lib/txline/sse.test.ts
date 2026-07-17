import { expect, it } from "vitest";
import { parseSseBlock } from "./sse";

it("preserves event ID and score sequence", () => {
  const message = parseSseBlock(
    'id: score-9\nevent: score\ndata: {"fixtureId":42,"seq":880}\n',
  );
  expect(message?.id).toBe("score-9");
  expect(JSON.parse(message!.data).seq).toBe(880);
});

it("joins multiline data and ignores heartbeat comments", () => {
  expect(parseSseBlock(": heartbeat\n")).toBeNull();
  expect(parseSseBlock("data: one\ndata: two\n")?.data).toBe("one\ntwo");
});
