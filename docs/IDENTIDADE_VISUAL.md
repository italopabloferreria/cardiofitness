# Identidade visual — Cardiofitness Avaliações

Referência oficial: [cardiofitness.com.br](https://cardiofitness.com.br/). Consulta pública em 7 de outubro de 2026. A aplicação usa a identidade da clínica; mantém a navegação, o escopo e as funcionalidades do painel de RH.

## Elementos oficiais verificados

**O logotipo visível é o arquivo original enviado pelo usuário**, `LOGO DA EMPRESAA.jpg.jpeg`, de 718 × 106 pixels, com o subtítulo “CARDIOLOGIA E MEDICINA PREVENTIVA”. A cópia em `public/brand/cardiofitness-logo.jpeg` preserva integralmente os bytes do arquivo fornecido. Não foi redesenhado, recortado, recolorido nem substituído por ícone genérico. Apenas sua largura de exibição se adapta à tela, mantendo a proporção original. Nas áreas escuras, aparece sobre fundo branco para preservar as cores originais.

A imagem do cabeçalho público, [logo_cardiofitness-extendida.png](https://cardiofitness.com.br/wp-content/uploads/2023/08/logo_cardiofitness-extendida.png), de 1616 × 302 pixels, permanece em `public/brand/cardiofitness-logo.png` exclusivamente como referência da auditoria. O componente de marca da aplicação usa o JPEG fornecido pelo usuário.

O símbolo separado também foi obtido do [favicon oficial](https://cardiofitness.com.br/wp-content/uploads/2023/08/favicon-cardiofitness.png) e preservado em `public/brand/cardiofitness-symbol.png`.

A definição `.elementor-kit-3136` do [CSS global oficial](https://cardiofitness.com.br/wp-content/uploads/elementor/css/post-3136.css?ver=1778691870) fornece estes valores:

| Token oficial | Valor | Uso no painel |
| --- | --- | --- |
| Cor primária | `#163064` | Navegação, títulos, botões e médias |
| Cor secundária | `#005EAF` | Referência secundária da marca |
| Cor de destaque | `#009BD2` | Barras, foco de teclado e indicadores |
| Texto | `#393A3B` | Texto principal |
| Superfície clara | `#EFF6FE` | Seleção, ícones e fundos suaves |
| Linha/neutro claro | `#E7EBF0` | Bordas e linhas dos gráficos |
| Cinza da marca | `#91959B` | Referência de cor; substituído por cinza mais escuro em textos pequenos |

O ciano `#00A7C7` aparece em regras de navegação e botões do [CSS do cabeçalho](https://cardiofitness.com.br/wp-content/uploads/elementor/css/post-3439.css?ver=1778691871). É usado como cor complementar nos gráficos.

## Tipografia

**IBM Plex Sans** é a família global do site, definida nos quatro tokens de tipografia: primária, secundária, texto e destaque. Os pesos declarados nesses tokens são 500, 400, 300 e 500. A aplicação usa essa família como base, com pesos adequados à leitura de tabelas e números.

**Poppins** também aparece no site, incluindo botões do cabeçalho. É usada de forma complementar nos botões e na identificação “AVALIAÇÕES”. O desenho do nome Cardiofitness permanece dentro do logotipo original.

As fontes são servidas localmente, sem consultas a Google Fonts ou ao site da clínica durante o uso do sistema. Arquivos latin e latin-ext foram baixados dos próprios endereços presentes nas folhas de estilo oficiais:

- [Folha IBM Plex Sans](https://cardiofitness.com.br/wp-content/uploads/elementor/google-fonts/css/ibmplexsans.css).
- [Folha Poppins](https://cardiofitness.com.br/wp-content/uploads/elementor/google-fonts/css/poppins.css).

As licenças OFL dos distribuidores das fontes foram preservadas em `public/brand/IBM-Plex-Sans-OFL.txt` e `public/brand/Poppins-OFL.txt`. Origem das licenças: repositório [Google Fonts](https://github.com/google/fonts).

## Adaptações do painel, sem atribuição de caráter oficial

Estes valores são adaptações funcionais inferidas a partir da paleta, e não tokens publicados da Cardiofitness:

| Valor adaptado | Finalidade |
| --- | --- |
| `#10254F` | Variação escura para interação de botões |
| `#64748B` | Texto secundário pequeno com contraste maior |
| `#F4F8FC` | Fundo neutro azulado do ambiente administrativo |
| `#B7E7F5` | Texto de apoio sobre fundo azul-marinho |
| `#527AAB` | Série complementar do histórico |

Vermelho e âmbar são cores funcionais de erro, desativação e demonstração; não são apresentados como cores oficiais da marca. Botões principais usam azul-marinho com texto branco. O ciano mais claro é reservado a indicadores e elementos gráficos, evitando texto pequeno branco sobre fundo com contraste insuficiente.

O tratamento preserva grades, tabelas, estados vazios, modais, acessibilidade e comportamento responsivo. Não replica o site institucional, suas páginas, ofertas, fotos ou fluxos de agendamento.

## Evidências

`work/brand-audit.json` registra fontes, valores oficiais, decisões de adaptação, dimensões e hashes dos arquivos locais. `work/brand-origin.html`, `work/brand-front.css`, `work/brand-post3136.css`, `work/brand-post3439.css` e as duas folhas de fontes preservam a evidência HTTP consultada. Esses arquivos são dados de auditoria; conteúdo remoto não é executado pela aplicação.
