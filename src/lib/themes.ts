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
        ],
      },
      {
        id: "mekan",
        question: "Macera nerede geçsin?",
        choices: [
          { id: "orman", label: "Büyülü Orman", emoji: "🌳" },
          { id: "okyanus", label: "Derin Okyanus", emoji: "🌊" },
          { id: "gokyuzu", label: "Bulutların Üstü", emoji: "☁️" },
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
];

export function getTheme(id: string): StoryTheme | undefined {
  return THEMES.find((t) => t.id === id);
}
