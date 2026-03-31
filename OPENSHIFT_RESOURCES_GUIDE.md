# OpenShift Resources Guide (How Your Manifests Should Look)

This guide gives a clean reference for the OpenShift resources for FlowViz.

It matches your current app behavior:
- Frontend container listens on `8080`
- Backend container listens on `3001`
- Frontend API target is runtime-configurable via OpenShift env vars (`VITE_API_URL`, `VITE_AUTH_API_URL`)

## 1) Recommended resource layout

Create files like this:

```text
openshift/
  namespace.yaml
  backend-secret.yaml
  backend-configmap.yaml
  backend-deployment.yaml
  backend-service.yaml
  backend-route.yaml
  frontend-configmap.yaml
  frontend-deployment.yaml
  frontend-service.yaml
  frontend-route.yaml
```

Apply all:

```bash
oc apply -f openshift/
```

---

## 2) Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: flowviz
```

---

## 3) Backend Secret

Put sensitive values here.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: flowviz-backend-secret
  namespace: flowviz
type: Opaque
stringData:
  OPENAI_API_KEY: "<openai-key>"
  CONFLUENCE_URL: "https://<tenant>.atlassian.net"
  REDIS_HOST: "<redis-host>"
  REDIS_PORT: "6379"
  REDIS_USERNAME: "<redis-username>"
  REDIS_PASSWORD: "<redis-password>"
```

---

## 4) Backend ConfigMap

Put non-secret runtime configuration here.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flowviz-backend-config
  namespace: flowviz
data:
  NODE_ENV: "production"
  PORT: "3001"
  CORS_ORIGINS: "https://frontend-flowviz.apps.<cluster-domain>"
  FRONTEND_URL: "https://frontend-flowviz.apps.<cluster-domain>"
  OPENAI_BASE_URL: "https://api.openai.com/v1"
  SESSION_TTL_SECONDS: "3600"
  SESSION_COOKIE_NAME: "session_id"
  SESSION_COOKIE_SAME_SITE: "lax"
  SESSION_COOKIE_SECURE: "true"
  REDIS_START_COMMAND_HINT: "redis-server"
  REDIS_CONNECT_TIMEOUT: "30000"
  RATE_LIMIT_WINDOW_MS: "60000"
  RATE_LIMIT_MAX_REQUESTS: "50"
  REQUEST_BODY_SIZE_LIMIT: "50kb"
```

---

## 5) Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: flowviz
  labels:
    app: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: quay.io/<org>/flowviz-backend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 3001
              protocol: TCP
          envFrom:
            - configMapRef:
                name: flowviz-backend-config
            - secretRef:
                name: flowviz-backend-secret
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 20
            periodSeconds: 20
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
```

---

## 6) Backend Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: flowviz
  labels:
    app: backend
spec:
  selector:
    app: backend
  ports:
    - name: http
      port: 3001
      targetPort: 3001
      protocol: TCP
```

---

## 7) Backend Route (optional external API)

Create this only if you need direct external access to backend.

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: backend
  namespace: flowviz
spec:
  to:
    kind: Service
    name: backend
  port:
    targetPort: http
  tls:
    termination: edge
```

---

## 8) Frontend Deployment

Important: frontend must expose `8080` (not `80`).
This image reads API URLs from runtime env vars on container startup (`/env.js`), so changing these does not require a rebuild.

## 8.1 Frontend ConfigMap (runtime API target)

Use one of these two patterns:

- Same-route proxy through frontend (`/api`):
  - `VITE_API_URL=/api`
  - `VITE_AUTH_API_URL=/api`
- Separate backend route host:
  - `VITE_API_URL=https://backend-flowviz.apps.<cluster-domain>`
  - `VITE_AUTH_API_URL=https://backend-flowviz.apps.<cluster-domain>`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flowviz-frontend-config
  namespace: flowviz
data:
  VITE_API_URL: "https://backend-flowviz.apps.<cluster-domain>"
  VITE_AUTH_API_URL: "https://backend-flowviz.apps.<cluster-domain>"
  VITE_CONFLUENCE_SPACE: "MFS"
  VITE_FILE_CONTENT_MIN_LENGTH: "20"
  VITE_FILE_CONTENT_MAX_LENGTH: "5000"
  VITE_ALLOW_INSECURE_HOSTS: "localhost,127.0.0.1"
```

When using a separate backend route, ensure backend `CORS_ORIGINS` includes frontend route host.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: flowviz
  labels:
    app: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: quay.io/<org>/flowviz-frontend:latest
          imagePullPolicy: Always
          envFrom:
            - configMapRef:
                name: flowviz-frontend-config
          ports:
            - containerPort: 8080
              protocol: TCP
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
```

---

## 9) Frontend Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: flowviz
  labels:
    app: frontend
spec:
  selector:
    app: frontend
  ports:
    - name: http
      port: 8080
      targetPort: 8080
      protocol: TCP
```

---

## 10) Frontend Route

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: frontend
  namespace: flowviz
spec:
  to:
    kind: Service
    name: frontend
  port:
    targetPort: http
  tls:
    termination: edge
```

---

## 11) Validation checklist

```bash
oc -n flowviz get deploy,po,svc,route
oc -n flowviz logs -f deploy/frontend
oc -n flowviz logs -f deploy/backend
```

Check:
- Frontend route loads app
- `/api/*` requests from frontend succeed
- Backend `/health` returns `{"status":"ok","service":"flowviz-backend"}`
- `https://<frontend-route>/env.js` returns expected `VITE_API_URL` and `VITE_AUTH_API_URL`

When changing frontend API env values in OpenShift:

```bash
oc -n flowviz create configmap flowviz-frontend-config \
  --from-literal=VITE_API_URL='https://backend-flowviz.apps.<cluster-domain>' \
  --from-literal=VITE_AUTH_API_URL='https://backend-flowviz.apps.<cluster-domain>' \
  --dry-run=client -o yaml | oc apply -f -

oc -n flowviz rollout restart deployment/frontend

# If backend is on a separate route, allow frontend origin in backend CORS
oc -n flowviz set env deployment/backend CORS_ORIGINS='https://frontend-flowviz.apps.<cluster-domain>'
oc -n flowviz rollout restart deployment/backend
```

---

## 12) Most common mistakes

- Frontend service still points to port `80` instead of `8080`
- Old frontend image still deployed (rollout not restarted)
- `CORS_ORIGINS` missing frontend route host
- Missing Redis ACL username (`REDIS_USERNAME`) when required by your Redis instance
