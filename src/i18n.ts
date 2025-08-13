export const translations = {
  'pt-br': { 
    home: "Home", 
    about: "Sobre", 
    blog: "Blog",
    contact: "Contato",
    footer: "Todos os direitos reservados.",
    'about-page': "Sobre mim",
    projects: "Projetos",
    blog_description: "Alguns artigos estão apenas em inglês, troque o idioma para acessá-los."
  },
  en: { 
    home: "Home", 
    about: "About", 
    blog: "Blog",
    contact: "Contact",
    footer: "All rights reserved.",
    'about-page': "About me",
    projects: "Projects",
    blog_description: "Some articles were write only in Portuguese, switch language to acess."

  }
};

export function t(lang: string, key: string): string {
  const translation = translations[lang]?.[key];
  return translation !== undefined ? translation : key;
}
