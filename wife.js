const images = ["img1.jpeg", "img2.webp", "img3.jpeg","img4.webp","img5.webp","img6.webp"];
let index = 0;

const slide = document.getElementById("slide");

document.getElementById("next").onclick = () => {
  index = (index + 1) % images.length;
  slide.src = images[index];
};

document.getElementById("prev").onclick = () => {
  index = (index - 1 + images.length) % images.length;
  slide.src = images[index];
};
