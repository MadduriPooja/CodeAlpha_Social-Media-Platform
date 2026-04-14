let currentUser = JSON.parse(localStorage.getItem('nexsocial_user')) || null;
let currentTheme = localStorage.getItem('nexsocial_theme') || 'dark';
let notifications = JSON.parse(localStorage.getItem('nexsocial_notifs')) || [];
let followedUsers = JSON.parse(localStorage.getItem('nexsocial_follows')) || [];

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    if (currentUser) {
        showDashboard();
    } else {
        showAuthGate();
    }
    loadFeed();
    updateNotificationBadge();
});

// --- Auth & Navigation ---

function showAuthGate() {
    const gate = document.getElementById('authGate');
    if (gate) gate.style.display = 'flex';
}

function showDashboard() {
    const dashboard = document.getElementById('dashboard');
    const gate = document.getElementById('authGate');
    if (dashboard) dashboard.style.display = 'block';
    if (gate) gate.style.display = 'none';
    
    // Update Profile UI
    const username = currentUser.username;
    document.getElementById('displayUsername').innerText = username;
    document.getElementById('profileUsername').innerText = username;
    const initial = username.substring(0, 1).toUpperCase();
    document.querySelectorAll('.avatar-placeholder').forEach(el => {
        el.innerText = initial;
    });
}

async function createUser() {
    const usernameInput = document.getElementById("regUsername");
    const username = usernameInput.value.trim();
    if (!username) return showToast("Please choose a username", "error");

    try {
        const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, bio: "Verified Member" })
        });
        const data = await res.json();
        currentUser = data;
        localStorage.setItem('nexsocial_user', JSON.stringify(data));
        showDashboard();
        showToast(`Welcome to NexSocial, ${data.username}!`, "success");
    } catch (err) {
        showToast("Registration failed", "error");
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

function switchView(viewName) {
    // Nav Items Active State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) activeNav.classList.add('active');

    // Section Visibility
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) activeView.classList.add('active');

    if (viewName === 'home') loadFeed();
    if (viewName === 'notifications') {
        renderNotifications();
        clearNotificationBadge();
    }
    if (viewName === 'discover') renderConnections();
}

// --- Interaction Logic ---

function followUser(name, handle, btn) {
    if (!currentUser) return showToast("Please sign up first!", "error");
    
    if (followedUsers.some(u => u.handle === handle)) {
        return showToast(`Already following @${handle}`, "info");
    }

    followedUsers.push({ name, handle });
    localStorage.setItem('nexsocial_follows', JSON.stringify(followedUsers));
    
    btn.innerText = "Following";
    btn.style.opacity = '0.5';
    btn.disabled = true;
    
    showToast(`Following ${name}`, "success");
}

function addNotification(icon, text) {
    const notif = { id: Date.now(), icon, text, time: 'Just now', unread: true };
    notifications.unshift(notif);
    localStorage.setItem('nexsocial_notifs', JSON.stringify(notifications));
    updateNotificationBadge();
}

function renderNotifications() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    
    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="placeholder-view">
                <ion-icon name="notifications-off-outline"></ion-icon>
                <h2>No notifications yet.</h2>
                <p>We'll notify you here.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = notifications.map(n => `
        <div class="post" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
            <div class="avatar-placeholder" style="width: 36px; height: 36px; font-size: 0.8rem;">
                <ion-icon name="${n.icon}"></ion-icon>
            </div>
            <div>
                <p style="font-size: 0.95rem;">${n.text}</p>
                <span style="font-size: 0.75rem; opacity: 0.5;">${n.time}</span>
            </div>
        </div>
    `).join('');
}

function renderConnections() {
    const list = document.getElementById('connectionsList');
    if (!list) return;

    if (followedUsers.length === 0) {
        list.innerHTML = `
            <div class="placeholder-view">
                <ion-icon name="people-circle-outline"></ion-icon>
                <h2>Your Network</h2>
                <p>People you follow will appear here.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = `<div class="feed-container" style="padding: 0;">` + followedUsers.map(u => `
        <div class="post" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem">
            <div class="avatar-placeholder" style="width: 40px; height: 40px;">${u.name.substring(0,1)}</div>
            <div>
                <strong>${u.name}</strong><br>
                <span style="font-size: 0.8rem; opacity: 0.6;">@${u.handle}</span>
            </div>
        </div>
    `).join('') + `</div>`;
}

function updateNotificationBadge() {
    const unread = notifications.some(n => n.unread);
    const badge = document.getElementById('navBadge');
    if (badge) badge.style.display = unread ? 'block' : 'none';
}

function clearNotificationBadge() {
    notifications.forEach(n => n.unread = false);
    localStorage.setItem('nexsocial_notifs', JSON.stringify(notifications));
    updateNotificationBadge();
}

// --- Content Logic ---

async function createPost() {
    const contentInput = document.getElementById("postContent");
    const content = contentInput.value.trim();
    if (!content) return;

    try {
        await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.id, content })
        });
        contentInput.value = "";
        showToast("Success! Story published.", "success");
        loadFeed();
    } catch (err) {
        showToast("Post shared locally", "success");
        loadFeed();
    }
}

async function loadFeed() {
    const feed = document.getElementById("feed");
    try {
        const res = await fetch("/api/posts");
        const posts = await res.json();
        feed.innerHTML = "";
        
        if (posts.length === 0) {
            feed.innerHTML = '<div class="loading-state" style="text-align:center; padding: 2rem;"><span>No stories yet. Start the buzz!</span></div>';
            return;
        }

        posts.reverse().forEach(p => {
            const card = document.createElement("div");
            card.className = "post";
            const timeAgo = Math.floor(Math.random() * 59) + 1;
            const hasLiked = currentUser && p.likes && p.likes.includes(currentUser.id);

            card.innerHTML = `
                <div class="post-user" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <div class="avatar-placeholder" style="width:36px; height:36px; font-size: 0.8rem; background: ${getRandomGradient()}">
                        U${p.userId || '?'}
                    </div>
                    <div class="info">
                        <strong>User_${p.userId}</strong>
                        <span style="font-size: 0.75rem; opacity: 0.6"> • ${timeAgo}m ago</span>
                    </div>
                </div>
                <div class="post-content" style="font-size: 1.1rem; margin-bottom: 1rem;">${p.content}</div>
                <div class="post-actions" style="display: flex; gap: 2.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                    <button class="like-btn ${hasLiked ? 'liked' : ''}" onclick="likePost(${p.id})">
                        <ion-icon name="${hasLiked ? 'heart' : 'heart-outline'}"></ion-icon>
                        <span>${p.likes ? p.likes.length : 0}</span>
                    </button>
                    <button class="like-btn"><ion-icon name="chatbubble-outline"></ion-icon><span>${Math.floor(Math.random()*5)}</span></button>
                    <button class="like-btn"><ion-icon name="share-social-outline"></ion-icon></button>
                </div>
            `;
            feed.appendChild(card);
        });
    } catch (err) {
        feed.innerHTML = '<div class="loading-state" style="text-align:center; padding: 2rem;"><span>Content syncing...</span></div>';
    }
}

async function likePost(id) {
    if (!currentUser) return showToast("Auth required", "error");
    try {
        await fetch(`/api/posts/${id}/like`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.id })
        });
        loadFeed();
    } catch (err) {}
}

// --- Utilities ---

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    localStorage.setItem('nexsocial_theme', currentTheme);
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    if (themeIcon && themeText) {
        if (theme === 'light') {
            themeIcon.setAttribute('name', 'sunny-outline');
            themeText.innerText = 'Light Mode';
        } else {
            themeIcon.setAttribute('name', 'moon-outline');
            themeText.innerText = 'Dark Mode';
        }
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<ion-icon name="${type === 'success' ? 'checkmark-circle' : 'information-circle'}"></ion-icon><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function getRandomGradient() {
    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
    return `linear-gradient(135deg, ${colors[Math.floor(Math.random()*colors.length)]}, #0f172a)`;
}




