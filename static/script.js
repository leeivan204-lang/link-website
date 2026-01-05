document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const linkNoteInput = document.getElementById('linkNoteInput');
    const addBtn = document.getElementById('addBtn');
    const cardsContainer = document.getElementById('cardsContainer');
    const loadingState = document.querySelector('.loading-indicator');
    const noticeDisplay = document.getElementById('noticeDisplay');
    const noticeInput = document.getElementById('noticeInput');
    const saveNoticeBtn = document.getElementById('saveNoticeBtn');
    const authLink = document.getElementById('authLink');
    const statusDiv = document.getElementById('systemStatus');

    let currentUserIsEditor = false;

    // --- Utility: Status Message ---
    function showStatus(msg, autoHide = true) {
        if (!statusDiv) return;
        statusDiv.textContent = `[ 系統訊息: ${msg} ]`;
        statusDiv.style.display = 'block';
        if (autoHide) {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    // --- Utility: Custom Confirm Modal ---
    function showConfirm(message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            const msgEl = document.getElementById('modalMessage');
            const confirmBtn = document.getElementById('modalConfirmBtn');
            const cancelBtn = document.getElementById('modalCancelBtn');

            msgEl.textContent = message;
            modal.style.display = 'flex'; // Use flex to center

            // Define cleanup to remove listeners after choice
            const cleanup = () => {
                modal.style.display = 'none';
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
            };

            confirmBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };
        });
    }

    // --- Core: Event Delegation (Fixes event binding issues) ---
    document.addEventListener('click', async (e) => {
        const target = e.target;

        // 1. Handle Clear Notice Button
        const clearBtn = target.closest('#clearNoticeBtn');
        if (clearBtn) {
            e.preventDefault();
            const confirmed = await showConfirm('確定要清除所有公告嗎？');
            if (confirmed) {
                showStatus('正在清除...', false);
                await clearAllNotices();
            } else {
                showStatus('取消清除');
            }
            return;
        }

        // 2. Handle Link Delete Button (.delete-btn)
        const deleteBtn = target.closest('.delete-btn'); // Matches text-based button now
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();

            const linkId = deleteBtn.getAttribute('data-id');
            if (linkId) {
                const confirmed = await showConfirm('確定要永久刪除這個連結嗎？');
                if (confirmed) {
                    showStatus('刪除中...', false);
                    await deleteLink(linkId);
                } else {
                    showStatus('取消刪除');
                }
            } else {
                console.error("Delete button missing data-id");
                showStatus('錯誤: 無法識別連結 ID');
            }
            return;
        }

        // 3. Handle Other Buttons if needed (Editor Login Log out is handled by onclick attr or specific bind)
    });


    // Load initial data
    checkAuth();
    fetchLinks();
    fetchNotice();

    async function checkAuth() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            currentUserIsEditor = data.is_editor;

            // Update UI visibility
            document.querySelectorAll('.editor-only').forEach(el => {
                el.style.display = currentUserIsEditor ? 'flex' : 'none';
            });
            // Update individual buttons
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.style.display = currentUserIsEditor ? 'flex' : 'none';
            });
            document.querySelectorAll('.notice-delete-btn').forEach(btn => {
                btn.style.display = currentUserIsEditor ? 'inline-flex' : 'none';
            });
            document.querySelectorAll('.edit-note-btn').forEach(btn => {
                btn.style.display = currentUserIsEditor ? 'inline-block' : 'none';
            });

            if (currentUserIsEditor) {
                authLink.textContent = '[ 登出系統 ]';
                authLink.href = '#';
                authLink.onclick = (e) => {
                    e.preventDefault();
                    logout();
                };
            } else {
                authLink.textContent = '[ 編輯者登入 ]';
                authLink.href = '/login';
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }

    async function logout() {
        await fetch('/api/logout', { method: 'POST' });
        window.location.reload();
    }

    // --- Notice Logic ---
    saveNoticeBtn.addEventListener('click', () => {
        const text = noticeInput.value.trim();
        if (text) addNotice(text);
    });

    // clearNoticeBtn logic is now handled by delegation above

    async function fetchNotice() {
        try {
            const response = await fetch('/api/notice');
            const data = await response.json();
            renderNotices(data.notices || []);
        } catch (error) {
            console.error('Error fetching notice:', error);
        }
    }

    async function addNotice(text) {
        try {
            const response = await fetch('/api/notice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });
            const data = await response.json();
            if (data.success) {
                renderNotices(data.notices);
                noticeInput.value = '';
            }
        } catch (error) {
            console.error('Error adding notice:', error);
            showStatus('無法新增公告');
        }
    }

    async function deleteNotice(id) {
        try {
            const response = await fetch(`/api/notice/${id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                renderNotices(data.notices);
            }
        } catch (error) {
            console.error('Error deleting notice:', error);
        }
    }

    async function clearAllNotices() {
        try {
            const response = await fetch('/api/notice/clear', { method: 'POST' });
            const data = await response.json();
            renderNotices(data.notices);
            showStatus('公告已清除');
        } catch (error) {
            console.error('Error clearing notices:', error);
            showStatus('清除失敗');
        }
    }

    function renderNotices(notices) {
        if (!notices || notices.length === 0) {
            noticeDisplay.innerHTML = '<span style="color: var(--neutral-500); font-weight: normal; font-size: 1rem;">(暫無重要公告)</span>';
            return;
        }

        noticeDisplay.innerHTML = '';
        const ul = document.createElement('ul');
        ul.className = 'notice-grid';
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';

        notices.forEach(notice => {
            const li = document.createElement('li');
            li.className = 'notice-item';

            const span = document.createElement('span');
            span.innerHTML = notice.content;
            li.appendChild(span);

            const btn = document.createElement('button');
            btn.innerHTML = '×';
            btn.className = 'notice-delete-btn editor-only';
            btn.style.display = currentUserIsEditor ? 'inline-flex' : 'none';
            btn.type = 'button';
            btn.onclick = () => deleteNotice(notice.id); // Keep this direct bind for now as it works

            li.appendChild(btn);
            ul.appendChild(li);
        });
        noticeDisplay.appendChild(ul);
    }

    // --- Link Logic ---
    addBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        const title = document.getElementById('titleInput').value.trim();
        const desc = document.getElementById('descInput').value.trim();
        const img = document.getElementById('imgInput').value.trim();
        const note = linkNoteInput ? linkNoteInput.value.trim() : '';

        if (url && title) {
            addLink(url, title, desc, img, note);
        } else {
            showStatus('網址與標題為必填項目');
        }
    });

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            // Optional: Move focus to next input instead of submit?
            document.getElementById('titleInput').focus();
        }
    });

    // Add keypress for title to trigger add if wanted, or just rely on button
    document.getElementById('titleInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const url = urlInput.value.trim();
            const title = document.getElementById('titleInput').value.trim();
            const desc = document.getElementById('descInput').value.trim();
            const img = document.getElementById('imgInput').value.trim();
            const note = linkNoteInput ? linkNoteInput.value.trim() : '';
            if (url && title) addLink(url, title, desc, img, note);
        }
    });

    async function fetchLinks() {
        try {
            const response = await fetch('/api/links');
            const links = await response.json();
            renderLinks(links);
        } catch (error) {
            console.error('Error fetching links:', error);
        }
    }

    async function addLink(url, title, desc, img, note) {
        loadingState.style.display = 'block';
        urlInput.disabled = true;
        addBtn.disabled = true;
        addBtn.textContent = '發布中...';

        try {
            const response = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url,
                    title: title,
                    description: desc,
                    image: img,
                    note: note
                })
            });

            if (response.ok) {
                showStatus('發布成功');
                urlInput.value = '';
                document.getElementById('titleInput').value = '';
                document.getElementById('descInput').value = '';
                document.getElementById('imgInput').value = '';
                if (linkNoteInput) linkNoteInput.value = '';
                fetchLinks();
                fetchNotice();
            } else {
                showStatus('發布失敗，請確認輸入');
            }
        } catch (error) {
            console.error('Error adding link:', error);
            showStatus('系統錯誤');
        } finally {
            loadingState.style.display = 'none';
            urlInput.disabled = false;
            addBtn.disabled = false;
            addBtn.textContent = '發布連結';
            urlInput.focus();
        }
    }

    async function deleteLink(id) {
        try {
            const response = await fetch(`/api/links/${id}`, { method: 'DELETE' });
            if (response.ok) {
                showStatus('刪除成功');
                fetchLinks();
            } else {
                showStatus('刪除失敗');
            }
        } catch (error) {
            console.error('Error deleting link:', error);
            showStatus('系統錯誤');
        }
    }

    function renderLinks(links) {
        cardsContainer.innerHTML = '';
        cardsContainer.appendChild(loadingState);

        const sortedLinks = [...links].reverse();
        sortedLinks.forEach(link => {
            const card = createCardElement(link);
            cardsContainer.appendChild(card);
        });
    }

    function createCardElement(link) {
        const wrapper = document.createElement('div');
        wrapper.className = 'news-card-wrapper';

        const a = document.createElement('a');
        a.href = link.url;
        a.target = "_blank";
        a.className = 'news-card';

        // Delete Button: Restored to Old UI (Overlay Red X)
        // Note: Logic handles this via global delegation (closest .delete-btn)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.type = 'button';
        deleteBtn.innerHTML = '×';
        deleteBtn.setAttribute('data-id', link.id);
        deleteBtn.style.display = currentUserIsEditor ? 'flex' : 'none';



        // Fallback images
        const imgUrl = link.image || 'https://via.placeholder.com/600x400/e5e5e0/111111?text=無圖片';
        const faviconUrl = link.favicon || 'https://via.placeholder.com/32/e5e5e0/111111?text=+';
        const domain = new URL(link.url).hostname.replace('www.', '').toUpperCase();

        // Note Section
        const noteContainer = document.createElement('div');
        noteContainer.className = 'note-container';

        // Note Text
        const noteSpan = document.createElement('span');
        noteSpan.className = 'card-note';
        noteSpan.innerHTML = link.note ? `⚠️ ${link.note}` : '';
        noteSpan.style.display = link.note ? 'inline-block' : 'none';
        noteContainer.appendChild(noteSpan);

        // Edit Button
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-note-btn editor-only';
        editBtn.innerHTML = '✎';
        editBtn.title = '編輯備註';
        editBtn.style.display = currentUserIsEditor ? 'inline-block' : 'none';
        editBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleEditMode(noteContainer, link.id, link.note || '');
        };
        noteContainer.appendChild(editBtn);

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.style.flex = '1';
        contentDiv.style.display = 'flex';
        contentDiv.style.flexDirection = 'column';

        contentDiv.innerHTML = `
            <figure class="card-figure">
                <img src="${imgUrl}" alt="${link.title}" class="card-img" onerror="this.classList.add('hidden'); this.parentNode.classList.add('fallback-icon');">
            </figure>
            <span class="card-category">網路資源</span>
            <h3 class="card-headline">${link.title}</h3>
        `;
        contentDiv.appendChild(noteContainer);

        const summaryAndMeta = document.createElement('div');
        summaryAndMeta.innerHTML = `
            <p class="card-summary">${link.description}</p>
            <div class="card-meta">
                <img src="${faviconUrl}" alt="" class="card-favicon" onerror="this.style.display='none'">
                <span>${domain}</span>
            </div>
        `;
        contentDiv.appendChild(summaryAndMeta);

        a.appendChild(contentDiv);

        wrapper.appendChild(deleteBtn); // Append button first or last, position absolute handles it
        wrapper.appendChild(a);

        return wrapper;
    }

    function toggleEditMode(container, linkId, currentNote) {
        if (container.querySelector('input')) return;

        container.classList.add('editing');
        const originalHtml = container.innerHTML; // Note: we are wiping it
        container.innerHTML = '';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentNote;
        input.className = 'note-edit-input';
        input.placeholder = '輸入備註...';

        const saveBtn = document.createElement('button');
        saveBtn.innerText = '✓';
        saveBtn.className = 'note-save-btn';
        saveBtn.type = 'button';

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = '✗';
        cancelBtn.className = 'note-cancel-btn';
        cancelBtn.type = 'button';

        // Checkbox container
        const checkboxLabel = document.createElement('label');
        checkboxLabel.className = 'note-sync-label';
        checkboxLabel.style.display = 'flex';
        checkboxLabel.style.alignItems = 'center';
        checkboxLabel.style.marginLeft = '0.5rem';
        checkboxLabel.style.fontSize = '0.75rem';
        checkboxLabel.style.cursor = 'pointer';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'note-sync-checkbox';
        checkbox.style.marginRight = '0.25rem';

        checkboxLabel.appendChild(checkbox);
        checkboxLabel.appendChild(document.createTextNode('同步公告'));

        // Events
        input.onclick = (e) => { e.preventDefault(); e.stopPropagation(); };
        checkboxLabel.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if (e.target !== checkbox) checkbox.click(); }; // Helper for label click
        checkbox.onclick = (e) => { e.stopPropagation(); };

        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveNote(linkId, input.value, container, checkbox.checked);
            }
        };

        saveBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            saveNote(linkId, input.value, container, checkbox.checked);
        };

        cancelBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            fetchLinks();
        };

        container.appendChild(input);
        container.appendChild(checkboxLabel);
        container.appendChild(saveBtn);
        container.appendChild(cancelBtn);
        input.focus();
    }

    async function saveNote(linkId, newNote, container, addToNotice) {
        try {
            const response = await fetch(`/api/links/${linkId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: newNote, addToNotice: addToNotice })
            });

            if (response.ok) {
                fetchLinks();
                if (addToNotice) fetchNotice();
            } else {
                showStatus('更新失敗');
            }
        } catch (error) {
            console.error('Error updating note:', error);
            showStatus('系統錯誤');
        }
    }
});
