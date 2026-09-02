# Deployment Guide: Render (Backend) + Netlify (Frontend)

---

## 1. Backend Deployment (Render)

1. Open the [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name**: `llmark-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker` (uses `backend/Dockerfile`)
   - **Health Check Path**: `/health`
4. Add the following **Environment Variables**:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `BACKEND_CORS_ORIGINS` | `*` | Allows cross-origin requests from Netlify |
   | `DATABASE_URL` | `sqlite+aiosqlite:///llmark.db` | Local async SQLite database |
   | `GROQ_API_KEY` | *(Optional)* `your_groq_api_key` | Inference Copilot AI analysis |
   | `GROQ_MODEL` | `llama-3.3-70b-versatile` | Default Groq model |
5. Click **Deploy Web Service**.
6. Once deployed, copy your backend URL:
   ```text
   https://<your-backend-name>.onrender.com
   ```

---

## 2. Frontend Deployment (Netlify)

1. Open the [Netlify Dashboard](https://app.netlify.com/) and click **Add new site** -> **Import an existing project**.
2. Connect your Git repository.
3. Netlify automatically reads [`netlify.toml`](./netlify.toml). Verify the settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Go to **Site configuration** -> **Environment variables** and add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://<your-backend-name>.onrender.com` |
   *(Do **not** include a trailing slash)*
5. Click **Deploy site**.

---

## 3. Post-Deployment Verification

1. **Check Backend Health**:
   Visit `https://<your-backend-name>.onrender.com/health` in your browser. It should return:
   ```json
   {
     "status": "healthy",
     "service": "LLMark Backend",
     "version": "0.1.0"
   }
   ```
2. **Test Frontend Connection**:
   Open your deployed Netlify URL and run an **Instant Probe** or **Benchmark** to verify live Server-Sent Events (SSE) telemetry streaming.
