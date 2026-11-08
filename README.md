⚡ Webhook Catcher
A robust, real-time developer utility designed to instantly capture, inspect, and debug incoming HTTP webhooks from external services like Stripe, GitHub, webhooks, and custom APIs.

🔍 What is it?
When developing or testing integrations that rely on webhooks, pointing external services to localhost can be painful, and third-party webhook testers often lack privacy or persistence. Webhook Catcher provides a self-hosted, lightning-fast dashboard that generates unique endpoints on demand.
Every request sent to your unique bin—whether it's a GET, POST, PUT, or DELETE with JSON, plain text, or form data—is captured instantly, broadcasted live via WebSockets to your React dashboard, and securely saved to an SQLite database so you never lose payload history.
