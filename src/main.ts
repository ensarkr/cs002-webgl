import { mat4, vec3 } from "gl-matrix";
import { LETTER_DATA } from "./static/letterData";

const GAP_BETWEEN_LETTERS = 15;
const SPACEBAR_WIDTH = 40;
const FOV = (15 * Math.PI) / 180; // in radians
const NEAR_PLANE = 0.1;
const FAR_PLANE = 1000;
const CAMERA_FARNESS_FROM_CENTER = 25;
const CAMERA_ANGLE_INCREASE_PER_FRAME = 15;
const DEVICE_PIXEL_RATIO = window.devicePixelRatio || 1;

const input = document.querySelector("#textInput") as HTMLInputElement | null;

if (input === null) {
  throw "input not found";
}

const canvas = document.querySelector("#canvas") as HTMLCanvasElement | null;

if (canvas === null) {
  throw "canvas not found";
}

let aspectRatio = 1;
let fullLettersWidth = 0;
let scalingFactor = 0.045;

const updateScalingFactor = () => {
  // FOV is the angle between top and bottom plane
  // find max height at origin
  const maxHeight =
    (Math.pow(Math.pow(CAMERA_FARNESS_FROM_CENTER, 2) + 1, 1 / 2) /
      Math.tan((Math.PI - FOV) / 2)) *
    2;

  // find max width
  const maxWidth = maxHeight * aspectRatio;

  // 0.9 is for padding
  // 1 / 20 exist cause if user writes only 1 letter it overflows
  scalingFactor = Math.min((maxWidth / fullLettersWidth) * 0.9, 1 / 20);
};

const projectionMatrix = mat4.create();

let gl = canvas.getContext("webgl");

if (gl === null) {
  throw "webgl context not found";
}

const setCanvasSize = () => {
  // set pixels and aspect ratio
  canvas.width = canvas.clientWidth * DEVICE_PIXEL_RATIO;
  canvas.height = canvas.clientHeight * DEVICE_PIXEL_RATIO;
  aspectRatio = canvas.width / canvas.height;
  updateScalingFactor();
  mat4.perspective(projectionMatrix, FOV, aspectRatio, NEAR_PLANE, FAR_PLANE);
  // where will canvas render
  gl.viewport(0, 0, canvas.width, canvas.height);
};

setCanvasSize();

window.addEventListener("resize", () => {
  setCanvasSize();
});

// random color that can be seen on black background
const getRandomColor = (): [number, number, number, number] => {
  while (true) {
    const randomColor = Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0");
    const hexcolor = randomColor;
    const r = parseInt(hexcolor.slice(0, 2), 16);
    const g = parseInt(hexcolor.slice(2, 4), 16);
    const b = parseInt(hexcolor.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;

    if (yiq >= 128) return [r / 255, g / 255, b / 255, 1];
  }
};

const currentLetters: (letterInfoT | { letter: "-" })[] = [];

// rotation factor increased every time user writes unwritable letter
// little easter egg
let rotationFactor = 0;

input.addEventListener("input", (e) => {
  rotationFactor = 0;
  const userText = (e.target as HTMLInputElement).value;

  // set type query after encoding to base64
  // i do not want it to be seen in the url thats why its getting encoded
  const url = new URL(window.location.href);
  url.searchParams.set("type", encodeURIComponent(btoa(userText)));
  history.pushState(null, "", url);

  // format user input writable format
  // empty space are turned into '-'
  const letterArray = userText
    .replaceAll("-", "")
    .replaceAll(" ", "-")
    .toUpperCase()
    .split("")
    .filter((e) => {
      if (Object.keys(LETTER_DATA).includes(e) || e === "-") {
        return true;
      }
      rotationFactor += 0.5;
      return false;
    }) as (letterT | "-")[];

  // add all lengths together
  fullLettersWidth = (letterArray.length - 1) * GAP_BETWEEN_LETTERS;
  for (let i = 0; i < letterArray.length; i++) {
    const currentLetter = letterArray[i];

    fullLettersWidth +=
      currentLetter === "-"
        ? SPACEBAR_WIDTH
        : LETTER_DATA[currentLetter].maxWidth;
  }

  // word vertices in (+x, -y, +z) space
  // if we think 2D space one corner is exactly (0,0) and other corner is (x,-y)
  // so we shift on x axis by half of full width
  let startingPointX = -fullLettersWidth / 2;

  // clear currentLetters array
  currentLetters.length = 0;

  for (let i = 0; i < letterArray.length; i++) {
    const currentLetter = letterArray[i];

    if (currentLetter === "-") {
      // this element will be ignored while rendering letters
      currentLetters.push({ letter: "-" });

      startingPointX += SPACEBAR_WIDTH;
      continue;
    }

    currentLetters.push({
      color: getRandomColor(),
      letter: currentLetter,
      translateX: startingPointX,
    });

    startingPointX += GAP_BETWEEN_LETTERS + LETTER_DATA[currentLetter].maxWidth;
  }

  updateScalingFactor();
});

// written texts are kept in url queries to be able to send anyone
const urlParams = new URLSearchParams(window.location.search);
const queryType = urlParams.get("type");

// read the query if it exist
if (queryType !== null && queryType.length !== 0) {
  input.value = atob(decodeURIComponent(queryType));
  // dispatch event to render text
  input.dispatchEvent(new Event("input", {}));
} else {
  input.value = "ensar kara";
  input.dispatchEvent(new Event("input", {}));
  input.value = "";
}

const main = () => {
  // shaders run on the gpu
  // because shaders only include simple calculations
  // and gpus has much more cores than cpu
  // but gpu cores have simple instruction compared to cpus
  // which we need for computer graphics

  // vertex shader is used for calculating new vertex positions
  // all calculation done on the gpu

  // 3D space position
  // 3 uniform value
  // 1 outing color value

  // gl_Position is the final position of the vertex
  const vertexShaderSource = `
  precision mediump float;

  attribute vec3 aVertexPosition;
  
  uniform mat4 uTransformationMatrix;
  uniform mat4 uProjectionMatrix;
  uniform vec4 uColor;

  varying vec4 color;

  void main(void) {
    gl_Position =  uProjectionMatrix * uTransformationMatrix * vec4(aVertexPosition.xyz, 1.0);
    color = uColor;
  }
`;

  // fragment shader is used for calculating color of pixels
  // its called for every pixel inside primitives
  const fragmentShaderSource = `
  precision mediump float;

  varying vec4 color;

  void main(void) {
    gl_FragColor = color;
  }
`;

  // compile shaders and create a program
  const vertexShader = loadShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
  const shaderProgram = initiateProgram(vertexShader, fragmentShader);

  // program info for ease of access
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
    },
    uniformLocations: {
      transformationMatrix: gl.getUniformLocation(
        shaderProgram,
        "uTransformationMatrix"
      ) as number,
      projectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ) as number,
      color: gl.getUniformLocation(shaderProgram, "uColor") as number,
    },
  };

  // tell gl to use our shader program
  gl.useProgram(programInfo.program);

  const viewProjectionMatrix = mat4.create();

  let then = 0;
  let deltaTime = 0;
  let cameraAngle = 0;

  const render = (now: number) => {
    now *= 0.001; // convert to seconds
    deltaTime = now - then;
    then = now;

    gl.clearColor(0.0, 0.0, 0.0, 1.0); // clear to black
    gl.clearDepth(1.0); // clear everything

    // enable depth testing
    // depth testing checks whats in front or back
    gl.enable(gl.DEPTH_TEST);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // increase camera angle by CAMERA_ANGLE_INCREASE_PER_FRAME * deltaTime degrees
    cameraAngle +=
      (deltaTime * CAMERA_ANGLE_INCREASE_PER_FRAME * Math.PI) / 180;

    // find camera position on x,z axises
    const cameraX = CAMERA_FARNESS_FROM_CENTER * Math.sin(cameraAngle);
    const cameraZ = CAMERA_FARNESS_FROM_CENTER * Math.cos(cameraAngle);

    const viewMatrix = mat4.create();

    mat4.lookAt(
      viewMatrix,
      // camera position
      vec3.fromValues(cameraX, 1, cameraZ),
      // where we are looking
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(0, 1, 0)
    );

    // calculate viewProjectionMatrix and set
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      viewProjectionMatrix
    );

    // render every letter except '-'
    for (let i = 0; i < currentLetters.length; i++) {
      const currentLetter = currentLetters[i];

      if (currentLetter.letter === "-") {
        continue;
      }

      drawLetter(
        programInfo,
        currentLetter,
        scalingFactor,
        then * rotationFactor
      );
    }

    // WEB API that calls our function on next frame
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
};

// compile and load
const loadShader = (type: number, shaderSource: string) => {
  const shader = gl.createShader(type);

  if (shader === null) throw "Shader not created!";

  gl.shaderSource(shader, shaderSource);

  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw "Shader not compiled!";
  }

  return shader;
};

const initiateProgram = (
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) => {
  // A shader program is a container that links together the vertex and fragment shaders
  const shaderProgram = gl.createProgram();

  if (shaderProgram === null) throw "Program not created!";

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);

  // This line links the attached vertex and fragment shaders together into a complete shader program. During the linking process,
  // WebGL checks to ensure that the vertex and fragment shaders are compatible with each other.
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw "Program not linked!";
  }

  return shaderProgram;
};

const createAndBindBuffer = (vertices: number[]) => {
  // create buffer in the gpu
  // buffer is only a storage in the gpu
  // until its bound its only a placeholder
  // you can create multiple
  const buffer = gl.createBuffer();

  // bind our buffer to gpu array buffer
  // only one at a time when
  // when we bind another buffer
  // first buffer still stays in the gpu
  // and can be accessed by binding again
  // we bind to do operation on it
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // load our vertices to our created buffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  if (buffer === null) throw "Buffer not created!";

  return buffer;
};

const setBufferAttribute = (vertexPosition: number, buffer: WebGLBuffer) => {
  const numComponents = 3; // there is 3 axis
  const type = gl.FLOAT;
  const normalize = false;
  const stride = numComponents * Float32Array.BYTES_PER_ELEMENT;
  const offset = 0; // no offset

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // The vertexAttribPointer function in WebGL is used to specify the data format of vertex attributes and bind them to vertex buffer objects (VBOs).
  // It tells WebGL how to interpret the data stored in the VBOs when rendering geometry.
  gl.vertexAttribPointer(
    vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset
  );
  gl.enableVertexAttribArray(vertexPosition);
};

const drawLetter = (
  programInfo: programInfoT,
  letterInfo: letterInfoT,
  scale: number,
  rotation: number
) => {
  const { vertices } = LETTER_DATA[letterInfo.letter];

  const letterVerticesBuffer = createAndBindBuffer(vertices);

  setBufferAttribute(
    programInfo.attribLocations.vertexPosition,
    letterVerticesBuffer
  );

  const transformationMatrix = mat4.create();

  // apply transformations on reverse order of what we want
  mat4.scale(transformationMatrix, transformationMatrix, [scale, scale, scale]);

  // rotation is increased when user enter unwritable letters
  mat4.rotateY(
    transformationMatrix,
    transformationMatrix,
    (rotation * Math.PI * 2) / 3
  );

  mat4.rotateZ(
    transformationMatrix,
    transformationMatrix,
    (rotation * Math.PI * 1) / 3
  );

  mat4.rotateX(
    transformationMatrix,
    transformationMatrix,
    (rotation * Math.PI * 6) / 3
  );

  mat4.translate(transformationMatrix, transformationMatrix, [
    letterInfo.translateX,
    // y is 20 because height of letters are 40 and they are between 0 and -40 on y axis
    20,
    // z is -5 because z-length of letters are 10 and they are between 0 and 10 on z axis
    -5,
  ]);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.transformationMatrix,
    false,
    transformationMatrix
  );

  // set our random color
  gl.uniform4fv(programInfo.uniformLocations.color, letterInfo.color);

  const offset = 0;
  const vertexCount = vertices.length / 3;
  gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
};

main();

type programInfoT = {
  program: WebGLProgram;
  attribLocations: {
    vertexPosition: number;
  };
  uniformLocations: {
    transformationMatrix: number;
    projectionMatrix: number;
    color: number;
  };
};

// all writable letters
export type letterT =
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

const button = document.querySelector("#button") as HTMLCanvasElement | null;

if (button !== null) {
  button.addEventListener("click", () => {
    window.open("https://github.com/ensarkr/cs002-webgl", "_blank");
  });
}
