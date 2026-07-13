// ── Firebase Imports ───────────────────────────────
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-analytics.js";
    import { getFirestore, collection, getDocs, doc, getDoc, setDoc, query, orderBy, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
    import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

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
          displayName: user.displayName || 'User',
          email: user.email || '',
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
      if (loginModal) loginModal.classList.remove('hidden');
    }

    function dismissLoginModal() {
      if (loginModal) loginModal.classList.add('hidden');
      pendingResultData = null;
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
    const TIME_PER_SECTION = 15 * 60; // 15 minutes in seconds

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
      selectedTestId = testId || '';
      showGlobalLoader('Preparing questions...', fetchQuestions, category, subCategory, testId, testLang);
      try {
        if (subCategory === 'full_mock' || subCategory === 'previous_year') {
          selectedMockTestLanguage = testLang;
        } else {
          selectedMockTestLanguage = 'en'; // Default for subject-wise etc.
        }

        // Dynamically update SECTION_ORDER before quiz begins
        if (selectedMockTestLanguage === 'hi') {
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
          let rawSec = (data.section || 'reasoning').toLowerCase();
          if (rawSec === 'math' || rawSec === 'mathematics' || rawSec === 'maths') rawSec = 'quant';

          const questionObj = {
            id: doc.id,
            section: rawSec,
            imageUrl: data.imageUrl || '',
            question: {
              en: data.questionText_en || '',
              hi: data.questionText_hi || data.questionText || ''
            },
            options: [
              { en: data.a_en || '', hi: data.a_hi || data.a || '' },
              { en: data.b_en || '', hi: data.b_hi || data.b || '' },
              { en: data.c_en || '', hi: data.c_hi || data.c || '' },
              { en: data.d_en || '', hi: data.d_hi || data.d || '' }
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
              hi: data.explanation_hi || data.explanation || ''
            }
          };

          if (allQuestionsBySection[questionObj.section]) {
            allQuestionsBySection[questionObj.section].push(questionObj);
          }
        });

        // ── Filter: hide questions that have no text and no image across all languages ──
        SECTION_ORDER.forEach(sec => {
          allQuestionsBySection[sec] = allQuestionsBySection[sec].filter(q => {
            const txtEn = (typeof q.question === 'object') ? (q.question['en'] || '') : (q.question || '');
            const txtHi = (typeof q.question === 'object') ? (q.question['hi'] || '') : '';
            const hasText = (txtEn && txtEn.trim().length > 0) || (txtHi && txtHi.trim().length > 0);
            const hasImage = q.imageUrl && q.imageUrl.trim().length > 0;
            return hasText || hasImage;
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

        let hasSavedScore = false;
        if (currentUser) {
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
          quizScreen.classList.remove('hidden');
          
          const liveToggle = document.getElementById('live-lang-toggle');
          if (liveToggle) {
             liveToggle.value = selectedMockTestLanguage;
             // Disable live toggle if not a full mock or previous year
             if (subCategory !== 'full_mock' && subCategory !== 'previous_year') {
               liveToggle.disabled = true;
               liveToggle.title = "Language selection is only available for full mock tests";
             } else {
               liveToggle.disabled = false;
               liveToggle.title = "";
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
      quizState = {};
      timeSpentPerQuestion = {};
      SECTION_ORDER.forEach(secKey => {
        quizState[secKey] = allQuestionsBySection[secKey].map(() => ({
          status: 'not-visited',
          selectedIdx: -1,
          isCorrect: null,
          isReviewed: false
        }));
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

      const applyLang = (selectedSubCategory === 'full_mock' || selectedSubCategory === 'previous_year') ? selectedMockTestLanguage : 'en';

      const questionLangText = typeof q.question === 'object' ? (q.question[applyLang] || q.question['hi'] || q.question['en'] || '') : (q.question || '');
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
          btn.innerHTML = `<span class="key">${keys[i]}</span><img class="option-image" src="${optImgUrl}" alt="Option ${keys[i]}" />`;
        } else {
          const applyLang = (selectedSubCategory === 'full_mock' || selectedSubCategory === 'previous_year') ? selectedMockTestLanguage : 'en';
          const optionLangText = typeof opt === 'object' ? (opt[applyLang] || opt['hi'] || opt['en'] || '') : (opt || '');
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
            
            const applyLang = (selectedSubCategory === 'full_mock' || selectedSubCategory === 'previous_year') ? selectedMockTestLanguage : 'en';
            const questionLangText = typeof q.question === 'object' ? (q.question[applyLang] || q.question['hi'] || q.question['en'] || '') : q.question;
            const explanationLangText = typeof q.explanation === 'object' ? (q.explanation[applyLang] || q.explanation['hi'] || q.explanation['en'] || '') : q.explanation;
            
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
              
              const applyLang = (selectedSubCategory === 'full_mock' || selectedSubCategory === 'previous_year') ? selectedMockTestLanguage : 'en';
              const optionLangText = typeof opt === 'object' ? (opt[applyLang] || opt['hi'] || opt['en'] || '') : opt;
              
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

      if (subExamBadge) {
        subExamBadge.textContent = categoryNames[category] || category.toUpperCase();
      }

      startScreen.classList.add('hidden');
      if (category === 'weekly_test') {
        selectedSubCategory = 'weekly_test';
        loadTestsDynamically(category, 'weekly_test');
      } else {
        if (subScreen) subScreen.classList.remove('hidden');
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
        const subName = (subCategory && subCategory !== 'weekly_test') ? ` - ${subCategory.replace('_', ' ').toUpperCase()}` : '';
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

      const listContainer = document.getElementById('dynamic-test-list');
      if (!listContainer) return;
      listContainer.innerHTML = ''; // Clear previous content

      showGlobalLoader('Loading available tests...', loadTestsDynamically, category, subCategory);

      try {
        let q;
        if (category === 'weekly_test') {
          q = query(
            collection(db, 'tests'),
            where('exam', '==', category)
          );
        } else {
          const dbSubCategory = dbSubCategoryMap[subCategory] || subCategory;
          q = query(
            collection(db, 'tests'),
            where('exam', '==', category),
            where('subCategory', '==', dbSubCategory)
          );
        }

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          listContainer.innerHTML = `<div style="grid-column: span 2; text-align: center; color: var(--text-secondary); padding: 20px;">No tests available for this selection.</div>`;
        } else {
          snapshot.docs.forEach(doc => {
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
      if (selectedCategory === 'weekly_test') {
        goBackToCategories();
      } else {
        if (subScreen) subScreen.classList.remove('hidden');
      }
    }

    // ── Result Screen Back Button Action ──────────────────
    function goBackToTestSelection() {
      if (timerBadge) timerBadge.classList.remove('danger');
      if (resultScreen) resultScreen.classList.add('hidden');
      if (testSelectionScreen) testSelectionScreen.classList.remove('hidden');
    }

    // ── Restart (go back to start screen) ────────────────
    function restartQuiz() {
      if (timerInterval) clearInterval(timerInterval);
      timerBadge.classList.remove('danger');
      resultScreen.classList.add('hidden');
      startScreen.classList.remove('hidden');
    }

    // ── Reattempt Test (same test, reset all state) ──────
    function reattemptTest() {
      // Clear any running timer
      if (timerInterval) clearInterval(timerInterval);
      timerBadge.classList.remove('danger');

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
          status: 'not-visited',
          selectedIdx: -1,
          isCorrect: null
        };
        
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
      if (selectedSubCategory !== 'full_mock' && selectedSubCategory !== 'previous_year') return;
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

    // ── Check URL Params for Direct Exam Linking ─────────
    const initFromURL = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const examParam = urlParams.get('exam');
      if (examParam) {
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
