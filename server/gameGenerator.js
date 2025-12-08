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
        en: `The variable is declared as "${v_correct}" but used incorrectly as "${v_buggy}" in the code. Click the line where the variable name is spelled wrong, then choose the fix that uses the correct spelling "${v_correct}".`, 
        ms: `Pemboleh ubah diisytiharkan sebagai "${v_correct}" tetapi digunakan secara salah sebagai "${v_buggy}" dalam kod. Klik baris di mana nama pemboleh ubah salah eja, kemudian pilih pembetulan yang menggunakan ejaan betul "${v_correct}".` 
      },
      codeBlock: `let ${v_correct} = "Pelajar";\n\nfor (let i = 0; i < 5; i++) {\n  console.log(${v_buggy});\n}`,
      buggyLineIndex: 3, // Line 3: console.log(${v_buggy})
      explanation: { 
        en: `The variable was declared as "${v_correct}" on line 1, but incorrectly used as "${v_buggy}" on line 4. Variable names must match exactly.`,
        ms: `Pemboleh ubah diisytiharkan sebagai "${v_correct}" pada baris 1, tetapi digunakan secara salah sebagai "${v_buggy}" pada baris 4. Nama pemboleh ubah mesti sama persis.` 
      },
    }),
  },
  {
    vars: ['nilai', 'jumlah', 'hasil'],
    template: (v_correct, v_buggy) => ({
      title: { en: 'Variable Typo in Calculation', ms:'Kesilapan Ejaan dalam Pengiraan' },
      description: { 
        en: `The variable "${v_correct}" is correctly used in the loop, but on the last line it's misspelled as "${v_buggy}". Find the line with the spelling mistake and fix it.`, 
        ms: `Pemboleh ubah "${v_correct}" digunakan dengan betul dalam gelung, tetapi pada baris terakhir ia tersilap eja sebagai "${v_buggy}". Cari baris dengan kesilapan ejaan dan betulkannya.` 
      },
      codeBlock: `let ${v_correct} = 0;\nfor (let i = 1; i <= 10; i++) {\n  ${v_correct} += i;\n}\nconsole.log("Hasil:", ${v_buggy});`,
      buggyLineIndex: 4,
      explanation: { 
        en: `The variable "${v_buggy}" on line 5 should be spelled "${v_correct}" to match the declaration.`,
        ms: `Pemboleh ubah "${v_buggy}" pada baris 5 sepatutnya dieja "${v_correct}" untuk sepadan dengan pengisytiharan.` 
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

// --- BUG TEMPLATE 5: Wrong Comparison (Assignment in Condition) ---
const wrongComparisonTemplates = [
  {
    code: `if (score = 100) {\n  console.log("Perfect!");\n}`,
    buggyLine: 0,
    explanation: {
      en: "Single = assigns a value. Use == or === to compare values.",
      ms: "Tanda = tunggal menugaskan nilai. Gunakan == atau === untuk membandingkan nilai."
    }
  },
];

// --- BUG TEMPLATE 6: String Math (Type Coercion) ---
const stringMathTemplates = [
  {
    code: `let total = "10" + 5;\nconsole.log(total); // Result is 105`,
    buggyLine: 0,
    explanation: {
      en: "Adding a number to a string performs concatenation. Convert the string to a number first using parseInt().",
      ms: "Menambah nombor kepada rentetan melakukan penyambungan. Tukar rentetan kepada nombor terlebih dahulu menggunakan parseInt()."
    }
  },
  {
    code: `let result = "5" + 3 + 2;\nconsole.log(result); // Result is 532`,
    buggyLine: 0,
    explanation: {
      en: "Adding a number to a string performs concatenation. Convert the string to a number first using parseInt().",
      ms: "Menambah nombor kepada rentetan melakukan penyambungan. Tukar rentetan kepada nombor terlebih dahulu menggunakan parseInt()."
    }
  },
];

// --- BUG TEMPLATE 7: Off By One Error ---
const offByOneTemplates = [
  {
    code: `let arr = [1, 2, 3];\nconsole.log(arr[3]);`,
    buggyLine: 1,
    explanation: {
      en: "Array indices start at 0. The last item in an array of length 3 is at index 2.",
      ms: "Indeks tatasusunan bermula pada 0. Item terakhir dalam tatasusunan panjang 3 berada pada indeks 2."
    }
  },
  {
    code: `let numbers = [10, 20, 30];\nfor (let i = 0; i <= numbers.length; i++) {\n  console.log(numbers[i]);\n}`,
    buggyLine: 1,
    explanation: {
      en: "Array indices start at 0. The loop should use < instead of <= to avoid accessing index 3.",
      ms: "Indeks tatasusunan bermula pada 0. Gelung sepatutnya menggunakan < dan bukannya <= untuk mengelakkan akses indeks 3."
    }
  },
];

// --- BUG TEMPLATE 8: Unreachable Code ---
const unreachableCodeTemplates = [
  {
    code: `function test() {\n  return true;\n  console.log("Done");\n}`,
    buggyLine: 1,
    explanation: {
      en: "The return statement ends the function immediately. Any code after it is ignored.",
      ms: "Pernyataan return menamatkan fungsi dengan segera. Sebarang kod selepasnya diabaikan."
    }
  },
  {
    code: `function calculate() {\n  return 10;\n  let result = 5 * 2;\n  return result;\n}`,
    buggyLine: 1,
    explanation: {
      en: "The return statement ends the function immediately. Any code after it is ignored.",
      ms: "Pernyataan return menamatkan fungsi dengan segera. Sebarang kod selepasnya diabaikan."
    }
  },
];

// --- BUG TEMPLATE 9: Variable Scope ---
const variableScopeTemplates = [
  {
    code: `if (true) {\n  let message = "Hi";\n}\nconsole.log(message);`,
    buggyLine: 3,
    explanation: {
      en: "Variables declared with let only exist inside the {} block where they were created.",
      ms: "Pemboleh ubah yang diisytiharkan dengan let hanya wujud di dalam blok {} di mana ia dicipta."
    }
  },
  {
    code: `for (let i = 0; i < 5; i++) {\n  let count = i;\n}\nconsole.log(count);`,
    buggyLine: 3,
    explanation: {
      en: "Variables declared with let only exist inside the {} block where they were created.",
      ms: "Pemboleh ubah yang diisytiharkan dengan let hanya wujud di dalam blok {} di mana ia dicipta."
    }
  },
];

// --- Helper Functions ---

/**
 * Generate fix options with 1 correct answer and 2 distractors
 * Returns object with correctFix and fixOptions array
 */
function generateFixOptions(correctFix, distractors) {
  // Shuffle the options so correct answer isn't always in the same position
  const allOptions = [correctFix, ...distractors];
  for (let i = allOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
  }
  
  return {
    correctFix: correctFix,
    fixOptions: allOptions
  };
}

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
  const codeLines = challenge.codeBlock.split('\n');
  const buggyLine = codeLines[challenge.buggyLineIndex];
  
  // Generate fix options for the typo
  const correctFix = buggyLine.replace(v_buggy, v_correct);
  const distractors = [
    buggyLine, // Keep the buggy version as distractor
    buggyLine.replace(v_buggy, v_buggy + 's') // Add 's' to make another wrong version
  ];
  
  const fixData = generateFixOptions(correctFix, distractors);
  
  return { 
    ...challenge, 
    ...fixData,
    basePoints: 1000 
  };
}


function generateLoopChallenge() {
  const t = loopTemplates[Math.floor(Math.random() * loopTemplates.length)];
  const codeLines = t.code.split('\n');
  const buggyLine = codeLines[t.buggyLine];
  
  // Generate fix options based on the loop type
  let correctFix, distractors;
  if (buggyLine.includes('i--') && buggyLine.includes('< 5')) {
    correctFix = buggyLine.replace('i--', 'i++');
    distractors = [
      buggyLine.replace('< 5', '<= 5'),
      buggyLine.replace('i--', 'i = i + 1')
    ];
  } else if (buggyLine.includes('i > 0') && buggyLine.includes('i++')) {
    correctFix = buggyLine.replace('i++', 'i--');
    distractors = [
      buggyLine.replace('i > 0', 'i >= 0'),
      buggyLine
    ];
  } else {
    correctFix = buggyLine + '  i++;';
    distractors = [
      buggyLine + '  i--;',
      buggyLine
    ];
  }
  
  const fixData = generateFixOptions(correctFix, distractors);
  
  return {
    title: { en: "Infinite Loop", ms: "Gelung Tidak Berpenghujung" },
    description: { 
      en: "This loop will run forever! The loop condition or increment is wrong. Find the line that causes the infinite loop and choose the fix that makes it stop correctly.", 
      ms: "Gelung ini akan berjalan selama-lamanya! Syarat atau pertambahan gelung adalah salah. Cari baris yang menyebabkan gelung tidak berpenghujung dan pilih pembetulan yang membuatnya berhenti dengan betul." 
    },
    codeBlock: t.code,
    buggyLineIndex: t.buggyLine,
    explanation: t.explanation,
    basePoints: 1200
  };
}

function generateReturnChallenge() {
  const t = returnTemplates[Math.floor(Math.random() * returnTemplates.length)];
  const codeLines = t.code.split('\n');
  const buggyLine = codeLines[t.buggyLine];
  
  // Generate fix for missing return
  const varName = buggyLine.match(/const (\w+) =/)?.[1] || 'result';
  const correctFix = buggyLine + '\n  return ' + varName + ';';
  const distractors = [
    buggyLine + '\n  console.log(' + varName + ');',
    buggyLine
  ];
  
  const fixData = generateFixOptions(correctFix, distractors);
  
  return {
    title: { en: "Missing Return Statement", ms: "Pernyataan Pulangan Yang Hilang" },
    description: { 
      en: "This function calculates a value but doesn't return it, so it returns 'undefined'. Find where the return statement is missing and add it to return the calculated value.", 
      ms: "Fungsi ini mengira nilai tetapi tidak memulangkannya, jadi ia memulangkan 'undefined'. Cari di mana pernyataan pulangan hilang dan tambahnya untuk memulangkan nilai yang dikira." 
    },
    codeBlock: t.code,
    buggyLineIndex: t.buggyLine,
    explanation: t.explanation,
    ...fixData,
    basePoints: 1100
  };
}

function generateComparisonChallenge() {
  const t = comparisonTemplates[Math.floor(Math.random() * comparisonTemplates.length)];
  const codeLines = t.code.split('\n');
  const buggyLine = codeLines[t.buggyLine];
  
  // Fix the assignment operator to comparison
  const correctFix = buggyLine.replace(' = ', ' === ');
  const distractors = [
    buggyLine.replace(' = ', ' == '),
    buggyLine
  ];
  
  const fixData = generateFixOptions(correctFix, distractors);
  
  return {
    title: { en: "Wrong Comparison Operator", ms: "Operator Perbandingan Yang Salah" },
    description: { 
      en: "The 'if' statement uses '=' (assignment) instead of '===' (comparison). This changes the variable instead of checking it. Find the line with the wrong operator and fix it.", 
      ms: "Pernyataan 'if' menggunakan '=' (penetapan) dan bukannya '===' (perbandingan). Ini mengubah pemboleh ubah dan bukannya memeriksanya. Cari baris dengan operator yang salah dan betulkannya." 
    },
    codeBlock: t.code,
    buggyLineIndex: t.buggyLine,
    explanation: t.explanation,
    ...fixData,
    basePoints: 1000
  };
}

function generateWrongComparisonChallenge() {
  const t = wrongComparisonTemplates[Math.floor(Math.random() * wrongComparisonTemplates.length)];
  const codeLines = t.code.split('\n');
  const buggyLine = codeLines[t.buggyLine];
  
  // Fix assignment to comparison
  const correctFix = buggyLine.replace(' = ', ' === ');
  const distractors = [
    buggyLine.replace(' = ', ' == '),
    buggyLine.replace(' = ', ' != ')
  ];
  
  const fixData = generateFixOptions(correctFix, distractors);
  
  return {
    title: { en: "Wrong Comparison", ms: "Perbandingan Yang Salah" },
    description: { 
      en: "Find the line with the wrong comparison operator.", 
      ms: "Cari baris dengan operator perbandingan yang salah." 
    },
    codeBlock: t.code,
    buggyLineIndex: t.buggyLine,
    explanation: t.explanation,
    ...fixData,
    basePoints: 1000
  };
}

function generateStringMathChallenge() {
  const t = stringMathTemplates[Math.floor(Math.random() * stringMathTemplates.length)];
  const codeLines = t.code.split('\n');
  const buggyLine = codeLines[t.buggyLine];
  
  // Fix string concatenation issue by parsing to int
  const correctFix = buggyLine.replace('"10"', 'parseInt("10")').replace('"5"', 'parseInt("5")');
  const distractors = [
    buggyLine.replace('"10"', '10').replace('"5"', '5'),
    buggyLine
  ];
  
  const fixData = generateFixOptions(correctFix, distractors);
  
  return {
    title: { en: "String Math", ms: "Matematik Rentetan" },
    description: { 
      en: "Numbers in quotes are treated as text (strings), not numbers. When you add strings, they join together instead of calculating. Find the line doing math with strings and convert them to numbers.", 
      ms: "Nombor dalam petikan dianggap sebagai teks (rentetan), bukan nombor. Apabila anda tambah rentetan, ia bergabung dan bukannya mengira. Cari baris yang membuat matematik dengan rentetan dan tukarkannya kepada nombor." 
    },
    codeBlock: t.code,
    buggyLineIndex: t.buggyLine,
    explanation: t.explanation,
    ...fixData,
    basePoints: 1100
  };
}

function generateOffByOneChallenge() {
  const t = offByOneTemplates[Math.floor(Math.random() * offByOneTemplates.length)];
  const codeLines = t.code.split('\n');
  const buggyLine = codeLines[t.buggyLine];
  
  // Fix off-by-one error
  let correctFix, distractors;
  if (buggyLine.includes('[3]')) {
    correctFix = buggyLine.replace('[3]', '[2]');
    distractors = [
      buggyLine.replace('[3]', '[0]'),
      buggyLine
    ];
  } else if (buggyLine.includes('<= numbers.length')) {
    correctFix = buggyLine.replace('<= numbers.length', '< numbers.length');
    distractors = [
      buggyLine.replace('<= numbers.length', '<= numbers.length - 1'),
      buggyLine
    ];
  }
  
  const fixData = generateFixOptions(correctFix, distractors);
  
  return {
    title: { en: "Off By One Error", ms: "Ralat Satu Indeks" },
    description: { 
      en: "Arrays start at index 0, not 1. Accessing an index that doesn't exist causes an error. Find the line trying to access an invalid array index and fix it.", 
      ms: "Tatasusunan bermula pada indeks 0, bukan 1. Mengakses indeks yang tidak wujud menyebabkan ralat. Cari baris yang cuba mengakses indeks tatasusunan yang tidak sah dan betulkannya." 
    },
    codeBlock: t.code,
    buggyLineIndex: t.buggyLine,
    explanation: t.explanation,
    ...fixData,
    basePoints: 1200
  };
}

function generateUnreachableCodeChallenge() {
  const t = unreachableCodeTemplates[Math.floor(Math.random() * unreachableCodeTemplates.length)];
  const codeLines = t.code.split('\n');
  const buggyLine = codeLines[t.buggyLine];
  
  // Move return after other statements
  const correctFix = buggyLine.replace('return', '// return moved to end');
  const distractors = [
    buggyLine.replace('return', 'console.log("returning:"); return'),
    buggyLine
  ];
  
  const fixData = generateFixOptions(correctFix, distractors);
  
  return {
    title: { en: "Unreachable Code", ms: "Kod Tidak Dapat Dicapai" },
    description: { 
      en: "Find the code that never runs.", 
      ms: "Cari kod yang tidak pernah berjalan." 
    },
    codeBlock: t.code,
    buggyLineIndex: t.buggyLine,
    explanation: t.explanation,
    ...fixData,
    basePoints: 1100
  };
}

function generateVariableScopeChallenge() {
  const t = variableScopeTemplates[Math.floor(Math.random() * variableScopeTemplates.length)];
  const codeLines = t.code.split('\n');
  const buggyLine = codeLines[t.buggyLine];
  
  // Fix scope by declaring outside or using var
  const varMatch = buggyLine.match(/console\.log\((\w+)\)/);
  const varName = varMatch ? varMatch[1] : 'message';
  
  const correctFix = 'let ' + varName + ';  // Declare outside block';
  const distractors = [
    buggyLine.replace('console.log', 'var ' + varName + ' = ""; console.log'),
    buggyLine
  ];
  
  const fixData = generateFixOptions(correctFix, distractors);
  
  return {
    title: { en: "Variable Scope", ms: "Skop Pemboleh Ubah" },
    description: { 
      en: "Find the variable scope error.", 
      ms: "Cari ralat skop pemboleh ubah." 
    },
    codeBlock: t.code,
    buggyLineIndex: t.buggyLine,
    explanation: t.explanation,
    ...fixData,
    basePoints: 1200
  };
}

// --- MAIN GENERATOR FUNCTION ---
function generateRandomDebugChallenge() {
  const allGenerators = [
    generateTypoChallenge, 
    generateLoopChallenge,
    generateReturnChallenge,
    generateComparisonChallenge,
    generateWrongComparisonChallenge,
    generateStringMathChallenge,
    generateOffByOneChallenge,
    generateUnreachableCodeChallenge,
    generateVariableScopeChallenge,
  ];
  
  const randomGenerator = allGenerators[Math.floor(Math.random() * allGenerators.length)];
  return randomGenerator();
}

// ============================================
// TROUBLESHOOTING CHALLENGE GENERATORS
// ============================================

function generateOffByOneTroubleshooting() {
  const varNames = ['count', 'index', 'limit', 'sum', 'total'];
  const randomVar = varNames[Math.floor(Math.random() * varNames.length)];
  
  const scenarios = [
    {
      title: { en: 'Off-by-One Loop Error', ms: 'Ralat Gelung Off-by-One' },
      description: {
        en: 'A loop iterates one too many or one too few times',
        ms: 'Gelung mengulangi satu kali terlalu banyak atau terlalu sedikit'
      },
      codeBlock: `int ${randomVar} = 0;
for (int i = 0; i <= 10; i++) {
  ${randomVar}++;
}
System.out.println(${randomVar});`,
      buggyLineIndex: 1,
      explanation: {
        en: 'The condition "i <= 10" iterates 11 times (0 to 10 inclusive). Should be "i < 10" to iterate 10 times.',
        ms: 'Keadaan "i <= 10" mengulangi 11 kali (0 hingga 10 termasuk). Sepatutnya "i < 10" untuk mengulangi 10 kali.'
      },
      basePoints: 100
    }
  ];
  return scenarios[0];
}

function generateMissingSemicolonTroubleshooting() {
  const statements = [
    'int x = 5',
    'String name = "John"',
    'double price = 99.99',
    'boolean isValid = true'
  ];
  const randomStmt = statements[Math.floor(Math.random() * statements.length)];
  
  return {
    title: { en: 'Missing Semicolon', ms: 'Titik Koma Hilang' },
    description: {
      en: 'A statement is missing a semicolon at the end',
      ms: 'Pernyataan kehilangan titik koma di akhir'
    },
    codeBlock: `public void init() {
  ${randomStmt}
  System.out.println("Initialized");
}`,
    buggyLineIndex: 1,
    explanation: {
      en: `Each statement must end with a semicolon (;). The line "${randomStmt}" is missing one.`,
      ms: `Setiap pernyataan mesti diakhiri dengan titik koma (;). Baris "${randomStmt}" tidak mempunyai satu.`
    },
    basePoints: 100
  };
}

function generateTypeMismatchTroubleshooting() {
  const scenarios = [
    {
      code: `int value = "123";`,
      type: 'String'
    },
    {
      code: `double price = true;`,
      type: 'boolean'
    },
    {
      code: `String count = 42;`,
      type: 'int'
    }
  ];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  return {
    title: { en: 'Type Mismatch Error', ms: 'Ralat Ketidakpadanan Jenis' },
    description: {
      en: 'A value is being assigned to a variable of incompatible type',
      ms: 'Nilai diberikan kepada pembolehubah jenis yang tidak serasi'
    },
    codeBlock: `public void process() {
  ${scenario.code}
  System.out.println(value);
}`,
    buggyLineIndex: 1,
    explanation: {
      en: `Cannot assign ${scenario.type} to the declared variable type. Types must match or be compatible.`,
      ms: `Tidak boleh menetapkan ${scenario.type} kepada jenis pembolehubah yang diisytiharkan. Jenis mesti sepadan.`
    },
    basePoints: 100
  };
}

function generateMissingBreakTroubleshooting() {
  const varNames = ['result', 'value', 'output'];
  const randomVar = varNames[Math.floor(Math.random() * varNames.length)];
  
  return {
    title: { en: 'Missing Break in Switch', ms: 'Pecahan Hilang dalam Suis' },
    description: {
      en: 'A switch case is missing a break statement, causing fall-through',
      ms: 'Kes suis kehilangan pernyataan pecah, menyebabkan jatuh melalui'
    },
    codeBlock: `int day = 3;
String ${randomVar} = "";
switch(day) {
  case 1: ${randomVar} = "Monday"; break;
  case 2: ${randomVar} = "Tuesday"; break;
  case 3: ${randomVar} = "Wednesday"
  case 4: ${randomVar} = "Thursday"; break;
}`,
    buggyLineIndex: 6,
    explanation: {
      en: 'Line 6 (Wednesday case) is missing "break;". Without it, execution continues to the next case (fall-through).',
      ms: 'Baris 6 (kes Rabu) kehilangan "break;". Tanpanya, pelaksanaan terus ke kes seterusnya.'
    },
    basePoints: 100
  };
}

function generateDivisionByZeroTroubleshooting() {
  const numerators = [100, 50, 200, 999];
  const randomNum = numerators[Math.floor(Math.random() * numerators.length)];
  
  return {
    title: { en: 'Division by Zero', ms: 'Pembahagian dengan Sifar' },
    description: {
      en: 'An arithmetic operation divides by zero, causing a runtime error',
      ms: 'Operasi aritmetik membahagi dengan sifar, menyebabkan ralat masa proses'
    },
    codeBlock: `int dividend = ${randomNum};
int divisor = 0;
int result = dividend / divisor;
System.out.println(result);`,
    buggyLineIndex: 1,
    explanation: {
      en: 'The divisor is set to 0. Division by zero is mathematically undefined and will throw an ArithmeticException.',
      ms: 'Pembahagi ditetapkan kepada 0. Pembahagian dengan sifar tidak ditakrifkan secara matematik dan akan melempar ArithmeticException.'
    },
    basePoints: 100
  };
}

function generateUninitializedVariableTroubleshooting() {
  const varNames = ['count', 'total', 'sum', 'value'];
  const randomVar = varNames[Math.floor(Math.random() * varNames.length)];
  
  return {
    title: { en: 'Uninitialized Variable', ms: 'Pembolehubah Tidak Dimulakan' },
    description: {
      en: 'A variable is used without being initialized first',
      ms: 'Pembolehubah digunakan tanpa dimulakan terlebih dahulu'
    },
    codeBlock: `public void calculate() {
  int ${randomVar};
  ${randomVar} += 10;
  System.out.println(${randomVar});
}`,
    buggyLineIndex: 1,
    explanation: {
      en: `Variable "${randomVar}" is declared but not initialized. You must assign a value before using it (e.g., int ${randomVar} = 0;).`,
      ms: `Pembolehubah "${randomVar}" diisytiharkan tetapi tidak dimulakan. Anda mesti memberikan nilai sebelum menggunakannya.`
    },
    basePoints: 100
  };
}

function generateArrayIndexOutOfBoundsTroubleshooting() {
  const arraySize = Math.floor(Math.random() * 5) + 5;
  const wrongIndex = arraySize + 1;
  
  return {
    title: { en: 'Array Index Out of Bounds', ms: 'Indeks Tatasusunan Keluar dari Sempadan' },
    description: {
      en: 'An array index exceeds the valid range, causing runtime error',
      ms: 'Indeks tatasusunan melebihi julat yang sah, menyebabkan ralat masa proses'
    },
    codeBlock: `int[] numbers = new int[${arraySize}];
for (int i = 0; i <= ${wrongIndex}; i++) {
  numbers[i] = i * 2;
}`,
    buggyLineIndex: 1,
    explanation: {
      en: `Array has indices 0 to ${arraySize - 1} (size ${arraySize}). Loop condition "i <= ${wrongIndex}" tries to access index ${wrongIndex}, which is out of bounds.`,
      ms: `Tatasusunan mempunyai indeks 0 hingga ${arraySize - 1}. Keadaan gelung "i <= ${wrongIndex}" cuba mengakses indeks ${wrongIndex}, yang keluar dari sempadan.`
    },
    basePoints: 100
  };
}

function generateRandomTroubleshootingChallenge() {
  const allGenerators = [
    generateOffByOneTroubleshooting,
    generateMissingSemicolonTroubleshooting,
    generateTypeMismatchTroubleshooting,
    generateMissingBreakTroubleshooting,
    generateDivisionByZeroTroubleshooting,
    generateUninitializedVariableTroubleshooting,
    generateArrayIndexOutOfBoundsTroubleshooting,
  ];
  
  const randomGenerator = allGenerators[Math.floor(Math.random() * allGenerators.length)];
  return randomGenerator();
}

// Export for use in server/index.js
module.exports = {
  generateRandomDebugChallenge,
  generateRandomTroubleshootingChallenge,
};



