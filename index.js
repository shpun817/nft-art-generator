const { readFileSync, writeFileSync, readdirSync, rmSync, existsSync, mkdirSync } = require('fs');
const sharp = require('sharp');

// Input
const desiredNumNfts = 1000;
const outputSize = 256;
const layersFolderPath = "./layers";
const traits = [
    { name: "bg", numVariants: 5 },
    { name: "head", numVariants: 1 },
    { name: "hair", numVariants: 7 },
    { name: "eyes", numVariants: 9 },
    { name: "nose", numVariants: 4 },
    { name: "mouth", numVariants: 5 },
    { name: "beard", numVariants: 3 },
];
// End of Input

const numNfts = Math.min(
    desiredNumNfts,
    traits.reduce((n, {numVariants}) => {return n * numVariants}, 1)
);

const template = `
    <svg width="${outputSize}" height="${outputSize}" viewBox="0 0 ${outputSize} ${outputSize}" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${
        traits.reduce((str, trait) => {
            str += `<!-- ${trait.name} -->`;
            return str;
        }, "")
    }
    </svg>
`;

const takenFaces = new Set();

// Excluding current value
const cumulativeNumVariants = traits.map((_, i, arr) => {
    let value = 1;
    for (let j = 0; j < i; ++j) {
        value *= arr[j].numVariants;
    }
    return value;
});

function quotient(x, divisor) {
    return Math.trunc(x / divisor);
}

function idxToFace(idx) {
    const face = [];

    for (let i = 0; i < traits.length; ++i) {
        face.push(quotient(idx, cumulativeNumVariants[i]) % traits[i].numVariants);
    }

    return {face, faceString: face.join('-')};
}

function getLayer(traitName, fileName) {
    const svg = readFileSync(`${layersFolderPath}/${traitName}/${fileName}.svg`, 'utf-8');
    const re = /(?<=\<svg\s*[^>]*>)([\s\S]*?)(?=\<\/svg\>)/g;
    return svg.match(re)[0];
}

async function svgToPng(name) {
    const src = `./out/${name}.svg`;
    const dest = `./out/${name}.png`;

    const img = sharp(src);
    const resized = img.resize(1024);
    await resized.toFile(dest);
}


function createImage(idx) {

    const {face, faceString} = idxToFace(idx);

    if (takenFaces.has(faceString)) {
        createImage();
    } else {
        takenFaces.add(faceString);

        const final = traits.reduce((svg, trait, i) => {
            return svg.replace(`<!-- ${trait.name} -->`, getLayer(trait.name, trait.name + face[i]));
        }, template);

        const meta = {
            name: `Person ${idx}`,
            description: `A drawing of Person ${idx}`,
            image: `${idx}.png`,
        };
        writeFileSync(`./out/${idx}.json`, JSON.stringify(meta))
        writeFileSync(`./out/${idx}.svg`, final)
        svgToPng(idx)
    }
}

// Create dir if not exists
if (!existsSync('./out')){
    mkdirSync('./out');
}

// Cleanup dir before each run
readdirSync('./out').forEach(f => rmSync(`./out/${f}`));

for (let i = 0; i < numNfts; ++i) {
    createImage(i);
}

const numUniqueNfts = takenFaces.size;
if (numUniqueNfts === numNfts) {
    console.log(`${numNfts} unique nft's generated.`);
} else {
    console.error(`Some generated nft's are not unique. Unique: ${numUniqueNfts}; Generated: ${numNfts}`);
}
