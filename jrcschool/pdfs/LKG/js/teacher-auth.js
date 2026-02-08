/**
 * Teacher Authentication - case-sensitive username & password
 * username: teacher
 * password: Jrc@2000
 */

const TeacherAuth = {
  TEACHER_USERNAME: 'teacher',
  TEACHER_PASSWORD: 'Jrc@2000',
  SESSION_KEY: 'jrc_teacher_session',

  init() {
    if (this.isAuthenticated()) {
      if (window.location.pathname.includes('teacher-login')) {
        window.location.href = 'teacher.html';
        return;
      }
      if (window.location.pathname.includes('teacher.html')) {
        this.setupLogoutOnLeave();
      }
    } else {
      if (window.location.pathname.includes('teacher.html') && !window.location.pathname.includes('teacher-login')) {
        window.location.href = 'teacher-login.html';
        return;
      }
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  },

  setupLogoutOnLeave() {
    window.addEventListener('beforeunload', () => this.logout(true));
  },

  handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) errorMessage.classList.add('hidden');

    // Case-sensitive comparison
    if (username === this.TEACHER_USERNAME && password === this.TEACHER_PASSWORD) {
      const session = {
        username,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      };
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      window.location.href = 'teacher.html';
    } else {
      if (errorMessage) errorMessage.classList.remove('hidden');
      const pwEl = document.getElementById('password');
      if (pwEl) { pwEl.value = ''; pwEl.focus(); }
    }
  },

  isAuthenticated() {
    const sessionStr = localStorage.getItem(this.SESSION_KEY);
    if (!sessionStr) return false;
    try {
      const session = JSON.parse(sessionStr);
      if (new Date(session.expiresAt) < new Date()) {
        localStorage.removeItem(this.SESSION_KEY);
        return false;
      }
      return true;
    } catch (e) {
      localStorage.removeItem(this.SESSION_KEY);
      return false;
    }
  },

  getSession() {
    try {
      return JSON.parse(localStorage.getItem(this.SESSION_KEY) || '');
    } catch (e) { return null; }
  },

  logout(silent = false) {
    localStorage.removeItem(this.SESSION_KEY);
    if (!silent && window.location.pathname.includes('teacher.html')) {
      window.location.href = 'teacher-login.html';
    }
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'teacher-login.html';
      return false;
    }
    return true;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TeacherAuth.init());
} else {
  TeacherAuth.init();
}
window.TeacherAuth = TeacherAuth;
