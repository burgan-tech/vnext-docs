import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function IconTechnical() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconArchitecture() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <path d="M10 6.5h4" />
      <path d="M6.5 10v4" />
      <path d="M17.5 10v4" />
      <path d="M10 17.5h4" />
    </svg>
  );
}

function IconBusiness() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20" />
      <path d="M5 20V10l7-5 7 5v10" />
      <path d="M9 20v-4h6v4" />
      <path d="M9 14h.01" />
      <path d="M15 14h.01" />
    </svg>
  );
}

function IconProduct() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

type Persona = {
  title: string;
  description: string;
  to: string;
  icon: () => ReactNode;
  accent: string;
};

const PERSONAS: Persona[] = [
  {
    icon: IconTechnical,
    accent: '#2563eb',
    title: 'Technical',
    description:
      'Local dev kurulumu, çekirdek kavramlar, components, services, API reference.',
    to: '/docs/intro',
  },
  {
    icon: IconArchitecture,
    accent: '#7c3aed',
    title: 'Architecture',
    description:
      'Domain modeli, runtime, veri katmanı, altyapı, mimari kararlar (ADR).',
    to: '/architecture/intro',
  },
  {
    icon: IconBusiness,
    accent: '#0891b2',
    title: 'Business',
    description:
      'Manifesto, capabilities, kullanım senaryoları, value proposition.',
    to: '/business/intro',
  },
  {
    icon: IconProduct,
    accent: '#059669',
    title: 'Product',
    description:
      'Ürün vizyonu, feature catalog, roadmap, persona ve release stratejisi.',
    to: '/product/intro',
  },
];

type Feature = {
  title: string;
  description: string;
  icon: () => ReactNode;
};

function IconWorkflow() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="6" r="3" />
      <path d="M5 9v6" />
      <circle cx="5" cy="18" r="3" />
      <path d="M12 3h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4" />
      <path d="M8 9h2" />
      <circle cx="19" cy="18" r="3" />
      <path d="M19 15V9" />
    </svg>
  );
}

function IconMultiDomain() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function IconDapr() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

const FEATURES: Feature[] = [
  {
    icon: IconWorkflow,
    title: 'Workflow Engine',
    description: 'JSON tabanlı iş süreçleri orkestrasyon motoru',
  },
  {
    icon: IconMultiDomain,
    title: 'Multi-Domain',
    description: 'Birden fazla iş alanını tek platformda yönetin',
  },
  {
    icon: IconDapr,
    title: 'Dapr Integration',
    description: 'Cloud-native building blocks ile event-driven mimari',
  },
];

function PersonaCard({ persona }: { persona: Persona }): ReactNode {
  const Icon = persona.icon;
  return (
    <Link
      className={styles.personaCard}
      to={persona.to}
      style={{ '--card-accent': persona.accent } as React.CSSProperties}
    >
      <div className={styles.personaIcon}>
        <Icon />
      </div>
      <Heading as="h3" className={styles.personaTitle}>
        {persona.title}
      </Heading>
      <p className={styles.personaDescription}>{persona.description}</p>
      <span className={styles.personaArrow} aria-hidden="true">
        &rarr;
      </span>
    </Link>
  );
}

function FeatureItem({ feature }: { feature: Feature }): ReactNode {
  const Icon = feature.icon;
  return (
    <div className={styles.featureItem}>
      <div className={styles.featureIcon}>
        <Icon />
      </div>
      <div>
        <strong className={styles.featureTitle}>{feature.title}</strong>
        <p className={styles.featureDescription}>{feature.description}</p>
      </div>
    </div>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header className={styles.hero}>
        <div className={styles.heroPattern} aria-hidden="true" />
        <div className={`container ${styles.heroContent}`}>
          <p className={styles.heroBadge}>Open-Source Documentation</p>
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
          <div className={styles.heroCtas}>
            <Link className={styles.ctaPrimary} to="/docs/intro">
              Dokümantasyona Başla
            </Link>
            <Link className={styles.ctaSecondary} to="/architecture/intro">
              Mimariyi Keşfet
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.personasSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <Heading as="h2" className={styles.sectionTitle}>
                Dokümantasyon Alanları
              </Heading>
              <p className={styles.sectionSubtitle}>
                Rolünüze uygun dokümantasyon bölümüne hızlıca ulaşın
              </p>
            </div>
            <div className={styles.personasGrid}>
              {PERSONAS.map((p) => (
                <PersonaCard key={p.title} persona={p} />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.featuresSection}>
          <div className="container">
            <div className={styles.featuresGrid}>
              {FEATURES.map((f) => (
                <FeatureItem key={f.title} feature={f} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
