import { query, resetDatabase } from "./index";
import { getGroupByScore } from "../config/thresholds";

export async function seedCurriculumCatalog(): Promise<void> {
  console.log("[Seed] Checking/seeding curriculum catalog questions and schools...");
  
  // 1. Seed Questions across Classes 6–12 for Mathematics, Science, English
  const questions = [
    // ==========================================
    // CLASS 6 - MATHEMATICS
    // ==========================================
    {
      id: "q-c6-m-01",
      class_level: 6,
      subject: "Mathematics",
      topic: "Integers",
      skill: "Number Line Representation",
      difficulty: "FOUNDATIONAL",
      question_text: "Which integer represents a temperature of 5 degrees below zero?",
      question_type: "choice",
      options: ["+5", "-5", "0", "1/5"],
      correct_answer: "-5",
      explanation: "Temperatures below zero are represented by negative integers, so 5 degrees below zero is -5.",
      marks: 1
    },
    {
      id: "q-c6-m-02",
      class_level: 6,
      subject: "Mathematics",
      topic: "Fractions",
      skill: "Equivalent Fractions",
      difficulty: "EASY",
      question_text: "Which fraction is equivalent to 2/3?",
      question_type: "choice",
      options: ["4/6", "3/2", "4/9", "2/6"],
      correct_answer: "4/6",
      explanation: "Multiplying numerator and denominator by 2 gives (2*2)/(3*2) = 4/6.",
      marks: 1
    },
    {
      id: "q-c6-m-03",
      class_level: 6,
      subject: "Mathematics",
      topic: "Decimals",
      skill: "Decimal Addition",
      difficulty: "MEDIUM",
      question_text: "Evaluate: 4.25 + 3.8",
      question_type: "choice",
      options: ["8.05", "7.05", "8.15", "7.33"],
      correct_answer: "8.05",
      explanation: "Align decimals: 4.25 + 3.80 = 8.05.",
      marks: 1
    },
    {
      id: "q-c6-m-04",
      class_level: 6,
      subject: "Mathematics",
      topic: "Algebra Basics",
      skill: "Variable Patterns",
      difficulty: "HARD",
      question_text: "If rule is 'multiply by 3 and add 2', what is output for input n = 5?",
      question_type: "choice",
      options: ["17", "15", "21", "13"],
      correct_answer: "17",
      explanation: "3(5) + 2 = 15 + 2 = 17.",
      marks: 2
    },

    // ==========================================
    // CLASS 6 - SCIENCE
    // ==========================================
    {
      id: "q-c6-s-01",
      class_level: 6,
      subject: "Science",
      topic: "Components of Food",
      skill: "Nutrient Identification",
      difficulty: "FOUNDATIONAL",
      question_text: "Which nutrient is the primary energy giver for our body?",
      question_type: "choice",
      options: ["Carbohydrates", "Vitamins", "Minerals", "Roughage"],
      correct_answer: "Carbohydrates",
      explanation: "Carbohydrates and fats provide energy to the body, with carbohydrates being the primary quick source.",
      marks: 1
    },
    {
      id: "q-c6-s-02",
      class_level: 6,
      subject: "Science",
      topic: "Light and Shadows",
      skill: "Shadow Formation",
      difficulty: "EASY",
      question_text: "What type of object completely blocks light and forms a dark shadow?",
      question_type: "choice",
      options: ["Opaque", "Transparent", "Translucent", "Luminous"],
      correct_answer: "Opaque",
      explanation: "Opaque objects do not allow light to pass through them at all, producing distinct shadows.",
      marks: 1
    },
    {
      id: "q-c6-s-03",
      class_level: 6,
      subject: "Science",
      topic: "Motion and Measurement",
      skill: "Types of Motion",
      difficulty: "MEDIUM",
      question_text: "The motion of the pendulum of a clock is an example of which motion?",
      question_type: "choice",
      options: ["Periodic motion", "Linear motion", "Circular motion only", "Random motion"],
      correct_answer: "Periodic motion",
      explanation: "Periodic motion repeats itself after regular fixed intervals of time.",
      marks: 1
    },

    // ==========================================
    // CLASS 6 - ENGLISH
    // ==========================================
    {
      id: "q-c6-e-01",
      class_level: 6,
      subject: "English",
      topic: "Grammar",
      skill: "Nouns & Pronouns",
      difficulty: "FOUNDATIONAL",
      question_text: "Identify the pronoun in the sentence: 'Rohan left his umbrella in the classroom.'",
      question_type: "choice",
      options: ["his", "Rohan", "umbrella", "classroom"],
      correct_answer: "his",
      explanation: "'His' is a possessive pronoun referring to Rohan.",
      marks: 1
    },
    {
      id: "q-c6-e-02",
      class_level: 6,
      subject: "English",
      topic: "Vocabulary",
      skill: "Antonyms in Context",
      difficulty: "EASY",
      question_text: "What is the antonym of the word 'ANCIENT'?",
      question_type: "choice",
      options: ["Modern", "Historic", "Aged", "Traditional"],
      correct_answer: "Modern",
      explanation: "Ancient means belonging to the distant past, while modern means relating to the present or recent times.",
      marks: 1
    },

    // ==========================================
    // CLASS 7 - MATHEMATICS (CORE DEMO CLASS)
    // ==========================================
    {
      id: "q-c7-m-01",
      class_level: 7,
      subject: "Mathematics",
      topic: "Integers",
      skill: "Operations with Signs",
      difficulty: "FOUNDATIONAL",
      question_text: "What is the value of: (-15) + (-8)?",
      question_type: "choice",
      options: ["-23", "+23", "-7", "+7"],
      correct_answer: "-23",
      explanation: "Adding two negative numbers yields a negative sum: -15 + (-8) = -23.",
      marks: 1
    },
    {
      id: "q-c7-m-02",
      class_level: 7,
      subject: "Mathematics",
      topic: "Fractions and Decimals",
      skill: "Fraction Multiplication",
      difficulty: "FOUNDATIONAL",
      question_text: "What is 3/4 of 36?",
      question_type: "choice",
      options: ["27", "24", "18", "30"],
      correct_answer: "27",
      explanation: "(3/4) * 36 = 3 * 9 = 27.",
      marks: 1
    },
    {
      id: "q-c7-m-03",
      class_level: 7,
      subject: "Mathematics",
      topic: "Simple Equations",
      skill: "One-step Equations",
      difficulty: "EASY",
      question_text: "Solve for x: x + 7 = 19",
      question_type: "choice",
      options: ["12", "14", "26", "7"],
      correct_answer: "12",
      explanation: "Subtract 7 from both sides: x = 19 - 7 = 12.",
      marks: 1
    },
    {
      id: "q-c7-m-04",
      class_level: 7,
      subject: "Mathematics",
      topic: "Simple Equations",
      skill: "Two-step Equations",
      difficulty: "MEDIUM",
      question_text: "Solve for y: 3y - 5 = 16",
      question_type: "choice",
      options: ["7", "6", "9", "5"],
      correct_answer: "7",
      explanation: "3y = 16 + 5 = 21 -> y = 21 / 3 = 7.",
      marks: 1
    },
    {
      id: "q-c7-m-05",
      class_level: 7,
      subject: "Mathematics",
      topic: "Algebraic Expressions",
      skill: "Combining Like Terms",
      difficulty: "MEDIUM",
      question_text: "Simplify: 4a + 7b - 2a + 3b",
      question_type: "choice",
      options: ["2a + 10b", "6a + 10b", "2a + 4b", "12ab"],
      correct_answer: "2a + 10b",
      explanation: "Group like terms: (4a - 2a) + (7b + 3b) = 2a + 10b.",
      marks: 1
    },
    {
      id: "q-c7-m-06",
      class_level: 7,
      subject: "Mathematics",
      topic: "Lines and Angles",
      skill: "Supplementary Angles",
      difficulty: "MEDIUM",
      question_text: "Two angles are supplementary. If one angle is 65°, what is the measure of the other?",
      question_type: "choice",
      options: ["115°", "25°", "125°", "35°"],
      correct_answer: "115°",
      explanation: "Supplementary angles add up to 180°. 180° - 65° = 115°.",
      marks: 1
    },
    {
      id: "q-c7-m-07",
      class_level: 7,
      subject: "Mathematics",
      topic: "Simple Equations",
      skill: "Word Problem Modeling",
      difficulty: "HARD",
      question_text: "Sum of three consecutive integers is 54. What is the largest integer?",
      question_type: "choice",
      options: ["19", "18", "17", "20"],
      correct_answer: "19",
      explanation: "Let integers be x, x+1, x+2. 3x + 3 = 54 -> 3x = 51 -> x = 17. The largest is 17 + 2 = 19.",
      marks: 2
    },
    {
      id: "q-c7-m-08",
      class_level: 7,
      subject: "Mathematics",
      topic: "Triangles and Properties",
      skill: "Angle Sum Property & Exterior Angle",
      difficulty: "ADVANCED",
      question_text: "In a triangle, the exterior angle at vertex C is 110°. If the interior opposite angles are in the ratio 2:3, find the smaller interior angle.",
      question_type: "choice",
      options: ["44°", "66°", "55°", "35°"],
      correct_answer: "44°",
      explanation: "Exterior angle = sum of interior opposite angles. 2x + 3x = 110° -> 5x = 110° -> x = 22°. Smaller angle = 2(22) = 44°.",
      marks: 2
    },
    {
      id: "q-c7-m-09",
      class_level: 7,
      subject: "Mathematics",
      topic: "Algebraic Expressions",
      skill: "Multi-variable Substitution",
      difficulty: "ADVANCED",
      question_text: "If p = -2 and q = 3, evaluate: 3p² - 2pq + q²",
      question_type: "choice",
      options: ["33", "21", "15", "39"],
      correct_answer: "33",
      explanation: "3(-2)² - 2(-2)(3) + 3² = 3(4) - (-12) + 9 = 12 + 12 + 9 = 33.",
      marks: 2
    },

    // ==========================================
    // CLASS 7 - SCIENCE
    // ==========================================
    {
      id: "q-c7-s-01",
      class_level: 7,
      subject: "Science",
      topic: "Nutrition in Plants",
      skill: "Photosynthesis Process",
      difficulty: "FOUNDATIONAL",
      question_text: "Which green pigment in leaves captures solar energy for photosynthesis?",
      question_type: "choice",
      options: ["Chlorophyll", "Hemoglobin", "Carotene", "Anthocyanin"],
      correct_answer: "Chlorophyll",
      explanation: "Chlorophyll is the green pigment that absorbs sunlight energy required to synthesize food.",
      marks: 1
    },
    {
      id: "q-c7-s-02",
      class_level: 7,
      subject: "Science",
      topic: "Heat",
      skill: "Conduction & Convection",
      difficulty: "EASY",
      question_text: "By which method is heat transferred through liquids and gases primarily?",
      question_type: "choice",
      options: ["Convection", "Conduction", "Radiation", "Insulation"],
      correct_answer: "Convection",
      explanation: "Convection is the mode of heat transfer in fluids (liquids and gases) via bulk movement of molecules.",
      marks: 1
    },
    {
      id: "q-c7-s-03",
      class_level: 7,
      subject: "Science",
      topic: "Acids, Bases and Salts",
      skill: "Indicators & pH Reaction",
      difficulty: "MEDIUM",
      question_text: "When blue litmus paper is dipped in lemon juice, what color change occurs?",
      question_type: "choice",
      options: ["Turns red", "Turns green", "Remains blue", "Turns yellow"],
      correct_answer: "Turns red",
      explanation: "Lemon juice contains citric acid. Acids turn blue litmus paper red.",
      marks: 1
    },
    {
      id: "q-c7-s-04",
      class_level: 7,
      subject: "Science",
      topic: "Physical and Chemical Changes",
      skill: "Chemical Reaction Identification",
      difficulty: "HARD",
      question_text: "Which of the following is a chemical change?",
      question_type: "choice",
      options: ["Rusting of iron", "Melting of ice", "Boiling of water", "Tearing of paper"],
      correct_answer: "Rusting of iron",
      explanation: "Rusting forms a new substance (iron oxide), which is an irreversible chemical change.",
      marks: 2
    },
    {
      id: "q-c7-s-05",
      class_level: 7,
      subject: "Science",
      topic: "Motion and Time",
      skill: "Speed Calculation & Graphs",
      difficulty: "ADVANCED",
      question_text: "A train covers a distance of 180 km in 3 hours. What is its speed in meters per second (m/s)?",
      question_type: "choice",
      options: ["16.67 m/s", "60 m/s", "25 m/s", "12.5 m/s"],
      correct_answer: "16.67 m/s",
      explanation: "Speed in km/h = 180 / 3 = 60 km/h. Converting to m/s: 60 * (5/18) = 300/18 = 16.67 m/s.",
      marks: 2
    },

    // ==========================================
    // CLASS 7 - ENGLISH
    // ==========================================
    {
      id: "q-c7-e-01",
      class_level: 7,
      subject: "English",
      topic: "Grammar",
      skill: "Tenses & Subject-Verb Agreement",
      difficulty: "FOUNDATIONAL",
      question_text: "Choose the correct verb: 'Neither of the boys ___ present in the auditorium.'",
      question_type: "choice",
      options: ["was", "were", "are", "have been"],
      correct_answer: "was",
      explanation: "'Neither' is singular and takes a singular verb ('was').",
      marks: 1
    },
    {
      id: "q-c7-e-02",
      class_level: 7,
      subject: "English",
      topic: "Reading Comprehension",
      skill: "Direct Fact Retrieval",
      difficulty: "EASY",
      context_passage: "The young apprentice carefully observed how the master potter shaped wet clay on the spinning wheel. With gentle thumb pressure, the mound transformed into a graceful vase.",
      question_text: "How did the mound of clay transform into a vase?",
      question_type: "choice",
      options: ["By gentle thumb pressure on the spinning wheel", "By baking in the high-heat kiln", "By adding dry colored powder", "By cutting with a sharp wire"],
      correct_answer: "By gentle thumb pressure on the spinning wheel",
      explanation: "The passage directly states: 'With gentle thumb pressure, the mound transformed into a graceful vase.'",
      marks: 1
    },
    {
      id: "q-c7-e-03",
      class_level: 7,
      subject: "English",
      topic: "Reading Comprehension",
      skill: "Inference & Subtext",
      difficulty: "MEDIUM",
      context_passage: "The farmers watched the overcast sky. Every dry gust of wind seemed to carry away their lingering hopes. When the first drop struck the cracked earth, a quiet sigh swept across the courtyard.",
      question_text: "What does the passage imply about the mood before the rain arrived?",
      question_type: "choice",
      options: ["Anxious and deeply concerned about drought", "Indifferent and relaxed", "Eager to celebrate a harvest", "Surprised by an unexpected storm"],
      correct_answer: "Anxious and deeply concerned about drought",
      explanation: "Phrases like 'dry gust', 'carry away lingering hopes', and 'cracked earth' point to acute anxiety regarding water scarcity.",
      marks: 1
    },
    {
      id: "q-c7-e-04",
      class_level: 7,
      subject: "English",
      topic: "Vocabulary",
      skill: "Contextual Nuance",
      difficulty: "HARD",
      question_text: "In the sentence 'Her argument was coherent and persuaded the jury', what does 'COHERENT' mean?",
      question_type: "choice",
      options: ["Logically connected and clear", "Loud and dramatic", "Lengthy and complex", "Emotional and biased"],
      correct_answer: "Logically connected and clear",
      explanation: "Coherent means logical, consistent, and clear in reasoning.",
      marks: 2
    },

    // ==========================================
    // CLASS 8 - MATHEMATICS & SCIENCE & ENGLISH
    // ==========================================
    {
      id: "q-c8-m-01",
      class_level: 8,
      subject: "Mathematics",
      topic: "Rational Numbers",
      skill: "Properties of Rational Numbers",
      difficulty: "FOUNDATIONAL",
      question_text: "What is the additive inverse of -7/19?",
      question_type: "choice",
      options: ["7/19", "-19/7", "19/7", "0"],
      correct_answer: "7/19",
      explanation: "The additive inverse of a number x is -x such that x + (-x) = 0. So -(-7/19) = 7/19.",
      marks: 1
    },
    {
      id: "q-c8-m-02",
      class_level: 8,
      subject: "Mathematics",
      topic: "Linear Equations",
      skill: "Variables on Both Sides",
      difficulty: "EASY",
      question_text: "Solve: 5x - 3 = 2x + 9",
      question_type: "choice",
      options: ["4", "3", "6", "2"],
      correct_answer: "4",
      explanation: "5x - 2x = 9 + 3 -> 3x = 12 -> x = 4.",
      marks: 1
    },
    {
      id: "q-c8-m-03",
      class_level: 8,
      subject: "Mathematics",
      topic: "Understanding Quadrilaterals",
      skill: "Angle Sum of Quadrilateral",
      difficulty: "MEDIUM",
      question_text: "Three angles of a quadrilateral are 80°, 95°, and 110°. Find the fourth angle.",
      question_type: "choice",
      options: ["75°", "85°", "65°", "90°"],
      correct_answer: "75°",
      explanation: "Sum of angles in a quadrilateral = 360°. 360° - (80° + 95° + 110°) = 360° - 285° = 75°.",
      marks: 1
    },
    {
      id: "q-c8-m-04",
      class_level: 8,
      subject: "Mathematics",
      topic: "Exponents and Powers",
      skill: "Laws of Exponents",
      difficulty: "HARD",
      question_text: "Evaluate: (2⁻¹ + 3⁻¹) ÷ 5⁻¹",
      question_type: "choice",
      options: ["25/6", "5/6", "6/25", "1"],
      correct_answer: "25/6",
      explanation: "(1/2 + 1/3) / (1/5) = (5/6) / (1/5) = (5/6) * 5 = 25/6.",
      marks: 2
    },
    {
      id: "q-c8-m-05",
      class_level: 8,
      subject: "Mathematics",
      topic: "Algebraic Expressions",
      skill: "Standard Algebraic Identities",
      difficulty: "ADVANCED",
      question_text: "Using standard identities, evaluate (103) × (97).",
      question_type: "choice",
      options: ["9991", "9981", "9891", "10009"],
      correct_answer: "9991",
      explanation: "(100 + 3)(100 - 3) = 100² - 3² = 10000 - 9 = 9991.",
      marks: 2
    },
    {
      id: "q-c8-s-01",
      class_level: 8,
      subject: "Science",
      topic: "Microorganisms",
      skill: "Microbial Roles & Diseases",
      difficulty: "FOUNDATIONAL",
      question_text: "Which bacterium promotes the formation of curd from milk?",
      question_type: "choice",
      options: ["Lactobacillus", "Rhizobium", "Spirogyra", "Yeast"],
      correct_answer: "Lactobacillus",
      explanation: "Lactobacillus bacteria multiply in milk and convert lactose into lactic acid, turning milk into curd.",
      marks: 1
    },
    {
      id: "q-c8-s-02",
      class_level: 8,
      subject: "Science",
      topic: "Force and Pressure",
      skill: "Pressure Calculation",
      difficulty: "MEDIUM",
      question_text: "If a force of 100 N acts on an area of 2 m², what is the pressure generated?",
      question_type: "choice",
      options: ["50 Pa", "200 Pa", "25 Pa", "100 Pa"],
      correct_answer: "50 Pa",
      explanation: "Pressure = Force / Area = 100 N / 2 m² = 50 Pascals (N/m²).",
      marks: 1
    },
    {
      id: "q-c8-s-03",
      class_level: 8,
      subject: "Science",
      topic: "Sound",
      skill: "Frequency & Pitch",
      difficulty: "HARD",
      question_text: "An object vibrates 50 times in 2 seconds. What is its frequency?",
      question_type: "choice",
      options: ["25 Hz", "50 Hz", "100 Hz", "10 Hz"],
      correct_answer: "25 Hz",
      explanation: "Frequency = Number of vibrations / Time = 50 / 2 = 25 Hz.",
      marks: 2
    },
    {
      id: "q-c8-e-01",
      class_level: 8,
      subject: "English",
      topic: "Grammar",
      skill: "Active and Passive Voice",
      difficulty: "MEDIUM",
      question_text: "Change to passive voice: 'The mechanic repaired the engine.'",
      question_type: "choice",
      options: ["The engine was repaired by the mechanic.", "The engine is being repaired by mechanic.", "The mechanic has been repairing engine.", "The engine had repaired the mechanic."],
      correct_answer: "The engine was repaired by the mechanic.",
      explanation: "Simple past active 'repaired' becomes 'was repaired by'.",
      marks: 1
    },
    {
      id: "q-c8-e-02",
      class_level: 8,
      subject: "English",
      topic: "Vocabulary",
      skill: "Idioms & Phrasal Verbs",
      difficulty: "HARD",
      question_text: "What is the meaning of the idiom 'to hit the nail on the head'?",
      question_type: "choice",
      options: ["To state an exact truth or be precisely right", "To cause physical harm accidentally", "To build something sturdy", "To make a careless mistake"],
      correct_answer: "To state an exact truth or be precisely right",
      explanation: "The idiom means to describe exactly what is causing a situation or problem.",
      marks: 2
    },

    // ==========================================
    // CLASS 9 - MATHEMATICS & SCIENCE & ENGLISH (AUTHORITATIVE NEW ENROLLMENT CLASS)
    // ==========================================
    {
      id: "q-c9-m-01",
      class_level: 9,
      subject: "Mathematics",
      topic: "Number Systems",
      skill: "Rational vs Irrational",
      difficulty: "FOUNDATIONAL",
      question_text: "Which of the following numbers is an irrational number?",
      question_type: "choice",
      options: ["√5", "√16", "3/7", "0.25"],
      correct_answer: "√5",
      explanation: "√5 cannot be expressed as a ratio of two integers; its decimal expansion is non-terminating and non-recurring.",
      marks: 1
    },
    {
      id: "q-c9-m-02",
      class_level: 9,
      subject: "Mathematics",
      topic: "Coordinate Geometry",
      skill: "Cartesian Quadrant Location",
      difficulty: "EASY",
      question_text: "In which quadrant does the point (-3, 4) lie?",
      question_type: "choice",
      options: ["Quadrant II", "Quadrant I", "Quadrant III", "Quadrant IV"],
      correct_answer: "Quadrant II",
      explanation: "Points with negative x-coordinate and positive y-coordinate lie in Quadrant II.",
      marks: 1
    },
    {
      id: "q-c9-m-03",
      class_level: 9,
      subject: "Mathematics",
      topic: "Polynomials",
      skill: "Remainder & Factor Theorem",
      difficulty: "MEDIUM",
      question_text: "Find the remainder when p(x) = x³ - 3x² + 4x - 2 is divided by (x - 2).",
      question_type: "choice",
      options: ["2", "0", "-2", "4"],
      correct_answer: "2",
      explanation: "By remainder theorem, remainder = p(2) = 2³ - 3(2²) + 4(2) - 2 = 8 - 12 + 8 - 2 = 2.",
      marks: 1
    },
    {
      id: "q-c9-m-04",
      class_level: 9,
      subject: "Mathematics",
      topic: "Linear Equations in Two Variables",
      skill: "Coordinate Solutions",
      difficulty: "HARD",
      question_text: "If (2k - 1, k) is a solution of 10x - 9y = 12, find the value of k.",
      question_type: "choice",
      options: ["2", "1", "3", "4"],
      correct_answer: "2",
      explanation: "10(2k - 1) - 9k = 12 -> 20k - 10 - 9k = 12 -> 11k = 22 -> k = 2.",
      marks: 2
    },
    {
      id: "q-c9-m-05",
      class_level: 9,
      subject: "Mathematics",
      topic: "Lines and Angles",
      skill: "Parallel Lines & Transversals",
      difficulty: "ADVANCED",
      question_text: "If two parallel lines are cut by a transversal and the interior angles on the same side are in ratio 4:5, find the smaller angle.",
      question_type: "choice",
      options: ["80°", "100°", "75°", "85°"],
      correct_answer: "80°",
      explanation: "Consecutive interior angles sum to 180°. 4x + 5x = 180° -> 9x = 180° -> x = 20°. Smaller angle = 4(20) = 80°.",
      marks: 2
    },
    {
      id: "q-c9-s-01",
      class_level: 9,
      subject: "Science",
      topic: "Matter in Our Surroundings",
      skill: "States of Matter & Latent Heat",
      difficulty: "FOUNDATIONAL",
      question_text: "What is the physical state of water at 100°C under normal atmospheric pressure?",
      question_type: "choice",
      options: ["Both liquid and gas (vapor) in equilibrium", "Solid only", "Liquid only", "Plasma"],
      correct_answer: "Both liquid and gas (vapor) in equilibrium",
      explanation: "At 100°C, water reaches its boiling point where liquid water and water vapor coexist as latent heat of vaporization is absorbed.",
      marks: 1
    },
    {
      id: "q-c9-s-02",
      class_level: 9,
      subject: "Science",
      topic: "Motion",
      skill: "Equations of Motion",
      difficulty: "MEDIUM",
      question_text: "An object starts from rest and accelerates uniformly at 2 m/s² for 5 seconds. What is its final velocity?",
      question_type: "choice",
      options: ["10 m/s", "25 m/s", "5 m/s", "20 m/s"],
      correct_answer: "10 m/s",
      explanation: "Using v = u + at, u = 0, a = 2, t = 5: v = 0 + (2 * 5) = 10 m/s.",
      marks: 1
    },
    {
      id: "q-c9-s-03",
      class_level: 9,
      subject: "Science",
      topic: "Gravitation",
      skill: "Universal Law of Gravitation",
      difficulty: "HARD",
      question_text: "If the distance between two masses is doubled, by what factor does the gravitational force between them change?",
      question_type: "choice",
      options: ["Decreases to 1/4", "Decreases to 1/2", "Doubles", "Remains unchanged"],
      correct_answer: "Decreases to 1/4",
      explanation: "Gravitational force F is inversely proportional to r² (F ∝ 1/r²). Doubling r reduces F by (1/2)² = 1/4.",
      marks: 2
    },
    {
      id: "q-c9-e-01",
      class_level: 9,
      subject: "English",
      topic: "Grammar",
      skill: "Reported Speech",
      difficulty: "MEDIUM",
      question_text: "Convert to indirect speech: She said, 'I will complete the assignment tomorrow.'",
      question_type: "choice",
      options: ["She said that she would complete the assignment the next day.", "She said that she will complete the assignment tomorrow.", "She told that she would complete assignment yesterday.", "She says she will complete it."],
      correct_answer: "She said that she would complete the assignment the next day.",
      explanation: "'will' shifts to 'would' and 'tomorrow' shifts to 'the next day'.",
      marks: 1
    },
    {
      id: "q-c9-e-02",
      class_level: 9,
      subject: "English",
      topic: "Reading Comprehension",
      skill: "Inference from Literary Text",
      difficulty: "HARD",
      context_passage: "The wind howled through the dilapidated shutters, carrying the salty aroma of a forgotten coast. In that dimly lit room, every ticking second echoed a choice that could never be undone.",
      question_text: "What atmospheric mood does the author establish?",
      question_type: "choice",
      options: ["Somber and suspenseful", "Joyous and celebratory", "Indifferent and factual", "Comedic and lighthearted"],
      correct_answer: "Somber and suspenseful",
      explanation: "Words like 'howled', 'dilapidated', 'forgotten coast', and 'never be undone' create a somber, suspenseful mood.",
      marks: 2
    },

    // ==========================================
    // CLASS 10 - MATHEMATICS & SCIENCE & ENGLISH
    // ==========================================
    {
      id: "q-c10-m-01",
      class_level: 10,
      subject: "Mathematics",
      topic: "Real Numbers",
      skill: "Fundamental Theorem of Arithmetic",
      difficulty: "FOUNDATIONAL",
      question_text: "If HCF(306, 657) = 9, what is LCM(306, 657)?",
      question_type: "choice",
      options: ["22338", "22388", "21338", "23338"],
      correct_answer: "22338",
      explanation: "LCM = (Product of numbers) / HCF = (306 * 657) / 9 = 34 * 657 = 22338.",
      marks: 1
    },
    {
      id: "q-c10-m-02",
      class_level: 10,
      subject: "Mathematics",
      topic: "Quadratic Equations",
      skill: "Roots of Quadratic & Discriminant",
      difficulty: "MEDIUM",
      question_text: "Find the discriminant of the quadratic equation 2x² - 4x + 3 = 0.",
      question_type: "choice",
      options: ["-8", "8", "40", "-24"],
      correct_answer: "-8",
      explanation: "Discriminant D = b² - 4ac = (-4)² - 4(2)(3) = 16 - 24 = -8.",
      marks: 1
    },
    {
      id: "q-c10-m-03",
      class_level: 10,
      subject: "Mathematics",
      topic: "Arithmetic Progressions",
      skill: "nth Term of AP",
      difficulty: "HARD",
      question_text: "Find the 10th term of the AP: 2, 7, 12, 17...",
      question_type: "choice",
      options: ["47", "52", "42", "50"],
      correct_answer: "47",
      explanation: "a = 2, d = 5. a₁₀ = a + 9d = 2 + 9(5) = 2 + 45 = 47.",
      marks: 2
    },
    {
      id: "q-c10-m-04",
      class_level: 10,
      subject: "Mathematics",
      topic: "Trigonometry",
      skill: "Trigonometric Identities",
      difficulty: "ADVANCED",
      question_text: "Evaluate: (sin 30° + tan 45° - cosec 60°) / (sec 30° + cos 60° + cot 45°)",
      question_type: "choice",
      options: ["(43 - 24√3) / 11", "(43 + 24√3) / 11", "1", "√3/2"],
      correct_answer: "(43 - 24√3) / 11",
      explanation: "Substitute standard trigonometric values (1/2 + 1 - 2/√3) / (2/√3 + 1/2 + 1) and rationalize denominator to obtain (43 - 24√3) / 11.",
      marks: 2
    },
    {
      id: "q-c10-s-01",
      class_level: 10,
      subject: "Science",
      topic: "Electricity",
      skill: "Ohm's Law & Circuit Equivalent",
      difficulty: "MEDIUM",
      question_text: "Two resistors of 6 Ω and 3 Ω are connected in parallel. What is their equivalent resistance?",
      question_type: "choice",
      options: ["2 Ω", "9 Ω", "18 Ω", "4.5 Ω"],
      correct_answer: "2 Ω",
      explanation: "1/R_eq = 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2 -> R_eq = 2 Ω.",
      marks: 1
    },
    {
      id: "q-c10-s-02",
      class_level: 10,
      subject: "Science",
      topic: "Light - Reflection and Refraction",
      skill: "Mirror Formula & Magnification",
      difficulty: "HARD",
      question_text: "A concave mirror produces a real image of magnification -2 for an object placed at 15 cm. What is the image distance v?",
      question_type: "choice",
      options: ["-30 cm", "+30 cm", "-7.5 cm", "+15 cm"],
      correct_answer: "-30 cm",
      explanation: "m = -v/u -> -2 = -v / (-15) -> v = -30 cm.",
      marks: 2
    },
    {
      id: "q-c10-e-01",
      class_level: 10,
      subject: "English",
      topic: "Reading Comprehension",
      skill: "Tone & Theme Analysis",
      difficulty: "HARD",
      context_passage: "The technological shift did not merely accelerate commerce; it redefined solitude. In a world ceaselessly connected, silence became an elusive luxury.",
      question_text: "What is the primary reflection presented in the passage?",
      question_type: "choice",
      options: ["Constant connectivity has eroded quiet contemplation and solitude.", "Commerce has failed to adopt modern networks.", "Technology is exclusively beneficial for remote workers.", "Silence is widely celebrated in modern media."],
      correct_answer: "Constant connectivity has eroded quiet contemplation and solitude.",
      explanation: "The author explicitly notes that continuous digital connection has made solitude and silence elusive.",
      marks: 2
    },

    // ==========================================
    // CLASS 11 - MATHEMATICS & SCIENCE & ENGLISH
    // ==========================================
    {
      id: "q-c11-m-01",
      class_level: 11,
      subject: "Mathematics",
      topic: "Sets and Functions",
      skill: "Set Cardinality & Unions",
      difficulty: "FOUNDATIONAL",
      question_text: "If n(A) = 15, n(B) = 20, and n(A ∪ B) = 30, what is n(A ∩ B)?",
      question_type: "choice",
      options: ["5", "10", "15", "0"],
      correct_answer: "5",
      explanation: "n(A ∩ B) = n(A) + n(B) - n(A ∪ B) = 15 + 20 - 30 = 5.",
      marks: 1
    },
    {
      id: "q-c11-m-02",
      class_level: 11,
      subject: "Mathematics",
      topic: "Complex Numbers",
      skill: "Modulus & Conjugate",
      difficulty: "MEDIUM",
      question_text: "What is the modulus of the complex number z = 3 - 4i?",
      question_type: "choice",
      options: ["5", "7", "√7", "25"],
      correct_answer: "5",
      explanation: "|z| = √(3² + (-4)²) = √(9 + 16) = √25 = 5.",
      marks: 1
    },
    {
      id: "q-c11-m-03",
      class_level: 11,
      subject: "Mathematics",
      topic: "Permutations and Combinations",
      skill: "Combinatorial Selection",
      difficulty: "HARD",
      question_text: "In how many ways can a committee of 3 people be chosen from 7 candidates?",
      question_type: "choice",
      options: ["35", "210", "42", "21"],
      correct_answer: "35",
      explanation: "7C3 = (7 * 6 * 5) / (3 * 2 * 1) = 35.",
      marks: 2
    },
    {
      id: "q-c11-s-01",
      class_level: 11,
      subject: "Science",
      topic: "Laws of Motion",
      skill: "Momentum & Impulse",
      difficulty: "MEDIUM",
      question_text: "A force of 50 N acts on a 5 kg mass for 2 seconds. What is the change in momentum?",
      question_type: "choice",
      options: ["100 kg·m/s", "50 kg·m/s", "250 kg·m/s", "20 kg·m/s"],
      correct_answer: "100 kg·m/s",
      explanation: "Change in momentum = Impulse = Force * Time = 50 N * 2 s = 100 kg·m/s.",
      marks: 2
    },
    {
      id: "q-c11-s-02",
      class_level: 11,
      subject: "Science",
      topic: "Thermodynamics",
      skill: "First Law of Thermodynamics",
      difficulty: "HARD",
      question_text: "A thermodynamic system absorbs 300 J of heat while performing 120 J of work. What is the change in its internal energy ΔU?",
      question_type: "choice",
      options: ["+180 J", "+420 J", "-180 J", "+300 J"],
      correct_answer: "+180 J",
      explanation: "By First Law: ΔU = Q - W = 300 J - 120 J = 180 J.",
      marks: 2
    },
    {
      id: "q-c11-e-01",
      class_level: 11,
      subject: "English",
      topic: "Vocabulary",
      skill: "Etymology & Rhetorical Devices",
      difficulty: "HARD",
      question_text: "Which figure of speech is used in: 'The city was a buzzing beehive of industry'?",
      question_type: "choice",
      options: ["Metaphor", "Simile", "Hyperbole", "Oxymoron"],
      correct_answer: "Metaphor",
      explanation: "It is a direct comparison between the city and a beehive without using 'like' or 'as', which makes it a metaphor.",
      marks: 1
    },

    // ==========================================
    // CLASS 12 - MATHEMATICS & SCIENCE & ENGLISH
    // ==========================================
    {
      id: "q-c12-m-01",
      class_level: 12,
      subject: "Mathematics",
      topic: "Calculus",
      skill: "Derivatives & Rate of Change",
      difficulty: "FOUNDATIONAL",
      question_text: "Find the derivative of f(x) = x³ - 5x² + 7 at x = 2.",
      question_type: "choice",
      options: ["-8", "2", "-4", "12"],
      correct_answer: "-8",
      explanation: "f'(x) = 3x² - 10x. f'(2) = 3(4) - 10(2) = 12 - 20 = -8.",
      marks: 1
    },
    {
      id: "q-c12-m-02",
      class_level: 12,
      subject: "Mathematics",
      topic: "Matrices and Determinants",
      skill: "Determinant Evaluation",
      difficulty: "MEDIUM",
      question_text: "If A is a 2x2 matrix with |A| = 4, find |3A|.",
      question_type: "choice",
      options: ["36", "12", "16", "24"],
      correct_answer: "36",
      explanation: "For an n x n matrix, |kA| = kⁿ |A|. For n = 2, |3A| = 3² |A| = 9 * 4 = 36.",
      marks: 1
    },
    {
      id: "q-c12-m-03",
      class_level: 12,
      subject: "Mathematics",
      topic: "Integrals",
      skill: "Definite Integrals",
      difficulty: "HARD",
      question_text: "Evaluate: ∫₀¹ (3x² + 2x) dx",
      question_type: "choice",
      options: ["2", "1", "3", "5/2"],
      correct_answer: "2",
      explanation: "[x³ + x²]₀¹ = (1 + 1) - 0 = 2.",
      marks: 2
    },
    {
      id: "q-c12-s-01",
      class_level: 12,
      subject: "Science",
      topic: "Electromagnetic Induction",
      skill: "Faraday's Law",
      difficulty: "MEDIUM",
      question_text: "The induced electromotive force (EMF) in a coil is proportional to what rate?",
      question_type: "choice",
      options: ["Rate of change of magnetic flux", "Rate of change of resistance", "Absolute magnetic field strength only", "Temperature difference across the coil"],
      correct_answer: "Rate of change of magnetic flux",
      explanation: "By Faraday's Law, induced EMF = -dΦ/dt, which is directly proportional to the time rate of change of magnetic flux.",
      marks: 2
    },
    {
      id: "q-c12-s-02",
      class_level: 12,
      subject: "Science",
      topic: "Modern Physics",
      skill: "Photoelectric Effect",
      difficulty: "HARD",
      question_text: "In the photoelectric effect, increasing the intensity of incident light above the threshold frequency causes which change?",
      question_type: "choice",
      options: ["Increases the number of emitted photoelectrons", "Increases the maximum kinetic energy of electrons", "Decreases the stopping potential", "Shifts the threshold frequency"],
      correct_answer: "Increases the number of emitted photoelectrons",
      explanation: "Intensity determines photon flux, directly increasing the number of emitted photoelectrons, while kinetic energy depends solely on light frequency.",
      marks: 2
    },
    {
      id: "q-c12-e-01",
      class_level: 12,
      subject: "English",
      topic: "Advanced Comprehension",
      skill: "Synthesizing Perspectives",
      difficulty: "ADVANCED",
      context_passage: "While empiricism insists upon observable phenomena as the sole foundation of knowledge, theoretical physics increasingly relies on mathematical elegance to postulate dimensions beyond direct verification.",
      question_text: "What epistemological tension does the author highlight?",
      question_type: "choice",
      options: ["The tension between empirical observation and mathematical theoretical abstraction.", "The decline of mathematics in experimental scientific inquiry.", "The superiority of historical observation over physics.", "The elimination of experimental labs in modern universities."],
      correct_answer: "The tension between empirical observation and mathematical theoretical abstraction.",
      explanation: "The passage directly contrasts empirical observation with mathematical elegance that reaches beyond direct observational verification.",
      marks: 2
    }
  ];

  for (const q of questions) {
    await query(
      `INSERT INTO questions (id, class_level, subject, topic, skill, difficulty, question_text, question_type, context_passage, options, correct_answer, explanation, marks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        q.id,
        q.class_level,
        q.subject,
        q.topic,
        q.skill,
        q.difficulty,
        q.question_text,
        q.question_type,
        q.context_passage ?? null,
        JSON.stringify(q.options),
        q.correct_answer,
        q.explanation,
        q.marks
      ]
    );
  }
  console.log(`[Seed] Inserted ${questions.length} curriculum questions across Classes 6-12.`);

  // 2. Seed Schools Entity
  const schools = [
    { id: "sch-dps-delhi", name: "Delhi Public School, R.K. Puram", location: "New Delhi", school_code: "DPS-DEL-01" },
    { id: "sch-kv-bangalore", name: "Kendriya Vidyalaya, Hebbal", location: "Bangalore", school_code: "KV-BLR-02" },
    { id: "sch-nps-mumbai", name: "National Public School", location: "Mumbai", school_code: "NPS-MUM-03" },
  ];

  for (const sch of schools) {
    await query(
      `INSERT INTO schools (id, name, location, school_code) VALUES ($1, $2, $3, $4)`,
      [sch.id, sch.name, sch.location, sch.school_code]
    );
  }

  // 3. Seed Classrooms for DPS (Classes 6 to 12)
  for (let c = 6; c <= 12; c++) {
    await query(
      `INSERT INTO classrooms (id, school_id, class_level, section, academic_year) VALUES ($1, $2, $3, $4, $5)`,
      [`cls-dps-c${c}`, "sch-dps-delhi", c, "A", "2026-2027"]
    );
  }
  console.log("[Seed] Curriculum catalog and schools ready.");
}

export async function seedDatabase(): Promise<void> {
  console.log("[Seed] Starting full database seeding (Catalog + Demo Cohort)...");
  await resetDatabase();
  await seedCurriculumCatalog();

  // 4. Seed Users & Profiles (Supabase Auth references)
  const seedStudentData = [
    { id: "usr-aarav", profileId: "std-aarav", name: "Aarav Kumar", email: "aarav@sikshasetu.edu", classLevel: 7, score: 44, group: "GROUP_A", xp: 320 },
    { id: "usr-ananya", profileId: "std-ananya", name: "Ananya Sen", email: "ananya@sikshasetu.edu", classLevel: 7, score: 63, group: "GROUP_B", xp: 580 },
    { id: "usr-vihaan", profileId: "std-vihaan", name: "Vihaan Reddy", email: "vihaan@sikshasetu.edu", classLevel: 7, score: 87, group: "GROUP_C", xp: 940 },
    { id: "usr-diya", profileId: "std-diya", name: "Diya Sharma", email: "diya@sikshasetu.edu", classLevel: 7, score: 56, group: "GROUP_B", xp: 460 },
    { id: "usr-arjun", profileId: "std-arjun", name: "Arjun Mehta", email: "arjun@sikshasetu.edu", classLevel: 7, score: 91, group: "GROUP_C", xp: 1100 },
    { id: "usr-ishita", profileId: "std-ishita", name: "Ishita Patel", email: "ishita@sikshasetu.edu", classLevel: 7, score: 39, group: "GROUP_A", xp: 280 },
    { id: "usr-rishi", profileId: "std-rishi", name: "Rishi Patel", email: "rishi@sikshasetu.edu", classLevel: 9, score: 76, group: "GROUP_C", xp: 820 },
  ];

  for (const s of seedStudentData) {
    // User record referencing Supabase Auth
    await query(
      `INSERT INTO users (id, supabase_user_id, email, role) VALUES ($1, $2, $3, $4)`,
      [s.id, `sb-auth-${s.id}`, s.email, "student"]
    );

    // Student Profile
    await query(
      `INSERT INTO student_profiles (id, user_id, school_id, name, school, class_level, preferred_language, xp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [s.profileId, s.id, "sch-dps-delhi", s.name, "Delhi Public School, R.K. Puram", s.classLevel, "English", s.xp]
    );

    // Classroom Enrollment
    const classroomId = `cls-dps-c${s.classLevel}`;
    await query(
      `INSERT INTO class_enrollments (id, student_id, classroom_id, status)
       VALUES ($1, $2, $3, $4)`,
      [`enr-${s.profileId}`, s.profileId, classroomId, "active"]
    );

    // Diagnostic Attempt & Result
    const attemptId = `diag-att-${s.profileId}`;
    await query(
      `INSERT INTO diagnostic_attempts (id, student_id, class_level, status, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [attemptId, s.profileId, s.classLevel, "completed", new Date(Date.now() - 86400000 * 3).toISOString(), new Date(Date.now() - 86400000 * 3 + 1200000).toISOString()]
    );

    const subjectScores = {
      Mathematics: Math.round(s.score * 0.95),
      Science: Math.round(s.score * 1.05 > 100 ? 100 : s.score * 1.05),
      English: s.score
    };

    const skillEvidence = [
      { subject: "Mathematics", skill: "Integers & Operations", score: s.score + 5 > 100 ? 100 : s.score + 5, status: s.score >= 71 ? "Strong" : s.score >= 51 ? "Good" : "Developing" },
      { subject: "Mathematics", skill: "Simple Equations", score: s.score, status: s.score >= 71 ? "Good" : s.score >= 51 ? "Developing" : "Needs Support" },
      { subject: "Mathematics", skill: "Algebraic Expressions", score: Math.max(20, s.score - 6), status: s.score >= 71 ? "Good" : s.score >= 51 ? "Developing" : "Needs Support" },
      { subject: "Science", skill: "Physical & Chemical Changes", score: s.score + 2, status: s.score >= 71 ? "Strong" : s.score >= 51 ? "Good" : "Developing" },
      { subject: "English", skill: "Reading Inference", score: s.score - 4, status: s.score >= 71 ? "Good" : s.score >= 51 ? "Developing" : "Needs Support" },
    ];

    await query(
      `INSERT INTO diagnostic_results (id, attempt_id, student_id, class_level, raw_score, maximum_score, normalized_score, group_type, subject_scores, skill_evidence, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        `diag-res-${s.profileId}`,
        attemptId,
        s.profileId,
        s.classLevel,
        s.score,
        100,
        s.score,
        s.group,
        JSON.stringify(subjectScores),
        JSON.stringify(skillEvidence),
        new Date(Date.now() - 86400000 * 3 + 1200000).toISOString()
      ]
    );

    // Seed Subject Progress
    await query(
      `INSERT INTO subject_progress (id, student_id, subject, progress_score, previous_score, growth)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`sp-${s.profileId}-math`, s.profileId, "Mathematics", subjectScores.Mathematics, Math.max(30, subjectScores.Mathematics - 8), 8]
    );
    await query(
      `INSERT INTO subject_progress (id, student_id, subject, progress_score, previous_score, growth)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`sp-${s.profileId}-sci`, s.profileId, "Science", subjectScores.Science, Math.max(30, subjectScores.Science - 5), 5]
    );
    await query(
      `INSERT INTO subject_progress (id, student_id, subject, progress_score, previous_score, growth)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`sp-${s.profileId}-eng`, s.profileId, "English", subjectScores.English, Math.max(30, subjectScores.English - 6), 6]
    );

    // Seed Learning Evidence Rows
    for (const sk of skillEvidence) {
      await query(
        `INSERT INTO learning_evidence (id, student_id, subject, topic, skill, mastery_score, status, evidence_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [`le-${s.profileId}-${sk.skill.replace(/\s+/g, "_")}`, s.profileId, sk.subject, "Core Topic", sk.skill, sk.score, sk.status, 3]
      );
    }

    // Seed Streaks
    await query(
      `INSERT INTO student_streaks (id, student_id, current_streak, longest_streak, last_activity_date, active_days)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`strk-${s.profileId}`, s.profileId, 8, 12, new Date().toISOString().split("T")[0], JSON.stringify([1, 1, 1, 1, 1, 0, 1])]
    );

    // Seed Achievements
    await query(
      `INSERT INTO student_achievements (id, student_id, badge_key, title, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [`ach-${s.profileId}-1`, s.profileId, "FIRST_CHECK", "First Learning Check", "Completed baseline diagnostic check"]
    );
    if (s.score >= 50) {
      await query(
        `INSERT INTO student_achievements (id, student_id, badge_key, title, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [`ach-${s.profileId}-2`, s.profileId, "STREAK_7", "7-Day Streak", "Practised consistently for 7 consecutive days"]
      );
    }
  }

  // 5. Seed Teachers & Classroom Assignments
  // Teacher 1: Ms. Sunita Sharma (Mathematics)
  await query(
    `INSERT INTO users (id, supabase_user_id, email, role) VALUES ($1, $2, $3, $4)`,
    ["usr-teacher-1", "sb-auth-usr-teacher-1", "teacher@sikshasetu.edu", "teacher"]
  );
  await query(
    `INSERT INTO teacher_profiles (id, user_id, school_id, name, school, subject_specialization, class_assignments)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    ["tch-sharma", "usr-teacher-1", "sch-dps-delhi", "Ms. Sunita Sharma", "Delhi Public School, R.K. Puram", "Mathematics", JSON.stringify(["Class 7", "Class 9"])]
  );

  // Assign Ms. Sharma to Class 7 and Class 9
  await query(
    `INSERT INTO teacher_classrooms (id, teacher_id, classroom_id, subject) VALUES ($1, $2, $3, $4)`,
    ["tc-sharma-c7", "tch-sharma", "cls-dps-c7", "Mathematics"]
  );
  await query(
    `INSERT INTO teacher_classrooms (id, teacher_id, classroom_id, subject) VALUES ($1, $2, $3, $4)`,
    ["tc-sharma-c9", "tch-sharma", "cls-dps-c9", "Mathematics"]
  );

  // Teacher 2: Mr. Rajesh Patel (Science)
  await query(
    `INSERT INTO users (id, supabase_user_id, email, role) VALUES ($1, $2, $3, $4)`,
    ["usr-teacher-2", "sb-auth-usr-teacher-2", "patel.science@sikshasetu.edu", "teacher"]
  );
  await query(
    `INSERT INTO teacher_profiles (id, user_id, school_id, name, school, subject_specialization, class_assignments)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    ["tch-patel", "usr-teacher-2", "sch-dps-delhi", "Mr. Rajesh Patel", "Delhi Public School, R.K. Puram", "Science", JSON.stringify(["Class 7", "Class 9"])]
  );
  await query(
    `INSERT INTO teacher_classrooms (id, teacher_id, classroom_id, subject) VALUES ($1, $2, $3, $4)`,
    ["tc-patel-c7", "tch-patel", "cls-dps-c7", "Science"]
  );
  await query(
    `INSERT INTO teacher_classrooms (id, teacher_id, classroom_id, subject) VALUES ($1, $2, $3, $4)`,
    ["tc-patel-c9", "tch-patel", "cls-dps-c9", "Science"]
  );

  // 6. Seed Parent User & Profile (Parent of Aarav)
  await query(
    `INSERT INTO users (id, supabase_user_id, email, role) VALUES ($1, $2, $3, $4)`,
    ["usr-parent-1", "sb-auth-usr-parent-1", "parent@sikshasetu.edu", "parent"]
  );
  await query(
    `INSERT INTO parent_profiles (id, user_id, name, student_id)
     VALUES ($1, $2, $3, $4)`,
    ["par-patel", "usr-parent-1", "Mr. Rajesh Kumar", "std-aarav"]
  );

  // 7. Seed Friendly Fire Competition Connections
  // Aarav & Vihaan: Accepted competition
  await query(
    `INSERT INTO competition_connections (id, requester_student_id, recipient_student_id, status, accepted_at)
     VALUES ($1, $2, $3, $4, $5)`,
    ["comp-aarav-vihaan", "std-aarav", "std-vihaan", "accepted", new Date(Date.now() - 86400000).toISOString()]
  );

  // Aarav & Ananya: Accepted competition
  await query(
    `INSERT INTO competition_connections (id, requester_student_id, recipient_student_id, status, accepted_at)
     VALUES ($1, $2, $3, $4, $5)`,
    ["comp-aarav-ananya", "std-aarav", "std-ananya", "accepted", new Date(Date.now() - 86400000 * 2).toISOString()]
  );

  // Arjun -> Aarav: Pending incoming challenge for Aarav
  await query(
    `INSERT INTO competition_connections (id, requester_student_id, recipient_student_id, status)
     VALUES ($1, $2, $3, $4)`,
    ["comp-arjun-aarav", "std-arjun", "std-aarav", "pending"]
  );

  // 8. Seed Teacher-Created Assessment with Personalized Assignments
  const demoAssessmentId = "asmt-c7-math-algebra";
  await query(
    `INSERT INTO adaptive_assessments (id, teacher_id, classroom_id, class_level, subject, topics, title, purpose, question_count, adaptive_mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      demoAssessmentId,
      "tch-sharma",
      "cls-dps-c7",
      7,
      "Mathematics",
      JSON.stringify(["Simple Equations", "Algebraic Expressions"]),
      "Class 7 Algebra Assessment",
      "Practice / Check",
      3,
      true
    ]
  );

  // Assign to Aarav (Group A -> Foundational / Easy questions)
  await query(
    `INSERT INTO assessment_assignments (id, assessment_id, student_id, group_type, assigned_question_ids, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ["asgn-aarav-alg", demoAssessmentId, "std-aarav", "GROUP_A", JSON.stringify(["q-c7-m-01", "q-c7-m-02", "q-c7-m-03"]), "pending"]
  );

  // Assign to Ananya (Group B -> Moderate questions)
  await query(
    `INSERT INTO assessment_assignments (id, assessment_id, student_id, group_type, assigned_question_ids, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ["asgn-ananya-alg", demoAssessmentId, "std-ananya", "GROUP_B", JSON.stringify(["q-c7-m-03", "q-c7-m-04", "q-c7-m-05"]), "pending"]
  );

  // Assign to Vihaan (Group C -> Advanced / Challenging questions)
  await query(
    `INSERT INTO assessment_assignments (id, assessment_id, student_id, group_type, assigned_question_ids, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ["asgn-vihaan-alg", demoAssessmentId, "std-vihaan", "GROUP_C", JSON.stringify(["q-c7-m-07", "q-c7-m-08", "q-c7-m-09"]), "pending"]
  );

  // 9. Seed Practice Activities for Student
  await query(
    `INSERT INTO practice_activities (id, student_id, title, subject, topic, skill, minutes, level, progress)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    ["prac-1", "std-aarav", "5-Minute Algebra Boost", "Mathematics", "Simple Equations", "One-step balancing", 5, "Foundation", 40]
  );
  await query(
    `INSERT INTO practice_activities (id, student_id, title, subject, topic, skill, minutes, level, progress)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    ["prac-2", "std-aarav", "Paragraph Reading Practice", "English", "Reading Comprehension", "Main idea & inference", 8, "Foundation", 15]
  );
  await query(
    `INSERT INTO practice_activities (id, student_id, title, subject, topic, skill, minutes, level, progress)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    ["prac-3", "std-aarav", "Acids & Bases Exploration", "Science", "Acids, Bases and Salts", "Litmus test reactions", 7, "Build", 60]
  );

  // 10. Seed Quizzes
  await query(
    `INSERT INTO quizzes (id, class_level, subject, topic, title, quiz_type, question_ids)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    ["quiz-quick-c7", 7, "Mathematics", "Quick Math Check", "5-Minute Rapid Math Quiz", "Quick", JSON.stringify(["q-c7-m-01", "q-c7-m-03", "q-c7-m-06"])]
  );

  console.log("[Seed] Database successfully seeded with real schools, classrooms, questions, users, diagnostic results, and assignments!");
}
