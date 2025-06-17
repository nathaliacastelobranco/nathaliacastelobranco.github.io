export const translations = {
  'pt-br': { 
    home: "Home", 
    about: "Sobre", 
    blog: "Blog",
    contact: "Contato",
    footer: "Todos os direitos reservados.",
    'about-page': "Sobre mim"
  },
  en: { 
    home: "Home", 
    about: "About", 
    blog: "Blog",
    contact: "Contact",
    footer: "All rights reserved.",
    'about-page': "About me"
  }
};

export function t(lang: string, key: string): string {
  const translation = translations[lang]?.[key];
  return translation !== undefined ? translation : key;
}
