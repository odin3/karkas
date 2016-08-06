(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.karkas = require('./karkas.js')(true);
},{"./karkas.js":2}],2:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 * 
 * @package karkas
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */

/**
 * Call a new Karkas instance
 * @param useDomExtensions bool Include DOM extension
 * @returns {*}
 */
module.exports = function(useDom) {
   var karkas = require('./src/core.js')();
    if( useDom ) require('./src/dom.js')(karkas);
    return karkas;
};
},{"./src/core.js":3,"./src/dom.js":4}],3:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * @package karkas.core
 * @version 3.0.0-b4
 * @author Denis Sedchenko
 */
var Karkas = function() {

    function def(el) {
        return typeof el != 'undefined';
    }

    var self = this;

    this.version = {
        'major': 3,
        'minor': 0,
        'patch': 0,
        'build': 7,
        'toString': function() {
            with(this) {
                return[major, minor, patch].join('.');
            }
        }
    };

    this.views = {};
    this.filters = {
        __container__: {},
        /**
         * Get Filter
         */
        get: function(filterName) {
            if(typeof this.__container__[filterName] == "undefined") throw new ReferenceError("Karkas: undefined filter or template: '"+filterName+"'");
            return this.__container__[filterName];
        },

        /**
         * Add filter
         */
        add: function(filterName, func) {
            this.__container__[filterName] = func;
        }

    };

    require('./view.js')(self);
    require('./filters.js')(self);

    this.getView = function(vId) {
        if(typeof self.views[vId] == "undefined") throw new ReferenceError("KarkasJS: Requested template is not defined: '"+vId+"'");
        return self.views[vId];
    };

    this.clear = function() {
        for(var i in self.views) {
            delete this.views[i];
        }
    };

    this.exists = function(templateName) {
        return def(this.views[templateName]);
    };

    this.log = function(msgTxt, msgType) {
        msgType = msgType || 'log';
        msgTxt  = "Karkas: "+msgTxt;
        return ( def(console) && def(console[msgType]) ) ? console[msgType](msgTxt) : null;
    };

    this.filter = function(filterQuery, value) {

        // Extract filter name and args
        filterQuery = filterQuery.trim().split(":");
        var filterName = filterQuery[0];

        // Array of arguments that we will push to the filter
        // At start there will be only expression value
        value = [value];

        // Try to find another args
        if(filterQuery.length > 1) {
            var filterArgs = (new Function("return ["+filterQuery[1].trim()+"]"))();
            value = value.concat(filterArgs);
        }

        try {
            // Find and call the filter with selected args
            var filter = self.filters.get(filterName);
            return filter.apply(filter,value);
        } catch(ex) {
            throw new Error("Karkas: failed to apply filter '"+filterName+"', reason: "+ex.message);
        }
    };

    this.compile = function(templateName, content) {

        // Output buffer
        var output   = "",
            template = self.getView(templateName);

        content = content || {};

        // If we have an array, parse as array
        output = template[(content instanceof Array) ? "parseArray" : "parse"](content);

        return output;

    };

    this.getView = function(vId) {
        if( !def(self.views[vId]) ) throw new ReferenceError("KarkasJS: Requested template is not defined: '"+vId+"'");
        return self.views[vId];
    };


};

module.exports = function() {
    return new Karkas();
};
},{"./filters.js":5,"./view.js":14}],4:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * @package karkas.dom
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */

module.exports = function(karkas) {
    function def(e) { return typeof e !== 'undefined'; }
    function nul(e) { return e === null }

    if( !def(window) ) throw new ReferenceError('Karkas DOM extensions requries browser');
    if( !def(window.document) ) throw new Error('Karkas DOM extensions requires a document object');

    var $d = window.document;
    var $b = $d.querySelector('body');

    var COMPILED_ELEMENT_SELECTOR   = '*[data-compile]',
        COMPILED_ELEMENT_DATA       = 'data-compile',
        COMPILED_ELEMENT_TEMPLATE   = 'data-view',
        VIEW_SCRIPT_MIME_TYPE       = 'text/karkas';

    karkas.onFind = function() {};

    karkas.compileElement = function(element) {
        var tempName = element.getAttribute(COMPILED_ELEMENT_TEMPLATE),
            tempData = element.getAttribute(COMPILED_ELEMENT_DATA);

        if( nul(tempName) ) throw new ReferenceError(COMPILED_ELEMENT_TEMPLATE+' is undefined');
        if( nul(tempData) ) throw new ReferenceError(COMPILED_ELEMENT_DATA+' is undefined');

        tempName = tempName.trim();
        tempData = tempData.trim();

        try {
            tempData = JSON.parse(tempData);
            element.innerHTML += karkas.compile(tempName, tempData);
        } catch(ex) {
            karkas.log(
                {
                    message: 'Karkas: failed to compile element',
                    error:   ex,
                    element: element
                }, 'error');
        }
    };


    karkas.refresh = function(refreshItems) {
        // Views container
        if(refreshItems) this.clear();

        var templateSelector = 'script[type="'+VIEW_SCRIPT_MIME_TYPE+'"]';
        if(!refreshItems) templateSelector += ':not([data-loaded])';

        // Select all templates
        var w = $d.querySelectorAll(templateSelector);

        // Grep all elements
        for(var c = 0;  c < w.length; c++ )
        {
            ( new karkas.View(w[c].getAttribute("name"), w[c].innerHTML) ).apply();
        }

        // find items by attr and parse them
        var requestedToParse = $d.querySelectorAll(COMPILED_ELEMENT_SELECTOR);

        if(!requestedToParse.length) return true;

        for(var i = 0; i < requestedToParse.length; i++) {
            karkas.compileElement(requestedToParse[i]);
        }

        if(typeof this.onFind == 'function') this.onFind();
    };

    /**
     * Import content as template from remote URL
     * @param url {String} URL Path
     * @param templateName {String} Template name
     * @param successCallback {Function} onSuccess callback
     */
    this.include = function(url, templateName, successCallback) {

        function finish(onSuccess, response) {
            // Create new template and push it to Karkas
            (new karkas.View(templateName, response)).apply();

            // Call callback
            onSuccess(response);
        }


        function makeRequest(onSuccess, onError) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.onload = function () {
                if (this.status >= 200 && this.status < 300) {
                    finish(onSuccess, xhr.response);
                } else {
                    onError({
                        status: this.status,
                        statusText: xhr.statusText
                    });
                }
            };
            xhr.onerror = function () {
                if ( def(onError) ) {
                    onError({
                        status: this.status,
                        statusText: xhr.statusText
                    });
                } else {
                    console.error('Karkas: Failed to import remote template: ',{
                        status: this.status,
                        statusText: xhr.statusText
                    });
                }

            };
            xhr.send();
        }

        function importFromDom(onSuccess) {
            var e = document.querySelector('script[type="'+VIEW_SCRIPT_MIME_TYPE+'"]#'+url);
            var eIsNull = nul(e);
            if ( !eIsNull ) {
                finish(onSuccess, e.innerHTML);
            }
            return eIsNull;
        }

        function tryImport(onSuccess, onError) {

            // Try to get element from DOM
            if( !importFromDom(onSuccess) ) {

                // If not - download it.
                makeRequest(onSuccess, onError);
            }
        }



        if( typeof url !== 'string' ) throw new ReferenceError('Karkas: Url is not a String');
        templateName = templateName || url;
        if( (typeof successCallback == 'function') || (typeof window.Promise == 'undefined') ) return tryImport(successCallback);

        return new Promise(function (resolve, reject) {
            tryImport(resolve, reject);
        });
    };

    document.addEventListener('DOMContentLoaded', karkas.refresh);

};
},{}],5:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * Karkas embedded filters
 *
 * @package karkas.filters
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */
module.exports = function(karkas) {
    with(karkas.filters) {
        add('currency', require('./filters/currency.js') );
        add('string', require('./filters/string.js') );
        add('array', require('./filters/array.js') );
        add('math', require('./filters/math.js') );
        add('json', require('./filters/json.js') );
        add('capitalize', require('./filters/capitalize.js') );
        add('toLower', require('./filters/toLower.js') );
        add('toUpper', require('./filters/toUpper.js') );
    }

};
},{"./filters/array.js":6,"./filters/capitalize.js":7,"./filters/currency.js":8,"./filters/json.js":9,"./filters/math.js":10,"./filters/string.js":11,"./filters/toLower.js":12,"./filters/toUpper.js":13}],6:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * Array filter
 *
 * @package karkas.filters.array
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */

module.exports = function($value, $operation) {
    try {
        var $args = [].splice.apply(arguments,[2]);
        return ([])[$operation].apply($value,$args);
    } catch(ex) {
        throw new Error("Failed to perform method `Array."+$operation+"` ("+ex.message+")");
    }
};
},{}],7:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * @package karkas.filters.capitalize
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */

module.exports = function(val) {
    val = String(val);
    return val.substring(0,1).toUpperCase()+val.substring(1);
};
},{}],8:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * Currency filter
 * 
 * @package karkas.filters.currency
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */

module.exports = function($value, $currency, $digitsToFixed) {
    // Currency by default is USD
    $currency = $currency || "$";


    function formatMoney(n, c, d, t){
        var c = isNaN(c = Math.abs(c)) ? 2 : c,
            d = d == undefined ? "." : d,
            t = t == undefined ? "," : t,
            s = n < 0 ? "-" : "",
            i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
            j = (j = i.length) > 3 ? j % 3 : 0;
        return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
    }

    return $currency+" "+formatMoney($value, $digitsToFixed);


};
},{}],9:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * JSON filter
 *
 * @package karkas.filters.json
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */

module.exports = function(val) {
    try {
        return JSON.stringify(val);
    } catch(ex) {
        return val;
    }
};
},{}],10:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * Math filter
 *
 * @package karkas.filters.math
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */

module.exports = function($value, $operation) {
    try {
        [].splice.apply(arguments,[1,1]);
        return Math[$operation].apply(Math,arguments);
    } catch(ex) {
        throw new Error("Failed to perform method `Math."+$operation+"` ("+ex.message+")");
    }
};
},{}],11:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * String filter
 *
 * @package karkas.filters.string
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */

module.exports = function($value, $operation) {
    try {
        var $args = [].splice.apply(arguments,[2]);
        return ""[$operation].apply($value,$args);
    } catch(ex) {
        throw new Error("Failed to perform method `String."+$operation+"` ("+ex.message+")");
    }
};
},{}],12:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * @package karkas.filters.toLower
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */

module.exports = function(val) {
    return String(val).toLowerCase();
};
},{}],13:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * @package karkas.filters.toUpper
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */

module.exports = function(val) {
    return String(val).toUpperCase();
};
},{}],14:[function(require,module,exports){
/**
 * Karkas.js (https://github.com/odin3/karkas)
 * Licensed by MIT license
 *
 * @package karkas.view
 * @version 3.0.0-b1
 * @author Denis Sedchenko
 */

module.exports = function(karkas) {
    function def(el) {
        return typeof el != 'undefined';
    }

    karkas.View = function(name, content) {
      if(!def(content)) throw new ReferenceError("Karkas.View: viewElement is not defined.");
      if(typeof content !== 'string') throw new ReferenceError('Karkas.View: Template content must be a string');

      /**
       * Pattern for expressions ( {{value}} )
       */
      this.pattern    = /[\{\{](.*?)[\}\}]+/gim;


      this.name       = name;
      this.content    = content.trim();

      var self        = this;

      this.apply = function(replaceIfExists) {
          replaceIfExists = replaceIfExists || false;
          if(karkas.exists(this.name) && !replaceIfExists) {
              karkas.log('Cannot apply new template, "'+this.name+'" already exists. Use "apply(true)" to overwrite it.', 'warn');
              return false;
          }
          karkas.views[self.name] = this;
          return true;
      };


      /**
       * Parse single expression from object
       * @param   {Object} $_object     Object
       * @param   {String} $_expression Expression
       * @returns {*} Value
       */
      function parseExpression($_object, $_expression) {
          return new Function('with(this) { return '+$_expression+'; }').apply($_object);
      }


      /**
       * Parse an single object using the template
       * @param fields Object
       * @returns {*} Compiled content
       */
      this.parse      = function(fields) {
          var sReturn    = this.content.toString(),
              tpFields   = sReturn.match(this.pattern);

          for(var pat in tpFields){
              var currentField = tpFields[pat];
              if(typeof currentField == "string" || typeof currentField == "number"){
                  // Remove brackets and extract filters
                  var key = currentField.replace("{{","").replace("}}","").trim().split("|");

                  // Check for filters and expressions
                  var filter = (key.length > 1) ? key[key.length - 1] : undefined;
                  key = key[0];

                  //  replace expression with object
                  var newVal;
                  try {
                      newVal = parseExpression(fields, key);
                  } catch(ex) {
                      throw new ReferenceError("Karkas: failed to parse expression '"+key+"' in template '"+this.name+"'. "+ex.message);
                  }
                  // If value is undefined - replace it
                  if( !def(newVal) ) newVal = "";

                  // Use filter or template if available in expression
                  if( def(filter))  newVal = karkas[(def(karkas.views[filter])) ? "compile" : "filter"](filter, newVal);

                  sReturn = sReturn.replace(currentField,newVal);
              }
          }
          return sReturn;
      };


      /**
       * Parse an array of objects using the template
       * @param arr
       * @returns {string} Compiled content
       */
      this.parseArray = function(arr) {
          var c = "";
          for(var i = 0; i < arr.length; i++) {
              c += this.parse(arr[i]);
          }
          return c;
      };

  };
};
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImJ1aWxkLmpzIiwia2Fya2FzLmpzIiwic3JjL2NvcmUuanMiLCJzcmMvZG9tLmpzIiwic3JjL2ZpbHRlcnMuanMiLCJzcmMvZmlsdGVycy9hcnJheS5qcyIsInNyYy9maWx0ZXJzL2NhcGl0YWxpemUuanMiLCJzcmMvZmlsdGVycy9jdXJyZW5jeS5qcyIsInNyYy9maWx0ZXJzL2pzb24uanMiLCJzcmMvZmlsdGVycy9tYXRoLmpzIiwic3JjL2ZpbHRlcnMvc3RyaW5nLmpzIiwic3JjL2ZpbHRlcnMvdG9Mb3dlci5qcyIsInNyYy9maWx0ZXJzL3RvVXBwZXIuanMiLCJzcmMvdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ3aW5kb3cua2Fya2FzID0gcmVxdWlyZSgnLi9rYXJrYXMuanMnKSh0cnVlKTsiLCIvKipcbiAqIEthcmthcy5qcyAoaHR0cHM6Ly9naXRodWIuY29tL29kaW4zL2thcmthcylcbiAqIExpY2Vuc2VkIGJ5IE1JVCBsaWNlbnNlXG4gKiBcbiAqIEBwYWNrYWdlIGthcmthc1xuICogQHZlcnNpb24gMy4wLjAtYjFcbiAqIEBhdXRob3IgRGVuaXMgU2VkY2hlbmtvXG4gKi9cblxuLyoqXG4gKiBDYWxsIGEgbmV3IEthcmthcyBpbnN0YW5jZVxuICogQHBhcmFtIHVzZURvbUV4dGVuc2lvbnMgYm9vbCBJbmNsdWRlIERPTSBleHRlbnNpb25cbiAqIEByZXR1cm5zIHsqfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHVzZURvbSkge1xuICAgdmFyIGthcmthcyA9IHJlcXVpcmUoJy4vc3JjL2NvcmUuanMnKSgpO1xuICAgIGlmKCB1c2VEb20gKSByZXF1aXJlKCcuL3NyYy9kb20uanMnKShrYXJrYXMpO1xuICAgIHJldHVybiBrYXJrYXM7XG59OyIsIi8qKlxuICogS2Fya2FzLmpzIChodHRwczovL2dpdGh1Yi5jb20vb2RpbjMva2Fya2FzKVxuICogTGljZW5zZWQgYnkgTUlUIGxpY2Vuc2VcbiAqXG4gKiBAcGFja2FnZSBrYXJrYXMuY29yZVxuICogQHZlcnNpb24gMy4wLjAtYjRcbiAqIEBhdXRob3IgRGVuaXMgU2VkY2hlbmtvXG4gKi9cbnZhciBLYXJrYXMgPSBmdW5jdGlvbigpIHtcblxuICAgIGZ1bmN0aW9uIGRlZihlbCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIGVsICE9ICd1bmRlZmluZWQnO1xuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHRoaXMudmVyc2lvbiA9IHtcbiAgICAgICAgJ21ham9yJzogMyxcbiAgICAgICAgJ21pbm9yJzogMCxcbiAgICAgICAgJ3BhdGNoJzogMCxcbiAgICAgICAgJ2J1aWxkJzogNyxcbiAgICAgICAgJ3RvU3RyaW5nJzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB3aXRoKHRoaXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm5bbWFqb3IsIG1pbm9yLCBwYXRjaF0uam9pbignLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMudmlld3MgPSB7fTtcbiAgICB0aGlzLmZpbHRlcnMgPSB7XG4gICAgICAgIF9fY29udGFpbmVyX186IHt9LFxuICAgICAgICAvKipcbiAgICAgICAgICogR2V0IEZpbHRlclxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0OiBmdW5jdGlvbihmaWx0ZXJOYW1lKSB7XG4gICAgICAgICAgICBpZih0eXBlb2YgdGhpcy5fX2NvbnRhaW5lcl9fW2ZpbHRlck5hbWVdID09IFwidW5kZWZpbmVkXCIpIHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcIkthcmthczogdW5kZWZpbmVkIGZpbHRlciBvciB0ZW1wbGF0ZTogJ1wiK2ZpbHRlck5hbWUrXCInXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19jb250YWluZXJfX1tmaWx0ZXJOYW1lXTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIGZpbHRlclxuICAgICAgICAgKi9cbiAgICAgICAgYWRkOiBmdW5jdGlvbihmaWx0ZXJOYW1lLCBmdW5jKSB7XG4gICAgICAgICAgICB0aGlzLl9fY29udGFpbmVyX19bZmlsdGVyTmFtZV0gPSBmdW5jO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgcmVxdWlyZSgnLi92aWV3LmpzJykoc2VsZik7XG4gICAgcmVxdWlyZSgnLi9maWx0ZXJzLmpzJykoc2VsZik7XG5cbiAgICB0aGlzLmdldFZpZXcgPSBmdW5jdGlvbih2SWQpIHtcbiAgICAgICAgaWYodHlwZW9mIHNlbGYudmlld3NbdklkXSA9PSBcInVuZGVmaW5lZFwiKSB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJLYXJrYXNKUzogUmVxdWVzdGVkIHRlbXBsYXRlIGlzIG5vdCBkZWZpbmVkOiAnXCIrdklkK1wiJ1wiKTtcbiAgICAgICAgcmV0dXJuIHNlbGYudmlld3NbdklkXTtcbiAgICB9O1xuXG4gICAgdGhpcy5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBmb3IodmFyIGkgaW4gc2VsZi52aWV3cykge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMudmlld3NbaV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5leGlzdHMgPSBmdW5jdGlvbih0ZW1wbGF0ZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGRlZih0aGlzLnZpZXdzW3RlbXBsYXRlTmFtZV0pO1xuICAgIH07XG5cbiAgICB0aGlzLmxvZyA9IGZ1bmN0aW9uKG1zZ1R4dCwgbXNnVHlwZSkge1xuICAgICAgICBtc2dUeXBlID0gbXNnVHlwZSB8fCAnbG9nJztcbiAgICAgICAgbXNnVHh0ICA9IFwiS2Fya2FzOiBcIittc2dUeHQ7XG4gICAgICAgIHJldHVybiAoIGRlZihjb25zb2xlKSAmJiBkZWYoY29uc29sZVttc2dUeXBlXSkgKSA/IGNvbnNvbGVbbXNnVHlwZV0obXNnVHh0KSA6IG51bGw7XG4gICAgfTtcblxuICAgIHRoaXMuZmlsdGVyID0gZnVuY3Rpb24oZmlsdGVyUXVlcnksIHZhbHVlKSB7XG5cbiAgICAgICAgLy8gRXh0cmFjdCBmaWx0ZXIgbmFtZSBhbmQgYXJnc1xuICAgICAgICBmaWx0ZXJRdWVyeSA9IGZpbHRlclF1ZXJ5LnRyaW0oKS5zcGxpdChcIjpcIik7XG4gICAgICAgIHZhciBmaWx0ZXJOYW1lID0gZmlsdGVyUXVlcnlbMF07XG5cbiAgICAgICAgLy8gQXJyYXkgb2YgYXJndW1lbnRzIHRoYXQgd2Ugd2lsbCBwdXNoIHRvIHRoZSBmaWx0ZXJcbiAgICAgICAgLy8gQXQgc3RhcnQgdGhlcmUgd2lsbCBiZSBvbmx5IGV4cHJlc3Npb24gdmFsdWVcbiAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xuXG4gICAgICAgIC8vIFRyeSB0byBmaW5kIGFub3RoZXIgYXJnc1xuICAgICAgICBpZihmaWx0ZXJRdWVyeS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB2YXIgZmlsdGVyQXJncyA9IChuZXcgRnVuY3Rpb24oXCJyZXR1cm4gW1wiK2ZpbHRlclF1ZXJ5WzFdLnRyaW0oKStcIl1cIikpKCk7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmNvbmNhdChmaWx0ZXJBcmdzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGaW5kIGFuZCBjYWxsIHRoZSBmaWx0ZXIgd2l0aCBzZWxlY3RlZCBhcmdzXG4gICAgICAgICAgICB2YXIgZmlsdGVyID0gc2VsZi5maWx0ZXJzLmdldChmaWx0ZXJOYW1lKTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXIuYXBwbHkoZmlsdGVyLHZhbHVlKTtcbiAgICAgICAgfSBjYXRjaChleCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiS2Fya2FzOiBmYWlsZWQgdG8gYXBwbHkgZmlsdGVyICdcIitmaWx0ZXJOYW1lK1wiJywgcmVhc29uOiBcIitleC5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmNvbXBpbGUgPSBmdW5jdGlvbih0ZW1wbGF0ZU5hbWUsIGNvbnRlbnQpIHtcblxuICAgICAgICAvLyBPdXRwdXQgYnVmZmVyXG4gICAgICAgIHZhciBvdXRwdXQgICA9IFwiXCIsXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IHNlbGYuZ2V0Vmlldyh0ZW1wbGF0ZU5hbWUpO1xuXG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50IHx8IHt9O1xuXG4gICAgICAgIC8vIElmIHdlIGhhdmUgYW4gYXJyYXksIHBhcnNlIGFzIGFycmF5XG4gICAgICAgIG91dHB1dCA9IHRlbXBsYXRlWyhjb250ZW50IGluc3RhbmNlb2YgQXJyYXkpID8gXCJwYXJzZUFycmF5XCIgOiBcInBhcnNlXCJdKGNvbnRlbnQpO1xuXG4gICAgICAgIHJldHVybiBvdXRwdXQ7XG5cbiAgICB9O1xuXG4gICAgdGhpcy5nZXRWaWV3ID0gZnVuY3Rpb24odklkKSB7XG4gICAgICAgIGlmKCAhZGVmKHNlbGYudmlld3NbdklkXSkgKSB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJLYXJrYXNKUzogUmVxdWVzdGVkIHRlbXBsYXRlIGlzIG5vdCBkZWZpbmVkOiAnXCIrdklkK1wiJ1wiKTtcbiAgICAgICAgcmV0dXJuIHNlbGYudmlld3NbdklkXTtcbiAgICB9O1xuXG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBLYXJrYXMoKTtcbn07IiwiLyoqXG4gKiBLYXJrYXMuanMgKGh0dHBzOi8vZ2l0aHViLmNvbS9vZGluMy9rYXJrYXMpXG4gKiBMaWNlbnNlZCBieSBNSVQgbGljZW5zZVxuICpcbiAqIEBwYWNrYWdlIGthcmthcy5kb21cbiAqIEB2ZXJzaW9uIDMuMC4wLWIxXG4gKiBAYXV0aG9yIERlbmlzIFNlZGNoZW5rb1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oa2Fya2FzKSB7XG4gICAgZnVuY3Rpb24gZGVmKGUpIHsgcmV0dXJuIHR5cGVvZiBlICE9PSAndW5kZWZpbmVkJzsgfVxuICAgIGZ1bmN0aW9uIG51bChlKSB7IHJldHVybiBlID09PSBudWxsIH1cblxuICAgIGlmKCAhZGVmKHdpbmRvdykgKSB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoJ0thcmthcyBET00gZXh0ZW5zaW9ucyByZXF1cmllcyBicm93c2VyJyk7XG4gICAgaWYoICFkZWYod2luZG93LmRvY3VtZW50KSApIHRocm93IG5ldyBFcnJvcignS2Fya2FzIERPTSBleHRlbnNpb25zIHJlcXVpcmVzIGEgZG9jdW1lbnQgb2JqZWN0Jyk7XG5cbiAgICB2YXIgJGQgPSB3aW5kb3cuZG9jdW1lbnQ7XG4gICAgdmFyICRiID0gJGQucXVlcnlTZWxlY3RvcignYm9keScpO1xuXG4gICAgdmFyIENPTVBJTEVEX0VMRU1FTlRfU0VMRUNUT1IgICA9ICcqW2RhdGEtY29tcGlsZV0nLFxuICAgICAgICBDT01QSUxFRF9FTEVNRU5UX0RBVEEgICAgICAgPSAnZGF0YS1jb21waWxlJyxcbiAgICAgICAgQ09NUElMRURfRUxFTUVOVF9URU1QTEFURSAgID0gJ2RhdGEtdmlldycsXG4gICAgICAgIFZJRVdfU0NSSVBUX01JTUVfVFlQRSAgICAgICA9ICd0ZXh0L2thcmthcyc7XG5cbiAgICBrYXJrYXMub25GaW5kID0gZnVuY3Rpb24oKSB7fTtcblxuICAgIGthcmthcy5jb21waWxlRWxlbWVudCA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHRlbXBOYW1lID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoQ09NUElMRURfRUxFTUVOVF9URU1QTEFURSksXG4gICAgICAgICAgICB0ZW1wRGF0YSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKENPTVBJTEVEX0VMRU1FTlRfREFUQSk7XG5cbiAgICAgICAgaWYoIG51bCh0ZW1wTmFtZSkgKSB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoQ09NUElMRURfRUxFTUVOVF9URU1QTEFURSsnIGlzIHVuZGVmaW5lZCcpO1xuICAgICAgICBpZiggbnVsKHRlbXBEYXRhKSApIHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihDT01QSUxFRF9FTEVNRU5UX0RBVEErJyBpcyB1bmRlZmluZWQnKTtcblxuICAgICAgICB0ZW1wTmFtZSA9IHRlbXBOYW1lLnRyaW0oKTtcbiAgICAgICAgdGVtcERhdGEgPSB0ZW1wRGF0YS50cmltKCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRlbXBEYXRhID0gSlNPTi5wYXJzZSh0ZW1wRGF0YSk7XG4gICAgICAgICAgICBlbGVtZW50LmlubmVySFRNTCArPSBrYXJrYXMuY29tcGlsZSh0ZW1wTmFtZSwgdGVtcERhdGEpO1xuICAgICAgICB9IGNhdGNoKGV4KSB7XG4gICAgICAgICAgICBrYXJrYXMubG9nKFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0thcmthczogZmFpbGVkIHRvIGNvbXBpbGUgZWxlbWVudCcsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAgIGV4LFxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlbGVtZW50XG4gICAgICAgICAgICAgICAgfSwgJ2Vycm9yJyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBrYXJrYXMucmVmcmVzaCA9IGZ1bmN0aW9uKHJlZnJlc2hJdGVtcykge1xuICAgICAgICAvLyBWaWV3cyBjb250YWluZXJcbiAgICAgICAgaWYocmVmcmVzaEl0ZW1zKSB0aGlzLmNsZWFyKCk7XG5cbiAgICAgICAgdmFyIHRlbXBsYXRlU2VsZWN0b3IgPSAnc2NyaXB0W3R5cGU9XCInK1ZJRVdfU0NSSVBUX01JTUVfVFlQRSsnXCJdJztcbiAgICAgICAgaWYoIXJlZnJlc2hJdGVtcykgdGVtcGxhdGVTZWxlY3RvciArPSAnOm5vdChbZGF0YS1sb2FkZWRdKSc7XG5cbiAgICAgICAgLy8gU2VsZWN0IGFsbCB0ZW1wbGF0ZXNcbiAgICAgICAgdmFyIHcgPSAkZC5xdWVyeVNlbGVjdG9yQWxsKHRlbXBsYXRlU2VsZWN0b3IpO1xuXG4gICAgICAgIC8vIEdyZXAgYWxsIGVsZW1lbnRzXG4gICAgICAgIGZvcih2YXIgYyA9IDA7ICBjIDwgdy5sZW5ndGg7IGMrKyApXG4gICAgICAgIHtcbiAgICAgICAgICAgICggbmV3IGthcmthcy5WaWV3KHdbY10uZ2V0QXR0cmlidXRlKFwibmFtZVwiKSwgd1tjXS5pbm5lckhUTUwpICkuYXBwbHkoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZpbmQgaXRlbXMgYnkgYXR0ciBhbmQgcGFyc2UgdGhlbVxuICAgICAgICB2YXIgcmVxdWVzdGVkVG9QYXJzZSA9ICRkLnF1ZXJ5U2VsZWN0b3JBbGwoQ09NUElMRURfRUxFTUVOVF9TRUxFQ1RPUik7XG5cbiAgICAgICAgaWYoIXJlcXVlc3RlZFRvUGFyc2UubGVuZ3RoKSByZXR1cm4gdHJ1ZTtcblxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcmVxdWVzdGVkVG9QYXJzZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAga2Fya2FzLmNvbXBpbGVFbGVtZW50KHJlcXVlc3RlZFRvUGFyc2VbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodHlwZW9mIHRoaXMub25GaW5kID09ICdmdW5jdGlvbicpIHRoaXMub25GaW5kKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEltcG9ydCBjb250ZW50IGFzIHRlbXBsYXRlIGZyb20gcmVtb3RlIFVSTFxuICAgICAqIEBwYXJhbSB1cmwge1N0cmluZ30gVVJMIFBhdGhcbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVOYW1lIHtTdHJpbmd9IFRlbXBsYXRlIG5hbWVcbiAgICAgKiBAcGFyYW0gc3VjY2Vzc0NhbGxiYWNrIHtGdW5jdGlvbn0gb25TdWNjZXNzIGNhbGxiYWNrXG4gICAgICovXG4gICAgdGhpcy5pbmNsdWRlID0gZnVuY3Rpb24odXJsLCB0ZW1wbGF0ZU5hbWUsIHN1Y2Nlc3NDYWxsYmFjaykge1xuXG4gICAgICAgIGZ1bmN0aW9uIGZpbmlzaChvblN1Y2Nlc3MsIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgbmV3IHRlbXBsYXRlIGFuZCBwdXNoIGl0IHRvIEthcmthc1xuICAgICAgICAgICAgKG5ldyBrYXJrYXMuVmlldyh0ZW1wbGF0ZU5hbWUsIHJlc3BvbnNlKSkuYXBwbHkoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCBjYWxsYmFja1xuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gbWFrZVJlcXVlc3Qob25TdWNjZXNzLCBvbkVycm9yKSB7XG4gICAgICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgICAgICB4aHIub3BlbihcIkdFVFwiLCB1cmwpO1xuICAgICAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaChvblN1Y2Nlc3MsIHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvcih7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICggZGVmKG9uRXJyb3IpICkge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdLYXJrYXM6IEZhaWxlZCB0byBpbXBvcnQgcmVtb3RlIHRlbXBsYXRlOiAnLHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB4aHIuc2VuZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaW1wb3J0RnJvbURvbShvblN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIHZhciBlID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignc2NyaXB0W3R5cGU9XCInK1ZJRVdfU0NSSVBUX01JTUVfVFlQRSsnXCJdIycrdXJsKTtcbiAgICAgICAgICAgIHZhciBlSXNOdWxsID0gbnVsKGUpO1xuICAgICAgICAgICAgaWYgKCAhZUlzTnVsbCApIHtcbiAgICAgICAgICAgICAgICBmaW5pc2gob25TdWNjZXNzLCBlLmlubmVySFRNTCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZUlzTnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHRyeUltcG9ydChvblN1Y2Nlc3MsIG9uRXJyb3IpIHtcblxuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCBlbGVtZW50IGZyb20gRE9NXG4gICAgICAgICAgICBpZiggIWltcG9ydEZyb21Eb20ob25TdWNjZXNzKSApIHtcblxuICAgICAgICAgICAgICAgIC8vIElmIG5vdCAtIGRvd25sb2FkIGl0LlxuICAgICAgICAgICAgICAgIG1ha2VSZXF1ZXN0KG9uU3VjY2Vzcywgb25FcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG5cbiAgICAgICAgaWYoIHR5cGVvZiB1cmwgIT09ICdzdHJpbmcnICkgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKCdLYXJrYXM6IFVybCBpcyBub3QgYSBTdHJpbmcnKTtcbiAgICAgICAgdGVtcGxhdGVOYW1lID0gdGVtcGxhdGVOYW1lIHx8IHVybDtcbiAgICAgICAgaWYoICh0eXBlb2Ygc3VjY2Vzc0NhbGxiYWNrID09ICdmdW5jdGlvbicpIHx8ICh0eXBlb2Ygd2luZG93LlByb21pc2UgPT0gJ3VuZGVmaW5lZCcpICkgcmV0dXJuIHRyeUltcG9ydChzdWNjZXNzQ2FsbGJhY2spO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB0cnlJbXBvcnQocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBrYXJrYXMucmVmcmVzaCk7XG5cbn07IiwiLyoqXG4gKiBLYXJrYXMuanMgKGh0dHBzOi8vZ2l0aHViLmNvbS9vZGluMy9rYXJrYXMpXG4gKiBMaWNlbnNlZCBieSBNSVQgbGljZW5zZVxuICpcbiAqIEthcmthcyBlbWJlZGRlZCBmaWx0ZXJzXG4gKlxuICogQHBhY2thZ2Uga2Fya2FzLmZpbHRlcnNcbiAqIEB2ZXJzaW9uIDMuMC4wLWIxXG4gKiBAYXV0aG9yIERlbmlzIFNlZGNoZW5rb1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGthcmthcykge1xuICAgIHdpdGgoa2Fya2FzLmZpbHRlcnMpIHtcbiAgICAgICAgYWRkKCdjdXJyZW5jeScsIHJlcXVpcmUoJy4vZmlsdGVycy9jdXJyZW5jeS5qcycpICk7XG4gICAgICAgIGFkZCgnc3RyaW5nJywgcmVxdWlyZSgnLi9maWx0ZXJzL3N0cmluZy5qcycpICk7XG4gICAgICAgIGFkZCgnYXJyYXknLCByZXF1aXJlKCcuL2ZpbHRlcnMvYXJyYXkuanMnKSApO1xuICAgICAgICBhZGQoJ21hdGgnLCByZXF1aXJlKCcuL2ZpbHRlcnMvbWF0aC5qcycpICk7XG4gICAgICAgIGFkZCgnanNvbicsIHJlcXVpcmUoJy4vZmlsdGVycy9qc29uLmpzJykgKTtcbiAgICAgICAgYWRkKCdjYXBpdGFsaXplJywgcmVxdWlyZSgnLi9maWx0ZXJzL2NhcGl0YWxpemUuanMnKSApO1xuICAgICAgICBhZGQoJ3RvTG93ZXInLCByZXF1aXJlKCcuL2ZpbHRlcnMvdG9Mb3dlci5qcycpICk7XG4gICAgICAgIGFkZCgndG9VcHBlcicsIHJlcXVpcmUoJy4vZmlsdGVycy90b1VwcGVyLmpzJykgKTtcbiAgICB9XG5cbn07IiwiLyoqXG4gKiBLYXJrYXMuanMgKGh0dHBzOi8vZ2l0aHViLmNvbS9vZGluMy9rYXJrYXMpXG4gKiBMaWNlbnNlZCBieSBNSVQgbGljZW5zZVxuICpcbiAqIEFycmF5IGZpbHRlclxuICpcbiAqIEBwYWNrYWdlIGthcmthcy5maWx0ZXJzLmFycmF5XG4gKiBAdmVyc2lvbiAzLjAuMC1iMVxuICogQGF1dGhvciBEZW5pcyBTZWRjaGVua29cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCR2YWx1ZSwgJG9wZXJhdGlvbikge1xuICAgIHRyeSB7XG4gICAgICAgIHZhciAkYXJncyA9IFtdLnNwbGljZS5hcHBseShhcmd1bWVudHMsWzJdKTtcbiAgICAgICAgcmV0dXJuIChbXSlbJG9wZXJhdGlvbl0uYXBwbHkoJHZhbHVlLCRhcmdzKTtcbiAgICB9IGNhdGNoKGV4KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBwZXJmb3JtIG1ldGhvZCBgQXJyYXkuXCIrJG9wZXJhdGlvbitcImAgKFwiK2V4Lm1lc3NhZ2UrXCIpXCIpO1xuICAgIH1cbn07IiwiLyoqXG4gKiBLYXJrYXMuanMgKGh0dHBzOi8vZ2l0aHViLmNvbS9vZGluMy9rYXJrYXMpXG4gKiBMaWNlbnNlZCBieSBNSVQgbGljZW5zZVxuICpcbiAqIEBwYWNrYWdlIGthcmthcy5maWx0ZXJzLmNhcGl0YWxpemVcbiAqIEB2ZXJzaW9uIDMuMC4wLWIxXG4gKiBAYXV0aG9yIERlbmlzIFNlZGNoZW5rb1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsKSB7XG4gICAgdmFsID0gU3RyaW5nKHZhbCk7XG4gICAgcmV0dXJuIHZhbC5zdWJzdHJpbmcoMCwxKS50b1VwcGVyQ2FzZSgpK3ZhbC5zdWJzdHJpbmcoMSk7XG59OyIsIi8qKlxuICogS2Fya2FzLmpzIChodHRwczovL2dpdGh1Yi5jb20vb2RpbjMva2Fya2FzKVxuICogTGljZW5zZWQgYnkgTUlUIGxpY2Vuc2VcbiAqXG4gKiBDdXJyZW5jeSBmaWx0ZXJcbiAqIFxuICogQHBhY2thZ2Uga2Fya2FzLmZpbHRlcnMuY3VycmVuY3lcbiAqIEB2ZXJzaW9uIDMuMC4wLWIxXG4gKiBAYXV0aG9yIERlbmlzIFNlZGNoZW5rb1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHZhbHVlLCAkY3VycmVuY3ksICRkaWdpdHNUb0ZpeGVkKSB7XG4gICAgLy8gQ3VycmVuY3kgYnkgZGVmYXVsdCBpcyBVU0RcbiAgICAkY3VycmVuY3kgPSAkY3VycmVuY3kgfHwgXCIkXCI7XG5cblxuICAgIGZ1bmN0aW9uIGZvcm1hdE1vbmV5KG4sIGMsIGQsIHQpe1xuICAgICAgICB2YXIgYyA9IGlzTmFOKGMgPSBNYXRoLmFicyhjKSkgPyAyIDogYyxcbiAgICAgICAgICAgIGQgPSBkID09IHVuZGVmaW5lZCA/IFwiLlwiIDogZCxcbiAgICAgICAgICAgIHQgPSB0ID09IHVuZGVmaW5lZCA/IFwiLFwiIDogdCxcbiAgICAgICAgICAgIHMgPSBuIDwgMCA/IFwiLVwiIDogXCJcIixcbiAgICAgICAgICAgIGkgPSBwYXJzZUludChuID0gTWF0aC5hYnMoK24gfHwgMCkudG9GaXhlZChjKSkgKyBcIlwiLFxuICAgICAgICAgICAgaiA9IChqID0gaS5sZW5ndGgpID4gMyA/IGogJSAzIDogMDtcbiAgICAgICAgcmV0dXJuIHMgKyAoaiA/IGkuc3Vic3RyKDAsIGopICsgdCA6IFwiXCIpICsgaS5zdWJzdHIoaikucmVwbGFjZSgvKFxcZHszfSkoPz1cXGQpL2csIFwiJDFcIiArIHQpICsgKGMgPyBkICsgTWF0aC5hYnMobiAtIGkpLnRvRml4ZWQoYykuc2xpY2UoMikgOiBcIlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJGN1cnJlbmN5K1wiIFwiK2Zvcm1hdE1vbmV5KCR2YWx1ZSwgJGRpZ2l0c1RvRml4ZWQpO1xuXG5cbn07IiwiLyoqXG4gKiBLYXJrYXMuanMgKGh0dHBzOi8vZ2l0aHViLmNvbS9vZGluMy9rYXJrYXMpXG4gKiBMaWNlbnNlZCBieSBNSVQgbGljZW5zZVxuICpcbiAqIEpTT04gZmlsdGVyXG4gKlxuICogQHBhY2thZ2Uga2Fya2FzLmZpbHRlcnMuanNvblxuICogQHZlcnNpb24gMy4wLjAtYjFcbiAqIEBhdXRob3IgRGVuaXMgU2VkY2hlbmtvXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWwpIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodmFsKTtcbiAgICB9IGNhdGNoKGV4KSB7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfVxufTsiLCIvKipcbiAqIEthcmthcy5qcyAoaHR0cHM6Ly9naXRodWIuY29tL29kaW4zL2thcmthcylcbiAqIExpY2Vuc2VkIGJ5IE1JVCBsaWNlbnNlXG4gKlxuICogTWF0aCBmaWx0ZXJcbiAqXG4gKiBAcGFja2FnZSBrYXJrYXMuZmlsdGVycy5tYXRoXG4gKiBAdmVyc2lvbiAzLjAuMC1iMVxuICogQGF1dGhvciBEZW5pcyBTZWRjaGVua29cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCR2YWx1ZSwgJG9wZXJhdGlvbikge1xuICAgIHRyeSB7XG4gICAgICAgIFtdLnNwbGljZS5hcHBseShhcmd1bWVudHMsWzEsMV0pO1xuICAgICAgICByZXR1cm4gTWF0aFskb3BlcmF0aW9uXS5hcHBseShNYXRoLGFyZ3VtZW50cyk7XG4gICAgfSBjYXRjaChleCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gcGVyZm9ybSBtZXRob2QgYE1hdGguXCIrJG9wZXJhdGlvbitcImAgKFwiK2V4Lm1lc3NhZ2UrXCIpXCIpO1xuICAgIH1cbn07IiwiLyoqXG4gKiBLYXJrYXMuanMgKGh0dHBzOi8vZ2l0aHViLmNvbS9vZGluMy9rYXJrYXMpXG4gKiBMaWNlbnNlZCBieSBNSVQgbGljZW5zZVxuICpcbiAqIFN0cmluZyBmaWx0ZXJcbiAqXG4gKiBAcGFja2FnZSBrYXJrYXMuZmlsdGVycy5zdHJpbmdcbiAqIEB2ZXJzaW9uIDMuMC4wLWIxXG4gKiBAYXV0aG9yIERlbmlzIFNlZGNoZW5rb1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHZhbHVlLCAkb3BlcmF0aW9uKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyICRhcmdzID0gW10uc3BsaWNlLmFwcGx5KGFyZ3VtZW50cyxbMl0pO1xuICAgICAgICByZXR1cm4gXCJcIlskb3BlcmF0aW9uXS5hcHBseSgkdmFsdWUsJGFyZ3MpO1xuICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIHBlcmZvcm0gbWV0aG9kIGBTdHJpbmcuXCIrJG9wZXJhdGlvbitcImAgKFwiK2V4Lm1lc3NhZ2UrXCIpXCIpO1xuICAgIH1cbn07IiwiLyoqXG4gKiBLYXJrYXMuanMgKGh0dHBzOi8vZ2l0aHViLmNvbS9vZGluMy9rYXJrYXMpXG4gKiBMaWNlbnNlZCBieSBNSVQgbGljZW5zZVxuICpcbiAqIEBwYWNrYWdlIGthcmthcy5maWx0ZXJzLnRvTG93ZXJcbiAqIEB2ZXJzaW9uIDMuMC4wLWIxXG4gKiBAYXV0aG9yIERlbmlzIFNlZGNoZW5rb1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsKSB7XG4gICAgcmV0dXJuIFN0cmluZyh2YWwpLnRvTG93ZXJDYXNlKCk7XG59OyIsIi8qKlxuICogS2Fya2FzLmpzIChodHRwczovL2dpdGh1Yi5jb20vb2RpbjMva2Fya2FzKVxuICogTGljZW5zZWQgYnkgTUlUIGxpY2Vuc2VcbiAqXG4gKiBAcGFja2FnZSBrYXJrYXMuZmlsdGVycy50b1VwcGVyXG4gKiBAdmVyc2lvbiAzLjAuMC1iMVxuICogQGF1dGhvciBEZW5pcyBTZWRjaGVua29cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCkge1xuICAgIHJldHVybiBTdHJpbmcodmFsKS50b1VwcGVyQ2FzZSgpO1xufTsiLCIvKipcbiAqIEthcmthcy5qcyAoaHR0cHM6Ly9naXRodWIuY29tL29kaW4zL2thcmthcylcbiAqIExpY2Vuc2VkIGJ5IE1JVCBsaWNlbnNlXG4gKlxuICogQHBhY2thZ2Uga2Fya2FzLnZpZXdcbiAqIEB2ZXJzaW9uIDMuMC4wLWIxXG4gKiBAYXV0aG9yIERlbmlzIFNlZGNoZW5rb1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oa2Fya2FzKSB7XG4gICAgZnVuY3Rpb24gZGVmKGVsKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgZWwgIT0gJ3VuZGVmaW5lZCc7XG4gICAgfVxuXG4gICAga2Fya2FzLlZpZXcgPSBmdW5jdGlvbihuYW1lLCBjb250ZW50KSB7XG4gICAgICBpZighZGVmKGNvbnRlbnQpKSB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJLYXJrYXMuVmlldzogdmlld0VsZW1lbnQgaXMgbm90IGRlZmluZWQuXCIpO1xuICAgICAgaWYodHlwZW9mIGNvbnRlbnQgIT09ICdzdHJpbmcnKSB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoJ0thcmthcy5WaWV3OiBUZW1wbGF0ZSBjb250ZW50IG11c3QgYmUgYSBzdHJpbmcnKTtcblxuICAgICAgLyoqXG4gICAgICAgKiBQYXR0ZXJuIGZvciBleHByZXNzaW9ucyAoIHt7dmFsdWV9fSApXG4gICAgICAgKi9cbiAgICAgIHRoaXMucGF0dGVybiAgICA9IC9bXFx7XFx7XSguKj8pW1xcfVxcfV0rL2dpbTtcblxuXG4gICAgICB0aGlzLm5hbWUgICAgICAgPSBuYW1lO1xuICAgICAgdGhpcy5jb250ZW50ICAgID0gY29udGVudC50cmltKCk7XG5cbiAgICAgIHZhciBzZWxmICAgICAgICA9IHRoaXM7XG5cbiAgICAgIHRoaXMuYXBwbHkgPSBmdW5jdGlvbihyZXBsYWNlSWZFeGlzdHMpIHtcbiAgICAgICAgICByZXBsYWNlSWZFeGlzdHMgPSByZXBsYWNlSWZFeGlzdHMgfHwgZmFsc2U7XG4gICAgICAgICAgaWYoa2Fya2FzLmV4aXN0cyh0aGlzLm5hbWUpICYmICFyZXBsYWNlSWZFeGlzdHMpIHtcbiAgICAgICAgICAgICAga2Fya2FzLmxvZygnQ2Fubm90IGFwcGx5IG5ldyB0ZW1wbGF0ZSwgXCInK3RoaXMubmFtZSsnXCIgYWxyZWFkeSBleGlzdHMuIFVzZSBcImFwcGx5KHRydWUpXCIgdG8gb3ZlcndyaXRlIGl0LicsICd3YXJuJyk7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAga2Fya2FzLnZpZXdzW3NlbGYubmFtZV0gPSB0aGlzO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfTtcblxuXG4gICAgICAvKipcbiAgICAgICAqIFBhcnNlIHNpbmdsZSBleHByZXNzaW9uIGZyb20gb2JqZWN0XG4gICAgICAgKiBAcGFyYW0gICB7T2JqZWN0fSAkX29iamVjdCAgICAgT2JqZWN0XG4gICAgICAgKiBAcGFyYW0gICB7U3RyaW5nfSAkX2V4cHJlc3Npb24gRXhwcmVzc2lvblxuICAgICAgICogQHJldHVybnMgeyp9IFZhbHVlXG4gICAgICAgKi9cbiAgICAgIGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbigkX29iamVjdCwgJF9leHByZXNzaW9uKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbignd2l0aCh0aGlzKSB7IHJldHVybiAnKyRfZXhwcmVzc2lvbisnOyB9JykuYXBwbHkoJF9vYmplY3QpO1xuICAgICAgfVxuXG5cbiAgICAgIC8qKlxuICAgICAgICogUGFyc2UgYW4gc2luZ2xlIG9iamVjdCB1c2luZyB0aGUgdGVtcGxhdGVcbiAgICAgICAqIEBwYXJhbSBmaWVsZHMgT2JqZWN0XG4gICAgICAgKiBAcmV0dXJucyB7Kn0gQ29tcGlsZWQgY29udGVudFxuICAgICAgICovXG4gICAgICB0aGlzLnBhcnNlICAgICAgPSBmdW5jdGlvbihmaWVsZHMpIHtcbiAgICAgICAgICB2YXIgc1JldHVybiAgICA9IHRoaXMuY29udGVudC50b1N0cmluZygpLFxuICAgICAgICAgICAgICB0cEZpZWxkcyAgID0gc1JldHVybi5tYXRjaCh0aGlzLnBhdHRlcm4pO1xuXG4gICAgICAgICAgZm9yKHZhciBwYXQgaW4gdHBGaWVsZHMpe1xuICAgICAgICAgICAgICB2YXIgY3VycmVudEZpZWxkID0gdHBGaWVsZHNbcGF0XTtcbiAgICAgICAgICAgICAgaWYodHlwZW9mIGN1cnJlbnRGaWVsZCA9PSBcInN0cmluZ1wiIHx8IHR5cGVvZiBjdXJyZW50RmllbGQgPT0gXCJudW1iZXJcIil7XG4gICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYnJhY2tldHMgYW5kIGV4dHJhY3QgZmlsdGVyc1xuICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IGN1cnJlbnRGaWVsZC5yZXBsYWNlKFwie3tcIixcIlwiKS5yZXBsYWNlKFwifX1cIixcIlwiKS50cmltKCkuc3BsaXQoXCJ8XCIpO1xuXG4gICAgICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgZmlsdGVycyBhbmQgZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAgIHZhciBmaWx0ZXIgPSAoa2V5Lmxlbmd0aCA+IDEpID8ga2V5W2tleS5sZW5ndGggLSAxXSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgIGtleSA9IGtleVswXTtcblxuICAgICAgICAgICAgICAgICAgLy8gIHJlcGxhY2UgZXhwcmVzc2lvbiB3aXRoIG9iamVjdFxuICAgICAgICAgICAgICAgICAgdmFyIG5ld1ZhbDtcbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgbmV3VmFsID0gcGFyc2VFeHByZXNzaW9uKGZpZWxkcywga2V5KTtcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJLYXJrYXM6IGZhaWxlZCB0byBwYXJzZSBleHByZXNzaW9uICdcIitrZXkrXCInIGluIHRlbXBsYXRlICdcIit0aGlzLm5hbWUrXCInLiBcIitleC5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIElmIHZhbHVlIGlzIHVuZGVmaW5lZCAtIHJlcGxhY2UgaXRcbiAgICAgICAgICAgICAgICAgIGlmKCAhZGVmKG5ld1ZhbCkgKSBuZXdWYWwgPSBcIlwiO1xuXG4gICAgICAgICAgICAgICAgICAvLyBVc2UgZmlsdGVyIG9yIHRlbXBsYXRlIGlmIGF2YWlsYWJsZSBpbiBleHByZXNzaW9uXG4gICAgICAgICAgICAgICAgICBpZiggZGVmKGZpbHRlcikpICBuZXdWYWwgPSBrYXJrYXNbKGRlZihrYXJrYXMudmlld3NbZmlsdGVyXSkpID8gXCJjb21waWxlXCIgOiBcImZpbHRlclwiXShmaWx0ZXIsIG5ld1ZhbCk7XG5cbiAgICAgICAgICAgICAgICAgIHNSZXR1cm4gPSBzUmV0dXJuLnJlcGxhY2UoY3VycmVudEZpZWxkLG5ld1ZhbCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHNSZXR1cm47XG4gICAgICB9O1xuXG5cbiAgICAgIC8qKlxuICAgICAgICogUGFyc2UgYW4gYXJyYXkgb2Ygb2JqZWN0cyB1c2luZyB0aGUgdGVtcGxhdGVcbiAgICAgICAqIEBwYXJhbSBhcnJcbiAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IENvbXBpbGVkIGNvbnRlbnRcbiAgICAgICAqL1xuICAgICAgdGhpcy5wYXJzZUFycmF5ID0gZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgICAgdmFyIGMgPSBcIlwiO1xuICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgYyArPSB0aGlzLnBhcnNlKGFycltpXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBjO1xuICAgICAgfTtcblxuICB9O1xufTsiXX0=
