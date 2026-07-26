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
    contactDesc: "Aberta a oportunidades em Ciência de Dados e IA aplicada. Envie uma mensagem ou me encontre nas redes abaixo.",
    footerTag: "feito com intenção"
  },
  en: {
    home: "Home",
    about: "About",
    blog: "Blog",
    contact: "Contact",
    footer: "All rights reserved.",
    'about-page': "About me",
    projects: "Projects",
    blog_description: "Some articles were write only in Portuguese, switch language to acess.",
    projectsEyebrow: "02 / work",
    projectsTitle: "Projects",
    viewDetails: "View details →",
    blogEyebrow: "03 / writing",
    blogTitle: "Blog",
    viewAllPosts: "View all posts →",
    contactEyebrow: "04 / contact",
    contactTitle: "Let's talk.",
    contactDesc: "Open to opportunities in Data Science and applied AI. Send a message or find me on the networks below.",
    footerTag: "built with intention"
  }
};

export function t(lang: string, key: string): string {
  const translation = translations[lang]?.[key];
  return translation !== undefined ? translation : key;
}
