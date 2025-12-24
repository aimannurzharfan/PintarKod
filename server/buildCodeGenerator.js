// server/buildCodeGenerator.js
// Code Assembly Challenge Generator for Build-a-Code Game
// Students must arrange scrambled code blocks in correct order

// ==========================================
// EASY CHALLENGES (4 blocks)
// Basic sequential programs
// ==========================================

const easyChallenges = [
  {
    id: 'easy_hello',
    difficulty: 'easy',
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
    basePoints: 80
  },
  {
    id: 'easy_variable',
    difficulty: 'easy',
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
    basePoints: 80
  },
  {
    id: 'easy_math',
    difficulty: 'easy',
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
    basePoints: 80
  },
  {
    id: 'easy_double',
    difficulty: 'easy',
    title: { en: 'Price Calculation', ms: 'Pengiraan Harga' },
    scenario: {
      en: 'Create a program that calculates the total price of 3 items.',
      ms: 'Buat program yang mengira jumlah harga 3 item.'
    },
    expectedOutput: 'Total: RM 45.50',
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
    basePoints: 80
  },
  {
    id: 'easy_boolean',
    difficulty: 'easy',
    title: { en: 'Student Status', ms: 'Status Pelajar' },
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
    basePoints: 80
  }
];

// ==========================================
// MEDIUM CHALLENGES (6-7 blocks)
// Control flow, conditions
// ==========================================

const mediumChallenges = [
  {
    id: 'medium_if',
    difficulty: 'medium',
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
    basePoints: 100
  },
  {
    id: 'medium_ifelse',
    difficulty: 'medium',
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
    basePoints: 100
  },
  {
    id: 'medium_loop',
    difficulty: 'medium',
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
    basePoints: 100
  },
  {
    id: 'medium_while',
    difficulty: 'medium',
    title: { en: 'Countdown Timer', ms: 'Pemasa Undur' },
    scenario: {
      en: 'Create a countdown from 5 to 1 using a while loop.',
      ms: 'Buat undur dari 5 ke 1 menggunakan gelung while.'
    },
    expectedOutput: '5 4 3 2 1 Blast off!',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int count = 5;', order: 3 },
      { id: 4, code: '    while (count > 0) {', order: 4 },
      { id: 5, code: '      System.out.print(count + " ");', order: 5 },
      { id: 6, code: '      count--;', order: 6 },
      { id: 7, code: '    }', order: 7 },
      { id: 8, code: '    System.out.println("Blast off!");', order: 8 },
      { id: 9, code: '  }', order: 9 },
      { id: 10, code: '}', order: 10 }
    ],
    basePoints: 100
  },
  {
    id: 'medium_area',
    difficulty: 'medium',
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
    basePoints: 100
  },
  {
    id: 'medium_evenodd',
    difficulty: 'medium',
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
    basePoints: 100
  }
];

// ==========================================
// HARD CHALLENGES (8+ blocks)
// Complex logic, nested structures
// ==========================================

const hardChallenges = [
  {
    id: 'hard_nested_if',
    difficulty: 'hard',
    title: { en: 'Ticket Price Calculator', ms: 'Pengira Harga Tiket' },
    scenario: {
      en: 'Calculate ticket price: Kids (<12): RM5, Teens (12-17): RM10, Adults: RM15.',
      ms: 'Kira harga tiket: Kanak (<12): RM5, Remaja (12-17): RM10, Dewasa: RM15.'
    },
    expectedOutput: 'Ticket price: RM10',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int age = 15;', order: 3 },
      { id: 4, code: '    int price;', order: 4 },
      { id: 5, code: '    if (age < 12) {', order: 5 },
      { id: 6, code: '      price = 5;', order: 6 },
      { id: 7, code: '    } else if (age < 18) {', order: 7 },
      { id: 8, code: '      price = 10;', order: 8 },
      { id: 9, code: '    } else {', order: 9 },
      { id: 10, code: '      price = 15;', order: 10 },
      { id: 11, code: '    }', order: 11 },
      { id: 12, code: '    System.out.println("Ticket price: RM" + price);', order: 12 },
      { id: 13, code: '  }', order: 13 },
      { id: 14, code: '}', order: 14 }
    ],
    basePoints: 120
  },
  {
    id: 'hard_sum_loop',
    difficulty: 'hard',
    title: { en: 'Sum Calculator', ms: 'Pengira Jumlah' },
    scenario: {
      en: 'Calculate the sum of numbers from 1 to 10 using a loop.',
      ms: 'Kira jumlah nombor dari 1 hingga 10 menggunakan gelung.'
    },
    expectedOutput: 'Sum: 55',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int sum = 0;', order: 3 },
      { id: 4, code: '    for (int i = 1; i <= 10; i++) {', order: 4 },
      { id: 5, code: '      sum = sum + i;', order: 5 },
      { id: 6, code: '    }', order: 6 },
      { id: 7, code: '    System.out.println("Sum: " + sum);', order: 7 },
      { id: 8, code: '  }', order: 8 },
      { id: 9, code: '}', order: 9 }
    ],
    basePoints: 120
  },
  {
    id: 'hard_max_finder',
    difficulty: 'hard',
    title: { en: 'Find Maximum', ms: 'Cari Maksimum' },
    scenario: {
      en: 'Find and print the maximum of three numbers.',
      ms: 'Cari dan cetak nilai maksimum daripada tiga nombor.'
    },
    expectedOutput: 'Maximum: 30',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int a = 10, b = 30, c = 20;', order: 3 },
      { id: 4, code: '    int max = a;', order: 4 },
      { id: 5, code: '    if (b > max) {', order: 5 },
      { id: 6, code: '      max = b;', order: 6 },
      { id: 7, code: '    }', order: 7 },
      { id: 8, code: '    if (c > max) {', order: 8 },
      { id: 9, code: '      max = c;', order: 9 },
      { id: 10, code: '    }', order: 10 },
      { id: 11, code: '    System.out.println("Maximum: " + max);', order: 11 },
      { id: 12, code: '  }', order: 12 },
      { id: 13, code: '}', order: 13 }
    ],
    basePoints: 120
  },
  {
    id: 'hard_factorial',
    difficulty: 'hard',
    title: { en: 'Factorial Calculator', ms: 'Pengira Faktorial' },
    scenario: {
      en: 'Calculate the factorial of 5 (5! = 5×4×3×2×1).',
      ms: 'Kira faktorial 5 (5! = 5×4×3×2×1).'
    },
    expectedOutput: 'Factorial: 120',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int n = 5;', order: 3 },
      { id: 4, code: '    int factorial = 1;', order: 4 },
      { id: 5, code: '    for (int i = 1; i <= n; i++) {', order: 5 },
      { id: 6, code: '      factorial = factorial * i;', order: 6 },
      { id: 7, code: '    }', order: 7 },
      { id: 8, code: '    System.out.println("Factorial: " + factorial);', order: 8 },
      { id: 9, code: '  }', order: 9 },
      { id: 10, code: '}', order: 10 }
    ],
    basePoints: 120
  },
  {
    id: 'hard_average',
    difficulty: 'hard',
    title: { en: 'Grade Average', ms: 'Purata Gred' },
    scenario: {
      en: 'Calculate and display the average of 5 test scores.',
      ms: 'Kira dan papar purata 5 markah ujian.'
    },
    expectedOutput: 'Average: 80.0',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int score1 = 75, score2 = 80, score3 = 85;', order: 3 },
      { id: 4, code: '    int score4 = 90, score5 = 70;', order: 4 },
      { id: 5, code: '    int total = score1 + score2 + score3 + score4 + score5;', order: 5 },
      { id: 6, code: '    double average = total / 5.0;', order: 6 },
      { id: 7, code: '    System.out.println("Average: " + average);', order: 7 },
      { id: 8, code: '  }', order: 8 },
      { id: 9, code: '}', order: 9 }
    ],
    basePoints: 120
  },
  {
    id: 'hard_discount',
    difficulty: 'hard',
    title: { en: 'Discount Calculator', ms: 'Pengira Diskaun' },
    scenario: {
      en: 'Apply 20% discount if purchase > RM100, else 10% discount.',
      ms: 'Berikan diskaun 20% jika pembelian > RM100, jika tidak 10%.'
    },
    expectedOutput: 'Final price: RM96.0',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    double price = 120.0;', order: 3 },
      { id: 4, code: '    double discount;', order: 4 },
      { id: 5, code: '    if (price > 100) {', order: 5 },
      { id: 6, code: '      discount = 0.20;', order: 6 },
      { id: 7, code: '    } else {', order: 7 },
      { id: 8, code: '      discount = 0.10;', order: 8 },
      { id: 9, code: '    }', order: 9 },
      { id: 10, code: '    double finalPrice = price - (price * discount);', order: 10 },
      { id: 11, code: '    System.out.println("Final price: RM" + finalPrice);', order: 11 },
      { id: 12, code: '  }', order: 12 },
      { id: 13, code: '}', order: 13 }
    ],
    basePoints: 120
  },
  {
    id: 'hard_multiplication',
    difficulty: 'hard',
    title: { en: 'Multiplication Table', ms: 'Jadual Pendaraban' },
    scenario: {
      en: 'Print the first 5 multiples of 7.',
      ms: 'Cetak 5 gandaan pertama bagi 7.'
    },
    expectedOutput: '7 14 21 28 35',
    blocks: [
      { id: 1, code: 'public class Main {', order: 1 },
      { id: 2, code: '  public static void main(String[] args) {', order: 2 },
      { id: 3, code: '    int number = 7;', order: 3 },
      { id: 4, code: '    for (int i = 1; i <= 5; i++) {', order: 4 },
      { id: 5, code: '      int result = number * i;', order: 5 },
      { id: 6, code: '      System.out.print(result + " ");', order: 6 },
      { id: 7, code: '    }', order: 7 },
      { id: 8, code: '  }', order: 8 },
      { id: 9, code: '}', order: 9 }
    ],
    basePoints: 120
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
    difficulty: template.difficulty,
    title: template.title,
    scenario: template.scenario,
    expectedOutput: template.expectedOutput,
    blocks: shuffledBlocks,
    correctOrder: template.blocks.map(b => b.id), // Original correct order
    basePoints: template.basePoints
  };
}

// Generate a quiz with mixed difficulties
function generateBuildCodeQuiz() {
  // Select challenges: 3 easy, 4 medium, 3 hard
  const selectedEasy = shuffleArray(easyChallenges).slice(0, 3);
  const selectedMedium = shuffleArray(mediumChallenges).slice(0, 4);
  const selectedHard = shuffleArray(hardChallenges).slice(0, 3);
  
  // Combine and shuffle order
  const allSelected = [...selectedEasy, ...selectedMedium, ...selectedHard];
  const shuffledChallenges = shuffleArray(allSelected);
  
  // Generate each challenge with shuffled blocks
  return shuffledChallenges.map(template => generateChallenge(template));
}

module.exports = {
  generateBuildCodeQuiz,
  generateChallenge,
  easyChallenges,
  mediumChallenges,
  hardChallenges
};
