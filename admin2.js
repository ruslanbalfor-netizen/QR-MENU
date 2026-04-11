let supabaseClientLocal;
let activePlaceId = null;
let activePlaceSlug = null;
let activePlaceName = null;
let allCategories = [];
window.cachedPlaces = [];

document.addEventListener('DOMContentLoaded', async () => {
    supabaseClientLocal = window.supabaseClient;

    if (!supabaseClientLocal) {
        showToast("Supabase bağlantısı tapılmadı!", "error");
    } else {
        // Essential check: if no session, kick to login
        const { data: { session } } = await supabaseClientLocal.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
    }



    // ==== View Switching ====
    const navItems = document.querySelectorAll('.sidebar .nav-item');
    navItems.forEach(nav => {
        nav.addEventListener('click', (e) => {
            if (nav.style.pointerEvents === 'none') return;

            navItems.forEach(n => n.classList.remove('active'));
            nav.classList.add('active');

            document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
            document.getElementById(nav.dataset.view).classList.remove('hidden');

            // Render logic based on view
            if (nav.dataset.view === 'menu-view') {
                renderCategories();
                renderItems();
            } else if (nav.dataset.view === 'settings-view') {
                generateQrCode();
            } else if (nav.dataset.view === 'users-view') {
                loadUsers();
            }
        });
    });

    loadPlaces();

    // Restore saved admin logo
    const savedAdminLogo = localStorage.getItem('admin_panel_logo');
    if (savedAdminLogo) {
        const logoEl = document.getElementById('admin-sidebar-logo');
        if (logoEl) logoEl.src = savedAdminLogo;
    }

    // Quick Switcher Event
    const quickSelector = document.getElementById('quick-place-selector');
    if (quickSelector) {
        quickSelector.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            const place = window.cachedPlaces.find(p => p.id === selectedId);
            if (place) {
                selectPlace(place.id, place.name, place.slug);
            }
        });
    }
});

// ==== Authentication & Session ====
async function logout() {
    if (!supabaseClientLocal) return;
    const { error } = await supabaseClientLocal.auth.signOut();
    if (error) {
        showToast("Çıxış xətası: " + error.message, "error");
    } else {
        window.location.href = 'login.html';
    }
}
window.logout = logout;

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Escape HTML to prevent XSS
function escapeAdminHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==== General Modal Logic ====
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
window.closeModal = closeModal;

// ==== Tab Logic ====
function switchTab(prefix, lang, e) {
    const tabs = document.querySelectorAll(`#${prefix}-modal .lang-tab`);
    tabs.forEach(t => t.classList.remove('active'));
    
    const target = e ? e.target : (window.event ? window.event.target : null);
    if (target) target.classList.add('active');

    const fields = ['az', 'en', 'ru', 'ar'];
    fields.forEach(f => {
        const nameInput = document.getElementById(`${prefix}-v-name_${f}`);
        const descInput = document.getElementById(`${prefix}-v-desc_${f}`);
        if (nameInput) {
            nameInput.classList.toggle('hidden', f !== lang);
            if (f === lang) nameInput.required = true; else nameInput.required = false;
        }
        if (descInput) {
            descInput.classList.toggle('hidden', f !== lang);
        }
    });
}
window.switchTab = switchTab;

// ==== Image Preview Logic ====
window.previewImage = function (input, imgId) {
    const preview = document.getElementById(imgId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }
}

// ================= PLACES =================
async function loadPlaces() {
    try {
        if (!supabaseClientLocal) throw new Error("Supabase client is not initialized.");
        const { data, error } = await supabaseClientLocal.from('places').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        window.cachedPlaces = data;
        renderPlacesList(data);
        populateQuickSelector(data);

        // Auto-restore last active place
        const lastPlace = localStorage.getItem('last_active_place');
        if (lastPlace && !activePlaceId) {
            const p = JSON.parse(lastPlace);
            // Verify it still exists in the list
            if (data.find(d => d.id === p.id)) {
                selectPlace(p.id, p.name, p.slug);
                // Also update the sidebar link explicitly during init
                const viewSiteLink = document.getElementById('view-site-link');
                if (viewSiteLink) {
                    viewSiteLink.href = `index.html?place=${p.slug}`;
                }
            }
        }

    } catch (e) {
        console.error("Load Places Error:", e);
        const list = document.getElementById('places-list');
        if (list) list.innerHTML = `<div style="color:var(--danger); padding:20px;">
            <h4>Məkanları yükləmək mümkün olmadı</h4>
            <p>${e.message}</p>
            <small>Yoxlayın: Supabase bağlantısı və RLS siyasətləri.</small>
        </div>`;
    }
}

function renderPlacesList(data) {
    const list = document.getElementById('places-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (data.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px;">Heç bir məkan yoxdur. "Yeni Məkan Yarat" düyməsindən istifadə edin.</div>';
        return;
    }

    data.forEach(place => {
        const item = document.createElement('div');
        item.className = 'data-item';

        const isActive = activePlaceId === place.id;
        const activeBadge = isActive ? '<span style="background:var(--secondary);color:white;padding:2px 8px;border-radius:12px;font-size:0.7rem;">Aktiv</span>' : '';

        const safeName = escapeAdminHTML(place.name);
        const safeSlug = escapeAdminHTML(place.slug);

        item.innerHTML = `
            <div class="data-info">
                <h4>${safeName} ${activeBadge}</h4>
                <p>Link: /?place=${safeSlug} • Valyuta: ${escapeAdminHTML(place.currency)}</p>
            </div>
            <div class="data-actions">
                <button class="btn btn-secondary" onclick="window._userClickedManage=true; selectPlace('${place.id}', '${safeName}', '${safeSlug}')"><i class="fa-solid fa-arrow-right"></i> İdarə Et</button>
                <button class="btn btn-outline" onclick="openPlaceModal('${place.id}')"><i class="fa-solid fa-pen"></i></button>
                ${!isActive ? `<button class="btn btn-danger" onclick="deletePlace('${place.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
        `;
        list.appendChild(item);
    });
}

function populateQuickSelector(data) {
    const selector = document.getElementById('quick-place-selector');
    if (!selector) return;
    
    selector.innerHTML = '<option value="" disabled selected>Məkan Seçin...</option>';
    data.forEach(place => {
        const opt = document.createElement('option');
        opt.value = place.id;
        opt.textContent = place.name;
        if (place.id === activePlaceId) opt.selected = true;
        selector.appendChild(opt);
    });
}

function selectPlace(id, name, slug) {
    activePlaceId = id;
    activePlaceSlug = slug;

    // Save to localStorage for persistence
    localStorage.setItem('last_active_place', JSON.stringify({id, name, slug}));

    // Update UI Badges & unlock menus
    const activeBadge = document.getElementById('active-place-badge');
    if (activeBadge) activeBadge.classList.remove('hidden');

    const quickSelector = document.getElementById('quick-place-selector');
    if (quickSelector) quickSelector.value = id;

    const navMenu = document.getElementById('nav-menu');
    if (navMenu) {
        navMenu.style.opacity = '1';
        navMenu.style.pointerEvents = 'auto';
    }

    const navSettings = document.getElementById('nav-settings');
    if (navSettings) {
        navSettings.style.opacity = '1';
        navSettings.style.pointerEvents = 'auto';
    }

    // Update View Site link
    const viewSiteLink = document.getElementById('view-site-link');
    if (viewSiteLink) {
        viewSiteLink.href = `index.html?place=${slug}`;
    }

    localStorage.setItem('activePlaceId', id);
    localStorage.setItem('activePlaceName', name);
    localStorage.setItem('activePlaceSlug', slug);

    // Restore custom domain from memory if exists
    const savedDomain = localStorage.getItem('qr_custom_domain_' + id);
    const customDomainEl = document.getElementById('custom-domain');
    if (customDomainEl) {
        customDomainEl.value = savedDomain || '';
    }

    // Reload places to show active badge in list
    renderPlacesList(window.cachedPlaces);

    // Switch to menu view automatically ONLY if user explicitly clicked "İdarə Et"
    // Don't auto-switch on page load
    if (window._userClickedManage) {
        const activeNav = document.querySelector('.sidebar .nav-item.active');
        if (activeNav && activeNav.dataset.view === 'places-view') {
            document.getElementById('nav-menu').click();
        }
        window._userClickedManage = false;
    }
}
window.selectPlace = selectPlace;

// Helper function to compress and resize an image before uploading
async function compressImage(file, folder) {
    let maxWidth = 800;
    let maxHeight = 800;

    if (folder === 'logos') {
        maxWidth = 400; maxHeight = 400;
    } else if (folder === 'covers') {
        maxWidth = 1200; maxHeight = 800;
    } else if (folder === 'items') {
        maxWidth = 600; maxHeight = 600;
    } else if (folder === 'categories') {
        maxWidth = 300; maxHeight = 300;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // Fill with white first to prevent transparent PNGs from turning black in JPEG
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height);
                
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        // Create a new File object from the Blob
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    } else {
                        resolve(file); // Fallback to original if compression fails
                    }
                }, 'image/jpeg', 0.8); // 80% quality JPEG
            };
            img.onerror = () => resolve(file); // Fallback to original on error
        };
        reader.onerror = () => resolve(file);
    });
}

// Helper function to upload an image to Supabase Storage
async function uploadImage(file, folder) {
    if (!file) return null;
    const fileExt = 'jpg'; // We compress everything to JPEG
    const fileName = `${folder}/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;

    // Compress the image before uploading
    const compressedFile = await compressImage(file, folder);

    const { data, error } = await supabaseClientLocal.storage
        .from('qr-menu-images')
        .upload(fileName, compressedFile, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error("Upload error:", error);
        throw new Error("Şəkil yüklənərkən xəta baş verdi: " + error.message);
    }

    const { data: publicUrlData } = supabaseClientLocal.storage
        .from('qr-menu-images')
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
}

// Helper function to delete a file from Supabase Storage
async function deleteFileFromStorage(url) {
    if (!url || !url.includes('qr-menu-images')) return;
    try {
        const path = url.split('/qr-menu-images/')[1];
        if (path) {
            await supabaseClientLocal.storage.from('qr-menu-images').remove([path]);
        }
    } catch (e) {
        console.error("Storage delete error:", e);
    }
}

// Place Form Submit (Create or Update)
document.getElementById('place-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('place-save-btn');
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gözləyin...';
    btn.disabled = true;

    try {
        const id = document.getElementById('place-v-id').value;
        const name = document.getElementById('place-v-name').value;
        const slug = document.getElementById('place-v-slug').value.toLowerCase();
        const currency = document.getElementById('place-v-currency').value;
        const service_charge = parseInt(document.getElementById('place-v-service-charge').value) || 0;

        // Handle File Uploads
        let logo = document.getElementById('place-v-logo').value; // Keep existing if no new file
        let cover = document.getElementById('place-v-cover').value;

        const phone = document.getElementById('place-v-phone').value || null;
        const whatsapp = document.getElementById('place-v-whatsapp').value || null;
        const instagram = document.getElementById('place-v-instagram').value || null;
        const facebook = document.getElementById('place-v-facebook').value || null;
        const google_url = document.getElementById('place-v-google').value || null;
        const theme_variant = document.getElementById('place-v-theme').value || 'default';

        const logoFile = document.getElementById('place-v-logo-file').files[0];
        const coverFile = document.getElementById('place-v-cover-file').files[0];

        if (logoFile) {
            // Delete old logo if it exists
            const oldLogo = document.getElementById('place-v-logo').value;
            if (oldLogo) await deleteFileFromStorage(oldLogo);
            logo = await uploadImage(logoFile, 'logos');
        }
        if (coverFile) {
            // Delete old cover if it exists
            const oldCover = document.getElementById('place-v-cover').value;
            if (oldCover) await deleteFileFromStorage(oldCover);
            cover = await uploadImage(coverFile, 'covers');
        }

        const payload = { name, slug, currency, service_charge, logo, cover, phone, whatsapp, instagram, facebook, google_url, theme_variant };

        let error;
        if (id) {
            ({ error } = await supabaseClientLocal.from('places').update(payload).eq('id', id));
        } else {
            ({ error } = await supabaseClientLocal.from('places').insert([payload]));
        }

        if (error) throw error;

        closeModal('place-modal');
        loadPlaces();

        // Update active slug if edited active place
        if (id && id === activePlaceId) {
            activePlaceSlug = slug;
        }
        showToast("Məkan uğurla yadda saxlanıldı!");
    } catch (e) {
        showToast("Xəta: " + e.message, "error");
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
});

window.openPlaceModal = async function (id = null) {
    document.getElementById('place-form').reset();
    document.getElementById('place-v-id').value = '';
    document.getElementById('place-v-service-charge').value = '0';
    document.getElementById('place-v-theme').value = 'default';
    document.getElementById('place-modal-title').innerText = "Yeni Məkan";
    document.getElementById('place-logo-preview').style.display = 'none';
    document.getElementById('place-cover-preview').style.display = 'none';

    if (id) {
        document.getElementById('place-modal-title').innerText = "Məkanı Redaktə Et";
        const { data, error } = await supabaseClientLocal.from('places').select('*').eq('id', id).single();
        if (data) {
            document.getElementById('place-v-id').value = data.id;
            document.getElementById('place-v-name').value = data.name;
            document.getElementById('place-v-slug').value = data.slug;
            document.getElementById('place-v-currency').value = data.currency;
            document.getElementById('place-v-service-charge').value = data.service_charge || 0;

            document.getElementById('place-v-phone').value = data.phone || '';
            document.getElementById('place-v-whatsapp').value = data.whatsapp || '';
            document.getElementById('place-v-instagram').value = data.instagram || '';
            document.getElementById('place-v-facebook').value = data.facebook || '';
            document.getElementById('place-v-google').value = data.google_url || '';
            document.getElementById('place-v-theme').value = data.theme_variant || 'default';

            document.getElementById('place-v-logo').value = data.logo || '';
            document.getElementById('place-v-logo-file').value = '';
            const logoPreview = document.getElementById('place-logo-preview');
            if (data.logo) {
                logoPreview.src = data.logo;
                logoPreview.style.display = 'block';
            } else {
                logoPreview.style.display = 'none';
            }

            document.getElementById('place-v-cover').value = data.cover || '';
            document.getElementById('place-v-cover-file').value = '';
            const coverPreview = document.getElementById('place-cover-preview');
            if (data.cover) {
                coverPreview.src = data.cover;
                coverPreview.style.display = 'block';
            } else {
                coverPreview.style.display = 'none';
            }
        }
    }
    openModal('place-modal');
}

window.deletePlace = async function (id) {
    if (confirm('DIQQƏT: Məkanı silsəniz ona aid BÜTÜN kateqoriya və məhsullar, həmçinin şəkillər silinəcək. Davam edək?')) {
        try {
            // Find place to get images before deleting
            const { data: place, error: fetchError } = await supabaseClientLocal.from('places').select('logo, cover').eq('id', id).single();
            if (place) {
                if (place.logo) await deleteFileFromStorage(place.logo);
                if (place.cover) await deleteFileFromStorage(place.cover);
            }

            const { error } = await supabaseClientLocal.from('places').delete().eq('id', id);
            if (error) throw error;

            loadPlaces();
            showToast("Məkan silindi.");
        } catch (e) {
            showToast("Məkan silinərkən xəta: " + e.message, "error");
        }
    }
}


// ================= CATEGORIES =================
async function fetchCategories() {
    if (!activePlaceId) {
        return [];
    }
    const { data, error } = await supabaseClientLocal.from('categories').select('*').eq('place_id', activePlaceId).order('sort_order', { ascending: true, nullsFirst: false });
    if (error) { return []; }
    allCategories = data;

    // Update Item Filter Dropdown
    const filterSelect = document.getElementById('item-filter-category');
    filterSelect.innerHTML = '<option value="all">Bütün məhsullar</option>';

    // Update Item Modal Category Select
    const itemCatSelect = document.getElementById('item-v-category_id');
    itemCatSelect.innerHTML = '<option value="">-- Kateqoriya Seçin --</option>';

    data.forEach(c => {
        const name = c.name_az || c.name_en || c.name_ru || c.name_ar || c.id;
        filterSelect.innerHTML += `<option value="${c.id}">${name}</option>`;
        itemCatSelect.innerHTML += `<option value="${c.id}">${name}</option>`;
    });

    return data;
}

async function renderCategories() {
    const list = document.getElementById('category-list');
    list.innerHTML = 'Yüklənir...';
    try {
        const categories = await fetchCategories();
        list.innerHTML = '';
        if (categories.length === 0) {
            list.innerHTML = '<p style="color:var(--text-muted)">Heç bir kateqoriya yoxdur.</p>';
            return;
        }

        categories.forEach(cat => {
            const name = cat.name_az || cat.name_en || cat.name_ru || cat.name_ar || cat.id;
            const imgHtml = cat.image ? `<img src="${cat.image}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid #ddd;">` : `<div style="width:40px;height:40px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-image text-muted"></i></div>`;

            const isActive = cat.is_active !== false;
            const opacityStyle = isActive ? '' : 'opacity:0.6; background-color:#f8f9fa;';
            const statusBadge = isActive ? '' : '<span style="color:var(--danger); font-size:0.8rem; margin-left:10px;"><i class="fa-solid fa-eye-slash"></i> Passiv</span>';
            const toggleIcon = isActive ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';

            const item = document.createElement('div');
            item.className = 'data-item';
            item.style.cssText = opacityStyle;
            item.innerHTML = `
                <div class="data-info" style="display:flex; gap:15px; align-items:center;">
                    ${imgHtml}
                    <div>
                        <h4>${name} ${statusBadge}</h4>
                        <p>ID: ${cat.id} <span style="margin-left:8px; color:#2563eb; font-weight:bold;">| Sıra: ${cat.sort_order || 0}</span></p>
                    </div>
                </div>
                <div class="data-actions">
                    <button class="btn btn-outline" title="Aktiv/Passiv" onclick="toggleCategoryActive('${cat.id}', ${!isActive})">${toggleIcon}</button>
                    <button class="btn btn-outline" onclick="openCategoryModal('${cat.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger" onclick="deleteCategory('${cat.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (e) {
        list.innerHTML = "Xəta: " + e.message;
    }
}

window.toggleCategoryActive = async function (id, makeActive) {
    try {
        const { error } = await supabaseClientLocal.from('categories').update({ is_active: makeActive }).eq('id', id);
        if (error) throw error;
        renderCategories();
        showToast(makeActive ? "Kateqoriya aktiv edildi." : "Kateqoriya passiv (gizli) edildi.");
    } catch (e) {
        showToast("Status dəyişərkən xəta: " + e.message, "error");
    }
}

document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activePlaceId) return;

    const btn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gözləyin...';
    btn.disabled = true;

    try {
        let id = document.getElementById('cat-v-id').value;
        const nameAz = document.getElementById('cat-v-name_az').value;
        const nameEn = document.getElementById('cat-v-name_en').value || null;
        const nameRu = document.getElementById('cat-v-name_ru').value || null;
        const nameAr = document.getElementById('cat-v-name_ar').value || null;

        // Auto-generate ID from AZ name if creating new
        if (!id) {
            id = nameAz.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            if (!id) id = 'cat-' + Math.floor(Math.random() * 10000);
        }

        let image = document.getElementById('cat-v-image').value;
        const imageFile = document.getElementById('cat-v-image-file').files[0];

        if (imageFile) {
            // Delete old image if it exists
            if (image) await deleteFileFromStorage(image);
            image = await uploadImage(imageFile, 'categories');
        }

        const payload = {
            id: id,
            place_id: activePlaceId,
            name_az: nameAz,
            name_en: nameEn,
            name_ru: nameRu,
            name_ar: nameAr,
            image: image || null,
            sort_order: parseInt(document.getElementById('cat-v-sort_order').value) || 0,
            is_active: document.getElementById('cat-v-is_active').checked
        };

        const { error } = await supabaseClientLocal.from('categories').upsert([payload]);

        if (error) throw error;
        closeModal('category-modal');
        renderCategories();
        renderItems();
        showToast("Kateqoriya yadda saxlanıldı.");
    } catch (e) {
        showToast("Xəta: " + e.message, "error");
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
});

window.openCategoryModal = async function (id = null) {
    document.getElementById('category-form').reset();
    document.getElementById('cat-v-id').value = '';
    document.getElementById('cat-v-sort_order').value = '0';
    const activeBox = document.getElementById('cat-v-is_active');
    if (activeBox) activeBox.checked = true;
    document.getElementById('cat-preview-img').style.display = 'none';
    document.getElementById('cat-modal-title').innerText = "Yeni Kateqoriya";
    document.querySelector('#category-modal .lang-tabs .lang-tab:nth-child(1)').click(); // reset to AZ

    if (id) {
        document.getElementById('cat-modal-title').innerText = "Kateqoriyanı Redaktə Et";
        const target = allCategories.find(c => c.id === id);
        if (target) {
            document.getElementById('cat-v-id').value = target.id;
            document.getElementById('cat-v-sort_order').value = target.sort_order !== undefined ? target.sort_order : 0;
            const activeBoxEdit = document.getElementById('cat-v-is_active');
            if (activeBoxEdit) activeBoxEdit.checked = target.is_active !== false;
            document.getElementById('cat-v-name_az').value = target.name_az || '';
            document.getElementById('cat-v-name_en').value = target.name_en || '';
            document.getElementById('cat-v-name_ru').value = target.name_ru || '';
            document.getElementById('cat-v-name_ar').value = target.name_ar || '';
            document.getElementById('cat-v-image').value = target.image || '';
            document.getElementById('cat-v-image-file').value = '';

            const preview = document.getElementById('cat-preview-img');
            if (target.image) {
                preview.src = target.image;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        }
    }
    openModal('category-modal');
}

window.deleteCategory = async function (id) {
    if (confirm('Kateqoriyanı silsəniz, aid olan məhsullar və kateqoriya şəkli də silinəcək. Əminsiniz?')) {
        try {
            const target = allCategories.find(c => c.id === id);
            if (target && target.image) {
                await deleteFileFromStorage(target.image);
            }

            const { error } = await supabaseClientLocal.from('categories').delete().eq('id', id);
            if (error) throw error;

            renderCategories();
            renderItems();
            showToast("Kateqoriya silindi.");
        } catch (e) {
            showToast("Kateqoriya silinərkən xəta: " + e.message, "error");
        }
    }
}


// ================= ITEMS =================
window.renderItems = async function () {
    if (!activePlaceId) return;

    const list = document.getElementById('items-list');
    const filterCatId = document.getElementById('item-filter-category').value;

    list.innerHTML = 'Yüklənir...';

    try {
        // Fetch items logic - we must join or rely on JS filtering since items point to category.
        // We fetch all categories for this place, then fetch items matching those category IDs.
        const catIds = allCategories.map(c => c.id);
        if (catIds.length === 0) {
            list.innerHTML = '<p>Xahiş olunur öncə kateqoriya yaradın.</p>';
            return;
        }

        let query = supabaseClientLocal.from('items').select('*').in('category_id', catIds);
        if (filterCatId !== 'all') {
            query = supabaseClientLocal.from('items').select('*').eq('category_id', filterCatId);
        }

        const { data, error } = await query;
        if (error) throw error;

        list.innerHTML = '';
        if (data.length === 0) {
            list.innerHTML = '<p style="color:var(--text-muted)">Heç bir məhsul yoxdur.</p>';
            return;
        }

        data.forEach(item => {
            const name = item.name_az || item.name_en || item.name_ru || item.name_ar || "Adsız";
            const catInfo = allCategories.find(c => c.id === item.category_id);
            const catName = catInfo ? (catInfo.name_az || catInfo.id) : item.category_id;

            const isActive = item.is_active !== false;
            const opacityStyle = isActive ? '' : 'opacity:0.6; background-color:#f8f9fa;';
            const statusBadge = isActive ? '' : '<span style="color:var(--danger); font-size:0.8rem; margin-left:10px;"><i class="fa-solid fa-eye-slash"></i> Passiv</span>';
            const toggleIcon = isActive ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';

            const div = document.createElement('div');
            div.className = 'data-item';
            div.style.cssText = opacityStyle;
            div.innerHTML = `
                <div class="data-info" style="display:flex; gap:15px; align-items:center;">
                    <img src="${item.image}" alt="${name}" style="width:50px; height:50px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
                    <div>
                        <h4>${name} - <span style="color:var(--primary)">${item.price} AZN</span> ${statusBadge}</h4>
                        <p><i class="fa-solid fa-list text-muted"></i> Kateqoriya: ${catName}</p>
                    </div>
                </div>
                <div class="data-actions">
                    <button class="btn btn-outline" title="Aktiv/Passiv" onclick="toggleItemActive('${item.id}', ${!isActive})">${toggleIcon}</button>
                    <button class="btn btn-outline" onclick="openItemModal('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger" onclick="deleteItem('${item.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            list.appendChild(div);
        });

    } catch (e) {
        list.innerHTML = "Xəta: " + e.message;
    }
}

window.toggleItemActive = async function (id, makeActive) {
    try {
        const { error } = await supabaseClientLocal.from('items').update({ is_active: makeActive }).eq('id', id);
        if (error) throw error;
        renderItems();
        showToast(makeActive ? "Məhsul aktiv edildi." : "Məhsul passiv (gizli) edildi.");
    } catch (e) {
        showToast("Status dəyişərkən xəta: " + e.message, "error");
    }
}

document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activePlaceId) return;

    const btn = document.getElementById('item-save-btn');
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gözləyin...';
    btn.disabled = true;

    try {
        const id = document.getElementById('item-v-id').value;
        const catId = document.getElementById('item-v-category_id').value;

        const nameAz = document.getElementById('item-v-name_az').value;
        const nameEn = document.getElementById('item-v-name_en').value;
        const nameRu = document.getElementById('item-v-name_ru').value;
        const nameAr = document.getElementById('item-v-name_ar').value;

        const descAz = document.getElementById('item-v-desc_az').value;
        const descEn = document.getElementById('item-v-desc_en').value;
        const descRu = document.getElementById('item-v-desc_ru').value;
        const descAr = document.getElementById('item-v-desc_ar').value;

        const priceStr = document.getElementById('item-v-price').value;
        const price = parseFloat(priceStr.replace(',', '.'));
        const calories = document.getElementById('item-v-calories').value;
        const prepTime = document.getElementById('item-v-prep_time').value;

        let image = document.getElementById('item-v-image').value;
        const imageFile = document.getElementById('item-v-image-file').files[0];

        if (imageFile) {
            // Delete old image if it exists
            if (image) await deleteFileFromStorage(image);
            image = await uploadImage(imageFile, 'items');
        }

        const payload = {
            category_id: catId,
            name_az: nameAz,
            name_en: nameEn || null,
            name_ru: nameRu || null,
            name_ar: nameAr || null,
            desc_az: descAz,
            desc_en: descEn || null,
            desc_ru: descRu || null,
            desc_ar: descAr || null,
            price: price,
            image: image || null,
            calories: calories ? parseInt(calories) : null,
            prep_time: prepTime || null,
            is_kid_friendly: document.getElementById('item-v-is_kid_friendly').checked,
            is_active: document.getElementById('item-v-is_active').checked,
            badges: [
                document.getElementById('item-v-is_vegan') && document.getElementById('item-v-is_vegan').checked ? 'Vegan' : null,
                document.getElementById('item-v-is_gluten_free') && document.getElementById('item-v-is_gluten_free').checked ? 'Gluten Free' : null
            ].filter(Boolean)
        };

        let dbError;
        if (id) {
            const { error } = await supabaseClientLocal.from('items').update(payload).eq('id', id);
            dbError = error;
        } else {
            const { error } = await supabaseClientLocal.from('items').insert([payload]);
            dbError = error;
        }

        if (dbError) throw dbError;

        closeModal('item-modal');
        await renderItems();
        showToast("Məhsul yadda saxlanıldı.");
    } catch (e) {
        showToast("Xəta: " + e.message, "error");
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
});

window.openItemModal = async function (id = null) {
    document.getElementById('item-form').reset();
    document.getElementById('item-v-id').value = '';
    const activeBox = document.getElementById('item-v-is_active');
    if (activeBox) activeBox.checked = true;
    document.getElementById('item-preview-img').style.display = 'none';
    document.getElementById('item-modal-title').innerText = "Yeni Məhsul";
    document.querySelector('#item-modal .lang-tabs .lang-tab:nth-child(1)').click();

    if (id) {
        document.getElementById('item-modal-title').innerText = "Məhsulu Redaktə Et";
        const { data, error } = await supabaseClientLocal.from('items').select('*').eq('id', id).single();
        if (data) {
            document.getElementById('item-v-id').value = data.id;
            document.getElementById('item-v-category_id').value = data.category_id;

            document.getElementById('item-v-name_az').value = data.name_az || '';
            document.getElementById('item-v-name_en').value = data.name_en || '';
            document.getElementById('item-v-name_ru').value = data.name_ru || '';
            document.getElementById('item-v-name_ar').value = data.name_ar || '';

            document.getElementById('item-v-desc_az').value = data.desc_az || '';
            document.getElementById('item-v-desc_en').value = data.desc_en || '';
            document.getElementById('item-v-desc_ru').value = data.desc_ru || '';
            document.getElementById('item-v-desc_ar').value = data.desc_ar || '';

            document.getElementById('item-v-price').value = data.price;
            document.getElementById('item-v-image').value = data.image || '';
            document.getElementById('item-v-image-file').value = ''; // Reset file input

            const preview = document.getElementById('item-preview-img');
            if (data.image) {
                preview.src = data.image;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }

            document.getElementById('item-v-calories').value = data.calories || '';
            document.getElementById('item-v-prep_time').value = data.prep_time || '';
            const kidBox = document.getElementById('item-v-is_kid_friendly');
            if (kidBox) kidBox.checked = !!data.is_kid_friendly;
            const activeBoxEdit = document.getElementById('item-v-is_active');
            if (activeBoxEdit) activeBoxEdit.checked = data.is_active !== false;
            const veganBox = document.getElementById('item-v-is_vegan');
            if (veganBox) veganBox.checked = data.badges && data.badges.includes('Vegan');
            const glutenBox = document.getElementById('item-v-is_gluten_free');
            if (glutenBox) glutenBox.checked = data.badges && data.badges.includes('Gluten Free');
        }
    }
    openModal('item-modal');
}

window.deleteItem = async function (id) {
    if (confirm('Məhsulu silmək istəyirsiniz?')) {
        try {
            // Find item to get image before deleting
            const { data: item, error: fetchError } = await supabaseClientLocal.from('items').select('image').eq('id', id).single();
            if (item && item.image) {
                await deleteFileFromStorage(item.image);
            }

            const { error } = await supabaseClientLocal.from('items').delete().eq('id', id);
            if (error) throw error;

            renderItems();
            showToast("Məhsul silindi.");
        } catch (e) {
            showToast("Məhsul silinərkən xəta: " + e.message, "error");
        }
    }
}

// ================= SETTINGS / QR CODE =================
function generateQrCode() {
    if (!activePlaceId || !activePlaceSlug) {
        return;
    }

    let baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
    
    // Əgər istifadəçi faylı lokal (file:///) açırsa, avtomatik canlı linki istifadə edək
    if (window.location.protocol === 'file:') {
        baseUrl = 'https://ruisqr.com/index.html';
    }

    const customDomainEl = document.getElementById('custom-domain');

    // Əgər istifadəçi xüsusi domen daxil edibsə, onu tamamilə istifadə et (əvvəl file:/// əlavə etmədən)
    if (customDomainEl && customDomainEl.value.trim() !== '') {
        let cd = customDomainEl.value.trim();
        // Geri qaçış kimi slashləri (/) təmizləmək
        if (!cd.endsWith('/')) cd += '/';
        baseUrl = cd + "index.html";

        // Əgər adam "https://" yazmayıbsa əlavə edək (http-siz xətaların qarşısını almaq üçün)
        if (!baseUrl.startsWith('http')) {
            baseUrl = 'https://' + baseUrl;
        }
    }

    const qrUrl = baseUrl + "?place=" + activePlaceSlug;

    // QR Code API
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrUrl)}&margin=10`;

    document.getElementById('main-qr-img').src = qrApi;

    const previewLink = document.getElementById('qr-preview-link');
    previewLink.href = qrUrl;
}

window.downloadQR = async function () {
    const src = document.getElementById('main-qr-img').src;
    try {
        const response = await fetch(src);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${activePlaceSlug}-qr-menu.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showToast("QR Kod yüklənir...");
    } catch (e) {
        showToast("QR yüklənərkən xəta yarandı.", "error");
    }
}

window.saveCustomDomain = function() {
    if (!activePlaceId) return;
    const customDomainEl = document.getElementById('custom-domain');
    if (!customDomainEl) return;
    
    const domain = customDomainEl.value.trim();
    localStorage.setItem('qr_custom_domain_' + activePlaceId, domain);
    
    const btn = document.getElementById('save-domain-btn');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Saxlandı';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    }
}

window.logout = async function() {
    if (confirm("Sistemdən çıxış etmək istəyirsiniz?")) {
        const { error } = await supabaseClientLocal.auth.signOut();
        if (error) alert("Çıxış xətası: " + error.message);
        window.location.href = 'login.html';
    }
}


// ================= ADMIN PANEL LOGO =================

window.uploadAdminLogo = async function (input) {
    if (!input.files || !input.files[0]) return;
    try {
        showToast("Loqo yüklənir...");
        const logoUrl = await uploadImage(input.files[0], 'logos');
        if (logoUrl) {
            localStorage.setItem('admin_panel_logo', logoUrl);
            const logoEl = document.getElementById('admin-sidebar-logo');
            if (logoEl) logoEl.src = logoUrl;
            showToast("Admin panel loqosu uğurla dəyişdirildi!");
        }
    } catch (e) {
        showToast("Loqo yüklənərkən xəta: " + e.message, "error");
    }
    input.value = ''; // Reset file input
}


// ================= USERS / PLACE ADMINS =================

let cachedUserAssignments = [];
let activeUserTab = 'super_admin';

async function loadUsers() {
    try {
        const { data, error } = await supabaseClientLocal
            .from('place_admins')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        cachedUserAssignments = data || [];

        // Update counts
        const superCount = cachedUserAssignments.filter(u => u.role === 'super_admin').length;
        const placeCount = cachedUserAssignments.filter(u => u.role === 'place_admin').length;
        const superCountEl = document.getElementById('count-super-admins');
        const placeCountEl = document.getElementById('count-place-admins');
        if (superCountEl) superCountEl.textContent = superCount;
        if (placeCountEl) placeCountEl.textContent = placeCount;

        renderUsersList();
    } catch (e) {
        console.error('Load Users Error:', e);
        const list = document.getElementById('users-list');
        if (list) list.innerHTML = `<div style="color:#dc3545; padding:20px;">
            <h4>İstifadəçi məlumatlarını yükləmək mümkün olmadı</h4>
            <p>${e.message}</p>
            <small>Yoxlayın: place_admins cədvəli yaradılıb mı? create_place_admins.sql-i Supabase SQL Editor-da icra edin.</small>
        </div>`;
    }
}

window.switchUserTab = function (tab) {
    activeUserTab = tab;

    // Update tab styles
    document.getElementById('tab-super-admins').classList.toggle('active', tab === 'super_admin');
    document.getElementById('tab-place-admins').classList.toggle('active', tab === 'place_admin');

    renderUsersList();
}

function renderUsersList() {
    const list = document.getElementById('users-list');
    if (!list) return;
    list.innerHTML = '';

    const filtered = cachedUserAssignments.filter(u => u.role === activeUserTab);

    if (filtered.length === 0) {
        const emptyMsg = activeUserTab === 'super_admin'
            ? 'Heç bir super admin qeydə alınmayıb.'
            : 'Heç bir məkan admini (müştəri) qeydə alınmayıb.';
        list.innerHTML = `<div style="text-align:center; padding:30px; color:#6c757d;"><i class="fa-solid fa-users-slash" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>${emptyMsg}</div>`;
        return;
    }

    filtered.forEach(record => {
        const place = window.cachedPlaces.find(p => p.id === record.place_id);
        const placeName = place ? escapeAdminHTML(place.name) : (record.place_id ? 'Naməlum Məkan' : '— (Bütün məkanlar)');

        const isActive = record.is_active !== false;
        const opacityStyle = isActive ? '' : 'opacity:0.6; background-color:#f8f9fa;';

        const roleIcon = record.role === 'super_admin'
            ? '<i class="fa-solid fa-shield-halved" style="color:#dc3545; margin-right:8px;"></i>'
            : '<i class="fa-solid fa-store" style="color:#007bff; margin-right:8px;"></i>';

        const roleLabel = record.role === 'super_admin'
            ? '<span style="background:#dc3545;color:white;padding:2px 8px;border-radius:12px;font-size:0.75rem;">Super Admin</span>'
            : '<span style="background:#007bff;color:white;padding:2px 8px;border-radius:12px;font-size:0.75rem;">Məkan Admini</span>';

        const statusBadge = isActive
            ? '<span style="background:#28a745;color:white;padding:2px 8px;border-radius:12px;font-size:0.75rem;margin-left:6px;">Aktiv</span>'
            : '<span style="background:#6c757d;color:white;padding:2px 8px;border-radius:12px;font-size:0.75rem;margin-left:6px;">Passiv</span>';

        const toggleChecked = isActive ? 'checked' : '';

        const item = document.createElement('div');
        item.className = 'data-item';
        item.style.cssText = opacityStyle;
        item.innerHTML = `
            <div class="data-info" style="flex:1;">
                <h4>${roleIcon} ${escapeAdminHTML(record.user_id.substring(0, 8))}... ${roleLabel} ${statusBadge}</h4>
                <p><i class="fa-solid fa-store" style="margin-right:5px;"></i> Məkan: ${placeName}</p>
                <p style="font-size:0.8rem; color:#adb5bd;">Yaradılıb: ${new Date(record.created_at).toLocaleDateString('az-AZ')}</p>
            </div>
            <div class="data-actions" style="align-items:center;">
                <label class="toggle-switch" title="${isActive ? 'Passiv et' : 'Aktiv et'}">
                    <input type="checkbox" ${toggleChecked} onchange="toggleUserActive('${record.id}', this.checked)">
                    <span class="slider"></span>
                </label>
                <button class="btn btn-danger" onclick="deleteUserAssignment('${record.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

window.openUserModal = function () {
    const form = document.getElementById('user-form');
    if (form) form.reset();
    document.getElementById('user-v-id').value = '';
    document.getElementById('user-modal-title').innerText = 'Yeni İstifadəçi-Məkan Əlaqəsi';

    // Populate place selector
    const placeSelect = document.getElementById('user-v-place_id');
    placeSelect.innerHTML = '<option value="">-- Məkan Seçin --</option>';
    window.cachedPlaces.forEach(p => {
        placeSelect.innerHTML += `<option value="${p.id}">${escapeAdminHTML(p.name)}</option>`;
    });

    openModal('user-modal');
}

// User form submit
const userForm = document.getElementById('user-form');
if (userForm) {
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('user-save-btn');
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gözləyin...';
        btn.disabled = true;

        try {
            const userId = document.getElementById('user-v-user_id').value.trim();
            const placeId = document.getElementById('user-v-place_id').value;
            const role = document.getElementById('user-v-role').value;

            if (!userId) throw new Error('User ID daxil edin');

            const payload = {
                user_id: userId,
                place_id: role === 'super_admin' ? null : placeId,
                role: role
            };

            if (role === 'place_admin' && !placeId) {
                throw new Error('Məkan admini üçün məkan seçilməlidir');
            }

            const { error } = await supabaseClientLocal.from('place_admins').insert([payload]);
            if (error) throw error;

            closeModal('user-modal');
            loadUsers();
            showToast('İstifadəçi-məkan əlaqəsi yaradıldı!');
        } catch (e) {
            showToast('Xəta: ' + e.message, 'error');
        } finally {
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }
    });
}

window.toggleUserActive = async function (id, makeActive) {
    try {
        const { error } = await supabaseClientLocal.from('place_admins').update({ is_active: makeActive }).eq('id', id);
        if (error) throw error;
        loadUsers();
        showToast(makeActive ? "İstifadəçi aktiv edildi." : "İstifadəçi passiv edildi.");
    } catch (e) {
        showToast("Status dəyişərkən xəta: " + e.message, "error");
    }
}

window.deleteUserAssignment = async function (id) {
    if (confirm('Bu istifadəçi-məkan əlaqəsini silmək istəyirsiniz? İstifadəçi daha bu məkanı idarə edə bilməyəcək.')) {
        try {
            const { error } = await supabaseClientLocal.from('place_admins').delete().eq('id', id);
            if (error) throw error;
            loadUsers();
            showToast('Əlaqə silindi.');
        } catch (e) {
            showToast('Əlaqə silinərkən xəta: ' + e.message, 'error');
        }
    }
}
