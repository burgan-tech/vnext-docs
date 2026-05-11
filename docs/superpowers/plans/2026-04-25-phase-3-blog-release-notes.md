# Phase 3 — Blog (Release Notes Migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** vnext-runtime'daki 21 release notes markdown'ını Docusaurus blog post formatına dönüştür ve `vnext-docs/blog/` altına yerleştir; her post için tarih, sürüm, tag frontmatter'ı ekle, MDX uyumluluğunu sağla, referans görselleri taşı.

**Architecture:** Kaynak dosyalar (`vnext-runtime/release/RELEASE-NOTES-vX.X.XX.md`) okunur. Her dosyanın 2. satırındaki `**Release Date:** Month Day, Year` parse edilir → `YYYY-MM-DD` ISO formatına çevrilir. Dosya `blog/YYYY-MM-DD-vX-X-XX.md` adıyla kopyalanır. Frontmatter (slug, title, date, authors, tags) prepend edilir. MDX-incompatible syntax (HTML comments, `<TypeName>` generic'ler, `{...}` placeholder'lar) düzeltilir. Görseller `vnext-runtime/release/img/*` → `static/img/blog/*` taşınır ve referanslar güncellenir.

**Tech Stack:** Docusaurus blog plugin (Phase 0'da konfigüre edildi), bash + perl (parsing + transformation), npm run build (verification).

---

## Scope

**Dahil**:
- 21 dosya: `release/RELEASE-NOTES-v0.0.{13,14,16,18,19,20,21,22,23-26,27,29,31,33,34-35,36,37,38,39,40,42,43}.md`
- 3 image: `release/img/{Logging,Response_Header,Tracing}.png`

**Dahil DEĞİL**:
- `release/extra/` (script samples + validate.js — Technical referans dışı, dropped)
- Welcome blog post (Phase 0'da `blog/2026-04-24-welcome.md` oluşturuldu — kalıyor)

---

## Target File Structure

```
vnext-docs/blog/
├── authors.yml                              (Phase 0'da oluşturuldu — kalır)
├── 2026-04-24-welcome.md                    (Phase 0'da oluşturuldu — kalır)
├── 2025-10-23-v0-0-13.md                    (from RELEASE-NOTES-v0.0.13.md)
├── 2025-MM-DD-v0-0-14.md
├── ...
└── 2026-04-06-v0-0-43.md                    (from RELEASE-NOTES-v0.0.43.md)

vnext-docs/static/img/blog/
├── Logging.png
├── Response_Header.png
└── Tracing.png
```

**Phase 3 sonunda**: 21 yeni blog post + 1 welcome (toplam 22 post), 3 image asset.

---

## Constants

### Frontmatter Template (her release için)

```yaml
---
slug: release-v0-0-NN
title: Release v0.0.NN
authors: [vnext-team]
tags: [release]
date: YYYY-MM-DD
---
```

`vnext-team` author Phase 0'da `blog/authors.yml`'de tanımlandı.

### Truncate Marker

İlk paragraftan sonra Docusaurus blog özet sınırı için MDX-uyumlu marker:
```markdown
{/* truncate */}
```

### Date Conversion

Kaynaktaki `**Release Date:** April 6, 2026` → `2026-04-06` formatına çevrilecek. Tüm 21 dosyada `**Release Date:**` satırı mevcut.

### Common MDX Issues (Phase 1 + 2 dersleri)

- HTML comment `<!-- ... -->` → `{/* ... */}` (eğer varsa)
- Generic `<List>`, `<Dictionary<,>>`, `<T>` markdown body'de → backtick içine
- Placeholder `{domain}`, `{wf}`, `{id}` table cell'inde → backtick içine
- `:::highlight` admonition → standard Docusaurus admonition (varsa)

---

## Tasks

### Task 1: Date Mapping — Build Lookup Table

İlk olarak 21 dosyanın **release tarihlerini** tek seferde topla. Bu lookup'ı sonraki task'larda kullanacağız.

**Files:**
- Create: `/tmp/release-dates.tsv` (geçici — mapping tablosu)

- [ ] **Step 1: Extract release dates from all 21 files**

```bash
SRC=/Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/release
> /tmp/release-dates.tsv

for f in $SRC/RELEASE-NOTES-v*.md; do
  basename=$(basename "$f" .md)               # RELEASE-NOTES-v0.0.43
  version=${basename#RELEASE-NOTES-v}         # 0.0.43
  date_line=$(grep -m1 '^\*\*Release Date:\*\*' "$f")
  # Parse "**Release Date:** April 6, 2026" → "2026-04-06"
  date_iso=$(echo "$date_line" | sed -E 's/^\*\*Release Date:\*\* //' | python3 -c "import sys,datetime; print(datetime.datetime.strptime(sys.stdin.read().strip(), '%B %d, %Y').strftime('%Y-%m-%d'))")
  echo -e "$version\t$date_iso\t$basename" >> /tmp/release-dates.tsv
done

cat /tmp/release-dates.tsv
```

Expected output: 21 satır, formatı `0.0.43<TAB>2026-04-06<TAB>RELEASE-NOTES-v0.0.43`. Hatasız parse.

- [ ] **Step 2: Sanity check — count + sample**

```bash
wc -l /tmp/release-dates.tsv
head -3 /tmp/release-dates.tsv
tail -3 /tmp/release-dates.tsv
```
Expected: 21 satır; en eski = v0.0.13 (Ekim 2025), en yeni = v0.0.43 (Nisan 2026).

---

### Task 2: Image Migration

**Files:**
- Create: `static/img/blog/Logging.png`, `Response_Header.png`, `Tracing.png`

- [ ] **Step 1: Copy images**

```bash
mkdir -p static/img/blog
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/release/img/*.png static/img/blog/
ls -la static/img/blog/
```
Expected: 3 PNG dosyası.

---

### Task 3: Bulk Migrate Release Notes (Copy + Rename)

**Files:**
- Create: `blog/YYYY-MM-DD-v0-0-NN.md` × 21 (Task 1 mapping'inden)

- [ ] **Step 1: Copy each release file with new naming**

```bash
SRC=/Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/release

while IFS=$'\t' read -r version date basename; do
  # Convert version (0.0.43) → slug-safe (0-0-43)
  version_slug=$(echo "$version" | tr '.' '-')
  target="blog/${date}-v${version_slug}.md"
  cp "$SRC/$basename.md" "$target"
done < /tmp/release-dates.tsv

ls blog/ | head -10
echo "Total blog files:"
ls blog/*.md | wc -l
```
Expected: 22 markdown (21 release + 1 welcome) + `authors.yml`.

---

### Task 4: Inject Blog Frontmatter into Each Post

**Files:**
- Modify: 21 `blog/YYYY-MM-DD-v0-0-NN.md` (frontmatter prepend)

- [ ] **Step 1: Generate frontmatter and prepend to each file**

```bash
while IFS=$'\t' read -r version date basename; do
  version_slug=$(echo "$version" | tr '.' '-')
  target="blog/${date}-v${version_slug}.md"

  # Build frontmatter
  fm="---
slug: release-v${version_slug}
title: Release v${version}
authors: [vnext-team]
tags: [release]
date: ${date}
---
"
  # Prepend
  printf '%s\n%s' "$fm" "$(cat "$target")" > "$target"
done < /tmp/release-dates.tsv

# Sanity
head -10 blog/2026-04-06-v0-0-43.md
```
Expected: Frontmatter doğru oluştu; ilk 7 satır YAML, sonra orijinal `# vNext Runtime Platform - Release Notes v0.0.43` başlığı.

---

### Task 5: Strip Original H1 + Release Date Line (Avoid Duplication)

Frontmatter `title` Docusaurus tarafından H1 olarak render edilir. Orijinal `# vNext Runtime Platform - Release Notes v0.0.NN` ve `**Release Date:** ...` satırları artık duplicate olur.

- [ ] **Step 1: Remove original H1 + Release Date lines**

```bash
for f in blog/2025*.md blog/2026-*-v0-*.md; do
  # Skip welcome post (starts with 2026-04-24)
  [[ "$f" == "blog/2026-04-24-welcome.md" ]] && continue

  # Use perl to delete first line matching "# vNext Runtime Platform" and the next "**Release Date:**" line
  perl -i -ne '
    if (!$skipped_h1 && /^# vNext Runtime Platform - Release Notes/) { $skipped_h1 = 1; next; }
    if (!$skipped_date && /^\*\*Release Date:\*\*/) { $skipped_date = 1; next; }
    print;
  ' "$f"
done

# Sanity
sed -n '7,15p' blog/2026-04-06-v0-0-43.md
```
Expected: Frontmatter sonrası direkt `## Overview` başlığı geliyor; eski H1 ve Release Date satırları yok.

---

### Task 6: Add Truncate Marker After First Paragraph

Blog list view'de her post sadece **özet**i (truncate marker'a kadar) gösterir. Mevcut kaynak dosyalarda truncate marker yok — hemen `## Overview` başlığından sonraki ilk paragraftan sonra MDX-uyumlu marker ekle.

- [ ] **Step 1: Insert `{/* truncate */}` after Overview paragraph**

```bash
for f in blog/2025*.md blog/2026-*-v0-*.md; do
  [[ "$f" == "blog/2026-04-24-welcome.md" ]] && continue

  # After "## Overview" + (potentially blank line) + first paragraph + blank line, insert truncate
  perl -i -0pe 's|(## Overview\n\n[^\n]+\n)\n|\1\n{/* truncate */}\n\n|' "$f"
done

# Sanity
grep -B1 -A2 'truncate' blog/2026-04-06-v0-0-43.md | head -10
```
Expected: `## Overview` paragraph'undan hemen sonra `{/* truncate */}` görünür.

---

### Task 7: Image Path Rewrite

Eğer release notes görsel referansı içeriyorsa (`./img/Logging.png`, `../img/Tracing.png` vb.), bunları `/img/blog/...` absolute path'ine çevir.

- [ ] **Step 1: Find image references**

```bash
grep -rn -E '!\[[^]]*\]\([^)]+\.(png|jpg|svg|gif)\)' blog/ | head -10
```

- [ ] **Step 2: Rewrite paths**

```bash
for f in blog/*.md; do
  perl -i -pe 's|\(\./img/|(/img/blog/|g; s|\(\.\./img/|(/img/blog/|g; s|\(img/|(/img/blog/|g' "$f"
done

grep -rn '/img/blog/' blog/ | head -5
```
Expected: Tüm image link'leri `/img/blog/...` formatında.

---

### Task 8: MDX Compatibility Fixes

Phase 1+2'den bilinen MDX problemleri release notes'ta da olabilir. Önce build çalıştır, sonra hataları düzelt.

- [ ] **Step 1: Initial build to surface MDX errors**

```bash
npm run build 2>&1 | grep -E "MDX compilation failed|Cause: Unexpected" | head -10
```

- [ ] **Step 2: Apply common fixes**

Eğer hata varsa, problem dosyalarında:

```bash
# Generic syntax outside code: Dictionary<...>, List<T>, Task<...> → backtick
# Find candidates (excluding already in code blocks):
grep -rn -E '[A-Z][a-z]+<[A-Z]' blog/ | grep -v '^.*```' | head -20

# Fix per case with Edit tool — wrap in backticks
```

- [ ] **Step 3: Apply HTML comment / placeholder fixes if needed**

```bash
# Replace <!-- ... --> with {/* ... */}
for f in blog/*.md; do
  perl -i -pe 's|<!--\s*([^>]*?)\s*-->|{/* $1 */}|g' "$f"
done

# Wrap {variable} placeholders inside table cells in backticks (if reported as JSX errors)
# Apply only on demand from build error messages
```

- [ ] **Step 4: Re-build until clean**

```bash
npm run build 2>&1 | grep -E "(SUCCESS|FAIL|MDX compilation|Cause:)" | head -10
```
Expected: `[SUCCESS] Generated static files in "build"` + `"build/en"`.

If failures remain → manual `Edit` per file from error messages, then re-build.

---

### Task 9: EN Locale — Skip Per-File Translation, Rely on Fallback

Release notes orijinalinden English yazılmış (kaynak `release/*.md` İngilizcedir). TR locale'de Docusaurus tarafından **default olarak source kullanılır** (no `i18n/en/` content needed for blog).

**Karar**: Release notes'lar her iki locale'de aynı içerikle servis edilir (fallback default davranışı). Ayrı EN translation klasörü açılmaz. Eğer ileride TR çevirisi istenirse Phase 6 polish'te eklenebilir.

- [ ] **Step 1: Verify EN locale shows the same posts**

```bash
ls build/en/blog/ 2>/dev/null | head -5
```
Expected: build/en/blog/ klasörü altında aynı slug'lar (release-v0-0-43, vb.) görünür.

- [ ] **Step 2: Spot check both locales build cleanly**

```bash
npm run build 2>&1 | tail -10
```
Expected: 2 SUCCESS satırı.

---

### Task 10: Cross-Link Sample (Optional but Recommended)

Spec exit criteria: "En az 3 release note'dan Technical/Architecture sayfasına cross-reference verildi". En etkili 2-3 release'i seç ve manual cross-link ekle.

- [ ] **Step 1: Identify candidate release notes for cross-linking**

Adaylar:
- v0.0.43 → "instance-data–based authorization" + "auto-transition rules" → `/docs/concepts/transitions`, `/docs/how-to/instance-filtering`
- v0.0.42 → muhtemelen runtime instance subscription → `/docs/getting-started/first-instance`
- v0.0.39 → "master schema field-level visibility" → `/docs/components/functions/built-in`

(Aday seçimi için `release/RELEASE-NOTES-v0.0.{39,42,43}.md` içeriklerine göz at.)

- [ ] **Step 2: Add `## Related Docs` section to selected posts**

For each selected post, append before the closing footer:

```markdown
## Related Docs

- [Transitions](/docs/concepts/transitions) — auto-transition rule details
- [Instance Filtering](/docs/how-to/instance-filtering) — JSONPath filter syntax
```

(Specific cross-links per post — use `Edit` tool with the exact content.)

- [ ] **Step 3: Build verification**

```bash
npm run build 2>&1 | grep -E "(SUCCESS|FAIL|Cause:)" | head -5
```
Expected: `[SUCCESS]`.

---

### Task 11: Final Verification

- [ ] **Step 1: Clean build with `onBrokenLinks: 'throw'`**

```bash
rm -rf build .docusaurus
npm run build 2>&1 | tail -10
```
Expected: 2 SUCCESS satırı, hata yok.

- [ ] **Step 2: Inventory check**

```bash
echo "Blog post count:"
ls blog/*.md | wc -l
echo ""
echo "Image asset count:"
ls static/img/blog/ | wc -l
echo ""
echo "Newest 3 posts:"
ls -t blog/*.md | head -3
```
Expected: 22 .md dosyası (21 release + 1 welcome), 3 PNG.

- [ ] **Step 3: Start dev server, visual check**

```bash
npm run start
```
Tarayıcıda kontrol et:
- `/blog` → blog index, 22 post chronological
- En yeni post (v0.0.43) en üstte
- Bir release post'a tıkla → frontmatter title doğru render
- Truncate marker ile özet sınırı çalışıyor (blog list'te overview paragrafı sonrası "Read More" link'i var)
- Tag filter (`/blog/tags/release`) tüm release post'ları gösteriyor
- Cross-link'ler (Task 10) Technical sayfalarına yönlendiriyor
- Locale dropdown'dan EN'e geç → aynı blog post'lar görünür

Ctrl+C ile durdur.

- [ ] **Step 4: Cleanup temp file**

```bash
rm -f /tmp/release-dates.tsv
```

---

## Verification Summary (Phase 3 Exit Criteria)

- ✅ 21 release notes blog'da yayında
- ✅ Chronological sidebar/index çalışıyor (en yeni en üstte)
- ✅ Her post için frontmatter (slug, title, date, authors, tags) doğru
- ✅ Tag filter (`/blog/tags/release`) çalışıyor
- ✅ MDX compile clean
- ✅ Build temiz (page-level `onBrokenLinks: 'throw'`)
- ✅ En az 2-3 post Technical/Architecture içeriğine cross-link içeriyor
- ✅ Reference image'ları (`Logging.png`, `Response_Header.png`, `Tracing.png`) yayında

## Out of Scope

- TR çevirisi (release notes İngilizce kalır; TR locale'de fallback ile servis edilir)
- `release/extra/script-base-usage/*.csx` migration (Technical sample içeriği — gerekirse Phase 1.5'te)
- Atom/RSS feed customization (Docusaurus default ayar yeterli)
- Release post'larında semantic version filter veya version timeline component (Phase 6 polish)
