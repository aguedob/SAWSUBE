# Changelog

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
