const { readFileSync, writeFileSync, readdirSync, rmSync, existsSync, mkdirSync } = require('fs');
const sharp = require('sharp');

// Input
const numNfts = 1000;
const outputSize = 256;

const template = `
    <svg width="${outputSize}" height="${outputSize}" viewBox="0 0 ${outputSize} ${outputSize}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- bg -->
        <!-- head -->
        <!-- hair -->
        <!-- eyes -->
        <!-- nose -->
        <!-- mouth -->
        <!-- beard -->
    </svg>
`;
const takenFaces = new Set();

function randInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

function getLayer(name, skip=0.0) {
    const svg = readFileSync(`./layers/${name}.svg`, 'utf-8');
    const re = /(?<=\<svg\s*[^>]*>)([\s\S]*?)(?=\<\/svg\>)/g;
    const layer = svg.match(re)[0];
    return Math.random() > skip ? layer : '';
}

async function svgToPng(name) {
    const src = `./out/${name}.svg`;
    const dest = `./out/${name}.png`;

    const img = await sharp(src);
    const resized = await img.resize(1024);
    await resized.toFile(dest);
}


function createImage(idx) {

    const bg = randInt(5);
    const hair = randInt(7);
    const eyes = randInt(9);
    const nose = randInt(4); 
    const mouth = randInt(5);
    const beard = randInt(3);

    const face = [hair, eyes, mouth, nose, beard].join('');

    if (takenFaces.has(face)) {
        createImage();
    } else {
        takenFaces.add(face);

        const final = template
            .replace('<!-- bg -->', getLayer(`bg${bg}`))
            .replace('<!-- head -->', getLayer('head0'))
            .replace('<!-- hair -->', getLayer(`hair${hair}`))
            .replace('<!-- eyes -->', getLayer(`eyes${eyes}`))
            .replace('<!-- nose -->', getLayer(`nose${nose}`))
            .replace('<!-- mouth -->', getLayer(`mouth${mouth}`))
            .replace('<!-- beard -->', getLayer(`beard${beard}`, 0.5))

        const meta = {
            name: `Person ${idx}`,
            description: `A drawing of Person ${idx}`,
            image: `${idx}.png`,
            attributes: [
                { 
                    beard: '',
                    rarity: 0.5
                }
            ]
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
