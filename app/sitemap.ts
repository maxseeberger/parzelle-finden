import type { MetadataRoute } from 'next'
import { CITIES } from '@/lib/cities'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://parzelle-finden.de'

  const cityPages = CITIES.map(city => ({
    url: `${base}/kleingarten-${city.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  const ratgeberPages = [
    'warteliste', 'abloese', 'bundeskleingartengesetz', 'kosten', 'ohne-warteliste', 'uebernehmen',
  ].map(slug => ({
    url: `${base}/ratgeber/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/vereine`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/ratgeber`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/warteliste`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/abloese`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    ...cityPages,
    ...ratgeberPages,
  ]
}
