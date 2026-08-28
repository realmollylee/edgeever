import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parseFpkVersion, updateFpkVersion } from "./build-fpk.mjs";

const createFakeFnos = () => {
  const dir = mkdtempSync(join(tmpdir(), "fnos-fpk-test-"));
  mkdirSync(join(dir, "app", "docker"), { recursive: true });
  writeFileSync(
    join(dir, "manifest"),
    "appname=edgeever\nversion=1.45.1\ndisplay_name=EdgeEver\n",
  );
  writeFileSync(
    join(dir, "app", "docker", "docker-compose.yaml"),
    [
      "services:",
      "  edgeever:",
      "    image: ccr.ccs.tencentyun.com/edgeever/edgeever:v1.45.1",
      "    container_name: edgeever",
      "",
    ].join("\n"),
  );
  return dir;
};

test("parseFpkVersion accepts vX.Y.Z and strips the v prefix", () => {
  expect(parseFpkVersion("v1.45.1")).toBe("1.45.1");
  expect(parseFpkVersion("v0.0.1")).toBe("0.0.1");
  expect(parseFpkVersion("  v1.2.3  ")).toBe("1.2.3");
});

test("parseFpkVersion rejects malformed tags", () => {
  expect(parseFpkVersion("1.2.3")).toBeNull();
  expect(parseFpkVersion("v1.2")).toBeNull();
  expect(parseFpkVersion("v1.2.3.4")).toBeNull();
  expect(parseFpkVersion("latest")).toBeNull();
  expect(parseFpkVersion("")).toBeNull();
  expect(parseFpkVersion(undefined)).toBeNull();
});

test("updateFpkVersion rewrites manifest version and compose image tag", async () => {
  const dir = createFakeFnos();
  try {
    const result = await updateFpkVersion("v1.46.0", dir);
    expect(result.version).toBe("1.46.0");
    expect(result.imageTag).toBe("v1.46.0");

    const manifest = readFileSync(join(dir, "manifest"), "utf8");
    expect(manifest).toContain("version=1.46.0");
    expect(manifest).not.toContain("version=1.45.1");
    expect(manifest).toContain("display_name=EdgeEver");

    const compose = readFileSync(join(dir, "app", "docker", "docker-compose.yaml"), "utf8");
    expect(compose).toContain("image: ccr.ccs.tencentyun.com/edgeever/edgeever:v1.46.0");
    expect(compose).not.toContain(":v1.45.1");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("updateFpkVersion is idempotent when the tag matches the baseline", async () => {
  const dir = createFakeFnos();
  try {
    const before = readFileSync(join(dir, "manifest"), "utf8");
    await updateFpkVersion("v1.45.1", dir);
    const after = readFileSync(join(dir, "manifest"), "utf8");
    expect(after).toBe(before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("updateFpkVersion rejects invalid tags", async () => {
  const dir = createFakeFnos();
  try {
    await expect(updateFpkVersion("latest", dir)).rejects.toThrow(/Invalid FPK release tag/);
    await expect(updateFpkVersion("v1.2", dir)).rejects.toThrow(/Invalid FPK release tag/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI exits non-zero when no tag is provided", () => {
  const result = spawnSync("bun", [resolve(import.meta.dir, "build-fpk.mjs")], {
    encoding: "utf8",
    env: { ...process.env, GITHUB_REF_NAME: "" },
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Usage:");
});
