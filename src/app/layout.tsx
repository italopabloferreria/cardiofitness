import type { Metadata } from 'next';
import { AppProvider } from '@/lib/store';
import './globals.css';
export const metadata: Metadata = {title:'Cardiofitness | Avaliações',description:'Avaliações, colaboradores e ciclos. Acesso exclusivo do RH.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body><AppProvider>{children}</AppProvider></body></html>;}
