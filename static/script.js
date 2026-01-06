document.addEventListener('DOMContentLoaded', () => {
    // --- Selectors ---
    const urlInput = document.getElementById('urlInput');
    const linkNoteInput = document.getElementById('linkNoteInput');
    const addBtn = document.getElementById('addBtn');
    const cardsContainer = document.getElementById('cardsContainer');
    const loadingState = document.getElementById('js-loading-indicator');
    const noticeDisplay = document.getElementById('noticeDisplay');
    const noticeInput = document.getElementById('noticeInput');
    const saveNoticeBtn = document.getElementById('saveNoticeBtn');
    const authLink = document.getElementById('authLink');
    const statusDiv = document.getElementById('systemStatus');

    // --- State ---
    let currentUserIsEditor = false;
    let linksData = [];
    let noticesData = [];

    // --- Initialization ---
    init();

    async function init() {
        checkAuth();
        await loadFromStorage();
        renderLinks();
        renderNotices();
    }

    async function loadFromStorage() {
        // 1. Try to load from window.SERVER_DATA (Static Site / Server Rendered)
        if (window.SERVER_DATA) {
            // We prioritize server data if available (fresh deployment)
            if (!localStorage.getItem('site_links') && window.SERVER_DATA.links) {
                linksData = window.SERVER_DATA.links;
                saveLinksToStorage(); // Save to local storage for future edits
            } else {
                // Load from storage as usual
                const storedLinks = localStorage.getItem('site_links');
                linksData = storedLinks ? JSON.parse(storedLinks) : [];
            }

            if (!localStorage.getItem('site_notices') && window.SERVER_DATA.notices) {
                noticesData = window.SERVER_DATA.notices;
                saveNoticesToStorage();
            } else {
                const storedNotices = localStorage.getItem('site_notices');
                noticesData = storedNotices ? JSON.parse(storedNotices) : [];
            }
        } else {
            // Fallback for purely local dev without backend
            // Load Links
            const storedLinks = localStorage.getItem('site_links');
            if (storedLinks) {
                linksData = JSON.parse(storedLinks);
            } else {
                // Fetch links.json
                try {
                    const response = await fetch('./links.json');
                    if (response.ok) {
                        linksData = await response.json();
                    }
                } catch (e) {
                    console.error("Failed to load links.json", e);
                }
            }

            // Load Notices
            const storedNotices = localStorage.getItem('site_notices');
            if (storedNotices) {
                noticesData = JSON.parse(storedNotices);
            } else {
                // Fetch notice.txt
                try {
                    const response = await fetch('./notice.txt');
                    if (response.ok) {
                        const text = await response.text();
                        if (text.trim()) {
                            noticesData = [{
                                id: generateUUID(),
                                content: text.trim(),
                                created_at: Date.now() / 1000
                            }];
                        }
                    }
                } catch (e) {
                    console.error("Failed to load notice.txt", e);
                }
            }
        }

        // Hide loading
        if (loadingState) loadingState.style.display = 'none';
    }

    function saveLinksToStorage() {
        localStorage.setItem('site_links', JSON.stringify(linksData));
    }

    function saveNoticesToStorage() {
        localStorage.setItem('site_notices', JSON.stringify(noticesData));
    }

    // --- Auth Logic ---
    function checkAuth() {
        // Simple client-side check from LocalStorage set by login.html
        currentUserIsEditor = localStorage.getItem('is_editor') === 'true';

        updateUIForAuth();

        if (currentUserIsEditor) {
            authLink.textContent = '[ 登出系統 ]';
            authLink.href = '#';
            authLink.onclick = (e) => {
                e.preventDefault();
                logout();
            };
        } else {
            authLink.textContent = '[ 編輯者登入 ]';
            authLink.href = 'login.html';
        }
    }

    function logout() {
        localStorage.removeItem('is_editor');
        location.href = './';
    }

    function updateUIForAuth() {
        // Update UI visibility
        document.querySelectorAll('.editor-only').forEach(el => {
            el.style.display = currentUserIsEditor ? 'flex' : 'none';
        });
        // Update specific elements that might be inline
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.style.display = currentUserIsEditor ? 'flex' : 'none';
        });
        document.querySelectorAll('.notice-delete-btn').forEach(btn => {
            btn.style.display = currentUserIsEditor ? 'inline-flex' : 'none';
        });
        document.querySelectorAll('.edit-note-btn').forEach(btn => {
            btn.style.display = currentUserIsEditor ? 'inline-block' : 'none';
        });
    }

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
            modal.style.display = 'flex';

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

    // --- Core: Event Delegation ---
    document.addEventListener('click', async (e) => {
        const target = e.target;

        // 1. Clear Notice
        const clearBtn = target.closest('#clearNoticeBtn');
        if (clearBtn) {
            e.preventDefault();
            const confirmed = await showConfirm('確定要清除所有公告嗎？');
            if (confirmed) {
                noticesData = [];
                saveNoticesToStorage();
                renderNotices();
                showStatus('公告已清除');
            }
            return;
        }

        // 2. Link Delete
        const deleteBtn = target.closest('.delete-btn');
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const linkId = parseInt(deleteBtn.getAttribute('data-id'));
            if (linkId) {
                const confirmed = await showConfirm('確定要永久刪除這個連結嗎？');
                if (confirmed) {
                    linksData = linksData.filter(l => l.id !== linkId);
                    saveLinksToStorage();
                    renderLinks();
                    showStatus('刪除成功');
                }
            }
            return;
        }
    });


    // --- Notice Logic ---
    saveNoticeBtn.addEventListener('click', () => {
        const text = noticeInput.value.trim();
        if (text) {
            addNotice(text);
            noticeInput.value = '';
        }
    });

    function addNotice(text) {
        const newNotice = {
            id: generateUUID(),
            content: text,
            created_at: Date.now() / 1000
        };
        noticesData.push(newNotice);
        saveNoticesToStorage();
        renderNotices();
    }

    function deleteNotice(id) {
        noticesData = noticesData.filter(n => n.id !== id);
        saveNoticesToStorage();
        renderNotices();
    }

    // Allow deleting notice via onclick in rendered HTML, but use delegation if possible.
    // Since we re-render, delegation is cleaner, but let's stick to the inline onclick binding used below for simplicity in porting.

    function renderNotices() {
        if (!noticeDisplay) return;

        if (!noticesData || noticesData.length === 0) {
            noticeDisplay.innerHTML = '<span style="color: var(--neutral-500); font-weight: normal; font-size: 1rem;">(暫無重要公告)</span>';
            return;
        }

        noticeDisplay.innerHTML = '';
        const ul = document.createElement('ul');
        ul.className = 'notice-grid';
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';

        noticesData.forEach(notice => {
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
            btn.onclick = () => deleteNotice(notice.id);

            li.appendChild(btn);
            ul.appendChild(li);
        });
        noticeDisplay.appendChild(ul);
    }


    // --- Link Logic ---
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            // 1. Export links
            downloadData('links.json', JSON.stringify(linksData, null, 2));

            // 2. Export notices
            if (noticesData.length > 0) {
                // We save notices as JSON to preserve IDs and structure
                downloadData('notice.txt', JSON.stringify(noticesData, null, 2));
            }

            alert('資料匯出完成！\n\n1. "links.json" (連結)\n2. "notice.txt" (公告)\n\n請將這兩個檔案覆蓋到您的專案資料夾中，然後上傳到 GitHub。');
        });
    }

    function downloadData(filename, content) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    addBtn.addEventListener('click', handleAddLink);

    // Keypress for inputs
    [urlInput, document.getElementById('titleInput')].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (input.id === 'urlInput') document.getElementById('titleInput').focus();
                else handleAddLink();
            }
        });
    });

    function handleAddLink() {
        const url = urlInput.value.trim();
        const title = document.getElementById('titleInput').value.trim();
        const desc = document.getElementById('descInput').value.trim();
        const img = document.getElementById('imgInput').value.trim();
        const note = linkNoteInput ? linkNoteInput.value.trim() : '';

        if (!url || !title) {
            showStatus('網址與標題為必填項目');
            return;
        }

        const newId = linksData.length > 0 ? Math.max(...linksData.map(l => l.id)) + 1 : 1;

        // Smart Notice Logic: Check for date pattern
        // Python: r'(\d{1,4}[-/]\d{1,2})'
        const datePattern = /(\d{1,4}[-\/]\d{1,2})/;
        if (note && datePattern.test(note)) {
            const noticeLinkHtml = ` <a href='${url}' target='_blank' style='text-decoration: underline; color: inherit;'>[${title}]</a>`;
            addNotice(note + noticeLinkHtml);
        }

        const newLink = {
            id: newId,
            url: url,
            title: title,
            description: desc,
            image: img || '',
            favicon: '',
            note: note
        };

        linksData.push(newLink);
        saveLinksToStorage();
        renderLinks();

        // Clear inputs
        urlInput.value = '';
        document.getElementById('titleInput').value = '';
        document.getElementById('descInput').value = '';
        document.getElementById('imgInput').value = '';
        if (linkNoteInput) linkNoteInput.value = '';

        showStatus('發布成功');
        urlInput.focus();
    }

    function renderLinks() {
        if (!cardsContainer) return;
        cardsContainer.innerHTML = '';
        // Note: loadingState is removed/hidden by init()

        const sortedLinks = [...linksData].reverse();
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

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.type = 'button';
        deleteBtn.innerHTML = '×';
        deleteBtn.setAttribute('data-id', link.id);
        deleteBtn.style.display = currentUserIsEditor ? 'flex' : 'none';

        const imgUrl = link.image || 'https://via.placeholder.com/600x400/e5e5e0/111111?text=無圖片';
        const hostname = new URL(link.url).hostname.replace('www.', '').toUpperCase();

        // Note Section
        const noteContainer = document.createElement('div');
        noteContainer.className = 'note-container';

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

        const summaryDiv = document.createElement('div');
        summaryDiv.innerHTML = `
            <p class="card-summary">${link.description || ''}</p>
            <div class="card-meta">
                <span>${hostname}</span>
            </div>
        `;
        contentDiv.appendChild(summaryDiv);

        a.appendChild(contentDiv);
        wrapper.appendChild(deleteBtn);
        wrapper.appendChild(a);

        return wrapper;
    }

    // --- Inline Editing Logic (Moved from old script) ---
    function toggleEditMode(container, linkId, currentNote) {
        if (container.querySelector('input')) return;

        container.classList.add('editing');
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
        checkboxLabel.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if (e.target !== checkbox) checkbox.click(); };
        checkbox.onclick = (e) => { e.stopPropagation(); };

        const doSave = () => {
            const newNote = input.value.trim();
            saveNoteInList(linkId, newNote, checkbox.checked);
        };

        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doSave();
            }
        };

        saveBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            doSave();
        };

        cancelBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            renderLinks(); // Re-render to restore original state
        };

        container.appendChild(input);
        container.appendChild(checkboxLabel);
        container.appendChild(saveBtn);
        container.appendChild(cancelBtn);
        input.focus();
    }

    function saveNoteInList(linkId, newNote, addToNotice) {
        const link = linksData.find(l => l.id === linkId);
        if (link) {
            link.note = newNote;
            saveLinksToStorage();

            if (addToNotice) {
                const noticeLinkHtml = ` <a href='${link.url}' target='_blank' style='text-decoration: underline; color: inherit;'>[${link.title}]</a>`;
                addNotice(newNote + noticeLinkHtml);
            }

            renderLinks();
            showStatus('備註已更新');
        }
    }

    // --- Image Upload Logic ---
    const imgUpload = document.getElementById('imgUpload');
    const imgInput = document.getElementById('imgInput');

    imgUpload.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        showStatus('正在處理圖片...', false);

        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                // Compress Image
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to Base64 (JPEG 0.7 quality)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

                // Set to input
                imgInput.value = dataUrl;
                showStatus('圖片已上傳');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // --- Helper ---
    function generateUUID() { // Simple UUID generator
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
});
