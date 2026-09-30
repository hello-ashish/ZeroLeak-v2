# ZeroLeak v2 — Kubernetes Setup Guide

This guide contains all the steps and commands needed to run the ZeroLeak v2 application locally using Kubernetes.

## Prerequisites
1. **Docker Desktop**: Ensure Docker Desktop is installed and running.
2. **Enable Kubernetes**:
   - Open Docker Desktop.
   - Go to Settings (the gear icon) > **Kubernetes**.
   - Check **"Enable Kubernetes"** and click **"Apply & Restart"**.
   - Wait for the green Kubernetes icon to appear in the bottom left.

## 1. Prepare Docker Images
Before deploying, make sure your application images are built. If you have already built them (as `zeroleak-v2-backend` and `zeroleak-v2-frontend`), you can skip this step.
If you ever make code changes and need to rebuild them for Kubernetes, run:
```bash
docker build -t zeroleak-v2-backend:latest ./backend
docker build -t zeroleak-v2-frontend:latest ./frontend
```

## 2. Deploy Infrastructure Services
First, apply the configurations for the database and secrets. Open your terminal in the root of the `ZeroLeak-v2` project and run:

```bash
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/redis.yaml
```

Wait a few moments to ensure these pods are up and running:
```bash
kubectl get pods
```
*Wait until the `mongodb` and `redis` pods show a status of `Running`.*

## 3. Deploy the Application
Next, deploy your backend API and frontend React app:

```bash
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

Check the status of all pods to ensure the backend and frontend started successfully:
```bash
kubectl get pods
```

## 4. Access the Application Locally
Since Docker Desktop on macOS can sometimes be tricky with `NodePort` mapping, the most reliable way to access the site during local development is by using port forwarding.

Run this command and leave the terminal window open:
```bash
kubectl port-forward svc/frontend 5173:5173
```

You can now access the frontend in your browser at:
👉 **http://localhost:5173**

*(Note: If you need to access your backend API directly from a tool like Postman, you can open a second terminal and run `kubectl port-forward svc/backend 4000:4000`)*

## 5. Teardown (Stopping the App)
When you are done working and want to stop the application and remove the Kubernetes resources, run:
```bash
kubectl delete -f k8s/frontend.yaml
kubectl delete -f k8s/backend.yaml
kubectl delete -f k8s/redis.yaml
kubectl delete -f k8s/mongodb.yaml
kubectl delete -f k8s/secrets.yaml
```
*(Your MongoDB and Redis data is saved in Persistent Volumes, so it won't be deleted unless you specifically delete the PersistentVolumeClaims).*
