document.addEventListener('DOMContentLoaded', function () {
    // ======== Вспомогательные функции для текущего пользователя ========

    function getCurrentUserEmail() {
        return localStorage.getItem('un_currentUserEmail');
    }

    function setCurrentUserEmail(email) {
        if (email) {
            localStorage.setItem('un_currentUserEmail', email);
        } else {
            localStorage.removeItem('un_currentUserEmail');
        }
    }

    function getCurrentUser() {
        const email = getCurrentUserEmail();
        if (!email) return null;
        return { email: email };
    }

    // ======== Страница auth.html (регистрация / вход) ========
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const tabRegister = document.getElementById('tab-register');
    const tabLogin = document.getElementById('tab-login');

    function switchTab(mode) {
        if (!tabRegister || !tabLogin || !registerForm || !loginForm) return;
        const isRegister = mode === 'register';
        tabRegister.classList.toggle('active', isRegister);
        tabLogin.classList.toggle('active', !isRegister);
        registerForm.style.display = isRegister ? '' : 'none';
        loginForm.style.display = isRegister ? 'none' : '';
    }

    if (tabRegister && tabLogin) {
        tabRegister.addEventListener('click', function () { switchTab('register'); });
        tabLogin.addEventListener('click', function () { switchTab('login'); });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const name = registerForm.querySelector('#reg-name').value.trim();
            const email = registerForm.querySelector('#reg-email').value.trim();
            const phone = registerForm.querySelector('#reg-phone').value.trim();
            const password = registerForm.querySelector('#reg-password').value.trim();

            if (!name || !email || !phone || !password) {
                alert('Пожалуйста, заполните все поля.');
                return;
            }

            try {
                const resp = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone, password })
                });
                const data = await resp.json();
                if (!resp.ok) {
                    alert(data.error || 'Ошибка регистрации');
                    return;
                }
                setCurrentUserEmail(data.email);
                alert('Регистрация выполнена! Вы вошли в аккаунт.');
                window.location.href = 'profile.html';
            } catch (err) {
                alert('Ошибка сети при регистрации');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = loginForm.querySelector('#login-email').value.trim();
            const password = loginForm.querySelector('#login-password').value.trim();

            try {
                const resp = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await resp.json();
                if (!resp.ok) {
                    alert(data.error || 'Ошибка входа');
                    return;
                }
                setCurrentUserEmail(data.email);
                alert('Вы успешно вошли.');
                window.location.href = 'profile.html';
            } catch (err) {
                alert('Ошибка сети при входе');
            }
        });
    }

    if (logoutBtn) {
        const current = getCurrentUser();
        if (current) {
            logoutBtn.style.display = '';
        }
        logoutBtn.addEventListener('click', function () {
            setCurrentUserEmail(null);
            alert('Вы вышли из аккаунта.');
            window.location.reload();
        });
    }

    // ======== Страница профиля profile.html ========
    const profileApplicationsList = document.getElementById('applications-list');

    async function renderProfileBox() {
        const email = getCurrentUserEmail();
        const layout = document.getElementById('profile-layout');
        const emptyBlock = document.getElementById('profile-empty');
        const linesContainer = document.getElementById('profile-lines');
        const avatarImg = document.getElementById('profile-avatar');

        if (!email) {
            if (layout && emptyBlock) {
                layout.style.display = 'none';
                emptyBlock.style.display = 'block';
            }
            return;
        }

        let user = null;
        let apps = [];
        try {
            const resp = await fetch('/api/profile?email=' + encodeURIComponent(email));
            const data = await resp.json();
            if (resp.ok) {
                user = data.user;
                apps = data.applications || [];
            }
        } catch (e) {
            // ignore
        }

        if (!user) {
            if (layout && emptyBlock) {
                layout.style.display = 'none';
                emptyBlock.style.display = 'block';
            }
            return;
        }

        if (layout && emptyBlock) {
            layout.style.display = 'flex';
            emptyBlock.style.display = 'none';
        }
        if (linesContainer) {
            linesContainer.innerHTML = '';
            function addLine(label, value) {
                const row = document.createElement('div');
                row.className = 'profile-line-row';
                row.innerHTML =
                    '<div class="profile-line-label">' + label + '</div>' +
                    '<div class="profile-line-value">' + (value || '') + '</div>' +
                    '<div class="profile-line-underline"></div>';
                linesContainer.appendChild(row);
            }
            addLine('Имя', user.name);
            addLine('Телефон', user.phone);
            addLine('Почта', user.email);
        }

        if (avatarImg) {
            if (user.avatar) {
                avatarImg.src = user.avatar;
            } else {
                avatarImg.src = '1_гл_страница/logo.svg';
            }
        }

        if (profileApplicationsList) {
            profileApplicationsList.innerHTML = '';
            if (!apps.length) {
                const li = document.createElement('li');
                li.className = 'muted';
                li.textContent = 'Пока нет ни одной заявки.';
                profileApplicationsList.appendChild(li);
            } else {
                apps.forEach(function (app) {
                    const li = document.createElement('li');
                    li.className = 'list-item';
                    li.innerHTML =
                        '<div class="list-item-top">' +
                        '<span class="bold">' + app.direction + '</span>' +
                        '<span class="muted">' + app.date + '</span>' +
                        '</div>' +
                        (app.comment ? '<p class="muted">' + app.comment + '</p>' : '');
                    profileApplicationsList.appendChild(li);
                });
            }
        }
    }

    if (profileApplicationsList || document.getElementById('profile-layout')) {
        renderProfileBox();
    }

    // смена аватара на странице профиля
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', function (e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const user = getCurrentUser();
            if (!user) {
                alert('Сначала войдите в аккаунт, чтобы сохранить фото профиля.');
                return;
            }
            const formData = new FormData();
            formData.append('email', user.email);
            formData.append('avatar', file);

            fetch('/api/profile/avatar', {
                method: 'POST',
                body: formData
            })
                .then(function (resp) { return resp.json().then(data => ({ ok: resp.ok, data })); })
                .then(function (result) {
                    if (!result.ok) {
                        alert(result.data.error || 'Не удалось сохранить фото');
                        return;
                    }
                    renderProfileBox();
                })
                .catch(function () {
                    alert('Ошибка загрузки фото');
                });
        });
    }

    // ======== Страница ar.html (заявка на аренду) ========
    const applicationForm = document.getElementById('application-form');

    if (applicationForm) {
        const params = new URLSearchParams(window.location.search);
        const fromDirection = params.get('direction');
        const directionInput = document.getElementById('app-direction');

        var directionMap = {
            'adult-vocal': 'Взрослый вокал',
            guitar: 'Гитара',
            podcast: 'Подкаст',
            drums: 'Барабаны',
            electronic: 'Электронная музыка',
            'kids-vocal': 'Детский вокал'
        };

        if (directionInput && fromDirection && directionMap[fromDirection]) {
            directionInput.value = directionMap[fromDirection];
        }

        applicationForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const user = getCurrentUser();
            if (!user) {
                alert('Чтобы оформить заявку и увидеть её в профиле, сначала войдите в систему.');
                window.location.href = 'auth.html';
                return;
            }

            const direction = directionInput ? directionInput.value.trim() : '';
            const dateValue = document.getElementById('app-date').value;
            const comment = document.getElementById('app-comment').value.trim();

            if (!direction || !dateValue) {
                alert('Пожалуйста, заполните направление и дату.');
                return;
            }

            fetch('/api/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    direction: direction,
                    date: dateValue,
                    comment: comment
                })
            })
                .then(function (resp) { return resp.json().then(data => ({ ok: resp.ok, data })); })
                .then(function (result) {
                    if (!result.ok) {
                        alert(result.data.error || 'Не удалось сохранить заявку');
                        return;
                    }
                    alert('Заявка отправлена! Вы можете посмотреть её в профиле.');
                    window.location.href = 'profile.html';
                })
                .catch(function () {
                    alert('Ошибка сети при отправке заявки');
                });
        });
    }

    // ======== Форма отзыва на otz.html ========
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackList = document.getElementById('feedback-list');

    function renderReviews() {
        if (!feedbackList) return;
        fetch('/api/reviews')
            .then(function (resp) { return resp.json(); })
            .then(function (reviews) {
                if (!Array.isArray(reviews) || !reviews.length) return;
                reviews.forEach(function (rev) {
                    const li = document.createElement('li');
                    li.className = 'feedback-item';
                    li.innerHTML =
                        '<p class="feedback-author">' + rev.name + '</p>' +
                        '<p class="feedback-text">' + rev.text + '</p>';
                    feedbackList.appendChild(li);
                });
            })
            .catch(function () { });
    }

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const nameInput = document.getElementById('fb-name');
            const textInput = document.getElementById('fb-text');
            const name = nameInput.value.trim() || 'Аноним';
            const text = textInput.value.trim();
            if (!text) {
                alert('Пожалуйста, напишите текст отзыва.');
                return;
            }
            fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, text: text })
            })
                .then(function (resp) { return resp.json().then(data => ({ ok: resp.ok, data })); })
                .then(function (result) {
                    if (!result.ok) {
                        alert(result.data.error || 'Не удалось сохранить отзыв');
                        return;
                    }
                    const newReview = result.data;
                    if (feedbackList) {
                        const li = document.createElement('li');
                        li.className = 'feedback-item';
                        li.innerHTML =
                            '<p class="feedback-author">' + newReview.name + '</p>' +
                            '<p class="feedback-text">' + newReview.text + '</p>';
                        feedbackList.appendChild(li);
                    }

                    feedbackForm.reset();
                    alert('Спасибо за ваш отзыв!');
                })
                .catch(function () {
                    alert('Ошибка сети при сохранении отзыва');
                });
        });
    }

    if (feedbackList) {
        renderReviews();
    }

    // ======== Админ-панель admin.html ========
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLoginSection = document.getElementById('admin-login-section');
    const adminPanelSection = document.getElementById('admin-panel-section');
    const applicationsTableBody = document.querySelector('#applications-table tbody');
    const contentList = document.getElementById('content-list');
    const contentForm = document.getElementById('content-form');

    function getAdminEmail() {
        return localStorage.getItem('un_adminEmail');
    }

    function setAdminEmail(email) {
        if (email) {
            localStorage.setItem('un_adminEmail', email);
        } else {
            localStorage.removeItem('un_adminEmail');
        }
    }

    var adminContentCache = [];
    async function loadAdminContent() {
        if (!contentList) return;
        contentList.innerHTML = '';
        try {
            const resp = await fetch('/api/admin/content', {
                headers: { 'x-admin-email': getAdminEmail() || '' }
            });
            const data = await resp.json();
            if (!resp.ok) {
                alert(data.error || 'Ошибка загрузки контента');
                return;
            }
            adminContentCache = data;
            if (!data.length) {
                contentList.innerHTML = '<p class="muted">Пока нет сохранённых блоков. Создайте блок в форме справа.</p>';
                return;
            }
            data.forEach(function (item) {
                const div = document.createElement('div');
                div.className = 'admin-content-item';
                const preview = (item.value || '').slice(0, 50);
                div.innerHTML =
                    '<span class="admin-content-key">' + item.key + '</span>' +
                    '<span class="admin-content-preview">' + preview + '</span>' +
                    '<button type="button" class="admin-content-select" data-key="' + item.key + '">Редактировать</button>';
                contentList.appendChild(div);
            });
        } catch (e) {
            alert('Ошибка сети при загрузке контента');
        }
    }

    async function loadAdminApplications() {
        if (!applicationsTableBody) return;
        applicationsTableBody.innerHTML = '';
        try {
            const resp = await fetch('/api/admin/applications', {
                headers: {
                    'x-admin-email': getAdminEmail() || ''
                }
            });
            const data = await resp.json();
            if (!resp.ok) {
                alert(data.error || 'Ошибка загрузки заявок');
                return;
            }
            data.forEach(function (app) {
                const status = (app.status || 'pending').toLowerCase();
                const statusClass = 'admin-status admin-status--' + status;
                const statusLabel = status === 'pending' ? 'Ожидает' : status === 'approved' ? 'Одобрена' : 'Отклонена';
                const dateStr = app.date ? app.date.replace('T', ' ').slice(0, 16) : app.date || '';
                const comment = (app.comment || '').slice(0, 40);
                const tr = document.createElement('tr');
                tr.innerHTML =
                    '<td>' + app.id + '</td>' +
                    '<td>' + (app.User ? app.User.name : '') + '</td>' +
                    '<td>' + (app.User ? app.User.email : '') + '</td>' +
                    '<td>' + (app.User ? app.User.phone : '') + '</td>' +
                    '<td>' + app.direction + '</td>' +
                    '<td class="admin-cell-date">' + dateStr + '</td>' +
                    '<td class="admin-cell-comment" title="' + (app.comment || '') + '">' + comment + '</td>' +
                    '<td><span class="' + statusClass + '">' + statusLabel + '</span></td>' +
                    '<td><div class="admin-actions">' +
                    '<button type="button" class="admin-btn admin-btn--approve" data-action="approve" data-id="' + app.id + '">Одобрить</button>' +
                    '<button type="button" class="admin-btn admin-btn--reject" data-action="reject" data-id="' + app.id + '">Отклонить</button>' +
                    '</div></td>';
                applicationsTableBody.appendChild(tr);
            });
        } catch (e) {
            alert('Ошибка сети при загрузке заявок');
        }
    }

    if (adminLoginForm && adminLoginSection && adminPanelSection) {
        adminLoginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = document.getElementById('admin-email').value.trim();
            const password = document.getElementById('admin-password').value.trim();
            try {
                const resp = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await resp.json();
                if (!resp.ok) {
                    alert(data.error || 'Ошибка входа администратора');
                    return;
                }
                setAdminEmail(data.email);
                adminLoginSection.style.display = 'none';
                adminPanelSection.style.display = '';
                loadAdminApplications();
                if (typeof loadAdminContent === 'function') {
                    loadAdminContent();
                }
            } catch (err) {
                alert('Ошибка сети при входе администратора');
            }
        });

        const existingAdmin = getAdminEmail();
        if (existingAdmin) {
            adminLoginSection.style.display = 'none';
            adminPanelSection.style.display = '';
            loadAdminApplications();
            if (typeof loadAdminContent === 'function') {
                loadAdminContent();
            }
        }
    }

    if (applicationsTableBody) {
        applicationsTableBody.addEventListener('click', async function (e) {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            const status = action === 'approve' ? 'approved' : 'rejected';
            try {
                const resp = await fetch('/api/admin/applications/' + id, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-email': getAdminEmail() || ''
                    },
                    body: JSON.stringify({ status: status })
                });
                const data = await resp.json();
                if (!resp.ok) {
                    alert(data.error || 'Ошибка изменения статуса');
                    return;
                }
                loadAdminApplications();
            } catch (err) {
                alert('Ошибка сети при изменении статуса');
            }
        });
    }

    if (contentForm) {
        contentForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const key = document.getElementById('content-key').value.trim();
            const value = document.getElementById('content-value').value;
            if (!key) return;
            try {
                const resp = await fetch('/api/admin/content', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-email': getAdminEmail() || ''
                    },
                    body: JSON.stringify({ key: key, value: value })
                });
                const data = await resp.json();
                if (!resp.ok) {
                    alert(data.error || 'Ошибка сохранения блока');
                    return;
                }
                alert('Блок сохранён');
                loadAdminContent();
            } catch (err) {
                alert('Ошибка сети при сохранении блока');
            }
        });
    }

    if (contentList) {
        contentList.addEventListener('click', function (e) {
            const btn = e.target.closest('.admin-content-select');
            if (!btn) return;
            const key = btn.getAttribute('data-key');
            const item = adminContentCache.find(function (c) { return c.key === key; });
            const value = item ? (item.value || '') : '';
            document.getElementById('content-key').value = key || '';
            document.getElementById('content-value').value = value;
            if (contentForm) {
                contentForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    var adminTabs = document.querySelectorAll('.admin-tab');
    var adminPanels = document.querySelectorAll('.admin-tab-panel');
    if (adminTabs.length && adminPanels.length) {
        adminTabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var tabName = tab.getAttribute('data-tab');
                adminTabs.forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                adminPanels.forEach(function (p) {
                    p.classList.remove('active');
                    if (p.id === 'admin-tab-' + tabName) {
                        p.classList.add('active');
                    }
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            });
        });
    }
});
