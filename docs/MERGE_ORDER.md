# v1.7 merge order

1. Snapshot current production deployment and preserve rollback.
2. Merge `public/manifest.webmanifest`, icons and `public/sw.js`.
3. Add an Install button wired to `src/install/pwa-install.js`.
4. Add `FastCommandBus` and keep current `/api/proxy?op=chief` as compatibility backend.
5. Add `XiaozhiVoiceFabric`; mount one global floating controller shared by all screens.
6. Deploy `api/health-v17.ts`.
7. Deploy `api/ws-xiaozhi.ts` only after `XIAOZHI_WS_URL` is configured server-side.
8. Replace all use of legacy `url.parse()` in `/api/proxy` with `new URL()` / WHATWG URL API.
9. Verify desktop Chrome + Android: install prompt, standalone mode, offline shell, update.
10. Only after PWA/voice release is stable, begin ADK + Google Workspace + Drive multi-format pipeline.

Do not run the Supabase SQL unless a dedicated A.I Văn phòng project is available or explicitly authorized.
