import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { cleanItems, handleNotFoundRequest, mergeLog, nameKey, recordNotFound } from "./notFoundLog.js";


function mockReq(method, body) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  req.method = method;
  req.headers = {};
  return req;
}
function mockRes() {
  const res = { statusCode: 200, headers: {}, body: "" };
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v);
  res.end = (b) => (res.body = b);
  return res;
}

describe("nameKey / cleanItems", () => {
  it("merges case, spacing and simple plurals", () => {
    expect(nameKey(" Dragon  Fruits ")).toBe(nameKey("dragon fruit"));
    expect(nameKey("Berries")).toBe(nameKey("berry"));
    expect(nameKey("grass")).toBe("grass");
  });

  it("keeps every named item and normalises unknown types to other", () => {
    const items = cleanItems([
      { name: " Durian ", type: "fruit" },
      { name: "oil", type: "other" },
      { name: "", type: "vegetable" },
      { name: 3, type: "fruit" },
      { name: "kohlrabi   greens", type: "vegetable" },
      { name: "asafoetida", type: "spice" },
    ]);
    expect(items).toEqual([
      { name: "Durian", type: "fruit" },
      { name: "oil", type: "other" },
      { name: "kohlrabi greens", type: "vegetable" },
      { name: "asafoetida", type: "other" },
    ]);
  });

  it("rejects oversized or malformed lists", () => {
    expect(() => cleanItems("durian")).toThrow(/list/);
    expect(() => cleanItems(Array.from({ length: 51 }, () => ({ name: "x", type: "fruit" })))).toThrow(/50/);
  });
});

describe("mergeLog", () => {
  it("stores only name and times_seen, most frequent first", () => {
    let log = mergeLog(null, [{ name: "Durian", type: "fruit" }, { name: "salt", type: "other" }]);
    log = mergeLog(log, [{ name: "salt", type: "other" }, { name: "Salt", type: "other" }]);
    expect(log).toEqual([
      { name: "salt", times_seen: 3 },
      { name: "durian", times_seen: 1 },
    ]);
  });

  it("merges plural and spacing variants into one name", () => {
    expect(mergeLog(null, [{ name: "mustard seeds" }, { name: "Mustard  seed" }])).toEqual([
      { name: "mustard seeds", times_seen: 2 },
    ]);
  });

  it("converts the older { items: [...] } format, combining counts by name", () => {
    const old = {
      description: "…",
      updated_at: "2026-09-25T06:45:30.872Z",
      items: [
        { name: "jackfruit", type: "fruit", times_seen: 2, first_seen: "x", last_seen: "y" },
        { name: "jackfruit", type: "vegetable", times_seen: 1, first_seen: "x", last_seen: "y" },
        { name: "oat", type: "other", times_seen: 1 },
      ],
    };
    expect(mergeLog(old, [{ name: "oat" }])).toEqual([
      { name: "jackfruit", times_seen: 3 },
      { name: "oat", times_seen: 2 },
    ]);
  });
});

describe("recordNotFound (file on disk)", () => {
  let dir;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "notfound-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const file = () => path.join(dir, "notfound.json");
  const read = async () => JSON.parse(await readFile(file(), "utf8"));

  it("writes a plain list of { name, times_seen } and reports counts by type", async () => {
    const counts = await recordNotFound(dir, [
      { name: "durian", type: "fruit" },
      { name: "kovakkai", type: "vegetable" },
      { name: "mustard seed", type: "other" },
    ]);
    expect(counts).toEqual({ fruit: 1, vegetable: 1, other: 1 });
    expect(await readdir(dir)).toEqual(["notfound.json"]);
    const log = await read();
    expect(Array.isArray(log)).toBe(true);
    for (const entry of log) expect(Object.keys(entry).sort()).toEqual(["name", "times_seen"]);
  });

  it("treats an empty file as an empty list", async () => {
    await writeFile(file(), "");
    await recordNotFound(dir, [{ name: "salt", type: "other" }]);
    expect(await readdir(dir)).toEqual(["notfound.json"]);
    expect(await read()).toEqual([{ name: "salt", times_seen: 1 }]);
  });

  it("doesn't create the file when there's nothing to record", async () => {
    await recordNotFound(dir, []);
    expect(await readdir(dir)).toEqual([]);
  });

  it("keeps every update when requests arrive together", async () => {
    await Promise.all(Array.from({ length: 10 }, () => recordNotFound(dir, [{ name: "durian", type: "fruit" }])));
    expect(await read()).toEqual([{ name: "durian", times_seen: 10 }]);
  });

  it("sets aside a file with broken JSON instead of overwriting it", async () => {
    await writeFile(file(), "{ not json");
    await recordNotFound(dir, [{ name: "durian", type: "fruit" }]);
    const files = await readdir(dir);
    expect(files.some((f) => f.startsWith("notfound.json.corrupt-"))).toBe(true);
    expect(await read()).toEqual([{ name: "durian", times_seen: 1 }]);
  });
});

describe("handleNotFoundRequest", () => {
  it("records nothing where files can't be written (Vercel)", async () => {
    const res = mockRes();
    await handleNotFoundRequest(mockReq("POST", { items: [{ name: "durian", type: "fruit" }] }), res, { dir: null });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).recorded).toBe(false);
  });

  it("rejects non-POST and bad bodies", async () => {
    const get = mockRes();
    await handleNotFoundRequest(mockReq("GET"), get, { dir: null });
    expect(get.statusCode).toBe(405);
    const bad = mockRes();
    await handleNotFoundRequest(mockReq("POST", { items: "durian" }), bad, { dir: null });
    expect(bad.statusCode).toBe(400);
  });
});
