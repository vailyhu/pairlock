// The small part of Node's API the modules use, so type checking needs no extra package.
declare module 'node:crypto' {
  export function randomInt(max: number): number;
}
