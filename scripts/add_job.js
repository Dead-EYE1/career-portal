const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Path to your service account key
const serviceAccount = require('C:\\Users\\bipla\\Downloads\\serviceAccountKey.json');
const templates = require('./templates.js'); // Import the smart templates!

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// =========================================================================
// 1. CHOOSE YOUR TEMPLATE
// Available options: 'ssc-cgl', 'ssc-chsl', 'ssc-mts', 'ssc-gd', 'rrb-ntpc', 'assam-police-abub'
// If it's a completely custom job without a template, leave it empty: ''
// =========================================================================
const templateKey = 'rrb-ntpc'; 

// =========================================================================
// 2. FILL IN THE SPECIFIC DETAILS FOR THIS YEAR'S CYCLE
// =========================================================================
const currentCycleData = {
  title: "Railway RRB NTPC Recruitment 2026",
  badge: "hot",                      // "new", "hot", "admit", "scholarship"
  applyLink: "https://indianrailways.gov.in/",
  
  // Important Dates
  postDate: "2026-10-01",            // YYYY-MM-DD
  apply_date: "2026-10-01",          // YYYY-MM-DD
  lastDate: "2026-10-31",            // YYYY-MM-DD
  exam_date: "December 2026",
  admit_card_date: "November 2026",
  
  // Job Highlights
  posts: "10,884 Vacancies (Graduate & Undergraduate)",
  location: "All India"
};

async function addNewJob() {
  try {
    console.log("⏳ Assembling new job data...");
    
    // Deep Merge the static template data with this year's specific data
    let finalJobData = { ...currentCycleData };

    if (templateKey && templates[templateKey]) {
      console.log(`✅ Found template for: ${templateKey}`);
      const templateData = templates[templateKey];
      
      finalJobData = {
        ...templateData,      // Inject all the massive static payload (syllabus, fee, salary, etc)
        ...currentCycleData,  // Overwrite with the current cycle dates, title, and vacancies
        createdAt: FieldValue.serverTimestamp()
      };
    } else {
      console.log(`⚠️ No template used. Proceeding with raw data...`);
      finalJobData.createdAt = FieldValue.serverTimestamp();
    }
    
    console.log("⏳ Uploading to Firestore...");
    // Add the document to 'job_notifications' collection.
    const docRef = await db.collection('job_notifications').add(finalJobData);
    
    console.log(`🎉 Successfully added new job! Document ID: ${docRef.id}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding job:', error);
    process.exit(1);
  }
}

addNewJob();
