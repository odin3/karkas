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