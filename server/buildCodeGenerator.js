// server/buildCodeGenerator.js
// Code Assembly Challenge Generator for Build-a-Code Game
// Simplified for secondary school students - no difficulty levels

// ==========================================
// SECONDARY SCHOOL LEVEL CHALLENGES
// All challenges are appropriate for Form 4 Computer Science
// ==========================================

const challenges = [
  {
    id: 'hello_world',
    title: { en: 'Hello World Program', ms: 'Program Hello World' },
    scenario: {
      en: 'Create a program that prints "Hello, World!" to the console.',
      ms: 'Buat program yang mencetak "Hello, World!" ke konsol.'
    },
    expectedOutput: 'Hello, World!',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    System.out.println("Hello, World!");', order: 3 },
      { id: 4, code: '  }', order: 4 },
      { id: 5, code: '}', order: 5 }
    ],
    explanation: {
      en: 'This is the basic structure of a Java program. The main method is where execution starts.',
      ms: 'Ini adalah struktur asas program Java. Kaedah main adalah tempat pelaksanaan bermula.'
    }
  },
  {
    id: 'variable_declaration',
    title: { en: 'Variable Declaration', ms: 'Pengisytiharan Pemboleh Ubah' },
    scenario: {
      en: 'Create a program that stores a name and age, then prints them.',
      ms: 'Buat program yang menyimpan nama dan umur, kemudian mencetaknya.'
    },
    expectedOutput: 'Name: Ali, Age: 16',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    String name = "Ali";', order: 3 },
      { id: 4, code: '    int age = 16;', order: 4 },
      { id: 5, code: '    System.out.println("Name: " + name + ", Age: " + age);', order: 5 },
      { id: 6, code: '  }', order: 6 },
      { id: 7, code: '}', order: 7 }
    ],
    explanation: {
      en: 'Variables store data. String for text, int for whole numbers.',
      ms: 'Pemboleh ubah menyimpan data. String untuk teks, int untuk nombor bulat.'
    }
  },
  {
    id: 'simple_calculation',
    title: { en: 'Simple Calculation', ms: 'Pengiraan Mudah' },
    scenario: {
      en: 'Create a program that adds two numbers and shows the result.',
      ms: 'Buat program yang menambah dua nombor dan menunjukkan hasilnya.'
    },
    expectedOutput: 'Sum: 15',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int a = 10;', order: 3 },
      { id: 4, code: '    int b = 5;', order: 4 },
      { id: 5, code: '    int sum = a + b;', order: 5 },
      { id: 6, code: '    System.out.println("Sum: " + sum);', order: 6 },
      { id: 7, code: '  }', order: 7 },
      { id: 8, code: '}', order: 8 }
    ],
    explanation: {
      en: 'Use + operator to add numbers. Store result in a variable before printing.',
      ms: 'Gunakan operator + untuk menambah nombor. Simpan hasil dalam pemboleh ubah sebelum mencetak.'
    }
  },
  {
    id: 'multiplication',
    title: { en: 'Multiplication', ms: 'Pendaraban' },
    scenario: {
      en: 'Calculate the product of two numbers.',
      ms: 'Kira hasil darab dua nombor.'
    },
    expectedOutput: 'Product: 50',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int x = 10;', order: 3 },
      { id: 4, code: '    int y = 5;', order: 4 },
      { id: 5, code: '    int product = x * y;', order: 5 },
      { id: 6, code: '    System.out.println("Product: " + product);', order: 6 },
      { id: 7, code: '  }', order: 7 },
      { id: 8, code: '}', order: 8 }
    ],
    explanation: {
      en: 'Use * operator for multiplication.',
      ms: 'Gunakan operator * untuk pendaraban.'
    }
  },
  {
    id: 'if_statement',
    title: { en: 'Grade Checker', ms: 'Penyemak Gred' },
    scenario: {
      en: 'Create a program that checks if a score is passing (>= 60).',
      ms: 'Buat program yang menyemak jika markah lulus (>= 60).'
    },
    expectedOutput: 'Pass!',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int score = 75;', order: 3 },
      { id: 4, code: '    if (score >= 60) {', order: 4 },
      { id: 5, code: '      System.out.println("Pass!");', order: 5 },
      { id: 6, code: '    }', order: 6 },
      { id: 7, code: '  }', order: 7 },
      { id: 8, code: '}', order: 8 }
    ],
    explanation: {
      en: 'if statement checks a condition. Code inside runs only if condition is true.',
      ms: 'Pernyataan if menyemak syarat. Kod di dalam hanya berjalan jika syarat benar.'
    }
  },
  {
    id: 'if_else',
    title: { en: 'Age Group', ms: 'Kumpulan Umur' },
    scenario: {
      en: 'Create a program that checks if a person is an adult (18+) or teenager.',
      ms: 'Buat program yang menyemak jika seseorang dewasa (18+) atau remaja.'
    },
    expectedOutput: 'Teenager',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int age = 16;', order: 3 },
      { id: 4, code: '    if (age >= 18) {', order: 4 },
      { id: 5, code: '      System.out.println("Adult");', order: 5 },
      { id: 6, code: '    } else {', order: 6 },
      { id: 7, code: '      System.out.println("Teenager");', order: 7 },
      { id: 8, code: '    }', order: 8 },
      { id: 9, code: '  }', order: 9 },
      { id: 10, code: '}', order: 10 }
    ],
    explanation: {
      en: 'if-else provides two paths: one if condition is true, another if false.',
      ms: 'if-else menyediakan dua laluan: satu jika syarat benar, satu lagi jika salah.'
    }
  },
  {
    id: 'for_loop',
    title: { en: 'Counting Loop', ms: 'Gelung Mengira' },
    scenario: {
      en: 'Create a program that prints numbers 1 to 5 using a for loop.',
      ms: 'Buat program yang mencetak nombor 1 hingga 5 menggunakan gelung for.'
    },
    expectedOutput: '1 2 3 4 5',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    for (int i = 1; i <= 5; i++) {', order: 3 },
      { id: 4, code: '      System.out.print(i + " ");', order: 4 },
      { id: 5, code: '    }', order: 5 },
      { id: 6, code: '  }', order: 6 },
      { id: 7, code: '}', order: 7 }
    ],
    explanation: {
      en: 'for loop repeats code. i starts at 1, increases by 1 each time, stops at 5.',
      ms: 'Gelung for mengulang kod. i bermula pada 1, meningkat 1 setiap kali, berhenti pada 5.'
    }
  },
  {
    id: 'while_loop',
    title: { en: 'Countdown Timer', ms: 'Pemasa Undur' },
    scenario: {
      en: 'Create a countdown from 5 to 1 using a while loop.',
      ms: 'Buat undur dari 5 ke 1 menggunakan gelung while.'
    },
    expectedOutput: '5 4 3 2 1',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int count = 5;', order: 3 },
      { id: 4, code: '    while (count > 0) {', order: 4 },
      { id: 5, code: '      System.out.print(count + " ");', order: 5 },
      { id: 6, code: '      count--;', order: 6 },
      { id: 7, code: '    }', order: 7 },
      { id: 8, code: '  }', order: 8 },
      { id: 9, code: '}', order: 9 }
    ],
    explanation: {
      en: 'while loop repeats while condition is true. count-- decreases count by 1.',
      ms: 'Gelung while mengulang selagi syarat benar. count-- mengurangkan count sebanyak 1.'
    }
  },
  {
    id: 'even_odd',
    title: { en: 'Even or Odd', ms: 'Genap atau Ganjil' },
    scenario: {
      en: 'Check if a number is even or odd using modulo operator.',
      ms: 'Semak jika nombor genap atau ganjil menggunakan operator modulo.'
    },
    expectedOutput: '42 is even',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int number = 42;', order: 3 },
      { id: 4, code: '    if (number % 2 == 0) {', order: 4 },
      { id: 5, code: '      System.out.println(number + " is even");', order: 5 },
      { id: 6, code: '    } else {', order: 6 },
      { id: 7, code: '      System.out.println(number + " is odd");', order: 7 },
      { id: 8, code: '    }', order: 8 },
      { id: 9, code: '  }', order: 9 },
      { id: 10, code: '}', order: 10 }
    ],
    explanation: {
      en: '% gives remainder. If number % 2 == 0, number is even (divisible by 2).',
      ms: '% memberikan baki. Jika number % 2 == 0, nombor adalah genap (boleh dibahagikan dengan 2).'
    }
  },
  {
    id: 'area_calculation',
    title: { en: 'Rectangle Area', ms: 'Luas Segi Empat' },
    scenario: {
      en: 'Calculate and print the area of a rectangle (length × width).',
      ms: 'Kira dan cetak luas segi empat tepat (panjang × lebar).'
    },
    expectedOutput: 'Area: 50',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int length = 10;', order: 3 },
      { id: 4, code: '    int width = 5;', order: 4 },
      { id: 5, code: '    int area = length * width;', order: 5 },
      { id: 6, code: '    System.out.println("Area: " + area);', order: 6 },
      { id: 7, code: '  }', order: 7 },
      { id: 8, code: '}', order: 8 }
    ],
    explanation: {
      en: 'Area = length × width. Multiply the two dimensions.',
      ms: 'Luas = panjang × lebar. Darabkan dua dimensi.'
    }
  },
  {
    id: 'string_concatenation',
    title: { en: 'String Concatenation', ms: 'Penyambungan String' },
    scenario: {
      en: 'Combine a greeting with a name and print the result.',
      ms: 'Gabungkan ucapan dengan nama dan cetak hasilnya.'
    },
    expectedOutput: 'Hello, Ahmad!',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    String greeting = "Hello, ";', order: 3 },
      { id: 4, code: '    String name = "Ahmad";', order: 4 },
      { id: 5, code: '    String message = greeting + name + "!";', order: 5 },
      { id: 6, code: '    System.out.println(message);', order: 6 },
      { id: 7, code: '  }', order: 7 },
      { id: 8, code: '}', order: 8 }
    ],
    explanation: {
      en: 'Use + to join strings together. This is called concatenation.',
      ms: 'Gunakan + untuk menyambung string bersama. Ini dipanggil penyambungan.'
    }
  },
  {
    id: 'division',
    title: { en: 'Division', ms: 'Pembahagian' },
    scenario: {
      en: 'Divide two numbers and show the result.',
      ms: 'Bahagikan dua nombor dan tunjukkan hasilnya.'
    },
    expectedOutput: 'Result: 5',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int dividend = 20;', order: 3 },
      { id: 4, code: '    int divisor = 4;', order: 4 },
      { id: 5, code: '    int result = dividend / divisor;', order: 5 },
      { id: 6, code: '    System.out.println("Result: " + result);', order: 6 },
      { id: 7, code: '  }', order: 7 },
      { id: 8, code: '}', order: 8 }
    ],
    explanation: {
      en: 'Use / operator for division. Integer division gives whole number result.',
      ms: 'Gunakan operator / untuk pembahagian. Pembahagian integer memberikan hasil nombor bulat.'
    }
  },
  {
    id: 'modulus',
    title: { en: 'Remainder', ms: 'Baki' },
    scenario: {
      en: 'Find the remainder when dividing 17 by 5.',
      ms: 'Cari baki apabila membahagikan 17 dengan 5.'
    },
    expectedOutput: 'Remainder: 2',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int num = 17;', order: 3 },
      { id: 4, code: '    int divisor = 5;', order: 4 },
      { id: 5, code: '    int remainder = num % divisor;', order: 5 },
      { id: 6, code: '    System.out.println("Remainder: " + remainder);', order: 6 },
      { id: 7, code: '  }', order: 7 },
      { id: 8, code: '}', order: 8 }
    ],
    explanation: {
      en: '% operator gives remainder. 17 % 5 = 2 because 17 = 5×3 + 2.',
      ms: 'Operator % memberikan baki. 17 % 5 = 2 kerana 17 = 5×3 + 2.'
    }
  },
  {
    id: 'comparison',
    title: { en: 'Number Comparison', ms: 'Perbandingan Nombor' },
    scenario: {
      en: 'Compare two numbers and print which is larger.',
      ms: 'Bandingkan dua nombor dan cetak yang mana lebih besar.'
    },
    expectedOutput: 'Larger: 25',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int a = 15;', order: 3 },
      { id: 4, code: '    int b = 25;', order: 4 },
      { id: 5, code: '    if (a > b) {', order: 5 },
      { id: 6, code: '      System.out.println("Larger: " + a);', order: 6 },
      { id: 7, code: '    } else {', order: 7 },
      { id: 8, code: '      System.out.println("Larger: " + b);', order: 8 },
      { id: 9, code: '    }', order: 9 },
      { id: 10, code: '  }', order: 10 },
      { id: 11, code: '}', order: 11 }
    ],
    explanation: {
      en: 'Use > to compare. If a > b is false, then b is larger.',
      ms: 'Gunakan > untuk membandingkan. Jika a > b adalah salah, maka b lebih besar.'
    }
  },
  {
    id: 'boolean_variable',
    title: { en: 'Boolean Check', ms: 'Semakan Boolean' },
    scenario: {
      en: 'Create a program that checks if a student is active.',
      ms: 'Buat program yang memeriksa sama ada pelajar aktif.'
    },
    expectedOutput: 'Is Active: true',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    boolean isActive = true;', order: 3 },
      { id: 4, code: '    System.out.println("Is Active: " + isActive);', order: 4 },
      { id: 5, code: '  }', order: 5 },
      { id: 6, code: '}', order: 6 }
    ],
    explanation: {
      en: 'boolean stores true or false values. Used for yes/no conditions.',
      ms: 'boolean menyimpan nilai benar atau salah. Digunakan untuk syarat ya/tidak.'
    }
  },
  {
    id: 'sum_loop',
    title: { en: 'Sum of Numbers', ms: 'Jumlah Nombor' },
    scenario: {
      en: 'Calculate the sum of numbers from 1 to 5 using a loop.',
      ms: 'Kira jumlah nombor dari 1 hingga 5 menggunakan gelung.'
    },
    expectedOutput: 'Sum: 15',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int sum = 0;', order: 3 },
      { id: 4, code: '    for (int i = 1; i <= 5; i++) {', order: 4 },
      { id: 5, code: '      sum = sum + i;', order: 5 },
      { id: 6, code: '    }', order: 6 },
      { id: 7, code: '    System.out.println("Sum: " + sum);', order: 7 },
      { id: 8, code: '  }', order: 8 },
      { id: 9, code: '}', order: 9 }
    ],
    explanation: {
      en: 'Start sum at 0. Add each number (1, 2, 3, 4, 5) to sum in the loop.',
      ms: 'Mula sum pada 0. Tambah setiap nombor (1, 2, 3, 4, 5) kepada sum dalam gelung.'
    }
  },
  {
    id: 'double_calculation',
    title: { en: 'Price Calculation', ms: 'Pengiraan Harga' },
    scenario: {
      en: 'Calculate the total price of 3 items at RM15.50 each.',
      ms: 'Kira jumlah harga 3 item pada RM15.50 setiap satu.'
    },
    expectedOutput: 'Total: RM 46.5',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    double price = 15.50;', order: 3 },
      { id: 4, code: '    int quantity = 3;', order: 4 },
      { id: 5, code: '    double total = price * quantity;', order: 5 },
      { id: 6, code: '    System.out.println("Total: RM " + total);', order: 6 },
      { id: 7, code: '  }', order: 7 },
      { id: 8, code: '}', order: 8 }
    ],
    explanation: {
      en: 'Use double for decimal numbers. Multiply price by quantity to get total.',
      ms: 'Gunakan double untuk nombor perpuluhan. Darab harga dengan kuantiti untuk mendapatkan jumlah.'
    }
  },
  {
    id: 'nested_if',
    title: { en: 'Grade Classification', ms: 'Klasifikasi Gred' },
    scenario: {
      en: 'Classify a score: A (>=80), B (>=60), or C (<60).',
      ms: 'Klasifikasikan markah: A (>=80), B (>=60), atau C (<60).'
    },
    expectedOutput: 'Grade: B',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int score = 75;', order: 3 },
      { id: 4, code: '    if (score >= 80) {', order: 4 },
      { id: 5, code: '      System.out.println("Grade: A");', order: 5 },
      { id: 6, code: '    } else if (score >= 60) {', order: 6 },
      { id: 7, code: '      System.out.println("Grade: B");', order: 7 },
      { id: 8, code: '    } else {', order: 8 },
      { id: 9, code: '      System.out.println("Grade: C");', order: 9 },
      { id: 10, code: '    }', order: 10 },
      { id: 11, code: '  }', order: 11 },
      { id: 12, code: '}', order: 12 }
    ],
    explanation: {
      en: 'Use else if for multiple conditions. Check from highest to lowest.',
      ms: 'Gunakan else if untuk pelbagai syarat. Semak dari tertinggi ke terendah.'
    }
  },
  {
    id: 'loop_print',
    title: { en: 'Print Pattern', ms: 'Cetak Corak' },
    scenario: {
      en: 'Print the first 4 multiples of 3 using a loop.',
      ms: 'Cetak 4 gandaan pertama bagi 3 menggunakan gelung.'
    },
    expectedOutput: '3 6 9 12',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int number = 3;', order: 3 },
      { id: 4, code: '    for (int i = 1; i <= 4; i++) {', order: 4 },
      { id: 5, code: '      System.out.print(number * i + " ");', order: 5 },
      { id: 6, code: '    }', order: 6 },
      { id: 7, code: '  }', order: 7 },
      { id: 8, code: '}', order: 8 }
    ],
    explanation: {
      en: 'Loop from 1 to 4. Multiply number (3) by i each time: 3×1, 3×2, 3×3, 3×4.',
      ms: 'Gelung dari 1 ke 4. Darab nombor (3) dengan i setiap kali: 3×1, 3×2, 3×3, 3×4.'
    }
  }
];

// ==========================================
// Helper Functions
// ==========================================

// Fisher-Yates shuffle
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate a challenge with shuffled blocks
function generateChallenge(template) {
  const shuffledBlocks = shuffleArray(template.blocks).map((block, index) => ({
    ...block,
    displayOrder: index // Track where it appears after shuffle
  }));
  
  return {
    id: template.id,
    title: template.title,
    scenario: template.scenario,
    expectedOutput: template.expectedOutput,
    blocks: shuffledBlocks,
    correctOrder: template.blocks.map(b => b.id), // Original correct order
    explanation: template.explanation,
    basePoints: 100
  };
}

// Generate a quiz with 10 random challenges
function generateBuildCodeQuiz() {
  // Shuffle all challenges and pick 10
  const shuffled = shuffleArray(challenges);
  const selected = shuffled.slice(0, 10);
  
  // Generate each challenge with shuffled blocks
  return selected.map(template => generateChallenge(template));
}

module.exports = {
  generateBuildCodeQuiz,
  generateChallenge,
  challenges
};
