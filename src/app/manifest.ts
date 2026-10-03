import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nilufər Ekosistemi',
    short_name: 'Nilufər',
    description: 'Təbii Göl və Nilufər Tapşırıq İzləyicisi',
    start_url: '/',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#030712',
    icons: [
      {
        src: '/bell-icon.jpg',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
