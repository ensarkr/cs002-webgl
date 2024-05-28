import { mat4 } from "gl-matrix";
import { LETTER_DATA } from "./static/letterData";
import { createAndBindBuffer, setBufferAttribute } from "./gl";
import { letterInfoT, programInfoT } from "./typings";

const drawLetter = (
  programInfo: programInfoT,
  letterInfo: letterInfoT,
  scale: number,
  rotation: number
) => {
  const { vertices } = LETTER_DATA[letterInfo.letter];

  const letterVerticesBuffer = createAndBindBuffer(programInfo.gl, vertices);

  setBufferAttribute(
    programInfo.gl,
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

  programInfo.gl.uniformMatrix4fv(
    programInfo.uniformLocations.transformationMatrix,
    false,
    transformationMatrix
  );

  // set our random color
  programInfo.gl.uniform4fv(
    programInfo.uniformLocations.color,
    letterInfo.color
  );

  const offset = 0;
  const vertexCount = vertices.length / 3;
  programInfo.gl.drawArrays(programInfo.gl.TRIANGLES, offset, vertexCount);
};

export { drawLetter };
