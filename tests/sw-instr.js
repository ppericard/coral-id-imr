// Debug only (step-9 investigation): instrumentation prepended to sw.js.
module.exports = `
self.__pend = new Map(); self.__log = []; let __n = 0; const __t0 = Date.now();
const __L = s => { self.__log.push((Date.now() - __t0) + ' ' + s); if (self.__log.length > 400) self.__log.shift(); };
const __wrap = (o, k, lab) => { const f = o[k]; o[k] = function (...a) { const id = ++__n, d = lab + '.' + k + '(' + String((a[0] && a[0].url) || a[0] || '').replace(location.origin, '') + ')';
  __pend.set(id, {d, t: Date.now()}); const p = f.apply(this, a); Promise.resolve(p).then(() => __pend.delete(id), e => (__pend.delete(id), __L('ERR ' + d + ' ' + e))); return p; }; };
['match', 'open', 'delete', 'keys', 'has'].forEach(k => __wrap(CacheStorage.prototype, k, 'caches'));
['put', 'match', 'keys', 'delete', 'add', 'addAll', 'matchAll'].forEach(k => __wrap(Cache.prototype, k, 'cache'));
__wrap(self, 'fetch', 'net');
const __rw = FetchEvent.prototype.respondWith;
FetchEvent.prototype.respondWith = function (p) { const id = ++__n, d = 'respondWith(' + this.request.url.replace(location.origin, '') + ')';
  __pend.set(id, {d, t: Date.now()}); Promise.resolve(p).then(() => __pend.delete(id), () => __pend.delete(id)); return __rw.call(this, p); };
const __wu = ExtendableEvent.prototype.waitUntil;
ExtendableEvent.prototype.waitUntil = function (p) { const id = ++__n, d = 'waitUntil(' + this.type + (this.request ? ' ' + this.request.url.replace(location.origin, '') : '') + ')';
  __pend.set(id, {d, t: Date.now()}); __L(d + ' start'); Promise.resolve(p).then(() => (__pend.delete(id), __L(d + ' done')), e => (__pend.delete(id), __L(d + ' failed ' + e))); return __wu.call(this, p); };
self.addEventListener('fetch', e => __L('fetch ' + e.request.url.replace(location.origin, '')));
self.__dump = () => ({pend: [...__pend.values()].map(x => x.d + ' ' + (Date.now() - x.t) + 'ms'), log: self.__log.slice(-60)});
`;
