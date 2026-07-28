# Security Policy

## Supported Scope

Security reports are accepted for the current default branch and fresh NARA v4
monitoring surfaces. Retired v3 contracts and archived incident-stack
deployments are outside the supported runtime scope.

## Reporting a Vulnerability

Do not disclose suspected vulnerabilities in a public issue, discussion, pull
request, or social channel.

Use GitHub private vulnerability reporting:

1. Open the repository **Security** tab.
2. Select **Report a vulnerability**.
3. Include the affected file and line, impact, preconditions, reproduction
   steps, and proposed remediation when available.

If private reporting is unavailable, contact the repository owner through a
verified private NARA Protocol channel and request a secure route before sharing
technical details.

Never send private keys, seed phrases, production credentials, or unnecessary
personal information. Redact RPC credentials and secrets from logs.

## Response Process

Maintainers will acknowledge reproducible reports, assess affected versions and
severity, coordinate remediation, and publish an advisory when appropriate. No
response-time guarantee is made until a staffed security contact and formal
service-level policy are published.

## Monitor Security Boundary

This project is read-only. It must not request signing keys, send protocol
transactions, mutate protocol state, silently fall back to retired addresses,
or allow generated summaries to override deterministic alert evidence. Treat a
change that violates these boundaries as security-sensitive.
