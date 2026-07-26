// Placeholder project data for the portfolio's Projects section.
// Replace the PLACEHOLDER strings, tags, stack and links with real project
// information — each project also gets its own detail page at
// /{lang}/projects/{slug}/.

export interface ProjectCopy {
	title: string;
	description: string;
	role: string;
	period: string;
	problem: string;
	approach: string;
	result: string;
}

export interface Project {
	slug: string;
	tags: string[];
	stack: string[];
	repoUrl?: string;
	demoUrl?: string;
	copy: Record<'en' | 'pt-br', ProjectCopy>;
}

export const projects: Project[] = [
	{
		slug: 'project-1',
		tags: ['NLP', 'Python'],
		stack: ['Python', 'PyTorch', 'Hugging Face', 'FastAPI'],
		copy: {
			en: {
				title: 'PLACEHOLDER — Project Name 1',
				description: 'PLACEHOLDER — short description of the problem solved, techniques used and result achieved.',
				role: 'PLACEHOLDER — role',
				period: 'PLACEHOLDER — dates',
				problem: 'PLACEHOLDER — description of the challenge or need that motivated the project.',
				approach: 'PLACEHOLDER — architecture, techniques and design decisions of the solution.',
				result: 'PLACEHOLDER — measurable impact and main learnings from the project.',
			},
			'pt-br': {
				title: 'PLACEHOLDER — Nome do Projeto 1',
				description: 'PLACEHOLDER — descrição curta do problema resolvido, técnicas usadas e resultado obtido.',
				role: 'PLACEHOLDER — cargo/função',
				period: 'PLACEHOLDER — datas',
				problem: 'PLACEHOLDER — descrição do desafio ou necessidade que motivou o projeto.',
				approach: 'PLACEHOLDER — arquitetura, técnicas e decisões de design da solução.',
				result: 'PLACEHOLDER — impacto mensurável e principais aprendizados do projeto.',
			},
		},
	},
	{
		slug: 'project-2',
		tags: ['LLM', 'GCP'],
		stack: ['Python', 'Vertex AI', 'Vector DB', 'GCP'],
		copy: {
			en: {
				title: 'PLACEHOLDER — Project Name 2',
				description: 'PLACEHOLDER — short description of the problem solved, techniques used and result achieved.',
				role: 'PLACEHOLDER — role',
				period: 'PLACEHOLDER — dates',
				problem: 'PLACEHOLDER — description of the challenge or need that motivated the project.',
				approach: 'PLACEHOLDER — architecture, techniques and design decisions of the solution.',
				result: 'PLACEHOLDER — measurable impact and main learnings from the project.',
			},
			'pt-br': {
				title: 'PLACEHOLDER — Nome do Projeto 2',
				description: 'PLACEHOLDER — descrição curta do problema resolvido, técnicas usadas e resultado obtido.',
				role: 'PLACEHOLDER — cargo/função',
				period: 'PLACEHOLDER — datas',
				problem: 'PLACEHOLDER — descrição do desafio ou necessidade que motivou o projeto.',
				approach: 'PLACEHOLDER — arquitetura, técnicas e decisões de design da solução.',
				result: 'PLACEHOLDER — impacto mensurável e principais aprendizados do projeto.',
			},
		},
	},
	{
		slug: 'project-3',
		tags: ['Data', 'Streamlit'],
		stack: ['Python', 'Pandas', 'Streamlit', 'SQL'],
		copy: {
			en: {
				title: 'PLACEHOLDER — Project Name 3',
				description: 'PLACEHOLDER — short description of the problem solved, techniques used and result achieved.',
				role: 'PLACEHOLDER — role',
				period: 'PLACEHOLDER — dates',
				problem: 'PLACEHOLDER — description of the challenge or need that motivated the project.',
				approach: 'PLACEHOLDER — architecture, techniques and design decisions of the solution.',
				result: 'PLACEHOLDER — measurable impact and main learnings from the project.',
			},
			'pt-br': {
				title: 'PLACEHOLDER — Nome do Projeto 3',
				description: 'PLACEHOLDER — descrição curta do problema resolvido, técnicas usadas e resultado obtido.',
				role: 'PLACEHOLDER — cargo/função',
				period: 'PLACEHOLDER — datas',
				problem: 'PLACEHOLDER — descrição do desafio ou necessidade que motivou o projeto.',
				approach: 'PLACEHOLDER — arquitetura, técnicas e decisões de design da solução.',
				result: 'PLACEHOLDER — impacto mensurável e principais aprendizados do projeto.',
			},
		},
	},
];
