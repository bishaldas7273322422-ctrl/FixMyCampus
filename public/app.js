 
const API_URL = `${window.location.origin}/api`;

// ==========================================
// AUTHENTICATION HELPERS
// ==========================================

function getToken() {
    return localStorage.getItem("fmcToken");
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("fmcUser"));
    } catch {
        return null;
    }
}

function logout() {
    localStorage.removeItem("fmcToken");
    localStorage.removeItem("fmcUser");
    window.location.href = "login.html";
}

function authHeaders(extraHeaders = {}) {
    return {
        ...extraHeaders,
        Authorization: `Bearer ${getToken()}`
    };
}

// No forced login redirect.
// Visitors can access the public homepage.
function checkAuthentication() {
    if (!getToken()) return null;
    return getUser();
}

const currentUser = checkAuthentication();
const isAdmin = currentUser?.role === "admin";
const isStudent = currentUser?.role === "student";
const isGuest = !currentUser;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function getStatusClass(status) {
    if (status === "In Progress") return "status-progress";
    if (status === "Resolved") return "status-resolved";
    return "status-pending";
}

function getPriorityClass(priority) {
    return "priority-" + String(priority || "low").toLowerCase();
}

function formatDate(value) {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleDateString();
}

// ==========================================
// PAGE ACCESS AND NAVIGATION
// ==========================================

function setupPageAccess() {
    const header = document.querySelector("header");
    const submitSection = document.getElementById("submit");
    const adminSection = document.getElementById("admin");

    const navLinks = document.querySelector(".nav-links");
    const navCTA = document.querySelector(".nav-cta");

    if (isGuest) {
        // Visitors can browse, track and view public complaints.
        // Complaint submission and dashboard require login.
        if (submitSection) submitSection.style.display = "none";
        if (adminSection) adminSection.style.display = "none";

        document.querySelectorAll(
            'a[href="#submit"]'
        ).forEach(link => {
            link.href = "login.html";
            link.textContent = "Login to Report";
        });

        const dashboardLink =
            document.querySelector('.nav-links a[href="#admin"]');

        if (dashboardLink) {
            dashboardLink.style.display = "none";
        }

        if (navCTA) {
            navCTA.href = "login.html";
            navCTA.innerHTML = 'Login / Register <span>↗</span>';
        }

    } else {
        // Logged-in user information and logout button.
        if (header) {
            const authArea = document.createElement("div");

            authArea.style.cssText =
                "display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px;";

            authArea.innerHTML = `
                <span style="color:#67d9ff;">
                    ${escapeHTML(currentUser.name)}
                    (${escapeHTML(currentUser.role)})
                </span>
                <button id="logoutButton" type="button">Logout</button>
            `;

            header.appendChild(authArea);

            document.getElementById("logoutButton")
                .addEventListener("click", logout);
        }

        if (isAdmin && submitSection) {
            submitSection.style.display = "none";
        }

        if (isStudent && adminSection) {
            const statsGrid = adminSection.querySelector(".stats-grid");
            const adminControls = adminSection.querySelector(".admin-controls");
            const refreshButton = document.getElementById("refreshButton");

            if (statsGrid) statsGrid.style.display = "none";
            if (adminControls) adminControls.style.display = "none";
            if (refreshButton) refreshButton.style.display = "none";

            const kicker = adminSection.querySelector(".section-kicker");
            const heading = adminSection.querySelector("h2");
            const description = adminSection.querySelector(".section-heading p");
            const managementHeading = adminSection.querySelector(".management-heading h3");
            const managementDescription = adminSection.querySelector(".management-heading p");

            if (kicker) kicker.textContent = "03 / STUDENT PORTAL";
            if (heading) heading.innerHTML = 'My <span>complaints.</span>';

            if (description) {
                description.textContent =
                    "View and track the complaints you have submitted.";
            }

            if (managementHeading) {
                managementHeading.textContent = "My complaints";
            }

            if (managementDescription) {
                managementDescription.textContent =
                    "Track the progress of your reported campus issues.";
            }

            const dashboardLink =
                document.querySelector('.nav-links a[href="#admin"]');

            if (dashboardLink) {
                dashboardLink.textContent = "My Complaints";
            }
        }
    }

    // Add Existing Complaints navigation link for everyone.
    if (navLinks && !document.querySelector(
        '.nav-links a[href="#existingComplaints"]'
    )) {
        const link = document.createElement("a");

        link.href = "#existingComplaints";
        link.textContent = "Existing Complaints";

        navLinks.appendChild(link);
    }
}

// ==========================================
// CREATE PUBLIC EXISTING COMPLAINTS SECTION
// ==========================================

function createExistingComplaintsSection() {
    if (document.getElementById("existingComplaints")) return;

    const adminSection = document.getElementById("admin");

    if (!adminSection) return;

    const section = document.createElement("section");

    section.id = "existingComplaints";
    section.className = "section admin-section";

    section.innerHTML = `
        <div class="section-heading">
            <span class="section-kicker">04 / CAMPUS TRANSPARENCY</span>
            <h2>Existing <span>complaints.</span></h2>
            <p>
                Explore reported campus issues and follow their progress.
                Student personal information and uploaded photos remain private.
            </p>
        </div>

        <div class="management-panel">
            <div class="management-heading">
                <div>
                    <span class="card-overline">PUBLIC RECORDS</span>
                    <h3>All campus complaints</h3>
                    <p>View reported campus issues and their current status.</p>
                </div>
            </div>

            <div class="admin-controls">
                <input
                    type="text"
                    id="publicSearchInput"
                    placeholder="Search by ticket, title or location..."
                >

                <select id="publicStatusFilter">
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                </select>

                <select id="publicPriorityFilter">
                    <option value="All">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                </select>

                <button type="button" id="publicRefreshButton">
                    Refresh
                </button>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>TICKET ID</th>
                            <th>TITLE</th>
                            <th>CATEGORY</th>
                            <th>LOCATION</th>
                            <th>PRIORITY</th>
                            <th>STATUS</th>
                            <th>SUBMITTED</th>
                            <th>LAST UPDATED</th>
                        </tr>
                    </thead>

                    <tbody id="publicIssuesTable">
                        <tr>
                            <td colspan="8">Loading existing complaints...</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p id="publicIssuesMessage" aria-live="polite"></p>
        </div>
    `;

    adminSection.insertAdjacentElement("afterend", section);

    document.getElementById("publicSearchInput")
        ?.addEventListener("input", loadPublicIssues);

    document.getElementById("publicStatusFilter")
        ?.addEventListener("change", loadPublicIssues);

    document.getElementById("publicPriorityFilter")
        ?.addEventListener("change", loadPublicIssues);

    document.getElementById("publicRefreshButton")
        ?.addEventListener("click", loadPublicIssues);
}

// ==========================================
// SECURE PHOTO VIEWER
// ==========================================

async function viewPhoto(issueId) {
    if (!currentUser || !getToken()) {
        alert("Please login to view this photo.");
        window.location.href = "login.html";
        return;
    }

    const photoWindow = window.open("about:blank", "_blank");

    if (!photoWindow) {
        alert("Please allow pop-ups to view complaint photos.");
        return;
    }

    photoWindow.document.write(
        "<p style='font-family:Arial;padding:20px'>Loading complaint photo...</p>"
    );

    try {
        const response = await fetch(
            `${API_URL}/issues/${encodeURIComponent(issueId)}/photo`,
            {
                method: "GET",
                headers: authHeaders()
            }
        );

        if (response.status === 401) {
            photoWindow.close();
            logout();
            return;
        }

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));

            throw new Error(
                result.message || "Could not access complaint photo."
            );
        }

        const photoBlob = await response.blob();

        if (!photoBlob.type.startsWith("image/")) {
            throw new Error("Invalid photo response.");
        }

        const photoURL = URL.createObjectURL(photoBlob);
        photoWindow.location.href = photoURL;

        setTimeout(() => URL.revokeObjectURL(photoURL), 60000);

    } catch (error) {
        photoWindow.close();
        alert(error.message);
    }
}

// ==========================================
// COMPLAINT SUBMISSION - STUDENTS ONLY
// ==========================================

const complaintForm = document.getElementById("complaintForm");
const formMessage = document.getElementById("formMessage");

if (complaintForm && isStudent) {
    complaintForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const submitButton = complaintForm.querySelector(
            'button[type="submit"]'
        );

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        formMessage.textContent = "";

        try {
            const formData = new FormData(complaintForm);

            const response = await fetch(`${API_URL}/issues`, {
                method: "POST",
                headers: authHeaders(),
                body: formData
            });

            const result = await response.json();

            if (response.status === 401) {
                logout();
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Complaint submission failed."
                );
            }

            formMessage.style.color = "#15966a";

            formMessage.innerHTML = `
                Complaint submitted successfully!<br>
                Your Ticket ID:
                <strong>${escapeHTML(result.issue.ticketId)}</strong>
            `;

            complaintForm.reset();

            loadIssues();
            loadPublicIssues();

        } catch (error) {
            formMessage.style.color = "#dc4c59";
            formMessage.textContent = error.message;

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Complaint";
        }
    });
}

// ==========================================
// LOAD MY COMPLAINTS / ADMIN COMPLAINTS
// ==========================================

async function loadIssues() {
    const issuesTable = document.getElementById("issuesTable");

    if (!issuesTable || !currentUser) return;

    issuesTable.innerHTML =
        `<tr><td colspan="8">Loading complaints...</td></tr>`;

    try {
        const search =
            document.getElementById("searchInput")?.value || "";

        const status =
            document.getElementById("statusFilter")?.value || "";

        const priority =
            document.getElementById("priorityFilter")?.value || "";

        const params = new URLSearchParams();

        if (search) params.append("search", search);
        if (status) params.append("status", status);
        if (priority) params.append("priority", priority);

        const response = await fetch(
            `${API_URL}/issues?${params.toString()}`,
            { headers: authHeaders() }
        );

        const result = await response.json();

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Could not load complaints."
            );
        }

        if (!result.issues || result.issues.length === 0) {
            issuesTable.innerHTML =
                `<tr><td colspan="8">No complaints found.</td></tr>`;
            return;
        }

        issuesTable.innerHTML = result.issues.map(issue => {
            const photoHTML = issue.photo
                ? `<button class="photo-link" type="button"
                    data-photo-id="${escapeHTML(issue.id)}">View Photo</button>`
                : "No Photo";

            const actionHTML = isAdmin
                ? `<select class="action-select"
                    onchange="updateStatus('${escapeHTML(issue.id)}', this.value)">
                    <option value="Pending" ${issue.status === "Pending" ? "selected" : ""}>Pending</option>
                    <option value="In Progress" ${issue.status === "In Progress" ? "selected" : ""}>In Progress</option>
                    <option value="Resolved" ${issue.status === "Resolved" ? "selected" : ""}>Resolved</option>
                  </select>`
                : escapeHTML(issue.status);

            return `
                <tr>
                    <td>${escapeHTML(issue.ticketId)}</td>
                    <td>${escapeHTML(issue.name)}</td>
                    <td>${escapeHTML(issue.title)}</td>
                    <td>${escapeHTML(issue.category)}</td>
                    <td>
                        <span class="${getPriorityClass(issue.priority)}">
                            ${escapeHTML(issue.priority)}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${getStatusClass(issue.status)}">
                            ${escapeHTML(issue.status)}
                        </span>
                    </td>
                    <td>${photoHTML}</td>
                    <td>${actionHTML}</td>
                </tr>
            `;
        }).join("");

        issuesTable.querySelectorAll("[data-photo-id]").forEach(button => {
            button.addEventListener("click", () => {
                viewPhoto(button.dataset.photoId);
            });
        });

    } catch (error) {
        issuesTable.innerHTML =
            `<tr><td colspan="8">${escapeHTML(error.message)}</td></tr>`;
    }
}

// ==========================================
// LOAD PUBLIC EXISTING COMPLAINTS
// ==========================================

async function loadPublicIssues() {
    const publicTable = document.getElementById("publicIssuesTable");

    if (!publicTable) return;

    const message = document.getElementById("publicIssuesMessage");

    publicTable.innerHTML =
        `<tr><td colspan="8">Loading existing complaints...</td></tr>`;

    if (message) message.textContent = "";

    try {
        const search =
            document.getElementById("publicSearchInput")?.value || "";

        const status =
            document.getElementById("publicStatusFilter")?.value || "All";

        const priority =
            document.getElementById("publicPriorityFilter")?.value || "All";

        const params = new URLSearchParams();

        if (search) params.append("search", search);
        if (status) params.append("status", status);
        if (priority) params.append("priority", priority);

        const response = await fetch(
            `${API_URL}/issues/public?${params.toString()}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Could not load existing complaints."
            );
        }

        if (!result.issues || result.issues.length === 0) {
            publicTable.innerHTML =
                `<tr><td colspan="8">No existing complaints found.</td></tr>`;
            return;
        }

        publicTable.innerHTML = result.issues.map(issue => `
            <tr>
                <td>${escapeHTML(issue.ticketId)}</td>
                <td>${escapeHTML(issue.title)}</td>
                <td>${escapeHTML(issue.category)}</td>
                <td>${escapeHTML(issue.location)}</td>
                <td>
                    <span class="${getPriorityClass(issue.priority)}">
                        ${escapeHTML(issue.priority)}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${getStatusClass(issue.status)}">
                        ${escapeHTML(issue.status)}
                    </span>
                </td>
                <td>${escapeHTML(formatDate(issue.createdAt))}</td>
                <td>${escapeHTML(formatDate(issue.updatedAt))}</td>
            </tr>
        `).join("");

        if (message) {
            message.textContent =
                `${result.count} public complaint(s) found.`;
        }

    } catch (error) {
        publicTable.innerHTML =
            `<tr><td colspan="8">${escapeHTML(error.message)}</td></tr>`;
    }
}

// ==========================================
// UPDATE STATUS - ADMIN ONLY
// ==========================================

async function updateStatus(issueId, newStatus) {
    if (!isAdmin) {
        alert("Only administrators can update complaint status.");
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/issues/${encodeURIComponent(issueId)}/status`,
            {
                method: "PATCH",
                headers: authHeaders({
                    "Content-Type": "application/json"
                }),
                body: JSON.stringify({ status: newStatus })
            }
        );

        const result = await response.json();

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Status update failed."
            );
        }

        alert("Complaint status updated successfully!");

        loadIssues();
        loadStats();
        loadPublicIssues();

    } catch (error) {
        alert(error.message);
        loadIssues();
    }
}

// ==========================================
// LOAD ADMIN STATISTICS
// ==========================================

async function loadStats() {
    if (!isAdmin) return;

    try {
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: authHeaders()
        });

        const stats = await response.json();

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok || !stats.success) {
            throw new Error(
                stats.message || "Could not load statistics."
            );
        }

        const total = document.getElementById("totalCount");
        const pending = document.getElementById("pendingCount");
        const progress = document.getElementById("progressCount");
        const resolved = document.getElementById("resolvedCount");

        if (total) total.textContent = stats.total ?? 0;
        if (pending) pending.textContent = stats.pending ?? 0;
        if (progress) progress.textContent = stats.inProgress ?? 0;
        if (resolved) resolved.textContent = stats.resolved ?? 0;

    } catch (error) {
        console.error("Statistics error:", error.message);
    }
}

// ==========================================
// PUBLIC TICKET TRACKING
// ==========================================

const trackButton = document.getElementById("trackButton");

if (trackButton) {
    trackButton.addEventListener("click", trackComplaint);
}

async function trackComplaint() {
    const ticketInput = document.getElementById("ticketInput");
    const trackingResult = document.getElementById("trackingResult");

    const ticketId = ticketInput?.value.trim();

    if (!ticketId) {
        trackingResult.textContent = "Please enter your Ticket ID.";
        return;
    }

    trackingResult.textContent = "Searching for your complaint...";

    try {
        const response = await fetch(
            `${API_URL}/issues/ticket/${encodeURIComponent(ticketId)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Ticket not found."
            );
        }

        const issue = result.issue;

        trackingResult.innerHTML = `
            <div class="tracking-card">
                <h3>Complaint Details</h3>
                <p><strong>Ticket ID:</strong> ${escapeHTML(issue.ticketId)}</p>
                <p><strong>Title:</strong> ${escapeHTML(issue.title)}</p>
                <p><strong>Category:</strong> ${escapeHTML(issue.category)}</p>
                <p><strong>Location:</strong> ${escapeHTML(issue.location)}</p>
                <p><strong>Priority:</strong> ${escapeHTML(issue.priority)}</p>
                <p><strong>Status:</strong> ${escapeHTML(issue.status)}</p>
                <p><strong>Submitted:</strong> ${escapeHTML(formatDate(issue.createdAt))}</p>
                <p><strong>Last Updated:</strong> ${escapeHTML(formatDate(issue.updatedAt))}</p>
            </div>
        `;

    } catch (error) {
        trackingResult.textContent = error.message;
    }
}

// ==========================================
// MY COMPLAINTS SEARCH AND FILTER
// ==========================================

document.getElementById("searchInput")
    ?.addEventListener("input", loadIssues);

document.getElementById("statusFilter")
    ?.addEventListener("change", loadIssues);

document.getElementById("priorityFilter")
    ?.addEventListener("change", loadIssues);

document.getElementById("refreshButton")
    ?.addEventListener("click", function() {
        loadIssues();
        loadStats();
    });

// ==========================================
// INITIAL PAGE LOAD
// ==========================================

document.addEventListener("DOMContentLoaded", function() {
    setupPageAccess();
    createExistingComplaintsSection();

    // Public complaint list is available to everyone.
    loadPublicIssues();

    // Private dashboard data is available only after login.
    if (currentUser) {
        loadIssues();
        loadStats();
    }
});
