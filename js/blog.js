(function () {
	'use strict';

	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function initReadingProgress() {
		var bar = document.querySelector('.reading-progress-bar');
		if (!bar) { return; }

		var target = document.querySelector(bar.getAttribute('data-target') || '.entry-content');
		var ticking = false;

		function update() {
			ticking = false;
			var start = 0;
			var total = document.documentElement.scrollHeight - window.innerHeight;

			if (target) {
				var rect = target.getBoundingClientRect();
				start = rect.top + window.pageYOffset;
				total = rect.height - window.innerHeight * 0.35;
			}

			if (total <= 0) { bar.style.width = '100%'; return; }

			var progress = (window.pageYOffset - start) / total;
			bar.style.width = Math.min(100, Math.max(0, progress * 100)).toFixed(2) + '%';
		}

		function onScroll() {
			if (ticking) { return; }
			ticking = true;
			window.requestAnimationFrame(update);
		}

		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		update();
	}

	function slugify(text, used) {
		var base = text.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-') || 'section';
		var slug = base;
		var i = 2;
		while (used[slug]) { slug = base + '-' + i; i++; }
		used[slug] = true;
		return slug;
	}

	function initTableOfContents() {
		var toc = document.querySelector('[data-toc]');
		if (!toc) { return; }

		var scope = document.querySelector(toc.getAttribute('data-toc') || '.entry-content');
		if (!scope) { return; }

		var selector = toc.getAttribute('data-toc-levels') || 'h2, h3';
		var headings = Array.prototype.slice.call(scope.querySelectorAll(selector));
		if (!headings.length) { toc.remove(); return; }

		var used = {};
		var list = document.createElement('ul');
		list.className = 'post-toc-list';

		var links = headings.map(function (heading) {
			if (!heading.id) { heading.id = slugify(heading.textContent, used); }

			var item = document.createElement('li');
			item.className = 'toc-level-' + heading.tagName.charAt(1);

			var link = document.createElement('a');
			link.href = '#' + heading.id;
			link.textContent = heading.textContent;
			item.appendChild(link);
			list.appendChild(item);

			link.addEventListener('click', function (event) {
				event.preventDefault();
				var offset = parseInt(toc.getAttribute('data-toc-offset') || '120', 10);
				window.scrollTo({
					top: heading.getBoundingClientRect().top + window.pageYOffset - offset,
					behavior: reduceMotion ? 'auto' : 'smooth'
				});
				if (history.replaceState) { history.replaceState(null, '', '#' + heading.id); }
			});

			return link;
		});

		var mount = toc.querySelector('[data-toc-list]') || toc;
		mount.appendChild(list);

		var active = null;
		var ticking = false;

		function setActive(link) {
			if (link === active) { return; }
			if (active) { active.classList.remove('active'); }
			active = link;
			if (active) { active.classList.add('active'); }
		}

		function update() {
			ticking = false;
			var line = window.pageYOffset + 140;
			var current = links[0];

			for (var i = 0; i < headings.length; i++) {
				if (headings[i].getBoundingClientRect().top + window.pageYOffset <= line) {
					current = links[i];
				} else {
					break;
				}
			}

			setActive(current);
		}

		function onScroll() {
			if (ticking) { return; }
			ticking = true;
			window.requestAnimationFrame(update);
		}

		window.addEventListener('scroll', onScroll, { passive: true });
		update();
	}

	function initSplitFeed() {
		var list = document.querySelector('.split-feed-list');
		var media = document.querySelector('.split-feed-media');
		if (!list || !media) { return; }

		var items = Array.prototype.slice.call(list.querySelectorAll('.split-feed-item'));
		var images = Array.prototype.slice.call(media.querySelectorAll('img'));
		if (!items.length || !images.length) { return; }

		list.classList.add('has-active');

		function activate(index) {
			items.forEach(function (item, i) { item.classList.toggle('active', i === index); });
			images.forEach(function (image, i) { image.classList.toggle('active', i === index); });
		}

		if (!('IntersectionObserver' in window)) { activate(0); return; }

		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) { activate(items.indexOf(entry.target)); }
			});
		}, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

		items.forEach(function (item) { observer.observe(item); });
		activate(0);
	}

	function initLoadMore() {
		var button = document.querySelector('[data-load-more]');
		if (!button) { return; }

		var container = document.querySelector(button.getAttribute('data-load-more'));
		if (!container) { return; }

		var batches = Array.prototype.slice.call(container.querySelectorAll('[data-load-batch]'));
		var counter = document.querySelector('[data-load-count]');
		var shown = 0;

		function renderCount() {
			if (!counter) { return; }
			var entries = Array.prototype.slice.call(container.querySelectorAll('.entry'));
			counter.textContent = entries.filter(function (entry) {
				var batch = entry.closest('[data-load-batch]');
				return !batch || !batch.hidden;
			}).length;
		}

		batches.forEach(function (batch) { batch.hidden = true; });
		renderCount();

		button.addEventListener('click', function (event) {
			event.preventDefault();
			if (shown >= batches.length) { return; }

			button.classList.add('disabled');
			button.setAttribute('aria-busy', 'true');

			window.setTimeout(function () {
				batches[shown].hidden = false;
				shown++;
				button.classList.remove('disabled');
				button.removeAttribute('aria-busy');
				renderCount();

				if (shown >= batches.length) {
					button.hidden = true;
					var done = document.querySelector('[data-load-done]');
					if (done) { done.hidden = false; }
				}
			}, 350);
		});
	}

	function initShareRail() {
		var rails = document.querySelectorAll('[data-share-url]');
		Array.prototype.forEach.call(rails, function (rail) {
			var url = rail.getAttribute('data-share-url') || window.location.href;
			var title = rail.getAttribute('data-share-title') || document.title;

			Array.prototype.forEach.call(rail.querySelectorAll('[data-share]'), function (link) {
				var network = link.getAttribute('data-share');
				var endpoints = {
					facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
					twitter: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title),
					linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url),
					pinterest: 'https://pinterest.com/pin/create/button/?url=' + encodeURIComponent(url) + '&description=' + encodeURIComponent(title),
					whatsapp: 'https://api.whatsapp.com/send?text=' + encodeURIComponent(title + ' ' + url),
					email: 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(url)
				};

				if (endpoints[network]) { link.setAttribute('href', endpoints[network]); }
			});
		});
	}

	function initReadingTime() {
		var badges = document.querySelectorAll('[data-reading-time]');
		Array.prototype.forEach.call(badges, function (badge) {
			var scope = document.querySelector(badge.getAttribute('data-reading-time') || '.entry-content');
			if (!scope) { return; }
			var words = scope.textContent.trim().split(/\s+/).length;
			badge.textContent = Math.max(1, Math.round(words / 225)) + ' min read';
		});
	}

	function init() {
		initReadingProgress();
		initTableOfContents();
		initSplitFeed();
		initLoadMore();
		initShareRail();
		initReadingTime();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
