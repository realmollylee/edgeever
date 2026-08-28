import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const FPK_DIRECTORY = resolve("apps/fnos");
export const IMAGE_REPOSITORY = "ccr.ccs.tencentyun.com/edgeever/edgeever";
const MANIFEST_PATH = "manifest";
const COMPOSE_PATH = "app/docker/docker-compose.yaml";

/**
 * 将发布 tag（vX.Y.Z）解析为应用版本号（X.Y.Z）。
 * 非法输入返回 null。
 */
export const parseFpkVersion = (tag) => {
  if (typeof tag !== "string") return null;
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag.trim());
  if (!match) return null;
  return `${match[1]}.${match[2]}.${match[3]}`;
};

/**
 * 按发布 tag 更新 fnOS FPK 源：
 * - fnos/manifest 的 version=X.Y.Z（tag 去 v 前缀）
 * - fnos/app/docker/docker-compose.yaml 的镜像 tag :vX.Y.Z（tag 原样）
 * 幂等：tag 与当前基线一致时文件内容不变。
 */
export const updateFpkVersion = async (tag, fpkDirectory = FPK_DIRECTORY) => {
  const version = parseFpkVersion(tag);
  if (!version) {
    throw new Error(`Invalid FPK release tag "${tag}"; expected vX.Y.Z`);
  }

  const manifestPath = resolve(fpkDirectory, MANIFEST_PATH);
  const composePath = resolve(fpkDirectory, COMPOSE_PATH);

  const manifest = await readFile(manifestPath, "utf8");
  if (!/^version=.*$/m.test(manifest)) {
    throw new Error(`version= not found in ${manifestPath}`);
  }
  const updatedManifest = manifest.replace(/^version=.*$/m, `version=${version}`);

  const compose = await readFile(composePath, "utf8");
  const imagePattern = new RegExp(
    `(image:\\s*${IMAGE_REPOSITORY.replaceAll(".", "\\.")}:)[^\\s"']+`,
  );
  if (!imagePattern.test(compose)) {
    throw new Error(`image reference not found in ${composePath}`);
  }
  const updatedCompose = compose.replace(imagePattern, `$1${tag}`);

  await writeFile(manifestPath, updatedManifest);
  await writeFile(composePath, updatedCompose);

  return { version, imageTag: tag, manifestPath, composePath };
};

const main = async () => {
  const tag = process.argv[2] || process.env.GITHUB_REF_NAME;
  if (!tag) {
    console.error("Usage: bun scripts/build-fpk.mjs <vX.Y.Z> [fpkDirectory]");
    process.exit(2);
  }
  try {
    const { version, imageTag } = await updateFpkVersion(tag, process.argv[3]);
    console.log(
      `FPK version updated: manifest version=${version}, image=${IMAGE_REPOSITORY}:${imageTag}`,
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

if (import.meta.main) {
  await main();
}
