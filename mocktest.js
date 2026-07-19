// ── Firebase Imports ───────────────────────────────
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-analytics.js";
    import { getFirestore, collection, getDocs, doc, getDoc, setDoc, query, orderBy, where, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
    import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

    // ── Firebase Config ─────────────────────────────────
    const firebaseConfig = {
      apiKey: "AIzaSyAh1dbSY0lLbYAZSzfPPpTlru3OmeZ3p_E",
      authDomain: "newjobupdates-c234a.firebaseapp.com",
      projectId: "newjobupdates-c234a",
      storageBucket: "newjobupdates-c234a.firebasestorage.app",
      messagingSenderId: "275056131922",
      appId: "1:275056131922:web:2b44bb31cf42e3897c448b",
      measurementId: "G-GTE4WECN4D"
    };

    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const googleProvider = new GoogleAuthProvider();

    // ── Global Loader State ──────────────────────────────
    let lastAction = null;
    let lastActionArgs = [];

    window.showGlobalLoader = function(message, actionFunc, ...args) {
      const loader = document.getElementById('global-loader');
      document.getElementById('loader-content').classList.remove('hidden');
      document.getElementById('loader-error').classList.add('hidden');
      document.getElementById('global-loader-text').textContent = message || 'Loading Mock Tests...';
      loader.classList.remove('hidden');
      lastAction = actionFunc;
      lastActionArgs = args;
    };

    window.hideGlobalLoader = function() {
      document.getElementById('global-loader').classList.add('hidden');
    };

    window.showGlobalError = function(message) {
      document.getElementById('loader-content').classList.add('hidden');
      document.getElementById('loader-error').classList.remove('hidden');
      document.getElementById('global-error-text').textContent = message || 'Failed to load. Please check your connection.';
    };

    window.retryLastAction = function() {
      if (lastAction) {
        lastAction(...lastActionArgs);
      }
    };

    // ── Auth State ───────────────────────────────────────
    let currentUser = null; // { uid, displayName, email, photoURL }

    // ── Auth DOM Refs ────────────────────────────────────
    const headerLoginBtn   = document.getElementById('header-login-btn');
    const profileWrapper   = document.getElementById('profile-wrapper');
    const profileTrigger   = document.getElementById('profile-trigger');
    const profileDropdown  = document.getElementById('profile-dropdown');
    const dropdownAvatar   = document.getElementById('dropdown-avatar');
    const dropdownName     = document.getElementById('dropdown-name');
    const dropdownLogout   = document.getElementById('dropdown-logout');
    const resultLogoutBtn  = document.getElementById('result-logout-btn');
    const loginModal       = document.getElementById('login-modal');
    const modalLoginBtn    = document.getElementById('modal-login-btn');
    const modalCloseBtn    = document.getElementById('modal-close-btn');

    // Pending result data to save after login
    let pendingResultData  = null;

    // Fallback avatar SVG data URI
    const FALLBACK_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%237f5af0"><circle cx="12" cy="8" r="4"/><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/></svg>';

    // ── Listen for Auth State Changes ────────────────────
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = {
          uid: user.uid,
          displayName: user.displayName || user.phoneNumber || 'User',
          email: user.email || user.phoneNumber || '',
          photoURL: user.photoURL || ''
        };
        const avatarSrc = currentUser.photoURL || FALLBACK_AVATAR;

        // Update header UI: hide login btn, show profile avatar
        if (headerLoginBtn) headerLoginBtn.classList.add('hidden');
        if (profileWrapper) profileWrapper.classList.remove('hidden');
        if (profileTrigger) {
          profileTrigger.src = avatarSrc;
          profileTrigger.onerror = () => { profileTrigger.src = FALLBACK_AVATAR; };
        }
        if (dropdownAvatar) {
          dropdownAvatar.src = avatarSrc;
          dropdownAvatar.onerror = () => { dropdownAvatar.src = FALLBACK_AVATAR; };
        }
        if (dropdownName) dropdownName.textContent = currentUser.displayName;
        if (resultLogoutBtn) resultLogoutBtn.classList.remove('hidden');

        // If we just logged in via the modal, dismiss it and save the pending result
        if (loginModal && !loginModal.classList.contains('hidden')) {
          loginModal.classList.add('hidden');
          if (pendingResultData) {
            saveResultToFirestore(pendingResultData);
            pendingResultData = null;
          }
        }
      } else {
        currentUser = null;
        // Update header UI: show login btn, hide profile avatar
        if (headerLoginBtn) headerLoginBtn.classList.remove('hidden');
        if (profileWrapper) profileWrapper.classList.add('hidden');
        if (profileDropdown) profileDropdown.classList.remove('open');
        if (resultLogoutBtn) resultLogoutBtn.classList.add('hidden');
      }
    });

    // ── Profile Dropdown Toggle ──────────────────────────
    function toggleProfileDropdown(e) {
      if (e) e.stopPropagation();
      if (profileDropdown) profileDropdown.classList.toggle('open');
    }

    // Close dropdown when clicking anywhere outside
    document.addEventListener('click', (e) => {
      if (profileDropdown && profileDropdown.classList.contains('open')) {
        if (!profileWrapper.contains(e.target)) {
          profileDropdown.classList.remove('open');
        }
      }
    });

    if (profileTrigger) profileTrigger.addEventListener('click', toggleProfileDropdown);

    // ── Google Sign In ───────────────────────────────────
    async function handleGoogleLogin() {
      try {
        await signInWithPopup(auth, googleProvider);
        // onAuthStateChanged callback will handle the rest
      } catch (error) {
        console.error('Google sign-in error:', error);
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
          alert('Sign-in failed. Please try again.');
        }
      }
    }

    // ── Logout ────────────────────────────────────────────
    async function handleLogout() {
      // Close dropdown first
      if (profileDropdown) profileDropdown.classList.remove('open');
      try {
        await signOut(auth);
        // onAuthStateChanged will reset currentUser and toggle header UI
      } catch (error) {
        console.error('Sign-out error:', error);
      }
    }

    // ── Login Modal Controls ─────────────────────────────
    function showLoginModal(resultData) {
      pendingResultData = resultData;
      resetPhoneOtpUI(); // Reset phone OTP state when modal opens
      if (loginModal) loginModal.classList.remove('hidden');
    }

    function openHeaderLogin() {
      showLoginModal(null);
    }

    function dismissLoginModal() {
      if (loginModal) loginModal.classList.add('hidden');
      pendingResultData = null;
      resetPhoneOtpUI(); // Reset phone OTP state when modal closes
      // Show info status that score was not saved
      const statusContainer = document.getElementById('save-status-container');
      if (statusContainer) {
        statusContainer.innerHTML = '<div class="save-status info">Score not saved. Login to save your results next time.</div>';
      }
    }

    // ── Auth Event Listeners ─────────────────────────────
    if (dropdownLogout) dropdownLogout.addEventListener('click', handleLogout);
    if (modalLoginBtn) modalLoginBtn.addEventListener('click', handleGoogleLogin);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', dismissLoginModal);
    if (loginModal) {
      loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) dismissLoginModal();
      });
    }

    // ── Phone & Password Auth ────────────────────────────
    let isSignupMode = false;

    // DOM refs for Phone Auth
    const authNameGroup   = document.getElementById('auth-name-group');
    const authNameInput   = document.getElementById('auth-name-input');
    const authPhoneInput  = document.getElementById('auth-phone-input');
    const authPasswordInput = document.getElementById('auth-password-input');
    const authSubmitBtn   = document.getElementById('auth-submit-btn');
    const authStatusMsg   = document.getElementById('auth-status-msg');
    const authToggleText  = document.getElementById('auth-toggle-text');
    const authToggleBtn   = document.getElementById('auth-toggle-btn');

    function toggleAuthMode() {
      isSignupMode = !isSignupMode;
      if (isSignupMode) {
        if (authNameGroup) authNameGroup.classList.remove('hidden');
        if (authSubmitBtn) authSubmitBtn.textContent = 'Sign up';
        if (authToggleText) authToggleText.textContent = 'Already have an account? ';
        if (authToggleBtn) authToggleBtn.textContent = 'Login';
      } else {
        if (authNameGroup) authNameGroup.classList.add('hidden');
        if (authSubmitBtn) authSubmitBtn.textContent = 'Login';
        if (authToggleText) authToggleText.textContent = 'New here? ';
        if (authToggleBtn) authToggleBtn.textContent = 'Sign up';
      }
      hideAuthStatus();
    }
    
    function showAuthStatus(msg, isError = false) {
      if (!authStatusMsg) return;
      authStatusMsg.textContent = msg;
      authStatusMsg.className = 'otp-status-msg' + (isError ? ' otp-error' : ' otp-success');
      authStatusMsg.classList.remove('hidden');
    }

    function hideAuthStatus() {
      if (authStatusMsg) authStatusMsg.classList.add('hidden');
    }

    function resetPhoneOtpUI() {
      // Keeps old function name to avoid breaking dismissLoginModal calls
      isSignupMode = false;
      if (authNameGroup) authNameGroup.classList.add('hidden');
      if (authNameInput) authNameInput.value = '';
      if (authPhoneInput) authPhoneInput.value = '';
      if (authPasswordInput) authPasswordInput.value = '';
      if (authSubmitBtn) { authSubmitBtn.disabled = false; authSubmitBtn.textContent = 'Login'; }
      if (authToggleText) authToggleText.textContent = 'New here? ';
      if (authToggleBtn) authToggleBtn.textContent = 'Sign up';
      hideAuthStatus();
    }

    async function handlePhoneAuth() {
      const rawPhone = (authPhoneInput?.value || '').replace(/\s+/g, '');
      const password = (authPasswordInput?.value || '');
      const name = (authNameInput?.value || '').trim();

      if (!/^\d{10}$/.test(rawPhone)) {
        showAuthStatus('Please enter a valid 10-digit mobile number.', true);
        return;
      }
      
      if (password.length < 6) {
        showAuthStatus('Password must be at least 6 characters.', true);
        return;
      }

      if (isSignupMode && !name) {
        showAuthStatus('Please enter your full name.', true);
        return;
      }

      // Trick: Convert phone to pseudo-email
      const email = `${rawPhone}@mock.com`;
      
      hideAuthStatus();
      if (authSubmitBtn) { 
        authSubmitBtn.disabled = true; 
        authSubmitBtn.textContent = isSignupMode ? 'Signing up...' : 'Logging in...'; 
      }

      try {
        if (isSignupMode) {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          // Update profile with the name
          if (userCredential.user) {
             await updateProfile(userCredential.user, { displayName: name });
          }
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
        
        // Success! onAuthStateChanged will handle the rest and close modal.
      } catch (error) {
        console.error('Phone Auth Error:', error);
        if (authSubmitBtn) { 
          authSubmitBtn.disabled = false; 
          authSubmitBtn.textContent = isSignupMode ? 'Sign up' : 'Login'; 
        }
        
        if (error.code === 'auth/email-already-in-use') {
          showAuthStatus('This phone number is already registered. Please login.', true);
        } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          showAuthStatus('Incorrect phone number or password.', true);
        } else {
          showAuthStatus(error.message || 'Authentication failed. Please try again.', true);
        }
      }
    }

    // ── Save Result to Firestore ─────────────────────────
    async function saveResultToFirestore(resultData) {
      const statusContainer = document.getElementById('save-status-container');
      if (!statusContainer) return;
      statusContainer.innerHTML = '';

      if (!currentUser) {
        // Should not reach here (modal gates it), but just in case
        statusContainer.innerHTML = '<div class="save-status info">Login to save your scores.</div>';
        return;
      }

      try {
        const testId = resultData.testId || '';
        await setDoc(doc(db, 'scores', currentUser.uid + '_' + resultData.exam + '_' + testId), {
          userId: currentUser.uid,
          studentName: currentUser.displayName,
          email: currentUser.email,
          exam: resultData.exam,
          subCategory: resultData.subCategory,
          testId: testId,
          totalQuestions: resultData.totalQuestions,
          attempted: resultData.attempted,
          correct: resultData.correct,
          wrong: resultData.wrong,
          score: resultData.score,
          totalMarks: resultData.totalMarks,
          percentage: resultData.percentage,
          sectionBreakdown: resultData.sectionBreakdown || {},
          submittedAt: serverTimestamp()
        });
        statusContainer.innerHTML = '<div class="save-status success">✓ Score saved to your account</div>';
      } catch (error) {
        console.error('Error saving result:', error);
        statusContainer.innerHTML = '<div class="save-status error">⚠ Could not save score. Please try again.</div>';
      }
    }

    // ── Report Error ─────────────────────────────────────────
    window.submitErrorReport = async function() {
      const reportTextElem = document.getElementById('error-report-text');
      const statusElem = document.getElementById('error-report-status');
      const btn = document.getElementById('submit-error-btn');
      
      if (!reportTextElem || !statusElem) return;
      
      const reportText = reportTextElem.value.trim();
      if (!reportText) {
        statusElem.textContent = 'Please enter a description of the error.';
        statusElem.className = 'error';
        return;
      }
      
      if (!currentUser) {
        statusElem.textContent = 'You must be logged in to submit a report.';
        statusElem.className = 'error';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Submitting...';
      statusElem.textContent = '';
      
      try {
        await addDoc(collection(db, 'question_errors'), {
          userId: currentUser.uid,
          studentName: currentUser.displayName,
          exam: selectedCategory,
          testId: selectedTestId,
          reportText: reportText,
          createdAt: serverTimestamp()
        });
        
        reportTextElem.value = '';
        statusElem.textContent = 'Thank you for your feedback!';
        statusElem.className = 'success';
        btn.textContent = 'Submitted ✓';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = 'Submit';
          statusElem.textContent = '';
        }, 3000);
      } catch (error) {
        console.error('Error submitting report:', error);
        statusElem.textContent = 'Failed to submit report. Please try again.';
        statusElem.className = 'error';
        btn.disabled = false;
        btn.textContent = 'Submit';
      }
    };


    // ── Scoring & Sectional Constants ────────────────────
    const CORRECT_MARKS = 2;
    const WRONG_PENALTY = 0.25;
    
    // Define the sequence of sections and timing (e.g., 15 minutes per section)
    let SECTION_ORDER = ['reasoning', 'gk', 'quant', 'english'];
    const SECTION_NAMES = {
      'reasoning': 'Reasoning',
      'gk': 'General Awareness',
      'quant': 'Quantitative Aptitude',
      'english': 'English',
      'hindi': 'Hindi'
    };
    let TIME_PER_SECTION = 15 * 60; // 15 minutes default

    // ── State ────────────────────────────────────────────
    let allQuestionsBySection = {}; // Organizes questions by subject
    let activeSectionIndex = 0;     // Tracks active subject index (0 to 3)
    let questions = [];             // Current active section's questions
    let currentIndex = 0;
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let selectedOption = -1;
    let answered = false;
    let sectionTimeLeft = TIME_PER_SECTION;
    let timerInterval = null;
    let selectedCategory = '';
    let selectedSubCategory = '';
    let selectedTestId = '';         // Tracks the active test ID
    let quizState = [];             // Global state tracking array for tracking answers
    let selectedMockTestLanguage = 'en'; // Tracks the selected default language for mocks
    let questionStartTime = 0;      // Timestamp when current question was loaded
    let timeSpentPerQuestion = {};  // { sectionKey: [seconds, ...] }

    const categoryNames = {
      'ssc_gd': 'SSC GD',
      'ssc_cgl': 'SSC CGL',
      'ssc_chsl': 'SSC CHSL',
      'ssc_mts': 'SSC MTS',
      'upsc': 'UPSC',
      'assam_police': 'Assam Police',
      'others': 'Others'
    };

    // ── DOM Refs ─────────────────────────────────────────
    const startScreen   = document.getElementById('start-screen');
    const subScreen     = document.getElementById('sub-category-screen');
    const quizScreen    = document.getElementById('quiz-screen');
    const resultScreen  = document.getElementById('result-screen');
    const timerDisplay  = document.getElementById('timer-display');
    const timerBadge    = document.getElementById('timer-badge');
    const progressText  = document.getElementById('progress-text');
    const progressFill  = document.getElementById('progress-fill');
    const questionText  = document.getElementById('question-text');
    const questionImage = document.getElementById('question-image');
    const optionsList   = document.getElementById('options-list');
    const nextBtn       = document.getElementById('next-btn');
    const questionsChip = document.getElementById('questions-chip');
    const subExamBadge  = document.getElementById('sub-exam-badge');
    const paletteGrid   = document.getElementById('palette-grid');

    // Test selection screen DOM references
    const testSelectionScreen     = document.getElementById('test-selection-screen');
    const testSelectionExamBadge  = document.getElementById('test-selection-exam-badge');
    const resultExamBadge         = document.getElementById('result-exam-badge');

    // Map UI subCategory values to Firestore DB subCategory values
    const dbSubCategoryMap = {
      'full_mock': 'full_mock',
      'subject_wise': 'subject_wise',
      'previous_year': 'previous_year',
      'speed_booster': 'speed_boost',
      'speed_boost': 'speed_boost'
    };

    // ── Fetch & Sort Sectional Questions ─────────────────
    async function fetchQuestions(category, subCategory, testId, testLang = 'en') {
      // Update the URL to allow resuming on refresh
      const url = new URL(window.location);
      url.searchParams.set('exam', category);
      url.searchParams.set('sub', subCategory);
      if (testId) url.searchParams.set('test', testId);
      window.history.pushState({}, '', url);

      selectedTestId = testId || '';
      showGlobalLoader('Preparing questions...', fetchQuestions, category, subCategory, testId, testLang);
      try {
        selectedMockTestLanguage = testLang;

        // Dynamically update SECTION_ORDER before quiz begins
        if (category === 'weekly_quiz') {
          // Weekly quiz: single subject per test
          let sec = (subCategory || 'gk').toLowerCase();
          if (sec === 'math' || sec === 'mathematics' || sec === 'maths') sec = 'quant';
          SECTION_ORDER = [sec];
        } else if (selectedMockTestLanguage === 'hi') {
          SECTION_ORDER = ['reasoning', 'gk', 'quant', 'hindi'];
        } else if (selectedMockTestLanguage === 'as') {
          // Assamese track: same as English sections (no dedicated Assamese section)
          SECTION_ORDER = ['reasoning', 'gk', 'quant', 'english'];
        } else {
          SECTION_ORDER = ['reasoning', 'gk', 'quant', 'english'];
        }

        const dbSubCategory = dbSubCategoryMap[subCategory] || subCategory;
        const q = query(
          collection(db, 'questions'),
          where('exam', '==', category),
          where('subCategory', '==', dbSubCategory),
          where('testId', '==', testId)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          hideGlobalLoader();
          if (testSelectionScreen) testSelectionScreen.classList.remove('hidden');
          alert(`No questions available in category "${categoryNames[category] || category}" for ${subCategory.replace('_', ' ')} (${testId}).`);
          return;
        }

        // Initialize empty arrays dynamically based on SECTION_ORDER
        allQuestionsBySection = {};
        SECTION_ORDER.forEach(sec => {
          allQuestionsBySection[sec] = [];
        });
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          // For weekly_quiz, section = subCategory (they're the same subject)
          let rawSec;
          if (category === 'weekly_quiz') {
            rawSec = (subCategory || 'gk').toLowerCase();
          } else {
            rawSec = (data.section || 'reasoning').toLowerCase();
          }
          if (rawSec === 'math' || rawSec === 'mathematics' || rawSec === 'maths') rawSec = 'quant';

          const questionObj = {
            id: doc.id,
            section: rawSec,
            imageUrl: data.imageUrl || '',
            question: {
              en: data.questionText_en || '',
              hi: data.questionText_hi || data.questionText || '',
              as: data.questionText_as || ''
            },
            options: [
              { en: data.a_en || '', hi: data.a_hi || data.a || '', as: data.a_as || '' },
              { en: data.b_en || '', hi: data.b_hi || data.b || '', as: data.b_as || '' },
              { en: data.c_en || '', hi: data.c_hi || data.c || '', as: data.c_as || '' },
              { en: data.d_en || '', hi: data.d_hi || data.d || '', as: data.d_as || '' }
            ],
            optionImages: [
              data.a_imageUrl || '',
              data.b_imageUrl || '',
              data.c_imageUrl || '',
              data.d_imageUrl || ''
            ],
            answer: data.correct,
            explanation: {
              en: data.explanation_en || '',
              hi: data.explanation_hi || data.explanation || '',
              as: data.explanation_as || ''
            }
          };

          if (allQuestionsBySection[questionObj.section]) {
            allQuestionsBySection[questionObj.section].push(questionObj);
          }
        });

        // ── Filter: hide questions that have no text and no image across all languages ──
        // For Assamese, fall back to English if no Assamese text exists (don't filter out)
        SECTION_ORDER.forEach(sec => {
          allQuestionsBySection[sec] = allQuestionsBySection[sec].filter(q => {
            let applyLang = selectedMockTestLanguage;
            if (q.section === 'hindi') applyLang = 'hi';
            if (q.section === 'english') applyLang = 'en';

            // Build fallback chain: selected lang → 'en' → 'hi'
            const questionLangText = typeof q.question === 'object'
              ? (q.question[applyLang] || q.question['en'] || q.question['hi'] || '')
              : (q.question || '');
            const hasText = questionLangText && questionLangText.trim().length > 0;
            const hasImage = q.imageUrl && q.imageUrl.trim().length > 0;
            return hasText || hasImage;
          });

          // Sort questions sequentially by the number at the very end of their ID (following the final '-e')
          allQuestionsBySection[sec].sort((a, b) => {
            const getNum = (id) => {
              const parts = (id || '').split('-e');
              const num = parseInt(parts[parts.length - 1], 10);
              return isNaN(num) ? 0 : num;
            };
            return getNum(a.id) - getNum(b.id);
          });
        });



        // Check if we have any questions across all arrays
        const totalFetched = Object.values(allQuestionsBySection).reduce((a, b) => a + b.length, 0);
        if (totalFetched === 0) {
          hideGlobalLoader();
          if (testSelectionScreen) testSelectionScreen.classList.remove('hidden');
          alert(`No questions available in category "${categoryNames[category] || category}".`);
          return;
        }

        selectedCategory = category;
        selectedSubCategory = subCategory;
        selectedTestId = testId || '';
        activeSectionIndex = 0;
        initializeQuizState();

        const isReattempting = sessionStorage.getItem('is_reattempting') === 'true';

        let hasSavedScore = false;
        if (currentUser && !isReattempting) {
          try {
            const scoreDocRef = doc(db, 'scores', currentUser.uid + '_' + category + '_' + (testId || ''));
            const scoreDocSnap = await getDoc(scoreDocRef);
            if (scoreDocSnap.exists()) {
              const savedData = scoreDocSnap.data();
              hasSavedScore = true;
              
              if (subScreen) subScreen.classList.add('hidden');
              if (testSelectionScreen) testSelectionScreen.classList.add('hidden');
              quizScreen.classList.add('hidden');
              
              const totalQ = savedData.totalQuestions || totalFetched;
              const att = savedData.attempted || 0;
              const right = savedData.correct || 0;
              const wrong = savedData.wrong || 0;
              const finalS = savedData.score || 0;
              const totalM = savedData.totalMarks || (totalQ * CORRECT_MARKS);
              
              document.getElementById('res-total').textContent = totalQ;
              document.getElementById('res-attempted').textContent = att;
              document.getElementById('res-unanswered').textContent = totalQ - att;
              document.getElementById('res-correct').textContent = right;
              document.getElementById('res-wrong').textContent = wrong;
              document.getElementById('res-score').textContent = finalS.toFixed(2);
              document.getElementById('res-total-marks').textContent = totalM.toFixed(2);
              
              if (resultExamBadge) {
                const catName = categoryNames[category] || category.toUpperCase();
                const subName = subCategory.replace('_', ' ').toUpperCase();
                resultExamBadge.textContent = `${catName} - ${subName}`;
              }
              
              if (resultLogoutBtn) {
                resultLogoutBtn.classList.toggle('hidden', !currentUser);
              }
              
              const statusContainer = document.getElementById('save-status-container');
              if (statusContainer) {
                statusContainer.innerHTML = '<div class="save-status success">✓ Loaded saved score from your account</div>';
              }
              
              renderSolutionsReview();
              
              hideGlobalLoader();
              resultScreen.classList.remove('hidden');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          } catch (e) {
            console.error('Error checking saved score:', e);
          }
        }

        if (!hasSavedScore) {
          if (subScreen) subScreen.classList.add('hidden');
          if (testSelectionScreen) testSelectionScreen.classList.add('hidden');
          hideGlobalLoader();
          quizScreen.classList.remove('hidden');
          
          const liveToggle = document.getElementById('live-lang-toggle');
          if (liveToggle) {
             liveToggle.value = selectedMockTestLanguage;
             liveToggle.disabled = false;
             liveToggle.title = "";
          }

          // Show/hide Assamese option in the live toggle based on exam category
          const liveAsOpt = document.getElementById('live-assamese-option');
          if (liveAsOpt) {
            const asAllowed = ASSAMESE_ALLOWED_EXAMS.includes(category);
            liveAsOpt.style.display = asAllowed ? '' : 'none';
            // If Assamese was somehow selected for a non-allowed exam, reset to English
            if (!asAllowed && selectedMockTestLanguage === 'as') {
              selectedMockTestLanguage = 'en';
              if (liveToggle) liveToggle.value = 'en';
            }
          }
          
          startSectionQuiz();
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
        showGlobalError('Error loading questions. Please check your connection.');
      }
    }

    // ── Initialize Global State Tracking ─────────────────
    function initializeQuizState() {
      const savedAnswers = sessionStorage.getItem('current_answers');
      let parsedAnswers = null;
      if (savedAnswers) {
        try {
          parsedAnswers = JSON.parse(savedAnswers);
        } catch(e) {
          console.error('Error parsing saved answers', e);
        }
      }

      quizState = {};
      timeSpentPerQuestion = {};
      SECTION_ORDER.forEach(secKey => {
        if (parsedAnswers && parsedAnswers[secKey] && parsedAnswers[secKey].length === allQuestionsBySection[secKey].length) {
          // Restore answers if they match the question count
          quizState[secKey] = parsedAnswers[secKey];
        } else {
          quizState[secKey] = allQuestionsBySection[secKey].map(() => ({
            status: 'not-visited',
            selectedIdx: -1,
            isCorrect: null,
            isReviewed: false
          }));
        }
        timeSpentPerQuestion[secKey] = allQuestionsBySection[secKey].map(() => 0);
      });
    }

    // ── Start A Specific Section ─────────────────────────
    function startSectionQuiz() {
      if (timerInterval) clearInterval(timerInterval);
      
      const currentSectionKey = SECTION_ORDER[activeSectionIndex];
      questions = allQuestionsBySection[currentSectionKey];
      
      // If a section is empty, automatically jump to next valid section
      if (questions.length === 0 && activeSectionIndex < SECTION_ORDER.length - 1) {
        activeSectionIndex++;
        startSectionQuiz();
        return;
      } else if (questions.length === 0) {
        showResult();
        return;
      }

      currentIndex = 0;
      sectionTimeLeft = TIME_PER_SECTION;
      timerBadge.classList.remove('danger');

      // Update Header with Active Section Banner Info
      const titleSpan = document.getElementById('sidebar-subject-title');
      if (titleSpan) {
        titleSpan.textContent = `Subject: ${SECTION_NAMES[currentSectionKey]}`;
      }

      const quizExamBadge = document.getElementById('quiz-exam-badge');
      if (quizExamBadge) {
        quizExamBadge.textContent = SECTION_NAMES[currentSectionKey];
      }

      startSectionTimer();
      loadQuestion();
      renderPalette();
    }

    // ── Sectional Countdown Logic ────────────────────────
    function startSectionTimer() {
      updateTimerDisplay();
      timerInterval = setInterval(() => {
        sectionTimeLeft--;
        updateTimerDisplay();
        if (sectionTimeLeft <= 60) {
          timerBadge.classList.add('danger');
        }
        if (sectionTimeLeft <= 0) {
          clearInterval(timerInterval);
          alert(`Time is up for ${SECTION_NAMES[SECTION_ORDER[activeSectionIndex]]}! Moving to next subject.`);
          const currentSectionKey = SECTION_ORDER[activeSectionIndex];
          recordTimeSpent(currentSectionKey, currentIndex);
          moveToNextSection();
        }
      }, 1000);
    }

    function updateTimerDisplay() {
      const mins = Math.floor(sectionTimeLeft / 60).toString().padStart(2, '0');
      const secs = (sectionTimeLeft % 60).toString().padStart(2, '0');
      const currentSectionKey = SECTION_ORDER[activeSectionIndex];
      timerDisplay.textContent = `[${SECTION_NAMES[currentSectionKey]}] ${mins}:${secs}`;
    }

    function moveToNextSection() {
      if (activeSectionIndex < SECTION_ORDER.length - 1) {
        activeSectionIndex++;
        startSectionQuiz();
      } else {
        clearInterval(timerInterval);
        showResult();
      }
    }

    // ── Load Question ────────────────────────────────────
    function loadQuestion() {
      const currentSectionKey = SECTION_ORDER[activeSectionIndex];
      const state = quizState[currentSectionKey][currentIndex];
      
      answered = (state.status === 'answered');
      selectedOption = state.selectedIdx;

      const q = questions[currentIndex];
      progressText.textContent = `${currentIndex + 1} of ${questions.length}`;
      progressFill.style.width = `${((currentIndex) / questions.length) * 100}%`;

      let applyLang = selectedMockTestLanguage;
      if (q.section === 'hindi') applyLang = 'hi';
      if (q.section === 'english') applyLang = 'en';

      // Fallback chain: selected lang → English → Hindi (prevents blank questions)
      const questionLangText = typeof q.question === 'object'
        ? (q.question[applyLang] || q.question['en'] || q.question['hi'] || '')
        : (q.question || '');
      questionText.textContent = `Q${currentIndex + 1}. ${questionLangText}`;

      // Show/hide question image
      if (questionImage) {
        if (q.imageUrl && q.imageUrl.trim() !== '') {
          questionImage.src = q.imageUrl;
          questionImage.classList.add('visible');
        } else {
          questionImage.classList.remove('visible');
          questionImage.src = '';
        }
      }

      optionsList.innerHTML = '';
      const keys = ['A', 'B', 'C', 'D'];
      const optionKeys = ['a', 'b', 'c', 'd'];
      const correctKey = (q.answer || '').toLowerCase();
      const correctIndex = optionKeys.indexOf(correctKey);

      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        
        const optImgUrl = (q.optionImages && q.optionImages[i]) ? q.optionImages[i].trim() : '';
        if (optImgUrl) {
          btn.classList.add('has-image');
          btn.innerHTML = `<span class="key">${keys[i]}</span><img class="option-image" src="${optImgUrl}" loading="lazy" decoding="async" alt="Option ${keys[i]}" />`;
        } else {
          let applyLang = selectedMockTestLanguage;
          if (q.section === 'hindi') applyLang = 'hi';
          if (q.section === 'english') applyLang = 'en';
          
          // Fallback chain: selected lang → English → Hindi
          const optionLangText = typeof opt === 'object' ? (opt[applyLang] || opt['en'] || opt['hi'] || '') : (opt || '');
          btn.innerHTML = `<span class="key">${keys[i]}</span><span>${optionLangText}</span>`;
        }
        
        if (answered && i === selectedOption) {
          btn.classList.add('selected');
        }
        btn.addEventListener('click', () => selectOption(i, btn));
        optionsList.appendChild(btn);
      });

      const prevBtn = document.getElementById('prev-question-btn');
      if (prevBtn) {
        prevBtn.style.display = (currentIndex > 0) ? 'flex' : 'none';
      }
      
      const clearBtn = document.getElementById('clear-btn');
      if (clearBtn) {
        clearBtn.style.display = answered ? 'block' : 'none';
      }

      updateNextButtonText();

      questionText.classList.remove('slide-in');
      optionsList.classList.remove('slide-in');
      void questionText.offsetWidth; 
      questionText.classList.add('slide-in');
      optionsList.classList.add('slide-in');

      // Record start time for time-per-question tracking
      questionStartTime = Date.now();

      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().catch(err => console.warn('MathJax typeset failed:', err));
      }
    }

    // ── Update Submit/Next Button Text ────────────────────
    function updateNextButtonText() {
      const isLastQuestion = (currentIndex === questions.length - 1);
      const isLastSection = (activeSectionIndex === SECTION_ORDER.length - 1);

      if (answered) {
        if (!isLastQuestion) nextBtn.textContent = 'Save & Next →';
        else nextBtn.textContent = isLastSection ? 'Submit Test →' : 'Submit Subject & Continue →';
      } else {
        if (!isLastQuestion) nextBtn.textContent = 'Skip Question →';
        else nextBtn.textContent = isLastSection ? 'Submit Test →' : 'Skip & Continue →';
      }
    }

    // ── Select Option ────────────────────────────────────
    function selectOption(index, btn) {
      answered = true;
      selectedOption = index;

      const q = questions[currentIndex];
      const allBtns = optionsList.querySelectorAll('.option-btn');
      
      allBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      const optionKeys = ['a', 'b', 'c', 'd'];
      const selectedKey = optionKeys[index];
      const correctKey = (q.answer || '').toLowerCase();
      const isCorrect = (selectedKey === correctKey);

      const currentSectionKey = SECTION_ORDER[activeSectionIndex];
      const prevState = quizState[currentSectionKey][currentIndex];
      
      quizState[currentSectionKey][currentIndex] = {
        ...prevState,
        status: 'answered',
        selectedIdx: index,
        isCorrect: isCorrect
      };

      // Save progress dynamically
      sessionStorage.setItem('current_answers', JSON.stringify(quizState));

      const clearBtn = document.getElementById('clear-btn');
      if (clearBtn) {
        clearBtn.style.display = 'block';
      }

      renderPalette();
      updateNextButtonText();
    }

    // ── Review Button Click ──────────────────────────────
    function handleReviewClick() {
      const currentSectionKey = SECTION_ORDER[activeSectionIndex];
      const state = quizState[currentSectionKey][currentIndex];
      
      // Accumulate time spent on this question
      recordTimeSpent(currentSectionKey, currentIndex);

      quizState[currentSectionKey][currentIndex].isReviewed = true;
      
      if (state.status === 'not-visited') {
        quizState[currentSectionKey][currentIndex].status = 'skipped';
      }

      if (currentIndex < questions.length - 1) {
        currentIndex++;
        loadQuestion();
        renderPalette();
      } else {
        moveToNextSection();
      }
    }

    // ── Skip or Next Click Trigger ────────────────────────
    function handleNextClick() {
      const currentSectionKey = SECTION_ORDER[activeSectionIndex];
      const state = quizState[currentSectionKey][currentIndex];
      
      // Accumulate time spent on this question
      recordTimeSpent(currentSectionKey, currentIndex);

      quizState[currentSectionKey][currentIndex].isReviewed = false; // Clear review on normal next
      
      if (state.status === 'not-visited') {
        quizState[currentSectionKey][currentIndex].status = 'skipped';
      }

      if (currentIndex < questions.length - 1) {
        currentIndex++;
        loadQuestion();
        renderPalette();
      } else {
        // Last question handling inside a sectional environment
        moveToNextSection();
      }
    }

    // ── Question Palette Render ──────────────────────────
    function renderPalette() {
      if (!paletteGrid) return;
      paletteGrid.innerHTML = '';
      
      const currentSectionKey = SECTION_ORDER[activeSectionIndex];
      const currentSectionState = quizState[currentSectionKey];
      
      currentSectionState.forEach((state, i) => {
        const btn = document.createElement('button');
        btn.className = 'palette-btn';
        btn.textContent = i + 1;
        
        if (i === currentIndex) {
          btn.classList.add('active');
        } else if (state.isReviewed) {
          if (state.status === 'answered') {
            btn.classList.add('review-answered');
          } else {
            btn.classList.add('review');
          }
        } else if (state.status === 'answered') {
          btn.classList.add('answered');
        } else if (state.status === 'skipped') {
          btn.classList.add('skipped');
        } else {
          btn.classList.add('not-visited');
        }

        btn.addEventListener('click', () => jumpToQuestion(i));
        paletteGrid.appendChild(btn);
      });
    }

    // ── Jump to Question Palette Navigation ──────────────
    function jumpToQuestion(index) {
      // Auto-hide the quiz slider/sidebar on mobile when a question number is clicked
      const sidebar = document.querySelector('.quiz-sidebar');
      if (sidebar) {
        sidebar.classList.remove('show-mobile');
      }

      if (index === currentIndex) return;

      const currentSectionKey = SECTION_ORDER[activeSectionIndex];

      // Accumulate time spent on the question we're leaving
      recordTimeSpent(currentSectionKey, currentIndex);

      const currentState = quizState[currentSectionKey][currentIndex];
      if (currentState.status === 'not-visited') {
        quizState[currentSectionKey][currentIndex].status = 'skipped';
      }

      currentIndex = index;
      loadQuestion();
      renderPalette();
    }

    // ── Record Time Spent on Current Question ────────────
    function recordTimeSpent(sectionKey, qIndex) {
      if (questionStartTime > 0) {
        const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
        if (timeSpentPerQuestion[sectionKey] && timeSpentPerQuestion[sectionKey][qIndex] !== undefined) {
          timeSpentPerQuestion[sectionKey][qIndex] += elapsed;
        }
        questionStartTime = 0;
      }
    }

    // ── Show Final Score Breakdown ───────────────────────
    function showResult() {
      clearInterval(timerInterval);
      
      // Clear saved progress on finish
      sessionStorage.removeItem('current_answers');
      sessionStorage.removeItem('is_reattempting');

      // Record time for the last question being viewed
      const lastSectionKey = SECTION_ORDER[activeSectionIndex];
      recordTimeSpent(lastSectionKey, currentIndex);

      quizScreen.classList.add('hidden');
      resultScreen.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      correctCount = 0;
      wrongCount = 0;
      let attemptedCount = 0;
      score = 0;
      let totalQuestionsAcrossQuiz = 0;
      const sectionBreakdown = {};

      SECTION_ORDER.forEach(secKey => {
        const sectState = quizState[secKey] || [];
        totalQuestionsAcrossQuiz += sectState.length;
        let secCorrect = 0, secWrong = 0, secAttempted = 0;
        
        sectState.forEach(state => {
          if (state.status === 'answered') {
            attemptedCount++;
            secAttempted++;
            if (state.isCorrect) {
              correctCount++;
              secCorrect++;
              score += CORRECT_MARKS;
            } else {
              wrongCount++;
              secWrong++;
              score -= WRONG_PENALTY;
            }
          }
        });

        sectionBreakdown[secKey] = {
          total: sectState.length,
          attempted: secAttempted,
          correct: secCorrect,
          wrong: secWrong,
          score: parseFloat((secCorrect * CORRECT_MARKS - secWrong * WRONG_PENALTY).toFixed(2))
        };
      });

      const unanswered = totalQuestionsAcrossQuiz - attemptedCount;
      const totalPossible = totalQuestionsAcrossQuiz * CORRECT_MARKS;

      document.getElementById('res-total').textContent = totalQuestionsAcrossQuiz;
      document.getElementById('res-attempted').textContent = attemptedCount;
      document.getElementById('res-unanswered').textContent = unanswered;
      document.getElementById('res-correct').textContent = correctCount;
      document.getElementById('res-wrong').textContent = wrongCount;
      document.getElementById('res-score').textContent = score.toFixed(2);
      document.getElementById('res-total-marks').textContent = totalPossible.toFixed(2);

      if (resultExamBadge) {
        const catName = categoryNames[selectedCategory] || selectedCategory.toUpperCase();
        const subName = selectedSubCategory.replace('_', ' ').toUpperCase();
        resultExamBadge.textContent = `${catName} - ${subName}`;
      }

      // Show/hide result logout button based on auth state
      if (resultLogoutBtn) {
        resultLogoutBtn.classList.toggle('hidden', !currentUser);
      }

      // Build the result data object
      const percentage = totalPossible > 0 ? Math.max(0, parseFloat(((score / totalPossible) * 100).toFixed(2))) : 0;
      const resultData = {
        exam: selectedCategory,
        subCategory: selectedSubCategory,
        testId: selectedTestId || '',
        totalQuestions: totalQuestionsAcrossQuiz,
        attempted: attemptedCount,
        correct: correctCount,
        wrong: wrongCount,
        score: parseFloat(score.toFixed(2)),
        totalMarks: totalPossible,
        percentage: percentage,
        sectionBreakdown: sectionBreakdown,
        timeSpentPerQuestion: timeSpentPerQuestion
      };

      // If logged in → save immediately. If not → show login modal.
      if (currentUser) {
        saveResultToFirestore(resultData);
      } else {
        showLoginModal(resultData);
      }

      renderSectionBreakdown(sectionBreakdown);
      renderSolutionsReview();
    }

    // ── Render Section-Wise Marks Breakdown ──────────────
    function renderSectionBreakdown(breakdown) {
      const container = document.getElementById('section-breakdown');
      if (!container) return;
      container.innerHTML = '';

      const heading = document.createElement('h3');
      heading.textContent = 'Section-Wise Breakdown';
      container.appendChild(heading);

      const grid = document.createElement('div');
      grid.className = 'section-breakdown-grid';

      SECTION_ORDER.forEach(secKey => {
        const data = breakdown[secKey];
        if (!data || data.total === 0) return;

        const item = document.createElement('div');
        item.className = 'section-break-item';
        item.innerHTML = `
          <div class="sb-name">${SECTION_NAMES[secKey] || secKey}</div>
          <div class="sb-score">${data.score}</div>
          <div class="sb-correct">(${data.correct} Correct)</div>
        `;
        grid.appendChild(item);
      });

      container.appendChild(grid);
    }

    // ── Format Explanation Text ────────────────────────────
    function formatExplanation(text) {
      if (!text) return '';
      
      let parts = text.split('$');
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          parts[i] = parts[i]
            .replace(/(Step\s+\d+[:.']?)/gi, '<div style="margin-top: 14px; margin-bottom: 10px; font-weight: 700; color: var(--green); letter-spacing: 0.03em;">$1</div>')
            .replace(/(\d+(?:\.\d+)?)\^(\d+(?:\.\d+)?)/g, '$1<sup>$2</sup>')
            .replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g, '<span style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; vertical-align: middle; font-size: 0.85em; line-height: 1.1; margin: 0 4px;"><span style="border-bottom: 1.5px solid currentColor; width: 100%; text-align: center; padding-bottom: 1px;">$1</span><span style="padding-top: 1px;">$2</span></span>');
        }
      }
      let formattedText = parts.join('$');

      return formattedText.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('*')) {
          const content = trimmed.replace(/^\*+\s*/, '');
          return `<div class="expl-bullet">${content}</div>`;
        }
        return line;
      }).join('\n');
    }

    // ── Render Solutions Review ───────────────────────────
    function renderSolutionsReview() {
      const container = document.getElementById('solutions-container');
      container.innerHTML = '<h3>Solutions Review</h3>';
      
      const optionLabels = ['A', 'B', 'C', 'D'];
      const optionKeys = ['a', 'b', 'c', 'd'];
      
      const tabsContainer = document.createElement('div');
      tabsContainer.className = 'review-tabs';
      container.appendChild(tabsContainer);
      
      let globalQuestionNumber = 1;
      let firstTab = true;
      
      SECTION_ORDER.forEach(secKey => {
        const questionsArr = allQuestionsBySection[secKey] || [];
        const stateArr = quizState[secKey] || [];
        
        if (questionsArr.length > 0) {
          const tabBtn = document.createElement('button');
          tabBtn.className = `review-tab-btn ${firstTab ? 'active' : ''}`;
          tabBtn.textContent = SECTION_NAMES[secKey] || secKey;
          tabBtn.onclick = () => {
            document.querySelectorAll('.review-tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.review-tab-content').forEach(content => content.classList.remove('active'));
            tabBtn.classList.add('active');
            document.getElementById(`review-content-${secKey}`).classList.add('active');
          };
          tabsContainer.appendChild(tabBtn);
          
          const tabContent = document.createElement('div');
          tabContent.className = `review-tab-content ${firstTab ? 'active' : ''}`;
          tabContent.id = `review-content-${secKey}`;
          
          questionsArr.forEach((q, idx) => {
            const state = stateArr[idx];
            const isAnswered = state && state.status === 'answered';
            const userSelectedIdx = state ? state.selectedIdx : -1;
            
            const correctKey = (q.answer || '').toLowerCase();
            const correctIdx = optionKeys.indexOf(correctKey);
            
            const card = document.createElement('div');
            card.className = 'review-card';
            
            let statusHtml = '';
            if (!isAnswered) {
              statusHtml = `<span class="review-status-label not-attempted">Not Attempted</span>`;
            } else if (state.isCorrect) {
              statusHtml = `<span class="review-status-label correct">✓ Correct</span>`;
            } else {
              statusHtml = `<span class="review-status-label wrong">✗ Wrong</span>`;
            }
            
            let applyLang = selectedMockTestLanguage;
            if (q.section === 'hindi') applyLang = 'hi';
            if (q.section === 'english') applyLang = 'en';
            
            // Fallback chain: selected lang → English → Hindi
            const questionLangText = typeof q.question === 'object' ? (q.question[applyLang] || q.question['en'] || q.question['hi'] || '') : q.question;
            const explanationLangText = typeof q.explanation === 'object' ? (q.explanation[applyLang] || q.explanation['en'] || q.explanation['hi'] || '') : q.explanation;
            
            let optionsHtml = '';
            q.options.forEach((opt, optIdx) => {
              let optClass = 'review-opt';
              let icon = optionLabels[optIdx];
              
              if (optIdx === correctIdx) {
                optClass += ' is-correct';
                icon = '✓';
              } else if (isAnswered && optIdx === userSelectedIdx) {
                optClass += ' is-wrong';
                icon = '✗';
              }
              
              let applyLangOpt = selectedMockTestLanguage;
              if (q.section === 'hindi') applyLangOpt = 'hi';
              if (q.section === 'english') applyLangOpt = 'en';
              
              // Fallback chain: selected lang → English → Hindi
              const optionLangText = typeof opt === 'object' ? (opt[applyLangOpt] || opt['en'] || opt['hi'] || '') : opt;
              
              optionsHtml += `
                <div class="${optClass}">
                  <div class="review-opt-icon">${icon}</div>
                  <span>${optionLangText}</span>
                </div>
              `;
              // Insert explanation toggle button + hidden content after the correct option
              if (optIdx === correctIdx && explanationLangText) {
                const explId = `expl-${secKey}-${idx}`;
                optionsHtml += `
                  <button type="button" class="explanation-toggle-btn" onclick="toggleExplanation('${explId}', this)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    View Explanation
                  </button>
                  <div class="review-explanation" id="${explId}"><strong>Explanation</strong>
${formatExplanation(explanationLangText)}</div>
                `;
              }
            });
            
            // Get time spent for this question
            const qTime = (timeSpentPerQuestion[secKey] && timeSpentPerQuestion[secKey][idx] !== undefined)
              ? timeSpentPerQuestion[secKey][idx] : 0;
            const timeHtml = qTime > 0
              ? `<span class="time-spent-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${qTime}s</span>`
              : '';

            card.innerHTML = `
              ${statusHtml}${timeHtml}
              <div class="review-question">Q${globalQuestionNumber}. ${questionLangText}</div>
              <div class="review-options">
                ${optionsHtml}
              </div>
            `;
            
            tabContent.appendChild(card);
            globalQuestionNumber++;
          });
          
          container.appendChild(tabContent);
          firstTab = false;
        }
      });

      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().catch(err => console.warn('MathJax typeset failed:', err));
      }
    }

    // ── Exams that support Assamese language ─────────────
    const ASSAMESE_ALLOWED_EXAMS = ['ssc_gd', 'assam_police', 'weekly_quiz'];

    // ── Category Select Handler ──────────────────────────
    function selectCategory(category, btn) {
      const cards = document.querySelectorAll('.category-card');
      cards.forEach(c => c.classList.remove('selected'));
      
      if (btn) {
        btn.classList.add('selected');
      } else {
        const targetBtn = Array.from(cards).find(c => c.getAttribute('onclick') && c.getAttribute('onclick').includes(`'${category}'`));
        if (targetBtn) targetBtn.classList.add('selected');
      }

      selectedCategory = category;

      // Show/hide Assamese option in test-selection dropdown based on exam category
      const assameseOpt = document.getElementById('assamese-option');
      if (assameseOpt) {
        const showAssamese = ASSAMESE_ALLOWED_EXAMS.includes(category);
        assameseOpt.style.display = showAssamese ? '' : 'none';
        // Reset dropdown to English if Assamese was previously selected but is now hidden
        const langSelect = document.getElementById('mock-lang-select');
        if (!showAssamese && langSelect && langSelect.value === 'as') {
          langSelect.value = 'en';
        }
      }

      if (subExamBadge) {
        subExamBadge.textContent = categoryNames[category] || category.toUpperCase();
      }

      startScreen.classList.add('hidden');
      if (subScreen) {
        subScreen.classList.remove('hidden');
        renderSubCategoryGrid(category);
      }

      // Update timer display dynamically
      const timeChip = document.getElementById('time-chip');
      if (category === 'weekly_quiz') {
        TIME_PER_SECTION = 10 * 60;
        if (timeChip) timeChip.textContent = '10 Minutes';
      } else {
        TIME_PER_SECTION = 15 * 60;
        if (timeChip) timeChip.textContent = '15 Minutes';
      }
      
      // Update count asynchronously without blocking the UI
      updateQuestionCount(category).catch(console.error);
    }

    // ── Update Question Count (in Background) ─────────────
    async function updateQuestionCount(category) {
      if (questionsChip) {
        questionsChip.textContent = 'Loading...';
      }
      const q = query(collection(db, 'questions'), where('exam', '==', category));
      const snapshot = await getDocs(q);
      if (questionsChip) {
        questionsChip.textContent = `${snapshot.size} Questions`;
      }
    }

    // ── Back Button Action ────────────────────────────────
    function goBackToCategories() {
      if (subScreen) subScreen.classList.add('hidden');
      startScreen.classList.remove('hidden');
      
      const cards = document.querySelectorAll('.category-card');
      cards.forEach(c => c.classList.remove('selected'));
    }

    // ── Render Sub-Category Grid Dynamically ────────────
    const SUB_CATEGORIES = {
      weekly_quiz: [
        { key: 'gk',        icon: '🌍', name: 'GK / GS',    desc: 'General Knowledge & Studies' },
        { key: 'math',      icon: '➗', name: 'Math',        desc: 'Mathematics' },
        { key: 'reasoning', icon: '🧠', name: 'Reasoning',   desc: 'Logical Reasoning' },
        { key: 'hindi',     icon: 'अ',  name: 'Hindi',       desc: 'Hindi Language' },
        { key: 'english',   icon: 'A',  name: 'English',     desc: 'English Language' }
      ],
      _default: [
        { key: 'full_mock',      icon: '🏆', name: 'Full Mock Test',       desc: 'Full length practice paper' },
        { key: 'subject_wise',   icon: '📚', name: 'Subject-Wise Test',    desc: 'Target specific subjects' },
        { key: 'previous_year',  icon: '📄', name: 'Previous Year Papers', desc: 'Real exam questions' },
        { key: 'speed_booster',  icon: '⚡', name: 'Speed Boosters',       desc: 'Timed rapid fire round' }
      ]
    };

    function renderSubCategoryGrid(category) {
      const grid = document.getElementById('sub-category-grid');
      if (!grid) return;
      grid.innerHTML = '';

      const items = SUB_CATEGORIES[category] || SUB_CATEGORIES._default;
      items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'sub-card';
        btn.innerHTML = `
          <span class="sub-icon">${item.icon}</span>
          <span class="sub-name">${item.name}</span>
          <span class="sub-desc">${item.desc}</span>
        `;
        btn.onclick = () => selectSubCategory(item.key);
        grid.appendChild(btn);
      });
    }

    function selectSubCategory(subCategory) {
      selectedSubCategory = subCategory;
      loadTestsDynamically(selectedCategory, subCategory);
    }

    // ── Dynamic Test Loader Action ───────────────────────
    async function loadTestsDynamically(category, subCategory) {
      if (subScreen) subScreen.classList.add('hidden');
      if (testSelectionScreen) testSelectionScreen.classList.add('hidden');

      if (testSelectionExamBadge) {
        const catName = categoryNames[category] || category.toUpperCase();
        const subName = (subCategory) ? ` - ${subCategory.replace('_', ' ').toUpperCase()}` : '';
        testSelectionExamBadge.textContent = `${catName}${subName}`;
      }

      const mockLangContainer = document.getElementById('mock-lang-container');
      if (mockLangContainer) {
        if (subCategory === 'full_mock' || subCategory === 'previous_year') {
          mockLangContainer.style.display = 'block';
        } else {
          mockLangContainer.style.display = 'none';
        }
      }

      // Ensure Assamese visibility stays in sync when navigating back to test selection
      const assameseOpt = document.getElementById('assamese-option');
      if (assameseOpt) {
        const showAssamese = ASSAMESE_ALLOWED_EXAMS.includes(category);
        assameseOpt.style.display = showAssamese ? '' : 'none';
        const langSelect = document.getElementById('mock-lang-select');
        if (!showAssamese && langSelect && langSelect.value === 'as') {
          langSelect.value = 'en';
        }
      }

      const listContainer = document.getElementById('dynamic-test-list');
      if (!listContainer) return;
      listContainer.innerHTML = ''; // Clear previous content

      showGlobalLoader('Loading available tests...', loadTestsDynamically, category, subCategory);

      try {
        let q;
        const dbSubCategory = dbSubCategoryMap[subCategory] || subCategory;
        q = query(
          collection(db, 'tests'),
          where('exam', '==', category),
          where('subCategory', '==', dbSubCategory)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          listContainer.innerHTML = `<div style="grid-column: span 2; text-align: center; color: var(--text-secondary); padding: 20px;">No tests available for this selection.</div>`;
        } else {
          // Sort tests by extracting the number from testId (e.g. "test12" → 12), newest first
          const extractNum = (str) => {
            const match = (str || '').match(/(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          };
          const sortedDocs = [...snapshot.docs].sort((a, b) => {
            const aData = a.data();
            const bData = b.data();
            const aNum = extractNum(aData.testId) || extractNum(aData.testName);
            const bNum = extractNum(bData.testId) || extractNum(bData.testName);
            return bNum - aNum; // Descending: highest number first
          });

          sortedDocs.forEach(doc => {
            const testData = doc.data();
            const btn = document.createElement('button');
            btn.className = 'sub-card';
            btn.innerHTML = `
              <span class="sub-icon">📝</span>
              <span class="sub-name">${testData.testName || 'Practice Test'}</span>
              <span class="sub-desc">Start practice mock test</span>
            `;
            btn.onclick = () => {
              let testLang = 'en';
              if (subCategory === 'full_mock' || subCategory === 'previous_year') {
                const langSelect = document.getElementById('mock-lang-select');
                if (langSelect) testLang = langSelect.value;
              } else {
                const testNameLower = (testData.testName || '').toLowerCase();
                const subjectLower = (testData.subject || '').toLowerCase();
                if (testNameLower.includes('hindi') || subjectLower.includes('hindi')) {
                  testLang = 'hi';
                } else if (testNameLower.includes('assamese') || subjectLower.includes('assamese')) {
                  testLang = 'as';
                }
              }
              fetchQuestions(category, subCategory, testData.testId, testLang);
            };
            listContainer.appendChild(btn);
          });
        }
        
        hideGlobalLoader();
        if (testSelectionScreen) testSelectionScreen.classList.remove('hidden');
      } catch (error) {
        console.error('Error loading tests:', error);
        showGlobalError('Failed to load tests. Please check your connection.');
      }
    }

    // ── Test Selection Back Button Action ─────────────────
    function goBackToSubCategories() {
      if (testSelectionScreen) testSelectionScreen.classList.add('hidden');
      if (subScreen) subScreen.classList.remove('hidden');
    }

    // ── Result Screen Back Button Action ──────────────────
    function goBackToTestSelection() {
      if (timerBadge) timerBadge.classList.remove('danger');
      if (resultScreen) resultScreen.classList.add('hidden');
      
      const statusContainer = document.getElementById('save-status-container');
      if (statusContainer) statusContainer.innerHTML = '';
      
      // Remove test param from URL so refresh doesn't jump back into the quiz
      const url = new URL(window.location);
      url.searchParams.delete('test');
      window.history.replaceState({}, '', url);

      if (testSelectionScreen) testSelectionScreen.classList.remove('hidden');
    }

    // ── Restart (go back to start screen) ────────────────
    function restartQuiz() {
      if (timerInterval) clearInterval(timerInterval);
      timerBadge.classList.remove('danger');
      resultScreen.classList.add('hidden');
      
      const statusContainer = document.getElementById('save-status-container');
      if (statusContainer) statusContainer.innerHTML = '';
      
      // Clear all URL params so refresh stays on start screen
      const url = new URL(window.location);
      url.searchParams.delete('exam');
      url.searchParams.delete('sub');
      url.searchParams.delete('test');
      window.history.replaceState({}, '', url);

      startScreen.classList.remove('hidden');
    }

    // ── Reattempt Test (same test, reset all state) ──────
    function reattemptTest() {
      // Clear any running timer
      if (timerInterval) clearInterval(timerInterval);
      timerBadge.classList.remove('danger');
      
      // Clear saved answers
      sessionStorage.removeItem('current_answers');
      sessionStorage.setItem('is_reattempting', 'true');

      // Reset scoring
      score = 0;
      correctCount = 0;
      wrongCount = 0;
      currentIndex = 0;
      activeSectionIndex = 0;
      selectedOption = -1;
      answered = false;
      sectionTimeLeft = TIME_PER_SECTION;

      // Re-initialize quiz state (clears all saved answers + time tracking)
      initializeQuizState();
      questionStartTime = 0;

      // Clear save status and section breakdown from previous attempt
      const statusContainer = document.getElementById('save-status-container');
      if (statusContainer) statusContainer.innerHTML = '';
      const sectionBreakdownEl = document.getElementById('section-breakdown');
      if (sectionBreakdownEl) sectionBreakdownEl.innerHTML = '';

      // Switch screens
      resultScreen.classList.add('hidden');
      quizScreen.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Re-sync the live language toggle
      const liveToggle = document.getElementById('live-lang-toggle');
      if (liveToggle) liveToggle.value = selectedMockTestLanguage;

      // Start fresh from section 1, question 1
      startSectionQuiz();
    }

    // ── Previous Button Action ───────────────────────────
    function handlePrevClick() {
      if (currentIndex > 0) {
        currentIndex--;
        loadQuestion();
        renderPalette();
      }
    }

    // ── Exit Test Back Action ────────────────────────────
    function confirmExitQuiz() {
      if (confirm("Are you sure you want to exit the test? Your progress will be lost.")) {
        sessionStorage.removeItem('current_answers');
        sessionStorage.removeItem('is_reattempting');
        if (timerInterval) clearInterval(timerInterval);
        quizScreen.classList.add('hidden');
        if (testSelectionScreen) testSelectionScreen.classList.remove('hidden');
        
        activeSectionIndex = 0;
        currentIndex = 0;
      }
    }

    // ── Toggle Explanation Visibility ─────────────────────
    function toggleExplanation(id, btn) {
      const el = document.getElementById(id);
      if (!el) return;
      const isOpen = el.classList.toggle('open');
      btn.classList.toggle('open', isOpen);
      // Update button label text (keep the SVG icon intact)
      const svgIcon = btn.querySelector('svg').outerHTML;
      btn.innerHTML = isOpen
        ? `${svgIcon} Hide Explanation`
        : `${svgIcon} View Explanation`;
    }

    // ── Clear Response ───────────────────────────────────
    function clearResponse() {
      const currentSectionKey = SECTION_ORDER[activeSectionIndex];
      const state = quizState[currentSectionKey][currentIndex];
      
      if (state.status === 'answered') {
        quizState[currentSectionKey][currentIndex] = {
          ...state,
          status: 'skipped',
          selectedIdx: -1,
          isCorrect: null
        };
        
        sessionStorage.setItem('current_answers', JSON.stringify(quizState));
        
        answered = false;
        selectedOption = -1;
        
        const allBtns = optionsList.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.classList.remove('selected'));
        
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) clearBtn.style.display = 'none';
        
        renderPalette();
        updateNextButtonText();
      }
    }

    // ── Live Language Toggle ──────────────────────────────
    // Only changes the display language for the current quiz session.
    function toggleLanguage(lang) {
      if (selectedSubCategory !== 'full_mock' && selectedSubCategory !== 'previous_year' && selectedCategory !== 'weekly_quiz') return;
      // Prevent switching to Assamese for exams that don't support it
      if (lang === 'as' && !ASSAMESE_ALLOWED_EXAMS.includes(selectedCategory)) {
        const liveToggle = document.getElementById('live-lang-toggle');
        if (liveToggle) liveToggle.value = selectedMockTestLanguage;
        return;
      }
      selectedMockTestLanguage = lang;
      
      // Re-render based on which screen is active
      if (!quizScreen.classList.contains('hidden')) {
        loadQuestion();
      } else if (!resultScreen.classList.contains('hidden')) {
        renderSolutionsReview();
      }
    }

    // ── Event Listeners ──────────────────────────────────
    if (nextBtn) nextBtn.addEventListener('click', handleNextClick);
    const reviewBtn = document.getElementById('review-btn');
    if (reviewBtn) reviewBtn.addEventListener('click', handleReviewClick);

    // ── Expose functions globally for native inline HTML onclick properties ──
    window.handleNextClick = handleNextClick;
    window.restartQuiz = restartQuiz;
    window.reattemptTest = reattemptTest;
    window.selectCategory = selectCategory;
    window.goBackToCategories = goBackToCategories;
    window.selectSubCategory = selectSubCategory;
    window.loadTestsDynamically = loadTestsDynamically;
    window.goBackToSubCategories = goBackToSubCategories;
    window.goBackToTestSelection = goBackToTestSelection;
    window.jumpToQuestion = jumpToQuestion;
    window.handlePrevClick = handlePrevClick;
    window.handleReviewClick = handleReviewClick;
    window.confirmExitQuiz = confirmExitQuiz;
    window.toggleExplanation = toggleExplanation;
    window.clearResponse = clearResponse;
    window.toggleLanguage = toggleLanguage;
    window.handleLogout = handleLogout;
    window.handleGoogleLogin = handleGoogleLogin;
    window.openHeaderLogin = openHeaderLogin;
    window.toggleAuthMode = toggleAuthMode;
    window.handlePhoneAuth = handlePhoneAuth;

    // ── Check URL Params for Direct Exam Linking ─────────
    const initFromURL = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const examParam = urlParams.get('exam');
      const subParam = urlParams.get('sub');
      const testParam = urlParams.get('test');
      
      if (examParam && subParam && testParam) {
        selectedCategory = examParam;
        selectedSubCategory = subParam;
        startScreen.classList.add('hidden');
        fetchQuestions(examParam, subParam, testParam, 'en');
      } else if (examParam) {
        selectCategory(examParam, null);
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initFromURL);
    } else {
      initFromURL();
    }

    // ── Theme Toggle Event Listener ──────────────────────
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('light-theme');
        const isLight = document.documentElement.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
      });
    }
