/**
 * Teacher Dashboard - student registration, class filter, results & fees
 */

const API_BASE = 'http://localhost:3000/api';
const TeacherPortal = {
  selectedStudent: null,

  init() {
    if (typeof TeacherAuth !== 'undefined' && !TeacherAuth.requireAuth()) return;
    this.bindEvents();
    this.loadStudents();
  },

  bindEvents() {
    document.getElementById('classFilter').addEventListener('change', () => this.loadStudents());
    document.getElementById('refreshBtn').addEventListener('click', () => this.loadStudents());
    document.getElementById('registerStudentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.registerStudent();
    });
    document.getElementById('addResultForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addResult();
    });
    document.getElementById('addResultForm').querySelector('#resultTotalMarks').addEventListener('input', () => this.updateAutoGrade());
    document.getElementById('addResultForm').querySelector('#resultObtainedMarks').addEventListener('input', () => this.updateAutoGrade());
    document.getElementById('addFeeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addFee();
    });
  },

  updateAutoGrade() {
    const total = parseFloat(document.getElementById('resultTotalMarks').value) || 0;
    const obtained = parseFloat(document.getElementById('resultObtainedMarks').value);
    if (total <= 0 || isNaN(obtained)) {
      document.getElementById('autoPercentage').textContent = '--';
      document.getElementById('autoGrade').textContent = '--';
      document.getElementById('autoPassFail').textContent = '--';
      return;
    }
    const pct = Math.round((obtained / total) * 10000) / 100;
    let grade = 'F';
    if (pct >= 90) grade = 'A+';
    else if (pct >= 80) grade = 'A';
    else if (pct >= 70) grade = 'B';
    else if (pct >= 50) grade = 'C';
    else if (pct >= 30) grade = 'D';
    const pf = pct >= 30 ? 'Pass' : 'Fail';
    document.getElementById('autoPercentage').textContent = pct + '%';
    document.getElementById('autoGrade').textContent = grade;
    document.getElementById('autoPassFail').textContent = pf;
  },

  async loadStudents() {
    const classFilter = document.getElementById('classFilter').value;
    const url = classFilter ? `${API_BASE}/student/list?class=${encodeURIComponent(classFilter)}` : `${API_BASE}/student/list`;
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center">लोड हो रहा है...</td></tr>';
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'लोड नहीं हो पाया');
      const list = json.data || [];
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500">कोई छात्र नहीं मिला। पहले रजिस्टर करें।</td></tr>';
        return;
      }
      tbody.innerHTML = list.map(s => {
        const safeName = String(s.name || '').replace(/"/g, '&quot;');
        return `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-2 text-gray-900">${this.escape(s.name)}</td>
          <td class="px-4 py-2 text-gray-600">${this.escape(s.class)}</td>
          <td class="px-4 py-2 text-gray-600">${this.escape(s.rollNo)}</td>
          <td class="px-4 py-2">${s.hasAccount ? '<span class="text-green-600 font-medium">हाँ</span>' : '<span class="text-orange-600">नहीं</span>'}</td>
          <td class="px-4 py-2">
            <div class="flex gap-2 flex-wrap">
              <button type="button" class="selectStudentBtn bg-teal-600 text-white px-3 py-1 rounded text-sm hover:bg-teal-700" data-id="${s.id}" data-name="${safeName}">
                चुनें
              </button>
              ${s.hasAccount ? `<button type="button" class="resetPasswordBtn bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700" data-id="${s.id}" data-name="${safeName}">पासवर्ड रीसेट</button>` : ''}
              <button type="button" class="deleteStudentBtn bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700" data-id="${s.id}" data-name="${safeName}">
                हटाएं
              </button>
            </div>
          </td>
        </tr>
      `;
      }).join('');
      tbody.querySelectorAll('.selectStudentBtn').forEach(btn => {
        btn.addEventListener('click', () => this.selectStudent(btn.dataset.id, btn.dataset.name));
      });
      tbody.querySelectorAll('.deleteStudentBtn').forEach(btn => {
        btn.addEventListener('click', () => this.deleteStudent(btn.dataset.id, btn.dataset.name));
      });
      tbody.querySelectorAll('.resetPasswordBtn').forEach(btn => {
        btn.addEventListener('click', () => this.resetPassword(btn.dataset.id, btn.dataset.name));
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-red-600">' + this.escape(err.message) + '</td></tr>';
    }
  },

  selectStudent(id, name) {
    this.selectedStudent = { id, name };
    document.getElementById('selectedStudentSection').classList.remove('hidden');
    document.getElementById('selectedStudentTitle').textContent = 'छात्र: ' + name;
    document.getElementById('resultStudentId').value = id;
    document.getElementById('feeStudentId').value = id;
    this.loadStudentResults(id);
    this.loadStudentFees(id);
  },

  async loadStudentResults(studentId) {
    const el = document.getElementById('studentResultsList');
    el.innerHTML = 'लोड हो रहा है...';
    try {
      const res = await fetch(`${API_BASE}/student/${studentId}/results`);
      const json = await res.json();
      const list = (json.data || []);
      if (list.length === 0) {
        el.innerHTML = '<p class="text-gray-500">अभी कोई परिणाम नहीं।</p>';
        return;
      }
      el.innerHTML = list.map(r => `
        <div class="border rounded p-2 bg-gray-50 flex justify-between items-center flex-wrap gap-1">
          <span class="font-medium">${this.escape(r.examName)}</span>
          <span>${r.obtainedMarks != null && r.totalMarks != null ? r.obtainedMarks + '/' + r.totalMarks : '-'}</span>
          ${r.percentage != null ? '<span>' + r.percentage + '%</span>' : ''}
          ${r.grade ? '<span class="font-medium">' + this.escape(r.grade) + '</span>' : ''}
          ${r.passFail ? '<span class="' + (r.passFail === 'pass' ? 'text-green-600' : 'text-red-600') + '">' + (r.passFail === 'pass' ? 'Pass' : 'Fail') + '</span>' : ''}
        </div>
      `).join('');
    } catch (e) {
      el.innerHTML = '<p class="text-red-600">लोड नहीं हो सका।</p>';
    }
  },

  async loadStudentFees(studentId) {
    const el = document.getElementById('studentFeesList');
    el.innerHTML = 'लोड हो रहा है...';
    try {
      const res = await fetch(`${API_BASE}/student/${studentId}/fees`);
      const json = await res.json();
      const list = (json.data || []);
      if (list.length === 0) {
        el.innerHTML = '<p class="text-gray-500">अभी कोई फीस रिकॉर्ड नहीं।</p>';
        return;
      }
      el.innerHTML = list.map(f => {
        const due = (f.amount || 0) - (f.paid || 0);
        return `
        <div class="border rounded p-2 bg-gray-50">
          <span class="font-medium">${this.escape(f.description || 'फीस')}</span>
          <span class="text-gray-600"> कुल: ₹${f.amount} दिया: ₹${f.paid} बाकी: ₹${due}</span>
          <span class="ml-2 px-2 py-0.5 rounded text-xs ${f.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${f.status}</span>
        </div>
      `;
      }).join('');
    } catch (e) {
      el.innerHTML = '<p class="text-red-600">लोड नहीं हो सका।</p>';
    }
  },

  async registerStudent() {
    const name = document.getElementById('regName').value;
    const cls = document.getElementById('regClass').value;
    const rollNo = document.getElementById('regRollNo').value.trim();
    const msgEl = document.getElementById('regMessage');
    msgEl.classList.add('hidden');
    if (!name || !cls || !rollNo) {
      msgEl.textContent = 'नाम, कक्षा और रोल नंबर भरें।';
      msgEl.classList.remove('hidden');
      msgEl.classList.add('text-red-600');
      return;
    }
    try {
      const res = await fetch(API_BASE + '/teacher/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, class: cls, rollNo })
      });
      const data = await res.json();
      if (data.success) {
        msgEl.textContent = data.message || 'रजिस्टर हो गया।';
        msgEl.classList.remove('hidden', 'text-red-600');
        msgEl.classList.add('text-green-600');
        document.getElementById('registerStudentForm').reset();
        this.loadStudents();
      } else {
        msgEl.textContent = data.message || 'त्रुटि।';
        msgEl.classList.remove('hidden');
        msgEl.classList.add('text-red-600');
      }
    } catch (err) {
      msgEl.textContent = 'सर्वर से कनेक्ट नहीं हो पाया।';
      msgEl.classList.remove('hidden');
      msgEl.classList.add('text-red-600');
    }
  },

  async addResult() {
    const studentId = document.getElementById('resultStudentId').value;
    const examName = document.getElementById('resultExamName').value.trim();
    const session = document.getElementById('resultSession').value.trim();
    const totalMarks = document.getElementById('resultTotalMarks').value ? parseFloat(document.getElementById('resultTotalMarks').value) : null;
    const obtainedMarks = document.getElementById('resultObtainedMarks').value ? parseFloat(document.getElementById('resultObtainedMarks').value) : null;
    if (!studentId || !examName) {
      alert('परीक्षा का नाम भरें।');
      return;
    }
    try {
      const res = await fetch(API_BASE + '/student/add-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, examName, session, totalMarks, obtainedMarks })
      });
      const data = await res.json();
      if (data.success) {
        alert('परिणाम जोड़ा गया। प्रतिशत व ग्रेड अपने आप लगे।');
        document.getElementById('addResultForm').reset();
        document.getElementById('autoPercentage').textContent = '--';
        document.getElementById('autoGrade').textContent = '--';
        document.getElementById('autoPassFail').textContent = '--';
        if (this.selectedStudent) this.loadStudentResults(this.selectedStudent.id);
      } else {
        alert(data.message || 'जोड़ नहीं सका।');
      }
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  async addFee() {
    const studentId = document.getElementById('feeStudentId').value;
    const amount = parseFloat(document.getElementById('feeAmount').value) || 0;
    const paid = parseFloat(document.getElementById('feePaid').value) || 0;
    const session = document.getElementById('feeSession').value.trim();
    const description = document.getElementById('feeDescription').value.trim() || 'फीस';
    if (!studentId || amount <= 0) {
      alert('छात्र चुनें और कुल राशि भरें।');
      return;
    }
    try {
      const res = await fetch(API_BASE + '/student/add-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, amount, paid, session, description })
      });
      const data = await res.json();
      if (data.success) {
        alert('फीस रिकॉर्ड जोड़ा गया।');
        document.getElementById('feePaid').value = '0';
        if (this.selectedStudent) this.loadStudentFees(this.selectedStudent.id);
      } else {
        alert(data.message || 'जोड़ नहीं सका।');
      }
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  async deleteStudent(id, name) {
    if (!confirm(`क्या आप ${name} को हटाना चाहते हैं? यह छात्र के सभी रिकॉर्ड (परिणाम, फीस) भी हट जाएंगे। यह कार्रवाई पूर्ववत नहीं हो सकती।`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/teacher/delete-student/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        alert('छात्र हटा दिया गया है।');
        this.loadStudents();
        if (this.selectedStudent && this.selectedStudent.id === id) {
          document.getElementById('selectedStudentSection').classList.add('hidden');
          this.selectedStudent = null;
        }
      } else {
        alert(data.message || 'हटाने में त्रुटि।');
      }
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  async resetPassword(id, name) {
    const newPassword = prompt(`${name} का नया पासवर्ड डालें (कम से कम 6 अक्षर):`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert('पासवर्ड कम से कम 6 अक्षर का होना चाहिए।');
      return;
    }
    const confirmPwd = prompt('पासवर्ड दोबारा डालें:');
    if (newPassword !== confirmPwd) {
      alert('पासवर्ड मेल नहीं खाते।');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/teacher/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert('पासवर्ड बदल दिया गया है।');
      } else {
        alert(data.message || 'पासवर्ड बदलने में त्रुटि।');
      }
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  escape(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TeacherPortal.init());
} else {
  TeacherPortal.init();
}
