#version 300 es

//This is a vertex shader. While it is called a "shader" due to outdated conventions, this file
//is used to apply matrix transformations to the arrays of vertex data passed to it.
//Since this code is run on your GPU, each vertex is transformed simultaneously.
//If it were run on your CPU, each vertex would have to be processed in a FOR loop, one at a time.
//This simultaneous transformation allows your program to run much faster, especially when rendering
//geometry with millions of vertices.

uniform mat4 u_Model;       // The matrix that defines the transformation of the
                            // object we're rendering. In this assignment,
                            // this will be the result of traversing your scene graph.

uniform mat4 u_ModelInvTr;  // The inverse transpose of the model matrix.
                            // This allows us to transform the object's normals properly
                            // if the object has been non-uniformly scaled.

uniform mat4 u_ViewProj;    // The matrix that defines the camera's transformation.
                            // We've written a static matrix for you to use for HW2,
                            // but in HW3 you'll have to generate one yourself

uniform float u_Time;

uniform float u_Tilesize; // Determines surflet size
uniform vec4 u_Inputs;  // Passes inputs to adjust noise outputs
                        // passed in the format [lumpheight, bubbleheight, rippleheight, ripplefrequency]

in vec4 vs_Pos;             // The array of vertex positions passed to the shader

in vec4 vs_Nor;             // The array of vertex normals passed to the shader

in vec4 vs_Col;             // The array of vertex colors passed to the shader.

out vec4 fs_Nor;            // The array of normals that has been transformed by u_ModelInvTr. This is implicitly passed to the fragment shader.
out vec4 fs_LightVec;       // The direction in which our virtual light lies, relative to each vertex. This is implicitly passed to the fragment shader.
out vec4 fs_Col;            // The color of each vertex. This is implicitly passed to the fragment shader.

out float fs_BumpHeight;    // These are the height values of the noise so the fragment shader can color based on height
out float fs_BubbleHeight;
out float fs_RippleHeight;
out float fs_Cloud;

const vec4 lightPos = vec4(5, 5, 3, 1); //The position of our virtual light, which is used to compute the shading of
                                        //the geometry in the fragment shader.


//3D random number
vec3 random3( vec3 p ) {
    return normalize(2.0 * fract(sin(vec3(dot(p,vec3(127.1,311.7, 55.8)),dot(p,vec3(269.5,183.3, 213.9)), dot(p, vec3(303.1, 96.8, 173.4))))*43758.5453) - 1.0);
}

//Modified surflets for 3 dimensions
float surflet(vec3 P, vec3 gridPoint)
{
    // Compute falloff function by converting linear distance to a polynomial
    float distX = abs(P.x - gridPoint.x);
    float distY = abs(P.y - gridPoint.y);
    float distZ = abs(P.z - gridPoint.z);
    float tX = 1.f - 6.f * pow(distX, 5.0) + 15.f * pow(distX, 4.0) - 10.f * pow(distX, 3.0);
    float tY = 1.f - 6.f * pow(distY, 5.0) + 15.f * pow(distY, 4.0) - 10.f * pow(distY, 3.0);
    float tZ = 1.f - 6.f * pow(distZ, 5.0) + 15.f * pow(distZ, 4.0) - 10.f * pow(distZ, 3.0);

    // Get the random vector for the grid point
    vec3 gradient = random3(gridPoint);
    // Get the vector from the grid point to P
    vec3 diff = P - gridPoint;
    // Get the value of our height field by dotting grid->P with our gradient
    float height = dot(diff, gradient);
    // Scale our height field by the polynomial (might need adjusting)
    return height * tX * tY * tZ;
}

// Perlin noise modified for 3 dimensions
float PerlinNoise(vec3 pos)
{
    // Tile the space
    vec3 posXLYLZL = floor(pos / u_Tilesize) * u_Tilesize;
    vec3 posXHYLZL = posXLYLZL + vec3(u_Tilesize,0,0);
    vec3 posXHYHZL = posXLYLZL + vec3(u_Tilesize,u_Tilesize,0);
    vec3 posXLYHZL = posXLYLZL + vec3(0,u_Tilesize,0);
    vec3 posXLYLZH = posXLYLZL + vec3(0,0,u_Tilesize);
    vec3 posXHYLZH = posXLYLZL + vec3(u_Tilesize,0,u_Tilesize);
    vec3 posXHYHZH = posXLYLZL + vec3(u_Tilesize,u_Tilesize,u_Tilesize);
    vec3 posXLYHZH = posXLYLZL + vec3(0,u_Tilesize,u_Tilesize);

    return surflet(pos, posXLYLZL) + surflet(pos, posXHYLZL) + surflet(pos, posXHYHZL) + surflet(pos, posXLYHZL) +
            surflet(pos, posXLYLZH) + surflet(pos, posXHYLZH) + surflet(pos, posXHYHZH) + surflet(pos, posXLYHZH);
}


void main()
{
    fs_Col = vs_Col;                         // Pass the vertex colors to the fragment shader for interpolation

    mat3 invTranspose = mat3(u_ModelInvTr);

    vec4 transNor = vec4(invTranspose * vec3(vs_Nor), 0);

    fs_Nor = transNor;          // Pass the vertex normals to the fragment shader for interpolation.
                                                            // Transform the geometry's normals by the inverse transpose of the
                                                            // model matrix. This is necessary to ensure the normals remain
                                                            // perpendicular to the surface after the surface is transformed by
                                                            // the model matrix.


    vec4 modelposition = u_Model * vs_Pos;   // Temporarily store the transformed vertex positions for use below


    // Get noise values based on position and time
    float perlin = PerlinNoise(vec3(modelposition) + u_Time * 0.0005); // basic moving lumps/bulges

    float perlin2 = PerlinNoise(vec3(modelposition) * (perlin * u_Inputs.w * 2.f)); // creates a bunch of ripples using noise as an input

    float perlin3 = PerlinNoise(vec3(modelposition) + u_Time * 0.0002); // using this basic perlin as an input for the next line
    float adjperlin = max(perlin3 - 0.2, 0.f) * 15.f * perlin; // if noise isnt above 0.2 dont add it. Creates bubbles(idk what to call it)

    fs_BumpHeight = 0.2f * perlin * u_Inputs.x;
    fs_BubbleHeight = 0.2f * adjperlin * u_Inputs.y; 
    fs_RippleHeight = 0.2f * perlin2 * u_Inputs.z;


    float noiseHeight = 0.2f * (perlin * u_Inputs.x + adjperlin * u_Inputs.y + perlin2 * u_Inputs.z);

    // Modify positions by the abs of the perlin value in the direction of their normal
    modelposition = modelposition + noiseHeight * transNor;

    fs_Cloud = PerlinNoise(vec3(modelposition) + (u_Time * 0.0002));

    fs_LightVec = lightPos - modelposition;  // Compute the direction in which the light source lies

    gl_Position = u_ViewProj * modelposition;// gl_Position is a built-in variable of OpenGL which is
                                             // used to render the final positions of the geometry's vertices
}
