# SAWSUBE

## What this app does

SAWSUBE provides a local web UI for Samsung Frame TVs:

- upload and rotate artwork
- discover TVs on the local network
- control Art Mode settings
- browse external artwork sources
- manage optional TizenBrew workflows

## Important limitations

- Samsung TV discovery and Wake-on-LAN work best with `host_network`, which this app enables.
- The TizenBrew and debloat features may require extra binaries, certificates, and local source trees that are not bundled in this first Home Assistant App package.
- This package focuses on the core SAWSUBE art-management experience first.

## Installation

1. Add this repository to Home Assistant Apps.
2. Install the `SAWSUBE` app.
3. Review the options and adjust the app port, image folder, or API keys if needed.
4. Start the app and open the web UI from the app page.

## Startup troubleshooting

If the app fails with `address already in use`, another service on the Home Assistant host is already using the selected port.

Try this:

1. Open the app configuration.
2. Change `app_port` from `8099` to another free port such as `8100`.
3. Save and restart the app.

The first Home Assistant App package used `8000` by default. This package now defaults to `8099` to reduce collisions on systems that already use `8000`.

### Local build vs published image

By default, Home Assistant can build this app directly from the repository contents.

If you enable CI and publish the image to GHCR, add the `image:` field in `config.yaml` so Home Assistant pulls the prebuilt container instead. That gives faster installs and more predictable updates.

## Default storage paths

- Database: `/data/sawsube.db`
- Tokens: `/data/tokens`
- Cache: `/data/cache`
- Thumbnails: `/data/thumbnails`
- Images: `/data/images`

If you want SAWSUBE to watch a shared folder from Home Assistant, set `image_folder` to a path under `/share`, for example `/share/sawsube/images`.
