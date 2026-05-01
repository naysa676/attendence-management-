const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const dataPath = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(__dirname));

const seed = {
  users: [
    {
      id: "HOD001",
      role: "hod",
      name: "HOD Admin",
      email: "hod@college.edu",
      phone: "9999999999",
      department: "Administration",
      password: "1234"
    },
    {
      id: "F100",
      role: "faculty",
      name: "Prof. Meera Shah",
      email: "meera@college.edu",
      phone: "9876543210",
      department: "Comps",
      subject: "Data Structures",
      password: "1234"
    },
    {
      id: "S100",
      role: "student",
      name: "Aarav Sharma",
      email: "aarav@college.edu",
      phone: "9876501234",
      department: "Comps",
      year: "SE",
      password: "1234"
    },
    {
      id: "S101",
      role: "student",
      name: "Diya Mehta",
      email: "diya@college.edu",
      phone: "9876502234",
      department: "Comps",
      year: "SE",
      password: "1234"
    },
    {
      id: "S102",
      role: "student",
      name: "Rohan Patil",
      email: "rohan@college.edu",
      phone: "9876503234",
      department: "Comps",
      year: "SE",
      password: "1234"
    }
  ],
  subjects: [
    { id: "SUB1", name: "Data Structures", teacher: "Prof. Meera Shah", teacherId: "F100", department: "Comps", year: "SE", remarks: "Consistent performance." },
    { id: "SUB2", name: "Database Management", teacher: "Prof. K. Rao", teacherId: "F101", department: "Comps", year: "SE", remarks: "Needs stronger lab attendance." },
    { id: "SUB3", name: "Computer Networks", teacher: "Prof. S. Iyer", teacherId: "F102", department: "Comps", year: "SE", remarks: "Good participation." },
    { id: "SUB4", name: "Engineering Mathematics", teacher: "Prof. N. Kulkarni", teacherId: "F103", department: "CSE", year: "FE", remarks: "Maintain regularity." },
    { id: "SUB5", name: "Operating Systems", teacher: "Prof. A. Khan", teacherId: "F104", department: "ECS", year: "TE", remarks: "Practical work pending." },
    { id: "SUB6", name: "Machine Design", teacher: "Prof. D. Patil", teacherId: "F105", department: "Mech", year: "BE", remarks: "Strong attendance." }
  ],
  attendance: [
    { studentId: "S100", subjectId: "SUB1", total: 24, attended: 22, presentToday: true },
    { studentId: "S100", subjectId: "SUB2", total: 20, attended: 15, presentToday: true },
    { studentId: "S100", subjectId: "SUB3", total: 18, attended: 16, presentToday: true },
    { studentId: "S101", subjectId: "SUB1", total: 24, attended: 24, presentToday: true },
    { studentId: "S101", subjectId: "SUB2", total: 20, attended: 18, presentToday: true },
    { studentId: "S101", subjectId: "SUB3", total: 18, attended: 17, presentToday: true },
    { studentId: "S102", subjectId: "SUB1", total: 24, attended: 16, presentToday: false },
    { studentId: "S102", subjectId: "SUB2", total: 20, attended: 13, presentToday: false },
    { studentId: "S102", subjectId: "SUB3", total: 18, attended: 12, presentToday: true }
  ],
  leaves: [],
  remarks: [
    { studentId: "S100", teacherId: "F100", text: "Regular and consistent" }
  ],
  announcements: [
    { id: "ANN1", teacherId: "F100", teacherName: "Prof. Meera Shah", department: "Comps", message: "DBMS practical attendance review this Friday.", createdAt: new Date().toISOString() }
  ]
};

const readData = () => {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(seed, null, 2));
  }
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
};

const writeData = (data) => {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

const publicUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

const required = (fields, body) => fields.every((field) => String(body[field] || "").trim());

const percentage = (attended, total) => total ? Math.round((attended / total) * 100) : 0;

const ensureArrays = (data) => {
  data.remarks ||= [];
  data.announcements ||= [];
  data.leaves ||= [];
  return data;
};

const getAttendance = (data, studentId, subjectId) => {
  return data.attendance.find((item) => item.studentId === studentId && item.subjectId === subjectId);
};

const studentSubjects = (data, student) => {
  const subjects = data.subjects.filter((subject) => subject.department === student.department && subject.year === student.year);
  return subjects.map((subject) => {
    const row = data.attendance.find((item) => item.studentId === student.id && item.subjectId === subject.id) || {
      total: 18,
      attended: Math.max(12, Math.floor(18 * 0.78)),
      presentToday: false
    };
    return {
      ...subject,
      total: row.total,
      attended: row.attended,
      presentToday: row.presentToday,
      percentage: percentage(row.attended, row.total)
    };
  });
};

const buildLeaderboard = (data, department, year, currentId) => {
  return data.users
    .filter((user) => user.role === "student" && user.department === department && user.year === year)
    .map((student) => {
      const subjects = studentSubjects(data, student);
      const total = subjects.reduce((sum, subject) => sum + subject.total, 0);
      const attended = subjects.reduce((sum, subject) => sum + subject.attended, 0);
      return { id: student.id, name: student.name, percentage: percentage(attended, total), current: student.id === currentId };
    })
    .sort((a, b) => b.percentage - a.percentage)
    .map((student, index) => ({ ...student, rank: index + 1 }));
};

const buildCalendar = (subjects, leaves) => {
  const statuses = ["present", "present", "absent", "present", "leave", "present", "present", "absent", "present", "present", "leave", "present", "present", "present"];
  return statuses.map((status, index) => ({
    day: index + 1,
    status: leaves.length && index === 4 ? "leave" : status,
    label: status === "present" ? "Present" : status === "leave" ? "Leave" : "Absent",
    subject: subjects[index % Math.max(subjects.length, 1)]?.name || "Class"
  }));
};

const buildWeeklyTrend = (overall) => {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => ({
    day,
    value: Math.max(55, Math.min(100, overall - 7 + index * 3))
  }));
};

app.post("/api/register", (req, res) => {
  const data = readData();
  const body = req.body;
  const baseFields = ["role", "name", "email", "phone", "id", "department", "password", "confirmPassword"];

  if (!required(baseFields, body)) {
    return res.status(400).json({ message: "Required fields cannot be empty." });
  }

  if (!/^[0-9]{10}$/.test(body.phone)) {
    return res.status(400).json({ message: "Phone number must be exactly 10 digits." });
  }

  if (body.password !== body.confirmPassword) {
    return res.status(400).json({ message: "Password match required." });
  }

  if (body.role === "student" && !body.year) {
    return res.status(400).json({ message: "Academic year is required for students." });
  }

  if (body.role === "faculty" && !body.subject) {
    return res.status(400).json({ message: "Subject is required for faculty." });
  }

  if (data.users.some((user) => user.id.toLowerCase() === body.id.toLowerCase())) {
    return res.status(409).json({ message: "This ID is already registered." });
  }

  const user = {
    id: body.id,
    role: body.role,
    name: body.name,
    email: body.email,
    phone: body.phone,
    department: body.department,
    year: body.role === "student" ? body.year : "",
    subject: body.role === "faculty" ? body.subject : "",
    password: body.password
  };

  data.users.push(user);

  if (user.role === "faculty" && !data.subjects.some((subject) => subject.teacherId === user.id && subject.name === user.subject)) {
    data.subjects.push({
      id: `SUB${Date.now()}`,
      name: user.subject,
      teacher: user.name,
      teacherId: user.id,
      department: user.department,
      year: "SE",
      remarks: "Faculty-created subject."
    });
  }

  writeData(data);
  res.json({ message: "Registration successful. You can now login.", user: publicUser(user) });
});

app.post("/api/login", (req, res) => {
  const data = readData();
  const { id, password } = req.body;
  const user = data.users.find((item) => item.id.toLowerCase() === String(id || "").toLowerCase() && item.password === password);

  if (!user) {
    return res.status(401).json({ message: "Invalid ID or password. Please register first if you are a new user." });
  }

  res.json({ message: `Login successful. Welcome, ${user.name}`, user: publicUser(user) });
});

app.get("/api/dashboard/:id", (req, res) => {
  const data = ensureArrays(readData());
  const user = data.users.find((item) => item.id === req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (user.role === "student") {
    const subjects = studentSubjects(data, user);
    const total = subjects.reduce((sum, subject) => sum + subject.total, 0);
    const attended = subjects.reduce((sum, subject) => sum + subject.attended, 0);
    const pendingLeaves = data.leaves.filter((leave) => leave.studentId === user.id && leave.status === "Pending").length;
    const approvedLeaves = data.leaves.filter((leave) => leave.studentId === user.id && leave.status === "Approved").length;
    const overall = percentage(attended, total);
    const leaderboard = buildLeaderboard(data, user.department, user.year, user.id);
    const rank = leaderboard.find((student) => student.id === user.id)?.rank || "-";
    const predictionSubject = subjects.slice().sort((a, b) => a.percentage - b.percentage)[0];
    const predicted = predictionSubject ? percentage(predictionSubject.attended, predictionSubject.total + 1) : overall;
    const notifications = [
      ...subjects.filter((subject) => subject.percentage < 75).map((subject) => ({ type: "warning", text: `Low attendance in ${subject.name}` })),
      ...data.leaves.filter((leave) => leave.studentId === user.id && leave.status === "Approved").map(() => ({ type: "success", text: "Leave approved" }))
    ];

    return res.json({
      user: publicUser(user),
      subjects,
      leaderboard,
      rank,
      notifications,
      calendar: buildCalendar(subjects, data.leaves.filter((leave) => leave.studentId === user.id)),
      weeklyTrend: buildWeeklyTrend(overall),
      announcements: data.announcements.filter((item) => item.department === user.department),
      remarks: data.remarks.filter((item) => item.studentId === user.id),
      gamification: {
        perfectBadge: subjects.some((subject) => subject.percentage === 100),
        streak: Math.max(3, Math.round(overall / 12)),
        badge: overall >= 90 ? "Perfect Attendance Badge" : overall >= 75 ? "Consistency Badge" : "Recovery Mode"
      },
      prediction: {
        subject: predictionSubject?.name || "Attendance",
        current: predictionSubject?.percentage || overall,
        afterMiss: predicted,
        text: predictionSubject ? `If you miss next ${predictionSubject.name} class, attendance will drop to ${predicted}%.` : "Not enough data for prediction."
      },
      summary: {
        total,
        attended,
        overall,
        presentToday: subjects.some((subject) => subject.presentToday),
        pendingLeaves,
        approvedLeaves
      }
    });
  }

  if (user.role === "faculty") {
    const subjects = data.subjects.filter((subject) => subject.teacherId === user.id || subject.teacher === user.name);
    const facultyLeaves = data.leaves.filter((leave) => leave.targets.some((target) => target.teacherId === user.id));
    const students = data.users.filter((item) => item.role === "student" && item.department === user.department);
    const enrichedSubjects = subjects.map((subject) => {
      const rows = data.attendance.filter((row) => row.subjectId === subject.id);
      const total = rows.reduce((sum, row) => sum + row.total, 0) || 20;
      const attended = rows.reduce((sum, row) => sum + row.attended, 0) || 16;
      return { ...subject, total, attended, percentage: percentage(attended, total) };
    });
    const studentRows = students.map((student) => {
      const subject = subjects[0] || data.subjects.find((item) => item.department === user.department);
      const row = subject ? getAttendance(data, student.id, subject.id) : null;
      const total = row?.total || 18;
      const attended = row?.attended || 13;
      return { id: student.id, name: student.name, rollNo: student.id, percentage: percentage(attended, total), status: "Present" };
    });
    const defaulters = studentRows.filter((student) => student.percentage < 75);
    const pendingLeaves = facultyLeaves.filter((leave) => leave.status === "Pending");

    return res.json({
      user: publicUser(user),
      subject: user.subject,
      students: students.length,
      leaves: facultyLeaves,
      pendingLeaves: pendingLeaves.length,
      defaulters,
      studentRows,
      dailyTrend: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => ({ day, value: 72 + index * 3 })),
      totalClasses: data.attendance.filter((row) => subjects.some((subject) => subject.id === row.subjectId)).reduce((sum, row) => sum + row.total, 0),
      subjects: enrichedSubjects,
      average: percentage(enrichedSubjects.reduce((sum, item) => sum + item.attended, 0), enrichedSubjects.reduce((sum, item) => sum + item.total, 0))
    });
  }

  const allSubjects = data.subjects.map((subject) => {
    const rows = data.attendance.filter((row) => row.subjectId === subject.id);
    const total = rows.reduce((sum, row) => sum + row.total, 0) || 20;
    const attended = rows.reduce((sum, row) => sum + row.attended, 0) || 15;
    return { ...subject, total, attended, percentage: percentage(attended, total) };
  });

  res.json({
    user: publicUser(user),
    students: data.users.filter((item) => item.role === "student").length,
    faculty: data.users.filter((item) => item.role === "faculty").length,
    leaves: data.leaves.length,
    subjects: allSubjects,
    average: percentage(allSubjects.reduce((sum, item) => sum + item.attended, 0), allSubjects.reduce((sum, item) => sum + item.total, 0))
  });
});

app.get("/api/attendance/:studentId", (req, res) => {
  const data = readData();
  const student = data.users.find((user) => user.id === req.params.studentId && user.role === "student");

  if (!student) {
    return res.status(404).json({ message: "Student not found." });
  }

  res.json({ subjects: studentSubjects(data, student) });
});

app.post("/api/attendance", (req, res) => {
  const data = readData();
  const { studentId, subjectId, total, attended, presentToday } = req.body;

  if (!studentId || !subjectId) {
    return res.status(400).json({ message: "Student and subject are required." });
  }

  const existing = data.attendance.find((row) => row.studentId === studentId && row.subjectId === subjectId);
  if (existing) {
    existing.total = Number(total);
    existing.attended = Number(attended);
    existing.presentToday = Boolean(presentToday);
  } else {
    data.attendance.push({ studentId, subjectId, total: Number(total), attended: Number(attended), presentToday: Boolean(presentToday) });
  }

  writeData(data);
  res.json({ message: "Attendance saved." });
});

app.post("/api/attendance/mark", (req, res) => {
  const data = ensureArrays(readData());
  const { subjectId, rows } = req.body;

  if (!subjectId || !Array.isArray(rows)) {
    return res.status(400).json({ message: "Subject and attendance rows are required." });
  }

  rows.forEach((student) => {
    const existing = data.attendance.find((row) => row.studentId === student.studentId && row.subjectId === subjectId);
    if (existing) {
      existing.total += 1;
      existing.attended += student.status === "Present" ? 1 : 0;
      existing.presentToday = student.status === "Present";
    } else {
      data.attendance.push({ studentId: student.studentId, subjectId, total: 1, attended: student.status === "Present" ? 1 : 0, presentToday: student.status === "Present" });
    }
  });

  writeData(data);
  res.json({ message: "Attendance marked successfully." });
});

app.post("/api/leaves", (req, res) => {
  const data = readData();
  const { studentId, reason, startDate, endDate, days, targets } = req.body;
  const student = data.users.find((user) => user.id === studentId && user.role === "student");

  if (!student) {
    return res.status(404).json({ message: "Student not found." });
  }

  if (!reason || !startDate || !endDate || !days || !Array.isArray(targets) || !targets.length) {
    return res.status(400).json({ message: "Complete all leave request fields." });
  }

  const selectedTargets = targets.map((subjectId) => {
    const subject = data.subjects.find((item) => item.id === subjectId);
    return {
      subjectId,
      subjectName: subject?.name || "Subject",
      teacherId: subject?.teacherId || "",
      teacherName: subject?.teacher || "Teacher"
    };
  });

  const leave = {
    id: `LEAVE${Date.now()}`,
    studentId,
    studentName: student.name,
    reason,
    startDate,
    endDate,
    days: Number(days),
    targets: selectedTargets,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  data.leaves.push(leave);
  writeData(data);
  res.json({ message: "Leave request submitted successfully.", leave });
});

app.get("/api/leaves", (req, res) => {
  const data = readData();
  const { userId, role } = req.query;

  if (role === "student") {
    return res.json({ leaves: data.leaves.filter((leave) => leave.studentId === userId) });
  }

  if (role === "faculty") {
    return res.json({ leaves: data.leaves.filter((leave) => leave.targets.some((target) => target.teacherId === userId)) });
  }

  res.json({ leaves: data.leaves });
});

app.post("/api/leaves/:id/status", (req, res) => {
  const data = ensureArrays(readData());
  const leave = data.leaves.find((item) => item.id === req.params.id);

  if (!leave) {
    return res.status(404).json({ message: "Leave request not found." });
  }

  leave.status = req.body.status;
  leave.remark = req.body.remark || "";
  writeData(data);
  res.json({ message: `Leave ${leave.status}.`, leave });
});

app.patch("/api/users/:id", (req, res) => {
  const data = ensureArrays(readData());
  const user = data.users.find((item) => item.id === req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  ["name", "email", "phone", "profilePhoto"].forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  writeData(data);
  res.json({ message: "Profile updated.", user: publicUser(user) });
});

app.post("/api/remarks", (req, res) => {
  const data = ensureArrays(readData());
  const { studentId, teacherId, text } = req.body;

  if (!studentId || !teacherId || !text) {
    return res.status(400).json({ message: "Student and remark are required." });
  }

  data.remarks.push({ studentId, teacherId, text, createdAt: new Date().toISOString() });
  writeData(data);
  res.json({ message: "Remark added." });
});

app.post("/api/announcements", (req, res) => {
  const data = ensureArrays(readData());
  const teacher = data.users.find((user) => user.id === req.body.teacherId);

  if (!teacher || !req.body.message) {
    return res.status(400).json({ message: "Teacher and message are required." });
  }

  data.announcements.push({
    id: `ANN${Date.now()}`,
    teacherId: teacher.id,
    teacherName: teacher.name,
    department: teacher.department,
    message: req.body.message,
    createdAt: new Date().toISOString()
  });
  writeData(data);
  res.json({ message: "Announcement posted." });
});

app.get("/api/export.csv", (req, res) => {
  const data = ensureArrays(readData());
  const rows = ["Student ID,Subject,Total,Attended,Percentage"];
  data.attendance.forEach((row) => {
    const subject = data.subjects.find((item) => item.id === row.subjectId);
    rows.push(`${row.studentId},${subject?.name || row.subjectId},${row.total},${row.attended},${percentage(row.attended, row.total)}%`);
  });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=attendance-export.csv");
  res.send(rows.join("\n"));
});

app.listen(PORT, () => {
  console.log(`Attendance Management System running at http://localhost:${PORT}`);
});
