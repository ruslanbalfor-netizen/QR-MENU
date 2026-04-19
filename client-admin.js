/**
 * CLIENT ADMIN JS — Müştəri Admin Paneli üçün
 * Müştəri yalnız öz məkanını idarə edə bilər.
 * place_admins cədvəlindən istifadəçinin place_id-sini alır.
 */

let supabaseClientLocal;
let myPlaceId = null;
let myPlaceSlug = null;
let myPlaceName = null;
let hasVideoAccess = false;
let allCategories = [];
let presenceInterval = null;
let currentUserId = null;

// Func to update presence
async function updatePresence() {
    if (!currentUserId) return;
    try {
        await supabaseClientLocal.from('place_admins')
            .update({ last_seen: new Date().toISOString() })
            .eq('user_id', currentUserId);
    } catch (e) {
        console.warn("Presence update failed", e);
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    supabaseClientLocal = window.supabaseClient;

    if (!supabaseClientLocal) {
        showToast("Supabase bağlantısı tapılmadı!", "error");
        return;
    }

    // Auth check
    const { data: { session } } = await supabaseClientLocal.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // Get the user's place from place_admins
    const userId = session.user.id;
    const { data: adminData, error: adminError } = await supabaseClientLocal
        .from('place_admins')
        .select('place_id, role')
        .eq('user_id', userId);

    if (adminError) {
        showToast("İcazə xətası: " + adminError.message, "error");
        return;
    }

    // Find place_admin entry (not super_admin)
    const placeAdminEntry = adminData ? adminData.find(a => a.role === 'place_admin' && a.place_id) : null;
    currentUserId = userId;


    if (!placeAdminEntry) {
        showToast("Sizə heç bir məkan təyin edilməyib. Xahiş edirik admin ilə əlaqə saxlayın.", "error");
        document.querySelector('.main-content').innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; padding:40px;">
                <i class="fa-solid fa-lock" style="font-size:4rem; color:#dc3545; margin-bottom:20px;"></i>
                <h2 style="color:#212529;">Giriş İcazəsi Yoxdur</h2>
                <p style="color:#6c757d; max-width:400px;">Sizə heç bir məkan təyin edilməyib. Xahiş edirik RUIS QR admin ilə əlaqə saxlayın.</p>
                <a href="login.html" class="btn btn-primary" style="margin-top:20px;"><i class="fa-solid fa-arrow-left"></i> Geri Qayıt</a>
            </div>`;
        return;
    }

    myPlaceId = placeAdminEntry.place_id;

    // Load place data
    await loadMyPlace();

    // ==== View Switching ====
    const navItems = document.querySelectorAll('.sidebar .nav-item');
    navItems.forEach(nav => {
        nav.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            nav.classList.add('active');
            document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
            document.getElementById(nav.dataset.view).classList.remove('hidden');

            if (nav.dataset.view === 'menu-view') {
                renderCategories();
                renderItems();
            } else if (nav.dataset.view === 'qr-view') {
                generateQrCode();
            }
        });
    });

    // Start presence tracking (Heartbeat every 60 seconds)
    updatePresence();
    presenceInterval = setInterval(updatePresence, 60000);
});



// ==== Load Place Data ====
async function loadMyPlace() {
    try {
        const { data, error } = await supabaseClientLocal
            .from('places')
            .select('*')
            .eq('id', myPlaceId)
            .single();

        if (error) throw error;
        if (!data) throw new Error("Məkan tapılmadı");

        myPlaceSlug = data.slug;
        myPlaceName = data.name;
        hasVideoAccess = !!data.has_video_access;


        // Update sidebar info
        const placeInfoBox = document.getElementById('place-info-box');
        if (placeInfoBox) {
            placeInfoBox.style.display = 'block';
            document.getElementById('place-name-display').textContent = data.name;
        }

        // Update view site link
        const viewSiteLink = document.getElementById('view-site-link');
        if (viewSiteLink) {
            viewSiteLink.href = `index.html?place=${data.slug}`;
        }

        // Populate the place settings form
        populatePlaceForm(data);

    } catch (e) {
        console.error("Məkan yüklənərkən xəta:", e);
        showToast("Məkan yüklənərkən xəta: " + e.message, "error");
    }
}

function populatePlaceForm(data) {
    document.getElementById('place-v-id').value = data.id;
    document.getElementById('place-v-name').value = data.name || '';
    document.getElementById('place-v-currency').value = data.currency || 'AZN';
    document.getElementById('place-v-service-charge').value = data.service_charge || 0;
    document.getElementById('place-v-phone').value = data.phone || '';
    document.getElementById('place-v-whatsapp').value = data.whatsapp || '';
    document.getElementById('place-v-instagram').value = data.instagram || '';
    document.getElementById('place-v-facebook').value = data.facebook || '';
    document.getElementById('place-v-google').value = data.google_url || '';
    document.getElementById('place-v-theme').value = data.theme_variant || 'default';
    if(window.syncCustomThemeDropdown) window.syncCustomThemeDropdown();
    document.getElementById('place-v-logo').value = data.logo || '';
    document.getElementById('place-v-cover').value = data.cover || '';

    // Configure Video Access UI
    const coverFileInput = document.getElementById('place-v-cover-file');
    const videoBadge = document.getElementById('video-premium-badge');
    const coverLabel = document.getElementById('cover-label');
    const coverHint = document.getElementById('cover-hint');

    if (hasVideoAccess) {
        coverFileInput.accept = "image/*,video/mp4";
        if (videoBadge) videoBadge.style.display = 'block';
        if (coverLabel) coverLabel.innerText = "Ön Qapaq Şəkli və ya Video (Cover)";
        if (coverHint) coverHint.innerText = "Tövsiyə: 1200x600 px (Şəkil) və ya MP4 (Video). Maks: 10 MB.";
    } else {
        coverFileInput.accept = "image/*";
        if (videoBadge) videoBadge.style.display = 'none';
        if (coverLabel) coverLabel.innerText = "Ön Qapaq Şəkli (Cover)";
        if (coverHint) coverHint.innerText = "Tövsiyə: 1200x600 px, Maks: 300 KB (WebP/JPG)";
    }

    // Show existing images/videos
    const logoPreview = document.getElementById('place-logo-preview');
    if (data.logo) {
        logoPreview.src = data.logo;
        logoPreview.style.display = 'block';
    }
    
    const coverPreview = document.getElementById('place-cover-preview');
    const coverVideoPreview = document.getElementById('place-cover-video-preview');

    if (data.cover) {
        const isVideo = data.cover.toLowerCase().endsWith('.mp4');
        if (isVideo && coverVideoPreview) {
            coverVideoPreview.src = data.cover;
            coverVideoPreview.style.display = 'block';
            coverPreview.style.display = 'none';
        } else {
            coverPreview.src = data.cover;
            coverPreview.style.display = 'block';
            if (coverVideoPreview) {
                coverVideoPreview.src = '';
                coverVideoPreview.style.display = 'none';
            }
        }
    } else {
        coverPreview.style.display = 'none';
        if (coverVideoPreview) {
            coverVideoPreview.src = '';
            coverVideoPreview.style.display = 'none';
        }
    }
}



// ==== Place Settings Form Submit ====
document.getElementById('client-place-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('place-save-btn');
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gözləyin...';
    btn.disabled = true;

    try {
        const name = document.getElementById('place-v-name').value;
        const currency = document.getElementById('place-v-currency').value;
        const service_charge = parseInt(document.getElementById('place-v-service-charge').value) || 0;

        let logo = document.getElementById('place-v-logo').value;
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
            if (logo) await deleteFileFromStorage(logo);
            logo = await uploadImage(logoFile, 'logos');
        }
        if (coverFile) {
            if (cover) await deleteFileFromStorage(cover);
            cover = await uploadImage(coverFile, 'covers');
        }

        // NOTE: slug is NOT updated — müştəri slug-ı dəyişə bilməz
        const payload = { name, currency, service_charge, logo, cover, phone, whatsapp, instagram, facebook, google_url, theme_variant };

        const { error } = await supabaseClientLocal.from('places').update(payload).eq('id', myPlaceId);
        if (error) throw error;

        myPlaceName = name;
        document.getElementById('place-name-display').textContent = name;
        showToast("Məkan məlumatları uğurla yeniləndi!");

        // Reload form with updated data
        await loadMyPlace();

    } catch (e) {
        showToast("Xəta: " + e.message, "error");
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
});


// ==== Toast ====
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

// ==== XSS Prevention ====
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ==== Modal ====
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

    ['az', 'en', 'ru', 'ar'].forEach(f => {
        const nameInput = document.getElementById(`${prefix}-v-name_${f}`);
        const descInput = document.getElementById(`${prefix}-v-desc_${f}`);
        if (nameInput) {
            nameInput.classList.toggle('hidden', f !== lang);
            nameInput.required = (f === lang);
        }
        if (descInput) {
            descInput.classList.toggle('hidden', f !== lang);
        }
    });
}
window.switchTab = switchTab;

// ==== Image/Video Preview ====
window.previewImage = function (input, imgId) {
    const preview = document.getElementById(imgId);
    const videoPreview = document.getElementById(imgId.replace('preview', 'video-preview'));
    const file = input.files ? input.files[0] : null;

    if (file) {
        const isVideo = file.type.startsWith('video/');
        
        // Final check for video access security
        if (isVideo && !hasVideoAccess) {
            showToast("Video yükləmək üçün paketiniz uyğun deyil!", "error");
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            if (isVideo && videoPreview) {
                videoPreview.src = e.target.result;
                videoPreview.style.display = 'block';
                preview.style.display = 'none';
            } else {
                preview.src = e.target.result;
                preview.style.display = 'block';
                if (videoPreview) {
                    videoPreview.src = '';
                    videoPreview.style.display = 'none';
                }
            }
        }
        reader.readAsDataURL(file);
    } else {
        preview.src = '';
        preview.style.display = 'none';
        if (videoPreview) {
            videoPreview.src = '';
            videoPreview.style.display = 'none';
        }
    }
}



// ===================== IMAGE UPLOAD HELPERS =====================

async function compressImage(file, folder) {
    let maxWidth = 800, maxHeight = 800;
    if (folder === 'logos') { maxWidth = 400; maxHeight = 400; }
    else if (folder === 'covers') { maxWidth = 1200; maxHeight = 800; }
    else if (folder === 'items') { maxWidth = 600; maxHeight = 600; }
    else if (folder === 'categories') { maxWidth = 300; maxHeight = 300; }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                if (width > height) {
                    if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                } else {
                    if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                    } else { resolve(file); }
                }, 'image/jpeg', 0.8);
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
}

async function uploadImage(file, folder) {
    if (!file) return null;
    const isVideo = file.type.startsWith('video/');
    
    if (isVideo && !hasVideoAccess) {
        throw new Error("Video yükləmək icazəniz yoxdur.");
    }

    const fileExt = isVideo ? file.name.split('.').pop() : 'jpg'; 
    const fileName = `${folder}/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;

    let fileToUpload = file;
    if (!isVideo) {
        // Compress the image before uploading
        fileToUpload = await compressImage(file, folder);
    }

    const { data, error } = await supabaseClientLocal.storage
        .from('qr-menu-images')
        .upload(fileName, fileToUpload, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error("Upload error:", error);
        throw new Error((isVideo ? "Video" : "Şəkil") + " yüklənərkən xəta: " + error.message);
    }

    const { data: publicUrlData } = supabaseClientLocal.storage
        .from('qr-menu-images')
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
}


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


// ===================== CATEGORIES =====================

async function fetchCategories() {
    if (!myPlaceId) return [];
    const { data, error } = await supabaseClientLocal
        .from('categories')
        .select('*')
        .eq('place_id', myPlaceId)
        .order('sort_order', { ascending: true, nullsFirst: false });
    if (error) return [];
    allCategories = data;

    // Update filter dropdown
    const filterSelect = document.getElementById('item-filter-category');
    filterSelect.innerHTML = '<option value="all">Bütün məhsullar</option>';
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
            list.innerHTML = '<p style="color:#6c757d">Heç bir kateqoriya yoxdur.</p>';
            return;
        }
        categories.forEach(cat => {
            const name = cat.name_az || cat.name_en || cat.name_ru || cat.name_ar || cat.id;
            const imgHtml = cat.image
                ? `<img src="${cat.image}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid #ddd;">`
                : `<div style="width:40px;height:40px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-image text-muted"></i></div>`;
            const isActive = cat.is_active !== false;
            const opacityStyle = isActive ? '' : 'opacity:0.6; background-color:#f8f9fa;';
            const statusBadge = isActive ? '' : '<span style="color:#dc3545; font-size:0.8rem; margin-left:10px;"><i class="fa-solid fa-eye-slash"></i> Passiv</span>';
            const toggleIcon = isActive ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';

            const item = document.createElement('div');
            item.className = 'data-item';
            item.style.cssText = opacityStyle;
            item.innerHTML = `
                <div class="data-info" style="display:flex; gap:15px; align-items:center;">
                    ${imgHtml}
                    <div>
                        <h4>${escapeHTML(name)} ${statusBadge}</h4>
                        <p>ID: ${escapeHTML(cat.id)} <span style="margin-left:8px; color:#2563eb; font-weight:bold;">| Sıra: ${cat.sort_order || 0}</span></p>
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
        showToast(makeActive ? "Kateqoriya aktiv edildi." : "Kateqoriya passiv edildi.");
    } catch (e) {
        showToast("Status xətası: " + e.message, "error");
    }
};

document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!myPlaceId) return;
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

        if (!id) {
            id = nameAz.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            if (!id) id = 'cat-' + Math.floor(Math.random() * 10000);
        }

        let image = document.getElementById('cat-v-image').value;
        const imageFile = document.getElementById('cat-v-image-file').files[0];
        if (imageFile) {
            if (image) await deleteFileFromStorage(image);
            image = await uploadImage(imageFile, 'categories');
        }

        const payload = {
            id,
            place_id: myPlaceId,
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
    document.querySelector('#category-modal .lang-tabs .lang-tab:nth-child(1)').click();

    if (id) {
        document.getElementById('cat-modal-title').innerText = "Kateqoriyanı Redaktə Et";
        const target = allCategories.find(c => c.id === id);
        if (target) {
            document.getElementById('cat-v-id').value = target.id;
            document.getElementById('cat-v-sort_order').value = target.sort_order !== undefined ? target.sort_order : 0;
            if (activeBox) activeBox.checked = target.is_active !== false;
            document.getElementById('cat-v-name_az').value = target.name_az || '';
            document.getElementById('cat-v-name_en').value = target.name_en || '';
            document.getElementById('cat-v-name_ru').value = target.name_ru || '';
            document.getElementById('cat-v-name_ar').value = target.name_ar || '';
            document.getElementById('cat-v-image').value = target.image || '';
            document.getElementById('cat-v-image-file').value = '';
            const preview = document.getElementById('cat-preview-img');
            if (target.image) { preview.src = target.image; preview.style.display = 'block'; }
            else { preview.style.display = 'none'; }
        }
    }
    openModal('category-modal');
};

window.deleteCategory = async function (id) {
    if (confirm('Kateqoriyanı silsəniz, aid olan məhsullar da silinəcək. Əminsiniz?')) {
        try {
            const target = allCategories.find(c => c.id === id);
            if (target && target.image) await deleteFileFromStorage(target.image);
            const { error } = await supabaseClientLocal.from('categories').delete().eq('id', id);
            if (error) throw error;
            renderCategories();
            renderItems();
            showToast("Kateqoriya silindi.");
        } catch (e) {
            showToast("Kateqoriya silinərkən xəta: " + e.message, "error");
        }
    }
};


// ===================== ITEMS =====================

window.renderItems = async function () {
    if (!myPlaceId) return;
    const list = document.getElementById('items-list');
    const filterCatId = document.getElementById('item-filter-category').value;
    list.innerHTML = 'Yüklənir...';

    try {
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
            list.innerHTML = '<p style="color:#6c757d">Heç bir məhsul yoxdur.</p>';
            return;
        }

        data.forEach(item => {
            const name = item.name_az || item.name_en || item.name_ru || item.name_ar || "Adsız";
            const catInfo = allCategories.find(c => c.id === item.category_id);
            const catName = catInfo ? (catInfo.name_az || catInfo.id) : item.category_id;
            const isActive = item.is_active !== false;
            const opacityStyle = isActive ? '' : 'opacity:0.6; background-color:#f8f9fa;';
            const statusBadge = isActive ? '' : '<span style="color:#dc3545; font-size:0.8rem; margin-left:10px;"><i class="fa-solid fa-eye-slash"></i> Passiv</span>';
            const toggleIcon = isActive ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';

            const div = document.createElement('div');
            div.className = 'data-item';
            div.style.cssText = opacityStyle;
            div.innerHTML = `
                <div class="data-info" style="display:flex; gap:15px; align-items:center;">
                    <img src="${item.image}" alt="${escapeHTML(name)}" style="width:50px; height:50px; object-fit:cover; border-radius:8px; border:1px solid #ddd;">
                    <div>
                        <h4>${escapeHTML(name)} - <span style="color:#007bff">${item.price} AZN</span> ${statusBadge}</h4>
                        <p><i class="fa-solid fa-list text-muted"></i> Kateqoriya: ${escapeHTML(catName)}</p>
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
};

window.toggleItemActive = async function (id, makeActive) {
    try {
        const { error } = await supabaseClientLocal.from('items').update({ is_active: makeActive }).eq('id', id);
        if (error) throw error;
        renderItems();
        showToast(makeActive ? "Məhsul aktiv edildi." : "Məhsul passiv edildi.");
    } catch (e) {
        showToast("Status xətası: " + e.message, "error");
    }
};

document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!myPlaceId) return;
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
        const price = parseFloat(document.getElementById('item-v-price').value.replace(',', '.'));
        const calories = document.getElementById('item-v-calories').value;
        const prepTime = document.getElementById('item-v-prep_time').value;

        let image = document.getElementById('item-v-image').value;
        const imageFile = document.getElementById('item-v-image-file').files[0];
        if (imageFile) {
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
                document.getElementById('item-v-is_vegan')?.checked ? 'Vegan' : null,
                document.getElementById('item-v-is_gluten_free')?.checked ? 'Gluten Free' : null
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
            document.getElementById('item-v-image-file').value = '';
            const preview = document.getElementById('item-preview-img');
            if (data.image) { preview.src = data.image; preview.style.display = 'block'; }
            else { preview.style.display = 'none'; }
            document.getElementById('item-v-calories').value = data.calories || '';
            document.getElementById('item-v-prep_time').value = data.prep_time || '';
            const kidBox = document.getElementById('item-v-is_kid_friendly');
            if (kidBox) kidBox.checked = !!data.is_kid_friendly;
            if (activeBox) activeBox.checked = data.is_active !== false;
            const veganBox = document.getElementById('item-v-is_vegan');
            if (veganBox) veganBox.checked = data.badges && data.badges.includes('Vegan');
            const glutenBox = document.getElementById('item-v-is_gluten_free');
            if (glutenBox) glutenBox.checked = data.badges && data.badges.includes('Gluten Free');
        }
    }
    openModal('item-modal');
};

window.deleteItem = async function (id) {
    if (confirm('Məhsulu silmək istəyirsiniz?')) {
        try {
            const { data: item } = await supabaseClientLocal.from('items').select('image').eq('id', id).single();
            if (item && item.image) await deleteFileFromStorage(item.image);
            const { error } = await supabaseClientLocal.from('items').delete().eq('id', id);
            if (error) throw error;
            renderItems();
            showToast("Məhsul silindi.");
        } catch (e) {
            showToast("Məhsul silinərkən xəta: " + e.message, "error");
        }
    }
};


// ===================== QR CODE =====================

function generateQrCode() {
    if (!myPlaceId || !myPlaceSlug) return;

    let baseUrl = window.location.origin + window.location.pathname.replace('client-admin.html', 'index.html');
    if (window.location.protocol === 'file:') {
        baseUrl = 'https://ruisqr.com/index.html';
    }

    const qrUrl = baseUrl + "?place=" + myPlaceSlug;
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrUrl)}&margin=10`;
    document.getElementById('main-qr-img').src = qrApi;
    const previewLink = document.getElementById('qr-preview-link');
    if (previewLink) previewLink.href = qrUrl;
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
        a.download = `${myPlaceSlug}-qr-menu.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showToast("QR Kod yüklənir...");
    } catch (e) {
        showToast("QR yüklənərkən xəta.", "error");
    }
};


// ===================== LOGOUT =====================

window.logout = async function () {
    if (confirm("Sistemdən çıxış etmək istəyirsiniz?")) {
        if (presenceInterval) clearInterval(presenceInterval);
        
        // Log them out officially immediately by setting last_seen back 1 hour
        if (currentUserId) {
            const pastDate = new Date(Date.now() - 3600000).toISOString();
            await supabaseClientLocal.from('place_admins')
                .update({ last_seen: pastDate })
                .eq('user_id', currentUserId);
        }

        const { error } = await supabaseClientLocal.auth.signOut();
        if (error) alert("Çıxış xətası: " + error.message);
        window.location.href = 'login.html';
    }
};

