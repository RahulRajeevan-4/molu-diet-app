import { describe, it, expect, vi, afterEach } from "vitest";
import { Readable } from "node:stream";
import { extractJson, handleParseRecipeRequest, parseRecipe, MAX_RECIPE_CHARS } from "./recipeParser.js";

const env = { OPENROUTER_API_KEY: "test-key", OPENROUTER_MODEL: "test/model" };

function mockReq(method, body) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(typeof body === "string" ? body : JSON.stringify(body))]);
  req.method = method;
  req.headers = { origin: "http://localhost:5173" };
  return req;
}

function mockRes() {
  const res = { statusCode: 200, headers: {}, body: "" };
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v);
  res.end = (b) => (res.body = b);
  return res;
}

function mockOpenRouter(content, { ok = true, status = 200 } = {}) {
  const fetchMock = vi.fn(async () => ({
    ok,
    status,
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => JSON.stringify({ error: { message: content } }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("extractJson", () => {
  it("strips reasoning blocks and code fences", () => {
    expect(extractJson('<think>hmm {"x":1}</think>```json\n{"items":[]}\n```')).toBe('{"items":[]}');
    expect(extractJson('Sure! {"items":[]} done')).toBe('{"items":[]}');
  });
});

describe("parseRecipe", () => {
  it("sends the server key and model, and normalises items", async () => {
    const fetchMock = mockOpenRouter(
      '{"items":[{"name":" banana ","type":"fruit","grams":118.4},{"name":"salt","type":"spice","grams":0},{"name":""}]}'
    );
    const items = await parseRecipe({ apiKey: "k", model: "m", recipeText: "1 banana" });
    expect(items).toEqual([
      { name: "banana", type: "fruit", grams: 118 },
      { name: "salt", type: "other", grams: null },
    ]);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer k");
    expect(JSON.parse(init.body).model).toBe("m");
  });

  it("rejects missing configuration and bad input before calling OpenRouter", async () => {
    const fetchMock = mockOpenRouter("{}");
    await expect(parseRecipe({ apiKey: "", model: "m", recipeText: "x" })).rejects.toMatchObject({ status: 500 });
    await expect(parseRecipe({ apiKey: "k", model: "m", recipeText: "  " })).rejects.toMatchObject({ status: 400 });
    await expect(
      parseRecipe({ apiKey: "k", model: "m", recipeText: "a".repeat(MAX_RECIPE_CHARS + 1) })
    ).rejects.toMatchObject({ status: 413 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces OpenRouter errors", async () => {
    mockOpenRouter("Invalid model", { ok: false, status: 400 });
    await expect(parseRecipe({ apiKey: "k", model: "m", recipeText: "x" })).rejects.toThrow(/400.*Invalid model/);
  });

  it("rejects non-JSON model output", async () => {
    mockOpenRouter("I could not find any ingredients.");
    await expect(parseRecipe({ apiKey: "k", model: "m", recipeText: "x" })).rejects.toThrow(/JSON/);
  });
});

describe("handleParseRecipeRequest", () => {
  it("returns parsed items for a POST", async () => {
    mockOpenRouter('{"items":[{"name":"mango","type":"fruit","grams":200}]}');
    const res = mockRes();
    await handleParseRecipeRequest(mockReq("POST", { recipeText: "1 mango" }), res, env);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).items[0].name).toBe("mango");
  });

  it("rejects other methods and malformed bodies", async () => {
    const getRes = mockRes();
    await handleParseRecipeRequest(mockReq("GET"), getRes, env);
    expect(getRes.statusCode).toBe(405);

    const badRes = mockRes();
    await handleParseRecipeRequest(mockReq("POST", "not json"), badRes, env);
    expect(badRes.statusCode).toBe(400);
  });

  it("never includes the API key in responses", async () => {
    const res = mockRes();
    await handleParseRecipeRequest(mockReq("POST", { recipeText: "x" }), res, { OPENROUTER_MODEL: "m" });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain("test-key");
  });
});
