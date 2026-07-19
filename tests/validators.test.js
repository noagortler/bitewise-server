import { describe, test, expect } from "vitest";
import { isValidEmail, isStrongEnoughPassword } from "../src/utils/validators.js";

describe("Validator Utils", () => {
  test("returns true for a valid email", () => {
    expect(isValidEmail("noa@example.com")).toBe(true);
  });

  test("returns false for an email with no @", () => {
    expect(isValidEmail("noaexample.com")).toBe(false);
  });

  test("returns false for an email with no domain", () => {
    expect(isValidEmail("noa@")).toBe(false);
  });

  test("returns false for a non-string email", () => {
    expect(isValidEmail(undefined)).toBe(false);
  });

  test("returns true for a password with at least 8 characters", () => {
    expect(isStrongEnoughPassword("password123")).toBe(true);
  });

  test("returns false for a short password", () => {
    expect(isStrongEnoughPassword("short")).toBe(false);
  });
});