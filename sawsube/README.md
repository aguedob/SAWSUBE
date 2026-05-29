# SAWSUBE for Home Assistant

This folder packages SAWSUBE as a Home Assistant App repository entry.

The app builds SAWSUBE from the upstream Git repository and runs the existing FastAPI + React stack inside Home Assistant Supervisor.

For local Home Assistant builds, the app can be installed directly from the repository.

For registry-backed installs, publish an image from this folder and add the resulting `image:` value to `config.yaml`.
