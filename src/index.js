/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

/* eslint-disable */

// 内存存储，用于保存所有数据
const memoryStore = new Map();

// 初始化默认数据
const defaultData = {
	vocab: {},
	mistakes: {},
	ratingHistory: [],
	userData: {current_rating:0,k_factor:64,test_count:0}
};

// 初始化数据
async function initData() {
	if (!memoryStore.has('DATA')) {
		memoryStore.set('DATA', JSON.stringify(defaultData));
	}
}

// 加载数据
async function loadData() {
	await initData();
	const raw = memoryStore.get('DATA');
	return JSON.parse(raw);
}

// 保存数据
async function saveData(data) {
	memoryStore.set('DATA', JSON.stringify(data));
}

// 返回JSON响应
function json(res, init) {
	return new Response(JSON.stringify(res), {headers:{'content-type':'application/json;charset=utf-8'}, ...init});
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// API routes
		if (url.pathname.startsWith('/api')) {
			const data = await loadData();
			const path = url.pathname.replace('/api', '');
			const method = request.method;
			
			if (path === '/sections' && method === 'GET') {
				const sections = Object.entries(data.vocab).map(([id, words])=>({id,count:Object.keys(words).length}));
				return json(sections);
			}
			if (path === '/sections' && method === 'POST') {
				const body = await request.json();
				const id = body.section;
				if (!id) return json({error:'missing section'}, {status:400});
				if (!data.vocab[id]) data.vocab[id] = {};
				await saveData(data);
				return json({ok:true});
			}
			if (path === '/sections' && method === 'DELETE') {
				const body = await request.json();
				const id = body.section;
				delete data.vocab[id];
				// delete mistakes for section
				for (const chinese of Object.keys(data.mistakes)) {
					delete data.mistakes[chinese]?.[id];
					if (Object.keys(data.mistakes[chinese]||{}).length===0) delete data.mistakes[chinese];
				}
				await saveData(data);
				return json({ok:true});
			}
			// Vocab list for a section
			const sectionMatch = path.match(/^\/vocab\/(.+)$/);
			if (sectionMatch && method==='GET') {
				const id = decodeURIComponent(sectionMatch[1]);
				const words = data.vocab[id]||{};
				return json(words);
			}
			if (path === '/vocab' && method==='POST') {
				const body = await request.json();
				const {section, chinese, english} = body;
				if (!section||!chinese||!english) return json({error:'missing params'},{status:400});
				if (!data.vocab[section]) data.vocab[section] = {};
				data.vocab[section][chinese] = english;
				// init mistake
				if (!data.mistakes[chinese]) data.mistakes[chinese] = {};
				if (!data.mistakes[chinese][section]) data.mistakes[chinese][section]=0;
				await saveData(data);
				return json({ok:true});
			}
			if (path === '/vocab' && method==='DELETE') {
				const body = await request.json();
				const {section, chinese} = body;
				if (data.vocab[section]) delete data.vocab[section][chinese];
				if (data.mistakes[chinese]) delete data.mistakes[chinese][section];
				await saveData(data);
				return json({ok:true});
			}
			if (path === '/mistakes' && method==='GET') {
				return json(data.mistakes);
			}
			if (path === '/mistakes' && method==='POST') {
				const body = await request.json();
				const {chinese, section} = body;
				if (!data.mistakes[chinese]) data.mistakes[chinese] = {};
				if (!data.mistakes[chinese][section]) data.mistakes[chinese][section]=0;
				data.mistakes[chinese][section] += 1;
				await saveData(data);
				return json({ok:true});
			}
			if (path === '/mistakes/reset' && method==='POST') {
				data.mistakes = {};
				await saveData(data);
				return json({ok:true});
			}
			if (path === '/start-test' && method==='POST') {
				const body = await request.json();
				const sections = body.sections||[];
				let words=[];
				sections.forEach(sec=>{
					const w = data.vocab[sec]||{};
					for (const [ch, en] of Object.entries(w)) words.push([ch,en,sec]);
				});
				if (words.length===0) return json({error:'empty'}, {status:400});
				// shuffle
				for (let i=words.length-1;i>0;i--){const j=Math.floor(Math.random()* (i+1));[words[i],words[j]]=[words[j],words[i]];}
				const rated = words.length>=100;
				return json({words, rated});
			}
			return json({error:'Not found'},{status:404});
		}

		// 其余请求交给静态资源处理
		if (env.ASSETS) {
			return env.ASSETS.fetch(request);
		}
		return new Response('Not found', {status:404});
	}
};
