// server/gameGenerator.js

// Structure for dynamically-generated challenge
// (This is just for documentation, TypeScript types not needed in JS)

// --- BUG TEMPLATE 1: Variable Typo (Pemboleh Ubah) ---
const typoTemplates = [
  {
    vars: ['nama', 'umur', 'markah', 'jumlah', 'hasil', 'nilai', 'data', 'senarai'],
    template: (v_correct, v_buggy) => ({
      title: { en: 'Variable Typo', ms: 'Kesilapan Ejaan Pemboleh Ubah' },
      description: { 
        en: 'Find the typo in the variable name.', 
        ms: 'Cari kesilapan ejaan dalam nama pemboleh ubah.' 
      },
      codeBlock: `let ${v_correct} = "Pelajar";\n\nfor (let i = 0; i < 5; i++) {\n  console.log(${v_buggy});\n}`,
      buggyLineIndex: 3, // Line 3: console.log(${v_buggy})
      explanation: { 
        en: `The variable was spelled "${v_buggy}" instead of "${v_correct}".`,
        ms: `Pemboleh ubah dieja "${v_buggy}" dan bukannya "${v_correct}".` 
      },
    }),
  },
  {
    vars: ['nilai', 'jumlah', 'hasil'],
    template: (v_correct, v_buggy) => ({
      title: { en: 'Variable Typo in Calculation', ms: 'Kesilapan Ejaan dalam Pengiraan' },
      description: { 
        en: 'Find the typo that breaks the calculation.', 
        ms: 'Cari kesilapan ejaan yang merosakkan pengiraan.' 
      },
      codeBlock: `let ${v_correct} = 0;\nfor (let i = 1; i <= 10; i++) {\n  ${v_correct} += i;\n}\nconsole.log("Hasil:", ${v_buggy});`,
      buggyLineIndex: 4,
      explanation: { 
        en: `The variable "${v_buggy}" on line 4 should be "${v_correct}".`,
        ms: `Pemboleh ubah "${v_buggy}" pada baris 4 sepatutnya "${v_correct}".` 
      },
    }),
  },
];

// --- BUG TEMPLATE 2: Infinite Loop (Struktur Kawalan) ---
const loopTemplates = [
  {
    buggyLine: 1,
    code: `function kira() {\n  for (let i = 0; i < 5; i--) {\n    console.log(i);\n  }\n}`,
    explanation: { 
      en: "The loop used `i--` instead of `i++`, so it will never reach 5.",
      ms: "Gelung ini menggunakan `i--` dan bukannya `i++`, jadi ia tidak akan mencapai 5."
    }
  },
  {
    buggyLine: 3,
    code: `let i = 0;\nwhile (i < 5) {\n  console.log("Jalan");\n  // Lupa untuk tambah i\n}`,
    explanation: { 
      en: "The loop is missing `i++` inside the 'while' block, so `i` never changes.",
      ms: "Gelung ini tiada `i++` di dalam blok 'while', jadi `i` tidak pernah berubah."
    }
  },
  {
    buggyLine: 1,
    code: `for (let i = 10; i > 0; i++) {\n  console.log(i);\n}`,
    explanation: { 
      en: "The loop used `i++` instead of `i--` for a countdown loop.",
      ms: "Gelung kiraan balik ini menggunakan `i++` dan bukannya `i--`."
    }
  },
];

// --- BUG TEMPLATE 3: Missing Return Statement ---
const returnTemplates = [
  {
    funcName: 'add',
    params: ['a', 'b'],
    code: `function add(a, b) {\n  const sum = a + b;\n}\n\nconsole.log(add(2, 3));`,
    buggyLine: 0,
    explanation: {
      en: "The function calculates the sum but doesn't return it.",
      ms: "Fungsi mengira jumlah tetapi tidak memulangkannya."
    }
  },
  {
    funcName: 'multiply',
    params: ['x', 'y'],
    code: `function multiply(x, y) {\n  const result = x * y;\n}\n\nconsole.log(multiply(5, 4));`,
    buggyLine: 0,
    explanation: {
      en: "The function calculates the product but doesn't return it.",
      ms: "Fungsi mengira hasil darab tetapi tidak memulangkannya."
    }
  },
  {
    funcName: 'calculate',
    params: ['num'],
    code: `function calculate(num) {\n  const doubled = num * 2;\n}\n\nconsole.log(calculate(5));`,
    buggyLine: 0,
    explanation: {
      en: "The function calculates doubled but doesn't return it.",
      ms: "Fungsi mengira ganda dua tetapi tidak memulangkannya."
    }
  },
];

// --- BUG TEMPLATE 4: Wrong Comparison Operator ---
const comparisonTemplates = [
  {
    code: `function checkAge(age) {\n  if (age = 18) {\n    return "Adult";\n  }\n  return "Minor";\n}`,
    buggyLine: 1,
    explanation: {
      en: "Line 1 uses assignment (`=`) instead of comparison (`===` or `==`).",
      ms: "Baris 1 menggunakan penugasan (`=`) bukan perbandingan (`===` atau `==`)."
    }
  },
  {
    code: `let nilai = 10;\nif (nilai = 5) {\n  console.log("Betul");\n}`,
    buggyLine: 1,
    explanation: {
      en: "Line 1 uses assignment (`=`) instead of comparison (`===`).",
      ms: "Baris 1 menggunakan penugasan (`=`) bukan perbandingan (`===`)."
    }
  },
  {
    code: `function isEven(num) {\n  if (num = 0) {\n    return true;\n  }\n  return num % 2 === 0;\n}`,
    buggyLine: 1,
    explanation: {
      en: "Line 1 uses assignment (`=`) instead of comparison (`===`).",
      ms: "Baris 1 menggunakan penugasan (`=`) bukan perbandingan (`===`)."
    }
  },
];

// --- Helper Functions ---
function generateTypoChallenge() {
  const t = typoTemplates[Math.floor(Math.random() * typoTemplates.length)];
  const v_correct = t.vars[Math.floor(Math.random() * t.vars.length)];
  
  // Create a random buggy version (remove a character or swap)
  let v_buggy = v_correct;
  const bugType = Math.random();
  
  if (bugType < 0.5 && v_correct.length > 3) {
    // Remove a middle character
    const removeIndex = Math.floor(Math.random() * (v_correct.length - 2)) + 1;
    v_buggy = v_correct.substring(0, removeIndex) + v_correct.substring(removeIndex + 1);
  } else if (v_correct.length > 2) {
    // Remove last character
    v_buggy = v_correct.substring(0, v_correct.length - 1);
  } else {
    // Swap first two characters
    v_buggy = v_correct[1] + v_correct[0] + v_correct.substring(2);
  }
  
  if (v_buggy === v_correct) {
    // Fallback: just remove last char
    v_buggy = v_correct.substring(0, Math.max(1, v_correct.length - 1));
  }
  
  const challenge = t.template(v_correct, v_buggy);
  return { ...challenge, basePoints: 1000 };
}

function generateLoopChallenge() {
  const t = loopTemplates[Math.floor(Math.random() * loopTemplates.length)];
  return {
    title: { en: "Infinite Loop", ms: "Gelung Tidak Berpenghujung" },
    description: { 
      en: "Find the bug that causes this loop to run forever.", 
      ms: "Cari baris kod yang menyebabkan gelung ini berjalan selama-lamanya." 
    },
    codeBlock: t.code,
    buggyLineIndex: t.buggyLine,
    explanation: t.explanation,
    basePoints: 1200
  };
}

function generateReturnChallenge() {
  const t = returnTemplates[Math.floor(Math.random() * returnTemplates.length)];
  return {
    title: { en: "Missing Return Statement", ms: "Pernyataan Pulangan Yang Hilang" },
    description: { 
      en: "Find the function that is missing a return statement.", 
      ms: "Cari fungsi yang hilang pernyataan pulangan." 
    },
    codeBlock: t.code,
    buggyLineIndex: t.buggyLine,
    explanation: t.explanation,
    basePoints: 1100
  };
}

function generateComparisonChallenge() {
  const t = comparisonTemplates[Math.floor(Math.random() * comparisonTemplates.length)];
  return {
    title: { en: "Wrong Comparison Operator", ms: "Operator Perbandingan Yang Salah" },
    description: { 
      en: "Find the line with the wrong comparison operator.", 
      ms: "Cari baris dengan operator perbandingan yang salah." 
    },
    codeBlock: t.code,
    buggyLineIndex: t.buggyLine,
    explanation: t.explanation,
    basePoints: 1000
  };
}

// --- MAIN GENERATOR FUNCTION ---
function generateRandomDebugChallenge() {
  const allGenerators = [
    generateTypoChallenge, 
    generateLoopChallenge,
    generateReturnChallenge,
    generateComparisonChallenge,
  ];
  
  const randomGenerator = allGenerators[Math.floor(Math.random() * allGenerators.length)];
  return randomGenerator();
}

// Export for use in server/index.js
module.exports = {
  generateRandomDebugChallenge,
};



