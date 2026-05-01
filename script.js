const api = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const showLoader = () => $("#loader")?.classList.add("show");
const hideLoader = () => $("#loader")?.classList.remove("show");

const showNotice = (element, message, type = "success") => {
  element.textContent = message;
  element.classList.toggle("error", type === "error");
  element.classList.add("show");
};

const openModal = (modal) => {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
};

const closeModals = () => {
  $$(".modal").forEach((modal) => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  });
};

const getSessionUser = () => JSON.parse(sessionStorage.getItem("amsUser") || "null");
const setSessionUser = (user) => sessionStorage.setItem("amsUser", JSON.stringify(user));

const chatAnswers = {
  dashboard: "Dashboard cards show overall attendance, classes attended, present-today status, pending leaves, and subject-wise progress.",
  rules: "Attendance below 75% is marked Defaulter. Attendance at or above 75% is Good Standing.",
  leave: "Open Apply Leave, enter reason, start and end date, number of days, select teachers or subjects, and submit.",
  login: "Check your ID and password. New users must register first. Faculty use Faculty ID, students use Student ID, and HOD can use HOD001.",
  contact: "Contact support at attendance.office@college.edu or call the attendance department office."
};

const addBubble = (text, type = "bot") => {
  const windowEl = $("#chatWindow");
  if (!windowEl) return;
  const bubble = document.createElement("div");
  bubble.className = `bubble ${type}`;
  bubble.textContent = text;
  windowEl.appendChild(bubble);
  windowEl.scrollTop = windowEl.scrollHeight;
};

const addTypingReply = (text) => {
  const windowEl = $("#chatWindow");
  const typing = document.createElement("div");
  typing.className = "bubble typing";
  windowEl.appendChild(typing);
  windowEl.scrollTop = windowEl.scrollHeight;
  setTimeout(() => {
    typing.remove();
    addBubble(text);
  }, 650);
};

const setupIndex = () => {
  addBubble("Hello! I can help you with login, attendance, leave requests, and reports.");

  $("#openRegister").addEventListener("click", () => openModal($("#registerModal")));
  $("#closeRegister").addEventListener("click", closeModals);

  $("#registerRole").addEventListener("change", () => {
    const role = $("#registerRole").value;
    $(".student-only").classList.toggle("hidden", role !== "student");
    $(".faculty-only").classList.toggle("hidden", role !== "faculty");
    $("#idLabel").textContent = role === "faculty" ? "Faculty ID" : "Student ID";
    $("#regYear").required = role === "student";
    $("#regSubject").required = role === "faculty";
  });

  $("#registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      role: $("#registerRole").value,
      name: $("#regName").value.trim(),
      email: $("#regEmail").value.trim(),
      phone: $("#regPhone").value.trim(),
      id: $("#regId").value.trim(),
      year: $("#regYear").value,
      department: $("#regDepartment").value,
      subject: $("#regSubject").value,
      password: $("#regPassword").value,
      confirmPassword: $("#regConfirmPassword").value
    };

    if (!/^[0-9]{10}$/.test(payload.phone)) {
      showNotice($("#registerNotice"), "Phone number must be exactly 10 digits.", "error");
      return;
    }

    if (payload.password !== payload.confirmPassword) {
      showNotice($("#registerNotice"), "Password and confirm password must match.", "error");
      return;
    }

    try {
      showLoader();
      await api("/api/register", { method: "POST", body: JSON.stringify(payload) });
      showNotice($("#registerNotice"), "Registration successful. You can now login.");
      $("#registerForm").reset();
      $("#registerRole").dispatchEvent(new Event("change"));
    } catch (error) {
      showNotice($("#registerNotice"), error.message, "error");
    } finally {
      hideLoader();
    }
  });

  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      showLoader();
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          id: $("#loginId").value.trim(),
          password: $("#loginPassword").value
        })
      });
      showNotice($("#loginNotice"), `Login successful. Welcome, ${data.user.name}`);
      setSessionUser(data.user);
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 450);
    } catch (error) {
      showNotice($("#loginNotice"), error.message, "error");
    } finally {
      hideLoader();
    }
  });

  $$("[data-chat]").forEach((button) => {
    button.addEventListener("click", () => {
      addBubble(button.textContent.trim(), "user");
      addTypingReply(chatAnswers[button.dataset.chat]);
    });
  });
};

const statCard = (label, value, detail = "") => `
  <div class="stat-card">
    <span>${label}</span>
    <strong>${value}</strong>
    <p>${detail}</p>
  </div>
`;

const subjectCard = (subject) => `
  <article class="subject-card" data-subject-id="${subject.id}">
    <div class="subject-top">
      <div>
        <h3>${subject.name}</h3>
        <p>${subject.attended}/${subject.total} lectures attended · ${subject.teacher}</p>
      </div>
      <strong>${subject.percentage}%</strong>
    </div>
    <div class="progress-track"><div class="progress-bar" style="width:${subject.percentage}%"></div></div>
  </article>
`;

const tableRow = (subject) => `
  <div class="table-row">
    <div><strong>${subject.name}</strong><span>${subject.teacher}</span></div>
    <div><strong>${subject.percentage}%</strong><span>Attendance</span></div>
    <div><strong>${subject.total}</strong><span>Total</span></div>
    <div><strong>${subject.attended}</strong><span>Attended</span></div>
    <div><strong>${subject.total - subject.attended}</strong><span>Absent</span></div>
  </div>
`;

let dashboardData = null;

const drawLineChart = (canvas, points, color = "#0b5cff") => {
  if (!canvas || !points?.length) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width = canvas.clientWidth * devicePixelRatio;
  const height = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const w = width / devicePixelRatio;
  const h = height / devicePixelRatio;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(92,114,147,.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = 24 + i * ((h - 48) / 3);
    ctx.beginPath();
    ctx.moveTo(28, y);
    ctx.lineTo(w - 18, y);
    ctx.stroke();
  }
  const step = (w - 56) / Math.max(points.length - 1, 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = 28 + index * step;
    const y = h - 24 - (point.value / 100) * (h - 52);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  points.forEach((point, index) => {
    const x = 28 + index * step;
    const y = h - 24 - (point.value / 100) * (h - 52);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6c7890";
    ctx.font = "12px system-ui";
    ctx.fillText(point.day || point.name.slice(0, 4), x - 12, h - 6);
  });
};

const drawBarChart = (canvas, items) => {
  if (!canvas || !items?.length) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width = canvas.clientWidth * devicePixelRatio;
  const height = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const w = width / devicePixelRatio;
  const h = height / devicePixelRatio;
  ctx.clearRect(0, 0, w, h);
  const barWidth = (w - 40) / items.length - 12;
  items.forEach((item, index) => {
    const barHeight = (item.percentage / 100) * (h - 48);
    const x = 24 + index * (barWidth + 12);
    const y = h - 28 - barHeight;
    const gradient = ctx.createLinearGradient(0, y, 0, h);
    gradient.addColorStop(0, "#19c7ff");
    gradient.addColorStop(1, "#0b5cff");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "#102033";
    ctx.font = "12px system-ui";
    ctx.fillText(`${item.percentage}%`, x, y - 6);
    ctx.fillStyle = "#6c7890";
    ctx.fillText(item.name.slice(0, 4), x, h - 8);
  });
};

const renderNotifications = (notifications = []) => {
  $("#notificationCount").textContent = notifications.length;
  $("#notificationPanel").innerHTML = notifications.length
    ? notifications.map((item) => `<div class="notification-item ${item.type === "warning" ? "warning" : ""}">${item.text}</div>`).join("")
    : `<div class="notification-item">No new notifications.</div>`;
};

const renderDashboardChat = (message, type = "bot") => {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${type}`;
  bubble.textContent = message;
  $("#dashboardChat")?.appendChild(bubble);
};

const answerDashboardQuestion = (question) => {
  const q = question.toLowerCase();
  const aliases = {
    dbms: "database management",
    ds: "data structures",
    cn: "computer networks",
    os: "operating systems"
  };
  const normalizedQuestion = Object.entries(aliases).reduce((text, [short, full]) => text.replace(short, full), q);
  const subject = dashboardData?.subjects?.find((item) => normalizedQuestion.includes(item.name.toLowerCase()) || normalizedQuestion.includes(item.name.split(" ")[0].toLowerCase()));
  if (subject) return `Your attendance in ${subject.name} is ${subject.percentage}% (${subject.attended}/${subject.total}).`;
  if (q.includes("defaulter")) return dashboardData.summary.overall < 75 ? "You are currently marked as Defaulter." : "You are in Good Standing.";
  if (q.includes("leave")) return `You have ${dashboardData.summary.pendingLeaves} pending leave request(s).`;
  if (q.includes("rank")) return `Your current attendance rank is ${dashboardData.rank}.`;
  return "Try asking about a subject, your rank, defaulter status, or leave requests.";
};

const loadDashboard = async () => {
  const user = getSessionUser();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  showLoader();
  dashboardData = await api(`/api/dashboard/${user.id}`);
  hideLoader();

  $("#avatar").textContent = user.name.charAt(0).toUpperCase();
  $("#dashboardTitle").textContent = `${user.name}'s Dashboard`;
  $("#dashboardSubtitle").textContent = `${user.role.toUpperCase()} · ${user.department || "College Portal"}`;

  $$(".role-view").forEach((view) => view.classList.add("hidden"));
  if (user.role === "student") renderStudent(dashboardData);
  if (user.role === "faculty") renderFaculty(dashboardData);
  if (user.role === "hod") renderHod(dashboardData);
};

const renderStudent = (data) => {
  $("#studentView").classList.remove("hidden");
  const s = data.summary;
  $("#summaryGrid").innerHTML = [
    statCard("Overall Attendance", `${s.overall}%`, s.overall < 75 ? "Defaulter risk" : "Good academic standing"),
    statCard("Classes Attended", s.attended, `Out of ${s.total} classes`),
    statCard("Present Today", s.presentToday ? "Yes" : "No", "Latest marked status"),
    statCard("Pending Leaves", s.pendingLeaves, "Waiting for faculty action")
  ].join("");

  $("#standingPill").textContent = s.overall < 75 ? "Defaulter" : "Good Standing";
  $("#standingPill").classList.toggle("bad", s.overall < 75);
  $("#subjectList").innerHTML = data.subjects.map(subjectCard).join("");
  renderNotifications(data.notifications);
  $("#predictionPanel").innerHTML = `
    <div class="prediction-card">
      <span>${data.prediction.subject}</span>
      <strong>${data.prediction.afterMiss}%</strong>
      <p>${data.prediction.text}</p>
    </div>
  `;
  $("#leaderboardList").innerHTML = data.leaderboard.slice(0, 5).map((student) => `
    <div class="leader-row ${student.current ? "current" : ""}">
      <strong>#${student.rank}</strong>
      <span>${student.name}</span>
      <b>${student.percentage}%</b>
    </div>
  `).join("") + `<div class="leader-row current"><strong>Your rank</strong><span>${data.rank}</span><b>${s.overall}%</b></div>`;
  $("#attendanceCalendar").innerHTML = data.calendar.map((day) => `
    <div class="calendar-day ${day.status}">
      <strong>${day.day}</strong><br />
      <span>${day.label}</span>
    </div>
  `).join("");
  $("#studentAnnouncements").innerHTML = data.announcements.length
    ? data.announcements.map((item) => `<div class="announcement"><strong>${item.teacherName}</strong><p>${item.message}</p></div>`).join("")
    : `<div class="announcement"><strong>No announcements</strong><p>Teacher notices will appear here.</p></div>`;
  $("#attendanceBadges").innerHTML = `
    <span class="badge">${data.gamification.perfectBadge ? "Perfect Attendance Badge" : data.gamification.badge}</span>
    <span class="badge">Consistency streak: ${data.gamification.streak} days</span>
    <span class="badge">Summary badge: ${s.overall}%</span>
  `;
  $("#profileName").value = data.user.name || "";
  $("#profileEmail").value = data.user.email || "";
  $("#profilePhone").value = data.user.phone || "";
  $("#profilePreview").src = data.user.profilePhoto || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%23e7f2ff'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' font-size='42' fill='%230b5cff' font-family='Arial'%3EA%3C/text%3E%3C/svg%3E";
  $("#dashboardChat").innerHTML = "";
  renderDashboardChat("Ask me custom questions like: What is my attendance in DBMS?");
  $("#dynamicReplies").innerHTML = data.subjects.slice(0, 3).map((subject) => `<button type="button" data-ask="What is my attendance in ${subject.name}?">${subject.name}</button>`).join("");
  requestAnimationFrame(() => {
    drawLineChart($("#weeklyTrendChart"), data.weeklyTrend);
    drawBarChart($("#subjectComparisonChart"), data.subjects);
  });
};

const renderFaculty = (data) => {
  $("#facultyView").classList.remove("hidden");
  $("#summaryGrid").innerHTML = [
    statCard("Classes Conducted", data.totalClasses, "Total recorded classes"),
    statCard("Average Attendance", `${data.average}%`, "Class average"),
    statCard("Defaulters", data.defaulters.length, "Below 75%"),
    statCard("Pending Leaves", data.pendingLeaves, "Awaiting action"),
    statCard("Students", data.students, "Department students"),
    statCard("Average Attendance", `${data.average}%`, "Across available subjects")
  ].join("");
  $("#facultySubjects").innerHTML = data.subjects.map(subjectCard).join("");
  $("#facultyLeaves").innerHTML = data.leaves.length
    ? data.leaves.map((leave) => `
      <article class="request-card">
        <h3>${leave.studentName}</h3>
        <p>${leave.reason}</p>
        <p>${leave.startDate} to ${leave.endDate} · ${leave.days} days · ${leave.status}</p>
        ${leave.status === "Pending" ? `
          <div class="top-actions">
            <input data-leave-remark="${leave.id}" placeholder="Approval / rejection remark" />
            <button class="mini-button" data-leave-action="Approved" data-leave-id="${leave.id}">Approve</button>
            <button class="warning-button" data-leave-action="Rejected" data-leave-id="${leave.id}">Reject</button>
          </div>
        ` : ""}
      </article>
    `).join("")
    : `<article class="request-card"><h3>No leave requests</h3><p>Student applications will appear here.</p></article>`;
  $("#markSubject").innerHTML = data.subjects.map((subject) => `<option value="${subject.id}">${subject.name}</option>`).join("");
  $("#markDate").valueAsDate = new Date();
  renderMarkStudentList();
  $("#remarkStudent").innerHTML = data.studentRows.map((student) => `<option value="${student.id}">${student.name} (${student.percentage}%)</option>`).join("");
  $("#defaulterList").innerHTML = data.defaulters.length
    ? data.defaulters.map((student) => `<div class="attendance-row"><strong>${student.name}</strong><span>${student.percentage}%</span><button class="warning-button" data-warning="${student.id}">Send warning</button></div>`).join("")
    : `<div class="announcement"><strong>No defaulters</strong><p>All students are currently above 75%.</p></div>`;
  requestAnimationFrame(() => drawLineChart($("#dailyTrendChart"), data.dailyTrend, "#10a66a"));
};

const renderMarkStudentList = () => {
  if (!dashboardData?.studentRows || !$("#markStudentList")) return;
  const search = ($("#studentSearch")?.value || "").toLowerCase();
  const filter = $("#studentFilter")?.value || "all";
  const rows = dashboardData.studentRows.filter((student) => {
    const matches = student.name.toLowerCase().includes(search) || student.rollNo.toLowerCase().includes(search);
    const filterMatch = filter === "defaulters" ? student.percentage < 75 : filter === "high" ? student.percentage >= 90 : true;
    return matches && filterMatch;
  });
  $("#markStudentList").innerHTML = rows.map((student) => `
    <div class="attendance-row">
      <strong>${student.name}<span>${student.rollNo} · ${student.percentage}%</span></strong>
      <div class="attendance-choice" data-mark-student="${student.id}">
        <button class="selected" type="button" data-status-choice="Present">Present</button>
        <button type="button" data-status-choice="Absent">Absent</button>
        <button type="button" data-status-choice="Leave">Leave</button>
      </div>
      <input data-mark-note="${student.id}" placeholder="Remark" />
      <span>${student.percentage < 75 ? "Defaulter" : "OK"}</span>
    </div>
  `).join("");
};

const renderHod = (data) => {
  $("#hodView").classList.remove("hidden");
  $("#summaryGrid").innerHTML = [
    statCard("Students", data.students, "Registered accounts"),
    statCard("Faculty", data.faculty, "Registered faculty"),
    statCard("Leaves", data.leaves, "Total requests"),
    statCard("Attendance Avg", `${data.average}%`, "College overview")
  ].join("");
  $("#hodOverview").innerHTML = data.subjects.map(tableRow).join("");
};

const setupDashboard = () => {
  loadDashboard().catch((error) => {
    hideLoader();
    alert(error.message);
  });

  $("#logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("amsUser");
    window.location.href = "index.html";
  });

  $("#refreshDashboard").addEventListener("click", () => loadDashboard());
  $$("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModals));
  $("#notificationBell").addEventListener("click", () => $("#notificationPanel").classList.toggle("hidden"));

  $("#subjectList")?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-subject-id]");
    if (!card) return;
    const subject = dashboardData.subjects.find((item) => item.id === card.dataset.subjectId);
    $("#subjectModalTitle").textContent = subject.name;
    $("#subjectModalMeta").textContent = `${subject.teacher} · ${subject.percentage}% attendance`;
    $("#subjectDetails").innerHTML = `
      <div class="summary-grid">
        ${statCard("Total lectures", subject.total, "Scheduled classes")}
        ${statCard("Attended", subject.attended, "Present classes")}
        ${statCard("Absent", subject.total - subject.attended, "Missed classes")}
        ${statCard("Status", subject.percentage < 75 ? "Defaulter" : "Good Standing", "75% rule")}
      </div>
    `;
    openModal($("#subjectModal"));
  });

  $("#viewReportButton")?.addEventListener("click", () => {
    $("#fullReport").innerHTML = dashboardData.subjects.map(tableRow).join("");
    openModal($("#reportModal"));
  });

  $("#applyLeaveButton")?.addEventListener("click", () => {
    const targets = dashboardData.subjects.map((subject) => `<option value="${subject.id}">${subject.name} - ${subject.teacher}</option>`);
    $("#leaveTargets").innerHTML = targets.join("");
    $("#leaveForm").reset();
    $("#leaveNotice").classList.remove("show", "error");
    openModal($("#leaveModal"));
  });

  $("#leaveForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = getSessionUser();
    const targets = Array.from($("#leaveTargets").selectedOptions).map((option) => option.value);
    try {
      showLoader();
      await api("/api/leaves", {
        method: "POST",
        body: JSON.stringify({
          studentId: user.id,
          reason: $("#leaveReason").value.trim(),
          startDate: $("#leaveStart").value,
          endDate: $("#leaveEnd").value,
          days: $("#leaveDays").value,
          targets
        })
      });
      showNotice($("#leaveNotice"), "Leave request submitted successfully.");
      await loadDashboard();
    } catch (error) {
      showNotice($("#leaveNotice"), error.message, "error");
    } finally {
      hideLoader();
    }
  });

  $("#profilePhoto")?.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      $("#profilePreview").src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  $("#profileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = getSessionUser();
    try {
      showLoader();
      const data = await api(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: $("#profileName").value.trim(),
          email: $("#profileEmail").value.trim(),
          phone: $("#profilePhone").value.trim(),
          profilePhoto: $("#profilePreview").src
        })
      });
      setSessionUser(data.user);
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    } finally {
      hideLoader();
    }
  });

  $("#dashboardChatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = $("#dashboardChatInput").value.trim();
    if (!question) return;
    renderDashboardChat(question, "user");
    renderDashboardChat(answerDashboardQuestion(question));
    $("#dashboardChatInput").value = "";
  });

  $("#dynamicReplies")?.addEventListener("click", (event) => {
    const question = event.target.dataset.ask;
    if (!question) return;
    renderDashboardChat(question, "user");
    renderDashboardChat(answerDashboardQuestion(question));
  });

  $("#studentSearch")?.addEventListener("input", renderMarkStudentList);
  $("#studentFilter")?.addEventListener("change", renderMarkStudentList);
  $("#markAllPresent")?.addEventListener("click", () => {
    $$("[data-mark-student]").forEach((group) => {
      group.querySelectorAll("[data-status-choice]").forEach((button) => {
        button.classList.toggle("selected", button.dataset.statusChoice === "Present");
      });
    });
  });

  $("#markStudentList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-status-choice]");
    if (!button) return;
    const group = button.closest("[data-mark-student]");
    group.querySelectorAll("[data-status-choice]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
  });

  $("#markAttendanceForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const rows = $$("[data-mark-student]").map((group) => ({
      studentId: group.dataset.markStudent,
      status: group.querySelector("[data-status-choice].selected")?.dataset.statusChoice || "Absent"
    }));
    try {
      showLoader();
      await api("/api/attendance/mark", {
        method: "POST",
        body: JSON.stringify({ subjectId: $("#markSubject").value, date: $("#markDate").value, rows })
      });
      showNotice($("#markNotice"), "Attendance saved successfully.");
      await loadDashboard();
    } catch (error) {
      showNotice($("#markNotice"), error.message, "error");
    } finally {
      hideLoader();
    }
  });

  $("#facultyLeaves")?.addEventListener("click", async (event) => {
    const leaveId = event.target.dataset.leaveId;
    const status = event.target.dataset.leaveAction;
    if (!leaveId || !status) return;
    const remark = document.querySelector(`[data-leave-remark="${leaveId}"]`)?.value || "";
    try {
      showLoader();
      await api(`/api/leaves/${leaveId}/status`, { method: "POST", body: JSON.stringify({ status, remark }) });
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    } finally {
      hideLoader();
    }
  });

  $("#remarkForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = getSessionUser();
    try {
      showLoader();
      await api("/api/remarks", { method: "POST", body: JSON.stringify({ teacherId: user.id, studentId: $("#remarkStudent").value, text: $("#remarkText").value.trim() }) });
      showNotice($("#remarkNotice"), "Remark added successfully.");
      $("#remarkText").value = "";
    } catch (error) {
      showNotice($("#remarkNotice"), error.message, "error");
    } finally {
      hideLoader();
    }
  });

  $("#announcementForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = getSessionUser();
    try {
      showLoader();
      await api("/api/announcements", { method: "POST", body: JSON.stringify({ teacherId: user.id, message: $("#announcementText").value.trim() }) });
      showNotice($("#announcementNotice"), "Announcement posted.");
      $("#announcementText").value = "";
    } catch (error) {
      showNotice($("#announcementNotice"), error.message, "error");
    } finally {
      hideLoader();
    }
  });

  $("#defaulterList")?.addEventListener("click", (event) => {
    if (event.target.dataset.warning) {
      event.target.textContent = "Warning sent";
    }
  });

  $("#exportCsvButton")?.addEventListener("click", () => {
    window.location.href = "/api/export.csv";
  });
};

document.addEventListener("DOMContentLoaded", () => {
  if ($("#loginForm")) setupIndex();
  if ($("#dashboardTitle")) setupDashboard();
});
