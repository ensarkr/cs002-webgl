import { mat4, vec3 } from "gl-matrix";
import { LETTER_DATA } from "./static/letterData";
import { initiateProgram, loadShader } from "./gl";
import { getRandomColor } from "./helper";
import { drawLetter } from "./letter";
import { letterInfoT, letterT } from "./typings";

const GAP_BETWEEN_LETTERS = 15;
const SPACEBAR_WIDTH = 40;
const FOV = (15 * Math.PI) / 180; // in radians
const NEAR_PLANE = 0.1;
const FAR_PLANE = 1000;
const CAMERA_FARNESS_FROM_CENTER_Z_AXIS = 10;
const CAMERA_ANGLE_INCREASE_PER_FRAME = 15;
const DEVICE_PIXEL_RATIO = window.devicePixelRatio || 1;

const button = document.querySelector("#button") as HTMLCanvasElement | null;

if (button !== null) {
  button.addEventListener("click", () => {
    window.open("https://github.com/ensarkr/cs002-webgl", "_blank");
  });
}

const input = document.querySelector("#textInput") as HTMLInputElement | null;

if (input === null) {
  throw "input not found";
}

const canvas = document.querySelector("#canvas") as HTMLCanvasElement | null;

if (canvas === null) {
  throw "canvas not found";
}

let gl = canvas.getContext("webgl");

if (gl === null) {
  throw "webgl context not found";
}

let aspectRatio = 1;
let fullLettersWidth = 0;
let scalingFactor = 0.045;

// rotation factor increased every time user writes unwritable letter
// little easter egg
let rotationFactor = 0;

const projectionMatrix = mat4.create();

const updateScalingFactor = () => {
  // FOV is the angle between top and bottom plane
  // find max height at origin
  const maxHeight =
    (Math.pow(Math.pow(CAMERA_FARNESS_FROM_CENTER_Z_AXIS, 2) + 1, 1 / 2) /
      Math.tan((Math.PI - FOV) / 2)) *
    2;
  // its 40 because all letters have 40 height
  const heightScaling = maxHeight / 40;

  // find max width
  const maxWidth = maxHeight * aspectRatio;
  const widthScaling = maxWidth / fullLettersWidth;

  const paddingPercentage = 0.1;

  scalingFactor =
    Math.min(widthScaling, heightScaling) * (1 - paddingPercentage);
};

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

window.addEventListener("resize", setCanvasSize);

const currentLetters: (letterInfoT | { letter: "-" })[] = [];

const onUserInput = (e: Event) => {
  rotationFactor = 0;
  const userText = (e.target as HTMLInputElement).value;

  // set type query after encoding to base64
  // i do not want it to be seen in the url thats why its getting encoded
  const url = new URL(window.location.href);
  url.searchParams.set("type", encodeURIComponent(btoa(userText)));
  history.pushState(null, "", url);

  // format user input to writable format
  // empty spaces are turned into '-'
  const letterArray = userText
    .replaceAll("-", "+")
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
  fullLettersWidth =
    (letterArray.filter((e) => e !== "-").length - 1) * GAP_BETWEEN_LETTERS;
  for (let i = 0; i < letterArray.length; i++) {
    const currentLetter = letterArray[i];

    fullLettersWidth +=
      currentLetter === "-"
        ? SPACEBAR_WIDTH
        : LETTER_DATA[currentLetter].maxWidth;
  }

  // word vertices are in (+x, -y, +z) space
  // if we think in 2D space one corner is exactly (0,0) and other corner is (x,-y)
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
};

input.addEventListener("input", onUserInput);

const inputStartingLetters = () => {
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
};

inputStartingLetters();

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
  uniform mat4 uViewProjectionMatrix;
  uniform vec4 uColor;

  varying vec4 color;

  void main(void) {
    gl_Position =  uViewProjectionMatrix * uTransformationMatrix * vec4(aVertexPosition.xyz, 1.0);
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
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = loadShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );
  const shaderProgram = initiateProgram(gl, vertexShader, fragmentShader);

  // program info for ease of access
  const programInfo = {
    gl,
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
    },
    uniformLocations: {
      transformationMatrix: gl.getUniformLocation(
        shaderProgram,
        "uTransformationMatrix"
      ) as number,
      viewProjectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uViewProjectionMatrix"
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
    const cameraX = CAMERA_FARNESS_FROM_CENTER_Z_AXIS * Math.sin(cameraAngle);
    const cameraZ = CAMERA_FARNESS_FROM_CENTER_Z_AXIS * Math.cos(cameraAngle);

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
      programInfo.uniformLocations.viewProjectionMatrix,
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

main();
