# ComfyUI Frontend in FRAME

This directory contains the unmodified production build from the official
ComfyUI Frontend v1.50.0 release.

- Project: ComfyUI Frontend
- Version: 1.50.0
- Source commit: `0e9265c7839c1cdaea91b81cd9b2c25db43e346d`
- Source: https://github.com/Comfy-Org/ComfyUI_frontend/tree/v1.50.0
- Release artifact: https://github.com/Comfy-Org/ComfyUI_frontend/releases/tag/v1.50.0
- License: GNU General Public License v3.0 only (`LICENSE.txt`)

FRAME does not modify the upstream frontend bundle. FRAME adds a same-origin
host page and authenticated server-side proxy outside this directory so users
can connect the official frontend to their own ComfyUI backend or Comfy Cloud
API without exposing stored secrets to the canvas.

Source maps are omitted from the hosted artifact to keep the deployment small.
The complete corresponding source is available at the exact tag and commit
listed above.
