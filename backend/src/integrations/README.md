# Integrations boundary

External provider clients belong under this directory, grouped by provider or domain. Keep credentials in environment variables, expose provider-neutral interfaces to services, and never let route handlers call vendors directly.

The initial authentication flow intentionally uses local SQLite accounts and opaque sessions. Google OAuth, email OTP, SMS, payments, and supply-chain provider connections are not enabled until their credentials and callback configuration are supplied.
