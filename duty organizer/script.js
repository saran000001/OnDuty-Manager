let currentUser = null;
const DB = {
  students: JSON.parse(localStorage.getItem("students") || "[]"),
  staffs: JSON.parse(localStorage.getItem("staffs") || "[]"),
  events: JSON.parse(localStorage.getItem("events") || "[]"),
  ods: JSON.parse(localStorage.getItem("od_requests") || "[]"),
};

function save(table) {
  localStorage.setItem(
    table === "ods" ? "od_requests" : table,
    JSON.stringify(DB[table])
  );
  updateStats();
}

function showNotification(msg, type = "success") {
  const n = document.getElementById("notification");
  n.textContent = msg;
  n.className = `notification show ${type === "error" ? "error" : "success"}`;
  setTimeout(() => n.classList.remove("show"), 3500);
}

function toggleManualFields() {
  const role = document.getElementById("manual-role").value;
  if (role === 'staff') {
    document.getElementById("staff-fields").classList.remove("hidden");
    document.getElementById("role-display").classList.remove("hidden");
    document.getElementById("role-text").innerText = "Staff Account";
    document.getElementById("password-section").classList.remove("hidden");
    document.getElementById("register-btn").classList.remove("hidden");
  } else {
    document.getElementById("staff-fields").classList.add("hidden");
    document.getElementById("role-display").classList.add("hidden");
    document.getElementById("password-section").classList.add("hidden");
    document.getElementById("register-btn").classList.add("hidden");
  }
}

function detectRole() {
  const email = document.getElementById("reg-email").value.toLowerCase().trim();
  
  // Specific Student Regex (SKASC domain)
  const isStudent = /^[a-zA-Z]+\d{2}[a-zA-Z]{3}\d{3}@skasc\.ac\.in$/.test(email);
  
  // General Email Regex
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const isStaff = isValidEmail && !isStudent;

  const display = document.getElementById("role-display");
  const selection = document.getElementById("role-selection");
  const passSection = document.getElementById("password-section");
  const regBtn = document.getElementById("register-btn");
  const roleText = document.getElementById("role-text");

  // Reset logic: Hide everything first
  const hideAll = () => {
    display.classList.add("hidden");
    selection.classList.add("hidden");
    passSection.classList.add("hidden");
    regBtn.classList.add("hidden");
    document.getElementById("student-fields").classList.add("hidden");
    document.getElementById("staff-fields").classList.add("hidden");
  };

  if (!email) {
    hideAll(); 
    return;
  }

  if (isStudent) {
    display.classList.remove("hidden");
    roleText.innerText = "Student Account";
    selection.classList.add("hidden");
    document.getElementById("student-fields").classList.remove("hidden");
    document.getElementById("staff-fields").classList.add("hidden");
    passSection.classList.remove("hidden");
    regBtn.classList.remove("hidden");
  } else if (isStaff) {
    // Show Manual Selector for non-student valid emails
    // Do NOT auto-show staff fields. Let them click.
    selection.classList.remove("hidden");
    
    // Hide confirmed display until they select
    display.classList.add("hidden"); 
    
    // If they already selected Staff previously, keep it open? 
    // Ideally reset or check current value.
    // For simplicity, let toggleManualFields handle the state if the user changes it.
    // However, on typing, we might want to respect the current dropdown implementation.
    toggleManualFields();
  } else {
    hideAll();
  }
}

function handleLogin() {
  const email = document
    .getElementById("login-email")
    .value.trim()
    .toLowerCase();
  const pass = document.getElementById("login-password").value;
  const user = [...DB.students, ...DB.staffs].find((u) => u.email === email);

  if (user && user.password === pass) {
    currentUser = user;
    showDashboard();
  } else {
    document.getElementById("login-error").innerText =
      "Invalid email or password";
  }
}

function handleRegister() {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const pass = document.getElementById("reg-password").value;
  const confirm = document.getElementById("reg-confirm").value;

  if (pass !== confirm)
    return showNotification("Passwords do not match", "error");
  if (pass.length < 6)
    return showNotification("Password too short (min 6)", "error");

  const exists = [...DB.students, ...DB.staffs].find((u) => u.email === email);
  if (exists) return showNotification("Email already registered", "error");

  const isStudent = /^[a-zA-Z]+\d{2}[a-zA-Z]{3}\d{3}@skasc\.ac\.in$/.test(
    email
  );
  const role = isStudent ? "student" : "staff";
  const newUser = {
    id: Date.now(),
    full_name: name,
    email,
    password: pass,
    role,
  };

  if (role === "student") {
    newUser.roll = document.getElementById("student-roll").value;
    newUser.dept = document.getElementById("student-dept").value;
    newUser.section = document.getElementById("student-section").value;
  } else {
    newUser.dept = document.getElementById("staff-dept").value || "General";
  }

  const table = role === "student" ? "students" : "staffs";
  DB[table].push(newUser);
  save(table);
  showNotification("Registration successful! Sign in now.");
  showLogin();
}

function showDashboard() {
  document.getElementById("auth-card").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");

  document.getElementById("user-display-name").innerText =
    currentUser.full_name;
  document.getElementById("user-display-role").innerText = currentUser.role;

  document
    .getElementById("student-view")
    .classList.toggle("hidden", currentUser.role !== "student");
  document
    .getElementById("staff-view")
    .classList.toggle("hidden", currentUser.role === "student");

  if (currentUser.role === "student") {
    updateODSelect();
    renderMyODs();
    renderBrowseEvents();
    toggleSection("track-od");
  } else {
    renderStaffODs();
    renderStaffEvents();
    toggleSection("approve-ods");
  }
  updateStats();
}

function updateODSelect() {
  const sel = document.getElementById("od-event");
  sel.innerHTML = DB.events.length
    ? DB.events
        .map((e) => `<option value="${e.id}">${e.name} (${e.date})</option>`)
        .join("")
    : `<option value="">No events available</option>`;
}

function updateStats() {
  const container = document.getElementById("stats-container");
  if (!currentUser) return;

  let stats = [];
  if (currentUser.role === "student") {
    const my = DB.ods.filter((o) => o.studentId === currentUser.id);
    stats = [
      { label: "Total", value: my.length, color: "text-gray-400" },
      {
        label: "Approved",
        value: my.filter((o) => o.status === "Approved").length,
        color: "text-emerald-400",
      },
      {
        label: "Pending",
        value: my.filter((o) => o.status === "Pending").length,
        color: "text-amber-400",
      },
      {
        label: "Rejected",
        value: my.filter((o) => o.status === "Rejected").length,
        color: "text-red-400",
      },
    ];
  } else {
    const all = DB.ods;
    stats = [
      { label: "Events", value: DB.events.length, color: "text-blue-400" },
      {
        label: "Pending",
        value: all.filter((o) => o.status === "Pending").length,
        color: "text-amber-400",
      },
      {
        label: "Approved",
        value: all.filter((o) => o.status === "Approved").length,
        color: "text-emerald-400",
      },
      {
        label: "Students",
        value: DB.students.length,
        color: "text-purple-400",
      },
    ];
  }

  container.innerHTML = stats
    .map(
      (s) => `
      <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
        <div class="text-[10px] uppercase font-bold text-gray-500 tracking-widest">${s.label}</div>
        <div class="text-2xl font-bold ${s.color} mt-1">${s.value}</div>
      </div>
    `
    )
    .join("");
}

function toggleSection(id) {
  const ids = [
    "apply-od",
    "track-od",
    "browse-events",
    "approve-ods",
    "manage-events",
    "create-event-form",
  ];
  ids.forEach((x) => {
    const el = document.getElementById(x);
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
}

function submitOD() {
  const evId = document.getElementById("od-event").value;
  const reason = document.getElementById("od-reason").value.trim();
  if (!evId) return showNotification("Please select an event", "error");
  if (!reason) return showNotification("Please provide a reason", "error");

  DB.ods.push({
    id: Date.now(),
    studentId: currentUser.id,
    eventId: evId,
    reason,
    status: "Pending",
    timestamp: new Date().toLocaleDateString(),
  });
  save("ods");
  showNotification("Application submitted successfully!");
  renderMyODs();
  toggleSection("track-od");
}

function renderMyODs() {
  const list = document.getElementById("my-od-list");
  const my = DB.ods.filter((o) => o.studentId === currentUser.id);
  list.innerHTML = my.length
    ? my
        .map((o) => {
          const ev = DB.events.find((e) => e.id == o.eventId);
          const statusColor =
            o.status === "Approved"
              ? "bg-emerald-500/10 text-emerald-400"
              : o.status === "Rejected"
              ? "bg-red-500/10 text-red-400"
              : "bg-amber-500/10 text-amber-400";
          return `
          <div class="p-5 bg-gray-800/50 rounded-2xl flex justify-between items-center border border-gray-700/50">
            <div>
              <div class="font-bold text-white">${
                ev ? ev.name : "Unknown Event"
              }</div>
              <div class="text-xs text-gray-500 mt-1">Submitted on ${
                o.timestamp || "N/A"
              }</div>
            </div>
            <div class="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${statusColor}">${
            o.status
          }</div>
          </div>`;
        })
        .join("")
    : '<div class="text-center py-10 text-gray-500">No applications found.</div>';
}

function renderBrowseEvents() {
  const list = document.getElementById("browse-events-list");
  list.innerHTML = DB.events.length
    ? DB.events
        .map(
          (e) => `
        <div class="p-6 bg-gray-800 rounded-2xl border border-gray-700 flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-2">
                  <div class="text-xs font-bold text-emerald-500 uppercase">${
                    e.date
                  }</div>
                  <span class="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold uppercase">${
                    e.category || "Duty"
                  }</span>
                </div>
                <div class="text-lg font-bold text-white">${e.name}</div>
                <div class="text-sm text-gray-400 mt-1">📍 ${
                  e.venue || "Campus"
                }</div>
            </div>
            <button onclick="quickApply(${
              e.id
            })" class="mt-6 w-full py-3 bg-gray-700 hover:bg-emerald-600 rounded-xl transition-all text-sm font-bold">Apply for Duty</button>
        </div>
    `
        )
        .join("")
    : '<div class="col-span-full text-center py-10 text-gray-500">No events currently scheduled.</div>';
}

function quickApply(id) {
  toggleSection("apply-od");
  document.getElementById("od-event").value = id;
}

function renderStaffODs() {
  const list = document.getElementById("staff-od-list");
  const pending = DB.ods.filter((o) => o.status === "Pending");
  document.getElementById("pending-count-text").innerText = pending.length
    ? `${pending.length} requests waiting for review`
    : "All clear! No pending requests";

  list.innerHTML = pending.length
    ? pending
        .map((o) => {
          const stu = DB.students.find((s) => s.id == o.studentId);
          const ev = DB.events.find((e) => e.id == o.eventId);
          return `
          <div class="p-6 bg-gray-800 rounded-3xl border border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <div class="font-bold text-white text-lg">${
                  stu?.full_name || "Student"
                } <span class="text-xs text-gray-500 ml-2 font-normal">(${
            stu?.roll || "N/A"
          })</span></div>
                <div class="text-sm text-emerald-400 font-medium">${
                  ev?.name || "Event"
                }</div>
                <div class="mt-2 text-xs text-gray-400 p-2 bg-gray-950 rounded-lg italic">"${
                  o.reason
                }"</div>
            </div>
            <div class="flex gap-2 w-full sm:w-auto">
                <button onclick="updateOD(${
                  o.id
                }, 'Approved')" class="flex-1 px-4 py-2 bg-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-500">Approve</button>
                <button onclick="updateOD(${
                  o.id
                }, 'Rejected')" class="flex-1 px-4 py-2 bg-red-600 rounded-xl text-xs font-bold hover:bg-red-500">Reject</button>
            </div>
          </div>`;
        })
        .join("")
    : '<div class="text-center py-10 text-gray-500">You have reviewed all pending requests.</div>';
}

function updateOD(id, status) {
  const o = DB.ods.find((x) => x.id == id);
  if (o) {
    o.status = status;
    save("ods");
    renderStaffODs();
    showNotification(`Request ${status}`);
  }
}

function handleCreateEvent() {
  const name = document.getElementById("ev-name").value.trim();
  const date = document.getElementById("ev-date").value;
  const venue = document.getElementById("ev-venue").value.trim();
  const cat = document.getElementById("ev-cat").value;

  if (!name || !date)
    return showNotification("Event name and date required", "error");

  DB.events.push({
    id: Date.now(),
    name,
    date,
    venue: venue || "Main Campus",
    category: cat,
  });
  save("events");
  renderStaffEvents();
  toggleSection("manage-events");
  showNotification("Event Published!");

  document.getElementById("ev-name").value = "";
  document.getElementById("ev-date").value = "";
  document.getElementById("ev-venue").value = "";
}

function deleteEvent(id) {
  if (!confirm("Are you sure? This will remove the event for everyone."))
    return;
  DB.events = DB.events.filter((e) => e.id !== id);
  save("events");
  renderStaffEvents();
  showNotification("Event deleted");
}

function renderStaffEvents() {
  const list = document.getElementById("staff-events-list");
  list.innerHTML = DB.events.length
    ? DB.events
        .map(
          (e) => `
        <div class="p-5 bg-gray-800 rounded-2xl flex justify-between items-center border border-gray-700">
            <div>
                <div class="flex items-center gap-2 mb-1">
                  <div class="font-bold text-white">${e.name}</div>
                  <span class="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 rounded uppercase">${e.category}</span>
                </div>
                <div class="text-xs text-gray-500">${e.date} • ${e.venue}</div>
            </div>
            <button onclick="deleteEvent(${e.id})" class="text-gray-500 hover:text-red-400 p-2 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>
    `
        )
        .join("")
    : '<div class="col-span-full text-center py-10 text-gray-500">No events found. Click "Create Event" to start.</div>';
}

function showLogin() {
  document.getElementById("login-form").classList.remove("hidden");
  document.getElementById("register-form").classList.add("hidden");
  document.getElementById("auth-title").innerText = "Login to your account";
}
function showRegister() {
  document.getElementById("login-form").classList.add("hidden");
  document.getElementById("register-form").classList.remove("hidden");
  document.getElementById("auth-title").innerText = "Join the platform";
}
function logout() {
  if(confirm("Are you sure you want to logout?")) {
    currentUser = null;
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("auth-card").classList.remove("hidden");
    location.reload();
  }
}

// Initialize and reset form state on load
window.addEventListener('load', () => {
    const roleSelect = document.getElementById("manual-role");
    if(roleSelect) roleSelect.value = "";
    detectRole(); // Run initial check in case of autofill
});
