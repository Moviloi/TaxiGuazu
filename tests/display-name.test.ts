import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPlaceDisplayName } from "@/lib/ai/display-name";

vi.mock("@/lib/db/core/helpers", () => ({
  queryOne: vi.fn(),
}));

import { queryOne } from "@/lib/db/core/helpers";
const mockQueryOne = queryOne as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockQueryOne.mockReset();
});

describe("getPlaceDisplayName", () => {
  it("returns official_name when shorter than canonical_name", async () => {
    mockQueryOne.mockResolvedValue({
      official_name: "Aeropuerto Cataratas (IGR)",
    });
    const result = await getPlaceDisplayName("Aeropuerto Internacional Cataratas del Iguazú");
    expect(result.displayName).toBe("Aeropuerto Cataratas (IGR)");
    expect(result.source).toBe("official_name");
  });

  it("returns canonical_name when official_name is empty", async () => {
    mockQueryOne.mockResolvedValue({
      official_name: "",
    });
    const result = await getPlaceDisplayName("Puerto Iguazú Centro");
    expect(result.displayName).toBe("Puerto Iguazú Centro");
    expect(result.source).toBe("canonical_name");
  });

  it("returns canonical_name when official_name equals canonical_name", async () => {
    mockQueryOne.mockResolvedValue({
      official_name: "Hotel Gran Meliá Iguazú",
    });
    const result = await getPlaceDisplayName("Hotel Gran Meliá Iguazú");
    expect(result.displayName).toBe("Hotel Gran Meliá Iguazú");
    expect(result.source).toBe("canonical_name");
  });

  it("returns canonical_name when official_name is longer", async () => {
    mockQueryOne.mockResolvedValue({
      official_name: "Hotel Gran Meliá Iguazú (5 estrellas, lujo, piscina)",
    });
    const result = await getPlaceDisplayName("Hotel Gran Meliá Iguazú");
    expect(result.displayName).toBe("Hotel Gran Meliá Iguazú");
    expect(result.source).toBe("canonical_name");
  });

  it("returns canonical_name when place not found in DB", async () => {
    mockQueryOne.mockResolvedValue(null);
    const result = await getPlaceDisplayName("Lugar Desconocido");
    expect(result.displayName).toBe("Lugar Desconocido");
    expect(result.source).toBe("canonical_name");
  });

  it("returns canonical_name when canonicalName is empty", async () => {
    const result = await getPlaceDisplayName("");
    expect(result.displayName).toBe("");
    expect(result.source).toBe("canonical_name");
  });

  it("queries with LOWER match and active_status filter", async () => {
    mockQueryOne.mockResolvedValue({
      official_name: "Terminal Ómnibus",
    });
    await getPlaceDisplayName("TERMINAL DE ÓMNIBUS");
    expect(mockQueryOne).toHaveBeenCalledWith(
      expect.stringContaining("LOWER(canonical_name) = LOWER(?)"),
      ["TERMINAL DE ÓMNIBUS"],
    );
  });
});
