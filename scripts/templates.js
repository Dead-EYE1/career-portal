const templates = {
  // =======================================================
  // STAFF SELECTION COMMISSION (SSC)
  // =======================================================
  'ssc-cgl': {
    company: "Staff Selection Commission (SSC)",
    category: "government",
    selection_process: "Tier-I (CBT), Tier-II (CBT & DEST), Document Verification",
    salary: "₹25,500 – ₹1,51,100 (Pay Level 4 to 8)",
    education: "Graduation in any discipline from a recognized University.",
    age_limit: "18 to 32 Years (varies by post)",
    application_fee: "General/OBC/EWS: ₹ 100/- | SC/ST/Women/ESM: Nil",
    payment_mode: "Online (Net Banking, Card, UPI)",
    exam_details: {
      phases: [
        {
          title: "Tier-I Exam Pattern (Qualifying)",
          pattern: [
            { section: "General Intelligence & Reasoning", questions: 25, marks: 50, time: "60 mins total" },
            { section: "General Awareness", questions: 25, marks: 50, time: "60 mins total" },
            { section: "Quantitative Aptitude", questions: 25, marks: 50, time: "60 mins total" },
            { section: "English Comprehension", questions: 25, marks: 50, time: "60 mins total" }
          ]
        },
        {
          title: "Tier-II Exam Pattern (Merit-Determining)",
          pattern: [
            { section: "Paper I: Mathematical Abilities & Reasoning", questions: 60, marks: 180, time: "1 Hour" },
            { section: "Paper I: English & General Awareness", questions: 70, marks: 210, time: "1 Hour" },
            { section: "Paper I: Computer Knowledge (Qualifying)", questions: 20, marks: 60, time: "15 mins" }
          ]
        }
      ],
      mode: "Computer Based Test (CBT)",
      negative_marking: 0.5,
      detailed_syllabus: [
        { subject: "General Intelligence & Reasoning (Tier I & II)", topics: ["Analogies", "Similarities and differences", "Space visualization", "Spatial orientation", "Problem solving", "Analysis", "Judgment"] },
        { subject: "General Awareness (Tier I & II)", topics: ["History", "Culture", "Geography", "Economic Scene", "General policy", "Scientific research"] },
        { subject: "Quantitative Aptitude (Tier I & II)", topics: ["Computation of whole numbers", "Decimals, fractions", "Percentage", "Ratio & Proportion", "Square roots", "Averages", "Interest", "Profit and Loss"] },
        { subject: "English Comprehension (Tier I & II)", topics: ["Reading comprehension", "Grammar", "Vocabulary", "Synonyms and Antonyms", "Sentence completion"] },
        { subject: "Computer Knowledge (Tier II Only)", topics: ["Computer Basics", "Software", "Internet and e-mail", "Basics of networking and cyber security"] }
      ],
      note: "Tier-II has sectional timings and 1 mark negative marking per wrong answer in Paper I."
    },
    details: `<p>The SSC Combined Graduate Level (CGL) examination is conducted for recruitment to various Group B & C posts in Central Government Ministries and Departments.</p>`
  },

  'ssc-mts': {
    company: "Staff Selection Commission (SSC)",
    category: "government",
    selection_process: "Computer Based Examination (CBE) & PET/PST (only for Havaldar)",
    salary: "Pay Level-1 as per 7th CPC (Approx. ₹28,000 - ₹32,000/month)",
    education: "10th Pass (Matriculation) from a recognized Board.",
    age_limit: "18 to 25 Years / 18 to 27 Years (depending on post)",
    application_fee: "General/OBC/EWS: ₹ 100/- | SC/ST/Women/ESM: Nil",
    payment_mode: "Online (Net Banking, Card, UPI)",
    exam_details: {
      phases: [
        {
          title: "Session-I (No Negative Marking)",
          pattern: [
            { section: "Numerical and Mathematical Ability", questions: 20, marks: 60, time: "45 mins" },
            { section: "Reasoning Ability and Problem Solving", questions: 20, marks: 60, time: "45 mins" }
          ]
        },
        {
          title: "Session-II (Negative Marking of 1 Mark)",
          pattern: [
            { section: "General Awareness", questions: 25, marks: 75, time: "45 mins" },
            { section: "English Language and Comprehension", questions: 25, marks: 75, time: "45 mins" }
          ]
        }
      ],
      mode: "Computer Based Test (CBT)",
      negative_marking: "1 Mark (Only in Session-II)",
      detailed_syllabus: [
        { subject: "Numerical & Mathematical Ability", topics: ["Integers", "LCM & HCF", "Decimals", "Fractions", "BODMAS", "Percentage", "Ratio & Proportion", "Work & Time"] },
        { subject: "Reasoning Ability", topics: ["Alpha-Numeric Series", "Coding & Decoding", "Analogy", "Following Directions", "Similarities & Differences", "Jumbling"] },
        { subject: "General Awareness", topics: ["History", "Geography", "Art and Culture", "Civics", "Economics", "General Science (up to 10th standard)"] },
        { subject: "English Language", topics: ["Vocabulary", "Grammar", "Sentence Structure", "Synonyms & Antonyms", "Comprehension"] }
      ],
      note: "Session-I is qualifying in nature. Merit will be decided solely based on performance in Session-II."
    }
  },

  'ssc-chsl': {
    company: "Staff Selection Commission (SSC)",
    category: "government",
    selection_process: "Tier-I (CBT), Tier-II (CBT & Skill Test/Typing Test)",
    salary: "₹19,900 – ₹81,100 (Level 2) to ₹25,500 – ₹81,100 (Level 4)",
    education: "12th Standard or equivalent from a recognized Board.",
    age_limit: "18 to 27 Years",
    application_fee: "General/OBC/EWS: ₹ 100/- | SC/ST/Women/ESM: Nil",
    payment_mode: "Online (Net Banking, Card, UPI)",
    exam_details: {
      phases: [
        {
          title: "Tier-I Exam Pattern",
          pattern: [
            { section: "English Language", questions: 25, marks: 50, time: "60 mins total" },
            { section: "General Intelligence", questions: 25, marks: 50, time: "60 mins total" },
            { section: "Quantitative Aptitude", questions: 25, marks: 50, time: "60 mins total" },
            { section: "General Awareness", questions: 25, marks: 50, time: "60 mins total" }
          ]
        }
      ],
      mode: "Computer Based Test (CBT)",
      negative_marking: 0.5,
      detailed_syllabus: [
        { subject: "General Intelligence", topics: ["Semantic Analogy", "Symbolic operations", "Symbolic/Number Analogy", "Trends", "Figural Analogy", "Space Orientation"] },
        { subject: "General Awareness", topics: ["Current events", "India and its neighboring countries", "History", "Culture", "Geography", "Economic Scene", "General Policy"] },
        { subject: "Quantitative Aptitude", topics: ["Number Systems", "Fundamental arithmetical operations", "Algebra", "Geometry", "Mensuration", "Trigonometry", "Statistical Charts"] },
        { subject: "English Language", topics: ["Spot the Error", "Fill in the Blanks", "Synonyms/Homonyms", "Antonyms", "Spellings/Detecting Mis-spelt words"] }
      ]
    }
  },

  'ssc-gd': {
    company: "Staff Selection Commission (SSC)",
    category: "government",
    selection_process: "CBT, Physical Efficiency Test (PET), Physical Standard Test (PST), Medical Exam",
    salary: "₹21,700 – ₹69,100 (Pay Level 3)",
    education: "10th Pass (Matriculation) from a recognized Board.",
    age_limit: "18 to 23 Years",
    application_fee: "General/OBC/EWS: ₹ 100/- | SC/ST/Women/ESM: Nil",
    exam_details: {
      phases: [
        {
          title: "Computer Based Test (CBT) Pattern",
          pattern: [
            { section: "Part A: General Intelligence & Reasoning", questions: 20, marks: 40, time: "60 mins total" },
            { section: "Part B: General Knowledge & General Awareness", questions: 20, marks: 40, time: "60 mins total" },
            { section: "Part C: Elementary Mathematics", questions: 20, marks: 40, time: "60 mins total" },
            { section: "Part D: English/Hindi", questions: 20, marks: 40, time: "60 mins total" }
          ]
        }
      ],
      mode: "Computer Based Test (CBT)",
      negative_marking: 0.25,
      detailed_syllabus: [
        { subject: "General Intelligence & Reasoning", topics: ["Analytical aptitude", "Spatial visualization", "Spatial orientation", "Visual memory", "Discrimination", "Observation", "Relationship concepts"] },
        { subject: "General Knowledge", topics: ["Current events", "Sports", "History", "Culture", "Geography", "Economic Scene", "General Polity", "Indian Constitution"] },
        { subject: "Elementary Mathematics", topics: ["Number Systems", "Computation of Whole Numbers", "Decimals and Fractions", "Percentages", "Ratio and Proportion", "Averages", "Interest"] },
        { subject: "English/Hindi", topics: ["Basic comprehension", "Grammar", "Vocabulary", "Sentence structuring"] }
      ]
    },
    other_details: `<h4>🏃 Physical Efficiency Test (PET)</h4>
<ul>
<li><strong>Male:</strong> 5 Kms in 24 minutes</li>
<li><strong>Female:</strong> 1.6 Kms in 8 ½ minutes</li>
</ul>
<h4>📏 Physical Standard Test (PST) - Height</h4>
<ul>
<li><strong>Male (General/SC/OBC):</strong> 170 cm</li>
<li><strong>Female (General/SC/OBC):</strong> 157 cm</li>
</ul>`
  },

  // =======================================================
  // RAILWAYS (RRB)
  // =======================================================
  'rrb-ntpc': {
    company: "Railway Recruitment Board (RRB)",
    category: "government",
    selection_process: "1st Stage CBT, 2nd Stage CBT, Typing Skill Test/Aptitude Test, Document Verification",
    salary: "₹19,900 to ₹35,400 (Varies by Level 2, 3, 5, 6)",
    education: "12th Pass or Graduation (depending on the post applied for)",
    age_limit: "18 to 30 Years (Undergraduate) / 18 to 33 Years (Graduate)",
    application_fee: "General/OBC/EWS: ₹ 500/- | SC/ST/Women/ESM: ₹ 250/-",
    exam_details: {
      phases: [
        {
          title: "1st Stage CBT (Qualifying)",
          pattern: [
            { section: "General Awareness", questions: 40, marks: 40, time: "90 mins total" },
            { section: "Mathematics", questions: 30, marks: 30, time: "90 mins total" },
            { section: "General Intelligence & Reasoning", questions: 30, marks: 30, time: "90 mins total" }
          ]
        },
        {
          title: "2nd Stage CBT",
          pattern: [
            { section: "General Awareness", questions: 50, marks: 50, time: "90 mins total" },
            { section: "Mathematics", questions: 35, marks: 35, time: "90 mins total" },
            { section: "General Intelligence & Reasoning", questions: 35, marks: 35, time: "90 mins total" }
          ]
        }
      ],
      mode: "Computer Based Test (CBT)",
      negative_marking: "1/3rd Mark for each wrong answer",
      detailed_syllabus: [
        { subject: "Mathematics", topics: ["Number System", "Decimals", "Fractions", "LCM", "HCF", "Ratio & Proportions", "Percentage", "Mensuration", "Time & Work"] },
        { subject: "General Intelligence & Reasoning", topics: ["Analogies", "Completion of Number and Alphabetical Series", "Coding and Decoding", "Mathematical Operations", "Similarities and Differences"] },
        { subject: "General Awareness", topics: ["Current Events of National and International Importance", "Games and Sports", "Art and Culture of India", "Indian Literature", "Monuments and Places of India"] }
      ]
    }
  },

  // =======================================================
  // ASSAM POLICE
  // =======================================================
  'assam-police-abub': {
    company: "State Level Police Recruitment Board (SLPRB), Assam",
    category: "state-govt",
    selection_process: "PST & PET (40 Marks) + Written Test (50 Marks) + Oral/Viva Voce (5 Marks) + NCC (5 Marks)",
    salary: "₹14,000 - ₹60,500 + Grade Pay ₹5,600",
    education: "UB: HSSLC (12th) Pass | AB: HSLC (10th) Pass",
    age_limit: "18 to 25 Years (Relaxation as per Govt rules)",
    application_fee: "No Application Fee",
    exam_details: {
      phases: [
        {
          title: "Written Test (OMR Based)",
          pattern: [
            { section: "Elementary Arithmetic", questions: "Multiple", marks: "-", time: "120 mins" },
            { section: "General English", questions: "Multiple", marks: "-", time: "120 mins" },
            { section: "Logical Reasoning/Mental Ability", questions: "Multiple", marks: "-", time: "120 mins" },
            { section: "Assam's History, Geography, Polity, Economy", questions: "Multiple", marks: "-", time: "120 mins" },
            { section: "General Awareness/General Knowledge", questions: "Multiple", marks: "-", time: "120 mins" }
          ]
        }
      ],
      mode: "Offline (OMR Based)",
      negative_marking: "No Negative Marking",
      detailed_syllabus: [
        { subject: "Elementary Arithmetic", topics: ["Numbers", "Average", "Percentage", "Profit and Loss", "Time & Work", "Time & Distance", "Simple/Compound Interest"] },
        { subject: "Assam History & Geography", topics: ["History of Assam", "Geography of Assam", "Polity of Assam", "Economy of Assam"] },
        { subject: "Logical Reasoning", topics: ["Analogies", "Coding-Decoding", "Series", "Directions", "Blood Relations"] }
      ]
    },
    other_details: `<h4>🏃 Physical Efficiency Test (PET)</h4>
<ul>
<li><strong>Male:</strong> 3200m race in 14 minutes | Long Jump: 335 cm</li>
<li><strong>Female:</strong> 1600m race in 8 minutes | Long Jump: 244 cm</li>
</ul>
<h4>📏 Physical Standard Test (PST) - Height</h4>
<ul>
<li><strong>Male (Gen/OBC/MOBC/SC):</strong> 162.56 cm | <strong>ST(H)/ST(P):</strong> 160.2 cm</li>
<li><strong>Female (Gen/OBC/MOBC/SC):</strong> 154.94 cm | <strong>ST(H)/ST(P):</strong> 152.4 cm</li>
</ul>`
  }
};

module.exports = templates;
