import {vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import * as OBJ from 'webgl-obj-loader';

class OBJFile extends Drawable {
    indices: Uint32Array;
    positions: Float32Array;
    normals: Float32Array;

    constructor(name: string) {
        super();
        let objStr = document.getElementById(name).innerHTML;
        
        let mesh = new OBJ.Mesh(objStr);
        this.indices = new Uint32Array(mesh.indices);
        this.positions = new Float32Array(mesh.vertices);
        this.normals = new Float32Array(mesh.vertexNormals);

    }

    create() {

        this.generateIdx();
        this.generatePos();
        this.generateNor();

        this.count = this.indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

        console.log(`Created square`);
    }


};

export default OBJFile;