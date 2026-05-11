# vnext-docs

[vNext Platform](https://github.com/burgan-tech) için dokümantasyon sitesi.

🌐 **Live**: https://burgan-tech.github.io/vnext-docs/

Bu site 4 bölümden oluşur:

- **Technical** — Developer dokümantasyonu (local dev, kavramlar, components, API)
- **Architecture** — Mimari dokümantasyon (domain, runtime, veri, altyapı, ADR)
- **Business** — İş değeri dokümantasyonu (manifesto, capabilities, value)
- **Product** — Ürün dokümantasyonu (vizyon, features, roadmap, personas)

## Local Development

```bash
npm install
npm run start
```

`http://localhost:3000/vnext-docs/` adresinde açılır.

## Daha Fazla Bilgi

- [CONTRIBUTING.md](CONTRIBUTING.md) — katkı rehberi
- [docs/superpowers/specs/](docs/superpowers/specs/) — design spec'leri
- [docs/superpowers/plans/](docs/superpowers/plans/) — phase implementation plan'ları

## Tech Stack

- [Docusaurus 3.x](https://docusaurus.io/) — static site generator
- TypeScript
- GitHub Pages — hosting
- GitHub Actions — CI/CD
