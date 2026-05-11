import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

type Persona = {
  title: string;
  description: string;
  to: string;
  emoji: string;
};

const PERSONAS: Persona[] = [
  {
    emoji: '⚙️',
    title: 'Technical',
    description: 'Local dev kurulumu, çekirdek kavramlar, components, services, API reference.',
    to: '/docs/intro',
  },
  {
    emoji: '🏛️',
    title: 'Architecture',
    description: 'Domain modeli, runtime, veri katmanı, altyapı, mimari kararlar (ADR).',
    to: '/architecture/intro',
  },
  {
    emoji: '💼',
    title: 'Business',
    description: 'Manifesto, capabilities, kullanım senaryoları, value proposition.',
    to: '/business/intro',
  },
  {
    emoji: '🎯',
    title: 'Product',
    description: 'Ürün vizyonu, feature catalog, roadmap, persona ve release stratejisi.',
    to: '/product/intro',
  },
];

function PersonaCard({ persona }: { persona: Persona }): ReactNode {
  return (
    <Link className={styles.personaCard} to={persona.to}>
      <div className={styles.personaEmoji}>{persona.emoji}</div>
      <Heading as="h3" className={styles.personaTitle}>
        {persona.title}
      </Heading>
      <p className={styles.personaDescription}>{persona.description}</p>
    </Link>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header className={styles.hero}>
        <div className="container">
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        </div>
      </header>
      <main>
        <section className={styles.personasSection}>
          <div className="container">
            <div className={styles.personasGrid}>
              {PERSONAS.map((p) => (
                <PersonaCard key={p.title} persona={p} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
