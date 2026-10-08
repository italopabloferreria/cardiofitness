'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="error-page"><h1>Não foi possível abrir o painel.</h1><p>Seus dados permanecem salvos. Tente carregar a página novamente.</p><button onClick={reset}>Tentar novamente</button></main>;}
