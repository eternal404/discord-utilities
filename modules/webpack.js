if (typeof Array.prototype.at !== 'function') {
   Object.defineProperty(Array.prototype, 'at', {
      value: function at(index) {
         return index < 0 ? this[this.length - Math.abs(index)] : this[index];
      },
      enumerable: false,
      configurable: true
   })
}

if (typeof setImmediate === 'undefined') {
   window.setImmediate = (callback) => setTimeout(callback, 0);
}

export class Filters {
   static byProps(...props) {
      return (module) => props.every(prop => module[prop] !== void 0);
   }

   static byDisplayName(name, def = false) {
      return (module) => (def ? (module = module.default) : module) && typeof (module) === 'function' && module.displayName === name;
   }

   static byTypeString(...strings) {
      return (module) => module.type && (module = module.type?.toString()) && strings.every(str => module.indexOf(str) > -1);
   }
}

export default new class Webpack {
   cache = null;
   get Filters() { return Filters; }
   get chunkName() { return 'webpackChunkdiscord_app'; }
   get id() { return 'kernel-req' + Math.random().toString().slice(2, 5); }

   constructor() {
      this.whenReady = this.waitForGlobal.then(() => new Promise(async onReady => {
         const [Dispatcher, UserStore] = await this.findByProps(
            ['_dispatch', 'dispatch'], ['getCurrentUser', '_dispatchToken'],
            { cache: false, bulk: true, wait: true, forever: true }
         );

         const listener = function () {
            Dispatcher.unsubscribe('START_SESSION', listener);
            onReady();
         };

         Dispatcher.subscribe('START_SESSION', listener);
      }));
   }

   async waitFor(filter, { retries = 100, all = false, forever = false, delay = 50 } = {}) {
      for (let i = 0; (i < retries) || forever; i++) {
         const module = this.findModule(filter, { all, cache: false });
         if (module) return module;
         await new Promise(res => setTimeout(res, delay));
      }
   }

   parseOptions(args, filter = thing => (typeof (thing) === 'object' && thing != null && !Array.isArray(thing))) {
      return [args, filter(args.at(-1)) ? args.pop() : {}];
   }

   request(cache = true) {
      if (cache && this.cache) return this.cache;

      const res = window[this.chunkName].push([[this.id], [], p => p]);
      window[this.chunkName].pop();

      if (!res) console.warn('[Webpack] Got empty cache.');
      if (cache) this.cache = res;

      return res;
   }

   findModule(filter, { all = false, cache = true, force = false } = {}) {
      if (typeof (filter) !== 'function') return void 0;

      const req = this.request(cache);
      const found = [];

      if (!req) return;

      const wrapFilter = function (module, index) {
         try { return filter(module, index); }
         catch { return false; }
      };

      for (const id in req.c) {
         const module = req.c[id].exports;
         if (!module || module === window) continue;

         switch (typeof module) {
            case 'object': {
               if (wrapFilter(module, id)) {
                  if (!all) return module;
                  found.push(module);
               }

               if (module.__esModule && module.default != null && wrapFilter(module.default, id)) {
                  if (!all) return module.default;
                  found.push(module.default);
               }

               if (force && module.__esModule) for (const key in module) {
                  if (!module[key]) continue;

                  if (wrapFilter(module[key], id)) {
                     if (!all) return module[key];
                     found.push(module[key]);
                  }
               }

               break;
            }

            case 'function': {
               if (wrapFilter(module, id)) {
                  if (!all) return module;
                  found.push(module);
               }

               break;
            }
         }
      }

      return all ? found : found[0];
   }

   findModules(filter) { return this.findModule(filter, { all: true }); }

   bulk(...options) {
      const [filters, { wait = false, ...rest }] = this.parseOptions(options);
      const found = new Array(filters.length);
      const searchFunction = wait ? this.waitFor : this.findModule;
      const wrappedFilters = filters.map(filter => (m) => {
         try { return filter(m); }
         catch (error) { return false; }
      });

      const returnValue = searchFunction.call(this, (module) => {
         for (let i = 0; i < wrappedFilters.length; i++) {
            const filter = wrappedFilters[i];
            if (typeof filter !== 'function' || !filter(module) || found[i] != null) continue;

            found[i] = module;

         }

         return found.filter(String).length === filters.length;
      }, rest);

      if (wait) return returnValue.then(() => found);

      return found;
   }

   findByProps(...options) {
      const [props, { bulk = false, wait = false, ...rest }] = this.parseOptions(options);

      if (!bulk && !wait) {
         return this.findModule(Filters.byProps(...props), rest);
      }

      if (wait && !bulk) {
         return this.waitFor(Filters.byProps(...props), rest);
      }

      if (bulk) {
         const filters = props.map((propsArray) => Filters.byProps(...propsArray)).concat({ wait, ...rest });

         return this.bulk(...filters);
      }


      return null;
   }

   findByDisplayName(...options) {
      const [displayNames, { bulk = false, default: defaultExport = false, wait = false, ...rest }] = this.parseOptions(options);

      if (!bulk && !wait) {
         return this.findModule(Filters.byDisplayName(displayNames[0]), rest);
      }

      if (wait && !bulk) {
         return this.waitFor(Filters.byDisplayName(displayNames[0]), rest);
      }

      if (bulk) {
         const filters = displayNames.map(filters.map(Filters.byDisplayName)).concat({ wait, cache });

         return this.bulk(...filters);
      }

      return null;
   }

   findIndex(filter) {
      let foundIndex = -1;

      this.findModule((module, index) => {
         if (filter(module)) foundIndex = index;
      });

      return foundIndex;
   }

   atIndex(index) {
      return this.request(true)?.c[index];
   }

   get waitForGlobal() {
      return new Promise(async onExists => {
         while (!Array.isArray(window[this.chunkName])) {
            await new Promise(setImmediate);
         }

         onExists();
      });
   }

   async wait(callback = null) {
      return this.whenReady.then(() => {
         typeof callback === 'function' && callback();
      });
   }

   get whenExists() { return this.waitForGlobal; }

   on(event, listener) {
      switch (event) {
         case 'LOADED': return this.whenReady.then(listener);
      }
   }

   get once() { return this.on; }
};
