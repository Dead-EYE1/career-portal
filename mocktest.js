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

    // ── Lazy MathJax Loader ──────────────────────────────
    let _mathJaxPromise = null;
    function ensureMathJax() {
      if (_mathJaxPromise) return _mathJaxPromise;
      if (window.MathJax && window.MathJax.typesetPromise) {
        _mathJaxPromise = Promise.resolve();
        return _mathJaxPromise;
      }
      _mathJaxPromise = new Promise((resolve) => {
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']]
          },
          startup: { ready: () => { window.MathJax.startup.defaultReady(); resolve(); } }
        };
        const s = document.createElement('script');
        s.id = 'MathJax-script';
        s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        s.async = true;
        document.head.appendChild(s);
      });
      return _mathJaxPromise;
    }

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
          showToast('Sign-in failed. Please try again.', 'error');
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

    // ── Timer Modal Controls ─────────────────────────────
    function showTimerModal(callback) {
      timerModalCallback = callback;
      const timerModal = document.getElementById('timer-modal');
      if (timerModal) timerModal.classList.remove('hidden');
    }

    function selectTimerMode(mode) {
      timingMode = mode;
      const timerModal = document.getElementById('timer-modal');
      if (timerModal) timerModal.classList.add('hidden');
      if (timerModalCallback) {
        timerModalCallback();
        timerModalCallback = null;
      }
    }

    function closeTimerModal() {
      const timerModal = document.getElementById('timer-modal');
      if (timerModal) timerModal.classList.add('hidden');
      timerModalCallback = null;
    }
    
    // Make them globally available
    window.showTimerModal = showTimerModal;
    window.selectTimerMode = selectTimerMode;
    window.closeTimerModal = closeTimerModal;

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
      'hindi': 'Hindi',
      'general': 'General',
      'assamese': 'Assamese',
      'bengali': 'Bengali',
      'bodo': 'Bodo'
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
    let timingMode = 'sectional';   // 'sectional' or 'overall'
    let timerModalCallback = null;  // Callback for when timer mode is selected
    let isStudyMode = false;        // Study Mode flag
    let studyAllRevealed = false;   // Track if all study answers are revealed

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

        // Dynamically update SECTION_ORDER before quiz begins
        if (category === 'weekly_quiz') {
          // Weekly quiz: single subject per test
          let sec = (subCategory || 'gk').toLowerCase();
          if (sec === 'math' || sec === 'mathematics' || sec === 'maths') sec = 'quant';
          SECTION_ORDER = [sec];
        } else if (category === 'assam_police' && (subCategory === 'full_mock' || subCategory === 'previous_year')) {
          SECTION_ORDER = ['reasoning', 'gk', 'quant', 'english', 'general', 'assamese', 'bengali', 'bodo'];
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
          showToast(`No questions available in category "${categoryNames[category] || category}" for ${subCategory.replace('_', ' ')} (${testId}).`, 'warning');
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
          if (rawSec === 'general knowledge' || rawSec === 'general_knowledge' || rawSec === 'general awareness' || rawSec === 'general_awareness') rawSec = 'gk';

          const questionObj = {
            id: doc.id,
            section: rawSec,
            imageUrl: data.imageUrl || '',
            question: {
              en: data.questionText_en || '',
              hi: data.questionText_hi || data.questionText || '',
              as: data.questionText_as || '',
              bn: data.questionText_bn || '',
              brx: data.questionText_brx || ''
            },
            options: [
              { en: data.a_en || '', hi: data.a_hi || data.a || '', as: data.a_as || '', bn: data.a_bn || '', brx: data.a_brx || '' },
              { en: data.b_en || '', hi: data.b_hi || data.b || '', as: data.b_as || '', bn: data.b_bn || '', brx: data.b_brx || '' },
              { en: data.c_en || '', hi: data.c_hi || data.c || '', as: data.c_as || '', bn: data.c_bn || '', brx: data.c_brx || '' },
              { en: data.d_en || '', hi: data.d_hi || data.d || '', as: data.d_as || '', bn: data.d_bn || '', brx: data.d_brx || '' }
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
              as: data.explanation_as || '',
              bn: data.explanation_bn || '',
              brx: data.explanation_brx || ''
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

          // ✨ THE MAGIC FRONTEND SORT ✨
          // This forces JavaScript to treat the numbers in the IDs naturally (q1 -> q2 -> q10)
          allQuestionsBySection[sec].sort((a, b) => {
            return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
          });
        });



        // Check if we have any questions across all arrays
        const totalFetched = Object.values(allQuestionsBySection).reduce((a, b) => a + b.length, 0);
        if (totalFetched === 0) {
          hideGlobalLoader();
          if (testSelectionScreen) testSelectionScreen.classList.remove('hidden');
          showToast(`No questions available in category "${categoryNames[category] || category}".`, 'warning');
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
              
              if (savedData.quizState) {
                quizState = savedData.quizState;
              }
              if (savedData.timeSpentPerQuestion) {
                timeSpentPerQuestion = savedData.timeSpentPerQuestion;
              }
              
              if (subScreen) subScreen.classList.add('hidden');
              if (testSelectionScreen) testSelectionScreen.classList.add('hidden');
              quizScreen.classList.add('hidden');
              
              const totalQ = savedData.totalQuestions || totalFetched;
              const att = savedData.attempted || 0;
              const right = savedData.correct || 0;
              const wrong = savedData.wrong || 0;
              const finalS = savedData.score || 0;
              const marksPerQ = category === 'assam_police' ? 0.5 : CORRECT_MARKS;
              const totalM = savedData.totalMarks || (totalQ * marksPerQ);
              
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

          // Determine available languages in the fetched questions
          const availableLangs = new Set(['en']); // English is always assumed available
          Object.values(allQuestionsBySection).forEach(questionsArr => {
            questionsArr.forEach(q => {
              if (typeof q.question === 'object') {
                if (q.question['hi'] && q.question['hi'].trim() !== '') availableLangs.add('hi');
                if (q.question['as'] && q.question['as'].trim() !== '') availableLangs.add('as');
                if (q.question['bn'] && q.question['bn'].trim() !== '') availableLangs.add('bn');
                if (q.question['brx'] && q.question['brx'].trim() !== '') availableLangs.add('brx');
              }
            });
          });

          // Show/hide language options in the live toggle based on exam category AND availability in the database
          const liveAsOpt = document.getElementById('live-assamese-option');
          const liveBnOpt = document.getElementById('live-bengali-option');
          const liveBrxOpt = document.getElementById('live-bodo-option');
          const liveHiOpt = document.getElementById('live-hindi-option');

          const showRegionalLive = REGIONAL_LANG_ALLOWED_EXAMS.includes(category);
          const showBodoLive = BODO_ALLOWED_EXAMS.includes(category);
          const hideHindiLive = (category === 'assam_police');

          if (liveAsOpt) liveAsOpt.style.display = (showRegionalLive && availableLangs.has('as')) ? '' : 'none';
          if (liveBnOpt) liveBnOpt.style.display = (showRegionalLive && availableLangs.has('bn')) ? '' : 'none';
          if (liveBrxOpt) liveBrxOpt.style.display = (showBodoLive && availableLangs.has('brx')) ? '' : 'none';
          if (liveHiOpt) liveHiOpt.style.display = (!hideHindiLive && availableLangs.has('hi')) ? '' : 'none';

          // If a hidden language was somehow selected, reset to English
          if (liveToggle) {
             const selectedOpt = liveToggle.querySelector(`option[value="${selectedMockTestLanguage}"]`);
             if (!selectedOpt || selectedOpt.style.display === 'none') {
               selectedMockTestLanguage = 'en';
               liveToggle.value = 'en';
             }
          }
          
          currentIndex = 0;
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

    // ── Section Tabs Navigation (Overall Mode) ───────────
    function renderSectionTabs() {
      const container = document.getElementById('section-tabs-container');
      if (!container) return;

      if (timingMode === 'overall') {
        container.classList.remove('hidden');
        container.innerHTML = '';
        SECTION_ORDER.forEach((secKey, index) => {
          const btn = document.createElement('button');
          btn.className = 'section-tab-btn';
          if (index === activeSectionIndex) {
            btn.classList.add('active');
          }
          btn.textContent = SECTION_NAMES[secKey] || secKey;
          btn.onclick = () => switchSection(index);
          container.appendChild(btn);
        });
      } else {
        container.classList.add('hidden');
      }
    }

    function switchSection(index) {
      if (index === activeSectionIndex) return;
      
      const currentSectionKey = SECTION_ORDER[activeSectionIndex];
      recordTimeSpent(currentSectionKey, currentIndex);

      activeSectionIndex = index;
      currentIndex = 0; // Default to the first question of the newly selected section
      
      startSectionQuiz();
    }

    // ── Start A Specific Section ─────────────────────────
    function startSectionQuiz() {
      const currentSectionKey = SECTION_ORDER[activeSectionIndex];
      questions = allQuestionsBySection[currentSectionKey];
      
      // If a section is empty, automatically jump to next valid section
      if (questions.length === 0 && activeSectionIndex < SECTION_ORDER.length - 1) {
        activeSectionIndex++;
        currentIndex = 0;
        startSectionQuiz();
        return;
      } else if (questions.length === 0) {
        showResult();
        return;
      }

      // Handle timer logic based on mode
      if (timingMode === 'overall') {
        if (!timerInterval) {
          if (selectedCategory === 'assam_police') {
            sectionTimeLeft = 120 * 60; // 120 minutes (2 hours)
          } else {
            sectionTimeLeft = 60 * 60; // 60 minutes default
          }
          timerBadge.classList.remove('danger');
          startSectionTimer();
        }
      } else {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        sectionTimeLeft = TIME_PER_SECTION;
        timerBadge.classList.remove('danger');
        startSectionTimer();
      }

      // Update Header with Active Section Banner Info
      const titleSpan = document.getElementById('sidebar-subject-title');
      if (titleSpan) {
        titleSpan.textContent = `Subject: ${SECTION_NAMES[currentSectionKey]}`;
      }

      renderSectionTabs();
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
          timerInterval = null;
          const currentSectionKey = SECTION_ORDER[activeSectionIndex];
          recordTimeSpent(currentSectionKey, currentIndex);
          
          if (timingMode === 'overall') {
            showToast('Time is up for the entire exam!', 'info');
            showResult();
          } else {
            showToast(`Time is up for ${SECTION_NAMES[currentSectionKey]}! Moving to next subject.`, 'info');
            moveToNextSection();
          }
        }
      }, 1000);
    }

    function updateTimerDisplay() {
      const mins = Math.floor(sectionTimeLeft / 60).toString().padStart(2, '0');
      const secs = (sectionTimeLeft % 60).toString().padStart(2, '0');
      const currentSectionKey = SECTION_ORDER[activeSectionIndex];
      if (timingMode === 'overall') {
        timerDisplay.textContent = `[Overall] ${mins}:${secs}`;
      } else {
        timerDisplay.textContent = `[${SECTION_NAMES[currentSectionKey]}] ${mins}:${secs}`;
      }
    }

    function moveToNextSection() {
      if (activeSectionIndex < SECTION_ORDER.length - 1) {
        activeSectionIndex++;
        currentIndex = 0;
        startSectionQuiz();
      } else {
        clearInterval(timerInterval);
        timerInterval = null;
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

      // Fallback chain: selected lang → English → Hindi → others (prevents blank questions)
      const questionLangText = typeof q.question === 'object'
        ? (q.question[applyLang] || q.question['en'] || q.question['hi'] || q.question['as'] || q.question['bn'] || q.question['brx'] || '')
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
          
          // Fallback chain: selected lang → English → Hindi → others
          const optionLangText = typeof opt === 'object' ? (opt[applyLang] || opt['en'] || opt['hi'] || opt['as'] || opt['bn'] || opt['brx'] || '') : (opt || '');
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

      ensureMathJax().then(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise().catch(err => console.warn('MathJax typeset failed:', err));
        }
      });
    }

    // ── Update Submit/Next Button Text ────────────────────
    function updateNextButtonText() {
      const isLastQuestion = (currentIndex === questions.length - 1);
      const isLastSection = (activeSectionIndex === SECTION_ORDER.length - 1);

      if (answered) {
        if (!isLastQuestion) nextBtn.textContent = 'Save & Next →';
        else nextBtn.textContent = isLastSection ? 'Submit Test →' : (timingMode === 'overall' ? 'Next Section →' : 'Submit Subject & Continue →');
      } else {
        if (!isLastQuestion) nextBtn.textContent = 'Skip Question →';
        else nextBtn.textContent = isLastSection ? 'Submit Test →' : (timingMode === 'overall' ? 'Next Section →' : 'Skip & Continue →');
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
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      // Clear saved progress on finish
      sessionStorage.removeItem('current_answers');
      sessionStorage.removeItem('is_reattempting');

      // Record time for the last question being viewed
      const lastSectionKey = SECTION_ORDER[activeSectionIndex];
      recordTimeSpent(lastSectionKey, currentIndex);

      quizScreen.classList.add('hidden');
      resetErrorReportUI();
      resultScreen.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      correctCount = 0;
      wrongCount = 0;
      let attemptedCount = 0;
      score = 0;
      let totalQuestionsAcrossQuiz = 0;
      const sectionBreakdown = {};

      let marksToAdd = CORRECT_MARKS;
      let marksToDeduct = WRONG_PENALTY;
      if (selectedCategory === 'assam_police') {
        marksToAdd = 0.5;
        marksToDeduct = 0;
      }

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
              score += marksToAdd;
            } else {
              wrongCount++;
              secWrong++;
              score -= marksToDeduct;
            }
          }
        });

        sectionBreakdown[secKey] = {
          total: sectState.length,
          attempted: secAttempted,
          correct: secCorrect,
          wrong: secWrong,
          score: parseFloat((secCorrect * marksToAdd - secWrong * marksToDeduct).toFixed(2))
        };
      });

      const unanswered = totalQuestionsAcrossQuiz - attemptedCount;
      const totalPossible = totalQuestionsAcrossQuiz * marksToAdd;

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
      
      // Tokenize to protect math blocks from being altered
      const mathRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
      const tokens = text.split(mathRegex);

      for (let i = 0; i < tokens.length; i++) {
        // Even indices are regular text, odd indices are math blocks
        if (i % 2 === 0) {
          let textPart = tokens[i];
          
          // Add line breaks before keywords
          textPart = textPart.replace(/\b(Given:|Formula:|Solution:|Therefore:|Ans:|Answer:)/gi, '\n**$1** ');
          
          // Style "Step N:" with reduced margins and no extra newlines
          textPart = textPart.replace(/(Step\s+\d+[:.']?)/gi, '<div style="margin-top: 8px; margin-bottom: 4px; font-weight: 700; color: var(--green); letter-spacing: 0.03em;">$1</div>');
          
          // Add line breaks after full stops (sentences)
          textPart = textPart.replace(/\.\s+/g, '.\n');
          
          // Keep existing fraction and exponent replacements
          textPart = textPart.replace(/(\d+(?:\.\d+)?)\^(\d+(?:\.\d+)?)/g, '$1<sup>$2</sup>')
                             .replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g, '<span style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; vertical-align: middle; font-size: 0.85em; line-height: 1.1; margin: 0 4px;"><span style="border-bottom: 1.5px solid currentColor; width: 100%; text-align: center; padding-bottom: 1px;">$1</span><span style="padding-top: 1px;">$2</span></span>');

          tokens[i] = textPart;
        }
      }
      
      let formattedText = tokens.join('');

      return formattedText.split('\n').map(line => {
        const trimmed = line.trim();
        // Replace **keyword** with styled span if needed, but simple bold is fine too
        let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (trimmed.startsWith('*')) {
          const content = trimmed.replace(/^\*+\s*/, '');
          return `<div class="expl-bullet">${processedLine.replace(/^\*+\s*/, '')}</div>`;
        }
        return processedLine;
      }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
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
            
            // Fallback chain: selected lang → English → Hindi → others
            const questionLangText = typeof q.question === 'object' ? (q.question[applyLang] || q.question['en'] || q.question['hi'] || q.question['as'] || q.question['bn'] || q.question['brx'] || '') : q.question;
            const explanationLangText = typeof q.explanation === 'object' ? (q.explanation[applyLang] || q.explanation['en'] || q.explanation['hi'] || q.explanation['as'] || q.explanation['bn'] || q.explanation['brx'] || '') : q.explanation;
            
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
              
              // Fallback chain: selected lang → English → Hindi → others
              const optionLangText = typeof opt === 'object' ? (opt[applyLangOpt] || opt['en'] || opt['hi'] || opt['as'] || opt['bn'] || opt['brx'] || '') : opt;
              
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

      ensureMathJax().then(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise().catch(err => console.warn('MathJax typeset failed:', err));
        }
      });
    }

    // ── Exams that support Regional languages ─────────────
    const REGIONAL_LANG_ALLOWED_EXAMS = ['ssc_gd', 'assam_police', 'weekly_quiz', 'adre', 'apsc_cce', 'assam_tet'];
    const BODO_ALLOWED_EXAMS = ['assam_police', 'adre', 'apsc_cce', 'assam_tet'];

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

      // Toggle language options in test-selection dropdown based on exam category
      const assameseOpt = document.getElementById('assamese-option');
      const bengaliOpt = document.getElementById('bengali-option');
      const bodoOpt = document.getElementById('bodo-option');
      const hindiOpt = document.getElementById('hindi-option');

      const showRegional = REGIONAL_LANG_ALLOWED_EXAMS.includes(category);
      const showBodo = BODO_ALLOWED_EXAMS.includes(category);
      const hideHindi = (category === 'assam_police');

      if (assameseOpt) assameseOpt.style.display = showRegional ? '' : 'none';
      if (bengaliOpt) bengaliOpt.style.display = showRegional ? '' : 'none';
      if (bodoOpt) bodoOpt.style.display = showBodo ? '' : 'none';
      if (hindiOpt) hindiOpt.style.display = hideHindi ? 'none' : '';

      const langSelect = document.getElementById('mock-lang-select');
      if (langSelect) {
        if (!showRegional && ['as', 'bn'].includes(langSelect.value)) {
          langSelect.value = 'en';
        }
        if (!showBodo && langSelect.value === 'brx') {
          langSelect.value = 'en';
        }
        if (hideHindi && langSelect.value === 'hi') {
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

      // Update info chips based on mode
      const infoChips = document.querySelector('.sub-category-info-chips');
      if (isStudyMode && infoChips) {
        infoChips.innerHTML = `
          <div class="study-info-chips">
            <span class="study-info-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              Study Mode
            </span>
            <span class="study-info-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              No Timer
            </span>
            <span class="study-info-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              No Scoring
            </span>
          </div>
        `;
      } else if (infoChips && !isStudyMode) {
        // Restore default mock test info chips
        infoChips.innerHTML = `
          <span class="chip accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            <span id="time-chip">15 Minutes</span>
          </span>
          <span class="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
            <span id="questions-chip">0 Questions</span>
          </span>
          <span class="chip green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            +2 Correct
          </span>
          <span class="chip red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            \u22120.25 Wrong
          </span>
        `;
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
      banking: [
        { key: 'ibps_po', icon: '🏛️', name: 'IBPS PO', desc: 'Probationary Officers' },
        { key: 'ibps_clerk', icon: '📝', name: 'IBPS Clerk', desc: 'Clerical Cadre' },
        { key: 'ibps_so', icon: '👔', name: 'IBPS SO', desc: 'Specialist Officers' },
        { key: 'ibps_rrb', icon: '🌾', name: 'IBPS RRB', desc: 'PO & Clerk in RRBs' },
        { key: 'sbi_po', icon: '🏦', name: 'SBI PO', desc: 'Entry-level Officers' },
        { key: 'sbi_clerk', icon: '📋', name: 'SBI Clerk', desc: 'Junior Associates' },
        { key: 'rbi_grade_b', icon: '🪙', name: 'RBI Grade B', desc: 'Officer Recruitment' },
        { key: 'rbi_assistant', icon: '💼', name: 'RBI Assistant', desc: 'Clerical Support' },
        { key: 'other_banking', icon: '🏢', name: 'Other Banking', desc: 'NABARD, SIDBI, LIC, IDBI' }
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

      // Ensure language visibility stays in sync when navigating back to test selection
      const assameseOptSync = document.getElementById('assamese-option');
      const bengaliOptSync = document.getElementById('bengali-option');
      const bodoOptSync = document.getElementById('bodo-option');
      const hindiOptSync = document.getElementById('hindi-option');

      const showRegionalSync = REGIONAL_LANG_ALLOWED_EXAMS.includes(category);
      const showBodoSync = BODO_ALLOWED_EXAMS.includes(category);
      const hideHindiSync = (category === 'assam_police');

      if (assameseOptSync) assameseOptSync.style.display = showRegionalSync ? '' : 'none';
      if (bengaliOptSync) bengaliOptSync.style.display = showRegionalSync ? '' : 'none';
      if (bodoOptSync) bodoOptSync.style.display = showBodoSync ? '' : 'none';
      if (hindiOptSync) hindiOptSync.style.display = hideHindiSync ? 'none' : '';

      const langSelectSync = document.getElementById('mock-lang-select');
      if (langSelectSync) {
        if (!showRegionalSync && ['as', 'bn'].includes(langSelectSync.value)) {
          langSelectSync.value = 'en';
        }
        if (!showBodoSync && langSelectSync.value === 'brx') {
          langSelectSync.value = 'en';
        }
        if (hideHindiSync && langSelectSync.value === 'hi') {
          langSelectSync.value = 'en';
        }
      }

      const tabsContainer = document.getElementById('subject-filter-tabs');
      if (tabsContainer) {
        tabsContainer.innerHTML = '';
        tabsContainer.classList.add('hidden');
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

          // Extract unique subjects
          let subjects = new Set();
          sortedDocs.forEach(doc => {
            let data = doc.data();
            let subj = (data.section || data.subject || '').trim();
            if (!subj) {
              let nameLower = (data.testName || '').toLowerCase();
              if (nameLower.includes('hindi')) subj = 'Hindi';
              else if (nameLower.includes('reasoning')) subj = 'Reasoning';
              else if (nameLower.includes('math') || nameLower.includes('quant')) subj = 'Maths';
              else if (nameLower.includes('gk') || nameLower.includes('general knowledge')) subj = 'General Knowledge';
              else if (nameLower.includes('english')) subj = 'English';
            }
            if (subj) {
              subj = subj.charAt(0).toUpperCase() + subj.slice(1).toLowerCase();
              subjects.add(subj);
            }
          });

          const subjectsArray = Array.from(subjects).sort();

          const renderTestCards = (filterSubject) => {
            listContainer.innerHTML = '';
            
            let filteredDocs = sortedDocs;
            if (filterSubject && filterSubject !== 'All Tests') {
              filteredDocs = sortedDocs.filter(doc => {
                let data = doc.data();
                let subj = (data.section || data.subject || '').trim();
                if (!subj) {
                  let nameLower = (data.testName || '').toLowerCase();
                  if (nameLower.includes('hindi')) subj = 'Hindi';
                  else if (nameLower.includes('reasoning')) subj = 'Reasoning';
                  else if (nameLower.includes('math') || nameLower.includes('quant')) subj = 'Maths';
                  else if (nameLower.includes('gk') || nameLower.includes('general knowledge')) subj = 'General Knowledge';
                  else if (nameLower.includes('english')) subj = 'English';
                }
                if (subj) {
                  subj = subj.charAt(0).toUpperCase() + subj.slice(1).toLowerCase();
                }
                return subj === filterSubject;
              });
            }

            if (filteredDocs.length === 0) {
               listContainer.innerHTML = `<div style="grid-column: span 2; text-align: center; color: var(--text-secondary); padding: 20px;">No tests available for this section.</div>`;
               return;
            }

            filteredDocs.forEach(doc => {
              const testData = doc.data();
              const btn = document.createElement('button');
              btn.className = 'sub-card';
              btn.innerHTML = `
                <span class="sub-icon">${isStudyMode ? '📖' : '📝'}</span>
                <span class="sub-name">${testData.testName || 'Practice Test'}</span>
                <span class="sub-desc">${isStudyMode ? 'Study questions & answers' : 'Start practice mock test'}</span>
              `;
              btn.onclick = () => {
                let testLang = 'en';
                if (subCategory === 'full_mock' || subCategory === 'previous_year') {
                  const langSelect = document.getElementById('mock-lang-select');
                  if (langSelect) testLang = langSelect.value;
                } else {
                  const testNameLower = (testData.testName || '').toLowerCase();
                  const subjectLower = (testData.section || testData.subject || '').toLowerCase();
                  if (testNameLower.includes('hindi') || subjectLower.includes('hindi')) {
                    testLang = 'hi';
                  } else if (testNameLower.includes('assamese') || subjectLower.includes('assamese')) {
                    testLang = 'as';
                  } else if (testNameLower.includes('bengali') || subjectLower.includes('bengali')) {
                    testLang = 'bn';
                  } else if (testNameLower.includes('bodo') || subjectLower.includes('bodo')) {
                    testLang = 'brx';
                  }
                }

                // ── Study Mode Branch ──
                if (isStudyMode) {
                  startStudyMode(category, subCategory, testData.testId, testLang);
                  return;
                }

                // ── Mock Test Mode (original flow) ──
                if (category === 'assam_police' && (subCategory === 'full_mock' || subCategory === 'previous_year')) {
                  timingMode = 'overall';
                  fetchQuestions(category, subCategory, testData.testId, testLang);
                } else if (category.startsWith('ssc_') && (subCategory === 'full_mock' || subCategory === 'previous_year')) {
                  showTimerModal(() => {
                    fetchQuestions(category, subCategory, testData.testId, testLang);
                  });
                } else {
                  timingMode = 'sectional'; // Default for non-SSC or other subCategories
                  fetchQuestions(category, subCategory, testData.testId, testLang);
                }
              };
              listContainer.appendChild(btn);
            });
          };

          // Render Tabs
          if (tabsContainer && subjectsArray.length > 0) {
            tabsContainer.classList.remove('hidden');
            
            const allTabs = ['All Tests', ...subjectsArray];
            allTabs.forEach((subj, idx) => {
              const tabBtn = document.createElement('button');
              tabBtn.className = 'filter-tab';
              if (idx === 0) tabBtn.classList.add('active');
              tabBtn.textContent = subj;
              tabBtn.onclick = () => {
                document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
                tabBtn.classList.add('active');
                renderTestCards(subj);
              };
              tabsContainer.appendChild(tabBtn);
            });
          }

          // Initial Render
          renderTestCards('All Tests');
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
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
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
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
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
      } else if (timingMode === 'overall' && activeSectionIndex > 0) {
        activeSectionIndex--;
        const currentSectionKey = SECTION_ORDER[activeSectionIndex];
        const sectionQuestions = allQuestionsBySection[currentSectionKey];
        currentIndex = sectionQuestions.length > 0 ? sectionQuestions.length - 1 : 0;
        startSectionQuiz();
      }
    }

    // ── Exit Test Back Action ────────────────────────────
    function confirmExitQuiz() {
      showCustomConfirm("Are you sure you want to exit the test? Your progress will be lost.", () => {
        sessionStorage.removeItem('current_answers');
        sessionStorage.removeItem('is_reattempting');
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        pushUrlState(selectedCategory, selectedSubCategory, null);
        initFromURL(true);
        
        activeSectionIndex = 0;
        currentIndex = 0;
      });
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
      
      // Prevent switching to regional languages for exams that don't support them
      if (['as', 'bn', 'brx'].includes(lang) && !REGIONAL_LANG_ALLOWED_EXAMS.includes(selectedCategory)) {
        const liveToggle = document.getElementById('live-lang-toggle');
        if (liveToggle) liveToggle.value = selectedMockTestLanguage;
        return;
      }
      
      // Prevent switching to Hindi for Assam Police
      if (lang === 'hi' && selectedCategory === 'assam_police') {
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

    // ══════════════════════════════════════════════════════
    //  STUDY MODE FUNCTIONS
    // ══════════════════════════════════════════════════════

    // ── Mode Toggle Handler ──────────────────────────────
    function setMode(mode) {
      isStudyMode = (mode === 'study');
      
      const mocktestBtn = document.getElementById('mode-mocktest');
      const studyBtn = document.getElementById('mode-study');
      const slider = document.getElementById('mode-toggle-slider');
      const modeDesc = document.getElementById('mode-desc');
      const startIcon = document.querySelector('.start-screen-icon');
      const quizTitle = document.querySelector('#start-screen .quiz-title');
      const quizDesc = document.querySelector('#start-screen > .quiz-desc');

      if (isStudyMode) {
        if (mocktestBtn) mocktestBtn.classList.remove('active');
        if (studyBtn) studyBtn.classList.add('active');
        if (slider) slider.classList.add('study-active');
        if (modeDesc) modeDesc.textContent = 'Read questions & answers at your own pace';
        if (startIcon) startIcon.textContent = '\ud83d\udcd6';
        if (quizTitle) quizTitle.textContent = ' Study Mode';
        if (quizDesc) quizDesc.textContent = 'Browse through questions and reveal answers when you\'re ready. No timer, no scoring \u2014 just learning!';
      } else {
        if (mocktestBtn) mocktestBtn.classList.add('active');
        if (studyBtn) studyBtn.classList.remove('active');
        if (slider) slider.classList.remove('study-active');
        if (modeDesc) modeDesc.textContent = 'Timed test with scoring & negative marking';
        if (startIcon) startIcon.textContent = '\ud83d\udcdd';
        if (quizTitle) quizTitle.textContent = ' Mock Test';
        if (quizDesc) quizDesc.textContent = 'Test your knowledge with a quick mock test. Instant scoring with negative marking \u2014 just like the real exam!';
      }
    }

    // ── Start Study Mode ─────────────────────────────────
    async function startStudyMode(category, subCategory, testId, testLang = 'en') {
      selectedCategory = category;
      selectedSubCategory = subCategory;
      selectedTestId = testId || '';
      selectedMockTestLanguage = testLang;

      showGlobalLoader('Loading study material...', startStudyMode, category, subCategory, testId, testLang);
      
      try {
        // Dynamically update SECTION_ORDER before rendering
        if (category === 'weekly_quiz') {
          let sec = (subCategory || 'gk').toLowerCase();
          if (sec === 'math' || sec === 'mathematics' || sec === 'maths') sec = 'quant';
          SECTION_ORDER = [sec];
        } else if (category === 'assam_police') {
          SECTION_ORDER = ['reasoning', 'gk', 'quant', 'english', 'general', 'assamese', 'bengali', 'bodo'];
        } else if (testLang === 'hi') {
          SECTION_ORDER = ['reasoning', 'gk', 'quant', 'hindi'];
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
          showToast(`No questions available for study.`, 'warning');
          return;
        }

        // Organize questions by section (reuses same logic as fetchQuestions)
        allQuestionsBySection = {};
        SECTION_ORDER.forEach(sec => {
          allQuestionsBySection[sec] = [];
        });

        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          let rawSec;
          if (category === 'weekly_quiz') {
            rawSec = (subCategory || 'gk').toLowerCase();
          } else {
            rawSec = (data.section || 'reasoning').toLowerCase();
          }
          if (rawSec === 'math' || rawSec === 'mathematics' || rawSec === 'maths') rawSec = 'quant';
          if (rawSec === 'general knowledge' || rawSec === 'general_knowledge' || rawSec === 'general awareness' || rawSec === 'general_awareness') rawSec = 'gk';

          const questionObj = {
            id: docSnap.id,
            section: rawSec,
            imageUrl: data.imageUrl || '',
            question: {
              en: data.questionText_en || '',
              hi: data.questionText_hi || data.questionText || '',
              as: data.questionText_as || '',
              bn: data.questionText_bn || '',
              brx: data.questionText_brx || ''
            },
            options: [
              { en: data.a_en || '', hi: data.a_hi || data.a || '', as: data.a_as || '', bn: data.a_bn || '', brx: data.a_brx || '' },
              { en: data.b_en || '', hi: data.b_hi || data.b || '', as: data.b_as || '', bn: data.b_bn || '', brx: data.b_brx || '' },
              { en: data.c_en || '', hi: data.c_hi || data.c || '', as: data.c_as || '', bn: data.c_bn || '', brx: data.c_brx || '' },
              { en: data.d_en || '', hi: data.d_hi || data.d || '', as: data.d_as || '', bn: data.d_bn || '', brx: data.d_brx || '' }
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
              as: data.explanation_as || '',
              bn: data.explanation_bn || '',
              brx: data.explanation_brx || ''
            }
          };

          if (allQuestionsBySection[questionObj.section]) {
            allQuestionsBySection[questionObj.section].push(questionObj);
          }
        });

        // Filter and sort (same logic as fetchQuestions)
        SECTION_ORDER.forEach(sec => {
          allQuestionsBySection[sec] = allQuestionsBySection[sec].filter(q => {
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

          allQuestionsBySection[sec].sort((a, b) => {
            return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
          });
        });

        const totalFetched = Object.values(allQuestionsBySection).reduce((a, b) => a + b.length, 0);
        if (totalFetched === 0) {
          hideGlobalLoader();
          if (testSelectionScreen) testSelectionScreen.classList.remove('hidden');
          showToast('No questions available for study.', 'warning');
          return;
        }

        // Show study mode screen
        if (subScreen) subScreen.classList.add('hidden');
        if (testSelectionScreen) testSelectionScreen.classList.add('hidden');
        hideGlobalLoader();

        // Update study screen header
        const studyExamBadge = document.getElementById('study-exam-badge');
        if (studyExamBadge) {
          const catName = categoryNames[category] || category.toUpperCase();
          const subName = subCategory.replace('_', ' ').toUpperCase();
          studyExamBadge.textContent = `${catName} - ${subName}`;
        }

        // Update study language toggle
        const studyLangToggle = document.getElementById('study-lang-toggle');
        if (studyLangToggle) {
          studyLangToggle.value = selectedMockTestLanguage;
          
          // Show/hide language options based on category
          const studyAsOpt = document.getElementById('study-assamese-option');
          const studyBnOpt = document.getElementById('study-bengali-option');
          const studyBrxOpt = document.getElementById('study-bodo-option');
          const studyHiOpt = document.getElementById('study-hindi-option');
          
          const showRegional = REGIONAL_LANG_ALLOWED_EXAMS.includes(category);
          const showBodo = BODO_ALLOWED_EXAMS.includes(category);
          const hideHindi = (category === 'assam_police');
          
          if (studyAsOpt) studyAsOpt.style.display = showRegional ? '' : 'none';
          if (studyBnOpt) studyBnOpt.style.display = showRegional ? '' : 'none';
          if (studyBrxOpt) studyBrxOpt.style.display = showBodo ? '' : 'none';
          if (studyHiOpt) studyHiOpt.style.display = hideHindi ? 'none' : '';
        }

        // Update progress text
        const progressTextEl = document.getElementById('study-progress-text');
        if (progressTextEl) {
          progressTextEl.textContent = `${totalFetched} Questions`;
        }

        // Reset reveal all state
        studyAllRevealed = false;
        const revealAllBtn = document.getElementById('study-reveal-all-btn');
        if (revealAllBtn) {
          revealAllBtn.textContent = '\ud83d\udc41 Reveal All Answers';
          revealAllBtn.classList.remove('all-revealed');
        }

        const studyScreen = document.getElementById('study-mode-screen');
        if (studyScreen) studyScreen.classList.remove('hidden');

        renderStudyQuestions();
        window.scrollTo({ top: 0, behavior: 'smooth' });

      } catch (error) {
        console.error('Error loading study questions:', error);
        showGlobalError('Error loading questions. Please check your connection.');
      }
    }

    // ── Render All Study Questions ────────────────────────
    function renderStudyQuestions() {
      const container = document.getElementById('study-questions-container');
      if (!container) return;
      container.innerHTML = '';

      const optionLabels = ['A', 'B', 'C', 'D'];
      const optionKeys = ['a', 'b', 'c', 'd'];
      let globalNum = 1;

      SECTION_ORDER.forEach(secKey => {
        const questionsArr = allQuestionsBySection[secKey] || [];
        if (questionsArr.length === 0) return;

        questionsArr.forEach((q, idx) => {
          const card = document.createElement('div');
          card.className = 'study-question-card';
          card.id = `study-card-${secKey}-${idx}`;
          card.style.animationDelay = `${Math.min(globalNum * 0.03, 0.6)}s`;

          let applyLang = selectedMockTestLanguage;
          if (q.section === 'hindi') applyLang = 'hi';
          if (q.section === 'english') applyLang = 'en';

          // Question text with fallback
          const questionLangText = typeof q.question === 'object'
            ? (q.question[applyLang] || q.question['en'] || q.question['hi'] || q.question['as'] || q.question['bn'] || q.question['brx'] || '')
            : (q.question || '');

          // Section badge
          const sectionName = SECTION_NAMES[secKey] || secKey;

          // Build options HTML
          const correctKey = (q.answer || '').toLowerCase();
          const correctIdx = optionKeys.indexOf(correctKey);

          let optionsHtml = '';
          q.options.forEach((opt, optIdx) => {
            const optImgUrl = (q.optionImages && q.optionImages[optIdx]) ? q.optionImages[optIdx].trim() : '';
            const isCorrect = optIdx === correctIdx;

            if (optImgUrl) {
              optionsHtml += `
                <div class="study-option study-option-image ${isCorrect ? 'is-correct' : ''}">
                  <span class="study-key">${optionLabels[optIdx]}</span>
                  <img src="${optImgUrl}" loading="lazy" decoding="async" alt="Option ${optionLabels[optIdx]}" />
                </div>
              `;
            } else {
              let optApplyLang = selectedMockTestLanguage;
              if (q.section === 'hindi') optApplyLang = 'hi';
              if (q.section === 'english') optApplyLang = 'en';
              const optionLangText = typeof opt === 'object'
                ? (opt[optApplyLang] || opt['en'] || opt['hi'] || opt['as'] || opt['bn'] || opt['brx'] || '')
                : (opt || '');

              optionsHtml += `
                <div class="study-option ${isCorrect ? 'is-correct' : ''}">
                  <span class="study-key">${optionLabels[optIdx]}</span>
                  <span>${optionLangText}</span>
                </div>
              `;
            }
          });

          // Correct answer text for the answer section
          const correctOptObj = q.options[correctIdx];
          let correctOptText = '';
          if (correctOptObj) {
            const correctImgUrl = (q.optionImages && q.optionImages[correctIdx]) ? q.optionImages[correctIdx].trim() : '';
            if (correctImgUrl) {
              correctOptText = `<img src="${correctImgUrl}" loading="lazy" style="max-width:100%;border-radius:8px;" alt="Correct answer" />`;
            } else {
              let cLang = selectedMockTestLanguage;
              if (q.section === 'hindi') cLang = 'hi';
              if (q.section === 'english') cLang = 'en';
              correctOptText = typeof correctOptObj === 'object'
                ? (correctOptObj[cLang] || correctOptObj['en'] || correctOptObj['hi'] || '')
                : (correctOptObj || '');
            }
          }

          // Explanation
          const explanationLangText = typeof q.explanation === 'object'
            ? (q.explanation[applyLang] || q.explanation['en'] || q.explanation['hi'] || q.explanation['as'] || q.explanation['bn'] || q.explanation['brx'] || '')
            : (q.explanation || '');

          const explanationHtml = explanationLangText
            ? `<div class="study-explanation"><strong>Explanation</strong>${formatExplanation(explanationLangText)}</div>`
            : '';

          // Image
          const imageHtml = (q.imageUrl && q.imageUrl.trim())
            ? `<img class="study-question-image visible" src="${q.imageUrl}" loading="lazy" decoding="async" alt="Question illustration" />`
            : '';

          const answerId = `study-answer-${secKey}-${idx}`;

          card.innerHTML = `
            <div class="study-question-number">
              Question ${globalNum}
              <span class="study-question-section-badge">${sectionName}</span>
            </div>
            <div class="study-question-text">Q${globalNum}. ${questionLangText}</div>
            ${imageHtml}
            <div class="study-options-list">
              ${optionsHtml}
            </div>
            <button type="button" class="study-show-answer-btn" id="study-btn-${secKey}-${idx}" onclick="toggleStudyAnswer('${secKey}', ${idx})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-icon" width="18" height="18"><polyline points="6 9 12 15 18 9"></polyline></svg>
              Show Answer
            </button>
            <div class="study-answer-section" id="${answerId}">
              <div class="study-answer-content">
                <div class="study-correct-label">\u2713 Correct Answer</div>
                <div class="study-correct-answer">
                  <span class="study-key">${correctIdx >= 0 ? optionLabels[correctIdx] : '?'}</span>
                  <span>${correctOptText}</span>
                </div>
                ${explanationHtml}
              </div>
            </div>
          `;

          container.appendChild(card);
          globalNum++;
        });
      });

      // Typeset MathJax if loaded
      ensureMathJax().then(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise().catch(err => console.warn('MathJax typeset failed:', err));
        }
      });
    }

    // ── Toggle Individual Study Answer ───────────────────
    function toggleStudyAnswer(secKey, idx) {
      const answerSection = document.getElementById(`study-answer-${secKey}-${idx}`);
      const btn = document.getElementById(`study-btn-${secKey}-${idx}`);
      const card = document.getElementById(`study-card-${secKey}-${idx}`);

      if (!answerSection) return;

      const isRevealed = answerSection.classList.contains('revealed');
      
      if (isRevealed) {
        answerSection.classList.remove('revealed');
        if (btn) {
          btn.classList.remove('revealed');
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-icon" width="18" height="18"><polyline points="6 9 12 15 18 9"></polyline></svg>
            Show Answer
          `;
        }
        if (card) card.classList.remove('answer-revealed');
      } else {
        answerSection.classList.add('revealed');
        if (btn) {
          btn.classList.add('revealed');
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-icon" width="18" height="18"><polyline points="6 9 12 15 18 9"></polyline></svg>
            Hide Answer
          `;
        }
        if (card) card.classList.add('answer-revealed');
      }
    }

    // ── Toggle Reveal All Answers ────────────────────────
    function toggleRevealAllStudyAnswers() {
      studyAllRevealed = !studyAllRevealed;
      
      const revealAllBtn = document.getElementById('study-reveal-all-btn');
      
      SECTION_ORDER.forEach(secKey => {
        const questionsArr = allQuestionsBySection[secKey] || [];
        questionsArr.forEach((q, idx) => {
          const answerSection = document.getElementById(`study-answer-${secKey}-${idx}`);
          const btn = document.getElementById(`study-btn-${secKey}-${idx}`);
          const card = document.getElementById(`study-card-${secKey}-${idx}`);

          if (!answerSection) return;

          if (studyAllRevealed) {
            answerSection.classList.add('revealed');
            if (btn) {
              btn.classList.add('revealed');
              btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-icon" width="18" height="18"><polyline points="6 9 12 15 18 9"></polyline></svg>
                Hide Answer
              `;
            }
            if (card) card.classList.add('answer-revealed');
          } else {
            answerSection.classList.remove('revealed');
            if (btn) {
              btn.classList.remove('revealed');
              btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-icon" width="18" height="18"><polyline points="6 9 12 15 18 9"></polyline></svg>
                Show Answer
              `;
            }
            if (card) card.classList.remove('answer-revealed');
          }
        });
      });

      if (revealAllBtn) {
        if (studyAllRevealed) {
          revealAllBtn.textContent = '\ud83d\udeab Hide All Answers';
          revealAllBtn.classList.add('all-revealed');
        } else {
          revealAllBtn.textContent = '\ud83d\udc41 Reveal All Answers';
          revealAllBtn.classList.remove('all-revealed');
        }
      }
    }

    // ── Study Mode Language Toggle ───────────────────────
    function toggleStudyLanguage(lang) {
      selectedMockTestLanguage = lang;
      renderStudyQuestions();
    }

    // ── Exit Study Mode ─────────────────────────────────
    function exitStudyMode() {
      const studyScreen = document.getElementById('study-mode-screen');
      if (studyScreen) studyScreen.classList.add('hidden');
      
      // Go back to test selection
      if (testSelectionScreen) {
        testSelectionScreen.classList.remove('hidden');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    window.setMode = setMode;
    window.exitStudyMode = exitStudyMode;
    window.toggleStudyAnswer = toggleStudyAnswer;
    window.toggleRevealAllStudyAnswers = toggleRevealAllStudyAnswers;
    window.toggleStudyLanguage = toggleStudyLanguage;

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
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
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

    const studyModeScreen = document.getElementById('study-mode-screen');

    function hideAllScreens() {
      [startScreen, subScreen, testSelectionScreen, quizScreen, resultScreen, myResultsScreen, studyModeScreen]
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

    // ── Toast Notification System ──────────────────────
    window.showToast = function(message, type = 'info') {
      let style = document.getElementById('toast-styles');
      if (!style) {
        style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
          .custom-toast-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
          }
          .custom-toast {
            min-width: 250px;
            max-width: 350px;
            background: rgba(30, 30, 30, 0.95);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            color: #fff;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: 'Inter', sans-serif;
            font-size: 0.95rem;
            animation: toastSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            border: 1px solid rgba(255, 255, 255, 0.1);
            pointer-events: auto;
          }
          .custom-toast.toast-error { border-bottom: 4px solid #ef4444; }
          .custom-toast.toast-warning { border-bottom: 4px solid #f59e0b; }
          .custom-toast.toast-success { border-bottom: 4px solid #10b981; }
          .custom-toast.toast-info { border-bottom: 4px solid #3b82f6; }
          
          .custom-toast.fade-out {
            animation: toastFadeOut 0.3s ease-in forwards;
          }
          
          @keyframes toastSlideIn {
            from { transform: translateX(120%) scale(0.9); opacity: 0; }
            to { transform: translateX(0) scale(1); opacity: 1; }
          }
          @keyframes toastFadeOut {
            from { transform: translateX(0) scale(1); opacity: 1; }
            to { transform: translateX(120%) scale(0.9); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'custom-toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = 'custom-toast toast-' + type;
      
      let icon = 'ℹ️';
      if (type === 'error') icon = '❌';
      else if (type === 'warning') icon = '⚠️';
      else if (type === 'success') icon = '✅';

      toast.innerHTML = `<span style="font-size: 1.3rem;">${icon}</span> <span>${message}</span>`;
      
      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        });
      }, 4000);
    };

    // ── Custom Confirm Modal ────────────────────────────
    window.showCustomConfirm = function(message, onConfirm) {
      const overlay = document.createElement('div');
      overlay.className = 'login-modal-overlay';
      overlay.style.zIndex = '999999';
      
      const modal = document.createElement('div');
      modal.className = 'login-modal';
      modal.style.textAlign = 'center';
      
      modal.innerHTML = `
        <div class="modal-icon" style="font-size: 2.5rem; margin-bottom: 12px;">⚠️</div>
        <h3 style="margin-bottom: 16px;">Are you sure?</h3>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="otp-btn" id="confirm-yes-btn" style="flex: 1; background: #ef4444; color: #fff; border: none;">Yes, Exit</button>
          <button class="otp-btn" id="confirm-no-btn" style="flex: 1; background: var(--surface); color: var(--text-primary); border: 1px solid var(--border);">Cancel</button>
        </div>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      document.getElementById('confirm-yes-btn').addEventListener('click', () => {
        document.body.removeChild(overlay);
        if (onConfirm) onConfirm();
      });
      
      document.getElementById('confirm-no-btn').addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
    };
