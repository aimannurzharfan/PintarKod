// server/gameGenerator.js - COMPLETE REWRITE WITH JAVA QUESTIONS
// Multiple variations per question type for RANDOMIZATION

// ==========================================
// JAVA-BASED DEBUGGING CHALLENGES
// Form 4 Computer Science Chapter 1
// ==========================================

// Helper function to shuffle and create fix options
function generateFixOptions(correctFix, alternatives) {
  const options = [correctFix, ...alternatives];
  // Shuffle array
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

// --- QUESTION TYPE 1: Missing Semicolon (5 variations) ---
const missingSemicolonTemplates = [
  {
    title: { en: 'Missing Semicolon', ms: 'Koma Bertitik Hilang' },
    description: { 
      en: 'Every Java statement must end with a semicolon (;). One line is missing its semicolon. Click on that line, then select the correct fix that adds the semicolon.',
      ms: 'Setiap pernyataan Java mesti berakhir dengan koma bertitik (;). Satu baris tiada koma bertitik. Klik baris tersebut, kemudian pilih pembetulan yang menambah koma bertitik.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    String name = "Ahmad"
    int age = 16;
    System.out.println("Name: " + name);
  }
}`,
    buggyLineIndex: 2,
    correctFix: '    String name = "Ahmad";',
    explanation: {
      en: 'Line 3 is missing a semicolon at the end. All Java statements must end with ;',
      ms: 'Baris 3 tiada koma bertitik di hujung. Semua pernyataan Java mesti berakhir dengan ;'
    }
  },
  {
    title: { en: 'Missing Semicolon', ms: 'Koma Bertitik Hilang' },
    description: { 
      en: 'A variable declaration is missing its semicolon. Find the incomplete line and add the semicolon.',
      ms: 'Pengisytiharan pemboleh ubah tiada koma bertitik. Cari baris yang tidak lengkap dan tambah koma bertitik.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int num1 = 10;
    int num2 = 20
    int sum = num1 + num2;
    System.out.println("Sum: " + sum);
  }
}`,
    buggyLineIndex: 3,
    correctFix: '    int num2 = 20;',
    explanation: {
      en: 'Line 4 needs a semicolon. Variable declarations must end with ;',
      ms: 'Baris 4 perlukan koma bertitik. Pengisytiharan pemboleh ubah mesti berakhir dengan ;'
    }
  },
  {
    title: { en: 'Missing Semicolon', ms: 'Koma Bertitik Hilang' },
    description: { 
      en: 'The println statement is missing its semicolon. Click the line without a semicolon and fix it.',
      ms: 'Pernyataan println tiada koma bertitik. Klik baris tanpa koma bertitik dan betulkannya.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    double price = 99.90;
    System.out.println("Price: RM" + price)
  }
}`,
    buggyLineIndex: 3,
    correctFix: '    System.out.println("Price: RM" + price);',
    explanation: {
      en: 'Line 4 is missing the semicolon after the println statement.',
      ms: 'Baris 4 tiada koma bertitik selepas pernyataan println.'
    }
  },
  {
    title: { en: 'Missing Semicolon', ms: 'Koma Bertitik Hilang' },
    description: { 
      en: 'An arithmetic operation line needs a semicolon. Find and fix the incomplete statement.',
      ms: 'Baris operasi aritmetik perlukan koma bertitik. Cari dan betulkan pernyataan yang tidak lengkap.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int x = 5;
    int y = x * 2
    System.out.println(y);
  }
}`,
    buggyLineIndex: 3,
    correctFix: '    int y = x * 2;',
    explanation: {
      en: 'Line 4 needs a semicolon after the calculation.',
      ms: 'Baris 4 perlukan koma bertitik selepas pengiraan.'
    }
  },
  {
    title: { en: 'Missing Semicolon', ms: 'Koma Bertitik Hilang' },
    description: { 
      en: 'A boolean variable declaration is incomplete. Click the line missing a semicolon and complete it.',
      ms: 'Pengisytiharan pemboleh ubah boolean tidak lengkap. Klik baris tanpa koma bertitik dan lengkapkannya.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    boolean isStudent = true
    String status = "Active";
    System.out.println("Student: " + isStudent);
  }
}`,
    buggyLineIndex: 2,
    correctFix: '    boolean isStudent = true;',
    explanation: {
      en: 'Line 3 is missing the semicolon after the boolean declaration.',
      ms: 'Baris 3 tiada koma bertitik selepas pengisytiharan boolean.'
    }
  }
];

function generateMissingSemicolonChallenge() {
  const template = missingSemicolonTemplates[Math.floor(Math.random() * missingSemicolonTemplates.length)];
  
  const alternatives = [
    template.correctFix.replace(';', ','),
    template.correctFix.replace(';', ''),
  ];
  
  return {
    ...template,
    fixOptions: generateFixOptions(template.correctFix, alternatives),
    basePoints: 100
  };
}

// --- QUESTION TYPE 2: Wrong Data Type (5 variations) ---
const dataTypeTemplates = [
  {
    title: { en: 'Wrong Data Type', ms: 'Jenis Data Salah' },
    description: { 
      en: 'Decimal numbers (like 3.14) need "double" type, not "int". Int only stores whole numbers. Click the line with wrong type and select the fix using "double".',
      ms: 'Nombor perpuluhan (seperti 3.14) perlukan jenis "double", bukan "int". Int hanya simpan nombor bulat. Klik baris dengan jenis salah dan pilih pembetulan menggunakan "double".' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int pi = 3.14;
    double radius = 5.0;
    System.out.println("Pi: " + pi);
  }
}`,
    buggyLineIndex: 2,
    correctFix: '    double pi = 3.14;',
    explanation: {
      en: 'Line 3 uses int for decimal 3.14. Use double for decimals.',
      ms: 'Baris 3 guna int untuk perpuluhan 3.14. Guna double untuk perpuluhan.'
    }
  },
  {
    title: { en: 'Data Type Mismatch', ms: 'Jenis Data Tidak Sepadan' },
    description: { 
      en: 'Text values need "String" type, not "int". Int is only for numbers. Find the line storing text in wrong type and fix it to use String.',
      ms: 'Nilai teks perlukan jenis "String", bukan "int". Int hanya untuk nombor. Cari baris yang simpan teks dalam jenis salah dan betulkan kepada String.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int city = "Kuala Lumpur";
    int population = 1800000;
    System.out.println(city + ": " + population);
  }
}`,
    buggyLineIndex: 2,
    correctFix: '    String city = "Kuala Lumpur";',
    explanation: {
      en: 'Line 3 tries to store text in int. Use String for text.',
      ms: 'Baris 3 cuba simpan teks dalam int. Guna String untuk teks.'
    }
  },
  {
    title: { en: 'Wrong Data Type', ms: 'Jenis Data Salah' },
    description: { 
      en: 'A percentage value (75.5) is a decimal, so it needs "double" not "int". Click the wrong line and choose the fix with double.',
      ms: 'Nilai peratusan (75.5) adalah perpuluhan, jadi ia perlukan "double" bukan "int". Klik baris salah dan pilih pembetulan dengan double.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int percentage = 75.5;
    System.out.println("Score: " + percentage + "%");
  }
}`,
    buggyLineIndex: 2,
    correctFix: '    double percentage = 75.5;',
    explanation: {
      en: 'Line 3 uses int for 75.5. Percentages with decimals need double.',
      ms: 'Baris 3 guna int untuk 75.5. Peratusan dengan perpuluhan perlukan double.'
    }
  },
  {
    title: { en: 'Data Type Error', ms: 'Ralat Jenis Data' },
    description: { 
      en: 'A person\'s name is text, so use "String" not "int". Only numbers go in int. Find and fix the wrong declaration.',
      ms: 'Nama seseorang adalah teks, jadi guna "String" bukan "int". Hanya nombor masuk int. Cari dan betulkan pengisytiharan salah.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int studentName = "Sarah";
    int studentAge = 15;
    System.out.println(studentName + " is " + studentAge);
  }
}`,
    buggyLineIndex: 2,
    correctFix: '    String studentName = "Sarah";',
    explanation: {
      en: 'Line 3 uses int for name. Names are text, use String.',
      ms: 'Baris 3 guna int untuk nama. Nama adalah teks, guna String.'
    }
  },
  {
    title: { en: 'Wrong Type', ms: 'Jenis Salah' },
    description: { 
      en: 'Temperature with decimal point (36.5) requires "double" type, not "int". Find the line with wrong type.',
      ms: 'Suhu dengan titik perpuluhan (36.5) perlukan jenis "double", bukan "int". Cari baris dengan jenis salah.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int temperature = 36.5;
    System.out.println("Temperature: " + temperature);
  }
}`,
    buggyLineIndex: 2,
    correctFix: '    double temperature = 36.5;',
    explanation: {
      en: 'Line 3 uses int for 36.5. Use double for decimal temperatures.',
      ms: 'Baris 3 guna int untuk 36.5. Guna double untuk suhu perpuluhan.'
    }
  }
];

function generateDataTypeChallenge() {
  const template = dataTypeTemplates[Math.floor(Math.random() * dataTypeTemplates.length)];
  
  const alternatives = [
    template.correctFix.replace('double', 'int').replace('String', 'int'),
    template.correctFix.replace('double', 'float').replace('String', 'char'),
  ];
  
  return {
    ...template,
    fixOptions: generateFixOptions(template.correctFix, alternatives),
    basePoints: 100
  };
}

// --- QUESTION TYPE 3: Assignment vs Comparison (= vs ==) (3 variations) ---
const comparisonTemplates = [
  {
    title: { en: 'Wrong Operator: = vs ==', ms: 'Operator Salah: = vs ==' },
    description: { 
      en: 'In if statements, use "==" to compare values, not "=" which assigns. The condition uses "=" which changes the variable instead of checking it. Find and fix this line.',
      ms: 'Dalam pernyataan if, guna "==" untuk banding nilai, bukan "=" yang menetapkan. Syarat guna "=" yang ubah pemboleh ubah bukan memeriksanya. Cari dan betulkan baris ini.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int score = 100;
    if (score = 100) {
      System.out.println("Perfect!");
    }
  }
}`,
    buggyLineIndex: 3,
    correctFix: '    if (score == 100) {',
    explanation: {
      en: 'Line 4 uses = (assigns 100) instead of == (checks if equal). Use == for comparisons.',
      ms: 'Baris 4 guna = (tetapkan 100) bukan == (semak sama). Guna == untuk perbandingan.'
    }
  },
  {
    title: { en: '= instead of ==', ms: '= bukan ==' },
    description: { 
      en: 'To check if age equals 18, use "==" not "=". One equals sign assigns a value, two equals signs compare. Click the wrong line.',
      ms: 'Untuk semak umur sama dengan 18, guna "==" bukan "=". Satu sama dengan tetapkan nilai, dua sama dengan bandingkan. Klik baris yang salah.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int age = 16;
    if (age = 18) {
      System.out.println("Adult");
    }
  }
}`,
    buggyLineIndex: 3,
    correctFix: '    if (age == 18) {',
    explanation: {
      en: 'Line 4 assigns 18 to age instead of checking. Use == to compare.',
      ms: 'Baris 4 tetapkan 18 ke umur bukan memeriksa. Guna == untuk banding.'
    }
  },
  {
    title: { en: 'Assignment in Condition', ms: 'Penetapan dalam Syarat' },
    description: { 
      en: 'The if statement should CHECK if points equal 50, not ASSIGN 50. Use == to check, = to assign. Find the line mixing these up.',
      ms: 'Pernyataan if sepatutnya SEMAK jika markah sama 50, bukan TETAPKAN 50. Guna == untuk semak, = untuk tetapkan. Cari baris yang keliru.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int points = 50;
    if (points = 50) {
      System.out.println("Half way!");
    }
  }
}`,
    buggyLineIndex: 3,
    correctFix: '    if (points == 50) {',
    explanation: {
      en: 'Line 4 uses = which assigns. Conditions need == to compare.',
      ms: 'Baris 4 guna = yang menetapkan. Syarat perlukan == untuk banding.'
    }
  }
];

function generateComparisonChallenge() {
  const template = comparisonTemplates[Math.floor(Math.random() * comparisonTemplates.length)];
  
  const alternatives = [
    template.correctFix.replace('==', '='),
    template.correctFix.replace('==', '!='),
  ];
  
  return {
    ...template,
    fixOptions: generateFixOptions(template.correctFix, alternatives),
    basePoints: 100
  };
}

// --- QUESTION TYPE 4: String Syntax Errors (3 variations) ---
const stringTemplates = [
  {
    title: { en: 'Missing Quote', ms: 'Petikan Hilang' },
    description: { 
      en: 'All text strings must be inside quotes. One string is missing its closing quote ("). Find the incomplete string and close it properly.',
      ms: 'Semua rentetan teks mesti dalam petikan. Satu rentetan tiada petikan penutup ("). Cari rentetan tidak lengkap dan tutup dengan betul.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    String greeting = "Hello;
    System.out.println(greeting);
  }
}`,
    buggyLineIndex: 2,
    correctFix: '    String greeting = "Hello";',
    explanation: {
      en: 'Line 3 is missing the closing quote. Strings need opening AND closing quotes.',
      ms: 'Baris 3 tiada petikan penutup. Rentetan perlukan petikan pembuka DAN penutup.'
    }
  },
  {
    title: { en: 'Unclosed String', ms: 'Rentetan Tidak Tertutup' },
    description: { 
      en: 'A message string starts with a quote but never ends. Every opening " needs a closing ". Click the line with unclosed string.',
      ms: 'Rentetan mesej bermula dengan petikan tetapi tidak berakhir. Setiap " pembuka perlukan " penutup. Klik baris dengan rentetan tidak tertutup.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    String message = "Welcome to Java;
    System.out.println(message);
  }
}`,
    buggyLineIndex: 2,
    correctFix: '    String message = "Welcome to Java";',
    explanation: {
      en: 'Line 3 starts a string but never closes it. Add closing quote.',
      ms: 'Baris 3 mulakan rentetan tetapi tidak tutup. Tambah petikan penutup.'
    }
  }
];

function generateStringChallenge() {
  const template = stringTemplates[Math.floor(Math.random() * stringTemplates.length)];
  
  const alternatives = [
    template.correctFix.replace('";', "';"),
    template.correctFix.replace('";', '";'),
  ];
  
  return {
    ...template,
    fixOptions: generateFixOptions(template.correctFix, alternatives),
    basePoints: 100
  };
}

// --- QUESTION TYPE 5: Wrong Operator (3 variations) ---
const operatorTemplates = [
  {
    title: { en: 'Wrong Math Operator', ms: 'Operator Matematik Salah' },
    description: { 
      en: 'To calculate total of two prices, we ADD (+) them, not divide (/). Find the line using wrong operator for this calculation.',
      ms: 'Untuk kira jumlah dua harga, kita TAMBAH (+) mereka, bukan bahagi (/). Cari baris guna operator salah untuk pengiraan ini.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    double price1 = 10.50;
    double price2 = 5.50;
    double total = price1 / price2;
    System.out.println("Total: RM" + total);
  }
}`,
    buggyLineIndex: 4,
    correctFix: '    double total = price1 + price2;',
    explanation: {
      en: 'Line 5 divides prices instead of adding. Use + for total.',
      ms: 'Baris 5 bahagikan harga bukan tambah. Guna + untuk jumlah.'
    }
  },
  {
    title: { en: 'Wrong Calculation', ms: 'Pengiraan Salah' },
    description: { 
      en: 'Average is calculated by dividing sum by count, not multiplying. Find the line that multiplies instead of divides.',
      ms: 'Purata dikira dengan bahagi jumlah dengan bilangan, bukan darab. Cari baris yang darab bukan bahagi.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int sum = 100;
    int count = 5;
    int average = sum * count;
    System.out.println("Average: " + average);
  }
}`,
    buggyLineIndex: 4,
    correctFix: '    int average = sum / count;',
    explanation: {
      en: 'Line 5 multiplies for average. Average needs division (/).',
      ms: 'Baris 5 darab untuk purata. Purata perlukan pembahagian (/).'
    }
  }
];

function generateOperatorChallenge() {
  const template = operatorTemplates[Math.floor(Math.random() * operatorTemplates.length)];
  
  const alternatives = [
    template.correctFix.replace('+', '-').replace('/', '*'),
    template.correctFix.replace('+', '*').replace('/', '+'),
  ];
  
  return {
    ...template,
    fixOptions: generateFixOptions(template.correctFix, alternatives),
    basePoints: 100
  };
}

// --- QUESTION TYPE 6: Wrong Variable Name (3 variations) ---
const variableTemplates = [
  {
    title: { en: 'Wrong Variable Used', ms: 'Pemboleh Ubah Salah Digunakan' },
    description: { 
      en: 'The code declares "width" but then prints "length" which doesn\'t exist. Find the line using the wrong variable name.',
      ms: 'Kod isytiharkan "width" tetapi cetak "length" yang tidak wujud. Cari baris guna nama pemboleh ubah salah.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int width = 25;
    System.out.println("Width: " + length);
  }
}`,
    buggyLineIndex: 3,
    correctFix: '    System.out.println("Width: " + width);',
    explanation: {
      en: 'Line 4 uses "length" which was never declared. Use "width" instead.',
      ms: 'Baris 4 guna "length" yang tidak pernah diisytihar. Guna "width" sebaliknya.'
    }
  },
  {
    title: { en: 'Typo in Variable', ms: 'Salah Eja Pemboleh Ubah' },
    description: { 
      en: 'Variable "name" is declared but code prints "nam" (typo). Find the misspelled variable and fix it.',
      ms: 'Pemboleh ubah "name" diisytihar tetapi kod cetak "nam" (salah eja). Cari pemboleh ubah salah eja dan betulkannya.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    String name = "Ali";
    System.out.println("Name: " + nam);
  }
}`,
    buggyLineIndex: 3,
    correctFix: '    System.out.println("Name: " + name);',
    explanation: {
      en: 'Line 4 has typo "nam". Should be "name" to match declaration.',
      ms: 'Baris 4 ada salah eja "nam". Sepatutnya "name" untuk sepadan pengisytiharan.'
    }
  }
];

function generateVariableChallenge() {
  const template = variableTemplates[Math.floor(Math.random() * variableTemplates.length)];
  
  const alternatives = [
    template.correctFix,
    template.correctFix.replace('width', 'height').replace('name', 'nama'),
  ];
  
  return {
    ...template,
    fixOptions: generateFixOptions(template.correctFix, alternatives.slice(1).concat([template.correctFix.replace(';', ',')])),
    basePoints: 100
  };
}

// ==========================================
// JAVA-BASED TROUBLESHOOTING CHALLENGES
// ==========================================

const troubleshootingTemplates = [
  {
    title: { en: 'Wrong Operator for Area', ms: 'Operator Salah untuk Luas' },
    description: { 
      en: 'Area of rectangle = length × width. This code adds instead of multiplies. Find the line with wrong calculation.',
      ms: 'Luas segi empat tepat = panjang × lebar. Kod ini tambah bukan darab. Cari baris dengan pengiraan salah.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int length = 10;
    int width = 5;
    int area = length + width;
    System.out.println("Area: " + area);
  }
}`,
    buggyLineIndex: 4,
    explanation: {
      en: 'Line 5 adds (+) but area needs multiplication (*). Should be: int area = length * width;',
      ms: 'Baris 5 tambah (+) tetapi luas perlukan pendaraban (*). Sepatutnya: int area = length * width;'
    }
  },
  {
    title: { en: 'Wrong Comparison', ms: 'Perbandingan Salah' },
    description: { 
      en: 'To check if number is greater than 10, use > not <. This code checks if less than. Find the wrong comparison.',
      ms: 'Untuk semak nombor lebih dari 10, guna > bukan <. Kod ini semak jika kurang dari. Cari perbandingan salah.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int score = 85;
    if (score < 80) {
      System.out.println("High score!");
    }
  }
}`,
    buggyLineIndex: 3,
    explanation: {
      en: 'Line 4 uses < (less than) but message says "High score". Should use > (greater than).',
      ms: 'Baris 4 guna < (kurang dari) tetapi mesej kata "High score". Sepatutnya guna > (lebih dari).'
    }
  },
  {
    title: { en: 'Wrong Formula', ms: 'Formula Salah' },
    description: { 
      en: 'Perimeter of square = 4 × side. This code multiplies by 2. Find the line with wrong formula.',
      ms: 'Perimeter segi empat sama = 4 × sisi. Kod ini darab dengan 2. Cari baris dengan formula salah.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int side = 5;
    int perimeter = side * 2;
    System.out.println("Perimeter: " + perimeter);
  }
}`,
    buggyLineIndex: 3,
    explanation: {
      en: 'Line 4 multiplies by 2 but square perimeter needs × 4. Should be: int perimeter = side * 4;',
      ms: 'Baris 4 darab dengan 2 tetapi perimeter segi empat sama perlukan × 4. Sepatutnya: int perimeter = side * 4;'
    }
  },
  {
    title: { en: 'Division Instead of Multiplication', ms: 'Bahagi Bukan Darab' },
    description: { 
      en: 'Total hours = days × 24. This code divides instead. Find calculation error.',
      ms: 'Jumlah jam = hari × 24. Kod ini bahagi sebaliknya. Cari ralat pengiraan.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int days = 7;
    int hours = days / 24;
    System.out.println("Hours: " + hours);
  }
}`,
    buggyLineIndex: 3,
    explanation: {
      en: 'Line 4 divides but should multiply. Should be: int hours = days * 24;',
      ms: 'Baris 4 bahagi tetapi sepatutnya darab. Sepatutnya: int hours = days * 24;'
    }
  },
  {
    title: { en: 'Wrong Variable in Print', ms: 'Pemboleh Ubah Salah dalam Cetakan' },
    description: { 
      en: 'Code calculates total but prints tax instead. Find the line printing wrong variable.',
      ms: 'Kod kira jumlah tetapi cetak cukai sebaliknya. Cari baris cetak pemboleh ubah salah.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    double price = 100.0;
    double tax = 6.0;
    double total = price + tax;
    System.out.println("Total: RM" + tax);
  }
}`,
    buggyLineIndex: 5,
    explanation: {
      en: 'Line 6 prints tax but should print total. Should be: System.out.println("Total: RM" + total);',
      ms: 'Baris 6 cetak cukai tetapi sepatutnya cetak jumlah. Sepatutnya: System.out.println("Total: RM" + total);'
    }
  },
  {
    title: { en: 'Subtract Instead of Add', ms: 'Tolak Bukan Tambah' },
    description: { 
      en: 'To find total marks, add all scores. This code subtracts. Find the wrong operator.',
      ms: 'Untuk cari jumlah markah, tambah semua skor. Kod ini tolak. Cari operator salah.' 
    },
    codeBlock: `public class Main {
  public static void main(String[] args) {
    int test1 = 80;
    int test2 = 90;
    int totalMarks = test1 - test2;
    System.out.println("Total: " + totalMarks);
  }
}`,
    buggyLineIndex: 4,
    explanation: {
      en: 'Line 5 subtracts (-) but should add (+). Should be: int totalMarks = test1 + test2;',
      ms: 'Baris 5 tolak (-) tetapi sepatutnya tambah (+). Sepatutnya: int totalMarks = test1 + test2;'
    }
  }
];

function generateRandomTroubleshootingChallenge() {
  const template = troubleshootingTemplates[Math.floor(Math.random() * troubleshootingTemplates.length)];
  return {
    ...template,
    basePoints: 100
  };
}

// Export main generation functions
function generateRandomDebugChallenge() {
  const generators = [
    generateMissingSemicolonChallenge,
    generateDataTypeChallenge,
    generateComparisonChallenge,
    generateStringChallenge,
    generateOperatorChallenge,
    generateVariableChallenge,
  ];
  
  const randomGenerator = generators[Math.floor(Math.random() * generators.length)];
  return randomGenerator();
}

module.exports = {
  generateRandomDebugChallenge,
  generateRandomTroubleshootingChallenge
};
