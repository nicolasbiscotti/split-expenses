import { describe, it, expect } from "vitest";
import {
  parseCurrencyInput,
  formatForDisplay,
  formatWhileTyping,
} from "./currencyInput";

describe("parseCurrencyInput", () => {
  it("parses full es-AR format (period=thousands, comma=decimal)", () => {
    expect(parseCurrencyInput("1.500,50")).toBe(1500.5);
  });

  it("parses period as decimal separator (US habit / paste)", () => {
    expect(parseCurrencyInput("1500.50")).toBe(1500.5);
  });

  it("parses comma as decimal separator without thousands", () => {
    expect(parseCurrencyInput("1500,50")).toBe(1500.5);
  });

  it("parses whole number in es-AR format (period=thousands)", () => {
    expect(parseCurrencyInput("1.500")).toBe(1500);
  });

  it("returns NaN for empty string", () => {
    expect(parseCurrencyInput("")).toBeNaN();
  });

  it("parses zero", () => {
    expect(parseCurrencyInput("0,00")).toBe(0);
  });
});

describe("formatForDisplay", () => {
  it("formats with 2 decimal places and thousands separator", () => {
    expect(formatForDisplay(1500.5)).toBe("1.500,50");
  });

  it("formats zero as 0,00", () => {
    expect(formatForDisplay(0)).toBe("0,00");
  });

  it("formats whole number with trailing zeros", () => {
    expect(formatForDisplay(1500)).toBe("1.500,00");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatForDisplay(1500.509)).toBe("1.500,51");
  });
});

describe("formatWhileTyping", () => {
  it("adds thousands separator to integer", () => {
    expect(formatWhileTyping("1500")).toBe("1.500");
  });

  it("preserves trailing decimal separator", () => {
    expect(formatWhileTyping("1500,")).toBe("1.500,");
  });

  it("preserves one decimal digit in progress", () => {
    expect(formatWhileTyping("1500,5")).toBe("1.500,5");
  });

  it("caps decimal part at 2 digits", () => {
    expect(formatWhileTyping("1500,509")).toBe("1.500,50");
  });

  it("handles a previously formatted value with new digit appended", () => {
    // Field showed "1.500", user typed "0" → raw "1.5000"
    expect(formatWhileTyping("1.5000")).toBe("15.000");
  });

  it("converts trailing period to decimal separator", () => {
    // Field showed "1.500", user typed "." intending decimal → raw "1.500."
    expect(formatWhileTyping("1.500.")).toBe("1.500,");
  });

  it("returns empty string for empty input", () => {
    expect(formatWhileTyping("")).toBe("");
  });
});
