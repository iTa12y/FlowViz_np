# OpenShift Deployment (Frontend + Backend)

## Why your frontend pod failed

OpenShift runs containers with a random non-root UID. Stock `nginx:alpine` expects write access to `/var/cache/nginx/*`, so startup fails with:

`mkdir() "/var/cache/nginx/client_temp" failed (13: Permission denied)`

This repo is now updated to be OpenShift-safe:
- Frontend runtime image: `nginxinc/nginx-unprivileged:1.27-alpine`
- Nginx listen port: `8080`
- Nginx temp paths: `/tmp/*`

## Build and push images

From repo root:

```bash
BACKEND_IMAGE=quay.io/<org>/flowviz-backend:latest
FRONTEND_IMAGE=quay.io/<org>/flowviz-frontend:latest

docker build -f apps/backend/Dockerfile -t $BACKEND_IMAGE .
docker build -f apps/frontend/Dockerfile -t $FRONTEND_IMAGE .

docker push $BACKEND_IMAGE
docker push $FRONTEND_IMAGE
```

## Deploy in OpenShift

```bash
oc new-project flowviz

oc create secret generic flowviz-backend-secret \
  --from-literal=OPENAI_API_KEY='<key>' \
  --from-literal=CONFLUENCE_URL='https://<tenant>.atlassian.net' \
  --from-literal=REDIS_HOST='<redis-host>' \
  --from-literal=REDIS_PORT='6379' \
  --from-literal=REDIS_USERNAME='<redis-username>' \\
  --from-literal=REDIS_PASSWORD='<redis-password>'

oc create configmap flowviz-backend-config \
  --from-literal=NODE_ENV='production' \
  --from-literal=PORT='3001' \
  --from-literal=CORS_ORIGINS='https://<frontend-route-host>' \
  --from-literal=FRONTEND_URL='https://<frontend-route-host>'

oc new-app --name=backend --image=$BACKEND_IMAGE
oc set env deployment/backend --from=configmap/flowviz-backend-config
oc set env deployment/backend --from=secret/flowviz-backend-secret
oc expose deployment backend --port=3001 --target-port=3001
oc expose service backend --name=backend-route

oc new-app --name=frontend --image=$FRONTEND_IMAGE
oc expose deployment frontend --port=8080 --target-port=8080
oc expose service frontend --name=frontend-route

oc get pods
oc get routes
```

## Frontend API URL note

The frontend reads `VITE_AUTH_API_URL` at build time. For OpenShift, build frontend with:
- `VITE_AUTH_API_URL=` (empty), so browser calls `/api/...` on same host

If you set a full backend URL instead, ensure backend CORS allows the frontend route host.

## Redeploy after this fix

```bash
# Rebuild/push frontend image with latest Dockerfile + nginx.conf
docker build -f apps/frontend/Dockerfile -t $FRONTEND_IMAGE .
docker push $FRONTEND_IMAGE

# Trigger rollout
oc rollout restart deployment/frontend
oc logs -f deployment/frontend
```
