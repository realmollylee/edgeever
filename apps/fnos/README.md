# EdgeEver fnOS Application (FPK)

EdgeEver's fnOS app center package source (under `apps/fnos/`). The app runs
via Docker, using the image:

```
ccr.ccs.tencentyun.com/edgeever/edgeever:v1.45.1
```

The image tag stays in sync with the GitHub Release tag (vX.Y.Z) and is
updated automatically by CI (`scripts/build-fpk.mjs` rewrites the `version`
in `manifest` and the image tag in the compose file from the release tag;
the checked-in baseline tracks the latest released version).

## Directory layout

```
fnos/
├── manifest                 # App metadata (version updated by CI from the tag)
├── ICON.PNG / ICON_256.PNG  # App icons 64x64 / 256x256
├── config/
│   ├── privilege            # Runtime privilege (run-as=package)
│   └── resource             # docker-project + data-share(edgeever/data)
├── app/
│   ├── docker/docker-compose.yaml   # Container orchestration (image tag updated by CI)
│   └── ui/                  # Desktop entry config + icons
├── cmd/                     # Lifecycle scripts (main/install/upgrade/uninstall/config)
└── wizard/                  # Install / upgrade / uninstall wizards
```

## Building locally

```bash
# 1. Update versions from the release tag (manifest version + image tag)
bun scripts/build-fpk.mjs v1.45.1

# 2. Build the package (install fnpack first, see
#    https://developer.fnnas.com/docs/cli/fnpack/)
cd apps/fnos && fnpack build
# Outputs apps/fnos/edgeever.fpk; rename it with the version, e.g. edgeever-v1.45.1.fpk
```

## Automated build (CI)

`.github/workflows/fpk-build.yml` runs on `release: published`:

1. Resolve the release tag (v1.45.1 → manifest `version=1.45.1`)
2. Sync the compose image tag to the same tag
   (ccr.ccs.tencentyun.com/edgeever/edgeever:v1.45.1)
3. Download fnpack and run `fnpack build` (in `apps/fnos`)
4. Extract the FPK and verify the packaged version matches the release tag
   (build fails on mismatch)
5. Rename to `edgever-...` — see below — and attach to the release

The workflow also supports `workflow_dispatch` with a required `release_tag`
input, and is guarded to the official repository per AGENTS.md.

## Install and data

- Install `edgeever.fpk` from the app center (local install), set the admin
  account, and open it.
- Data lives in the shared directory `/volx/@appshare/edgeever/data`, visible
  in the fnOS web file manager for direct viewing and backups.
- Upgrades keep data and account configuration; no re-configuration needed.
- Uninstall offers a choice to keep or delete the data.

> Note: the TCR image is synced asynchronously by `docker-tcr-mirror.yml`
> after a release is published. If image pull fails right after a release,
> retry later.
