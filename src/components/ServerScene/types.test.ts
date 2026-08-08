import { describe, expect, it } from "vitest";

import { capQuality } from "./types";

describe("capQuality", () => {
  it("returns requested when cap is null", () => {
    expect(capQuality("high", null)).toBe("high");
  });

  it("caps high to medium", () => {
    expect(capQuality("high", "medium")).toBe("medium");
  });

  it("caps medium to low", () => {
    expect(capQuality("medium", "low")).toBe("low");
  });

  it("does not increase quality", () => {
    expect(capQuality("low", "high")).toBe("low");
  });
});
