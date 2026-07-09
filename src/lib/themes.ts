// Masal temaları — kolayca eklenip değiştirilebilir.
// Her tema 8 sahnelik sabit iskelete oturur (üretim tarafında kullanılacak).
// "options" alanları kullanıcıya sorulacak temaya özel seçimlerdir.

export type ThemeOption = {
  id: string;
  question: string;
  choices: { id: string; label: string; emoji: string }[];
};

export type StoryTheme = {
  id: string;
  title: string;
  emoji: string;
  tagline: string;
  description: string;
  gradient: string; // tailwind sınıfları
  options: ThemeOption[];
};

export const THEMES: StoryTheme[] = [
  {
    id: "hayvan-dostu",
    title: "Hayvan Dostu Macera",
    emoji: "🦁",
    tagline: "Konuşan bir dostla büyük bir yolculuk",
    description:
      "Çocuğunuz büyülü bir hayvanla arkadaş olur ve birlikte küçük ama cesur bir maceraya atılır.",
    gradient: "from-mint/25 to-accent/20",
    options: [
      {
        id: "hayvan",
        question: "Yol arkadaşı hangi hayvan olsun?",
        choices: [
          { id: "aslan", label: "Aslan", emoji: "🦁" },
          { id: "yunus", label: "Yunus", emoji: "🐬" },
          { id: "baykus", label: "Baykuş", emoji: "🦉" },
          { id: "ejderha", label: "Sevimli Ejderha", emoji: "🐉" },
          { id: "at", label: "Midilli At", emoji: "🐴" },
          { id: "panda", label: "Panda", emoji: "🐼" },
        ],
      },
      {
        id: "mekan",
        question: "Macera nerede geçsin?",
        choices: [
          { id: "orman", label: "Büyülü Orman", emoji: "🌳" },
          { id: "okyanus", label: "Derin Okyanus", emoji: "🌊" },
          { id: "gokyuzu", label: "Bulutların Üstü", emoji: "☁️" },
          { id: "kar", label: "Karlı Dağlar", emoji: "❄️" },
        ],
      },
      {
        id: "gorev",
        question: "Kahramanımız kime yardım etsin?",
        choices: [
          { id: "yavru", label: "Kaybolmuş bir yavru", emoji: "🐾" },
          { id: "gecit", label: "Kapanmış bir geçit", emoji: "🚪" },
          { id: "arkadas", label: "Üzgün bir arkadaş", emoji: "💛" },
        ],
      },
    ],
  },
  {
    id: "super-kahraman",
    title: "Süper Kahraman",
    emoji: "🦸",
    tagline: "Bir gücün var, birine yardım et!",
    description:
      "Çocuğunuz özel bir güç kazanır ve bu gücü kötüyü yenmek için değil, birine yardım etmek için kullanır.",
    gradient: "from-primary/20 to-pink/20",
    options: [
      {
        id: "guc",
        question: "Süper gücün ne olsun?",
        choices: [
          { id: "ucmak", label: "Uçmak", emoji: "🕊️" },
          { id: "hiz", label: "Süper hız", emoji: "⚡" },
          { id: "iyilestirme", label: "İyileştirme", emoji: "✨" },
          { id: "guc", label: "Süper güç", emoji: "💪" },
          { id: "hayvan-dili", label: "Hayvanlarla konuşmak", emoji: "🦜" },
          { id: "buyume", label: "Dev gibi büyümek", emoji: "🌱" },
        ],
      },
      {
        id: "kim",
        question: "Kime yardım edelim?",
        choices: [
          { id: "sehir", label: "Bütün mahalleye", emoji: "🏘️" },
          { id: "hayvanlar", label: "Zor durumdaki hayvanlara", emoji: "🐿️" },
          { id: "arkadas", label: "En yakın arkadaşına", emoji: "🧒" },
        ],
      },
      {
        id: "mekan",
        question: "Macera nerede geçsin?",
        choices: [
          { id: "sehir", label: "Renkli bir şehir", emoji: "🌆" },
          { id: "koy", label: "Sıcak bir köy", emoji: "🏡" },
          { id: "okul", label: "Okulun bahçesi", emoji: "🏫" },
        ],
      },
    ],
  },
  {
    id: "sihirli-kesif",
    title: "Sihirli Keşif",
    emoji: "🌟",
    tagline: "Büyülü bir kapının ardındaki dünya",
    description:
      "Çocuğunuz büyülü bir kapıdan geçip yepyeni bir diyarı keşfeder ve en değerli hazineyi bulur.",
    gradient: "from-accent/25 to-primary/15",
    options: [
      {
        id: "kapi",
        question: "Büyülü geçit ne olsun?",
        choices: [
          { id: "kapi", label: "Işıldayan bir kapı", emoji: "🚪" },
          { id: "kitap", label: "Sihirli bir kitap", emoji: "📖" },
          { id: "gokkusagi", label: "Bir gökkuşağı", emoji: "🌈" },
        ],
      },
      {
        id: "diyar",
        question: "Hangi diyara açılsın?",
        choices: [
          { id: "seker", label: "Şeker Ülkesi", emoji: "🍭" },
          { id: "yildiz", label: "Yıldızlar Diyarı", emoji: "⭐" },
          { id: "bulut", label: "Bulut Krallığı", emoji: "🏰" },
          { id: "oyuncak", label: "Oyuncaklar Ülkesi", emoji: "🧸" },
        ],
      },
      {
        id: "hazine",
        question: "Sonunda hangi hazineyi bulsun?",
        choices: [
          { id: "dostluk", label: "Gerçek dostluk", emoji: "🤝" },
          { id: "cesaret", label: "İçindeki cesaret", emoji: "🦁" },
          { id: "sihir", label: "Küçük bir sihir", emoji: "🪄" },
        ],
      },
    ],
  },
  {
    id: "uzay-macerasi",
    title: "Uzay Macerası",
    emoji: "🚀",
    tagline: "Yıldızların arasında bir yolculuk",
    description:
      "Çocuğunuz uzaya yolculuk eder, gezegenleri keşfeder ve orada yardım bekleyen birine el uzatır.",
    gradient: "from-primary/25 to-mint/20",
    options: [
      {
        id: "arac",
        question: "Uzaya nasıl gitsin?",
        choices: [
          { id: "roket", label: "Rengarenk Roket", emoji: "🚀" },
          { id: "balon", label: "Uzay Balonu", emoji: "🎈" },
          { id: "yildiz-kaydiragi", label: "Kayan Yıldız", emoji: "🌠" },
        ],
      },
      {
        id: "gezegen",
        question: "Hangi gezegene gitsin?",
        choices: [
          { id: "seker-gezegeni", label: "Şeker Gezegeni", emoji: "🍬" },
          { id: "halkali", label: "Halkalı Gezegen", emoji: "🪐" },
          { id: "ay", label: "Ay", emoji: "🌙" },
        ],
      },
      {
        id: "yardim",
        question: "Orada kime yardım etsin?",
        choices: [
          { id: "uzayli-yavru", label: "Kaybolmuş uzaylı yavrusu", emoji: "👽" },
          { id: "sonuk-yildiz", label: "Işığı sönen yıldız", emoji: "💫" },
          { id: "ay-tavsani", label: "Uykusu kaçan Ay Tavşanı", emoji: "🐇" },
        ],
      },
    ],
  },
  {
    id: "dinozor-vadisi",
    title: "Dinozor Vadisi",
    emoji: "🦕",
    tagline: "Sevimli devlerle dostluk",
    description:
      "Çocuğunuz dostça dinozorların yaşadığı yemyeşil bir vadiyi keşfeder ve minik bir dinozora yardım eder.",
    gradient: "from-mint/30 to-accent/15",
    options: [
      {
        id: "dino",
        question: "En yakın dino dostu hangisi olsun?",
        choices: [
          { id: "uzun-boyun", label: "Uzun Boyunlu", emoji: "🦕" },
          { id: "uc-boynuz", label: "Üç Boynuzlu", emoji: "🦖" },
          { id: "kanatli", label: "Minik Kanatlı", emoji: "🪽" },
        ],
      },
      {
        id: "mekan",
        question: "Vadinin neresinde geçsin?",
        choices: [
          { id: "selale", label: "Şelale Kıyısı", emoji: "💦" },
          { id: "kristal-magara", label: "Kristal Mağara", emoji: "💎" },
          { id: "cicek-cayiri", label: "Çiçek Çayırı", emoji: "🌼" },
        ],
      },
      {
        id: "gorev",
        question: "Kahramanımız ne yapsın?",
        choices: [
          { id: "yumurta", label: "Kaybolan yumurtayı bulsun", emoji: "🥚" },
          { id: "yavru-dino", label: "Yolunu kaybeden yavruya yol göstersin", emoji: "🐾" },
          { id: "dogum-gunu", label: "Dino dostuna sürpriz hazırlasın", emoji: "🎂" },
        ],
      },
    ],
  },
  {
    id: "peri-bahcesi",
    title: "Peri Bahçesi",
    emoji: "🧚",
    tagline: "Minicik dostların büyülü dünyası",
    description:
      "Çocuğunuz bir gece ışıldayan bahçede minicik perilerle tanışır ve bahçenin küçük bir derdine çare olur.",
    gradient: "from-pink/25 to-primary/15",
    options: [
      {
        id: "dost",
        question: "Bahçedeki dostu kim olsun?",
        choices: [
          { id: "peri", label: "Minik Peri", emoji: "🧚" },
          { id: "atesbocegi", label: "Ateş Böceği", emoji: "✨" },
          { id: "kelebek", label: "Konuşan Kelebek", emoji: "🦋" },
        ],
      },
      {
        id: "mekan",
        question: "Bahçenin neresi keşfedilsin?",
        choices: [
          { id: "mantar-evler", label: "Mantar Evler", emoji: "🍄" },
          { id: "yildiz-havuzu", label: "Yıldız Havuzu", emoji: "🌟" },
          { id: "gizli-kapi", label: "Ağaç Kovuğundaki Gizli Kapı", emoji: "🚪" },
        ],
      },
      {
        id: "dert",
        question: "Bahçenin derdi ne olsun?",
        choices: [
          { id: "isiklar", label: "Işıkları sönen fenerler", emoji: "🏮" },
          { id: "tohum", label: "Açmayan sihirli tohum", emoji: "🌱" },
          { id: "yagmur", label: "Yağmuru unutan bulut", emoji: "🌧️" },
        ],
      },
    ],
  },
];

export function getTheme(id: string): StoryTheme | undefined {
  return THEMES.find((t) => t.id === id);
}
