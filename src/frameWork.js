const isMatching = (req, route) => {
	if (route.method && req.method != route.method) return false;
	if (route.url instanceof RegExp && route.url.test(req.url)) return true;
	if (route.url && req.url != route.url) return false;
	return true;
};

class RequestHandler {
	constructor() {
		this.routes = [];
	}
	use(handler) {
		this.routes.push({ handler });
	}
	get(url, handler) {
		this.routes.push({ method: 'GET', url, handler });
	}
	post(url, handler) {
		this.routes.push({ method: 'POST', url, handler });
	}
	error(handler) {
		this.errorRoute = handler;
	}
	handleRequest(req, res) {
		let remaining = this.routes.filter(r => isMatching(req, r));
		console.log('routes are',remaining);

		let next = () => {
			let current = remaining[0];
			if (!current) return;
			remaining = remaining.slice(1);
			current.handler(req, res, next);
		};
		next();
	}
}
module.exports = RequestHandler;
