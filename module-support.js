'use strict';

((target, fakeloader, esmodules) =>{
  const mod = fakeloader(esmodules);
  const exported = mod.exports.default;
  target[exported.name] = exported;

})(
(()=>{
  if (typeof module !== 'undefined' && typeof module === 'object' && module) {
    if (!module.exports || typeof module.exports !== 'object') {
      if (typeof exports !== 'undefined' && exports) {
        module.exports = exports;
      } else {
        module.exports = {};
      }
    }
    return module.exports;

  } else if (typeof globalThis !== 'undefined' && globalThis) {
    return globalThis;

  } else if (typeof window !== 'undefined' && window) {
    return window;
  }
})(),
function fakeloader(esmodules){
  let exports = {
    get default() { return exports; },
    set default(value) {
      const current = Object.getOwnPropertyDescriptors(exports);
      Object.defineProperties(value, current);

      if (typeof value === 'function') {
        if (!value.name) {
          throw new Error('default export must be named');
        }
        if (typeof current === 'function') {
          throw new Error('Only export default a single function, as the name of that one function will be what is exported');
        }
        value[value.name] = value;
      }
      exports = value;
    }
  };
  const module = {
    get exports() { return exports; },
    set exports(value) { exports = value; },
  };

  function require(name) {
    return module.exports;
  }

  for (let esmodule of esmodules) {
    if (!esmodule) { continue; }
    esmodule(require, module);
  }

  return module;
},
[
// in the form of:
// (require, module) => {  the code },
/**###INSERT_FAKE_ES_MODULE_CODE_HERE###**/

]);
