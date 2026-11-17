export interface CipherDiscOptions {
  /** Outer ring: the letters. */
  outer: string[];
  /** Inner ring: the signs, one per letter (images paths or text such as emoji). */
  inner: string[];
  /** The secret text as signs (and spaces or punctuation, kept as they are). A sign i is read as outer[(i - rotation) mod n]. */
  cipher: string[];
  /** The right rotation. Server only. */
  key: number;
  /** Shown once solved, with its accents and punctuation. Server only until then. */
  plainText: string;
  texts: { left: string; right: string; reading: string; solved: string; read?: string; wrong?: string };
}
export interface CipherDiscState { rot: number; solved?: boolean }
export interface CipherDiscView {
  outer: string[]; inner: string[]; rot: number; cipher: string[];
  /** The cipher read with the current rotation (meaningless unless the rotation is right). */
  reading: string;
  plain?: string;
  texts: CipherDiscOptions['texts'];
}
export type CipherDiscMove = { rotate: number } | { read: true };
