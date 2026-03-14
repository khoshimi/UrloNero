document.addEventListener('DOMContentLoaded', function () {
    // ======== РАБОТА С ХРАНИЛИЩЕМ (БЕЗ СЕРВЕРА) ========
    
    // Получаем всех пользователей или создаем пустой массив
    function getUsers() {
        return JSON.parse(localStorage.getItem('un_users') || '[]');
    }

    // Получаем текущего вошедшего пользователя
    function getCurrentUser() {
        const email = localStorage.getItem('un_currentUserEmail');
        if (!email) return null;
        const users = getUsers();
        return users.find(u => u.email === email);
    }

    // ======== СТРАНИЦА AUTH.HTML ========
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const tabRegister = document.getElementById('tab-register');
    const tabLogin = document.getElementById('tab-login');

    if (tabRegister && tabLogin) {
        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            registerForm.style.display = 'flex';
            loginForm.style.display = 'none';
        });
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            loginForm.style.display = 'flex';
            registerForm.style.display = 'none';
        });
    }

    // Регистрация
    if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const phone = document.getElementById('reg-phone').value;
            const password = document.getElementById('reg-password').value;

            const users = getUsers();
            if (users.find(u => u.email === email)) {
                alert('Пользователь с таким email уже есть!');
                return;
            }

            const newUser = { name, email, phone, password, avatar: '1_гл_страница/logo.svg', apps: [] };
            users.push(newUser);
            localStorage.setItem('un_users', JSON.stringify(users));
            localStorage.setItem('un_currentUserEmail', email);

            alert('Регистрация успешна!');
            window.location.href = 'profile.html';
        });
    }

    // Вход
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            const users = getUsers();
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                localStorage.setItem('un_currentUserEmail', email);
                window.location.href = 'profile.html';
            } else {
                alert('Неверный логин или пароль');
            }
        });
    }

    // ======== СТРАНИЦА PROFILE.HTML ========
    const profileLayout = document.getElementById('profile-layout');
    const profileEmpty = document.getElementById('profile-empty');
    const linesContainer = document.getElementById('profile-lines');
    const avatarImg = document.getElementById('profile-avatar');
    const appsList = document.getElementById('applications-list');

    function renderProfile() {
        const user = getCurrentUser();

        if (!user) {
            if (profileLayout) profileLayout.style.display = 'none';
            if (profileEmpty) profileEmpty.style.display = 'block';
            return;
        }

        if (profileLayout) profileLayout.style.display = 'flex';
        if (profileEmpty) profileEmpty.style.display = 'none';

        if (linesContainer) {
            linesContainer.innerHTML = `
                <div class="profile-line-row">
                    <div class="profile-line-label">Имя</div>
                    <div class="profile-line-value">${user.name}</div>
                    <div class="profile-line-underline"></div>
                </div>
                <div class="profile-line-row">
                    <div class="profile-line-label">Телефон</div>
                    <div class="profile-line-value">${user.phone}</div>
                    <div class="profile-line-underline"></div>
                </div>
                <div class="profile-line-row">
                    <div class="profile-line-label">Почта</div>
                    <div class="profile-line-value">${user.email}</div>
                    <div class="profile-line-underline"></div>
                </div>
            `;
        }

        if (avatarImg) {
            avatarImg.src = user.avatar || '1_гл_страница/logo.svg';
        }

        // Рендер заявок
        if (appsList) {
            if (!user.apps || user.apps.length === 0) {
                appsList.innerHTML = '<li class="muted">Пока нет ни одной заявки.</li>';
            } else {
                appsList.innerHTML = user.apps.map(app => `
                    <li class="list-item">
                        <div class="list-item-top">
                            <span class="bold">${app.direction}</span>
                            <span class="muted">${app.date}</span>
                        </div>
                        ${app.comment ? `<p class="muted">${app.comment}</p>` : ''}
                    </li>
                `).join('');
            }
        }
    }

    if (window.location.pathname.includes('profile.html')) {
        renderProfile();
    }

    // Смена аватара (через Base64, чтобы сохранилось в браузере)
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                const base64 = event.target.result;
                const email = localStorage.getItem('un_currentUserEmail');
                const users = getUsers();
                const userIndex = users.findIndex(u => u.email === email);
                
                if (userIndex !== -1) {
                    users[userIndex].avatar = base64;
                    localStorage.setItem('un_users', JSON.stringify(users));
                    if (avatarImg) avatarImg.src = base64;
                }
            };
            reader.readAsDataURL(file);
        });
    }
});