type programInfoT = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  attribLocations: {
    vertexPosition: number;
  };
  uniformLocations: {
    transformationMatrix: number;
    viewProjectionMatrix: number;
    color: number;
  };
};

// all writable letters
type letterT =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";

type letterInfoT = {
  letter: letterT;
  color: [number, number, number, number];
  translateX: number;
};

export type { programInfoT, letterT, letterInfoT };
