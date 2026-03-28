let supabaseClientLocal;

document.addEventListener('DOMContentLoaded', () => {
    supabaseClientLocal = window.supabaseClient;

    const categoryList = document.getElementById('category-list');
    const menuContainer = document.getElementById('menu-container');

    // Make app data globally accessible in this scope for the rest of functions
    window.appData = { branding: { currency: "AZN" }, categories: [], items: [] };
    window.currentLang = 'az';

    // --- Dark Mode Toggle ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');


    // Restore saved theme
    if (localStorage.getItem('qr_menu_dark') === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Touch Sound Effect using Web Audio API
    function playTouchSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800; // Slightly lower pitch for a pleasant click
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.05);
        } catch(e) { /* ignore if audio blocked */ }
    }

    if (darkModeToggle) {
        darkModeToggle.onclick = () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('qr_menu_dark', isDark);

            playTouchSound();
        };
    }

    // --- Background Theme Picker ---
    const themeBtnCurrent = document.getElementById('theme-btn-current');
    const themeDropdown = document.getElementById('theme-dropdown');
    const themeOptions = document.querySelectorAll('.theme-option');
    const savedTheme = localStorage.getItem('qr_menu_theme') || 'default';
    
    function applyTheme(themeName) {
        // Remove existing theme classes
        document.body.classList.forEach(className => {
            if (className.startsWith('theme-')) {
                document.body.classList.remove(className);
            }
        });
        
        // Add new theme class if not default
        if (themeName !== 'default') {
            document.body.classList.add(`theme-${themeName}`);
        }
        
        // Update active state on options
        themeOptions.forEach(opt => {
            if (opt.dataset.theme === themeName) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
        
        localStorage.setItem('qr_menu_theme', themeName);
    }
    
    // Apply saved theme on load
    applyTheme(savedTheme);
    
    // Toggle dropdown
    if (themeBtnCurrent) {
        themeBtnCurrent.addEventListener('click', (e) => {
            e.stopPropagation();
            themeDropdown.classList.toggle('show');
            // Close language dropdown if open
            const langDropdown = document.getElementById('lang-dropdown');
            if (langDropdown) langDropdown.classList.remove('show');
        });
    }

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (themeDropdown && themeDropdown.classList.contains('show') && !e.target.closest('#theme-switch')) {
            themeDropdown.classList.remove('show');
        }
    });
    
    themeOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            playTouchSound();
            const theme = e.currentTarget.dataset.theme;
            applyTheme(theme);
            if (themeDropdown) themeDropdown.classList.remove('show');
        });
    });

    // Flag map for languages (Paths to PNG icons)
    const langFlags = { 
        az: 'assets/icons/az.png?v=3.0', 
        en: 'assets/icons/en.png?v=3.0', 
        ru: 'assets/icons/ru.png?v=3.0' 
    };
    const translations = {
        kidFriendly: {
            az: 'Uşaqlar üçün uyğundur',
            en: 'Kid-Friendly',
            ru: 'Подходит для детей'
        }
    };

    const fallbackData = {
        categories: [{ id: "main-courses", name: { az: "Əsas yeməklər", en: "Main Courses", ru: "Основные блюда" } }],
        items: [
            {
                id: "1", categoryId: "main-courses", price: 8.50,
                name: { az: "Səhifə Yüklənir...", en: "Loading...", ru: "Загрузка..." },
                description: { az: "Təsvir", en: "Desc", ru: "Опис" },
                image: "https://placehold.co/100x100/eeeeee/999999?text=Test",
                badges: []
            }
        ]
    };

    window.fetchMenuData = async function () {
        try {
            if (!supabaseClientLocal) {
                throw new Error("Supabase Client idarəetmə panelindən yüklənməyib. Zəhmət olmasa konfiqurasiyanı yoxlayın.");
            }

            const urlParams = new URLSearchParams(window.location.search);
            let placeSlug = urlParams.get('place');

            if (!placeSlug) {
                const brandName = document.querySelector('.brand-name');
                if (brandName) brandName.textContent = "Məkan Tapılmadı";
                if (menuContainer) {
                    menuContainer.innerHTML = "<h3 style='text-align:center; padding:50px;'>Xəta: Məkan Təyin Olunmayıb. Zəhmət olmasa düzgün QR kodu oxudun və ya admin panelində məkana daxil olun.</h3>";
                }
                return;
            }

            placeSlug = placeSlug.trim().toLowerCase();

            // 1. Fetch Place Details
            const { data: placeData, error: placeError } = await supabaseClientLocal
                .from('places')
                .select('*')
                .eq('slug', placeSlug)
                .single();

            if (placeError) {

                throw new Error(`Məkan ('${placeSlug}') tapılmadı bazada.`);
            }
            if (!placeData) throw new Error("Məkan məlumatı boşdur.");

            const brandNameEl = document.querySelector('.brand-name');
            if (brandNameEl) brandNameEl.textContent = placeData.name;
            document.title = placeData.name + " | QR Menyu";
            
            // Set Logo and Cover if available
            const logoEl = document.getElementById('brand-logo');
            const coverEl = document.getElementById('header-cover');
            
            if (logoEl) {
                logoEl.src = placeData.logo || "https://placehold.co/150x150/ffffff/cccccc?text=Logo";
            }
            
            if (coverEl) {
                if (placeData.cover) {
                    coverEl.style.backgroundImage = `url('${placeData.cover}')`;
                } else {
                    coverEl.style.backgroundImage = "url('https://placehold.co/800x300/333/666?text=Cover')";
                }
            }
            
            appData.branding.currency = placeData.currency || 'AZN';
            appData.branding.service_charge = placeData.service_charge || 0;

            // Render Social Links
            let socialHtml = '';
            if (placeData.phone) {
                socialHtml += `<a href="tel:${placeData.phone}" class="social-circle-btn" title="Zəng et">
                    <i class="fa-solid fa-phone" style="font-size:1.3rem;color:#555;"></i>
                </a>`;
            }
            if (placeData.whatsapp) {
                let waNum = placeData.whatsapp.replace(/[^0-9]/g, '');
                socialHtml += `<a href="https://wa.me/${waNum}" class="social-circle-btn" target="_blank" title="WhatsApp">
                    <img src="assets/icons/whatsapp.png" alt="WhatsApp" class="social-icon-img">
                </a>`;
            }
            if (placeData.instagram) {
                let igUser = placeData.instagram.replace('@', '').trim();
                socialHtml += `<a href="https://instagram.com/${igUser}" class="social-circle-btn" target="_blank" title="Instagram">
                    <img src="assets/icons/instagram.png" alt="Instagram" class="social-icon-img">
                </a>`;
            }
            if (placeData.facebook) {
                socialHtml += `<a href="${placeData.facebook}" class="social-circle-btn" target="_blank" title="Facebook">
                    <img src="assets/icons/facebook.png" alt="Facebook" class="social-icon-img">
                </a>`;
            }
            if (placeData.google_url) {
                socialHtml += `<a href="${placeData.google_url}" class="social-circle-btn" target="_blank" title="Google Maps/Review">
                    <img src="assets/icons/google.png" alt="Google" class="social-icon-img">
                </a>`;
            }

            let socialWrapper = document.getElementById('place-social-links');
            if (!socialWrapper) {
                socialWrapper = document.createElement('div');
                socialWrapper.id = 'place-social-links';
                socialWrapper.className = 'social-circles';
                const container = document.getElementById('social-branding-container');
                if (container) container.appendChild(socialWrapper);
            }
            if (socialWrapper) socialWrapper.innerHTML = socialHtml;

            // Render Service Charge Badge (Centered Below Social Icons)
            if (appData.branding.service_charge > 0) {
                let badge = document.getElementById('service-badge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.id = 'service-badge';
                    const container = document.getElementById('social-branding-container');
                    if (container) container.appendChild(badge);
                }
                badge.style.cssText = "display:flex; justify-content:center; align-items:center; gap:5px; width:fit-content; background:var(--primary-color); color:white; padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:600; margin:15px auto 0 auto; box-shadow:0 2px 5px rgba(0,0,0,0.1);";
                badge.innerHTML = `<i class="fa-solid fa-receipt"></i> Xidmət Haqqı: ${appData.branding.service_charge}%`;
            }

            // 2. Fetch categories for this place
            const { data: catsData, error: catsError } = await supabaseClientLocal
                .from('categories')
                .select('*')
                .eq('place_id', placeData.id);

            if (catsError) throw catsError;

            // 3. Fetch items for these categories
            const catIds = catsData ? catsData.map(c => c.id) : [];
            let itemsData = [];

            if (catIds.length > 0) {
                const { data: iData, error: itemsError } = await supabaseClientLocal
                    .from('items')
                    .select('*')
                    .in('category_id', catIds);

                if (itemsError) throw itemsError;
                itemsData = iData || [];
            }

            appData.categories = (catsData || []).map(c => ({
                id: c.id,
                name: { az: c.name_az, en: c.name_en, ru: c.name_ru },
                image: c.image,
                sortOrder: parseInt(c.sort_order) || 0
            })).sort((a, b) => a.sortOrder - b.sortOrder);

            appData.items = itemsData.map(i => ({
                id: i.id,
                categoryId: i.category_id,
                name: { az: i.name_az, en: i.name_en, ru: i.name_ru },
                description: { az: i.desc_az, en: i.desc_en, ru: i.desc_ru },
                price: i.price,
                image: i.image,
                calories: i.calories,
                prepTime: i.prep_time,
                isKidFriendly: i.is_kid_friendly,
                badges: i.badges || []
            }));

        } catch (e) {

            appData.categories = [];
            appData.items = [];
            hideLoader();
            menuContainer.innerHTML = `<div style='text-align:center; padding:50px;'>
                <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem; color:orange; margin-bottom:15px;"></i>
                <h3 style='color:red;'>Baza ilə əlaqə xətası</h3>
                <p>${e.message}</p>
                <button onclick="window.location.reload()" class="add-to-cart-btn" style="margin-top:20px;">Yenidən yoxla</button>
            </div>`;
            return;
        }

        reRenderApp();
        hideLoader();
    };

    function hideLoader() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }

    // 1. Render Categories Navigation
    window.renderCategories = function () {
        categoryList.innerHTML = '';
        appData.categories.forEach((cat, index) => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.className = `category-btn ${index === 0 ? 'active' : ''}`;

            if (cat.image) {
                btn.innerHTML = `<img src="${cat.image}" alt="${cat.name[currentLang] || cat.name.az}" style="width:24px; height:24px; border-radius:50%; object-fit:cover; margin-right:6px; vertical-align:middle;"> <span>${cat.name[currentLang] || cat.name.az}</span>`;
            } else {
                btn.textContent = cat.name[currentLang] || cat.name.az;
            }

            btn.dataset.target = cat.id;

            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Disable IntersectionObserver temporarily while smoothly scrolling
                window.isClickScrolling = true;
                clearTimeout(window.scrollSpyTimeout);
                window.scrollSpyTimeout = setTimeout(() => { window.isClickScrolling = false; }, 800);

                const targetSection = document.getElementById(`section-${cat.id}`);
                if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth' });
            });

            li.appendChild(btn);
            categoryList.appendChild(li);
        });
    }

    // 2. Render Menu Sections and Items (Infinite Scroll Pagination)
    const ITEMS_PER_PAGE = 6; // Hər scroll-da yüklənən məhsul sayı

    window.renderMenu = function (forceRenderAll = false) {
        menuContainer.innerHTML = '';
        
        // Section-level lazy observer (kateqoriya bölmələri üçün)
        let sectionObserver;
        if ('IntersectionObserver' in window) {
            sectionObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const section = entry.target;
                        if (!section.dataset.rendered) {
                            renderItemsForSection(section, forceRenderAll);
                            observer.unobserve(section);
                        }
                    }
                });
            }, { rootMargin: '400px 0px 800px 0px' });
        }

        // Item-level pagination observer (hər kateqoriyanın sentinel-i üçün)
        let paginationObserver;
        if ('IntersectionObserver' in window) {
            paginationObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const sentinel = entry.target;
                        const section = sentinel.closest('.menu-section');
                        if (section) {
                            loadMoreItems(section, sentinel);
                        }
                    }
                });
            }, { rootMargin: '0px 0px 300px 0px' });
        }

        // Bir item kartı yaradır
        function createItemCard(item) {
            const itemCard = document.createElement('div');
            itemCard.className = 'menu-item';
            itemCard.style.opacity = '0';
            itemCard.style.transform = 'translateY(20px)';
            
            // Axtarış aktiv olduqda gizlətmə
            if (window.currentSearchTerm) {
                const title = (item.name[currentLang] || item.name.az || '').toLowerCase();
                const desc = (item.description[currentLang] || item.description.az || '').toLowerCase();
                if (!title.includes(window.currentSearchTerm) && !desc.includes(window.currentSearchTerm)) {
                    itemCard.style.display = 'none';
                }
            }

            let badgesHtml = '';
            if (item.badges && item.badges.length > 0) {
                badgesHtml = `<div class="item-badges">
                    ${item.badges.map(b => `<span class="badge">${b}</span>`).join('')}
                </div>`;
            }

            let metaHtml = '';
            if (item.calories || item.prepTime || item.isKidFriendly) {
                metaHtml = `<div class="item-meta">
                    ${item.calories ? `<span class="meta-info"><i class="fa-solid fa-fire text-muted"></i> ${item.calories} kcal</span>` : ''}
                    ${item.prepTime ? `<span class="meta-info"><i class="fa-regular fa-clock"></i> ${item.prepTime}</span>` : ''}
                    ${item.isKidFriendly ? `<span class="meta-info" style="color:#2563eb;"><i class="fa-solid fa-child"></i> ${translations.kidFriendly[currentLang] || translations.kidFriendly.az}</span>` : ''}
                </div>`;
            }

            const itemName = item.name[currentLang] || item.name.az || '';
            const itemDesc = item.description[currentLang] || item.description.az || '';

            itemCard.innerHTML = `
                <img src="${item.image}" alt="${itemName}" class="item-image" loading="lazy">
                <div class="item-content">
                    <div class="item-header">
                        <h3 class="item-title">${itemName}</h3>
                        <span class="item-price">${Number(item.price).toFixed(2)} AZN</span>
                    </div>
                    <p class="item-description">${itemDesc}</p>
                    ${metaHtml}
                    ${badgesHtml}
                    <button class="add-to-cart-btn" data-id="${item.id}">
                        <i class="fa-solid fa-plus"></i> ${currentLang === 'az' ? 'Səbətə at' : currentLang === 'ru' ? 'В корзину' : 'Add to cart'}
                    </button>
                </div>
            `;

            // Smooth fade-in animasiya
            requestAnimationFrame(() => {
                setTimeout(() => {
                    itemCard.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    itemCard.style.opacity = '1';
                    itemCard.style.transform = 'translateY(0)';
                }, 50);
            });

            // Modalı açmaq üçün klik
            itemCard.addEventListener('click', (e) => {
                if (e.target.closest('.add-to-cart-btn')) return;
                openItemDetailModal(item.id);
            });

            // Səbətə əlavə etmə
            const addBtn = itemCard.querySelector('.add-to-cart-btn');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    const itemId = e.currentTarget.dataset.id;
                    addToCart(itemId);
                    const imgEl = itemCard.querySelector('img');
                    if (imgEl) flyToCartAnimation(imgEl);
                    const icon = e.currentTarget.querySelector('i');
                    icon.className = 'fa-solid fa-check';
                    setTimeout(() => icon.className = 'fa-solid fa-plus', 1000);
                });
            }

            return itemCard;
        }

        // Kateqoriyanın ilk səhifəsini render edir + sentinel qoyur
        function renderItemsForSection(section, showAll = false) {
            const catId = section.dataset.catId;
            const allItems = appData.items.filter(item => String(item.categoryId) === String(catId));
            if (allItems.length === 0) return;

            const grid = section.querySelector('.menu-items-grid');
            if (!grid) return;

            // Axtarış aktiv və ya forceRenderAll — hamısını göstər
            const renderAll = showAll || !!window.currentSearchTerm;
            const itemsToRender = renderAll ? allItems : allItems.slice(0, ITEMS_PER_PAGE);

            itemsToRender.forEach(item => {
                grid.appendChild(createItemCard(item));
            });

            section.dataset.rendered = 'true';
            section.dataset.loadedCount = String(itemsToRender.length);

            // Əgər daha çox item varsa və hamısını göstərmirik — sentinel qoy
            if (!renderAll && allItems.length > ITEMS_PER_PAGE) {
                const sentinel = document.createElement('div');
                sentinel.className = 'scroll-sentinel';
                section.appendChild(sentinel);
                if (paginationObserver) {
                    paginationObserver.observe(sentinel);
                }
            }

            // Axtarış vaxtı boş kateqoriyanı gizlətmə
            if (window.currentSearchTerm) {
                const visibleItems = grid.querySelectorAll('.menu-item:not([style*="display: none"])');
                if (visibleItems.length === 0) {
                    section.style.display = 'none';
                }
            }
        }

        // Sentinel görünəndə növbəti batch yüklənir
        function loadMoreItems(section, sentinel) {
            const catId = section.dataset.catId;
            const allItems = appData.items.filter(item => String(item.categoryId) === String(catId));
            const loadedCount = parseInt(section.dataset.loadedCount) || 0;
            
            if (loadedCount >= allItems.length) {
                // Hamısı yüklənib — sentinel-i sil
                if (paginationObserver) paginationObserver.unobserve(sentinel);
                sentinel.remove();
                return;
            }

            const grid = section.querySelector('.menu-items-grid');
            if (!grid) return;

            const nextBatch = allItems.slice(loadedCount, loadedCount + ITEMS_PER_PAGE);
            
            nextBatch.forEach(item => {
                grid.appendChild(createItemCard(item));
            });

            const newLoadedCount = loadedCount + nextBatch.length;
            section.dataset.loadedCount = String(newLoadedCount);

            // Əgər hamısı yükləndisə — sentinel-i sil
            if (newLoadedCount >= allItems.length) {
                if (paginationObserver) paginationObserver.unobserve(sentinel);
                sentinel.remove();
            }
        }

        appData.categories.forEach((cat, index) => {
            const items = appData.items.filter(item => String(item.categoryId) === String(cat.id));
            if (items.length === 0) return;

            const section = document.createElement('section');
            section.className = 'menu-section';
            section.id = `section-${cat.id}`;
            section.dataset.catId = cat.id;
            section.style.minHeight = '150px'; // yertutucu hündürlük
            
            const title = document.createElement('h2');
            title.className = 'section-title';
            title.textContent = cat.name[currentLang] || cat.name.az;
            section.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'menu-items-grid';
            section.appendChild(grid);
            
            menuContainer.appendChild(section);

            // İlk 2 kateqoriyanı dərhal göstər, qalanları scroll-a saxla
            if (forceRenderAll || index < 2 || !sectionObserver) {
                renderItemsForSection(section, forceRenderAll);
            } else {
                sectionObserver.observe(section);
            }
        });
    }

    // 3. Highlight Active Category on Scroll (Intersection Observer)
    function setupScrollSpy() {
        const sections = document.querySelectorAll('.menu-section');
        const navButtons = document.querySelectorAll('.category-btn');

        const observerOptions = {
            root: null,
            rootMargin: '-150px 0px -60% 0px', // Adjust triggering area
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            if (window.isClickScrolling) return; // ignore during click scroll
            
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id.replace('section-', '');

                    navButtons.forEach(btn => {
                        if (btn.dataset.target === id) {
                            btn.classList.add('active');
                            // Gently scroll nav horizontally without affecting vertical page scroll
                            if (categoryList) {
                                const scrollLeft = btn.offsetLeft - (categoryList.clientWidth / 2) + (btn.clientWidth / 2);
                                categoryList.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                            }
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                }
            });
        }, observerOptions);

        sections.forEach(sec => observer.observe(sec));
    }

    // --- Item Detail Modal Logic ---
    const itemDetailModal = document.getElementById('item-detail-modal');
    const closeItemBtn = document.getElementById('close-item-btn');
    const modalItemAddBtn = document.getElementById('modal-add-btn');
    const modalItemImg = document.getElementById('modal-item-img');

    let currentModalItemId = null;

    function openItemDetailModal(itemId) {
        const item = appData.items.find(i => String(i.id) === String(itemId));
        if (!item) return;

        currentModalItemId = itemId;
        const itemName = item.name[currentLang] || item.name.az;
        const itemDesc = item.description[currentLang] || item.description.az;

        const modalImg = document.getElementById('modal-item-img');
        modalImg.src = item.image;
        document.getElementById('modal-item-title').textContent = itemName;
        document.getElementById('modal-item-price').textContent = `${Number(item.price).toFixed(2)} AZN`;
        document.getElementById('modal-item-desc').innerHTML = itemDesc.replace(/\n/g, '<br>');

        // Badges & Meta
        const badgesContainer = document.getElementById('modal-item-badges');
        if (item.badges && item.badges.length > 0) {
            badgesContainer.innerHTML = item.badges.map(b => `<span class="badge">${b}</span>`).join(' ');
        } else {
            badgesContainer.innerHTML = '';
        }

        const metaContainer = document.getElementById('modal-item-meta');
        let metaHtml = '';
        if (item.calories) metaHtml += `<span class="meta-info"><i class="fa-solid fa-fire text-muted"></i> ${item.calories} kcal</span> `;
        if (item.prepTime) metaHtml += `<span class="meta-info"><i class="fa-regular fa-clock text-muted"></i> ${item.prepTime}</span> `;
        if (item.isKidFriendly) metaHtml += `<span class="meta-info" style="color:#2563eb;"><i class="fa-solid fa-child"></i> ${translations.kidFriendly[currentLang] || translations.kidFriendly.az}</span>`;
        metaContainer.innerHTML = metaHtml;

        itemDetailModal.classList.add('active');
        lockScroll();
    }

    function lockScroll() {
        document.body.dataset.scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${window.scrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.overflow = 'hidden';
    }

    function closeItemDetailModal() {
        itemDetailModal.classList.remove('active');
        const scrollY = document.body.dataset.scrollY || '0';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, parseInt(scrollY));
        currentModalItemId = null;
    }

    closeItemBtn.addEventListener('click', closeItemDetailModal);
    itemDetailModal.addEventListener('click', (e) => {
        if (e.target === itemDetailModal) closeItemDetailModal();
    });

    modalItemAddBtn.addEventListener('click', () => {
        if (currentModalItemId) {
            addToCart(currentModalItemId);
            
            // Fly to cart animation from modal
            const imgEl = document.getElementById('modal-item-img');
            if (imgEl && imgEl.src) {
                flyToCartAnimation(imgEl);
            }

            const icon = modalItemAddBtn.querySelector('i');
            icon.className = 'fa-solid fa-check';
            setTimeout(() => {
                icon.className = 'fa-solid fa-plus';
                closeItemDetailModal();
            }, 600);
        }
    });

    // --- Fly to Cart Animation Function ---
    function flyToCartAnimation(sourceImg) {
        if (!sourceImg || !floatingCart) return;

        // Clone the image
        const flyingImg = sourceImg.cloneNode(true);
        const rect = sourceImg.getBoundingClientRect();
        
        // Initial setup for flying image
        flyingImg.style.position = 'fixed';
        flyingImg.style.top = `${rect.top}px`;
        flyingImg.style.left = `${rect.left}px`;
        flyingImg.style.width = `${rect.width}px`;
        flyingImg.style.height = `${rect.height}px`;
        flyingImg.style.borderRadius = window.getComputedStyle(sourceImg).borderRadius;
        flyingImg.style.opacity = '0.9';
        flyingImg.style.zIndex = '99999';
        flyingImg.style.pointerEvents = 'none'; // so it doesn't interfere with clicks
        flyingImg.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        
        document.body.appendChild(flyingImg);

        // Get target coordinates (center of floating cart)
        const cartRect = floatingCart.getBoundingClientRect();
        const targetTop = cartRect.top + cartRect.height / 2 - 20; // 20 is half of new size (40/2)
        const targetLeft = cartRect.left + cartRect.width / 2 - 20;

        // Trigger animation next frame
        requestAnimationFrame(() => {
            flyingImg.style.top = `${targetTop}px`;
            flyingImg.style.left = `${targetLeft}px`;
            flyingImg.style.width = '40px';
            flyingImg.style.height = '40px';
            flyingImg.style.opacity = '0.5';
            flyingImg.style.transform = 'scale(0.5)';
        });

        // Clean up & trigger cart bounce after animation ends
        setTimeout(() => {
            flyingImg.remove();
            
            // Re-trigger bounce animation
            floatingCart.classList.remove('jump-animation');
            void floatingCart.offsetWidth; // trigger reflow
            floatingCart.classList.add('jump-animation');
        }, 600);
    }

    // --- Cart & Checkout Logic ---
    let cart = [];

    // Elements
    const floatingCart = document.getElementById('floating-cart');
    const cartCountEl = floatingCart.querySelector('.cart-count');
    const cartTotalEl = floatingCart.querySelector('.cart-total');

    const cartModal = document.getElementById('cart-modal');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartItemsList = document.getElementById('cart-items-list');
    const cartTotalPriceEl = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    const customerWaNumberEl = document.getElementById('customer-wa-number');

    function addToCart(itemId) {
        const item = appData.items.find(i => String(i.id) === String(itemId));
        if (!item) return;

        playTouchSound(); // Play touch sound on add to cart

        const existingItem = cart.find(c => String(c.id) === String(itemId));
        if (existingItem) {
            existingItem.qty += 1;
        } else {
            cart.push({ ...item, qty: 1 });
        }

        updateCartState();
    }

    function changeQty(itemId, change) {
        const itemIndex = cart.findIndex(c => c.id === itemId);
        if (itemIndex > -1) {
            cart[itemIndex].qty += change;
            if (cart[itemIndex].qty <= 0) {
                cart.splice(itemIndex, 1);
            }
            updateCartState();
            renderCartModal(); // Re-render modal to reflect changes
        }
    }

    function updateCartState() {
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

        let serviceAmount = 0;
        if (appData.branding.service_charge > 0) {
            serviceAmount = totalPrice * (appData.branding.service_charge / 100);
        }
        
        const finalPrice = totalPrice + serviceAmount;

        // Update floating cart logic
        if (totalItems > 0) {
            floatingCart.style.display = 'flex';
            cartCountEl.textContent = totalItems;
            cartTotalEl.textContent = `${finalPrice.toFixed(2)} ${appData.branding.currency || 'AZN'}`;
        } else {
            floatingCart.style.display = 'none';
        }

        // Always update total in modal if open
        cartTotalPriceEl.textContent = `${finalPrice.toFixed(2)} ${appData.branding.currency || 'AZN'}`;
    }

    function renderCartModal() {
        cartItemsList.innerHTML = ''; // Clear previous

        if (cart.length === 0) {
            cartItemsList.innerHTML = '<p class="empty-cart-msg">Səbətiniz boşdur.</p>';
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            return;
        }

        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = '1';

        let subtotal = 0;

        cart.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';

            const itemName = item.name[currentLang] || item.name.az;
            const itemTotal = Number(item.price) * item.qty;
            subtotal += itemTotal;

            itemEl.innerHTML = `
                <div class="cart-item-info">
                    <h4>${itemName}</h4>
                    <span class="cart-item-price">${itemTotal.toFixed(2)} ${appData.branding.currency || 'AZN'}</span>
                </div>
                <div class="quantity-controls">
                    <button class="qty-btn minus" data-id="${item.id}">-</button>
                    <span class="cart-item-qty">${item.qty}</span>
                    <button class="qty-btn plus" data-id="${item.id}">+</button>
                </div>
            `;
            cartItemsList.appendChild(itemEl);
        });

        // Add service charge row if applicable
        if (appData.branding.service_charge > 0) {
            const serviceAmount = subtotal * (appData.branding.service_charge / 100);
            const serviceRow = document.createElement('div');
            serviceRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:12px 15px; margin-top:15px; background:var(--bg-light); border-radius:8px; border:1px dashed var(--border-color); color:var(--text-secondary); font-weight:600; font-size:0.95rem;";
            serviceRow.innerHTML = `
                <span>Xidmət haqqı (${appData.branding.service_charge}%):</span>
                <span class="cart-item-price" style="font-size:1rem;">+${serviceAmount.toFixed(2)} ${appData.branding.currency || 'AZN'}</span>
            `;
            cartItemsList.appendChild(serviceRow);
        }

        // Add event listeners for plus/minus buttons inside modal
        cartItemsList.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const isPlus = e.currentTarget.classList.contains('plus');
                changeQty(id, isPlus ? 1 : -1);
            });
        });
    }

    function openCart() {
        renderCartModal();
        cartModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Stop background scrolling
    }

    function closeCart() {
        cartModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function formatWhatsAppMessage() {
        const greetings = { az: "Salam! Mən sifariş vermək istəyirəm:\n\n", en: "Hello! I would like to order:\n\n", ru: "Здравствуйте! Я хочу заказать:\n\n" };
        const subText = { az: "\nMəbləğ:", en: "\nSubtotal:", ru: "\nСумма:" };
        const srvText = { az: "Xidmət Haqqı", en: "Service Charge", ru: "Обслуживание" };
        const totalText = { az: "\n*Yekun Məbləğ:", en: "\n*Total Amount:", ru: "\n*Итоговая сумма:" };

        let msg = greetings[currentLang] || greetings.az;
        let total = 0;

        cart.forEach(item => {
            const itemTotal = Number(item.price) * item.qty;
            total += itemTotal;
            const itemName = item.name[currentLang] || item.name.az;
            msg += `▪ ${itemName} (x${item.qty}) - ${itemTotal.toFixed(2)} ${appData.branding.currency || 'AZN'}\n`;
        });

        if (appData.branding.service_charge > 0) {
            const serviceAmount = total * (appData.branding.service_charge / 100);
            msg += `${subText[currentLang] || subText.az} ${total.toFixed(2)} ${appData.branding.currency || 'AZN'}\n`;
            msg += `${srvText[currentLang] || srvText.az} (${appData.branding.service_charge}%): ${serviceAmount.toFixed(2)} ${appData.branding.currency || 'AZN'}\n`;
            total += serviceAmount;
        }

        msg += `${totalText[currentLang] || totalText.az} ${total.toFixed(2)} ${appData.branding.currency || 'AZN'}*`;

        return encodeURIComponent(msg);
    }

    // Modal Events
    floatingCart.addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeCart);

    // Close on overlay click
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) closeCart();
    });

    // Checkout Event
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return;

        let rawNumber = customerWaNumberEl.value.trim();

        if (!rawNumber) {
            alert("Zəhmət olmasa WhatsApp nömrənizi daxil edin!");
            customerWaNumberEl.focus();
            return;
        }

        // Nömrədən yalnız rəqəmləri saxlayırıq (məs: +994... -> 994...)
        let cleanNumber = rawNumber.replace(/\D/g, '');

        const msg = formatWhatsAppMessage();
        const waLink = `https://wa.me/${cleanNumber}?text=${msg}`;
        window.open(waLink, '_blank');
    });

    // --- Language Switcher ---
    const langBtnCurrent = document.getElementById('lang-btn-current');
    const langDropdown = document.getElementById('lang-dropdown');
    const currentLangText = document.getElementById('current-lang-text');
    const langOptions = document.querySelectorAll('.lang-option');

    // 1. Get saved language from LocalStorage or default to 'az'
    window.currentLang = localStorage.getItem('qr_menu_lang') || 'az';

    // 2. Set initial UI state based on saved language
    const currentLangFlag = document.getElementById('current-lang-flag');
    function updateLangUI(lang) {
        currentLangText.textContent = lang.toUpperCase();
        if (currentLangFlag) {
            currentLangFlag.src = langFlags[lang] || langFlags.az;
        }
        langOptions.forEach(opt => {
            if (opt.dataset.lang === lang) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }
    updateLangUI(window.currentLang);

    // 3. Dropdown toggle logic
    if (langBtnCurrent) {
        langBtnCurrent.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('show');
            // Close theme dropdown if open
            if (themeDropdown) themeDropdown.classList.remove('show');
        });
    }

    // 4. Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (langDropdown && langDropdown.classList.contains('show') && !e.target.closest('#lang-switch')) {
            langDropdown.classList.remove('show');
        }
    });

    // 5. Language Selection Logic
    langOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            const selectedLang = e.currentTarget.dataset.lang; // Use currentTarget to avoid inner img clicks
            if (window.currentLang === selectedLang || !selectedLang) return; // Ignore if same or undefined

            playTouchSound(); // Play touch sound on language change
            window.currentLang = selectedLang;
            
            // Save to LocalStorage
            localStorage.setItem('qr_menu_lang', window.currentLang);
            
            // Update UI & Close Dropdown instantly
            updateLangUI(window.currentLang);
            if (langDropdown) langDropdown.classList.remove('show');

            // Re-render App with new language (defer slightly so dropdown closing animation doesn't freeze)
            setTimeout(() => {
                reRenderApp();
            }, 50);
        });
    });

    function reRenderApp() {
        renderCategories();
        renderMenu();
        setupScrollSpy();
        if (cartModal.classList.contains('active')) renderCartModal();

        const translations = {
            cartItemsText: { az: "Məhsul", en: "Items", ru: "Товаров" },
            cartTitle: { az: "Səbətiniz", en: "Your Cart", ru: "Ваша корзина" },
            totalRow: { az: "Cəmi:", en: "Total:", ru: "Итого:" },
            waLabel: {
                az: "Sizin WhatsApp nömrəniz (Nümunə: 994501234567):",
                en: "Your WhatsApp Number (e.g. 994...):",
                ru: "Ваш номер WhatsApp (например: 994...):"
            },
            checkoutBtn: {
                az: "<i class='fa-brands fa-whatsapp'></i> Sifariş Çekini Göndər",
                en: "<i class='fa-brands fa-whatsapp'></i> Send Order Receipt",
                ru: "<i class='fa-brands fa-whatsapp'></i> Отправить чек заказа"
            }
        };

        if (floatingCart) {
            const spanText = floatingCart.querySelector('.cart-info span:last-child');
            if (spanText) spanText.textContent = translations.cartItemsText[currentLang];
        }
        
        const cartHeader = document.querySelector('.cart-header h2');
        if (cartHeader) cartHeader.textContent = translations.cartTitle[currentLang];
        
        const totalRowTitle = document.querySelector('.total-row span:first-child');
        if (totalRowTitle) totalRowTitle.textContent = translations.totalRow[currentLang];
        
        const waLabel = document.querySelector('label[for="customer-wa-number"]');
        if (waLabel) waLabel.textContent = translations.waLabel[currentLang];
        
        if (checkoutBtn) checkoutBtn.innerHTML = translations.checkoutBtn[currentLang];
    }

    // --- Search Functionality ---
    const searchInput = document.getElementById('menu-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    // Create No Results Element
    let noResultsEl = document.querySelector('.no-results-msg');
    if (!noResultsEl) {
        noResultsEl = document.createElement('div');
        noResultsEl.className = 'no-results-msg';
        noResultsEl.innerHTML = `
            <i class="fa-solid fa-utensils"></i>
            <h3>Nəticə tapılmadı</h3>
            <p>Axtarışınıza uyğun heç bir məhsul yoxdur.</p>
        `;
        menuContainer.appendChild(noResultsEl);
    }

    function handleSearch() {
        if (!searchInput) return;
        
        const term = searchInput.value.toLowerCase().trim();
        window.currentSearchTerm = term;
        let anyMatchFound = false;

        // Toggle clear button visibility
        clearSearchBtn.style.display = term.length > 0 ? 'flex' : 'none';

        if (term.length > 0) {
            // Force render all sections to ensure DOM has everything for search
            const unrenderedSections = document.querySelectorAll('.menu-section:not([data-rendered="true"])');
            if (unrenderedSections.length > 0) {
                window.renderMenu(true);
                menuContainer.appendChild(noResultsEl); // Re-append because renderMenu clears container
            }
        }

        const sections = document.querySelectorAll('.menu-section');

        sections.forEach(section => {
            const items = section.querySelectorAll('.menu-item');
            let sectionHasMatch = false;

            items.forEach(item => {
                const title = item.querySelector('.item-title').textContent.toLowerCase();
                const desc = item.querySelector('.item-description') ? item.querySelector('.item-description').textContent.toLowerCase() : '';
                
                if (title.includes(term) || desc.includes(term)) {
                    item.style.display = 'block';
                    sectionHasMatch = true;
                    anyMatchFound = true;
                } else {
                    item.style.display = 'none';
                }
            });

            // Hide the entire section (including its title) if no items match inside it
            if (items.length > 0) {
                section.style.display = sectionHasMatch ? 'block' : 'none';
            }
        });

        // Show "No Results" message if absolutely nothing matched
        if (term.length > 0 && !anyMatchFound) {
            noResultsEl.style.display = 'block';
        } else {
            noResultsEl.style.display = 'none';
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            handleSearch(); // trigger reset
            searchInput.focus();
        });
    }

    // Re-bind search when app re-renders (like language change)
    const originalReRenderApp = reRenderApp;
    reRenderApp = function() {
        originalReRenderApp();
        // Re-append no results element because renderMenu clears menuContainer
        noResultsEl.style.display = 'none';
        menuContainer.appendChild(noResultsEl);
        // Re-apply search if there is an active search term
        if (searchInput && searchInput.value) {
            handleSearch();
        }
    };

    // Initialize App
    fetchMenuData(); // Load data from Supabase
    updateCartState();
});
