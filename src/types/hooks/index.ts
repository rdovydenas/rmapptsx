export interface RectInterface {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface ContainsInterface {
  outside: RectInterface;
  inside: RectInterface;
}
