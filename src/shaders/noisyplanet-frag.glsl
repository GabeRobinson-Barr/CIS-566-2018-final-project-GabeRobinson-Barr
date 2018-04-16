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

uniform vec4 u_Color; // The color with which to render this instance of geometry.

uniform float u_Time;

uniform int u_Traditional;

// These are the interpolated values out of the rasterizer, so you can't know
// their specific values without knowing the vertices that contributed to them
in vec4 fs_Nor;
in vec4 fs_LightVec;
in vec4 fs_Col;

in float fs_BumpHeight;
in float fs_BubbleHeight;
in float fs_RippleHeight;
in float fs_Cloud;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.


void main()
{
        if (u_Traditional == 0) {
        vec4 fog = vec4(0.4, 0.17, 0.03, 1);

        vec4 sunOrange = vec4(0.92, 0.23, 0.03, 1);

        vec4 sunYellow = vec4(1, 0.8, 0.4, 1);

        vec4 rippleColor = vec4(.7, .7, .8, 1);

        vec4 summedColor = fog + sunOrange * (fs_BumpHeight * 6.f) + (sunYellow * fs_BubbleHeight * 5.f);

        summedColor = summedColor / (1.f + fs_BumpHeight + fs_BubbleHeight) + vec4(0.4, 0.4, 0.4, 1) * fs_RippleHeight * 10.f;

        if (fs_Cloud > 0.05 && (fs_BubbleHeight + fs_BumpHeight) < 0.2) {
            summedColor = 0.5 * (summedColor + vec4(vec3(0.6, 0.6, 0.6) * (fs_Cloud * 5.f), 1));
        }

        // Compute final shaded color

        out_Col = summedColor;

            if (fs_BubbleHeight < 0.15) {
                mat3 rotMat = mat3(vec3(cos(u_Time * 0.0004), sin(u_Time * 0.0004), 0), vec3(-sin(u_Time * 0.0004), cos(u_Time * 0.0004), 0), vec3(0, 0, 1));

                vec4 lightDir = vec4(rotMat * vec3(fs_LightVec),1);

                float diffuseTerm = dot(normalize(fs_Nor), normalize(lightDir));
                // Avoid negative lighting values
                diffuseTerm = clamp(diffuseTerm, 0.f, 1.f);

                float ambientTerm = .3;

                float lightIntensity = diffuseTerm + ambientTerm;

                out_Col = vec4(summedColor.rgb * lightIntensity, summedColor.a);
            } 
        }
        else {
            vec4 diffColor;
            float height = fs_BumpHeight + fs_BubbleHeight + fs_RippleHeight;

            if (height < 0.05) {
                diffColor = vec4(0.13, 0.38, 0.63, 1);
            }
            else if(height < 0.06) {
                diffColor = vec4(vec3(0.75, 0.75, 0.78) + height * 0.6, 1);
            }
            else if(height < 0.2) {
                diffColor = vec4(0.01, 0.4, 0.03, 1);
            }
            else {
                diffColor = vec4(vec3(0.9, 0.9, 0.9) + height - 0.3, 1);
            }

        mat3 rotMat = mat3(vec3(cos(u_Time * 0.0004), sin(u_Time * 0.0004), 0), vec3(-sin(u_Time * 0.0004), cos(u_Time * 0.0004), 0), vec3(0, 0, 1));

        vec4 lightDir = vec4(rotMat * vec3(fs_LightVec),1);

        float diffuseTerm = dot(normalize(fs_Nor), normalize(lightDir));
        // Avoid negative lighting values
        // diffuseTerm = clamp(diffuseTerm, 0, 1);

        float ambientTerm = .2;

        float lightIntensity = diffuseTerm + ambientTerm;


        // Compute final shaded color

        out_Col = vec4(diffColor.rgb * lightIntensity, diffColor.a);
        }

}
