export const loadOBJ = async (filePath: string) =>
{
    // Read file
    const response = await fetch(filePath)
    .then(response => response.text())
    .then(fileContents => 
    {
        let positions = [] as any;
        let normals = [] as any;

        let vertices = [] as any;
        let indices = [] as any;
        let currentIndex: number = 0;

        let fileString = fileContents.split("\n");

        // Loop through each line
        for(let i = 0; i < fileString.length; i++)
        {
            // Split lines
            let lineString = fileString[i].split(" ");

            // Vertex positions
            if(lineString[0] == "v")
            {
                positions.push(
                [
                    parseFloat(lineString[1]), 
                    parseFloat(lineString[2]), 
                    parseFloat(lineString[3])
                ]);
            }
            // Normals
            else if(lineString[0] == "vn")
            {
                normals.push(
                [
                    parseFloat(lineString[1]),
                    parseFloat(lineString[2]),
                    parseFloat(lineString[3]),
                ]);
            }
            // Face
            else if(lineString[0] == "f")
            {
                // Go through each vertex
                for(let j = 1; j < lineString.length; j++)
                {
                    let wordString = lineString[j].split("/");

                    // Vertex data
                    vertices.push(positions[parseFloat(wordString[0]) - 1]);
                    vertices.push(normals[parseFloat(wordString[2]) - 1]);

                    // Re-add indices for Quads
                    if(j >= 4)
                    {
                        let firstIndex = indices[indices.length - 3];
                        let thirdIndex = indices[indices.length - 1];

                        indices.push(firstIndex);
                        indices.push(thirdIndex);
                    }

                    // Next index
                    indices.push(currentIndex);
                    currentIndex++;
                }
            }
        }

        // Create usable arrays
        const vertexData = new Float32Array(vertices.flat());
        const indexData = new Uint32Array(indices.flat());
    
        return {
            vertexData,
            indexData
        };
    });

    return response;
}