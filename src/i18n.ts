export const translations = {
  'pt-br': {
    home: "Home",
    about: "Sobre",
    blog: "Blog",
    contact: "Contato",
    footer: "Todos os direitos reservados.",
    'about-page': "Sobre mim",
    projects: "Projetos",
    blog_description: "Alguns artigos estão apenas em inglês, troque o idioma para acessá-los.",
    projectsEyebrow: "02 / trabalho",
    projectsTitle: "Projetos",
    viewDetails: "Ver detalhes →",
    blogEyebrow: "03 / escrita",
    blogTitle: "Blog",
    viewAllPosts: "Ver todos os posts →",
    contactEyebrow: "04 / contato",
    contactTitle: "Vamos conversar.",
    contactDesc: "Envie uma mensagem ou me encontre nas redes ao lado.",
    footerTag: "feito com <3"
  },
  en: {
    home: "Home",
    about: "About",
    blog: "Blog",
    contact: "Contact",
    footer: "All rights reserved.",
    'about-page': "About me",
    projects: "Projects",
    blog_description: "Some articles are written in Portuguese; switch language to access them.",
    projectsEyebrow: "02 / work",
    projectsTitle: "Projects",
    viewDetails: "View details →",
    blogEyebrow: "03 / writing",
    blogTitle: "Blog",
    viewAllPosts: "View all posts →",
    contactEyebrow: "04 / contact",
    contactTitle: "Let's talk.",
    contactDesc: "Send a message or find me on the networks on the side.",
    footerTag: "built with <3"
  }
};

export type SupportedLang = keyof typeof translations;
export type TxKey = keyof typeof translations['en'];

export function t(lang: string, key: TxKey): string {
  const selectedLang = lang as SupportedLang;
  const translation = translations[selectedLang]?.[key];
  return translation !== undefined ? translation : translations['en']?.[key] ?? String(key);
}

