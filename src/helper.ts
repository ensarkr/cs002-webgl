// random color that can be seen on black background
const getRandomColor = (): [number, number, number, number] => {
  while (true) {
    const randomColor = Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0");
    const hexcolor = randomColor;
    const r = parseInt(hexcolor.slice(0, 2), 16);
    const g = parseInt(hexcolor.slice(2, 4), 16);
    const b = parseInt(hexcolor.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;

    if (yiq >= 128) return [r / 255, g / 255, b / 255, 1];
  }
};

export { getRandomColor };
