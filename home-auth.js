// ── Firebase Auth for Home Page (Job Updates) ──────────────
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
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

// Initialize or retrieve Firebase app (may already be initialized by script.js for Firestore)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ── Auth State ───────────────────────────────────────
let currentUser = null;

// ── Auth DOM Refs ────────────────────────────────────
const headerLoginBtn   = document.getElementById('header-login-btn');
const profileWrapper   = document.getElementById('profile-wrapper');
const profileTrigger   = document.getElementById('profile-trigger');
const profileDropdown  = document.getElementById('profile-dropdown');
const dropdownAvatar   = document.getElementById('dropdown-avatar');
const dropdownName     = document.getElementById('dropdown-name');
const dropdownLogout   = document.getElementById('dropdown-logout');
const loginModal       = document.getElementById('login-modal');
const modalLoginBtn    = document.getElementById('modal-login-btn');
const modalCloseBtn    = document.getElementById('modal-close-btn');

// Fallback avatar SVG data URI
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

    // If we just logged in via the modal, dismiss it
    if (loginModal && !loginModal.classList.contains('hidden')) {
      loginModal.classList.add('hidden');
    }
  } else {
    currentUser = null;
    // Update header UI: show login btn, hide profile avatar
    if (headerLoginBtn) headerLoginBtn.classList.remove('hidden');
    if (profileWrapper) profileWrapper.classList.add('hidden');
    if (profileDropdown) profileDropdown.classList.remove('open');
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
  } catch (error) {
    console.error('Google sign-in error:', error);
  }
}

// ── Logout ────────────────────────────────────────────
async function handleLogout() {
  if (profileDropdown) profileDropdown.classList.remove('open');
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
  }
}

// ── Login Modal Controls ─────────────────────────────
function openHeaderLogin() {
  resetPhoneOtpUI();
  if (loginModal) loginModal.classList.remove('hidden');
}

function dismissLoginModal() {
  if (loginModal) loginModal.classList.add('hidden');
  resetPhoneOtpUI();
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

const authNameGroup     = document.getElementById('auth-name-group');
const authNameInput     = document.getElementById('auth-name-input');
const authPhoneInput    = document.getElementById('auth-phone-input');
const authPasswordInput = document.getElementById('auth-password-input');
const togglePasswordBtn = document.getElementById('togglePassword');
const authSubmitBtn     = document.getElementById('auth-submit-btn');
const authStatusMsg     = document.getElementById('auth-status-msg');
const authToggleText    = document.getElementById('auth-toggle-text');

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
  } else {
    if (authNameGroup) authNameGroup.classList.add('hidden');
    if (authSubmitBtn) authSubmitBtn.textContent = 'Login';
    if (authToggleText) authToggleText.textContent = 'New here? ';
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

  // Convert phone to pseudo-email
  const email = `${rawPhone}@mock.com`;

  hideAuthStatus();
  if (authSubmitBtn) {
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = isSignupMode ? 'Signing up...' : 'Logging in...';
  }

  try {
    if (isSignupMode) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
      }
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    // Success! onAuthStateChanged callback will handle the rest.
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

// Make functions globally available for inline onclick handlers
window.handlePhoneAuth = handlePhoneAuth;
window.toggleAuthMode = toggleAuthMode;
