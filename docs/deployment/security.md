---
id: deployment/security
title: Security Checklist
description: Network policies, secrets, TLS, and hardening recommendations for production.
sidebar_label: Security
hide_title: false
---

Security best practices for production deployments.

## Network policies
- Use Kubernetes NetworkPolicies to restrict pod-to-pod access.
- Limit database access to backend and maintenance jobs only.

## Secrets management
- Use cloud provider secret stores (AWS Secrets Manager, GCP Secret Manager) or sealed-secrets for K8s.
- Avoid plaintext secrets in `ConfigMap` or Git.

## TLS and mTLS
- Terminate TLS at the load balancer (ALB/Ingress) with ACM-issued certs.
- For internal services consider mTLS for mutual authentication.

## API keys and rotation
- Use short-lived tokens where possible and rotate API keys regularly.
- Implement revocation for compromised keys.

## DDoS protection
- Rely on cloud provider DDoS protections (AWS Shield) and WAF rules for known patterns.
- Rate limit unauthenticated endpoints.

## Vulnerability scanning
- Scan container images with tools like Trivy/clair during CI
- Keep system packages and dependencies up to date and apply security patches.
