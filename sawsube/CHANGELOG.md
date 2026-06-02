# Changelog

## 0.1.27

- Fix Art Institute of Chicago thumbnails under Home Assistant ingress by switching the preview proxy to a stable image-id route with upstream-friendly image request headers.

## 0.1.26

- Fix Art Institute of Chicago search thumbnails by proxying IIIF preview images through the backend so they load correctly under browser cross-origin policies.

## 0.1.25

- Add the Art Institute of Chicago as a new open-access source with artwork search and import support.

## 0.1.24

- Improve The Met search relevance by ranking broad API matches more heavily against artist names and titles.

## 0.1.23

- Fix source logos in the Home Assistant app so they resolve correctly through the ingress base path.

## 0.1.22

- Version bump.

## 0.1.21

- Clear previous source search results immediately and show a centered animated spinner while new results are loading.

## 0.1.20

- Improve The Met search result ranking so artist-name queries surface more relevant works instead of loosely matching collection items.

## 0.1.19

- Verify TV uploads actually appear in the Samsung art gallery before marking them successful, and retry the immediate display step briefly after upload.

## 0.1.18

- Add a configurable upload mode setting with `fit`, `fill`, and `stretch` processing behavior for uploaded artwork.

## 0.1.17

- Make The Met source use a gentler request pattern with explicit headers so searches are less likely to fail behind upstream protection layers.

## 0.1.16

- Add The Metropolitan Museum of Art as a source, including search, import, and library source filtering support.

## 0.1.15

- Migrate Rijksmuseum search and import to the current Data Services APIs so searches no longer fail with a 500 error.

## 0.1.14

- Remove the hard requirement for a Rijksmuseum API key and allow SAWSUBE to try Rijksmuseum requests without one.

## 0.1.13

- Add Font Awesome icons to the sidebar and common action buttons.
- Replace plain loading text with spinner-based loading components.

## 0.1.12

- Add clearer loading states to Dashboard, Library, and Settings so empty or incorrect-looking content is not shown while data is still loading.

## 0.1.11

- Add TV rename support in Settings so registered TVs can be renamed without deleting and re-adding them.

## 0.1.10

- Move theme selection into Settings with `light`, `dark`, and `auto` modes.
- Make the sidebar follow the active theme instead of always rendering dark.

## 0.1.9

- Make Samsung TV status polling fail fast for unreachable/off TVs and report them as offline instead of hanging the UI.

## 0.1.8

- Fix library and TV thumbnail image URLs so they resolve through the Home Assistant ingress path.

## 0.1.7

- Fix frontend API and WebSocket URL resolution so requests stay under the Home Assistant ingress path.

## 0.1.6

- Fix sidebar logo path using a plain relative asset URL compatible with the current TypeScript and Vite setup.

## 0.1.5

- Fix sidebar logo path without using a TypeScript image import, so Home Assistant frontend builds succeed.

## 0.1.4

- Fix sidebar logo asset path for Home Assistant ingress builds.

## 0.1.3

- Fix frontend asset URLs for Home Assistant ingress by building with a relative Vite base path.

## 0.1.2

- Fix frontend routing for Home Assistant ingress by using hash-based routing.
- Fix frontend API and WebSocket paths so they resolve through the app ingress path.

## 0.1.1

- Fix Home Assistant app startup to use configurable port defaults.
- Point Home Assistant app builds at the `aguedob/SAWSUBE` fork.
- Force a fresh Supervisor app revision for rebuilds.

## 0.1.0

- Initial Home Assistant App packaging for SAWSUBE.
- Adds a Supervisor-installable app definition, Docker build, and startup script.
