# spot_difference: find what differs between two images

Two images of the same view side by side (stacked on narrow screens). A click on either image at a difference marks it on both. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `areas` are rectangles in shares of the image size and stay on the server; the view only carries the areas already found.
- `move`: `{x, y}`, shares of the image size. The same coordinates count on both images.
- Solved when every area is found. A miss says `missText`; it is a wrong attempt only with `missIsBad`.
- Both images must have the same aspect ratio and viewpoint.
