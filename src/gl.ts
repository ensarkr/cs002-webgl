// compile and load
const loadShader = (
  gl: WebGLRenderingContext,
  type: number,
  shaderSource: string
) => {
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
  gl: WebGLRenderingContext,
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

const createAndBindBuffer = (gl: WebGLRenderingContext, vertices: number[]) => {
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

const setBufferAttribute = (
  gl: WebGLRenderingContext,
  vertexPosition: number,
  buffer: WebGLBuffer
) => {
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

export { loadShader, initiateProgram, createAndBindBuffer, setBufferAttribute };
