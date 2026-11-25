import { cn } from "@/lib/utils";

describe("cn", () => {
  it("combines ordinary class names", () => {
    expect(cn("rounded", "shadow", "font-bold")).toBe("rounded shadow font-bold");
  });

  it("supports conditional objects and nested arrays", () => {
    expect(cn("base", { visible: true, hidden: false }, ["flex", null, ["items-center"]]))
      .toBe("base visible flex items-center");
  });

  it("drops empty, null, undefined and false inputs", () => {
    expect(cn("", null, undefined, false)).toBe("");
  });

  it("prefers the later conflicting Tailwind utility", () => {
    expect(cn("px-2", "px-6")).toBe("px-6");
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("preserves nonconflicting utilities and resolves variant conflicts", () => {
    expect(cn("p-2", "rounded-md", "p-4")).toBe("rounded-md p-4");
    expect(cn("hover:bg-red-500", "hover:bg-blue-500", "focus:bg-green-500"))
      .toBe("hover:bg-blue-500 focus:bg-green-500");
  });
});
