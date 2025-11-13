# Admin Panel Deployment

1. **Build frontend bundle**
   ```bash
   cd client
   npm install
   npm run build
   ```
   The build artefacts will be generated inside `client/dist`. Upload the contents of that folder to `/var/www/admin.driftcash.com` (or adjust the Nginx `root` path in `deploy/nginx/admin.driftcash.conf`).

2. **Configure environment**
   - `client/.env` is set for the admin domain with:
     ```
     VITE_API_URL=
     VITE_WS_URL=wss://admin.driftcash.com/ws
     ```
     Leaving `VITE_API_URL` empty makes the SPA call `/api/*` on the same host (handled by the reverse proxy).
   - Ensure the backend `.env` contains:
     ```
     ADMIN_PANEL_HOSTS=admin.driftcash.com
     CLIENT_APP_HOSTS=driftcash.com,www.driftcash.com
     JWT_SECRET=<strong-random-secret>
     ```

3. **Nginx**
   - Copy `deploy/nginx/admin.driftcash.conf` to your server (e.g. `/etc/nginx/sites-available/admin.driftcash.conf`).
   - Adjust certificate paths and document root as needed.
   - Symlink into `sites-enabled`, run `nginx -t`, and reload with `systemctl reload nginx`.

4. **Backend**
   - The Node server must listen on port `2567` (default). Restart the service after updating environment variables to pick up the new domain restrictions and JWT secret.

5. **Smoke tests**
   - Visit `https://admin.driftcash.com` and log in with an admin user.
   - Verify `/api/users/login` responds with JSON (use browser devtools / `curl`).
   - Confirm non-admin accounts are rejected on the admin domain (HTTP 403) and admin accounts cannot log in through the public client domain.
