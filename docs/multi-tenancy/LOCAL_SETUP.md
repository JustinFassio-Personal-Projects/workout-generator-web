# Local Multi-Tenant Development Setup

This guide explains how to set up local development for the multi-tenant platform with custom localhost domains.

## Overview

The multi-tenant setup requires:

- **Next.js App**: Runs on `localhost:3001` (handles marketing sites and admin)
- **Firebase App**: Runs on `localhost:3000` (separate repository - the workout application)
- **Local DNS**: Maps custom domains to localhost

## Local DNS Configuration

### Mac/Linux

1. Open your hosts file with sudo privileges:

   ```bash
   sudo nano /etc/hosts
   ```

2. Add these lines at the end of the file:

   ```
   127.0.0.1   admin.localhost
   127.0.0.1   client-a.localhost
   127.0.0.1   client-b.localhost
   ```

3. Save and exit (Ctrl+X, then Y, then Enter)

### Windows

1. Open Notepad as Administrator
   - Right-click Notepad → "Run as administrator"

2. Open the hosts file:
   - File → Open → Navigate to `C:\Windows\System32\drivers\etc\hosts`
   - Change file type filter to "All Files (_._)"

3. Add these lines at the end of the file:

   ```
   127.0.0.1   admin.localhost
   127.0.0.1   client-a.localhost
   127.0.0.1   client-b.localhost
   ```

4. Save and close

### Important Notes

- **Port is NOT in hosts file**: The port is specified in the browser URL (e.g., `http://client-a.localhost:3001`), not in the hosts file
- **Flush DNS cache**: After editing hosts file, you may need to flush DNS cache:
  - Mac/Linux: `sudo dscacheutil -flushcache` or `sudo killall -HUP mDNSResponder`
  - Windows: Open Command Prompt as Admin and run `ipconfig /flushdns`

## Running Both Applications

### Terminal 1: Next.js App (Port 3001)

```bash
cd workout-generator-web
npm run dev
```

The app will be available at:

- Main platform: `http://localhost:3001`
- Admin dashboard: `http://admin.localhost:3001`
- Tenant sites: `http://client-a.localhost:3001`, `http://client-b.localhost:3001`

### Terminal 2: Firebase App (Port 3000)

```bash
cd aiworkoutgen-app  # Your Firebase app repository
npm run dev  # or firebase emulators:start
```

The app will be available at `http://localhost:3000`

## Testing the Handshake

1. **Start both applications** (Next.js on 3001, Firebase on 3000)

2. **Visit a tenant site**:

   ```
   http://client-a.localhost:3001
   ```

3. **Verify tenant site loads**:
   - Should see "Welcome to Iron Gym" (mock data)
   - Should see "Launch Workout App" button

4. **Click "Launch Workout App"**:
   - Should redirect to `http://localhost:3000/login?tenant=client-a.localhost`
   - Firebase app should receive the tenant parameter

5. **Test admin dashboard**:

   ```
   http://admin.localhost:3001
   ```

   - Should load the admin dashboard

## Troubleshooting

### "Site Not Found" on tenant domains

- Verify hosts file entries are correct
- Check that Next.js is running on port 3001
- Verify the tenant domain matches exactly (case-insensitive)
- Clear browser cache and DNS cache

### Port conflicts

- Ensure Firebase app uses port 3000
- Ensure Next.js app uses port 3001 (configured in `package.json`)
- Check for other processes using these ports:

  ```bash
  # Mac/Linux
  lsof -i :3000
  lsof -i :3001

  # Windows
  netstat -ano | findstr :3000
  netstat -ano | findstr :3001
  ```

### DNS not resolving

- Verify hosts file syntax (no typos, correct IP)
- Flush DNS cache (see commands above)
- Restart browser or use incognito/private mode
- Verify you're accessing with port: `http://client-a.localhost:3001`

### Middleware not routing correctly

- Check browser console for errors
- Verify `middleware.ts` exists in project root
- Check Next.js dev server logs for middleware execution

## Development Workflow

1. **Make changes to Next.js app** → Auto-reloads on port 3001
2. **Make changes to Firebase app** → Auto-reloads on port 3000
3. **Test tenant sites** → Use custom localhost domains
4. **Test Firebase integration** → Click "Launch Workout App" links

## Adding More Test Tenants

To add more test tenants for development:

1. **Add to hosts file**:

   ```
   127.0.0.1   client-c.localhost
   ```

2. **Add mock data** (for tracer bullet):
   In `app/sites/[domain]/page.tsx`, add to `MOCK_TENANTS`:

   ```typescript
   'client-c.localhost': {
     name: 'PowerHouse Gym',
     primary_color: '#00ff00',
   },
   ```

3. **Or add to database** (after Phase 3):

   ```sql
   INSERT INTO tenants (domain, name, primary_color, status)
   VALUES ('client-c.localhost', 'PowerHouse Gym', '#00ff00', 'active');
   ```

4. **Access at**: `http://client-c.localhost:3001`
