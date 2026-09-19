export interface CurriculumTopic {
  id: string;
  name: string;
  subject: string;
  classLevel: number;
  description?: string;
}

export const CURRICULUM_MATRIX: Record<number, Record<string, string[]>> = {
  6: {
    Mathematics: [
      "Integers & Number Line",
      "Fractions",
      "Decimals",
      "Algebra Basics",
      "Ratio & Proportion",
      "Basic Geometry",
      "Mensuration"
    ],
    Science: [
      "Components of Food",
      "Sorting Materials",
      "Separation of Substances",
      "Plants & Animals",
      "Motion & Measurement",
      "Light & Shadows",
      "Electricity & Circuits"
    ],
    English: [
      "Reading Comprehension",
      "Nouns & Pronouns",
      "Verbs & Tenses",
      "Adjectives & Adverbs",
      "Vocabulary & Context",
      "Sentence Structure"
    ]
  },
  7: {
    Mathematics: [
      "Integers & Operations",
      "Fractions & Decimals",
      "Simple Equations",
      "Lines & Angles",
      "Triangles & Properties",
      "Comparing Quantities",
      "Rational Numbers",
      "Perimeter & Area",
      "Algebraic Expressions",
      "Exponents & Powers"
    ],
    Science: [
      "Nutrition in Plants & Animals",
      "Heat & Temperature",
      "Acids, Bases & Salts",
      "Physical & Chemical Changes",
      "Respiration in Organisms",
      "Transportation in Animals & Plants",
      "Motion & Time",
      "Electric Current & Effects",
      "Light & Optics"
    ],
    English: [
      "Reading Comprehension",
      "Active & Passive Voice",
      "Direct & Indirect Speech",
      "Prepositions & Conjunctions",
      "Vocabulary & Idioms",
      "Descriptive Writing"
    ]
  },
  8: {
    Mathematics: [
      "Rational Numbers",
      "Linear Equations in One Variable",
      "Understanding Quadrilaterals",
      "Data Handling",
      "Squares & Square Roots",
      "Cubes & Cube Roots",
      "Comparing Quantities",
      "Algebraic Expressions & Identities",
      "Mensuration",
      "Exponents & Powers",
      "Direct & Inverse Proportions",
      "Factorisation"
    ],
    Science: [
      "Crop Production & Management",
      "Microorganisms",
      "Coal & Petroleum",
      "Combustion & Flame",
      "Conservation of Plants & Animals",
      "Reproduction in Animals",
      "Force & Pressure",
      "Friction",
      "Sound",
      "Chemical Effects of Electric Current",
      "Light"
    ],
    English: [
      "Reading Comprehension",
      "Clauses & Complex Sentences",
      "Reported Speech",
      "Tenses & Conditionals",
      "Synonyms & Antonyms",
      "Formal Writing"
    ]
  },
  9: {
    Mathematics: [
      "Number Systems",
      "Polynomials",
      "Coordinate Geometry",
      "Linear Equations in Two Variables",
      "Introduction to Euclid's Geometry",
      "Lines & Angles",
      "Triangles",
      "Quadrilaterals",
      "Circles",
      "Heron's Formula",
      "Surface Areas & Volumes",
      "Statistics"
    ],
    Science: [
      "Matter in Our Surroundings",
      "Is Matter Around Us Pure",
      "Atoms & Molecules",
      "Structure of the Atom",
      "The Fundamental Unit of Life",
      "Tissues",
      "Motion",
      "Force & Laws of Motion",
      "Gravitation",
      "Work & Energy",
      "Sound",
      "Improvement in Food Resources"
    ],
    English: [
      "Reading Comprehension & Analysis",
      "Subject-Verb Agreement",
      "Modals & Auxiliaries",
      "Determiners",
      "Tenses in Context",
      "Reported Speech & Dialogue",
      "Formal Letter & Article Writing"
    ]
  },
  10: {
    Mathematics: [
      "Real Numbers",
      "Polynomials",
      "Pair of Linear Equations in Two Variables",
      "Quadratic Equations",
      "Arithmetic Progressions",
      "Triangles",
      "Coordinate Geometry",
      "Introduction to Trigonometry",
      "Some Applications of Trigonometry",
      "Circles",
      "Areas Related to Circles",
      "Surface Areas & Volumes",
      "Statistics",
      "Probability"
    ],
    Science: [
      "Chemical Reactions & Equations",
      "Acids, Bases & Salts",
      "Metals & Non-metals",
      "Carbon & Its Compounds",
      "Life Processes",
      "Control & Coordination",
      "How do Organisms Reproduce?",
      "Heredity & Evolution",
      "Light - Reflection & Refraction",
      "The Human Eye & Colorful World",
      "Electricity",
      "Magnetic Effects of Electric Current",
      "Our Environment"
    ],
    English: [
      "Critical Reading Comprehension",
      "Advanced Grammar & Syntax",
      "Analytical Paragraph Writing",
      "Formal & Editorial Writing",
      "Literary Analysis & Vocabulary"
    ]
  },
  11: {
    Mathematics: [
      "Sets & Relations",
      "Trigonometric Functions",
      "Complex Numbers & Quadratic Equations",
      "Linear Inequalities",
      "Permutations & Combinations",
      "Binomial Theorem",
      "Sequences & Series",
      "Straight Lines & Conic Sections",
      "Limits & Derivatives",
      "Statistics & Probability"
    ],
    Science: [
      "Units & Measurements",
      "Kinematics & Motion in a Plane",
      "Laws of Motion",
      "Work, Energy & Power",
      "Thermodynamics",
      "Structure of Atom",
      "Chemical Bonding & Molecular Structure",
      "Organic Chemistry Principles",
      "Cell Structure & Division",
      "Plant & Human Physiology"
    ],
    English: [
      "Advanced Textual Analysis",
      "Note Making & Summarization",
      "Grammar in Discourse",
      "Creative & Argumentative Writing"
    ]
  },
  12: {
    Mathematics: [
      "Relations & Functions",
      "Inverse Trigonometric Functions",
      "Matrices & Determinants",
      "Continuity & Differentiability",
      "Applications of Derivatives",
      "Integrals & Applications",
      "Differential Equations",
      "Vector Algebra & 3D Geometry",
      "Linear Programming",
      "Probability & Distributions"
    ],
    Science: [
      "Electric Charges & Fields",
      "Current Electricity",
      "Moving Charges & Magnetism",
      "Ray & Wave Optics",
      "Dual Nature of Radiation & Matter",
      "Solutions & Electrochemistry",
      "Chemical Kinetics",
      "Coordination Compounds",
      "Molecular Genetics & Biotechnology",
      "Ecology & Environment"
    ],
    English: [
      "Comprehension of Complex Texts",
      "Advanced Rhetoric & Synthesis",
      "Formal Proposals & Reports",
      "Critical Discourse Analysis"
    ]
  }
};

export function getCurriculumTopics(classLevel: number, subject: string): string[] {
  const classObj = CURRICULUM_MATRIX[classLevel];
  if (!classObj) return [];
  const topics = classObj[subject];
  if (!topics) return [];
  return topics;
}

export function validateTopic(classLevel: number, subject: string, topic: string): boolean {
  if (!topic || typeof topic !== "string") return false;
  const topics = getCurriculumTopics(classLevel, subject);
  if (topics.length === 0) return true; // Allow if class/sub dynamic
  return topics.some(t => t.toLowerCase() === topic.toLowerCase() || t.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(t.toLowerCase()));
}
