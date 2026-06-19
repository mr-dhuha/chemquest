const fs = require('fs');
const path = require('path');

const buretPath = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\d9ffda58-089d-4510-ad2c-33233346c072\\buret_illustration_1781851643926.png';
const beakerPath = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\d9ffda58-089d-4510-ad2c-33233346c072\\beaker_mixing_1781851658254.png';
const rustPath = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\d9ffda58-089d-4510-ad2c-33233346c072\\rusted_nail_1781851668082.png';

const toBase64 = (file) => {
  if (fs.existsSync(file)) {
    return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
  }
  return null;
};

const questions = [
  {
    q: "Perhatikan gambar alat laboratorium di atas. Alat ini biasanya digunakan untuk mengukur volume cairan dengan sangat teliti, terutama saat proses titrasi. Apakah nama alat tersebut?",
    options: ["Buret", "Pipet Volum", "Gelas Ukur", "Erlenmeyer"],
    answer: "Buret",
    category: "Pahami Konsep",
    imageBase64: toBase64(buretPath),
    caption: "Alat Laboratorium Kaca dengan Skala"
  },
  {
    q: "Larutan asam klorida (HCl) 0,1 M sebanyak 50 mL dicampur dengan larutan natrium hidroksida (NaOH) 0,1 M sebanyak 50 mL di dalam gelas kimia seperti ilustrasi di atas. Berapakah pH campuran tersebut?",
    options: ["pH 1", "pH 7", "pH 13", "pH 14"],
    answer: "pH 7",
    category: "Selesaikan Masalah",
    imageBase64: toBase64(beakerPath),
    caption: "Reaksi Asam Basa"
  },
  {
    q: "Gambar di atas menunjukkan proses pembentukan karat pada paku besi. Dalam ilmu kimia, reaksi pembentukan karat ini merupakan contoh nyata dari...",
    options: ["Reaksi Asam Basa", "Reaksi Redoks", "Reaksi Pengendapan", "Reaksi Hidrolisis"],
    answer: "Reaksi Redoks",
    category: "Kaitkan Kehidupan",
    imageBase64: toBase64(rustPath),
    caption: "Korosi pada Besi"
  }
];

const fileContent = `export const sampleQuestions = ${JSON.stringify(questions, null, 2)};\n`;

const targetDir = path.join(__dirname, 'src', 'data');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(path.join(targetDir, 'sampleQuestions.js'), fileContent);
console.log('Successfully generated src/data/sampleQuestions.js');
