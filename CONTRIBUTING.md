# Contributing to vNext Docs

vNext Platform dokümantasyonuna katkıda bulunduğun için teşekkürler! Bu rehber dokümanları nasıl yazacağını ve PR sürecini açıklar.

## Local Development

```bash
npm install
npm run start                  # Dev server (TR, default locale)
npm run start -- --locale en   # Dev server (EN)
npm run build                  # Production build (catches broken links)
npm run serve                  # Serve production build locally
```

## Klasör Yapısı (özet)

| Klasör | İçerik |
|---|---|
| `docs/` | Technical instance — developer docs |
| `architecture/` | Architecture instance — architect/CTO docs |
| `business/` | Business instance — business stakeholder docs |
| `product/` | Product instance — PM docs |
| `blog/` | Release notes ve duyurular |
| `i18n/en/` | EN çeviriler — eksikse TR fallback |
| `docs/superpowers/specs/` | Design spec'leri |
| `docs/superpowers/plans/` | Phase implementation plan'ları |

## Yeni Sayfa Ekleme

1. İlgili instance klasörüne TR markdown dosyası ekle. Örnek: `docs/getting-started/my-page.md`
2. Frontmatter ekle:
   ```yaml
   ---
   sidebar_position: 1
   title: Sayfa Başlığı
   ---
   ```
3. EN çevirisi gerekiyorsa: `i18n/en/docusaurus-plugin-content-docs/current/getting-started/my-page.md`
4. Local'de test et: `npm run start`
5. Build'i doğrula: `npm run build` (broken link kontrolü için)

## MDX Notları

- Dosya uzantısı `.md` olsa bile Docusaurus MDX parser kullanır.
- HTML yorum `<!-- ... -->` DESTEKLENMEZ. Yorum için `{/* ... */}` kullan.
- Blog post'larda "truncate" marker: `{/* truncate */}`

## Dil Stratejisi

- **TR primary, EN secondary.** Yeni içerik önce TR yazılır.
- EN çevirisi eksikse Docusaurus otomatik olarak TR source'u servis eder.
- Priority pages (getting-started, concepts) için EN zorunludur; geri kalanı kademeli.

## PR Süreci

1. Feature branch oluştur: `git checkout -b feat/my-change`
2. Commit'lerini conventional commits formatında yaz: `feat:`, `fix:`, `docs:`, `chore:`, `ci:`
3. PR aç. CI build'i otomatik çalışır.
4. CI yeşil olduktan sonra review iste.
5. Merge sonrası `main` → GitHub Pages otomatik deploy olur.
