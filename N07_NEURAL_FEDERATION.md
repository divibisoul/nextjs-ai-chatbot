# N05 → N07 Neural Federation

N05 exposes shared neural workloads through `lib/soul-neural/N07NeuralBridge.ts`. Requests use Soul Mesh `1.1.0`, HMAC-SHA256, correlation, nonce, timeout and finite-value validation.

N05 keeps local capability ownership; N07 provides shared neural processing without duplicating the canonical model runtime.
