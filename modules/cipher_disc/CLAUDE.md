# cipher_disc: a turning cipher disc

Two rings on a pin: letters outside, signs inside (flowers, birds, any images or characters). A secret text written in the signs reads as letters at one rotation only. Players turn the inner ring and read; when they think it makes sense they press "read". Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `key` and `plainText` stay on the server. The view has the rings, the rotation, the signs, and how they read at the current rotation (sense only at the key).
- `move`: `{rotate: -1|1}`, `{read: true}`. Solved by `read` at the key rotation (turning past it does not end the game by accident); then the view carries `plain`.
- Encoding: sign index = letter index + key (mod ring size); the game writes `cipher` that way.
- Test: `node tools/test_cipher_disc.js`.
