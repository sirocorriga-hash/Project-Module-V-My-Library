import { translator } from "./i18n";

describe("translator", () => {
  it("fills placeholders in both languages", () => {
    expect(translator("en")("showing", { shown: 2, total: 5 })).toBe("2 of 5 books");
    expect(translator("it")("showing", { shown: 2, total: 5 })).toBe("2 di 5 libri");
  });
  it("leaves unknown placeholders visible instead of failing", () => {
    expect(translator("en")("withBorrower")).toBe("With {name}");
  });
});
