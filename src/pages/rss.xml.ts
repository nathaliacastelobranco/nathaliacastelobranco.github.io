import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context: APIContext) {
	const posts = await getCollection('blog');
	const sortedPosts = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site ?? 'https://nathaliacastelobranco.github.io',
		items: sortedPosts.map((post) => {
			const [lang, ...slugParts] = post.id.split('/');
			const slug = slugParts.join('/');
			return {
				title: post.data.title,
				description: post.data.description,
				pubDate: post.data.pubDate,
				link: `/${lang}/blog/${slug}/`,
			};
		}),
	});
}
