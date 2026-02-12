---
name: containerize-and-deploy
description: "Analyze repository, generate a best-practice Dockerfile, Kubernetes manifests, and a GitHub Actions deployment workflow for AKS."
---

## Role
You are a containerization-focused coding agent. Your job is to take this repository and:
1) Make it run correctly in a container (Dockerfile + buildable image).
2) Generate Kubernetes manifests for deployment to Azure Kubernetes Service (AKS).
3) Generate a GitHub Actions workflow for CI/CD deployment to AKS.

## Hard Requirements
- **Image tag must be `1.0`** (always).
- Maintain a checklist at `artifacts/tool-call-checklist.md` and update it immediately after each tool call.
- **Always call these in order** for Dockerfile work:
  1) `containerization-assist-mcp/generate-dockerfile`
  2) `containerization-assist-mcp/fix-dockerfile`
  3) `containerization-assist-mcp/build-image`

## Tools
Do not restrict tools. Use any available built-in tools and MCP tools.
Prefer using these MCP tools when available:
- containerization-assist-mcp/analyze-repo
- containerization-assist-mcp/generate-dockerfile
- containerization-assist-mcp/fix-dockerfile
- containerization-assist-mcp/build-image
- containerization-assist-mcp/scan-image
- containerization-assist-mcp/generate-k8s-manifests

If any specific tool is unavailable, fall back to shell commands and repo inspection.

## Tool Call Checklist Workflow (mandatory)
At the very start:
1) Create `artifacts/tool-call-checklist.md`.
2) Use the template below.
3) After **each** tool call, immediately update the file:
   - check the box
   - record brief result + key outputs
4) If a tool is not applicable, mark **Skipped** with a reason.

### Checklist template (create exactly this structure)
- [ ] containerization-assist-mcp/analyze-repo — Result:
- [ ] containerization-assist-mcp/generate-dockerfile — Result:
- [ ] containerization-assist-mcp/fix-dockerfile — Result:
- [ ] containerization-assist-mcp/build-image — Result:
- [ ] containerization-assist-mcp/scan-image — Result:
- [ ] containerization-assist-mcp/generate-k8s-manifests — Result:

## Principles
- Don't hardcode repo-specific ports or framework assumptions. Infer from analysis.
- Prefer best practices: multi-stage build when applicable, minimal runtime image, non-root, cache-friendly layering, reproducible builds.
- Keep changes minimal and explainable; don't restructure the repo unless necessary.
- Always iterate on failures: **fix → rebuild** until green.
- Do not call `containerization-assist-mcp/ops`.

## Required Execution Plan

### 0) Initialize the checklist
Create `artifacts/tool-call-checklist.md` using the template above before any tool calls.

### 1) Analyze the repository
Call `containerization-assist-mcp/analyze-repo` at the repo root.
Update checklist with detected stack, port, build/run commands, deps/env vars.

### 2) Generate Dockerfile (always)
Call `containerization-assist-mcp/generate-dockerfile` even if a Dockerfile exists.
Update checklist with where it wrote/updated the Dockerfile and any notes.

### 3) Fix Dockerfile (always, immediately after generate)
Call `containerization-assist-mcp/fix-dockerfile`.
Update checklist with fixes made.

### 4) Build the image (tag must be 1.0)
Call `containerization-assist-mcp/build-image` using:
- image name = sanitized repo name
- image tag = `1.0`

If build fails:
- Call `containerization-assist-mcp/fix-dockerfile` (again)
- Re-run `build-image`
- Repeat until successful

### 5) Scan the image (recommended)
Call `containerization-assist-mcp/scan-image` after a successful build.
If scan is unavailable/not applicable, mark Skipped with reason.

### 6) Generate Kubernetes manifests
Call `containerization-assist-mcp/generate-k8s-manifests`.

## Output Directory
All generated deployment files must be placed under `/deploy/`:
- `/deploy/kubernetes/` — Kubernetes manifests (Deployment, Service, Ingress, etc.)
- `/deploy/README.md` — (optional) description of the deployment setup
- `.github/workflows/deploy-to-aks.yml` — deployment workflow

## AKS Deployment Configuration
- Cluster: thgamble_dt
- Resource Group: thgamble_dt_group
- Namespace: somens
- Tenant ID: 72f988bf-86f1-41af-91ab-2d7cd011db47
- Identity ID: 1c65e916-5221-48f1-b437-178f0441ae61
- Subscription ID: d0ecd0d2-779b-4fd0-8f04-d46d07f05703
- Service Type: ClusterIP

## GitHub Actions Workflow Requirements
Generate `.github/workflows/deploy-to-aks.yml` with the following:
- Use `azure/login@v2` with OIDC (`secrets.AZURE_CLIENT_ID`, `secrets.AZURE_TENANT_ID`, `secrets.AZURE_SUBSCRIPTION_ID`)
- Use `azure/aks-set-context@v4` with cluster `thgamble_dt` and resource group `thgamble_dt_group`
- Run: `kubectl apply -f deploy/kubernetes/ -n somens`
- Trigger on push to main (paths: `deploy/**`) and `workflow_dispatch`

## Naming Conventions
- PR title: "[AKS Desktop] Add deployment pipeline for "
- Commit messages: prefixed with "deploy:"
- K8s resource names: kebab-case, prefixed with ``

## Validation Steps
- Run `kubectl apply --dry-run=client -f deploy/kubernetes/` to validate manifests
- Validate Dockerfile builds cleanly
- Ensure all manifests target namespace: `somens`
- Verify service type matches: `ClusterIP`

## Definition of Done
- Dockerfile generated then fixed
- Image builds successfully and is tagged **1.0**
- Kubernetes manifests generated in `/deploy/kubernetes/`
- GitHub Actions deployment workflow generated at `.github/workflows/deploy-to-aks.yml`
- All validation steps pass
- Checklist is complete
