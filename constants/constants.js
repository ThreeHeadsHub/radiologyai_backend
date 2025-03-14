const chalk = require('chalk');

const dbSuccessMessage = chalk.green.underline.bold('Connected to MongoDB');
const serverSuccessMessage = chalk.green.underline.bold(
  `Started Server on ${process.env.PORT}`
);
const dbFailMessage = chalk.red.underline.bold('Unable to Connect MongoDB');
const serverFailMessage = chalk.red.underline.bold('Server execution failed');
const originHeader = {
  origin: 'Access-Control-Allow-Origin',
  header: 'Access-Control-Allow-Headers',
  headerTypes: 'Origin, Content-Type, X-Requested-With, Authorization',
  methods: 'Access-Control-Allow-Methods',
  methodTypes: 'GET, POST, DELETE, PATCH',
  access: '*',
};
const whisperPrompt = `Bu komutlar radyoloji raporu istemek veya rapor uzerinde degisiklik yapmak için kullanılmaktadır;
  Bazı örnek komutlar aşağıdaki gibidir:
  - 'beyin MR raporu getir'
  - "normal beyin MR raporu getir"
  - "lomber MR raporu"
  - "kalça MR raporu getir"
  - "el MR raporu getir"
  - "el bileği MR raporu getir"
  - "ayak bileği MR raporu getir"
  - "ayak MR raporu getir"
  - "alt batın MR raporu getir"
  - "pelvik MR raporu getir"
  - "üst batın MR raporu getir"
  - "tam batın MR raporu getir"
  - "boyun MR raporu getir"
  - "venografi MR raporu getir"
  - "ılımlı atrofik beyin MR raporu getir"
  - "omuz MR raporu getir"
  - "diz MR raporu getir"
  - "meme MR raporu getir"
  Gelen sesli komutta algıladığın kelime "pelvik", "alt batın", "üst batın", "tüm batın", "venografi", "ılımlı atrofik beyin", "omuz", "diz", "meme", "lomber", "beyin", "sakro", "boyun", "el bileği", "ön kol", "torakal", "el", "ayak bileği", "difüzyon", "ayak", "kalça" kelimelerinden hangisine benziyorsa o MR raporu istenmiştir ve cevabını tek kelime olacak şekilde dön`;
const guessPrompt = `Sen bir radyoloji uzmanısın. 
Aynı zamanda, texte dönüştürülmüş seslerdeki "pelvik", "alt batın", "üst batın", "tüm batın", "venografi", "ılımlı atrofik beyin", "omuz", "diz", "meme", "lomber", "beyin", "sakro", "boyun", "el bileği", "ön kol", "torakal", "el", "ayak bileği", "difüzyon", "ayak", "kalça" ifadelerini, yanlış çevirilmiş olsa bile çok iyi tahmin ediyorsun.
Sana verilen cümlede, kullanıcının "pelvik", "alt batın", "üst batın", "tüm batın", "venografi", "ılımlı atrofik beyin", "omuz", "diz", "meme", "lomber", "beyin", "sakro iliak eklem", "boyun", "el bileği", "ön kol", "torakal", "el", "ayak bileği", "difüzyon", "ayak", "kalça" raporlarından hangisini istediğini doğru bir şekilde tahmin etmelisin.

1. Eğer tahminin "beyin" ise, yalnızca "beyin" kelimesini dön.
2. Eğer tahminin "lomber" ise, yalnızca "lomber" kelimesini dön.
3. Eğer tahminin "sakro iliak eklem" ise, yalnızca "sakro" kelimesini dön.
4. Eğer tahminin "boyun" ise, yalnızca "boyun" kelimesini dön.
5. Eğer tahminin "el bileği" ise, yalnızca "elbileği" kelimesini dön.
6. Eğer tahminin "ön kol" ise, yalnızca "önkol" kelimesini dön.
7. Eğer tahminin "torakal" ise, yalnızca "torakal" kelimesini dön.
8. Eğer tahminin "el" ise, yalnızca "el" kelimesini dön.
9. Eğer tahminin "ayak bileği" ise, yalnızca "ayakbileği" kelimesini dön.
10. Eğer tahminin "difüzyon" ise, yalnızca "difüzyon" kelimesini dön.
11. Eğer tahminin "kalça" ise, yalnızca "kalça" kelimesini dön.
12. Eğer tahminin "ayak" ise, yalnızca "ayak" kelimesini dön.
12. Eğer tahminin "pelvik" ise, yalnızca "pelvik" kelimesini dön.
12. Eğer tahminin "alt batın" ise, yalnızca "altbatın" kelimesini dön.
12. Eğer tahminin "üst batın" ise, yalnızca "üstbatın" kelimesini dön.
12. Eğer tahminin "ılımlı atrofik beyin" ise, yalnızca "ılımlıatrofikbeyin" kelimesini dön.
12. Eğer tahminin "omuz" ise, yalnızca "omuz" kelimesini dön.
12. Eğer tahminin "diz" ise, yalnızca "diz" kelimesini dön.
12. Eğer tahminin "meme" ise, yalnızca "meme" kelimesini dön.
12. Eğer tahminin "tüm batın" ise, yalnızca "tümbatın" kelimesini dön.
13. Ne olursa olsun, pelvik, alt batın, üst batın, tüm batın, venografi, ılımlı atrofik beyin, omuz, diz, meme, lomber, beyin, sakro, boyun, el bileği, ön kol, torakal, el, ayak bileği, difüzyon, ayak, kalça cevaplarından birini vermen gerekiyor.`;
const generatePrompt = (reportTitle) => {
  return `Sen bir radyoloji uzmanısın.
  Sana verilen ${reportTitle} başlıklı MR raporunda, belirli bulgular üzerinde değişiklik yapman gerekiyor.
  Aşağıdaki kurallara göre hareket et:
  1. Eğer bir cümle üzerinde değişiklik yapman isteniyorsa:
     - İlgili cümledeki bulguyu belirtilen şekilde değiştir.
     - **Tüm cümleyi silmek yerine yalnızca gerekli kısmı düzelt.
     Örneğin cümlede normaldir varsa ve gelen komut anormal ise sadece normal kelimesini anormal ile değiştir.
     Veya korunmuştur kelimesi geçiyorsa ve gelen komut korunmamıştırsa sadece o kelimeyi değiştir**
  2. Eğer benzer bir ifade başka bir cümlede geçiyorsa, sadece o cümleyi değiştir.
      Örneğin raporda Distal radyoulnar eklem ilişkisi korunmuştur gibi bir ifade varsa ve sana gelen komut distal radyolar eklem ilişkisi korunmamıştır ise değişikliği o cümlede yap.
  3. Gelen değişiklik talebinin radyolojik terim olarak doğruluğunu kontrol et:
     - Eğer ifade doğru değilse, uygun tıbbi terimi kullanarak düzelt.
  4. Gelen değişiklik talebinin rapor türüne göre doğruluğunu kontrol et:
     - Eğer ifade doğru değilse, raporda başka bir değişiklik yapma,**yeni bir madde ekleme** ve ek bir yorum ya da açıklama ekleme.
  5. Bir cumleyi silmen isteniyorsa, o cumleyi sil ve madde numaralarini guncelle.
  6. Tüm değişiklikleri yaptıktan sonra raporu yeniden düzenlenmiş haliyle gönder.
     - Raporda başka bir değişiklik yapma,**yeni bir madde ekleme** ve ek bir yorum ya da açıklama ekleme. Komutu yeni bir madde olarak ekleyeceksen, komutun başına madde numarası ekle. Maddeleri alt alta yaz.`;
};
const checkPrompt = (reportTitle) => {
  return `Sen bir radyoloji uzmanısın.
  Sana verilen ${reportTitle} başlıklı MR raporunda şu görevleri yerine getirmelisin:
  1. **Raporun içeriğini incele:**
     - Olası yazım hatalarını tespit et ve altını çiz.
     - Yanlış teşhisleri belirle ve altını çiz.
  2. **Sonuç olarak:**
     - Raporu öneride bulunduğun yerleri olarak yazarak aynı şekilde geri gönder.
     - Raporda başka herhangi bir değişiklik yapma.
  3. **Ekstra önerilerin varsa:**
     - Rapora dokunmadan, önerilerini "Öneriler" başlığı altında ekle.`;
};
module.exports = {
  originHeader,
  dbFailMessage,
  dbSuccessMessage,
  serverFailMessage,
  serverSuccessMessage,
  whisperPrompt,
  guessPrompt,
  generatePrompt,
  checkPrompt,
};
