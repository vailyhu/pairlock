/** A mark that shows only under the lamp. x, y: centre in shares of the image size; size: letter height in shares of the image height; angle in degrees. */
export interface UvMark { x: number; y: number; text: string; size?: number; angle?: number }
export interface UvImage { image: string; label?: string; marks: UvMark[] }
export interface UvLampOptions {
  images: UvImage[];
  /** Radius of the light, in shares of the image width (default 0.12). */
  radius?: number;
  /** How dark the picture is outside the light, 0..1 (default 0.35). */
  dim?: number;
  /** Solved once every mark has been inside the light. Off: the panel only shows clues and is never solved. */
  solveWhenAllSeen?: boolean;
  okText?: string;
  /** Instruction under the picture, e.g. "move the lamp over the picture". */
  help?: string;
}
export interface UvLampState { seen: string[] }
export interface UvLampView {
  images: UvImage[];
  radius: number;
  dim: number;
  help?: string;
  /** Marks already seen, as "image:mark", so the client reports each only once. */
  seen: string[];
  /** Every mark has been seen: the client shows them all, also outside the light (with keepAfterSolved the panel stays open to reread them). */
  allSeen: boolean;
}
export interface UvLampMove { seen: [number, number] }
