import { describe, expect, it } from "vitest";
import { hasCapability, validatedCustomerReturnPath } from "./index";
describe("auth contracts", () => {
  it("accepts only internal customer booking returns", () => {
    expect(validatedCustomerReturnPath("/book/sohokakiWellnessCenter?step=time")).toBe("/book/sohokakiWellnessCenter?step=time");
    expect(validatedCustomerReturnPath("https://evil.example/book/x")).toBe("/");
    expect(validatedCustomerReturnPath("/admin/dashboard")).toBe("/");
    expect(validatedCustomerReturnPath("javascript:alert(1)")).toBe("/");
  });
  it("keeps account security away from manager and cashier", () => {
    expect(hasCapability("owner", "accounts.invite")).toBe(true);
    expect(hasCapability("admin", "accounts.invite")).toBe(true);
    expect(hasCapability("manager", "accounts.invite")).toBe(false);
    expect(hasCapability("cashier", "accounts.change_role")).toBe(false);
  });
});
