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
});

