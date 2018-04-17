#version 300 es

// This is a fragment shader. If you've opened this file first, please
// open and read lambert.vert.glsl before reading on.
// Unlike the vertex shader, the fragment shader actually does compute
// the shading of geometry. For every pixel in your program's output
// screen, the fragment shader is run for every bit of geometry that
// particular pixel overlaps. By implicitly interpolating the position
// data passed into the fragment shader by the vertex shader, the fragment shader
// can compute what color to apply to its pixel based on things like vertex
// position, light position, and vertex color.
precision highp float;

uniform vec3 u_Beats[50]; // The beats currently on screen in format vec2(position.x, position.y), (time left onscreen)

in vec2 fs_UV;
in vec4 fs_Pos;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

void main()
{
    // Material base color (before shading)
    vec4 col = vec4(0.2, 0.2, 0.2, 1);
    for (int i = 0; i < 50; i++) {
        if (u_Beats[i].z > 0.0001) { // If there is time left on the beat (eliminates empty beats)
            float thisdist = distance(vec2(u_Beats[i]), fs_UV);
            float ringdist = 30.f + u_Beats[i].z * 30.f;
            if (abs(thisdist - ringdist) <= 3.f) {
                col = vec4(0.2, 0.2, 0.8, 1);
                break;
            }
            else if (thisdist <= 30.f) {
                col = vec4(0.8, 0.2, 0.2, 1);
                break;
            }
        }
    }

    // Compute final shaded color
    out_Col = col;
    //out_Col = vec4(fs_UV, 0, 1);
}
