# A.I Văn phòng v1.7 Upgrade Kit

This is a deploy/merge kit for the current v1.6 production. It intentionally does **not** overwrite the approved dashboard.

Includes:
- Corrected installable PWA manifest
- 192/512/maskable icons
- Versioned service worker
- Chrome install controller
- Fast command/offline queue layer
- Global XiaoZhi Voice Fabric client
- Vercel WebSocket XiaoZhi bridge
- v1.7 health endpoint
- Optional namespaced Supabase migration
- Open-source stack and merge order

Important: the XiaoZhi WebSocket bridge is not considered connected until a private/self-hosted `XIAOZHI_WS_URL` is configured and an end-to-end voice test passes.
