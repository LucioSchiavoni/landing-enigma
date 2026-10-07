import sharp from 'sharp';

const crops = [
  { from: 'src/assets/team/original/lucio.jpg', to: 'src/assets/team/lucio.jpg', left: 0, top: 37, size: 774 },
  { from: 'src/assets/team/original/maxi.jpeg', to: 'src/assets/team/maxi.jpg', left: 320, top: 240, size: 1000 },
];

for (const { from, to, left, top, size } of crops) {
  await sharp(from)
    .rotate()
    .extract({ left, top, width: size, height: size })
    .resize(900, 900)
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(to);
  console.log(`${to} (${size}px desde ${left},${top})`);
}
