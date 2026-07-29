// ── Firebase Imports ───────────────────────────────
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
    import { getFirestore, collection, getDocs, doc, getDoc, setDoc, query, orderBy, where, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
    import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

    // Fallback avatar SVG data URI — solid purple bg with white user icon
    const FALLBACK_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%237f5af0'/%3E%3Cstop offset='100%25' stop-color='%236c3ce0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='50' r='50' fill='url(%23g)'/%3E%3Ccircle cx='50' cy='38' r='14' fill='white'/%3E%3Cpath d='M24 82a26 26 0 0 1 52 0' fill='white'/%3E%3C/svg%3E";

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
    if (headerLoginBtn) headerLoginBtn.addEventListener('click', openHeaderLogin);
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
    const togglePasswordBtn = document.getElementById('togglePassword');
    const authSubmitBtn   = document.getElementById('auth-submit-btn');
    const authStatusMsg   = document.getElementById('auth-status-msg');
    const authToggleText  = document.getElementById('auth-toggle-text');
    const authToggleBtn   = document.getElementById('auth-toggle-btn');

    const EYE_OPEN_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const EYE_CLOSED_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    if (togglePasswordBtn && authPasswordInput) {
      togglePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (authPasswordInput.type === 'password') {
          authPasswordInput.type = 'text';
          togglePasswordBtn.innerHTML = EYE_CLOSED_SVG;
        } else {
          authPasswordInput.type = 'password';
          togglePasswordBtn.innerHTML = EYE_OPEN_SVG;
        }
      });
    }

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
      if (authPasswordInput) {
        authPasswordInput.value = '';
        authPasswordInput.type = 'password';
      }
      if (togglePasswordBtn) togglePasswordBtn.innerHTML = EYE_OPEN_SVG;
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
          quizState: resultData.quizState || {},
          timeSpentPerQuestion: resultData.timeSpentPerQuestion || {},
          submittedAt: serverTimestamp()
        });
        statusContainer.innerHTML = '<div class="save-status success">✓ Score saved to your account</div>';
      } catch (error) {
        console.error('Error saving result:', error);
        statusContainer.innerHTML = '<div class="save-status error">⚠ Could not save score. Please try again.</div>';
      }
    }

    // ── Report Error ─────────────────────────────────────────
    function resetErrorReportUI() {
      const btn = document.getElementById('submitReportBtn') || document.getElementById('submit-error-btn');
      const reportTextElem = document.getElementById('error-report-text');
      const statusElem = document.getElementById('error-report-status');

      if (btn) {
        btn.disabled = false;
        btn.style.display = '';
        btn.classList.remove('hidden');
        btn.textContent = 'Submit Report';
      }
      if (reportTextElem) {
        reportTextElem.value = '';
      }
      if (statusElem) {
        statusElem.textContent = '';
        statusElem.className = '';
      }
    }
    window.resetErrorReportUI = resetErrorReportUI;

    window.submitErrorReport = async function() {
      const reportTextElem = document.getElementById('error-report-text');
      const statusElem = document.getElementById('error-report-status');
      const btn = document.getElementById('submitReportBtn') || document.getElementById('submit-error-btn');
      
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

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Submitting...';
      }
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
        if (btn) {
          btn.textContent = 'Submitted ✓';
        }
        setTimeout(() => {
          resetErrorReportUI();
        }, 3000);
      } catch (error) {
        console.error('Error submitting report:', error);
        statusElem.textContent = 'Failed to submit report. Please try again.';
        statusElem.className = 'error';
        if (btn) {
          btn.disabled = false;
          btn.style.display = '';
          btn.classList.remove('hidden');
          btn.textContent = 'Submit Report';
        }
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
    let allQuestions = [];          // Flat array of all questions
    let filteredIndices = [];       // Maps local UI index to global allQuestions index
    let activeSectionTab = 'all';   // 'all' or specific section key
    let uniqueSections = [];        // Unique section keys extracted from test
    let currentIndex = 0;           // Index within filteredIndices
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let selectedOption = -1;
    let answered = false;
    let testTimeLeft = TIME_PER_SECTION; // Global test time
    let timerInterval = null;
    let selectedCategory = '';
    let selectedSubCategory = '';
    let selectedTestId = '';
    let quizState = [];             // Flat array matching allQuestions length
    let selectedMockTestLanguage = 'en';
    let questionStartTime = 0;
    let timeSpentPerQuestion = [];  // Flat array matching allQuestions length

    const categoryNames = {
      'ssc_gd': 'SSC GD',
      'ssc_cgl': 'SSC CGL',
      'ssc_chsl': 'SSC CHSL',
      'ssc_mts': 'SSC MTS',
      'ssc_cpo': 'SSC CPO',
      'upsc': 'UPSC',
      'assam_police': 'Assam Police',
      'agniveer': 'Agniveer',
      'adre': 'ADRE Grade 3 & 4',
      'apsc_cce': 'APSC CCE',
      'assam_tet': 'Assam TET',
      'banking': 'Banking',
      'railways': 'Railways',
      'weekly_quiz': 'Weekly Quiz',
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
    const sectionTabsContainer = document.getElementById('section-tabs-container');

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
      pushUrlState(category, subCategory, testId);

      selectedTestId = testId || '';
      showGlobalLoader('Preparing questions...', fetchQuestions, category, subCategory, testId, testLang);
      try {
        selectedMockTestLanguage = testLang;
        
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

        allQuestions = [];
        const sectionSet = new Set();
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          let rawSec;
          if (category === 'weekly_quiz') {
            rawSec = (subCategory || 'gk').toLowerCase();
          } else {
            rawSec = (data.section || 'reasoning').toLowerCase();
          }
          if (rawSec === 'math' || rawSec === 'mathematics' || rawSec === 'maths') rawSec = 'quant';

          sectionSet.add(rawSec);

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

          allQuestions.push(questionObj);
        });

        // ✨ THE MAGIC FRONTEND SORT ✨
        allQuestions.sort((a, b) => {
          return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
        });

        // ── Filter empty questions ──
        allQuestions = allQuestions.filter(q => {
          let applyLang = selectedMockTestLanguage;
          if (q.section === 'hindi') applyLang = 'hi';
          if (q.section === 'english') applyLang = 'en';

          const questionLangText = typeof q.question === 'object'
            ? (q.question[applyLang] || q.question['en'] || q.question['hi'] || '')
            : (q.question || '');
          const hasText = questionLangText && questionLangText.trim().length > 0;
          const hasImage = q.imageUrl && q.imageUrl.trim().length > 0;
          return hasText || hasImage;
        });

        if (allQuestions.length === 0) {
          hideGlobalLoader();
          if (testSelectionScreen) testSelectionScreen.classList.remove('hidden');
          alert(`No questions available in category "${categoryNames[category] || category}".`);
          return;
        }

        uniqueSections = Array.from(sectionSet);
        selectedCategory = category;
        selectedSubCategory = subCategory;
        selectedTestId = testId || '';
        activeSectionTab = 'all';
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
              
              if (savedData.quizState) quizState = savedData.quizState;
              if (savedData.timeSpentPerQuestion) timeSpentPerQuestion = savedData.timeSpentPerQuestion;
              
              if (subScreen) subScreen.classList.add('hidden');
              if (testSelectionScreen) testSelectionScreen.classList.add('hidden');
              quizScreen.classList.add('hidden');
              
              const totalQ = savedData.totalQuestions || allQuestions.length;
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
              
              if (resultLogoutBtn) resultLogoutBtn.classList.toggle('hidden', !currentUser);
              
              const statusContainer = document.getElementById('save-status-container');
              if (statusContainer) {
                statusContainer.innerHTML = '<div class="save-status success">✓ Loaded saved score from your account</div>';
              }
              
              renderSolutionsReview();
              resetErrorReportUI();
              
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

          const liveAsOpt = document.getElementById('live-assamese-option');
          if (liveAsOpt) {
            const asAllowed = ASSAMESE_ALLOWED_EXAMS.includes(category);
            liveAsOpt.style.display = asAllowed ? '' : 'none';
            if (!asAllowed && selectedMockTestLanguage === 'as') {
              selectedMockTestLanguage = 'en';
              if (liveToggle) liveToggle.value = 'en';
            }
          }
          
          startQuiz();
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

      if (parsedAnswers && parsedAnswers.length === allQuestions.length) {
        quizState = parsedAnswers;
      } else {
        quizState = allQuestions.map(() => ({
          status: 'not-visited',
          selectedIdx: -1,
          isCorrect: null,
          isReviewed: false
        }));
      }

      const savedTime = sessionStorage.getItem('current_time_spent');
      let parsedTime = null;
      if (savedTime) {
        try {
          parsedTime = JSON.parse(savedTime);
        } catch(e) {}
      }

      if (parsedTime && parsedTime.length === allQuestions.length) {
        timeSpentPerQuestion = parsedTime;
      } else {
        timeSpentPerQuestion = allQuestions.map(() => 0);
      }
    }

    // ── Section Names Mapping ──────────────────────────────
    const sectionNamesMap = {
      'reasoning': 'Reasoning',
      'gk': 'General Awareness',
      'quant': 'Quantitative Aptitude',
      'english': 'English',
      'hindi': 'Hindi'
    };

    // ── Start Quiz ──────────────────────────────
    function startQuiz() {
      if (timerInterval) clearInterval(timerInterval);

      if (allQuestions.length === 0) {
        showResult();
        return;
      }

      // Rebuild tabs
      buildSectionTabs();

      filterQuestionsByTab('all');

      testTimeLeft = TIME_PER_SECTION * (uniqueSections.length > 0 ? uniqueSections.length : 1);
      timerBadge.classList.remove('danger');

      const quizExamBadge = document.getElementById('quiz-exam-badge');
      if (quizExamBadge) {
        quizExamBadge.textContent = 'Mock Test';
      }

      startTimer();
    }

    function buildSectionTabs() {
      if (!sectionTabsContainer) return;
      sectionTabsContainer.innerHTML = '';
      if (uniqueSections.length <= 1) {
        sectionTabsContainer.classList.add('hidden');
        return;
      }
      sectionTabsContainer.classList.remove('hidden');

      const allTab = document.createElement('div');
      allTab.className = 'section-tab active';
      allTab.textContent = 'All Sections';
      allTab.addEventListener('click', () => filterQuestionsByTab('all', allTab));
      sectionTabsContainer.appendChild(allTab);

      uniqueSections.forEach(sec => {
        const tab = document.createElement('div');
        tab.className = 'section-tab';
        const name = sectionNamesMap[sec] || (sec.charAt(0).toUpperCase() + sec.slice(1));
        tab.textContent = name;
        tab.addEventListener('click', () => filterQuestionsByTab(sec, tab));
        sectionTabsContainer.appendChild(tab);
      });
    }

    function filterQuestionsByTab(tabKey, tabEl) {
      if (tabEl) {
        const tabs = sectionTabsContainer.querySelectorAll('.section-tab');
        tabs.forEach(t => t.classList.remove('active'));
        tabEl.classList.add('active');
      }

      activeSectionTab = tabKey;
      filteredIndices = [];
      allQuestions.forEach((q, i) => {
        if (tabKey === 'all' || q.section === tabKey) {
          filteredIndices.push(i);
        }
      });

      const titleSpan = document.getElementById('sidebar-subject-title');
      if (titleSpan) {
        titleSpan.textContent = `Subject: ${tabKey === 'all' ? 'All' : (sectionNamesMap[tabKey] || tabKey)}`;
      }

      currentIndex = 0;
      if (filteredIndices.length > 0) {
        loadQuestion();
        renderPalette();
      }
    }

    // ── Global Countdown Logic ────────────────────────
    function startTimer() {
      updateTimerDisplay();
      timerInterval = setInterval(() => {
        testTimeLeft--;
        updateTimerDisplay();
        if (testTimeLeft <= 60) {
          timerBadge.classList.add('danger');
        }
        if (testTimeLeft <= 0) {
          clearInterval(timerInterval);
          alert(`Time is up! Submitting test.`);
          if (filteredIndices.length > 0 && currentIndex < filteredIndices.length) {
            recordTimeSpent(filteredIndices[currentIndex]);
          }
          showResult();
        }
      }, 1000);
    }

    function updateTimerDisplay() {
      const mins = Math.floor(testTimeLeft / 60).toString().padStart(2, '0');
      const secs = (testTimeLeft % 60).toString().padStart(2, '0');
      timerDisplay.textContent = `[Time] ${mins}:${secs}`;
    }

    // ── Load Question ────────────────────────────────────
    function loadQuestion() {
      if (filteredIndices.length === 0) return;
      
      const globalIndex = filteredIndices[currentIndex];
      const state = quizState[globalIndex];
      
      answered = (state.status === 'answered');
      selectedOption = state.selectedIdx;

      const q = allQuestions[globalIndex];
      progressText.textContent = `${currentIndex + 1} of ${filteredIndices.length}`;
      progressFill.style.width = `${((currentIndex) / filteredIndices.length) * 100}%`;

      let applyLang = selectedMockTestLanguage;
      if (q.section === 'hindi') applyLang = 'hi';
      if (q.section === 'english') applyLang = 'en';

      const questionLangText = typeof q.question === 'object'
        ? (q.question[applyLang] || q.question['en'] || q.question['hi'] || '')
        : (q.question || '');
      questionText.textContent = `Q${globalIndex + 1}. ${questionLangText}`;

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

      questionStartTime = Date.now();

      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().catch(err => console.warn('MathJax typeset failed:', err));
      }
    }

    // ── Update Submit/Next Button Text ────────────────────
    function updateNextButtonText() {
      const isLastQuestion = (currentIndex === filteredIndices.length - 1);

      if (answered) {
        if (!isLastQuestion) nextBtn.textContent = 'Save & Next →';
        else nextBtn.textContent = 'Submit Test →';
      } else {
        if (!isLastQuestion) nextBtn.textContent = 'Skip Question →';
        else nextBtn.textContent = 'Submit Test →';
      }
    }

    // ── Select Option ────────────────────────────────────
    function selectOption(index, btn) {
      answered = true;
      selectedOption = index;

      const globalIndex = filteredIndices[currentIndex];
      const q = allQuestions[globalIndex];
      const allBtns = optionsList.querySelectorAll('.option-btn');
      
      allBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      const optionKeys = ['a', 'b', 'c', 'd'];
      const selectedKey = optionKeys[index];
      const correctKey = (q.answer || '').toLowerCase();
      const isCorrect = (selectedKey === correctKey);

      const prevState = quizState[globalIndex];
      
      quizState[globalIndex] = {
        ...prevState,
        status: 'answered',
        selectedIdx: index,
        isCorrect: isCorrect
      };

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
      const globalIndex = filteredIndices[currentIndex];
      const state = quizState[globalIndex];
      
      recordTimeSpent(globalIndex);

      quizState[globalIndex].isReviewed = true;
      
      if (state.status === 'not-visited') {
        quizState[globalIndex].status = 'skipped';
      }

      if (currentIndex < filteredIndices.length - 1) {
        currentIndex++;
        loadQuestion();
        renderPalette();
      } else {
        clearInterval(timerInterval);
        showResult();
      }
    }

    // ── Skip or Next Click Trigger ────────────────────────
    function handleNextClick() {
      const globalIndex = filteredIndices[currentIndex];
      const state = quizState[globalIndex];
      
      recordTimeSpent(globalIndex);

      quizState[globalIndex].isReviewed = false;
      
      if (state.status === 'not-visited') {
        quizState[globalIndex].status = 'skipped';
      }

      if (currentIndex < filteredIndices.length - 1) {
        currentIndex++;
        loadQuestion();
        renderPalette();
      } else {
        clearInterval(timerInterval);
        showResult();
      }
    }

    // ── Question Palette Render ──────────────────────────
    function renderPalette() {
      if (!paletteGrid) return;
      paletteGrid.innerHTML = '';
      
      filteredIndices.forEach((globalIndex, i) => {
        const state = quizState[globalIndex];
        const btn = document.createElement('button');
        btn.className = 'palette-btn';
        btn.textContent = globalIndex + 1; // Show global question number
        
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
      const sidebar = document.querySelector('.quiz-sidebar');
      if (sidebar) {
        sidebar.classList.remove('show-mobile');
      }

      if (index === currentIndex) return;

      const globalIndex = filteredIndices[currentIndex];
      recordTimeSpent(globalIndex);

      const currentState = quizState[globalIndex];
      if (currentState.status === 'not-visited') {
        quizState[globalIndex].status = 'skipped';
      }

      currentIndex = index;
      loadQuestion();
      renderPalette();
    }

    // ── Record Time Spent on Current Question ────────────
    function recordTimeSpent(globalIndex) {
      if (questionStartTime > 0) {
        const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
        if (timeSpentPerQuestion[globalIndex] !== undefined) {
          timeSpentPerQuestion[globalIndex] += elapsed;
        }
        sessionStorage.setItem('current_time_spent', JSON.stringify(timeSpentPerQuestion));
        questionStartTime = 0;
      }
    }

    // ── Show Final Score Breakdown ───────────────────────
    // ── Show Final Score Breakdown ───────────────────────
    function showResult() {
      clearInterval(timerInterval);
      
      // Clear saved progress on finish
      sessionStorage.removeItem('current_answers');
      sessionStorage.removeItem('is_reattempting');
      sessionStorage.removeItem('current_time_spent');

      // Record time for the last question being viewed
      if (filteredIndices.length > 0 && currentIndex < filteredIndices.length) {
        recordTimeSpent(filteredIndices[currentIndex]);
      }

      quizScreen.classList.add('hidden');
      resetErrorReportUI();
      resultScreen.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      correctCount = 0;
      wrongCount = 0;
      let attemptedCount = 0;
      score = 0;
      let totalQuestionsAcrossQuiz = allQuestions.length;
      const sectionBreakdown = {};

      uniqueSections.forEach(secKey => {
        sectionBreakdown[secKey] = {
          total: 0,
          attempted: 0,
          correct: 0,
          wrong: 0,
          score: 0
        };
      });

      allQuestions.forEach((q, i) => {
        const secKey = q.section;
        const state = quizState[i];
        if (state) {
          sectionBreakdown[secKey].total++;
          if (state.status === 'answered') {
            attemptedCount++;
            sectionBreakdown[secKey].attempted++;
            if (state.isCorrect) {
              correctCount++;
              sectionBreakdown[secKey].correct++;
              score += CORRECT_MARKS;
              sectionBreakdown[secKey].score += CORRECT_MARKS;
            } else {
              wrongCount++;
              sectionBreakdown[secKey].wrong++;
              score -= WRONG_PENALTY;
              sectionBreakdown[secKey].score -= WRONG_PENALTY;
            }
          }
        }
      });

      // format sectionBreakdown score
      Object.keys(sectionBreakdown).forEach(secKey => {
        sectionBreakdown[secKey].score = parseFloat(sectionBreakdown[secKey].score.toFixed(2));
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
        timeSpentPerQuestion: timeSpentPerQuestion,
        quizState: quizState
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

      uniqueSections.forEach(secKey => {
        const data = breakdown[secKey];
        if (!data || data.total === 0) return;

        const item = document.createElement('div');
        item.className = 'section-break-item';
        item.innerHTML = `
          <div class="sb-name">${sectionNamesMap[secKey] || secKey}</div>
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
      
      uniqueSections.forEach(secKey => {
        const secIndices = [];
        allQuestions.forEach((q, i) => { if(q.section === secKey) secIndices.push(i); });
        
        if (secIndices.length > 0) {
          const tabBtn = document.createElement('button');
          tabBtn.className = `review-tab-btn ${firstTab ? 'active' : ''}`;
          tabBtn.textContent = sectionNamesMap[secKey] || secKey;
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
          
          secIndices.forEach(idx => {
            const q = allQuestions[idx];
            const state = quizState[idx];
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
              
              const optionLangText = typeof opt === 'object' ? (opt[applyLangOpt] || opt['en'] || opt['hi'] || '') : opt;
              
              optionsHtml += `
                <div class="${optClass}">
                  <div class="review-opt-icon">${icon}</div>
                  <span>${optionLangText}</span>
                </div>
              `;
              
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
            
            const qTime = timeSpentPerQuestion[idx] || 0;
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
    const ASSAMESE_ALLOWED_EXAMS = ['ssc_gd', 'assam_police', 'weekly_quiz', 'adre', 'apsc_cce', 'assam_tet'];

    // ── Category Select Handler ──────────────────────────
    function selectCategory(category, btn) {
      const cards = document.querySelectorAll('.category-card');
      cards.forEach(c => c.classList.remove('selected'));
      
      if (btn) {
        btn.classList.add('selected');
        pushUrlState(category, null, null);
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
      pushUrlState(null, null, null);
      initFromURL(true);
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
      pushUrlState(selectedCategory, subCategory, null);
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
      pushUrlState(selectedCategory, null, null);
      initFromURL(true);
    }

    // ── Result Screen Back Button Action ──────────────────
    function goBackToTestSelection() {
      if (timerBadge) timerBadge.classList.remove('danger');
      if (resultScreen) resultScreen.classList.add('hidden');
      
      const statusContainer = document.getElementById('save-status-container');
      if (statusContainer) statusContainer.innerHTML = '';
      
      pushUrlState(selectedCategory, selectedSubCategory, null);
      initFromURL(true);
    }

    // ── Restart (go back to start screen) ────────────────
    function restartQuiz() {
      if (timerInterval) clearInterval(timerInterval);
      timerBadge.classList.remove('danger');
      resultScreen.classList.add('hidden');
      
      const statusContainer = document.getElementById('save-status-container');
      if (statusContainer) statusContainer.innerHTML = '';
      pushUrlState(null, null, null);
      initFromURL(true);
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
        pushUrlState(selectedCategory, selectedSubCategory, null);
        initFromURL(true);
        
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
    window.showMyResults = showMyResults;
    window.hideMyResults = hideMyResults;

    // ── Navigation State Helpers ─────────────────────────
    function pushUrlState(exam, sub, test) {
      const url = new URL(window.location);
      const curExam = url.searchParams.get('exam') || '';
      const curSub = url.searchParams.get('sub') || '';
      const curTest = url.searchParams.get('test') || '';
      const targetExam = exam || '';
      const targetSub = sub || '';
      const targetTest = test || '';
      
      if (targetExam !== curExam || targetSub !== curSub || targetTest !== curTest) {
        if (exam) url.searchParams.set('exam', exam); else url.searchParams.delete('exam');
        if (sub) url.searchParams.set('sub', sub); else url.searchParams.delete('sub');
        if (test) url.searchParams.set('test', test); else url.searchParams.delete('test');
        window.history.pushState({}, '', url);
      }
    }


    // ── Check URL Params for Direct Exam Linking ─────────
    const initFromURL = (isPopState = false) => {
      const urlParams = new URLSearchParams(window.location.search);
      const examParam = urlParams.get('exam');
      const subParam = urlParams.get('sub');
      const testParam = urlParams.get('test');
      
      if (isPopState) hideAllScreens();

      if (examParam && subParam && testParam) {
        selectedCategory = examParam;
        selectedSubCategory = subParam;
        
        // Initialize the sub-category screen state in case they navigate back
        selectCategory(examParam, null);
        
        fetchQuestions(examParam, subParam, testParam, 'en');
      } else if (examParam && subParam) {
        selectedCategory = examParam;
        selectedSubCategory = subParam;
        selectCategory(examParam, null);
        loadTestsDynamically(examParam, subParam);
      } else if (examParam) {
        selectCategory(examParam, null);
      } else {
        if (isPopState) {
          startScreen.classList.remove('hidden');
          const cards = document.querySelectorAll('.category-card');
          cards.forEach(c => c.classList.remove('selected'));
        }
      }
    };

    window.addEventListener('popstate', (e) => {
      if (quizScreen && !quizScreen.classList.contains('hidden')) {
          if (!confirm("Are you sure you want to exit the test? Your progress will be lost.")) {
              // User cancelled going back! Restore the URL for the quiz
              pushUrlState(selectedCategory, selectedSubCategory, selectedTestId);
              return;
          }
          sessionStorage.removeItem('current_answers');
          sessionStorage.removeItem('is_reattempting');
          if (timerInterval) clearInterval(timerInterval);
          activeSectionIndex = 0;
          currentIndex = 0;
      }
      initFromURL(true);
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initFromURL(false));
    } else {
      initFromURL(false);
    }

    // ── My Results Screen ────────────────────────────────
    const myResultsScreen   = document.getElementById('my-results-screen');
    const myResultsLoading  = document.getElementById('my-results-loading');
    const myResultsEmpty    = document.getElementById('my-results-empty');
    const myResultsList     = document.getElementById('my-results-list');
    const myResultsBackBtn  = document.getElementById('my-results-back-btn');
    const dropdownResult    = document.getElementById('dropdown-result');

    function hideAllScreens() {
      [startScreen, subScreen, testSelectionScreen, quizScreen, resultScreen, myResultsScreen]
        .forEach(s => { if (s) s.classList.add('hidden'); });
    }

    async function showMyResults() {
      // Close the profile dropdown
      if (profileDropdown) profileDropdown.classList.remove('open');

      if (!currentUser) {
        showLoginModal(null);
        return;
      }

      hideAllScreens();
      myResultsScreen.classList.remove('hidden');
      myResultsLoading.classList.remove('hidden');
      myResultsEmpty.classList.add('hidden');
      myResultsList.innerHTML = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });

      try {
        const scoresQuery = query(
          collection(db, 'scores'),
          where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(scoresQuery);

        if (snapshot.empty) {
          myResultsLoading.classList.add('hidden');
          myResultsEmpty.classList.remove('hidden');
          return;
        }

        // Build array and sort by submittedAt descending
        let results = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          results.push({ id: docSnap.id, ...data });
        });

        results.sort((a, b) => {
          const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(0);
          const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(0);
          return dateB - dateA;
        });

        myResultsLoading.classList.add('hidden');
        renderMyResults(results);
      } catch (error) {
        console.error('Error fetching results:', error);
        myResultsLoading.classList.add('hidden');
        myResultsList.innerHTML = `
          <div class="my-results-empty">
            <div class="empty-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p>Could not load your results. Please check your connection and try again.</p>
          </div>`;
      }
    };

    function renderMyResults(results) {
      myResultsList.innerHTML = '';

      results.forEach(r => {
        const examName = categoryNames[r.exam] || (r.exam || '').toUpperCase();
        const subName = (r.subCategory || '').replace(/_/g, ' ');
        const testId = r.testId || '';
        const totalQ = r.totalQuestions || 0;
        const attempted = r.attempted || 0;
        const correct = r.correct || 0;
        const wrong = r.wrong || 0;
        const score = typeof r.score === 'number' ? r.score : 0;
        const totalMarks = r.totalMarks || (totalQ * CORRECT_MARKS);
        const percentage = r.percentage != null
          ? (typeof r.percentage === 'number' ? r.percentage : parseFloat(r.percentage))
          : (totalMarks > 0 ? (score / totalMarks) * 100 : 0);
        const pctDisplay = Math.max(0, Math.min(100, percentage)).toFixed(1);

        // Format date
        let dateStr = '—';
        if (r.submittedAt?.toDate) {
          const d = r.submittedAt.toDate();
          dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        }

        const card = document.createElement('div');
        card.className = 'result-history-card';
        card.innerHTML = `
          <div class="result-card-header">
            <div>
              <div class="result-card-exam">${examName}</div>
              ${testId ? `<div class="result-card-test-id">${testId}</div>` : ''}
            </div>
            <span class="result-card-badge">${subName || 'Test'}</span>
          </div>

          <div class="result-card-percentage">
            <div class="percentage-bar-track">
              <div class="percentage-bar-fill" style="width: ${pctDisplay}%"></div>
            </div>
            <span class="percentage-text">${pctDisplay}%</span>
          </div>

          <div class="result-card-stats">
            <div class="result-stat-item stat-score">
              <span class="stat-value">${score.toFixed(1)}</span>
              <span class="stat-label">Score</span>
            </div>
            <div class="result-stat-item stat-correct">
              <span class="stat-value">${correct}</span>
              <span class="stat-label">Correct</span>
            </div>
            <div class="result-stat-item stat-wrong">
              <span class="stat-value">${wrong}</span>
              <span class="stat-label">Wrong</span>
            </div>
            <div class="result-stat-item">
              <span class="stat-value">${attempted}/${totalQ}</span>
              <span class="stat-label">Attempt</span>
            </div>
          </div>

          <div class="result-card-footer">
            <span class="result-card-date">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              ${dateStr}
            </span>
            <div style="display: flex; gap: 8px;">
              <button class="result-card-action review-test-btn" data-exam="${r.exam || ''}" data-sub="${r.subCategory || ''}" data-test="${testId}">Review</button>
              <button class="result-card-action retake-test-btn" data-exam="${r.exam || ''}" data-sub="${r.subCategory || ''}" data-test="${testId}">Retake</button>
            </div>
          </div>`;

        // Wire up Review button
        const reviewBtn = card.querySelector('.review-test-btn');
        if (reviewBtn) {
          reviewBtn.addEventListener('click', function() {
            const exam = this.dataset.exam;
            const sub = this.dataset.sub;
            const test = this.dataset.test;
            if (exam && sub && test) {
              sessionStorage.setItem('is_reattempting', 'false');
              hideAllScreens();
              fetchQuestions(exam, sub, test, selectedMockTestLanguage);
            }
          });
        }

        // Wire up Retake button
        const retakeBtn = card.querySelector('.retake-test-btn');
        if (retakeBtn) {
          retakeBtn.addEventListener('click', function() {
            const exam = this.dataset.exam;
            const sub = this.dataset.sub;
            const test = this.dataset.test;
            if (exam && sub && test) {
              sessionStorage.setItem('is_reattempting', 'true');
              hideAllScreens();
              fetchQuestions(exam, sub, test, selectedMockTestLanguage);
            }
          });
        }

        myResultsList.appendChild(card);
      });
    }

    function hideMyResults() {
      if (myResultsScreen) myResultsScreen.classList.add('hidden');
      if (startScreen) startScreen.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ── My Results Event Listeners ────────────────────────
    if (dropdownResult) dropdownResult.addEventListener('click', showMyResults);
    if (myResultsBackBtn) myResultsBackBtn.addEventListener('click', hideMyResults);

    // ── Theme Toggle Event Listener ──────────────────────
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('light-theme');
        const isLight = document.documentElement.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
      });
    }
