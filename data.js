// Mock data for the QR Menu
const menuData = {
    branding: {
        name: "Sizin Restoran",
        currency: "AZN"
    },
    categories: [
        { id: "main-courses", name: "Əsas yeməklər" },
        { id: "breakfast", name: "Səhər yeməyi" },
        { id: "burgers", name: "Burgerlər" },
        { id: "drinks", name: "İçkilər" }
    ],
    items: [
        {
            id: 1,
            categoryId: "burgers",
            name: "Klassik Çizburger",
            description: "100% mal əti kotleti, çedar pendiri, təzə pomidor, kahı, xüsusi sous.",
            price: 8.50,
            image: "https://placehold.co/100x100/eeeeee/999999?text=Cizburger",
            calories: 450,
            prepTime: "15 dəq",
            badges: ["Populyar"]
        },
        {
            id: 2,
            categoryId: "burgers",
            name: "Meksika Burgeri",
            description: "Acılı dana əti kotleti, xalapeno, avokado əzməsi, qırmızı soğan.",
            price: 9.90,
            image: "https://placehold.co/100x100/eeeeee/999999?text=Meksika",
            calories: 520,
            prepTime: "20 dəq",
            badges: ["Acılı", "Yeni"]
        },
        {
            id: 3,
            categoryId: "main-courses",
            name: "Qril Qızılbalıq",
            description: "Qazanda qovrulmuş tərəvəzlər və limonlu kərə yağı sousu ilə qızılbalıq.",
            price: 24.00,
            image: "https://placehold.co/100x100/eeeeee/999999?text=Qizilbaliq",
            calories: 380,
            prepTime: "25 dəq",
            badges: ["Şefin Seçimi", "Sağlam"]
        },
        {
            id: 4,
            categoryId: "breakfast",
            name: "Türk Səhər Yeməyi",
            description: "Ağ pendir, kaşar, zeytun, pomidor, xiyar, yumurta və bal-qaymaq.",
            price: 15.00,
            image: "https://placehold.co/100x100/eeeeee/999999?text=Seher+Yemeyi",
            calories: null,
            prepTime: "10 dəq",
            badges: []
        },
        {
            id: 5,
            categoryId: "drinks",
            name: "Limonad (Ev sayağı)",
            description: "Təzə sıxılmış limon suyu, nanə və buz ilə.",
            price: 4.50,
            image: "https://placehold.co/100x100/eeeeee/999999?text=Limonad",
            calories: 120,
            prepTime: "5 dəq",
            badges: []
        }
    ]
};
