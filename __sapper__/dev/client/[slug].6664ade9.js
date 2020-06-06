import { S as SvelteComponentDev, i as init, d as dispatch_dev, s as safe_not_equal, z as validate_each_argument, v as validate_slots, e as element, t as text, c as claim_element, b as children, g as claim_text, h as detach_dev, j as attr_dev, k as add_location, l as insert_dev, m as append_dev, n as set_data_dev, a as space, E as empty, f as claim_space, p as create_component, A as query_selector_all, q as claim_component, r as mount_component, u as transition_in, x as transition_out, y as destroy_component, C as destroy_each, F as null_to_empty, H as HtmlTag } from './client.e7b8c2be.js';
import { a as authors, A as Author } from './Author.01272b36.js';

// https://github.com/substack/deep-freeze/blob/master/index.js
function deepFreeze (o) {
  Object.freeze(o);

  var objIsFunction = typeof o === 'function';

  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (o.hasOwnProperty(prop)
    && o[prop] !== null
    && (typeof o[prop] === "object" || typeof o[prop] === "function")
    // IE11 fix: https://github.com/highlightjs/highlight.js/issues/2318
    // TODO: remove in the future
    && (objIsFunction ? prop !== 'caller' && prop !== 'callee' && prop !== 'arguments' : true)
    && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
    }
  });

  return o;
}

function escapeHTML(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


/**
 * performs a shallow merge of multiple objects into one
 *
 * @arguments list of objects with properties to merge
 * @returns a single new object
 */
function inherit(parent) {  // inherit(parent, override_obj, override_obj, ...)
  var key;
  var result = {};
  var objects = Array.prototype.slice.call(arguments, 1);

  for (key in parent)
    result[key] = parent[key];
  objects.forEach(function(obj) {
    for (key in obj)
      result[key] = obj[key];
  });
  return result;
}

/* Stream merging */


function tag(node) {
  return node.nodeName.toLowerCase();
}


function nodeStream(node) {
  var result = [];
  (function _nodeStream(node, offset) {
    for (var child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3)
        offset += child.nodeValue.length;
      else if (child.nodeType === 1) {
        result.push({
          event: 'start',
          offset: offset,
          node: child
        });
        offset = _nodeStream(child, offset);
        // Prevent void elements from having an end tag that would actually
        // double them in the output. There are more void elements in HTML
        // but we list only those realistically expected in code display.
        if (!tag(child).match(/br|hr|img|input/)) {
          result.push({
            event: 'stop',
            offset: offset,
            node: child
          });
        }
      }
    }
    return offset;
  })(node, 0);
  return result;
}

function mergeStreams(original, highlighted, value) {
  var processed = 0;
  var result = '';
  var nodeStack = [];

  function selectStream() {
    if (!original.length || !highlighted.length) {
      return original.length ? original : highlighted;
    }
    if (original[0].offset !== highlighted[0].offset) {
      return (original[0].offset < highlighted[0].offset) ? original : highlighted;
    }

    /*
    To avoid starting the stream just before it should stop the order is
    ensured that original always starts first and closes last:

    if (event1 == 'start' && event2 == 'start')
      return original;
    if (event1 == 'start' && event2 == 'stop')
      return highlighted;
    if (event1 == 'stop' && event2 == 'start')
      return original;
    if (event1 == 'stop' && event2 == 'stop')
      return highlighted;

    ... which is collapsed to:
    */
    return highlighted[0].event === 'start' ? original : highlighted;
  }

  function open(node) {
    function attr_str(a) {
      return ' ' + a.nodeName + '="' + escapeHTML(a.value).replace(/"/g, '&quot;') + '"';
    }
    result += '<' + tag(node) + [].map.call(node.attributes, attr_str).join('') + '>';
  }

  function close(node) {
    result += '</' + tag(node) + '>';
  }

  function render(event) {
    (event.event === 'start' ? open : close)(event.node);
  }

  while (original.length || highlighted.length) {
    var stream = selectStream();
    result += escapeHTML(value.substring(processed, stream[0].offset));
    processed = stream[0].offset;
    if (stream === original) {
      /*
      On any opening or closing tag of the original markup we first close
      the entire highlighted node stack, then render the original tag along
      with all the following original tags at the same offset and then
      reopen all the tags on the highlighted stack.
      */
      nodeStack.reverse().forEach(close);
      do {
        render(stream.splice(0, 1)[0]);
        stream = selectStream();
      } while (stream === original && stream.length && stream[0].offset === processed);
      nodeStack.reverse().forEach(open);
    } else {
      if (stream[0].event === 'start') {
        nodeStack.push(stream[0].node);
      } else {
        nodeStack.pop();
      }
      render(stream.splice(0, 1)[0]);
    }
  }
  return result + escapeHTML(value.substr(processed));
}

var utils = /*#__PURE__*/Object.freeze({
  __proto__: null,
  escapeHTML: escapeHTML,
  inherit: inherit,
  nodeStream: nodeStream,
  mergeStreams: mergeStreams
});

const SPAN_CLOSE = '</span>';

const emitsWrappingTags = (node) => {
  return !!node.kind;
};

class HTMLRenderer {
  constructor(tree, options) {
    this.buffer = "";
    this.classPrefix = options.classPrefix;
    tree.walk(this);
  }

  // renderer API

  addText(text) {
    this.buffer += escapeHTML(text);
  }

  openNode(node) {
    if (!emitsWrappingTags(node)) return;

    let className = node.kind;
    if (!node.sublanguage)
      className = `${this.classPrefix}${className}`;
    this.span(className);
  }

  closeNode(node) {
    if (!emitsWrappingTags(node)) return;

    this.buffer += SPAN_CLOSE;
  }

  // helpers

  span(className) {
    this.buffer += `<span class="${className}">`;
  }

  value() {
    return this.buffer;
  }
}

class TokenTree {
  constructor() {
    this.rootNode = { children: [] };
    this.stack = [ this.rootNode ];
  }

  get top() {
    return this.stack[this.stack.length - 1];
  }

  get root() { return this.rootNode };

  add(node) {
    this.top.children.push(node);
  }

  openNode(kind) {
    let node = { kind, children: [] };
    this.add(node);
    this.stack.push(node);
  }

  closeNode() {
    if (this.stack.length > 1)
      return this.stack.pop();
  }

  closeAllNodes() {
    while (this.closeNode());
  }

  toJSON() {
    return JSON.stringify(this.rootNode, null, 4);
  }

  walk(builder) {
    return this.constructor._walk(builder, this.rootNode);
  }

  static _walk(builder, node) {
    if (typeof node === "string") {
      builder.addText(node);
    } else if (node.children) {
      builder.openNode(node);
      node.children.forEach((child) => this._walk(builder, child));
      builder.closeNode(node);
    }
    return builder;
  }

  static _collapse(node) {
    if (!node.children) {
      return;
    }
    if (node.children.every(el => typeof el === "string")) {
      node.text = node.children.join("");
      delete node["children"];
    } else {
      node.children.forEach((child) => {
        if (typeof child === "string") return;
        TokenTree._collapse(child);
      });
    }
  }
}

/**
  Currently this is all private API, but this is the minimal API necessary
  that an Emitter must implement to fully support the parser.

  Minimal interface:

  - addKeyword(text, kind)
  - addText(text)
  - addSublanguage(emitter, subLangaugeName)
  - finalize()
  - openNode(kind)
  - closeNode()
  - closeAllNodes()
  - toHTML()

*/
class TokenTreeEmitter extends TokenTree {
  constructor(options) {
    super();
    this.options = options;
  }

  addKeyword(text, kind) {
    if (text === "") { return; }

    this.openNode(kind);
    this.addText(text);
    this.closeNode();
  }

  addText(text) {
    if (text === "") { return; }

    this.add(text);
  }

  addSublanguage(emitter, name) {
    let node = emitter.root;
    node.kind = name;
    node.sublanguage = true;
    this.add(node);
  }

  toHTML() {
    let renderer = new HTMLRenderer(this, this.options);
    return renderer.value();
  }

  finalize() {
    return;
  }

}

function escape(value) {
  return new RegExp(value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
}

function source(re) {
  // if it's a regex get it's source,
  // otherwise it's a string already so just return it
  return (re && re.source) || re;
}

function countMatchGroups(re) {
  return (new RegExp(re.toString() + '|')).exec('').length - 1;
}

function startsWith(re, lexeme) {
  var match = re && re.exec(lexeme);
  return match && match.index === 0;
}

// join logically computes regexps.join(separator), but fixes the
// backreferences so they continue to match.
// it also places each individual regular expression into it's own
// match group, keeping track of the sequencing of those match groups
// is currently an exercise for the caller. :-)
function join(regexps, separator) {
  // backreferenceRe matches an open parenthesis or backreference. To avoid
  // an incorrect parse, it additionally matches the following:
  // - [...] elements, where the meaning of parentheses and escapes change
  // - other escape sequences, so we do not misparse escape sequences as
  //   interesting elements
  // - non-matching or lookahead parentheses, which do not capture. These
  //   follow the '(' with a '?'.
  var backreferenceRe = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;
  var numCaptures = 0;
  var ret = '';
  for (var i = 0; i < regexps.length; i++) {
    numCaptures += 1;
    var offset = numCaptures;
    var re = source(regexps[i]);
    if (i > 0) {
      ret += separator;
    }
    ret += "(";
    while (re.length > 0) {
      var match = backreferenceRe.exec(re);
      if (match == null) {
        ret += re;
        break;
      }
      ret += re.substring(0, match.index);
      re = re.substring(match.index + match[0].length);
      if (match[0][0] == '\\' && match[1]) {
        // Adjust the backreference.
        ret += '\\' + String(Number(match[1]) + offset);
      } else {
        ret += match[0];
        if (match[0] == '(') {
          numCaptures++;
        }
      }
    }
    ret += ")";
  }
  return ret;
}

// Common regexps
const IDENT_RE = '[a-zA-Z]\\w*';
const UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
const NUMBER_RE = '\\b\\d+(\\.\\d+)?';
const C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
const BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
const RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

// Common modes
const BACKSLASH_ESCAPE = {
  begin: '\\\\[\\s\\S]', relevance: 0
};
const APOS_STRING_MODE = {
  className: 'string',
  begin: '\'', end: '\'',
  illegal: '\\n',
  contains: [BACKSLASH_ESCAPE]
};
const QUOTE_STRING_MODE = {
  className: 'string',
  begin: '"', end: '"',
  illegal: '\\n',
  contains: [BACKSLASH_ESCAPE]
};
const PHRASAL_WORDS_MODE = {
  begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
};
const COMMENT = function (begin, end, inherits) {
  var mode = inherit(
    {
      className: 'comment',
      begin: begin, end: end,
      contains: []
    },
    inherits || {}
  );
  mode.contains.push(PHRASAL_WORDS_MODE);
  mode.contains.push({
    className: 'doctag',
    begin: '(?:TODO|FIXME|NOTE|BUG|XXX):',
    relevance: 0
  });
  return mode;
};
const C_LINE_COMMENT_MODE = COMMENT('//', '$');
const C_BLOCK_COMMENT_MODE = COMMENT('/\\*', '\\*/');
const HASH_COMMENT_MODE = COMMENT('#', '$');
const NUMBER_MODE = {
  className: 'number',
  begin: NUMBER_RE,
  relevance: 0
};
const C_NUMBER_MODE = {
  className: 'number',
  begin: C_NUMBER_RE,
  relevance: 0
};
const BINARY_NUMBER_MODE = {
  className: 'number',
  begin: BINARY_NUMBER_RE,
  relevance: 0
};
const CSS_NUMBER_MODE = {
  className: 'number',
  begin: NUMBER_RE + '(' +
    '%|em|ex|ch|rem'  +
    '|vw|vh|vmin|vmax' +
    '|cm|mm|in|pt|pc|px' +
    '|deg|grad|rad|turn' +
    '|s|ms' +
    '|Hz|kHz' +
    '|dpi|dpcm|dppx' +
    ')?',
  relevance: 0
};
const REGEXP_MODE = {
  // this outer rule makes sure we actually have a WHOLE regex and not simply
  // an expression such as:
  //
  //     3 / something
  //
  // (which will then blow up when regex's `illegal` sees the newline)
  begin: /(?=\/[^\/\n]*\/)/,
  contains: [{
    className: 'regexp',
    begin: /\//, end: /\/[gimuy]*/,
    illegal: /\n/,
    contains: [
      BACKSLASH_ESCAPE,
      {
        begin: /\[/, end: /\]/,
        relevance: 0,
        contains: [BACKSLASH_ESCAPE]
      }
    ]
  }]
};
const TITLE_MODE = {
  className: 'title',
  begin: IDENT_RE,
  relevance: 0
};
const UNDERSCORE_TITLE_MODE = {
  className: 'title',
  begin: UNDERSCORE_IDENT_RE,
  relevance: 0
};
const METHOD_GUARD = {
  // excludes method names from keyword processing
  begin: '\\.\\s*' + UNDERSCORE_IDENT_RE,
  relevance: 0
};

var MODES = /*#__PURE__*/Object.freeze({
  __proto__: null,
  IDENT_RE: IDENT_RE,
  UNDERSCORE_IDENT_RE: UNDERSCORE_IDENT_RE,
  NUMBER_RE: NUMBER_RE,
  C_NUMBER_RE: C_NUMBER_RE,
  BINARY_NUMBER_RE: BINARY_NUMBER_RE,
  RE_STARTERS_RE: RE_STARTERS_RE,
  BACKSLASH_ESCAPE: BACKSLASH_ESCAPE,
  APOS_STRING_MODE: APOS_STRING_MODE,
  QUOTE_STRING_MODE: QUOTE_STRING_MODE,
  PHRASAL_WORDS_MODE: PHRASAL_WORDS_MODE,
  COMMENT: COMMENT,
  C_LINE_COMMENT_MODE: C_LINE_COMMENT_MODE,
  C_BLOCK_COMMENT_MODE: C_BLOCK_COMMENT_MODE,
  HASH_COMMENT_MODE: HASH_COMMENT_MODE,
  NUMBER_MODE: NUMBER_MODE,
  C_NUMBER_MODE: C_NUMBER_MODE,
  BINARY_NUMBER_MODE: BINARY_NUMBER_MODE,
  CSS_NUMBER_MODE: CSS_NUMBER_MODE,
  REGEXP_MODE: REGEXP_MODE,
  TITLE_MODE: TITLE_MODE,
  UNDERSCORE_TITLE_MODE: UNDERSCORE_TITLE_MODE,
  METHOD_GUARD: METHOD_GUARD
});

// keywords that should have no default relevance value
var COMMON_KEYWORDS = 'of and for in not or if then'.split(' ');

// compilation

function compileLanguage(language) {

  function langRe(value, global) {
    return new RegExp(
      source(value),
      'm' + (language.case_insensitive ? 'i' : '') + (global ? 'g' : '')
    );
  }

  /**
    Stores multiple regular expressions and allows you to quickly search for
    them all in a string simultaneously - returning the first match.  It does
    this by creating a huge (a|b|c) regex - each individual item wrapped with ()
    and joined by `|` - using match groups to track position.  When a match is
    found checking which position in the array has content allows us to figure
    out which of the original regexes / match groups triggered the match.

    The match object itself (the result of `Regex.exec`) is returned but also
    enhanced by merging in any meta-data that was registered with the regex.
    This is how we keep track of which mode matched, and what type of rule
    (`illegal`, `begin`, end, etc).
  */
  class MultiRegex {
    constructor() {
      this.matchIndexes = {};
      this.regexes = [];
      this.matchAt = 1;
      this.position = 0;
    }

    addRule(re, opts) {
      opts.position = this.position++;
      this.matchIndexes[this.matchAt] = opts;
      this.regexes.push([opts, re]);
      this.matchAt += countMatchGroups(re) + 1;
    }

    compile() {
      if (this.regexes.length === 0) {
        // avoids the need to check length every time exec is called
        this.exec = () => null;
      }
      let terminators = this.regexes.map(el => el[1]);
      this.matcherRe = langRe(join(terminators, '|'), true);
      this.lastIndex = 0;
    }

    exec(s) {
      this.matcherRe.lastIndex = this.lastIndex;
      let match = this.matcherRe.exec(s);
      if (!match) { return null; }

      let i = match.findIndex((el, i) => i>0 && el!=undefined);
      let matchData = this.matchIndexes[i];

      return Object.assign(match, matchData);
    }
  }

  /*
    Created to solve the key deficiently with MultiRegex - there is no way to
    test for multiple matches at a single location.  Why would we need to do
    that?  In the future a more dynamic engine will allow certain matches to be
    ignored.  An example: if we matched say the 3rd regex in a large group but
    decided to ignore it - we'd need to started testing again at the 4th
    regex... but MultiRegex itself gives us no real way to do that.

    So what this class creates MultiRegexs on the fly for whatever search
    position they are needed.

    NOTE: These additional MultiRegex objects are created dynamically.  For most
    grammars most of the time we will never actually need anything more than the
    first MultiRegex - so this shouldn't have too much overhead.

    Say this is our search group, and we match regex3, but wish to ignore it.

      regex1 | regex2 | regex3 | regex4 | regex5    ' ie, startAt = 0

    What we need is a new MultiRegex that only includes the remaining
    possibilities:

      regex4 | regex5                               ' ie, startAt = 3

    This class wraps all that complexity up in a simple API... `startAt` decides
    where in the array of expressions to start doing the matching. It
    auto-increments, so if a match is found at position 2, then startAt will be
    set to 3.  If the end is reached startAt will return to 0.

    MOST of the time the parser will be setting startAt manually to 0.
  */
  class ResumableMultiRegex {
    constructor() {
      this.rules = [];
      this.multiRegexes = [];
      this.count = 0;

      this.lastIndex = 0;
      this.regexIndex = 0;
    }

    getMatcher(index) {
      if (this.multiRegexes[index]) return this.multiRegexes[index];

      let matcher = new MultiRegex();
      this.rules.slice(index).forEach(([re, opts])=> matcher.addRule(re,opts));
      matcher.compile();
      this.multiRegexes[index] = matcher;
      return matcher;
    }

    considerAll() {
      this.regexIndex = 0;
    }

    addRule(re, opts) {
      this.rules.push([re, opts]);
      if (opts.type==="begin") this.count++;
    }

    exec(s) {
      let m = this.getMatcher(this.regexIndex);
      m.lastIndex = this.lastIndex;
      let result = m.exec(s);
      if (result) {
        this.regexIndex += result.position + 1;
        if (this.regexIndex === this.count) // wrap-around
          this.regexIndex = 0;
      }

      // this.regexIndex = 0;
      return result;
    }
  }

  function buildModeRegex(mode) {

    let mm = new ResumableMultiRegex();

    mode.contains.forEach(term => mm.addRule(term.begin, {rule: term, type: "begin" }));

    if (mode.terminator_end)
      mm.addRule(mode.terminator_end, {type: "end"} );
    if (mode.illegal)
      mm.addRule(mode.illegal, {type: "illegal"} );

    return mm;
  }

  // TODO: We need negative look-behind support to do this properly
  function skipIfhasPrecedingOrTrailingDot(match) {
    let before = match.input[match.index-1];
    let after = match.input[match.index + match[0].length];
    if (before === "." || after === ".") {
      return {ignoreMatch: true };
    }
  }

  /** skip vs abort vs ignore
   *
   * @skip   - The mode is still entered and exited normally (and contains rules apply),
   *           but all content is held and added to the parent buffer rather than being
   *           output when the mode ends.  Mostly used with `sublanguage` to build up
   *           a single large buffer than can be parsed by sublanguage.
   *
   *             - The mode begin ands ends normally.
   *             - Content matched is added to the parent mode buffer.
   *             - The parser cursor is moved forward normally.
   *
   * @abort  - A hack placeholder until we have ignore.  Aborts the mode (as if it
   *           never matched) but DOES NOT continue to match subsequent `contains`
   *           modes.  Abort is bad/suboptimal because it can result in modes
   *           farther down not getting applied because an earlier rule eats the
   *           content but then aborts.
   *
   *             - The mode does not begin.
   *             - Content matched by `begin` is added to the mode buffer.
   *             - The parser cursor is moved forward accordingly.
   *
   * @ignore - Ignores the mode (as if it never matched) and continues to match any
   *           subsequent `contains` modes.  Ignore isn't technically possible with
   *           the current parser implementation.
   *
   *             - The mode does not begin.
   *             - Content matched by `begin` is ignored.
   *             - The parser cursor is not moved forward.
   */

  function compileMode(mode, parent) {
    if (mode.compiled)
      return;
    mode.compiled = true;

    // __onBegin is considered private API, internal use only
    mode.__onBegin = null;

    mode.keywords = mode.keywords || mode.beginKeywords;
    if (mode.keywords)
      mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);

    mode.lexemesRe = langRe(mode.lexemes || /\w+/, true);

    if (parent) {
      if (mode.beginKeywords) {
        // for languages with keywords that include non-word characters checking for
        // a word boundary is not sufficient, so instead we check for a word boundary
        // or whitespace - this does no harm in any case since our keyword engine
        // doesn't allow spaces in keywords anyways and we still check for the boundary
        // first
        mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')(?=\\b|\\s)';
        mode.__onBegin = skipIfhasPrecedingOrTrailingDot;
      }
      if (!mode.begin)
        mode.begin = /\B|\b/;
      mode.beginRe = langRe(mode.begin);
      if (mode.endSameAsBegin)
        mode.end = mode.begin;
      if (!mode.end && !mode.endsWithParent)
        mode.end = /\B|\b/;
      if (mode.end)
        mode.endRe = langRe(mode.end);
      mode.terminator_end = source(mode.end) || '';
      if (mode.endsWithParent && parent.terminator_end)
        mode.terminator_end += (mode.end ? '|' : '') + parent.terminator_end;
    }
    if (mode.illegal)
      mode.illegalRe = langRe(mode.illegal);
    if (mode.relevance == null)
      mode.relevance = 1;
    if (!mode.contains) {
      mode.contains = [];
    }
    mode.contains = [].concat(...mode.contains.map(function(c) {
      return expand_or_clone_mode(c === 'self' ? mode : c);
    }));
    mode.contains.forEach(function(c) {compileMode(c, mode);});

    if (mode.starts) {
      compileMode(mode.starts, parent);
    }

    mode.matcher = buildModeRegex(mode);
  }

  // self is not valid at the top-level
  if (language.contains && language.contains.includes('self')) {
    throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.")
  }
  compileMode(language);
}

function dependencyOnParent(mode) {
  if (!mode) return false;

  return mode.endsWithParent || dependencyOnParent(mode.starts);
}

function expand_or_clone_mode(mode) {
  if (mode.variants && !mode.cached_variants) {
    mode.cached_variants = mode.variants.map(function(variant) {
      return inherit(mode, {variants: null}, variant);
    });
  }

  // EXPAND
  // if we have variants then essentially "replace" the mode with the variants
  // this happens in compileMode, where this function is called from
  if (mode.cached_variants)
    return mode.cached_variants;

  // CLONE
  // if we have dependencies on parents then we need a unique
  // instance of ourselves, so we can be reused with many
  // different parents without issue
  if (dependencyOnParent(mode))
    return inherit(mode, { starts: mode.starts ? inherit(mode.starts) : null });

  if (Object.isFrozen(mode))
    return inherit(mode);

  // no special dependency issues, just return ourselves
  return mode;
}


// keywords

function compileKeywords(rawKeywords, case_insensitive) {
  var compiled_keywords = {};

  if (typeof rawKeywords === 'string') { // string
    splitAndCompile('keyword', rawKeywords);
  } else {
    Object.keys(rawKeywords).forEach(function (className) {
      splitAndCompile(className, rawKeywords[className]);
    });
  }
return compiled_keywords;

// ---

function splitAndCompile(className, str) {
  if (case_insensitive) {
    str = str.toLowerCase();
  }
  str.split(' ').forEach(function(keyword) {
    var pair = keyword.split('|');
    compiled_keywords[pair[0]] = [className, scoreForKeyword(pair[0], pair[1])];
  });
}
}

function scoreForKeyword(keyword, providedScore) {
// manual scores always win over common keywords
// so you can force a score of 1 if you really insist
if (providedScore)
  return Number(providedScore);

return commonKeyword(keyword) ? 0 : 1;
}

function commonKeyword(word) {
return COMMON_KEYWORDS.includes(word.toLowerCase());
}

var version = "10.0.1";

/*
Syntax highlighting with language autodetection.
https://highlightjs.org/
*/

const escape$1 = escapeHTML;
const inherit$1 = inherit;

const { nodeStream: nodeStream$1, mergeStreams: mergeStreams$1 } = utils;


const HLJS = function(hljs) {

  // Convenience variables for build-in objects
  var ArrayProto = [];

  // Global internal variables used within the highlight.js library.
  var languages = {},
      aliases   = {},
      plugins   = [];

  // safe/production mode - swallows more errors, tries to keep running
  // even if a single syntax or parse hits a fatal error
  var SAFE_MODE = true;

  // Regular expressions used throughout the highlight.js library.
  var fixMarkupRe      = /((^(<[^>]+>|\t|)+|(?:\n)))/gm;

  var LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";

  // Global options used when within external APIs. This is modified when
  // calling the `hljs.configure` function.
  var options = {
    noHighlightRe: /^(no-?highlight)$/i,
    languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
    classPrefix: 'hljs-',
    tabReplace: null,
    useBR: false,
    languages: undefined,
    // beta configuration options, subject to change, welcome to discuss
    // https://github.com/highlightjs/highlight.js/issues/1086
    __emitter: TokenTreeEmitter
  };

  /* Utility functions */

  function shouldNotHighlight(language) {
    return options.noHighlightRe.test(language);
  }

  function blockLanguage(block) {
    var match;
    var classes = block.className + ' ';

    classes += block.parentNode ? block.parentNode.className : '';

    // language-* takes precedence over non-prefixed class names.
    match = options.languageDetectRe.exec(classes);
    if (match) {
      var language = getLanguage(match[1]);
      if (!language) {
        console.warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
        console.warn("Falling back to no-highlight mode for this block.", block);
      }
      return language ? match[1] : 'no-highlight';
    }

    return classes
      .split(/\s+/)
      .find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
  }

  /**
   * Core highlighting function.
   *
   * @param {string} languageName - the language to use for highlighting
   * @param {string} code - the code to highlight
   * @param {boolean} ignore_illegals - whether to ignore illegal matches, default is to bail
   * @param {array<mode>} continuation - array of continuation modes
   *
   * @returns an object that represents the result
   * @property {string} language - the language name
   * @property {number} relevance - the relevance score
   * @property {string} value - the highlighted HTML code
   * @property {string} code - the original raw code
   * @property {mode} top - top of the current mode stack
   * @property {boolean} illegal - indicates whether any illegal matches were found
  */
  function highlight(languageName, code, ignore_illegals, continuation) {
    var context = {
      code,
      language: languageName
    };
    // the plugin can change the desired language or the code to be highlighted
    // just be changing the object it was passed
    fire("before:highlight", context);

    // a before plugin can usurp the result completely by providing it's own
    // in which case we don't even need to call highlight
    var result = context.result ?
      context.result :
      _highlight(context.language, context.code, ignore_illegals, continuation);

    result.code = context.code;
    // the plugin can change anything in result to suite it
    fire("after:highlight", result);

    return result;
  }

  // private highlight that's used internally and does not fire callbacks
  function _highlight(languageName, code, ignore_illegals, continuation) {
    var codeToHighlight = code;

    function endOfMode(mode, lexeme) {
      if (startsWith(mode.endRe, lexeme)) {
        while (mode.endsParent && mode.parent) {
          mode = mode.parent;
        }
        return mode;
      }
      if (mode.endsWithParent) {
        return endOfMode(mode.parent, lexeme);
      }
    }

    function keywordMatch(mode, match) {
      var match_str = language.case_insensitive ? match[0].toLowerCase() : match[0];
      return mode.keywords.hasOwnProperty(match_str) && mode.keywords[match_str];
    }

    function processKeywords() {
      var keyword_match, last_index, match, buf;

      if (!top.keywords) {
        emitter.addText(mode_buffer);
        return;
      }

      last_index = 0;
      top.lexemesRe.lastIndex = 0;
      match = top.lexemesRe.exec(mode_buffer);
      buf = "";

      while (match) {
        buf += mode_buffer.substring(last_index, match.index);
        keyword_match = keywordMatch(top, match);
        var kind = null;
        if (keyword_match) {
          emitter.addText(buf);
          buf = "";

          relevance += keyword_match[1];
          kind = keyword_match[0];
          emitter.addKeyword(match[0], kind);
        } else {
          buf += match[0];
        }
        last_index = top.lexemesRe.lastIndex;
        match = top.lexemesRe.exec(mode_buffer);
      }
      buf += mode_buffer.substr(last_index);
      emitter.addText(buf);
    }

    function processSubLanguage() {
      if (mode_buffer === "") return;

      var explicit = typeof top.subLanguage === 'string';

      if (explicit && !languages[top.subLanguage]) {
        emitter.addText(mode_buffer);
        return;
      }

      var result = explicit ?
                   _highlight(top.subLanguage, mode_buffer, true, continuations[top.subLanguage]) :
                   highlightAuto(mode_buffer, top.subLanguage.length ? top.subLanguage : undefined);

      // Counting embedded language score towards the host language may be disabled
      // with zeroing the containing mode relevance. Use case in point is Markdown that
      // allows XML everywhere and makes every XML snippet to have a much larger Markdown
      // score.
      if (top.relevance > 0) {
        relevance += result.relevance;
      }
      if (explicit) {
        continuations[top.subLanguage] = result.top;
      }
      emitter.addSublanguage(result.emitter, result.language);
    }

    function processBuffer() {
      if (top.subLanguage != null)
        processSubLanguage();
      else
        processKeywords();
      mode_buffer = '';
    }

    function startNewMode(mode) {
      if (mode.className) {
        emitter.openNode(mode.className);
      }
      top = Object.create(mode, {parent: {value: top}});
    }

    function doIgnore(lexeme) {
      if (top.matcher.regexIndex === 0) {
        // no more regexs to potentially match here, so we move the cursor forward one
        // space
        mode_buffer += lexeme[0];
        return 1;
      } else {
        // no need to move the cursor, we still have additional regexes to try and
        // match at this very spot
        continueScanAtSamePosition = true;
        return 0;
      }
    }

    function doBeginMatch(match) {
      var lexeme = match[0];
      var new_mode = match.rule;

      if (new_mode.__onBegin) {
        let res = new_mode.__onBegin(match) || {};
        if (res.ignoreMatch)
          return doIgnore(lexeme);
      }

      if (new_mode && new_mode.endSameAsBegin) {
        new_mode.endRe = escape( lexeme );
      }

      if (new_mode.skip) {
        mode_buffer += lexeme;
      } else {
        if (new_mode.excludeBegin) {
          mode_buffer += lexeme;
        }
        processBuffer();
        if (!new_mode.returnBegin && !new_mode.excludeBegin) {
          mode_buffer = lexeme;
        }
      }
      startNewMode(new_mode);
      return new_mode.returnBegin ? 0 : lexeme.length;
    }

    function doEndMatch(match) {
      var lexeme = match[0];
      var matchPlusRemainder = codeToHighlight.substr(match.index);
      var end_mode = endOfMode(top, matchPlusRemainder);
      if (!end_mode) { return; }

      var origin = top;
      if (origin.skip) {
        mode_buffer += lexeme;
      } else {
        if (!(origin.returnEnd || origin.excludeEnd)) {
          mode_buffer += lexeme;
        }
        processBuffer();
        if (origin.excludeEnd) {
          mode_buffer = lexeme;
        }
      }
      do {
        if (top.className) {
          emitter.closeNode();
        }
        if (!top.skip && !top.subLanguage) {
          relevance += top.relevance;
        }
        top = top.parent;
      } while (top !== end_mode.parent);
      if (end_mode.starts) {
        if (end_mode.endSameAsBegin) {
          end_mode.starts.endRe = end_mode.endRe;
        }
        startNewMode(end_mode.starts);
      }
      return origin.returnEnd ? 0 : lexeme.length;
    }

    function processContinuations() {
      var list = [];
      for(var current = top; current !== language; current = current.parent) {
        if (current.className) {
          list.unshift(current.className);
        }
      }
      list.forEach(item => emitter.openNode(item));
    }

    var lastMatch = {};
    function processLexeme(text_before_match, match) {

      var err;
      var lexeme = match && match[0];

      // add non-matched text to the current mode buffer
      mode_buffer += text_before_match;

      if (lexeme == null) {
        processBuffer();
        return 0;
      }



      // we've found a 0 width match and we're stuck, so we need to advance
      // this happens when we have badly behaved rules that have optional matchers to the degree that
      // sometimes they can end up matching nothing at all
      // Ref: https://github.com/highlightjs/highlight.js/issues/2140
      if (lastMatch.type=="begin" && match.type=="end" && lastMatch.index == match.index && lexeme === "") {
        // spit the "skipped" character that our regex choked on back into the output sequence
        mode_buffer += codeToHighlight.slice(match.index, match.index + 1);
        if (!SAFE_MODE) {
          err = new Error('0 width match regex');
          err.languageName = languageName;
          err.badRule = lastMatch.rule;
          throw(err);
        }
        return 1;
      }
      lastMatch = match;

      if (match.type==="begin") {
        return doBeginMatch(match);
      } else if (match.type==="illegal" && !ignore_illegals) {
        // illegal match, we do not continue processing
        err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.className || '<unnamed>') + '"');
        err.mode = top;
        throw err;
      } else if (match.type==="end") {
        var processed = doEndMatch(match);
        if (processed != undefined)
          return processed;
      }

      /*
      Why might be find ourselves here?  Only one occasion now.  An end match that was
      triggered but could not be completed.  When might this happen?  When an `endSameasBegin`
      rule sets the end rule to a specific match.  Since the overall mode termination rule that's
      being used to scan the text isn't recompiled that means that any match that LOOKS like
      the end (but is not, because it is not an exact match to the beginning) will
      end up here.  A definite end match, but when `doEndMatch` tries to "reapply"
      the end rule and fails to match, we wind up here, and just silently ignore the end.

      This causes no real harm other than stopping a few times too many.
      */

      mode_buffer += lexeme;
      return lexeme.length;
    }

    var language = getLanguage(languageName);
    if (!language) {
      console.error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
      throw new Error('Unknown language: "' + languageName + '"');
    }

    compileLanguage(language);
    var top = continuation || language;
    var continuations = {}; // keep continuations for sub-languages
    var result;
    var emitter = new options.__emitter(options);
    processContinuations();
    var mode_buffer = '';
    var relevance = 0;
    var match, processedCount, index = 0;

    try {
      var continueScanAtSamePosition = false;
      top.matcher.considerAll();

      while (true) {
        if (continueScanAtSamePosition) {
          continueScanAtSamePosition = false;
          // only regexes not matched previously will now be
          // considered for a potential match
        } else {
          top.matcher.lastIndex = index;
          top.matcher.considerAll();
        }
        match = top.matcher.exec(codeToHighlight);
        // console.log("match", match[0], match.rule && match.rule.begin)
        if (!match)
          break;
        let beforeMatch = codeToHighlight.substring(index, match.index);
        processedCount = processLexeme(beforeMatch, match);
        index = match.index + processedCount;
      }
      processLexeme(codeToHighlight.substr(index));
      emitter.closeAllNodes();
      emitter.finalize();
      result = emitter.toHTML();

      return {
        relevance: relevance,
        value: result,
        language: languageName,
        illegal: false,
        emitter: emitter,
        top: top
      };
    } catch (err) {
      if (err.message && err.message.includes('Illegal')) {
        return {
          illegal: true,
          illegalBy: {
            msg: err.message,
            context: codeToHighlight.slice(index-100,index+100),
            mode: err.mode
          },
          sofar: result,
          relevance: 0,
          value: escape$1(codeToHighlight),
          emitter: emitter,
        };
      } else if (SAFE_MODE) {
        return {
          relevance: 0,
          value: escape$1(codeToHighlight),
          emitter: emitter,
          language: languageName,
          top: top,
          errorRaised: err
        };
      } else {
        throw err;
      }
    }
  }

  // returns a valid highlight result, without actually
  // doing any actual work, auto highlight starts with
  // this and it's possible for small snippets that
  // auto-detection may not find a better match
  function justTextHighlightResult(code) {
    const result = {
      relevance: 0,
      emitter: new options.__emitter(options),
      value: escape$1(code),
      illegal: false,
      top: PLAINTEXT_LANGUAGE
    };
    result.emitter.addText(code);
    return result;
  }

  /*
  Highlighting with language detection. Accepts a string with the code to
  highlight. Returns an object with the following properties:

  - language (detected language)
  - relevance (int)
  - value (an HTML string with highlighting markup)
  - second_best (object with the same structure for second-best heuristically
    detected language, may be absent)

  */
  function highlightAuto(code, languageSubset) {
    languageSubset = languageSubset || options.languages || Object.keys(languages);
    var result = justTextHighlightResult(code);
    var second_best = result;
    languageSubset.filter(getLanguage).filter(autoDetection).forEach(function(name) {
      var current = _highlight(name, code, false);
      current.language = name;
      if (current.relevance > second_best.relevance) {
        second_best = current;
      }
      if (current.relevance > result.relevance) {
        second_best = result;
        result = current;
      }
    });
    if (second_best.language) {
      result.second_best = second_best;
    }
    return result;
  }

  /*
  Post-processing of the highlighted markup:

  - replace TABs with something more useful
  - replace real line-breaks with '<br>' for non-pre containers

  */
  function fixMarkup(value) {
    if (!(options.tabReplace || options.useBR)) {
      return value;
    }

    return value.replace(fixMarkupRe, function(match, p1) {
        if (options.useBR && match === '\n') {
          return '<br>';
        } else if (options.tabReplace) {
          return p1.replace(/\t/g, options.tabReplace);
        }
        return '';
    });
  }

  function buildClassName(prevClassName, currentLang, resultLang) {
    var language = currentLang ? aliases[currentLang] : resultLang,
        result   = [prevClassName.trim()];

    if (!prevClassName.match(/\bhljs\b/)) {
      result.push('hljs');
    }

    if (!prevClassName.includes(language)) {
      result.push(language);
    }

    return result.join(' ').trim();
  }

  /*
  Applies highlighting to a DOM node containing code. Accepts a DOM node and
  two optional parameters for fixMarkup.
  */
  function highlightBlock(block) {
    var node, originalStream, result, resultNode, text;
    var language = blockLanguage(block);

    if (shouldNotHighlight(language))
        return;

    fire("before:highlightBlock",
      { block: block, language: language});

    if (options.useBR) {
      node = document.createElement('div');
      node.innerHTML = block.innerHTML.replace(/\n/g, '').replace(/<br[ \/]*>/g, '\n');
    } else {
      node = block;
    }
    text = node.textContent;
    result = language ? highlight(language, text, true) : highlightAuto(text);

    originalStream = nodeStream$1(node);
    if (originalStream.length) {
      resultNode = document.createElement('div');
      resultNode.innerHTML = result.value;
      result.value = mergeStreams$1(originalStream, nodeStream$1(resultNode), text);
    }
    result.value = fixMarkup(result.value);

    fire("after:highlightBlock", { block: block, result: result});

    block.innerHTML = result.value;
    block.className = buildClassName(block.className, language, result.language);
    block.result = {
      language: result.language,
      re: result.relevance
    };
    if (result.second_best) {
      block.second_best = {
        language: result.second_best.language,
        re: result.second_best.relevance
      };
    }
  }

  /*
  Updates highlight.js global options with values passed in the form of an object.
  */
  function configure(user_options) {
    options = inherit$1(options, user_options);
  }

  /*
  Applies highlighting to all <pre><code>..</code></pre> blocks on a page.
  */
  function initHighlighting() {
    if (initHighlighting.called)
      return;
    initHighlighting.called = true;

    var blocks = document.querySelectorAll('pre code');
    ArrayProto.forEach.call(blocks, highlightBlock);
  }

  /*
  Attaches highlighting to the page load event.
  */
  function initHighlightingOnLoad() {
    window.addEventListener('DOMContentLoaded', initHighlighting, false);
  }

  const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: 'Plain text' };

  function registerLanguage(name, language) {
    var lang;
    try { lang = language(hljs); }
    catch (error) {
      console.error("Language definition for '{}' could not be registered.".replace("{}", name));
      // hard or soft error
      if (!SAFE_MODE) { throw error; } else { console.error(error); }
      // languages that have serious errors are replaced with essentially a
      // "plaintext" stand-in so that the code blocks will still get normal
      // css classes applied to them - and one bad language won't break the
      // entire highlighter
      lang = PLAINTEXT_LANGUAGE;
    }
    // give it a temporary name if it doesn't have one in the meta-data
    if (!lang.name)
      lang.name = name;
    languages[name] = lang;
    lang.rawDefinition = language.bind(null,hljs);

    if (lang.aliases) {
      lang.aliases.forEach(function(alias) {aliases[alias] = name;});
    }
  }

  function listLanguages() {
    return Object.keys(languages);
  }

  /*
    intended usage: When one language truly requires another

    Unlike `getLanguage`, this will throw when the requested language
    is not available.
  */
  function requireLanguage(name) {
    var lang = getLanguage(name);
    if (lang) { return lang; }

    var err = new Error('The \'{}\' language is required, but not loaded.'.replace('{}',name));
    throw err;
  }

  function getLanguage(name) {
    name = (name || '').toLowerCase();
    return languages[name] || languages[aliases[name]];
  }

  function autoDetection(name) {
    var lang = getLanguage(name);
    return lang && !lang.disableAutodetect;
  }

  function addPlugin(plugin, options) {
    plugins.push(plugin);
  }

  function fire(event, args) {
    var cb = event;
    plugins.forEach(function (plugin) {
      if (plugin[cb]) {
        plugin[cb](args);
      }
    });
  }

  /* Interface definition */

  Object.assign(hljs,{
    highlight,
    highlightAuto,
    fixMarkup,
    highlightBlock,
    configure,
    initHighlighting,
    initHighlightingOnLoad,
    registerLanguage,
    listLanguages,
    getLanguage,
    requireLanguage,
    autoDetection,
    inherit: inherit$1,
    addPlugin
  });

  hljs.debugMode = function() { SAFE_MODE = false; };
  hljs.safeMode = function() { SAFE_MODE = true; };
  hljs.versionString = version;

  for (const key in MODES) {
    if (typeof MODES[key] === "object")
      deepFreeze(MODES[key]);
  }

  // merge all the modes/regexs into our main object
  Object.assign(hljs, MODES);

  return hljs;
};

// export an "instance" of the highlighter
var highlight = HLJS({});

var core = highlight;

/*
Language: JavaScript
Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
Category: common, scripting
Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
*/

function javascript(hljs) {
  var FRAGMENT = {
    begin: '<>',
    end: '</>'
  };
  var XML_TAG = {
    begin: /<[A-Za-z0-9\\._:-]+/,
    end: /\/[A-Za-z0-9\\._:-]+>|\/>/
  };
  var IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
  var KEYWORDS = {
    keyword:
      'in of if for while finally var new function do return void else break catch ' +
      'instanceof with throw case default try this switch continue typeof delete ' +
      'let yield const export super debugger as async await static ' +
      // ECMAScript 6 modules import
      'import from as'
    ,
    literal:
      'true false null undefined NaN Infinity',
    built_in:
      'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent ' +
      'encodeURI encodeURIComponent escape unescape Object Function Boolean Error ' +
      'EvalError InternalError RangeError ReferenceError StopIteration SyntaxError ' +
      'TypeError URIError Number Math Date String RegExp Array Float32Array ' +
      'Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array ' +
      'Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require ' +
      'module console window document Symbol Set Map WeakSet WeakMap Proxy Reflect ' +
      'Promise'
  };
  var NUMBER = {
    className: 'number',
    variants: [
      { begin: '\\b(0[bB][01]+)n?' },
      { begin: '\\b(0[oO][0-7]+)n?' },
      { begin: hljs.C_NUMBER_RE + 'n?' }
    ],
    relevance: 0
  };
  var SUBST = {
    className: 'subst',
    begin: '\\$\\{', end: '\\}',
    keywords: KEYWORDS,
    contains: []  // defined later
  };
  var HTML_TEMPLATE = {
    begin: 'html`', end: '',
    starts: {
      end: '`', returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: 'xml',
    }
  };
  var CSS_TEMPLATE = {
    begin: 'css`', end: '',
    starts: {
      end: '`', returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: 'css',
    }
  };
  var TEMPLATE_STRING = {
    className: 'string',
    begin: '`', end: '`',
    contains: [
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  SUBST.contains = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    HTML_TEMPLATE,
    CSS_TEMPLATE,
    TEMPLATE_STRING,
    NUMBER,
    hljs.REGEXP_MODE
  ];
  var PARAMS_CONTAINS = SUBST.contains.concat([
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.C_LINE_COMMENT_MODE
  ]);
  var PARAMS = {
    className: 'params',
    begin: /\(/, end: /\)/,
    excludeBegin: true,
    excludeEnd: true,
    contains: PARAMS_CONTAINS
  };

  return {
    name: 'JavaScript',
    aliases: ['js', 'jsx', 'mjs', 'cjs'],
    keywords: KEYWORDS,
    contains: [
      {
        className: 'meta',
        relevance: 10,
        begin: /^\s*['"]use (strict|asm)['"]/
      },
      {
        className: 'meta',
        begin: /^#!/, end: /$/
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      TEMPLATE_STRING,
      hljs.C_LINE_COMMENT_MODE,
      hljs.COMMENT(
        '/\\*\\*',
        '\\*/',
        {
          relevance : 0,
          contains : [
            {
              className : 'doctag',
              begin : '@[A-Za-z]+',
              contains : [
                {
                  className: 'type',
                  begin: '\\{',
                  end: '\\}',
                  relevance: 0
                },
                {
                  className: 'variable',
                  begin: IDENT_RE + '(?=\\s*(-)|$)',
                  endsParent: true,
                  relevance: 0
                },
                // eat spaces (not newlines) so we can find
                // types or variables
                {
                  begin: /(?=[^\n])\s/,
                  relevance: 0
                },
              ]
            }
          ]
        }
      ),
      hljs.C_BLOCK_COMMENT_MODE,
      NUMBER,
      { // object attr container
        begin: /[{,\n]\s*/, relevance: 0,
        contains: [
          {
            begin: IDENT_RE + '\\s*:', returnBegin: true,
            relevance: 0,
            contains: [{className: 'attr', begin: IDENT_RE, relevance: 0}]
          }
        ]
      },
      { // "value" container
        begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
        keywords: 'return throw case',
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.REGEXP_MODE,
          {
            className: 'function',
            begin: '(\\(.*?\\)|' + IDENT_RE + ')\\s*=>', returnBegin: true,
            end: '\\s*=>',
            contains: [
              {
                className: 'params',
                variants: [
                  {
                    begin: IDENT_RE
                  },
                  {
                    begin: /\(\s*\)/,
                  },
                  {
                    begin: /\(/, end: /\)/,
                    excludeBegin: true, excludeEnd: true,
                    keywords: KEYWORDS,
                    contains: PARAMS_CONTAINS
                  }
                ]
              }
            ]
          },
          { // could be a comma delimited list of params to a function call
            begin: /,/, relevance: 0,
          },
          {
            className: '',
            begin: /\s/,
            end: /\s*/,
            skip: true,
          },
          { // JSX
            variants: [
              { begin: FRAGMENT.begin, end: FRAGMENT.end },
              { begin: XML_TAG.begin, end: XML_TAG.end }
            ],
            subLanguage: 'xml',
            contains: [
              {
                begin: XML_TAG.begin, end: XML_TAG.end, skip: true,
                contains: ['self']
              }
            ]
          },
        ],
        relevance: 0
      },
      {
        className: 'function',
        beginKeywords: 'function', end: /\{/, excludeEnd: true,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {begin: IDENT_RE}),
          PARAMS
        ],
        illegal: /\[|%/
      },
      {
        begin: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      },

      hljs.METHOD_GUARD,
      { // ES6 class
        className: 'class',
        beginKeywords: 'class', end: /[{;=]/, excludeEnd: true,
        illegal: /[:"\[\]]/,
        contains: [
          {beginKeywords: 'extends'},
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      {
        beginKeywords: 'constructor', end: /\{/, excludeEnd: true
      },
      {
        begin:'(get|set)\\s*(?=' + IDENT_RE+ '\\()',
        end: /{/,
        keywords: "get set",
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {begin: IDENT_RE}),
          { begin: /\(\)/ }, // eat to avoid empty params
          PARAMS
        ]

      }
    ],
    illegal: /#(?!!)/
  };
}

var javascript_1 = javascript;

/*
Language: Bash
Author: vah <vahtenberg@gmail.com>
Contributrors: Benjamin Pannell <contact@sierrasoftworks.com>
Website: https://www.gnu.org/software/bash/
Category: common
*/

function bash(hljs) {
  const VAR = {};
  const BRACED_VAR = {
    begin: /\$\{/, end:/\}/,
    contains: [
      { begin: /:-/, contains: [VAR] } // default values
    ]
  };
  Object.assign(VAR,{
    className: 'variable',
    variants: [
      {begin: /\$[\w\d#@][\w\d_]*/},
      BRACED_VAR
    ]
  });

  const SUBST = {
    className: 'subst',
    begin: /\$\(/, end: /\)/,
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  const QUOTE_STRING = {
    className: 'string',
    begin: /"/, end: /"/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      VAR,
      SUBST
    ]
  };
  SUBST.contains.push(QUOTE_STRING);
  const ESCAPED_QUOTE = {
    className: '',
    begin: /\\"/

  };
  const APOS_STRING = {
    className: 'string',
    begin: /'/, end: /'/
  };
  const ARITHMETIC = {
    begin: /\$\(\(/,
    end: /\)\)/,
    contains: [
      { begin: /\d+#[0-9a-f]+/, className: "number" },
      hljs.NUMBER_MODE,
      VAR
    ]
  };
  const SHEBANG = {
    className: 'meta',
    begin: /^#![^\n]+sh\s*$/,
    relevance: 10
  };
  const FUNCTION = {
    className: 'function',
    begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
    returnBegin: true,
    contains: [hljs.inherit(hljs.TITLE_MODE, {begin: /\w[\w\d_]*/})],
    relevance: 0
  };

  return {
    name: 'Bash',
    aliases: ['sh', 'zsh'],
    lexemes: /\b-?[a-z\._]+\b/,
    keywords: {
      keyword:
        'if then else elif fi for while in do done case esac function',
      literal:
        'true false',
      built_in:
        // Shell built-ins
        // http://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
        'break cd continue eval exec exit export getopts hash pwd readonly return shift test times ' +
        'trap umask unset ' +
        // Bash built-ins
        'alias bind builtin caller command declare echo enable help let local logout mapfile printf ' +
        'read readarray source type typeset ulimit unalias ' +
        // Shell modifiers
        'set shopt ' +
        // Zsh built-ins
        'autoload bg bindkey bye cap chdir clone comparguments compcall compctl compdescribe compfiles ' +
        'compgroups compquote comptags comptry compvalues dirs disable disown echotc echoti emulate ' +
        'fc fg float functions getcap getln history integer jobs kill limit log noglob popd print ' +
        'pushd pushln rehash sched setcap setopt stat suspend ttyctl unfunction unhash unlimit ' +
        'unsetopt vared wait whence where which zcompile zformat zftp zle zmodload zparseopts zprof ' +
        'zpty zregexparse zsocket zstyle ztcp',
      _:
        '-ne -eq -lt -gt -f -d -e -s -l -a' // relevance booster
    },
    contains: [
      SHEBANG,
      FUNCTION,
      ARITHMETIC,
      hljs.HASH_COMMENT_MODE,
      QUOTE_STRING,
      ESCAPED_QUOTE,
      APOS_STRING,
      VAR
    ]
  };
}

var bash_1 = bash;

/*
 Language: SQL
 Contributors: Nikolay Lisienko <info@neor.ru>, Heiko August <post@auge8472.de>, Travis Odom <travis.a.odom@gmail.com>, Vadimtro <vadimtro@yahoo.com>, Benjamin Auder <benjamin.auder@gmail.com>
 Website: https://en.wikipedia.org/wiki/SQL
 Category: common
 */

function sql(hljs) {
  var COMMENT_MODE = hljs.COMMENT('--', '$');
  return {
    name: 'SQL',
    case_insensitive: true,
    illegal: /[<>{}*]/,
    contains: [
      {
        beginKeywords:
          'begin end start commit rollback savepoint lock alter create drop rename call ' +
          'delete do handler insert load replace select truncate update set show pragma grant ' +
          'merge describe use explain help declare prepare execute deallocate release ' +
          'unlock purge reset change stop analyze cache flush optimize repair kill ' +
          'install uninstall checksum restore check backup revoke comment values with',
        end: /;/, endsWithParent: true,
        lexemes: /[\w\.]+/,
        keywords: {
          keyword:
            'as abort abs absolute acc acce accep accept access accessed accessible account acos action activate add ' +
            'addtime admin administer advanced advise aes_decrypt aes_encrypt after agent aggregate ali alia alias ' +
            'all allocate allow alter always analyze ancillary and anti any anydata anydataset anyschema anytype apply ' +
            'archive archived archivelog are as asc ascii asin assembly assertion associate asynchronous at atan ' +
            'atn2 attr attri attrib attribu attribut attribute attributes audit authenticated authentication authid ' +
            'authors auto autoallocate autodblink autoextend automatic availability avg backup badfile basicfile ' +
            'before begin beginning benchmark between bfile bfile_base big bigfile bin binary_double binary_float ' +
            'binlog bit_and bit_count bit_length bit_or bit_xor bitmap blob_base block blocksize body both bound ' +
            'bucket buffer_cache buffer_pool build bulk by byte byteordermark bytes cache caching call calling cancel ' +
            'capacity cascade cascaded case cast catalog category ceil ceiling chain change changed char_base ' +
            'char_length character_length characters characterset charindex charset charsetform charsetid check ' +
            'checksum checksum_agg child choose chr chunk class cleanup clear client clob clob_base clone close ' +
            'cluster_id cluster_probability cluster_set clustering coalesce coercibility col collate collation ' +
            'collect colu colum column column_value columns columns_updated comment commit compact compatibility ' +
            'compiled complete composite_limit compound compress compute concat concat_ws concurrent confirm conn ' +
            'connec connect connect_by_iscycle connect_by_isleaf connect_by_root connect_time connection ' +
            'consider consistent constant constraint constraints constructor container content contents context ' +
            'contributors controlfile conv convert convert_tz corr corr_k corr_s corresponding corruption cos cost ' +
            'count count_big counted covar_pop covar_samp cpu_per_call cpu_per_session crc32 create creation ' +
            'critical cross cube cume_dist curdate current current_date current_time current_timestamp current_user ' +
            'cursor curtime customdatum cycle data database databases datafile datafiles datalength date_add ' +
            'date_cache date_format date_sub dateadd datediff datefromparts datename datepart datetime2fromparts ' +
            'day day_to_second dayname dayofmonth dayofweek dayofyear days db_role_change dbtimezone ddl deallocate ' +
            'declare decode decompose decrement decrypt deduplicate def defa defau defaul default defaults ' +
            'deferred defi defin define degrees delayed delegate delete delete_all delimited demand dense_rank ' +
            'depth dequeue des_decrypt des_encrypt des_key_file desc descr descri describ describe descriptor ' +
            'deterministic diagnostics difference dimension direct_load directory disable disable_all ' +
            'disallow disassociate discardfile disconnect diskgroup distinct distinctrow distribute distributed div ' +
            'do document domain dotnet double downgrade drop dumpfile duplicate duration each edition editionable ' +
            'editions element ellipsis else elsif elt empty enable enable_all enclosed encode encoding encrypt ' +
            'end end-exec endian enforced engine engines enqueue enterprise entityescaping eomonth error errors ' +
            'escaped evalname evaluate event eventdata events except exception exceptions exchange exclude excluding ' +
            'execu execut execute exempt exists exit exp expire explain explode export export_set extended extent external ' +
            'external_1 external_2 externally extract failed failed_login_attempts failover failure far fast ' +
            'feature_set feature_value fetch field fields file file_name_convert filesystem_like_logging final ' +
            'finish first first_value fixed flash_cache flashback floor flush following follows for forall force foreign ' +
            'form forma format found found_rows freelist freelists freepools fresh from from_base64 from_days ' +
            'ftp full function general generated get get_format get_lock getdate getutcdate global global_name ' +
            'globally go goto grant grants greatest group group_concat group_id grouping grouping_id groups ' +
            'gtid_subtract guarantee guard handler hash hashkeys having hea head headi headin heading heap help hex ' +
            'hierarchy high high_priority hosts hour hours http id ident_current ident_incr ident_seed identified ' +
            'identity idle_time if ifnull ignore iif ilike ilm immediate import in include including increment ' +
            'index indexes indexing indextype indicator indices inet6_aton inet6_ntoa inet_aton inet_ntoa infile ' +
            'initial initialized initially initrans inmemory inner innodb input insert install instance instantiable ' +
            'instr interface interleaved intersect into invalidate invisible is is_free_lock is_ipv4 is_ipv4_compat ' +
            'is_not is_not_null is_used_lock isdate isnull isolation iterate java join json json_exists ' +
            'keep keep_duplicates key keys kill language large last last_day last_insert_id last_value lateral lax lcase ' +
            'lead leading least leaves left len lenght length less level levels library like like2 like4 likec limit ' +
            'lines link list listagg little ln load load_file lob lobs local localtime localtimestamp locate ' +
            'locator lock locked log log10 log2 logfile logfiles logging logical logical_reads_per_call ' +
            'logoff logon logs long loop low low_priority lower lpad lrtrim ltrim main make_set makedate maketime ' +
            'managed management manual map mapping mask master master_pos_wait match matched materialized max ' +
            'maxextents maximize maxinstances maxlen maxlogfiles maxloghistory maxlogmembers maxsize maxtrans ' +
            'md5 measures median medium member memcompress memory merge microsecond mid migration min minextents ' +
            'minimum mining minus minute minutes minvalue missing mod mode model modification modify module monitoring month ' +
            'months mount move movement multiset mutex name name_const names nan national native natural nav nchar ' +
            'nclob nested never new newline next nextval no no_write_to_binlog noarchivelog noaudit nobadfile ' +
            'nocheck nocompress nocopy nocycle nodelay nodiscardfile noentityescaping noguarantee nokeep nologfile ' +
            'nomapping nomaxvalue nominimize nominvalue nomonitoring none noneditionable nonschema noorder ' +
            'nopr nopro noprom nopromp noprompt norely noresetlogs noreverse normal norowdependencies noschemacheck ' +
            'noswitch not nothing notice notnull notrim novalidate now nowait nth_value nullif nulls num numb numbe ' +
            'nvarchar nvarchar2 object ocicoll ocidate ocidatetime ociduration ociinterval ociloblocator ocinumber ' +
            'ociref ocirefcursor ocirowid ocistring ocitype oct octet_length of off offline offset oid oidindex old ' +
            'on online only opaque open operations operator optimal optimize option optionally or oracle oracle_date ' +
            'oradata ord ordaudio orddicom orddoc order ordimage ordinality ordvideo organization orlany orlvary ' +
            'out outer outfile outline output over overflow overriding package pad parallel parallel_enable ' +
            'parameters parent parse partial partition partitions pascal passing password password_grace_time ' +
            'password_lock_time password_reuse_max password_reuse_time password_verify_function patch path patindex ' +
            'pctincrease pctthreshold pctused pctversion percent percent_rank percentile_cont percentile_disc ' +
            'performance period period_add period_diff permanent physical pi pipe pipelined pivot pluggable plugin ' +
            'policy position post_transaction pow power pragma prebuilt precedes preceding precision prediction ' +
            'prediction_cost prediction_details prediction_probability prediction_set prepare present preserve ' +
            'prior priority private private_sga privileges procedural procedure procedure_analyze processlist ' +
            'profiles project prompt protection public publishingservername purge quarter query quick quiesce quota ' +
            'quotename radians raise rand range rank raw read reads readsize rebuild record records ' +
            'recover recovery recursive recycle redo reduced ref reference referenced references referencing refresh ' +
            'regexp_like register regr_avgx regr_avgy regr_count regr_intercept regr_r2 regr_slope regr_sxx regr_sxy ' +
            'reject rekey relational relative relaylog release release_lock relies_on relocate rely rem remainder rename ' +
            'repair repeat replace replicate replication required reset resetlogs resize resource respect restore ' +
            'restricted result result_cache resumable resume retention return returning returns reuse reverse revoke ' +
            'right rlike role roles rollback rolling rollup round row row_count rowdependencies rowid rownum rows ' +
            'rtrim rules safe salt sample save savepoint sb1 sb2 sb4 scan schema schemacheck scn scope scroll ' +
            'sdo_georaster sdo_topo_geometry search sec_to_time second seconds section securefile security seed segment select ' +
            'self semi sequence sequential serializable server servererror session session_user sessions_per_user set ' +
            'sets settings sha sha1 sha2 share shared shared_pool short show shrink shutdown si_averagecolor ' +
            'si_colorhistogram si_featurelist si_positionalcolor si_stillimage si_texture siblings sid sign sin ' +
            'size size_t sizes skip slave sleep smalldatetimefromparts smallfile snapshot some soname sort soundex ' +
            'source space sparse spfile split sql sql_big_result sql_buffer_result sql_cache sql_calc_found_rows ' +
            'sql_small_result sql_variant_property sqlcode sqldata sqlerror sqlname sqlstate sqrt square standalone ' +
            'standby start starting startup statement static statistics stats_binomial_test stats_crosstab ' +
            'stats_ks_test stats_mode stats_mw_test stats_one_way_anova stats_t_test_ stats_t_test_indep ' +
            'stats_t_test_one stats_t_test_paired stats_wsr_test status std stddev stddev_pop stddev_samp stdev ' +
            'stop storage store stored str str_to_date straight_join strcmp strict string struct stuff style subdate ' +
            'subpartition subpartitions substitutable substr substring subtime subtring_index subtype success sum ' +
            'suspend switch switchoffset switchover sync synchronous synonym sys sys_xmlagg sysasm sysaux sysdate ' +
            'sysdatetimeoffset sysdba sysoper system system_user sysutcdatetime table tables tablespace tablesample tan tdo ' +
            'template temporary terminated tertiary_weights test than then thread through tier ties time time_format ' +
            'time_zone timediff timefromparts timeout timestamp timestampadd timestampdiff timezone_abbr ' +
            'timezone_minute timezone_region to to_base64 to_date to_days to_seconds todatetimeoffset trace tracking ' +
            'transaction transactional translate translation treat trigger trigger_nestlevel triggers trim truncate ' +
            'try_cast try_convert try_parse type ub1 ub2 ub4 ucase unarchived unbounded uncompress ' +
            'under undo unhex unicode uniform uninstall union unique unix_timestamp unknown unlimited unlock unnest unpivot ' +
            'unrecoverable unsafe unsigned until untrusted unusable unused update updated upgrade upped upper upsert ' +
            'url urowid usable usage use use_stored_outlines user user_data user_resources users using utc_date ' +
            'utc_timestamp uuid uuid_short validate validate_password_strength validation valist value values var ' +
            'var_samp varcharc vari varia variab variabl variable variables variance varp varraw varrawc varray ' +
            'verify version versions view virtual visible void wait wallet warning warnings week weekday weekofyear ' +
            'wellformed when whene whenev wheneve whenever where while whitespace window with within without work wrapped ' +
            'xdb xml xmlagg xmlattributes xmlcast xmlcolattval xmlelement xmlexists xmlforest xmlindex xmlnamespaces ' +
            'xmlpi xmlquery xmlroot xmlschema xmlserialize xmltable xmltype xor year year_to_month years yearweek',
          literal:
            'true false null unknown',
          built_in:
            'array bigint binary bit blob bool boolean char character date dec decimal float int int8 integer interval number ' +
            'numeric real record serial serial8 smallint text time timestamp tinyint varchar varchar2 varying void'
        },
        contains: [
          {
            className: 'string',
            begin: '\'', end: '\'',
            contains: [{begin: '\'\''}]
          },
          {
            className: 'string',
            begin: '"', end: '"',
            contains: [{begin: '""'}]
          },
          {
            className: 'string',
            begin: '`', end: '`'
          },
          hljs.C_NUMBER_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          COMMENT_MODE,
          hljs.HASH_COMMENT_MODE
        ]
      },
      hljs.C_BLOCK_COMMENT_MODE,
      COMMENT_MODE,
      hljs.HASH_COMMENT_MODE
    ]
  };
}

var sql_1 = sql;

/*
Language: SCSS
Description: Scss is an extension of the syntax of CSS.
Author: Kurt Emch <kurt@kurtemch.com>
Website: https://sass-lang.com
Category: common, css
*/
function scss(hljs) {
  var AT_IDENTIFIER = '@[a-z-]+'; // @font-face
  var AT_MODIFIERS = "and or not only";
  var IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
  var VARIABLE = {
    className: 'variable',
    begin: '(\\$' + IDENT_RE + ')\\b'
  };
  var HEXCOLOR = {
    className: 'number', begin: '#[0-9A-Fa-f]+'
  };
  var DEF_INTERNALS = {
    className: 'attribute',
    begin: '[A-Z\\_\\.\\-]+', end: ':',
    excludeEnd: true,
    illegal: '[^\\s]',
    starts: {
      endsWithParent: true, excludeEnd: true,
      contains: [
        HEXCOLOR,
        hljs.CSS_NUMBER_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: 'meta', begin: '!important'
        }
      ]
    }
  };
  return {
    name: 'SCSS',
    case_insensitive: true,
    illegal: '[=/|\']',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'selector-id', begin: '\\#[A-Za-z0-9_-]+',
        relevance: 0
      },
      {
        className: 'selector-class', begin: '\\.[A-Za-z0-9_-]+',
        relevance: 0
      },
      {
        className: 'selector-attr', begin: '\\[', end: '\\]',
        illegal: '$'
      },
      {
        className: 'selector-tag', // begin: IDENT_RE, end: '[,|\\s]'
        begin: '\\b(a|abbr|acronym|address|area|article|aside|audio|b|base|big|blockquote|body|br|button|canvas|caption|cite|code|col|colgroup|command|datalist|dd|del|details|dfn|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|frame|frameset|(h[1-6])|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|keygen|label|legend|li|link|map|mark|meta|meter|nav|noframes|noscript|object|ol|optgroup|option|output|p|param|pre|progress|q|rp|rt|ruby|samp|script|section|select|small|span|strike|strong|style|sub|sup|table|tbody|td|textarea|tfoot|th|thead|time|title|tr|tt|ul|var|video)\\b',
        relevance: 0
      },
      {
        className: 'selector-pseudo',
        begin: ':(visited|valid|root|right|required|read-write|read-only|out-range|optional|only-of-type|only-child|nth-of-type|nth-last-of-type|nth-last-child|nth-child|not|link|left|last-of-type|last-child|lang|invalid|indeterminate|in-range|hover|focus|first-of-type|first-line|first-letter|first-child|first|enabled|empty|disabled|default|checked|before|after|active)'
      },
      {
        className: 'selector-pseudo',
        begin: '::(after|before|choices|first-letter|first-line|repeat-index|repeat-item|selection|value)'
      },
      VARIABLE,
      {
        className: 'attribute',
        begin: '\\b(src|z-index|word-wrap|word-spacing|word-break|width|widows|white-space|visibility|vertical-align|unicode-bidi|transition-timing-function|transition-property|transition-duration|transition-delay|transition|transform-style|transform-origin|transform|top|text-underline-position|text-transform|text-shadow|text-rendering|text-overflow|text-indent|text-decoration-style|text-decoration-line|text-decoration-color|text-decoration|text-align-last|text-align|tab-size|table-layout|right|resize|quotes|position|pointer-events|perspective-origin|perspective|page-break-inside|page-break-before|page-break-after|padding-top|padding-right|padding-left|padding-bottom|padding|overflow-y|overflow-x|overflow-wrap|overflow|outline-width|outline-style|outline-offset|outline-color|outline|orphans|order|opacity|object-position|object-fit|normal|none|nav-up|nav-right|nav-left|nav-index|nav-down|min-width|min-height|max-width|max-height|mask|marks|margin-top|margin-right|margin-left|margin-bottom|margin|list-style-type|list-style-position|list-style-image|list-style|line-height|letter-spacing|left|justify-content|initial|inherit|ime-mode|image-orientation|image-resolution|image-rendering|icon|hyphens|height|font-weight|font-variant-ligatures|font-variant|font-style|font-stretch|font-size-adjust|font-size|font-language-override|font-kerning|font-feature-settings|font-family|font|float|flex-wrap|flex-shrink|flex-grow|flex-flow|flex-direction|flex-basis|flex|filter|empty-cells|display|direction|cursor|counter-reset|counter-increment|content|column-width|column-span|column-rule-width|column-rule-style|column-rule-color|column-rule|column-gap|column-fill|column-count|columns|color|clip-path|clip|clear|caption-side|break-inside|break-before|break-after|box-sizing|box-shadow|box-decoration-break|bottom|border-width|border-top-width|border-top-style|border-top-right-radius|border-top-left-radius|border-top-color|border-top|border-style|border-spacing|border-right-width|border-right-style|border-right-color|border-right|border-radius|border-left-width|border-left-style|border-left-color|border-left|border-image-width|border-image-source|border-image-slice|border-image-repeat|border-image-outset|border-image|border-color|border-collapse|border-bottom-width|border-bottom-style|border-bottom-right-radius|border-bottom-left-radius|border-bottom-color|border-bottom|border|background-size|background-repeat|background-position|background-origin|background-image|background-color|background-clip|background-attachment|background-blend-mode|background|backface-visibility|auto|animation-timing-function|animation-play-state|animation-name|animation-iteration-count|animation-fill-mode|animation-duration|animation-direction|animation-delay|animation|align-self|align-items|align-content)\\b',
        illegal: '[^\\s]'
      },
      {
        begin: '\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b'
      },
      {
        begin: ':', end: ';',
        contains: [
          VARIABLE,
          HEXCOLOR,
          hljs.CSS_NUMBER_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          {
            className: 'meta', begin: '!important'
          }
        ]
      },
      // matching these here allows us to treat them more like regular CSS
      // rules so everything between the {} gets regular rule highlighting,
      // which is what we want for page and font-face
      {
        begin: '@(page|font-face)',
        lexemes: AT_IDENTIFIER,
        keywords: '@page @font-face'
      },
      {
        begin: '@', end: '[{;]',
        returnBegin: true,
        keywords: AT_MODIFIERS,
        contains: [
          {
            begin: AT_IDENTIFIER,
            className: "keyword"
          },
          VARIABLE,
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          HEXCOLOR,
          hljs.CSS_NUMBER_MODE,
          // {
          //   begin: '\\s[A-Za-z0-9_.-]+',
          //   relevance: 0
          // }
        ]
      }
    ]
  };
}

var scss_1 = scss;

/*
Language: JSON
Description: JSON (JavaScript Object Notation) is a lightweight data-interchange format.
Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
Website: http://www.json.org
Category: common, protocols
*/

function json(hljs) {
  var LITERALS = {literal: 'true false null'};
  var ALLOWED_COMMENTS = [
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE
  ];
  var TYPES = [
    hljs.QUOTE_STRING_MODE,
    hljs.C_NUMBER_MODE
  ];
  var VALUE_CONTAINER = {
    end: ',', endsWithParent: true, excludeEnd: true,
    contains: TYPES,
    keywords: LITERALS
  };
  var OBJECT = {
    begin: '{', end: '}',
    contains: [
      {
        className: 'attr',
        begin: /"/, end: /"/,
        contains: [hljs.BACKSLASH_ESCAPE],
        illegal: '\\n',
      },
      hljs.inherit(VALUE_CONTAINER, {begin: /:/})
    ].concat(ALLOWED_COMMENTS),
    illegal: '\\S'
  };
  var ARRAY = {
    begin: '\\[', end: '\\]',
    contains: [hljs.inherit(VALUE_CONTAINER)], // inherit is a workaround for a bug that makes shared modes with endsWithParent compile only the ending of one of the parents
    illegal: '\\S'
  };
  TYPES.push(OBJECT, ARRAY);
  ALLOWED_COMMENTS.forEach(function(rule) {
    TYPES.push(rule);
  });
  return {
    name: 'JSON',
    contains: TYPES,
    keywords: LITERALS,
    illegal: '\\S'
  };
}

var json_1 = json;

/*
Language: CSS
Category: common, css
Website: https://developer.mozilla.org/en-US/docs/Web/CSS
*/

function css(hljs) {
  var FUNCTION_LIKE = {
    begin: /[\w-]+\(/, returnBegin: true,
    contains: [
      {
        className: 'built_in',
        begin: /[\w-]+/
      },
      {
        begin: /\(/, end: /\)/,
        contains: [
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.CSS_NUMBER_MODE,
        ]
      }
    ]
  };
  var ATTRIBUTE = {
    className: 'attribute',
    begin: /\S/, end: ':', excludeEnd: true,
    starts: {
      endsWithParent: true, excludeEnd: true,
      contains: [
        FUNCTION_LIKE,
        hljs.CSS_NUMBER_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: 'number', begin: '#[0-9A-Fa-f]+'
        },
        {
          className: 'meta', begin: '!important'
        }
      ]
    }
  };
  var AT_IDENTIFIER = '@[a-z-]+'; // @font-face
  var AT_MODIFIERS = "and or not only";
  var AT_PROPERTY_RE = /@\-?\w[\w]*(\-\w+)*/; // @-webkit-keyframes
  var IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
  var RULE = {
    begin: /(?:[A-Z\_\.\-]+|--[a-zA-Z0-9_-]+)\s*:/, returnBegin: true, end: ';', endsWithParent: true,
    contains: [
      ATTRIBUTE
    ]
  };

  return {
    name: 'CSS',
    case_insensitive: true,
    illegal: /[=\/|'\$]/,
    contains: [
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'selector-id', begin: /#[A-Za-z0-9_-]+/
      },
      {
        className: 'selector-class', begin: /\.[A-Za-z0-9_-]+/
      },
      {
        className: 'selector-attr',
        begin: /\[/, end: /\]/,
        illegal: '$',
        contains: [
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
        ]
      },
      {
        className: 'selector-pseudo',
        begin: /:(:)?[a-zA-Z0-9\_\-\+\(\)"'.]+/
      },
      // matching these here allows us to treat them more like regular CSS
      // rules so everything between the {} gets regular rule highlighting,
      // which is what we want for page and font-face
      {
        begin: '@(page|font-face)',
        lexemes: AT_IDENTIFIER,
        keywords: '@page @font-face'
      },
      {
        begin: '@', end: '[{;]', // at_rule eating first "{" is a good thing
                                 // because it doesn’t let it to be parsed as
                                 // a rule set but instead drops parser into
                                 // the default mode which is how it should be.
        illegal: /:/, // break on Less variables @var: ...
        returnBegin: true,
        contains: [
          {
            className: 'keyword',
            begin: AT_PROPERTY_RE
          },
          {
            begin: /\s/, endsWithParent: true, excludeEnd: true,
            relevance: 0,
            keywords: AT_MODIFIERS,
            contains: [
              {
                begin: /[a-z-]+:/,
                className:"attribute"
              },
              hljs.APOS_STRING_MODE,
              hljs.QUOTE_STRING_MODE,
              hljs.CSS_NUMBER_MODE
            ]
          }
        ]
      },
      {
        className: 'selector-tag', begin: IDENT_RE,
        relevance: 0
      },
      {
        begin: '{', end: '}',
        illegal: /\S/,
        contains: [
          hljs.C_BLOCK_COMMENT_MODE,
          RULE,
        ]
      }
    ]
  };
}

var css_1 = css;

/* src/routes/blog/[slug].svelte generated by Svelte v3.21.0 */
const file = "src/routes/blog/[slug].svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[4] = list[i].type;
	child_ctx[5] = list[i].data;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i];
	return child_ctx;
}

// (230:6) {#each post.tags as tag}
function create_each_block_1(ctx) {
	let span;
	let t_value = /*tag*/ ctx[8] + "";
	let t;

	const block = {
		c: function create() {
			span = element("span");
			t = text(t_value);
			this.h();
		},
		l: function claim(nodes) {
			span = claim_element(nodes, "SPAN", { class: true });
			var span_nodes = children(span);
			t = claim_text(span_nodes, t_value);
			span_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			attr_dev(span, "class", "post__tag svelte-14isbyz");
			add_location(span, file, 230, 8, 6425);
		},
		m: function mount(target, anchor) {
			insert_dev(target, span, anchor);
			append_dev(span, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*post*/ 1 && t_value !== (t_value = /*tag*/ ctx[8] + "")) set_data_dev(t, t_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(span);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_1.name,
		type: "each",
		source: "(230:6) {#each post.tags as tag}",
		ctx
	});

	return block;
}

// (238:6) {#if type === 'image'}
function create_if_block_7(ctx) {
	let picture;
	let img;
	let img_alt_value;
	let img_class_value;
	let img_src_value;

	const block = {
		c: function create() {
			picture = element("picture");
			img = element("img");
			this.h();
		},
		l: function claim(nodes) {
			picture = claim_element(nodes, "PICTURE", {});
			var picture_nodes = children(picture);
			img = claim_element(picture_nodes, "IMG", { alt: true, class: true, src: true });
			picture_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			attr_dev(img, "alt", img_alt_value = /*data*/ ctx[5].caption);
			attr_dev(img, "class", img_class_value = "" + (null_to_empty(`${/*data*/ ctx[5].withBorder ? "border " : ""}${/*data*/ ctx[5].withBackground ? "background " : ""}${/*data*/ ctx[5].stretched ? "stretched" : "center"}`) + " svelte-14isbyz"));
			if (img.src !== (img_src_value = `${/*data*/ ctx[5].url.replace(/\.[^/.]+$/, "")}.jpg`)) attr_dev(img, "src", img_src_value);
			add_location(img, file, 239, 10, 6673);
			add_location(picture, file, 238, 8, 6653);
		},
		m: function mount(target, anchor) {
			insert_dev(target, picture, anchor);
			append_dev(picture, img);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*post*/ 1 && img_alt_value !== (img_alt_value = /*data*/ ctx[5].caption)) {
				attr_dev(img, "alt", img_alt_value);
			}

			if (dirty & /*post*/ 1 && img_class_value !== (img_class_value = "" + (null_to_empty(`${/*data*/ ctx[5].withBorder ? "border " : ""}${/*data*/ ctx[5].withBackground ? "background " : ""}${/*data*/ ctx[5].stretched ? "stretched" : "center"}`) + " svelte-14isbyz"))) {
				attr_dev(img, "class", img_class_value);
			}

			if (dirty & /*post*/ 1 && img.src !== (img_src_value = `${/*data*/ ctx[5].url.replace(/\.[^/.]+$/, "")}.jpg`)) {
				attr_dev(img, "src", img_src_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(picture);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_7.name,
		type: "if",
		source: "(238:6) {#if type === 'image'}",
		ctx
	});

	return block;
}

// (246:6) {#if type === 'header'}
function create_if_block_2(ctx) {
	let t0;
	let t1;
	let t2;
	let if_block3_anchor;
	let if_block0 = /*data*/ ctx[5].level === 1 && create_if_block_6(ctx);
	let if_block1 = /*data*/ ctx[5].level === 2 && create_if_block_5(ctx);
	let if_block2 = /*data*/ ctx[5].level === 3 && create_if_block_4(ctx);
	let if_block3 = /*data*/ ctx[5].level === 4 && create_if_block_3(ctx);

	const block = {
		c: function create() {
			if (if_block0) if_block0.c();
			t0 = space();
			if (if_block1) if_block1.c();
			t1 = space();
			if (if_block2) if_block2.c();
			t2 = space();
			if (if_block3) if_block3.c();
			if_block3_anchor = empty();
		},
		l: function claim(nodes) {
			if (if_block0) if_block0.l(nodes);
			t0 = claim_space(nodes);
			if (if_block1) if_block1.l(nodes);
			t1 = claim_space(nodes);
			if (if_block2) if_block2.l(nodes);
			t2 = claim_space(nodes);
			if (if_block3) if_block3.l(nodes);
			if_block3_anchor = empty();
		},
		m: function mount(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert_dev(target, t0, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert_dev(target, t1, anchor);
			if (if_block2) if_block2.m(target, anchor);
			insert_dev(target, t2, anchor);
			if (if_block3) if_block3.m(target, anchor);
			insert_dev(target, if_block3_anchor, anchor);
		},
		p: function update(ctx, dirty) {
			if (/*data*/ ctx[5].level === 1) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_6(ctx);
					if_block0.c();
					if_block0.m(t0.parentNode, t0);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*data*/ ctx[5].level === 2) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_5(ctx);
					if_block1.c();
					if_block1.m(t1.parentNode, t1);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*data*/ ctx[5].level === 3) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_4(ctx);
					if_block2.c();
					if_block2.m(t2.parentNode, t2);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (/*data*/ ctx[5].level === 4) {
				if (if_block3) {
					if_block3.p(ctx, dirty);
				} else {
					if_block3 = create_if_block_3(ctx);
					if_block3.c();
					if_block3.m(if_block3_anchor.parentNode, if_block3_anchor);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}
		},
		d: function destroy(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach_dev(t0);
			if (if_block1) if_block1.d(detaching);
			if (detaching) detach_dev(t1);
			if (if_block2) if_block2.d(detaching);
			if (detaching) detach_dev(t2);
			if (if_block3) if_block3.d(detaching);
			if (detaching) detach_dev(if_block3_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_2.name,
		type: "if",
		source: "(246:6) {#if type === 'header'}",
		ctx
	});

	return block;
}

// (247:8) {#if data.level === 1}
function create_if_block_6(ctx) {
	let h1;
	let t_value = /*data*/ ctx[5].text + "";
	let t;

	const block = {
		c: function create() {
			h1 = element("h1");
			t = text(t_value);
			this.h();
		},
		l: function claim(nodes) {
			h1 = claim_element(nodes, "H1", {});
			var h1_nodes = children(h1);
			t = claim_text(h1_nodes, t_value);
			h1_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			add_location(h1, file, 247, 10, 7018);
		},
		m: function mount(target, anchor) {
			insert_dev(target, h1, anchor);
			append_dev(h1, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*post*/ 1 && t_value !== (t_value = /*data*/ ctx[5].text + "")) set_data_dev(t, t_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(h1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_6.name,
		type: "if",
		source: "(247:8) {#if data.level === 1}",
		ctx
	});

	return block;
}

// (250:8) {#if data.level === 2}
function create_if_block_5(ctx) {
	let h2;
	let t_value = /*data*/ ctx[5].text + "";
	let t;

	const block = {
		c: function create() {
			h2 = element("h2");
			t = text(t_value);
			this.h();
		},
		l: function claim(nodes) {
			h2 = claim_element(nodes, "H2", {});
			var h2_nodes = children(h2);
			t = claim_text(h2_nodes, t_value);
			h2_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			add_location(h2, file, 250, 10, 7094);
		},
		m: function mount(target, anchor) {
			insert_dev(target, h2, anchor);
			append_dev(h2, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*post*/ 1 && t_value !== (t_value = /*data*/ ctx[5].text + "")) set_data_dev(t, t_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(h2);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_5.name,
		type: "if",
		source: "(250:8) {#if data.level === 2}",
		ctx
	});

	return block;
}

// (253:8) {#if data.level === 3}
function create_if_block_4(ctx) {
	let h3;
	let t_value = /*data*/ ctx[5].text + "";
	let t;

	const block = {
		c: function create() {
			h3 = element("h3");
			t = text(t_value);
			this.h();
		},
		l: function claim(nodes) {
			h3 = claim_element(nodes, "H3", {});
			var h3_nodes = children(h3);
			t = claim_text(h3_nodes, t_value);
			h3_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			add_location(h3, file, 253, 10, 7170);
		},
		m: function mount(target, anchor) {
			insert_dev(target, h3, anchor);
			append_dev(h3, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*post*/ 1 && t_value !== (t_value = /*data*/ ctx[5].text + "")) set_data_dev(t, t_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(h3);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_4.name,
		type: "if",
		source: "(253:8) {#if data.level === 3}",
		ctx
	});

	return block;
}

// (256:8) {#if data.level === 4}
function create_if_block_3(ctx) {
	let h4;
	let t_value = /*data*/ ctx[5].text + "";
	let t;

	const block = {
		c: function create() {
			h4 = element("h4");
			t = text(t_value);
			this.h();
		},
		l: function claim(nodes) {
			h4 = claim_element(nodes, "H4", {});
			var h4_nodes = children(h4);
			t = claim_text(h4_nodes, t_value);
			h4_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			add_location(h4, file, 256, 10, 7246);
		},
		m: function mount(target, anchor) {
			insert_dev(target, h4, anchor);
			append_dev(h4, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*post*/ 1 && t_value !== (t_value = /*data*/ ctx[5].text + "")) set_data_dev(t, t_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(h4);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_3.name,
		type: "if",
		source: "(256:8) {#if data.level === 4}",
		ctx
	});

	return block;
}

// (260:6) {#if type === 'code'}
function create_if_block_1(ctx) {
	let pre;
	let code;
	let raw_value = `${/*highlight*/ ctx[3](/*data*/ ctx[5].code)}` + "";

	const block = {
		c: function create() {
			pre = element("pre");
			code = element("code");
			this.h();
		},
		l: function claim(nodes) {
			pre = claim_element(nodes, "PRE", { class: true });
			var pre_nodes = children(pre);
			code = claim_element(pre_nodes, "CODE", {});
			var code_nodes = children(code);
			code_nodes.forEach(detach_dev);
			pre_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			add_location(code, file, 261, 10, 7358);
			attr_dev(pre, "class", "hljs svelte-14isbyz");
			add_location(pre, file, 260, 8, 7329);
		},
		m: function mount(target, anchor) {
			insert_dev(target, pre, anchor);
			append_dev(pre, code);
			code.innerHTML = raw_value;
		},
		p: function update(ctx, dirty) {
			if (dirty & /*post*/ 1 && raw_value !== (raw_value = `${/*highlight*/ ctx[3](/*data*/ ctx[5].code)}` + "")) code.innerHTML = raw_value;		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(pre);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(260:6) {#if type === 'code'}",
		ctx
	});

	return block;
}

// (267:6) {#if type === 'paragraph'}
function create_if_block(ctx) {
	let p;
	let html_tag;
	let raw_value = /*data*/ ctx[5].text + "";
	let t;

	const block = {
		c: function create() {
			p = element("p");
			t = space();
			this.h();
		},
		l: function claim(nodes) {
			p = claim_element(nodes, "P", {});
			var p_nodes = children(p);
			t = claim_space(p_nodes);
			p_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			html_tag = new HtmlTag(raw_value, t);
			add_location(p, file, 267, 8, 7497);
		},
		m: function mount(target, anchor) {
			insert_dev(target, p, anchor);
			html_tag.m(p);
			append_dev(p, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*post*/ 1 && raw_value !== (raw_value = /*data*/ ctx[5].text + "")) html_tag.p(raw_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(p);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(267:6) {#if type === 'paragraph'}",
		ctx
	});

	return block;
}

// (237:4) {#each post.body as { type, data }}
function create_each_block(ctx) {
	let t0;
	let t1;
	let t2;
	let if_block3_anchor;
	let if_block0 = /*type*/ ctx[4] === "image" && create_if_block_7(ctx);
	let if_block1 = /*type*/ ctx[4] === "header" && create_if_block_2(ctx);
	let if_block2 = /*type*/ ctx[4] === "code" && create_if_block_1(ctx);
	let if_block3 = /*type*/ ctx[4] === "paragraph" && create_if_block(ctx);

	const block = {
		c: function create() {
			if (if_block0) if_block0.c();
			t0 = space();
			if (if_block1) if_block1.c();
			t1 = space();
			if (if_block2) if_block2.c();
			t2 = space();
			if (if_block3) if_block3.c();
			if_block3_anchor = empty();
		},
		l: function claim(nodes) {
			if (if_block0) if_block0.l(nodes);
			t0 = claim_space(nodes);
			if (if_block1) if_block1.l(nodes);
			t1 = claim_space(nodes);
			if (if_block2) if_block2.l(nodes);
			t2 = claim_space(nodes);
			if (if_block3) if_block3.l(nodes);
			if_block3_anchor = empty();
		},
		m: function mount(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert_dev(target, t0, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert_dev(target, t1, anchor);
			if (if_block2) if_block2.m(target, anchor);
			insert_dev(target, t2, anchor);
			if (if_block3) if_block3.m(target, anchor);
			insert_dev(target, if_block3_anchor, anchor);
		},
		p: function update(ctx, dirty) {
			if (/*type*/ ctx[4] === "image") {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_7(ctx);
					if_block0.c();
					if_block0.m(t0.parentNode, t0);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*type*/ ctx[4] === "header") {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_2(ctx);
					if_block1.c();
					if_block1.m(t1.parentNode, t1);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*type*/ ctx[4] === "code") {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_1(ctx);
					if_block2.c();
					if_block2.m(t2.parentNode, t2);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (/*type*/ ctx[4] === "paragraph") {
				if (if_block3) {
					if_block3.p(ctx, dirty);
				} else {
					if_block3 = create_if_block(ctx);
					if_block3.c();
					if_block3.m(if_block3_anchor.parentNode, if_block3_anchor);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}
		},
		d: function destroy(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach_dev(t0);
			if (if_block1) if_block1.d(detaching);
			if (detaching) detach_dev(t1);
			if (if_block2) if_block2.d(detaching);
			if (detaching) detach_dev(t2);
			if (if_block3) if_block3.d(detaching);
			if (detaching) detach_dev(if_block3_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(237:4) {#each post.body as { type, data }}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let title_value;
	let meta0;
	let meta0_content_value;
	let meta1;
	let meta1_content_value;
	let meta2;
	let meta3;
	let meta4;
	let meta5;
	let meta5_content_value;
	let meta6;
	let meta6_content_value;
	let meta7;
	let meta7_content_value;
	let meta8;
	let meta8_content_value;
	let meta9;
	let meta10;
	let meta10_content_value;
	let meta11;
	let meta11_content_value;
	let meta12;
	let meta12_content_value;
	let t0;
	let div4;
	let h1;
	let t1_value = /*post*/ ctx[0].title + "";
	let t1;
	let t2;
	let h4;
	let t3_value = /*post*/ ctx[0].subTitle + "";
	let t3;
	let t4;
	let picture;
	let source0;
	let source0_srcset_value;
	let t5;
	let source1;
	let source1_srcset_value;
	let t6;
	let source2;
	let source2_srcset_value;
	let t7;
	let source3;
	let source3_srcset_value;
	let t8;
	let source4;
	let source4_srcset_value;
	let t9;
	let source5;
	let source5_srcset_value;
	let t10;
	let img;
	let img_src_value;
	let img_alt_value;
	let t11;
	let div2;
	let t12;
	let div0;
	let t13;
	let div1;
	let t14;
	let t15;
	let t16;
	let div3;
	let current;
	document.title = title_value = /*post*/ ctx[0].title;

	const author = new Author({
			props: {
				name: /*authorData*/ ctx[1].name,
				avathar: /*authorData*/ ctx[1].avathar,
				createdDate: /*post*/ ctx[0].createdDate
			},
			$$inline: true
		});

	let each_value_1 = /*post*/ ctx[0].tags;
	validate_each_argument(each_value_1);
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	let each_value = /*post*/ ctx[0].body;
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			meta0 = element("meta");
			meta1 = element("meta");
			meta2 = element("meta");
			meta3 = element("meta");
			meta4 = element("meta");
			meta5 = element("meta");
			meta6 = element("meta");
			meta7 = element("meta");
			meta8 = element("meta");
			meta9 = element("meta");
			meta10 = element("meta");
			meta11 = element("meta");
			meta12 = element("meta");
			t0 = space();
			div4 = element("div");
			h1 = element("h1");
			t1 = text(t1_value);
			t2 = space();
			h4 = element("h4");
			t3 = text(t3_value);
			t4 = space();
			picture = element("picture");
			source0 = element("source");
			t5 = space();
			source1 = element("source");
			t6 = space();
			source2 = element("source");
			t7 = space();
			source3 = element("source");
			t8 = space();
			source4 = element("source");
			t9 = space();
			source5 = element("source");
			t10 = space();
			img = element("img");
			t11 = space();
			div2 = element("div");
			create_component(author.$$.fragment);
			t12 = space();
			div0 = element("div");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t13 = space();
			div1 = element("div");
			t14 = text(/*pageViews*/ ctx[2]);
			t15 = text(" views");
			t16 = space();
			div3 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			this.h();
		},
		l: function claim(nodes) {
			const head_nodes = query_selector_all("[data-svelte=\"svelte-72qgel\"]", document.head);
			meta0 = claim_element(head_nodes, "META", { name: true, content: true });
			meta1 = claim_element(head_nodes, "META", { name: true, content: true });
			meta2 = claim_element(head_nodes, "META", { name: true, content: true });
			meta3 = claim_element(head_nodes, "META", { name: true, content: true });
			meta4 = claim_element(head_nodes, "META", { name: true, content: true });
			meta5 = claim_element(head_nodes, "META", { name: true, content: true });
			meta6 = claim_element(head_nodes, "META", { name: true, content: true });
			meta7 = claim_element(head_nodes, "META", { name: true, content: true });
			meta8 = claim_element(head_nodes, "META", { property: true, content: true });
			meta9 = claim_element(head_nodes, "META", { property: true, content: true });
			meta10 = claim_element(head_nodes, "META", { property: true, content: true });
			meta11 = claim_element(head_nodes, "META", { property: true, content: true });
			meta12 = claim_element(head_nodes, "META", { property: true, content: true });
			head_nodes.forEach(detach_dev);
			t0 = claim_space(nodes);
			div4 = claim_element(nodes, "DIV", { class: true });
			var div4_nodes = children(div4);
			h1 = claim_element(div4_nodes, "H1", { class: true });
			var h1_nodes = children(h1);
			t1 = claim_text(h1_nodes, t1_value);
			h1_nodes.forEach(detach_dev);
			t2 = claim_space(div4_nodes);
			h4 = claim_element(div4_nodes, "H4", { class: true });
			var h4_nodes = children(h4);
			t3 = claim_text(h4_nodes, t3_value);
			h4_nodes.forEach(detach_dev);
			t4 = claim_space(div4_nodes);
			picture = claim_element(div4_nodes, "PICTURE", {});
			var picture_nodes = children(picture);
			source0 = claim_element(picture_nodes, "SOURCE", { srcset: true, media: true, type: true });
			t5 = claim_space(picture_nodes);
			source1 = claim_element(picture_nodes, "SOURCE", { srcset: true, media: true, type: true });
			t6 = claim_space(picture_nodes);
			source2 = claim_element(picture_nodes, "SOURCE", { srcset: true, media: true, type: true });
			t7 = claim_space(picture_nodes);
			source3 = claim_element(picture_nodes, "SOURCE", { srcset: true, media: true, type: true });
			t8 = claim_space(picture_nodes);
			source4 = claim_element(picture_nodes, "SOURCE", { srcset: true, media: true, type: true });
			t9 = claim_space(picture_nodes);
			source5 = claim_element(picture_nodes, "SOURCE", { srcset: true, media: true, type: true });
			t10 = claim_space(picture_nodes);
			img = claim_element(picture_nodes, "IMG", { class: true, src: true, alt: true });
			picture_nodes.forEach(detach_dev);
			t11 = claim_space(div4_nodes);
			div2 = claim_element(div4_nodes, "DIV", { class: true });
			var div2_nodes = children(div2);
			claim_component(author.$$.fragment, div2_nodes);
			t12 = claim_space(div2_nodes);
			div0 = claim_element(div2_nodes, "DIV", { class: true });
			var div0_nodes = children(div0);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].l(div0_nodes);
			}

			div0_nodes.forEach(detach_dev);
			t13 = claim_space(div2_nodes);
			div1 = claim_element(div2_nodes, "DIV", { class: true });
			var div1_nodes = children(div1);
			t14 = claim_text(div1_nodes, /*pageViews*/ ctx[2]);
			t15 = claim_text(div1_nodes, " views");
			div1_nodes.forEach(detach_dev);
			div2_nodes.forEach(detach_dev);
			t16 = claim_space(div4_nodes);
			div3 = claim_element(div4_nodes, "DIV", { class: true });
			var div3_nodes = children(div3);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].l(div3_nodes);
			}

			div3_nodes.forEach(detach_dev);
			div4_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			attr_dev(meta0, "name", "keywords");
			attr_dev(meta0, "content", meta0_content_value = /*post*/ ctx[0].subTitle);
			add_location(meta0, file, 174, 2, 4251);
			attr_dev(meta1, "name", "description");
			attr_dev(meta1, "content", meta1_content_value = /*post*/ ctx[0].tags.join(", "));
			add_location(meta1, file, 175, 2, 4302);
			attr_dev(meta2, "name", "twitter:card");
			attr_dev(meta2, "content", "summary_large_image");
			add_location(meta2, file, 176, 2, 4363);
			attr_dev(meta3, "name", "twitter:site");
			attr_dev(meta3, "content", "@_hectane");
			add_location(meta3, file, 177, 2, 4424);
			attr_dev(meta4, "name", "twitter:creator");
			attr_dev(meta4, "content", "@velusgautam");
			add_location(meta4, file, 178, 2, 4475);
			attr_dev(meta5, "name", "twitter:title");
			attr_dev(meta5, "content", meta5_content_value = /*post*/ ctx[0].title);
			add_location(meta5, file, 179, 2, 4532);
			attr_dev(meta6, "name", "twitter:description");
			attr_dev(meta6, "content", meta6_content_value = /*post*/ ctx[0].subTitle);
			add_location(meta6, file, 180, 2, 4585);
			attr_dev(meta7, "name", "twitter:image");
			attr_dev(meta7, "content", meta7_content_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/title.jpg`);
			add_location(meta7, file, 181, 2, 4647);
			attr_dev(meta8, "property", "og:url");
			attr_dev(meta8, "content", meta8_content_value = `https://hectane.com/blog/${/*post*/ ctx[0].route}`);
			add_location(meta8, file, 183, 2, 4743);
			attr_dev(meta9, "property", "og:type");
			attr_dev(meta9, "content", "article");
			add_location(meta9, file, 184, 2, 4823);
			attr_dev(meta10, "property", "og:title");
			attr_dev(meta10, "content", meta10_content_value = /*post*/ ctx[0].title);
			add_location(meta10, file, 185, 2, 4871);
			attr_dev(meta11, "property", "og:description");
			attr_dev(meta11, "content", meta11_content_value = /*post*/ ctx[0].subTitle);
			add_location(meta11, file, 186, 2, 4923);
			attr_dev(meta12, "property", "og:image");
			attr_dev(meta12, "content", meta12_content_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/title.jpg`);
			add_location(meta12, file, 187, 2, 4984);
			attr_dev(h1, "class", "post--title svelte-14isbyz");
			add_location(h1, file, 191, 2, 5116);
			attr_dev(h4, "class", "post--sub-title svelte-14isbyz");
			add_location(h4, file, 192, 2, 5160);
			attr_dev(source0, "srcset", source0_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/mobile.webp`);
			attr_dev(source0, "media", "(max-width: 420px)");
			attr_dev(source0, "type", "image/webp");
			add_location(source0, file, 194, 4, 5225);
			attr_dev(source1, "srcset", source1_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/mobile.jpg`);
			attr_dev(source1, "media", "(max-width: 420px)");
			attr_dev(source1, "type", "image/jpg");
			add_location(source1, file, 198, 4, 5367);
			attr_dev(source2, "srcset", source2_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/listing.webp`);
			attr_dev(source2, "media", "( max-width:799px)");
			attr_dev(source2, "type", "image/webp");
			add_location(source2, file, 202, 4, 5507);
			attr_dev(source3, "srcset", source3_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/listing.jpg`);
			attr_dev(source3, "media", "(max-width:799px)");
			attr_dev(source3, "type", "image/jpg");
			add_location(source3, file, 206, 4, 5650);
			attr_dev(source4, "srcset", source4_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/title.webp`);
			attr_dev(source4, "media", "(min-width: 800px)");
			attr_dev(source4, "type", "image/webp");
			add_location(source4, file, 210, 4, 5790);
			attr_dev(source5, "srcset", source5_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/title.jpg`);
			attr_dev(source5, "media", "(min-width: 800px)");
			attr_dev(source5, "type", "image/jpg");
			add_location(source5, file, 214, 4, 5931);
			attr_dev(img, "class", "post-title-image svelte-14isbyz");
			if (img.src !== (img_src_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/title.jpg`)) attr_dev(img, "src", img_src_value);
			attr_dev(img, "alt", img_alt_value = /*post*/ ctx[0].title);
			add_location(img, file, 218, 4, 6070);
			add_location(picture, file, 193, 2, 5211);
			attr_dev(div0, "class", "post__tags");
			add_location(div0, file, 228, 4, 6361);
			attr_dev(div1, "class", "post__views");
			add_location(div1, file, 233, 4, 6491);
			attr_dev(div2, "class", "post--metadata svelte-14isbyz");
			add_location(div2, file, 223, 2, 6212);
			attr_dev(div3, "class", "post--body svelte-14isbyz");
			add_location(div3, file, 235, 2, 6551);
			attr_dev(div4, "class", "content");
			add_location(div4, file, 190, 0, 5092);
		},
		m: function mount(target, anchor) {
			append_dev(document.head, meta0);
			append_dev(document.head, meta1);
			append_dev(document.head, meta2);
			append_dev(document.head, meta3);
			append_dev(document.head, meta4);
			append_dev(document.head, meta5);
			append_dev(document.head, meta6);
			append_dev(document.head, meta7);
			append_dev(document.head, meta8);
			append_dev(document.head, meta9);
			append_dev(document.head, meta10);
			append_dev(document.head, meta11);
			append_dev(document.head, meta12);
			insert_dev(target, t0, anchor);
			insert_dev(target, div4, anchor);
			append_dev(div4, h1);
			append_dev(h1, t1);
			append_dev(div4, t2);
			append_dev(div4, h4);
			append_dev(h4, t3);
			append_dev(div4, t4);
			append_dev(div4, picture);
			append_dev(picture, source0);
			append_dev(picture, t5);
			append_dev(picture, source1);
			append_dev(picture, t6);
			append_dev(picture, source2);
			append_dev(picture, t7);
			append_dev(picture, source3);
			append_dev(picture, t8);
			append_dev(picture, source4);
			append_dev(picture, t9);
			append_dev(picture, source5);
			append_dev(picture, t10);
			append_dev(picture, img);
			append_dev(div4, t11);
			append_dev(div4, div2);
			mount_component(author, div2, null);
			append_dev(div2, t12);
			append_dev(div2, div0);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(div0, null);
			}

			append_dev(div2, t13);
			append_dev(div2, div1);
			append_dev(div1, t14);
			append_dev(div1, t15);
			append_dev(div4, t16);
			append_dev(div4, div3);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div3, null);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			if ((!current || dirty & /*post*/ 1) && title_value !== (title_value = /*post*/ ctx[0].title)) {
				document.title = title_value;
			}

			if (!current || dirty & /*post*/ 1 && meta0_content_value !== (meta0_content_value = /*post*/ ctx[0].subTitle)) {
				attr_dev(meta0, "content", meta0_content_value);
			}

			if (!current || dirty & /*post*/ 1 && meta1_content_value !== (meta1_content_value = /*post*/ ctx[0].tags.join(", "))) {
				attr_dev(meta1, "content", meta1_content_value);
			}

			if (!current || dirty & /*post*/ 1 && meta5_content_value !== (meta5_content_value = /*post*/ ctx[0].title)) {
				attr_dev(meta5, "content", meta5_content_value);
			}

			if (!current || dirty & /*post*/ 1 && meta6_content_value !== (meta6_content_value = /*post*/ ctx[0].subTitle)) {
				attr_dev(meta6, "content", meta6_content_value);
			}

			if (!current || dirty & /*post*/ 1 && meta7_content_value !== (meta7_content_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/title.jpg`)) {
				attr_dev(meta7, "content", meta7_content_value);
			}

			if (!current || dirty & /*post*/ 1 && meta8_content_value !== (meta8_content_value = `https://hectane.com/blog/${/*post*/ ctx[0].route}`)) {
				attr_dev(meta8, "content", meta8_content_value);
			}

			if (!current || dirty & /*post*/ 1 && meta10_content_value !== (meta10_content_value = /*post*/ ctx[0].title)) {
				attr_dev(meta10, "content", meta10_content_value);
			}

			if (!current || dirty & /*post*/ 1 && meta11_content_value !== (meta11_content_value = /*post*/ ctx[0].subTitle)) {
				attr_dev(meta11, "content", meta11_content_value);
			}

			if (!current || dirty & /*post*/ 1 && meta12_content_value !== (meta12_content_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/title.jpg`)) {
				attr_dev(meta12, "content", meta12_content_value);
			}

			if ((!current || dirty & /*post*/ 1) && t1_value !== (t1_value = /*post*/ ctx[0].title + "")) set_data_dev(t1, t1_value);
			if ((!current || dirty & /*post*/ 1) && t3_value !== (t3_value = /*post*/ ctx[0].subTitle + "")) set_data_dev(t3, t3_value);

			if (!current || dirty & /*post*/ 1 && source0_srcset_value !== (source0_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/mobile.webp`)) {
				attr_dev(source0, "srcset", source0_srcset_value);
			}

			if (!current || dirty & /*post*/ 1 && source1_srcset_value !== (source1_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/mobile.jpg`)) {
				attr_dev(source1, "srcset", source1_srcset_value);
			}

			if (!current || dirty & /*post*/ 1 && source2_srcset_value !== (source2_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/listing.webp`)) {
				attr_dev(source2, "srcset", source2_srcset_value);
			}

			if (!current || dirty & /*post*/ 1 && source3_srcset_value !== (source3_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/listing.jpg`)) {
				attr_dev(source3, "srcset", source3_srcset_value);
			}

			if (!current || dirty & /*post*/ 1 && source4_srcset_value !== (source4_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/title.webp`)) {
				attr_dev(source4, "srcset", source4_srcset_value);
			}

			if (!current || dirty & /*post*/ 1 && source5_srcset_value !== (source5_srcset_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/title.jpg`)) {
				attr_dev(source5, "srcset", source5_srcset_value);
			}

			if (!current || dirty & /*post*/ 1 && img.src !== (img_src_value = `https://assets.hectane.com/${/*post*/ ctx[0].route}/title.jpg`)) {
				attr_dev(img, "src", img_src_value);
			}

			if (!current || dirty & /*post*/ 1 && img_alt_value !== (img_alt_value = /*post*/ ctx[0].title)) {
				attr_dev(img, "alt", img_alt_value);
			}

			const author_changes = {};
			if (dirty & /*authorData*/ 2) author_changes.name = /*authorData*/ ctx[1].name;
			if (dirty & /*authorData*/ 2) author_changes.avathar = /*authorData*/ ctx[1].avathar;
			if (dirty & /*post*/ 1) author_changes.createdDate = /*post*/ ctx[0].createdDate;
			author.$set(author_changes);

			if (dirty & /*post*/ 1) {
				each_value_1 = /*post*/ ctx[0].tags;
				validate_each_argument(each_value_1);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(div0, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (!current || dirty & /*pageViews*/ 4) set_data_dev(t14, /*pageViews*/ ctx[2]);

			if (dirty & /*post, highlight*/ 9) {
				each_value = /*post*/ ctx[0].body;
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div3, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(author.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(author.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			detach_dev(meta0);
			detach_dev(meta1);
			detach_dev(meta2);
			detach_dev(meta3);
			detach_dev(meta4);
			detach_dev(meta5);
			detach_dev(meta6);
			detach_dev(meta7);
			detach_dev(meta8);
			detach_dev(meta9);
			detach_dev(meta10);
			detach_dev(meta11);
			detach_dev(meta12);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(div4);
			destroy_component(author);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

async function preload({ params, query }) {

	authors.subscribe(value => {
	});

	const res = await this.fetch(`http://localhost:3200/posts/route/${params.slug}`);
	const data = await res.json();

	if (res.status === 200) {
		let authorMap = new Map();
		let authorData = [];

		const unsubscribe = authors.subscribe(value => {
			authorMap = value;
		});

		// creating unique author ids from the posts
		if (!authorMap.get(data.authorId)) {
			// getting author data for all unique authors to avoid multi fetch
			const res = await this.fetch(`http://localhost:3200/users/${data.authorId}`);

			authorData = await res.json();

			authors.update(map => {
				return map.set(authorData._id, authorData);
			});
		} else {
			authorData = authorMap.get(data.authorId);
		}

		return { post: data, authorData };
	} else {
		this.error(res.status, data.message);
	}
}

function instance($$self, $$props, $$invalidate) {
	core.registerLanguage("javascript", javascript_1);
	core.registerLanguage("bash", bash_1);
	core.registerLanguage("sql", sql_1);
	core.registerLanguage("scss", scss_1);
	core.registerLanguage("json", json_1);
	core.registerLanguage("css", css_1);
	let { post } = $$props;
	let { authorData } = $$props;

	const highlight = source => {
		const { value: highlighted } = core.highlightAuto(source);
		return highlighted;
	};

	let pageViews = 0;

	if (typeof fetch !== "function") {
		global.fetch = require("node-fetch");
	}

	fetch(`http://localhost:3200/posts-meta-data/${post._id}`).then(response => response.json()).then(({ count }) => {
		$$invalidate(2, pageViews = count);
	});

	const writable_props = ["post", "authorData"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<U5Bslugu5D> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("U5Bslugu5D", $$slots, []);

	$$self.$set = $$props => {
		if ("post" in $$props) $$invalidate(0, post = $$props.post);
		if ("authorData" in $$props) $$invalidate(1, authorData = $$props.authorData);
	};

	$$self.$capture_state = () => ({
		authors,
		preload,
		Author,
		hljs: core,
		javascript: javascript_1,
		bash: bash_1,
		sql: sql_1,
		scss: scss_1,
		json: json_1,
		css: css_1,
		post,
		authorData,
		highlight,
		pageViews
	});

	$$self.$inject_state = $$props => {
		if ("post" in $$props) $$invalidate(0, post = $$props.post);
		if ("authorData" in $$props) $$invalidate(1, authorData = $$props.authorData);
		if ("pageViews" in $$props) $$invalidate(2, pageViews = $$props.pageViews);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [post, authorData, pageViews, highlight];
}

class U5Bslugu5D extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, { post: 0, authorData: 1 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "U5Bslugu5D",
			options,
			id: create_fragment.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*post*/ ctx[0] === undefined && !("post" in props)) {
			console.warn("<U5Bslugu5D> was created without expected prop 'post'");
		}

		if (/*authorData*/ ctx[1] === undefined && !("authorData" in props)) {
			console.warn("<U5Bslugu5D> was created without expected prop 'authorData'");
		}
	}

	get post() {
		throw new Error("<U5Bslugu5D>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set post(value) {
		throw new Error("<U5Bslugu5D>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get authorData() {
		throw new Error("<U5Bslugu5D>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set authorData(value) {
		throw new Error("<U5Bslugu5D>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

export default U5Bslugu5D;
export { preload };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiW3NsdWddLjY2NjRhZGU5LmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi9ub2RlX21vZHVsZXMvaGlnaGxpZ2h0LmpzL2xpYi9jb3JlLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2hpZ2hsaWdodC5qcy9saWIvbGFuZ3VhZ2VzL2phdmFzY3JpcHQuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvaGlnaGxpZ2h0LmpzL2xpYi9sYW5ndWFnZXMvYmFzaC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9oaWdobGlnaHQuanMvbGliL2xhbmd1YWdlcy9zcWwuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvaGlnaGxpZ2h0LmpzL2xpYi9sYW5ndWFnZXMvc2Nzcy5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9oaWdobGlnaHQuanMvbGliL2xhbmd1YWdlcy9qc29uLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2hpZ2hsaWdodC5qcy9saWIvbGFuZ3VhZ2VzL2Nzcy5qcyIsIi4uLy4uLy4uL3NyYy9yb3V0ZXMvYmxvZy9bc2x1Z10uc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zdWJzdGFjay9kZWVwLWZyZWV6ZS9ibG9iL21hc3Rlci9pbmRleC5qc1xuZnVuY3Rpb24gZGVlcEZyZWV6ZSAobykge1xuICBPYmplY3QuZnJlZXplKG8pO1xuXG4gIHZhciBvYmpJc0Z1bmN0aW9uID0gdHlwZW9mIG8gPT09ICdmdW5jdGlvbic7XG5cbiAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMobykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgIGlmIChvLmhhc093blByb3BlcnR5KHByb3ApXG4gICAgJiYgb1twcm9wXSAhPT0gbnVsbFxuICAgICYmICh0eXBlb2Ygb1twcm9wXSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2Ygb1twcm9wXSA9PT0gXCJmdW5jdGlvblwiKVxuICAgIC8vIElFMTEgZml4OiBodHRwczovL2dpdGh1Yi5jb20vaGlnaGxpZ2h0anMvaGlnaGxpZ2h0LmpzL2lzc3Vlcy8yMzE4XG4gICAgLy8gVE9ETzogcmVtb3ZlIGluIHRoZSBmdXR1cmVcbiAgICAmJiAob2JqSXNGdW5jdGlvbiA/IHByb3AgIT09ICdjYWxsZXInICYmIHByb3AgIT09ICdjYWxsZWUnICYmIHByb3AgIT09ICdhcmd1bWVudHMnIDogdHJ1ZSlcbiAgICAmJiAhT2JqZWN0LmlzRnJvemVuKG9bcHJvcF0pKSB7XG4gICAgICBkZWVwRnJlZXplKG9bcHJvcF0pO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIG87XG59XG5cbmZ1bmN0aW9uIGVzY2FwZUhUTUwodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoLyYvZywgJyZhbXA7JykucmVwbGFjZSgvPC9nLCAnJmx0OycpLnJlcGxhY2UoLz4vZywgJyZndDsnKTtcbn1cblxuXG4vKipcbiAqIHBlcmZvcm1zIGEgc2hhbGxvdyBtZXJnZSBvZiBtdWx0aXBsZSBvYmplY3RzIGludG8gb25lXG4gKlxuICogQGFyZ3VtZW50cyBsaXN0IG9mIG9iamVjdHMgd2l0aCBwcm9wZXJ0aWVzIHRvIG1lcmdlXG4gKiBAcmV0dXJucyBhIHNpbmdsZSBuZXcgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIGluaGVyaXQocGFyZW50KSB7ICAvLyBpbmhlcml0KHBhcmVudCwgb3ZlcnJpZGVfb2JqLCBvdmVycmlkZV9vYmosIC4uLilcbiAgdmFyIGtleTtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuICB2YXIgb2JqZWN0cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgZm9yIChrZXkgaW4gcGFyZW50KVxuICAgIHJlc3VsdFtrZXldID0gcGFyZW50W2tleV07XG4gIG9iamVjdHMuZm9yRWFjaChmdW5jdGlvbihvYmopIHtcbiAgICBmb3IgKGtleSBpbiBvYmopXG4gICAgICByZXN1bHRba2V5XSA9IG9ialtrZXldO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyogU3RyZWFtIG1lcmdpbmcgKi9cblxuXG5mdW5jdGlvbiB0YWcobm9kZSkge1xuICByZXR1cm4gbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xufVxuXG5cbmZ1bmN0aW9uIG5vZGVTdHJlYW0obm9kZSkge1xuICB2YXIgcmVzdWx0ID0gW107XG4gIChmdW5jdGlvbiBfbm9kZVN0cmVhbShub2RlLCBvZmZzZXQpIHtcbiAgICBmb3IgKHZhciBjaGlsZCA9IG5vZGUuZmlyc3RDaGlsZDsgY2hpbGQ7IGNoaWxkID0gY2hpbGQubmV4dFNpYmxpbmcpIHtcbiAgICAgIGlmIChjaGlsZC5ub2RlVHlwZSA9PT0gMylcbiAgICAgICAgb2Zmc2V0ICs9IGNoaWxkLm5vZGVWYWx1ZS5sZW5ndGg7XG4gICAgICBlbHNlIGlmIChjaGlsZC5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgZXZlbnQ6ICdzdGFydCcsXG4gICAgICAgICAgb2Zmc2V0OiBvZmZzZXQsXG4gICAgICAgICAgbm9kZTogY2hpbGRcbiAgICAgICAgfSk7XG4gICAgICAgIG9mZnNldCA9IF9ub2RlU3RyZWFtKGNoaWxkLCBvZmZzZXQpO1xuICAgICAgICAvLyBQcmV2ZW50IHZvaWQgZWxlbWVudHMgZnJvbSBoYXZpbmcgYW4gZW5kIHRhZyB0aGF0IHdvdWxkIGFjdHVhbGx5XG4gICAgICAgIC8vIGRvdWJsZSB0aGVtIGluIHRoZSBvdXRwdXQuIFRoZXJlIGFyZSBtb3JlIHZvaWQgZWxlbWVudHMgaW4gSFRNTFxuICAgICAgICAvLyBidXQgd2UgbGlzdCBvbmx5IHRob3NlIHJlYWxpc3RpY2FsbHkgZXhwZWN0ZWQgaW4gY29kZSBkaXNwbGF5LlxuICAgICAgICBpZiAoIXRhZyhjaGlsZCkubWF0Y2goL2JyfGhyfGltZ3xpbnB1dC8pKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgICAgZXZlbnQ6ICdzdG9wJyxcbiAgICAgICAgICAgIG9mZnNldDogb2Zmc2V0LFxuICAgICAgICAgICAgbm9kZTogY2hpbGRcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2Zmc2V0O1xuICB9KShub2RlLCAwKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gbWVyZ2VTdHJlYW1zKG9yaWdpbmFsLCBoaWdobGlnaHRlZCwgdmFsdWUpIHtcbiAgdmFyIHByb2Nlc3NlZCA9IDA7XG4gIHZhciByZXN1bHQgPSAnJztcbiAgdmFyIG5vZGVTdGFjayA9IFtdO1xuXG4gIGZ1bmN0aW9uIHNlbGVjdFN0cmVhbSgpIHtcbiAgICBpZiAoIW9yaWdpbmFsLmxlbmd0aCB8fCAhaGlnaGxpZ2h0ZWQubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gb3JpZ2luYWwubGVuZ3RoID8gb3JpZ2luYWwgOiBoaWdobGlnaHRlZDtcbiAgICB9XG4gICAgaWYgKG9yaWdpbmFsWzBdLm9mZnNldCAhPT0gaGlnaGxpZ2h0ZWRbMF0ub2Zmc2V0KSB7XG4gICAgICByZXR1cm4gKG9yaWdpbmFsWzBdLm9mZnNldCA8IGhpZ2hsaWdodGVkWzBdLm9mZnNldCkgPyBvcmlnaW5hbCA6IGhpZ2hsaWdodGVkO1xuICAgIH1cblxuICAgIC8qXG4gICAgVG8gYXZvaWQgc3RhcnRpbmcgdGhlIHN0cmVhbSBqdXN0IGJlZm9yZSBpdCBzaG91bGQgc3RvcCB0aGUgb3JkZXIgaXNcbiAgICBlbnN1cmVkIHRoYXQgb3JpZ2luYWwgYWx3YXlzIHN0YXJ0cyBmaXJzdCBhbmQgY2xvc2VzIGxhc3Q6XG5cbiAgICBpZiAoZXZlbnQxID09ICdzdGFydCcgJiYgZXZlbnQyID09ICdzdGFydCcpXG4gICAgICByZXR1cm4gb3JpZ2luYWw7XG4gICAgaWYgKGV2ZW50MSA9PSAnc3RhcnQnICYmIGV2ZW50MiA9PSAnc3RvcCcpXG4gICAgICByZXR1cm4gaGlnaGxpZ2h0ZWQ7XG4gICAgaWYgKGV2ZW50MSA9PSAnc3RvcCcgJiYgZXZlbnQyID09ICdzdGFydCcpXG4gICAgICByZXR1cm4gb3JpZ2luYWw7XG4gICAgaWYgKGV2ZW50MSA9PSAnc3RvcCcgJiYgZXZlbnQyID09ICdzdG9wJylcbiAgICAgIHJldHVybiBoaWdobGlnaHRlZDtcblxuICAgIC4uLiB3aGljaCBpcyBjb2xsYXBzZWQgdG86XG4gICAgKi9cbiAgICByZXR1cm4gaGlnaGxpZ2h0ZWRbMF0uZXZlbnQgPT09ICdzdGFydCcgPyBvcmlnaW5hbCA6IGhpZ2hsaWdodGVkO1xuICB9XG5cbiAgZnVuY3Rpb24gb3Blbihub2RlKSB7XG4gICAgZnVuY3Rpb24gYXR0cl9zdHIoYSkge1xuICAgICAgcmV0dXJuICcgJyArIGEubm9kZU5hbWUgKyAnPVwiJyArIGVzY2FwZUhUTUwoYS52YWx1ZSkucmVwbGFjZSgvXCIvZywgJyZxdW90OycpICsgJ1wiJztcbiAgICB9XG4gICAgcmVzdWx0ICs9ICc8JyArIHRhZyhub2RlKSArIFtdLm1hcC5jYWxsKG5vZGUuYXR0cmlidXRlcywgYXR0cl9zdHIpLmpvaW4oJycpICsgJz4nO1xuICB9XG5cbiAgZnVuY3Rpb24gY2xvc2Uobm9kZSkge1xuICAgIHJlc3VsdCArPSAnPC8nICsgdGFnKG5vZGUpICsgJz4nO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVuZGVyKGV2ZW50KSB7XG4gICAgKGV2ZW50LmV2ZW50ID09PSAnc3RhcnQnID8gb3BlbiA6IGNsb3NlKShldmVudC5ub2RlKTtcbiAgfVxuXG4gIHdoaWxlIChvcmlnaW5hbC5sZW5ndGggfHwgaGlnaGxpZ2h0ZWQubGVuZ3RoKSB7XG4gICAgdmFyIHN0cmVhbSA9IHNlbGVjdFN0cmVhbSgpO1xuICAgIHJlc3VsdCArPSBlc2NhcGVIVE1MKHZhbHVlLnN1YnN0cmluZyhwcm9jZXNzZWQsIHN0cmVhbVswXS5vZmZzZXQpKTtcbiAgICBwcm9jZXNzZWQgPSBzdHJlYW1bMF0ub2Zmc2V0O1xuICAgIGlmIChzdHJlYW0gPT09IG9yaWdpbmFsKSB7XG4gICAgICAvKlxuICAgICAgT24gYW55IG9wZW5pbmcgb3IgY2xvc2luZyB0YWcgb2YgdGhlIG9yaWdpbmFsIG1hcmt1cCB3ZSBmaXJzdCBjbG9zZVxuICAgICAgdGhlIGVudGlyZSBoaWdobGlnaHRlZCBub2RlIHN0YWNrLCB0aGVuIHJlbmRlciB0aGUgb3JpZ2luYWwgdGFnIGFsb25nXG4gICAgICB3aXRoIGFsbCB0aGUgZm9sbG93aW5nIG9yaWdpbmFsIHRhZ3MgYXQgdGhlIHNhbWUgb2Zmc2V0IGFuZCB0aGVuXG4gICAgICByZW9wZW4gYWxsIHRoZSB0YWdzIG9uIHRoZSBoaWdobGlnaHRlZCBzdGFjay5cbiAgICAgICovXG4gICAgICBub2RlU3RhY2sucmV2ZXJzZSgpLmZvckVhY2goY2xvc2UpO1xuICAgICAgZG8ge1xuICAgICAgICByZW5kZXIoc3RyZWFtLnNwbGljZSgwLCAxKVswXSk7XG4gICAgICAgIHN0cmVhbSA9IHNlbGVjdFN0cmVhbSgpO1xuICAgICAgfSB3aGlsZSAoc3RyZWFtID09PSBvcmlnaW5hbCAmJiBzdHJlYW0ubGVuZ3RoICYmIHN0cmVhbVswXS5vZmZzZXQgPT09IHByb2Nlc3NlZCk7XG4gICAgICBub2RlU3RhY2sucmV2ZXJzZSgpLmZvckVhY2gob3Blbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChzdHJlYW1bMF0uZXZlbnQgPT09ICdzdGFydCcpIHtcbiAgICAgICAgbm9kZVN0YWNrLnB1c2goc3RyZWFtWzBdLm5vZGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZVN0YWNrLnBvcCgpO1xuICAgICAgfVxuICAgICAgcmVuZGVyKHN0cmVhbS5zcGxpY2UoMCwgMSlbMF0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0ICsgZXNjYXBlSFRNTCh2YWx1ZS5zdWJzdHIocHJvY2Vzc2VkKSk7XG59XG5cbnZhciB1dGlscyA9IC8qI19fUFVSRV9fKi9PYmplY3QuZnJlZXplKHtcbiAgX19wcm90b19fOiBudWxsLFxuICBlc2NhcGVIVE1MOiBlc2NhcGVIVE1MLFxuICBpbmhlcml0OiBpbmhlcml0LFxuICBub2RlU3RyZWFtOiBub2RlU3RyZWFtLFxuICBtZXJnZVN0cmVhbXM6IG1lcmdlU3RyZWFtc1xufSk7XG5cbmNvbnN0IFNQQU5fQ0xPU0UgPSAnPC9zcGFuPic7XG5cbmNvbnN0IGVtaXRzV3JhcHBpbmdUYWdzID0gKG5vZGUpID0+IHtcbiAgcmV0dXJuICEhbm9kZS5raW5kO1xufTtcblxuY2xhc3MgSFRNTFJlbmRlcmVyIHtcbiAgY29uc3RydWN0b3IodHJlZSwgb3B0aW9ucykge1xuICAgIHRoaXMuYnVmZmVyID0gXCJcIjtcbiAgICB0aGlzLmNsYXNzUHJlZml4ID0gb3B0aW9ucy5jbGFzc1ByZWZpeDtcbiAgICB0cmVlLndhbGsodGhpcyk7XG4gIH1cblxuICAvLyByZW5kZXJlciBBUElcblxuICBhZGRUZXh0KHRleHQpIHtcbiAgICB0aGlzLmJ1ZmZlciArPSBlc2NhcGVIVE1MKHRleHQpO1xuICB9XG5cbiAgb3Blbk5vZGUobm9kZSkge1xuICAgIGlmICghZW1pdHNXcmFwcGluZ1RhZ3Mobm9kZSkpIHJldHVybjtcblxuICAgIGxldCBjbGFzc05hbWUgPSBub2RlLmtpbmQ7XG4gICAgaWYgKCFub2RlLnN1Ymxhbmd1YWdlKVxuICAgICAgY2xhc3NOYW1lID0gYCR7dGhpcy5jbGFzc1ByZWZpeH0ke2NsYXNzTmFtZX1gO1xuICAgIHRoaXMuc3BhbihjbGFzc05hbWUpO1xuICB9XG5cbiAgY2xvc2VOb2RlKG5vZGUpIHtcbiAgICBpZiAoIWVtaXRzV3JhcHBpbmdUYWdzKG5vZGUpKSByZXR1cm47XG5cbiAgICB0aGlzLmJ1ZmZlciArPSBTUEFOX0NMT1NFO1xuICB9XG5cbiAgLy8gaGVscGVyc1xuXG4gIHNwYW4oY2xhc3NOYW1lKSB7XG4gICAgdGhpcy5idWZmZXIgKz0gYDxzcGFuIGNsYXNzPVwiJHtjbGFzc05hbWV9XCI+YDtcbiAgfVxuXG4gIHZhbHVlKCkge1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlcjtcbiAgfVxufVxuXG5jbGFzcyBUb2tlblRyZWUge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnJvb3ROb2RlID0geyBjaGlsZHJlbjogW10gfTtcbiAgICB0aGlzLnN0YWNrID0gWyB0aGlzLnJvb3ROb2RlIF07XG4gIH1cblxuICBnZXQgdG9wKCkge1xuICAgIHJldHVybiB0aGlzLnN0YWNrW3RoaXMuc3RhY2subGVuZ3RoIC0gMV07XG4gIH1cblxuICBnZXQgcm9vdCgpIHsgcmV0dXJuIHRoaXMucm9vdE5vZGUgfTtcblxuICBhZGQobm9kZSkge1xuICAgIHRoaXMudG9wLmNoaWxkcmVuLnB1c2gobm9kZSk7XG4gIH1cblxuICBvcGVuTm9kZShraW5kKSB7XG4gICAgbGV0IG5vZGUgPSB7IGtpbmQsIGNoaWxkcmVuOiBbXSB9O1xuICAgIHRoaXMuYWRkKG5vZGUpO1xuICAgIHRoaXMuc3RhY2sucHVzaChub2RlKTtcbiAgfVxuXG4gIGNsb3NlTm9kZSgpIHtcbiAgICBpZiAodGhpcy5zdGFjay5sZW5ndGggPiAxKVxuICAgICAgcmV0dXJuIHRoaXMuc3RhY2sucG9wKCk7XG4gIH1cblxuICBjbG9zZUFsbE5vZGVzKCkge1xuICAgIHdoaWxlICh0aGlzLmNsb3NlTm9kZSgpKTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5yb290Tm9kZSwgbnVsbCwgNCk7XG4gIH1cblxuICB3YWxrKGJ1aWxkZXIpIHtcbiAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5fd2FsayhidWlsZGVyLCB0aGlzLnJvb3ROb2RlKTtcbiAgfVxuXG4gIHN0YXRpYyBfd2FsayhidWlsZGVyLCBub2RlKSB7XG4gICAgaWYgKHR5cGVvZiBub2RlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBidWlsZGVyLmFkZFRleHQobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlLmNoaWxkcmVuKSB7XG4gICAgICBidWlsZGVyLm9wZW5Ob2RlKG5vZGUpO1xuICAgICAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKChjaGlsZCkgPT4gdGhpcy5fd2FsayhidWlsZGVyLCBjaGlsZCkpO1xuICAgICAgYnVpbGRlci5jbG9zZU5vZGUobm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBidWlsZGVyO1xuICB9XG5cbiAgc3RhdGljIF9jb2xsYXBzZShub2RlKSB7XG4gICAgaWYgKCFub2RlLmNoaWxkcmVuKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChub2RlLmNoaWxkcmVuLmV2ZXJ5KGVsID0+IHR5cGVvZiBlbCA9PT0gXCJzdHJpbmdcIikpIHtcbiAgICAgIG5vZGUudGV4dCA9IG5vZGUuY2hpbGRyZW4uam9pbihcIlwiKTtcbiAgICAgIGRlbGV0ZSBub2RlW1wiY2hpbGRyZW5cIl07XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjaGlsZCA9PT0gXCJzdHJpbmdcIikgcmV0dXJuO1xuICAgICAgICBUb2tlblRyZWUuX2NvbGxhcHNlKGNoaWxkKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAgQ3VycmVudGx5IHRoaXMgaXMgYWxsIHByaXZhdGUgQVBJLCBidXQgdGhpcyBpcyB0aGUgbWluaW1hbCBBUEkgbmVjZXNzYXJ5XG4gIHRoYXQgYW4gRW1pdHRlciBtdXN0IGltcGxlbWVudCB0byBmdWxseSBzdXBwb3J0IHRoZSBwYXJzZXIuXG5cbiAgTWluaW1hbCBpbnRlcmZhY2U6XG5cbiAgLSBhZGRLZXl3b3JkKHRleHQsIGtpbmQpXG4gIC0gYWRkVGV4dCh0ZXh0KVxuICAtIGFkZFN1Ymxhbmd1YWdlKGVtaXR0ZXIsIHN1YkxhbmdhdWdlTmFtZSlcbiAgLSBmaW5hbGl6ZSgpXG4gIC0gb3Blbk5vZGUoa2luZClcbiAgLSBjbG9zZU5vZGUoKVxuICAtIGNsb3NlQWxsTm9kZXMoKVxuICAtIHRvSFRNTCgpXG5cbiovXG5jbGFzcyBUb2tlblRyZWVFbWl0dGVyIGV4dGVuZHMgVG9rZW5UcmVlIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgfVxuXG4gIGFkZEtleXdvcmQodGV4dCwga2luZCkge1xuICAgIGlmICh0ZXh0ID09PSBcIlwiKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5vcGVuTm9kZShraW5kKTtcbiAgICB0aGlzLmFkZFRleHQodGV4dCk7XG4gICAgdGhpcy5jbG9zZU5vZGUoKTtcbiAgfVxuXG4gIGFkZFRleHQodGV4dCkge1xuICAgIGlmICh0ZXh0ID09PSBcIlwiKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5hZGQodGV4dCk7XG4gIH1cblxuICBhZGRTdWJsYW5ndWFnZShlbWl0dGVyLCBuYW1lKSB7XG4gICAgbGV0IG5vZGUgPSBlbWl0dGVyLnJvb3Q7XG4gICAgbm9kZS5raW5kID0gbmFtZTtcbiAgICBub2RlLnN1Ymxhbmd1YWdlID0gdHJ1ZTtcbiAgICB0aGlzLmFkZChub2RlKTtcbiAgfVxuXG4gIHRvSFRNTCgpIHtcbiAgICBsZXQgcmVuZGVyZXIgPSBuZXcgSFRNTFJlbmRlcmVyKHRoaXMsIHRoaXMub3B0aW9ucyk7XG4gICAgcmV0dXJuIHJlbmRlcmVyLnZhbHVlKCk7XG4gIH1cblxuICBmaW5hbGl6ZSgpIHtcbiAgICByZXR1cm47XG4gIH1cblxufVxuXG5mdW5jdGlvbiBlc2NhcGUodmFsdWUpIHtcbiAgcmV0dXJuIG5ldyBSZWdFeHAodmFsdWUucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyksICdtJyk7XG59XG5cbmZ1bmN0aW9uIHNvdXJjZShyZSkge1xuICAvLyBpZiBpdCdzIGEgcmVnZXggZ2V0IGl0J3Mgc291cmNlLFxuICAvLyBvdGhlcndpc2UgaXQncyBhIHN0cmluZyBhbHJlYWR5IHNvIGp1c3QgcmV0dXJuIGl0XG4gIHJldHVybiAocmUgJiYgcmUuc291cmNlKSB8fCByZTtcbn1cblxuZnVuY3Rpb24gY291bnRNYXRjaEdyb3VwcyhyZSkge1xuICByZXR1cm4gKG5ldyBSZWdFeHAocmUudG9TdHJpbmcoKSArICd8JykpLmV4ZWMoJycpLmxlbmd0aCAtIDE7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0c1dpdGgocmUsIGxleGVtZSkge1xuICB2YXIgbWF0Y2ggPSByZSAmJiByZS5leGVjKGxleGVtZSk7XG4gIHJldHVybiBtYXRjaCAmJiBtYXRjaC5pbmRleCA9PT0gMDtcbn1cblxuLy8gam9pbiBsb2dpY2FsbHkgY29tcHV0ZXMgcmVnZXhwcy5qb2luKHNlcGFyYXRvciksIGJ1dCBmaXhlcyB0aGVcbi8vIGJhY2tyZWZlcmVuY2VzIHNvIHRoZXkgY29udGludWUgdG8gbWF0Y2guXG4vLyBpdCBhbHNvIHBsYWNlcyBlYWNoIGluZGl2aWR1YWwgcmVndWxhciBleHByZXNzaW9uIGludG8gaXQncyBvd25cbi8vIG1hdGNoIGdyb3VwLCBrZWVwaW5nIHRyYWNrIG9mIHRoZSBzZXF1ZW5jaW5nIG9mIHRob3NlIG1hdGNoIGdyb3Vwc1xuLy8gaXMgY3VycmVudGx5IGFuIGV4ZXJjaXNlIGZvciB0aGUgY2FsbGVyLiA6LSlcbmZ1bmN0aW9uIGpvaW4ocmVnZXhwcywgc2VwYXJhdG9yKSB7XG4gIC8vIGJhY2tyZWZlcmVuY2VSZSBtYXRjaGVzIGFuIG9wZW4gcGFyZW50aGVzaXMgb3IgYmFja3JlZmVyZW5jZS4gVG8gYXZvaWRcbiAgLy8gYW4gaW5jb3JyZWN0IHBhcnNlLCBpdCBhZGRpdGlvbmFsbHkgbWF0Y2hlcyB0aGUgZm9sbG93aW5nOlxuICAvLyAtIFsuLi5dIGVsZW1lbnRzLCB3aGVyZSB0aGUgbWVhbmluZyBvZiBwYXJlbnRoZXNlcyBhbmQgZXNjYXBlcyBjaGFuZ2VcbiAgLy8gLSBvdGhlciBlc2NhcGUgc2VxdWVuY2VzLCBzbyB3ZSBkbyBub3QgbWlzcGFyc2UgZXNjYXBlIHNlcXVlbmNlcyBhc1xuICAvLyAgIGludGVyZXN0aW5nIGVsZW1lbnRzXG4gIC8vIC0gbm9uLW1hdGNoaW5nIG9yIGxvb2thaGVhZCBwYXJlbnRoZXNlcywgd2hpY2ggZG8gbm90IGNhcHR1cmUuIFRoZXNlXG4gIC8vICAgZm9sbG93IHRoZSAnKCcgd2l0aCBhICc/Jy5cbiAgdmFyIGJhY2tyZWZlcmVuY2VSZSA9IC9cXFsoPzpbXlxcXFxcXF1dfFxcXFwuKSpcXF18XFwoXFw/P3xcXFxcKFsxLTldWzAtOV0qKXxcXFxcLi87XG4gIHZhciBudW1DYXB0dXJlcyA9IDA7XG4gIHZhciByZXQgPSAnJztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZWdleHBzLmxlbmd0aDsgaSsrKSB7XG4gICAgbnVtQ2FwdHVyZXMgKz0gMTtcbiAgICB2YXIgb2Zmc2V0ID0gbnVtQ2FwdHVyZXM7XG4gICAgdmFyIHJlID0gc291cmNlKHJlZ2V4cHNbaV0pO1xuICAgIGlmIChpID4gMCkge1xuICAgICAgcmV0ICs9IHNlcGFyYXRvcjtcbiAgICB9XG4gICAgcmV0ICs9IFwiKFwiO1xuICAgIHdoaWxlIChyZS5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgbWF0Y2ggPSBiYWNrcmVmZXJlbmNlUmUuZXhlYyhyZSk7XG4gICAgICBpZiAobWF0Y2ggPT0gbnVsbCkge1xuICAgICAgICByZXQgKz0gcmU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmV0ICs9IHJlLnN1YnN0cmluZygwLCBtYXRjaC5pbmRleCk7XG4gICAgICByZSA9IHJlLnN1YnN0cmluZyhtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICBpZiAobWF0Y2hbMF1bMF0gPT0gJ1xcXFwnICYmIG1hdGNoWzFdKSB7XG4gICAgICAgIC8vIEFkanVzdCB0aGUgYmFja3JlZmVyZW5jZS5cbiAgICAgICAgcmV0ICs9ICdcXFxcJyArIFN0cmluZyhOdW1iZXIobWF0Y2hbMV0pICsgb2Zmc2V0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldCArPSBtYXRjaFswXTtcbiAgICAgICAgaWYgKG1hdGNoWzBdID09ICcoJykge1xuICAgICAgICAgIG51bUNhcHR1cmVzKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0ICs9IFwiKVwiO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbi8vIENvbW1vbiByZWdleHBzXG5jb25zdCBJREVOVF9SRSA9ICdbYS16QS1aXVxcXFx3Kic7XG5jb25zdCBVTkRFUlNDT1JFX0lERU5UX1JFID0gJ1thLXpBLVpfXVxcXFx3Kic7XG5jb25zdCBOVU1CRVJfUkUgPSAnXFxcXGJcXFxcZCsoXFxcXC5cXFxcZCspPyc7XG5jb25zdCBDX05VTUJFUl9SRSA9ICcoLT8pKFxcXFxiMFt4WF1bYS1mQS1GMC05XSt8KFxcXFxiXFxcXGQrKFxcXFwuXFxcXGQqKT98XFxcXC5cXFxcZCspKFtlRV1bLStdP1xcXFxkKyk/KSc7IC8vIDB4Li4uLCAwLi4uLCBkZWNpbWFsLCBmbG9hdFxuY29uc3QgQklOQVJZX05VTUJFUl9SRSA9ICdcXFxcYigwYlswMV0rKSc7IC8vIDBiLi4uXG5jb25zdCBSRV9TVEFSVEVSU19SRSA9ICchfCE9fCE9PXwlfCU9fCZ8JiZ8Jj18XFxcXCp8XFxcXCo9fFxcXFwrfFxcXFwrPXwsfC18LT18Lz18L3w6fDt8PDx8PDw9fDw9fDx8PT09fD09fD18Pj4+PXw+Pj18Pj18Pj4+fD4+fD58XFxcXD98XFxcXFt8XFxcXHt8XFxcXCh8XFxcXF58XFxcXF49fFxcXFx8fFxcXFx8PXxcXFxcfFxcXFx8fH4nO1xuXG4vLyBDb21tb24gbW9kZXNcbmNvbnN0IEJBQ0tTTEFTSF9FU0NBUEUgPSB7XG4gIGJlZ2luOiAnXFxcXFxcXFxbXFxcXHNcXFxcU10nLCByZWxldmFuY2U6IDBcbn07XG5jb25zdCBBUE9TX1NUUklOR19NT0RFID0ge1xuICBjbGFzc05hbWU6ICdzdHJpbmcnLFxuICBiZWdpbjogJ1xcJycsIGVuZDogJ1xcJycsXG4gIGlsbGVnYWw6ICdcXFxcbicsXG4gIGNvbnRhaW5zOiBbQkFDS1NMQVNIX0VTQ0FQRV1cbn07XG5jb25zdCBRVU9URV9TVFJJTkdfTU9ERSA9IHtcbiAgY2xhc3NOYW1lOiAnc3RyaW5nJyxcbiAgYmVnaW46ICdcIicsIGVuZDogJ1wiJyxcbiAgaWxsZWdhbDogJ1xcXFxuJyxcbiAgY29udGFpbnM6IFtCQUNLU0xBU0hfRVNDQVBFXVxufTtcbmNvbnN0IFBIUkFTQUxfV09SRFNfTU9ERSA9IHtcbiAgYmVnaW46IC9cXGIoYXxhbnx0aGV8YXJlfEknbXxpc24ndHxkb24ndHxkb2Vzbid0fHdvbid0fGJ1dHxqdXN0fHNob3VsZHxwcmV0dHl8c2ltcGx5fGVub3VnaHxnb25uYXxnb2luZ3x3dGZ8c298c3VjaHx3aWxsfHlvdXx5b3VyfHRoZXl8bGlrZXxtb3JlKVxcYi9cbn07XG5jb25zdCBDT01NRU5UID0gZnVuY3Rpb24gKGJlZ2luLCBlbmQsIGluaGVyaXRzKSB7XG4gIHZhciBtb2RlID0gaW5oZXJpdChcbiAgICB7XG4gICAgICBjbGFzc05hbWU6ICdjb21tZW50JyxcbiAgICAgIGJlZ2luOiBiZWdpbiwgZW5kOiBlbmQsXG4gICAgICBjb250YWluczogW11cbiAgICB9LFxuICAgIGluaGVyaXRzIHx8IHt9XG4gICk7XG4gIG1vZGUuY29udGFpbnMucHVzaChQSFJBU0FMX1dPUkRTX01PREUpO1xuICBtb2RlLmNvbnRhaW5zLnB1c2goe1xuICAgIGNsYXNzTmFtZTogJ2RvY3RhZycsXG4gICAgYmVnaW46ICcoPzpUT0RPfEZJWE1FfE5PVEV8QlVHfFhYWCk6JyxcbiAgICByZWxldmFuY2U6IDBcbiAgfSk7XG4gIHJldHVybiBtb2RlO1xufTtcbmNvbnN0IENfTElORV9DT01NRU5UX01PREUgPSBDT01NRU5UKCcvLycsICckJyk7XG5jb25zdCBDX0JMT0NLX0NPTU1FTlRfTU9ERSA9IENPTU1FTlQoJy9cXFxcKicsICdcXFxcKi8nKTtcbmNvbnN0IEhBU0hfQ09NTUVOVF9NT0RFID0gQ09NTUVOVCgnIycsICckJyk7XG5jb25zdCBOVU1CRVJfTU9ERSA9IHtcbiAgY2xhc3NOYW1lOiAnbnVtYmVyJyxcbiAgYmVnaW46IE5VTUJFUl9SRSxcbiAgcmVsZXZhbmNlOiAwXG59O1xuY29uc3QgQ19OVU1CRVJfTU9ERSA9IHtcbiAgY2xhc3NOYW1lOiAnbnVtYmVyJyxcbiAgYmVnaW46IENfTlVNQkVSX1JFLFxuICByZWxldmFuY2U6IDBcbn07XG5jb25zdCBCSU5BUllfTlVNQkVSX01PREUgPSB7XG4gIGNsYXNzTmFtZTogJ251bWJlcicsXG4gIGJlZ2luOiBCSU5BUllfTlVNQkVSX1JFLFxuICByZWxldmFuY2U6IDBcbn07XG5jb25zdCBDU1NfTlVNQkVSX01PREUgPSB7XG4gIGNsYXNzTmFtZTogJ251bWJlcicsXG4gIGJlZ2luOiBOVU1CRVJfUkUgKyAnKCcgK1xuICAgICclfGVtfGV4fGNofHJlbScgICtcbiAgICAnfHZ3fHZofHZtaW58dm1heCcgK1xuICAgICd8Y218bW18aW58cHR8cGN8cHgnICtcbiAgICAnfGRlZ3xncmFkfHJhZHx0dXJuJyArXG4gICAgJ3xzfG1zJyArXG4gICAgJ3xIenxrSHonICtcbiAgICAnfGRwaXxkcGNtfGRwcHgnICtcbiAgICAnKT8nLFxuICByZWxldmFuY2U6IDBcbn07XG5jb25zdCBSRUdFWFBfTU9ERSA9IHtcbiAgLy8gdGhpcyBvdXRlciBydWxlIG1ha2VzIHN1cmUgd2UgYWN0dWFsbHkgaGF2ZSBhIFdIT0xFIHJlZ2V4IGFuZCBub3Qgc2ltcGx5XG4gIC8vIGFuIGV4cHJlc3Npb24gc3VjaCBhczpcbiAgLy9cbiAgLy8gICAgIDMgLyBzb21ldGhpbmdcbiAgLy9cbiAgLy8gKHdoaWNoIHdpbGwgdGhlbiBibG93IHVwIHdoZW4gcmVnZXgncyBgaWxsZWdhbGAgc2VlcyB0aGUgbmV3bGluZSlcbiAgYmVnaW46IC8oPz1cXC9bXlxcL1xcbl0qXFwvKS8sXG4gIGNvbnRhaW5zOiBbe1xuICAgIGNsYXNzTmFtZTogJ3JlZ2V4cCcsXG4gICAgYmVnaW46IC9cXC8vLCBlbmQ6IC9cXC9bZ2ltdXldKi8sXG4gICAgaWxsZWdhbDogL1xcbi8sXG4gICAgY29udGFpbnM6IFtcbiAgICAgIEJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICB7XG4gICAgICAgIGJlZ2luOiAvXFxbLywgZW5kOiAvXFxdLyxcbiAgICAgICAgcmVsZXZhbmNlOiAwLFxuICAgICAgICBjb250YWluczogW0JBQ0tTTEFTSF9FU0NBUEVdXG4gICAgICB9XG4gICAgXVxuICB9XVxufTtcbmNvbnN0IFRJVExFX01PREUgPSB7XG4gIGNsYXNzTmFtZTogJ3RpdGxlJyxcbiAgYmVnaW46IElERU5UX1JFLFxuICByZWxldmFuY2U6IDBcbn07XG5jb25zdCBVTkRFUlNDT1JFX1RJVExFX01PREUgPSB7XG4gIGNsYXNzTmFtZTogJ3RpdGxlJyxcbiAgYmVnaW46IFVOREVSU0NPUkVfSURFTlRfUkUsXG4gIHJlbGV2YW5jZTogMFxufTtcbmNvbnN0IE1FVEhPRF9HVUFSRCA9IHtcbiAgLy8gZXhjbHVkZXMgbWV0aG9kIG5hbWVzIGZyb20ga2V5d29yZCBwcm9jZXNzaW5nXG4gIGJlZ2luOiAnXFxcXC5cXFxccyonICsgVU5ERVJTQ09SRV9JREVOVF9SRSxcbiAgcmVsZXZhbmNlOiAwXG59O1xuXG52YXIgTU9ERVMgPSAvKiNfX1BVUkVfXyovT2JqZWN0LmZyZWV6ZSh7XG4gIF9fcHJvdG9fXzogbnVsbCxcbiAgSURFTlRfUkU6IElERU5UX1JFLFxuICBVTkRFUlNDT1JFX0lERU5UX1JFOiBVTkRFUlNDT1JFX0lERU5UX1JFLFxuICBOVU1CRVJfUkU6IE5VTUJFUl9SRSxcbiAgQ19OVU1CRVJfUkU6IENfTlVNQkVSX1JFLFxuICBCSU5BUllfTlVNQkVSX1JFOiBCSU5BUllfTlVNQkVSX1JFLFxuICBSRV9TVEFSVEVSU19SRTogUkVfU1RBUlRFUlNfUkUsXG4gIEJBQ0tTTEFTSF9FU0NBUEU6IEJBQ0tTTEFTSF9FU0NBUEUsXG4gIEFQT1NfU1RSSU5HX01PREU6IEFQT1NfU1RSSU5HX01PREUsXG4gIFFVT1RFX1NUUklOR19NT0RFOiBRVU9URV9TVFJJTkdfTU9ERSxcbiAgUEhSQVNBTF9XT1JEU19NT0RFOiBQSFJBU0FMX1dPUkRTX01PREUsXG4gIENPTU1FTlQ6IENPTU1FTlQsXG4gIENfTElORV9DT01NRU5UX01PREU6IENfTElORV9DT01NRU5UX01PREUsXG4gIENfQkxPQ0tfQ09NTUVOVF9NT0RFOiBDX0JMT0NLX0NPTU1FTlRfTU9ERSxcbiAgSEFTSF9DT01NRU5UX01PREU6IEhBU0hfQ09NTUVOVF9NT0RFLFxuICBOVU1CRVJfTU9ERTogTlVNQkVSX01PREUsXG4gIENfTlVNQkVSX01PREU6IENfTlVNQkVSX01PREUsXG4gIEJJTkFSWV9OVU1CRVJfTU9ERTogQklOQVJZX05VTUJFUl9NT0RFLFxuICBDU1NfTlVNQkVSX01PREU6IENTU19OVU1CRVJfTU9ERSxcbiAgUkVHRVhQX01PREU6IFJFR0VYUF9NT0RFLFxuICBUSVRMRV9NT0RFOiBUSVRMRV9NT0RFLFxuICBVTkRFUlNDT1JFX1RJVExFX01PREU6IFVOREVSU0NPUkVfVElUTEVfTU9ERSxcbiAgTUVUSE9EX0dVQVJEOiBNRVRIT0RfR1VBUkRcbn0pO1xuXG4vLyBrZXl3b3JkcyB0aGF0IHNob3VsZCBoYXZlIG5vIGRlZmF1bHQgcmVsZXZhbmNlIHZhbHVlXG52YXIgQ09NTU9OX0tFWVdPUkRTID0gJ29mIGFuZCBmb3IgaW4gbm90IG9yIGlmIHRoZW4nLnNwbGl0KCcgJyk7XG5cbi8vIGNvbXBpbGF0aW9uXG5cbmZ1bmN0aW9uIGNvbXBpbGVMYW5ndWFnZShsYW5ndWFnZSkge1xuXG4gIGZ1bmN0aW9uIGxhbmdSZSh2YWx1ZSwgZ2xvYmFsKSB7XG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoXG4gICAgICBzb3VyY2UodmFsdWUpLFxuICAgICAgJ20nICsgKGxhbmd1YWdlLmNhc2VfaW5zZW5zaXRpdmUgPyAnaScgOiAnJykgKyAoZ2xvYmFsID8gJ2cnIDogJycpXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgIFN0b3JlcyBtdWx0aXBsZSByZWd1bGFyIGV4cHJlc3Npb25zIGFuZCBhbGxvd3MgeW91IHRvIHF1aWNrbHkgc2VhcmNoIGZvclxuICAgIHRoZW0gYWxsIGluIGEgc3RyaW5nIHNpbXVsdGFuZW91c2x5IC0gcmV0dXJuaW5nIHRoZSBmaXJzdCBtYXRjaC4gIEl0IGRvZXNcbiAgICB0aGlzIGJ5IGNyZWF0aW5nIGEgaHVnZSAoYXxifGMpIHJlZ2V4IC0gZWFjaCBpbmRpdmlkdWFsIGl0ZW0gd3JhcHBlZCB3aXRoICgpXG4gICAgYW5kIGpvaW5lZCBieSBgfGAgLSB1c2luZyBtYXRjaCBncm91cHMgdG8gdHJhY2sgcG9zaXRpb24uICBXaGVuIGEgbWF0Y2ggaXNcbiAgICBmb3VuZCBjaGVja2luZyB3aGljaCBwb3NpdGlvbiBpbiB0aGUgYXJyYXkgaGFzIGNvbnRlbnQgYWxsb3dzIHVzIHRvIGZpZ3VyZVxuICAgIG91dCB3aGljaCBvZiB0aGUgb3JpZ2luYWwgcmVnZXhlcyAvIG1hdGNoIGdyb3VwcyB0cmlnZ2VyZWQgdGhlIG1hdGNoLlxuXG4gICAgVGhlIG1hdGNoIG9iamVjdCBpdHNlbGYgKHRoZSByZXN1bHQgb2YgYFJlZ2V4LmV4ZWNgKSBpcyByZXR1cm5lZCBidXQgYWxzb1xuICAgIGVuaGFuY2VkIGJ5IG1lcmdpbmcgaW4gYW55IG1ldGEtZGF0YSB0aGF0IHdhcyByZWdpc3RlcmVkIHdpdGggdGhlIHJlZ2V4LlxuICAgIFRoaXMgaXMgaG93IHdlIGtlZXAgdHJhY2sgb2Ygd2hpY2ggbW9kZSBtYXRjaGVkLCBhbmQgd2hhdCB0eXBlIG9mIHJ1bGVcbiAgICAoYGlsbGVnYWxgLCBgYmVnaW5gLCBlbmQsIGV0YykuXG4gICovXG4gIGNsYXNzIE11bHRpUmVnZXgge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgdGhpcy5tYXRjaEluZGV4ZXMgPSB7fTtcbiAgICAgIHRoaXMucmVnZXhlcyA9IFtdO1xuICAgICAgdGhpcy5tYXRjaEF0ID0gMTtcbiAgICAgIHRoaXMucG9zaXRpb24gPSAwO1xuICAgIH1cblxuICAgIGFkZFJ1bGUocmUsIG9wdHMpIHtcbiAgICAgIG9wdHMucG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uKys7XG4gICAgICB0aGlzLm1hdGNoSW5kZXhlc1t0aGlzLm1hdGNoQXRdID0gb3B0cztcbiAgICAgIHRoaXMucmVnZXhlcy5wdXNoKFtvcHRzLCByZV0pO1xuICAgICAgdGhpcy5tYXRjaEF0ICs9IGNvdW50TWF0Y2hHcm91cHMocmUpICsgMTtcbiAgICB9XG5cbiAgICBjb21waWxlKCkge1xuICAgICAgaWYgKHRoaXMucmVnZXhlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gYXZvaWRzIHRoZSBuZWVkIHRvIGNoZWNrIGxlbmd0aCBldmVyeSB0aW1lIGV4ZWMgaXMgY2FsbGVkXG4gICAgICAgIHRoaXMuZXhlYyA9ICgpID0+IG51bGw7XG4gICAgICB9XG4gICAgICBsZXQgdGVybWluYXRvcnMgPSB0aGlzLnJlZ2V4ZXMubWFwKGVsID0+IGVsWzFdKTtcbiAgICAgIHRoaXMubWF0Y2hlclJlID0gbGFuZ1JlKGpvaW4odGVybWluYXRvcnMsICd8JyksIHRydWUpO1xuICAgICAgdGhpcy5sYXN0SW5kZXggPSAwO1xuICAgIH1cblxuICAgIGV4ZWMocykge1xuICAgICAgdGhpcy5tYXRjaGVyUmUubGFzdEluZGV4ID0gdGhpcy5sYXN0SW5kZXg7XG4gICAgICBsZXQgbWF0Y2ggPSB0aGlzLm1hdGNoZXJSZS5leGVjKHMpO1xuICAgICAgaWYgKCFtYXRjaCkgeyByZXR1cm4gbnVsbDsgfVxuXG4gICAgICBsZXQgaSA9IG1hdGNoLmZpbmRJbmRleCgoZWwsIGkpID0+IGk+MCAmJiBlbCE9dW5kZWZpbmVkKTtcbiAgICAgIGxldCBtYXRjaERhdGEgPSB0aGlzLm1hdGNoSW5kZXhlc1tpXTtcblxuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24obWF0Y2gsIG1hdGNoRGF0YSk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICBDcmVhdGVkIHRvIHNvbHZlIHRoZSBrZXkgZGVmaWNpZW50bHkgd2l0aCBNdWx0aVJlZ2V4IC0gdGhlcmUgaXMgbm8gd2F5IHRvXG4gICAgdGVzdCBmb3IgbXVsdGlwbGUgbWF0Y2hlcyBhdCBhIHNpbmdsZSBsb2NhdGlvbi4gIFdoeSB3b3VsZCB3ZSBuZWVkIHRvIGRvXG4gICAgdGhhdD8gIEluIHRoZSBmdXR1cmUgYSBtb3JlIGR5bmFtaWMgZW5naW5lIHdpbGwgYWxsb3cgY2VydGFpbiBtYXRjaGVzIHRvIGJlXG4gICAgaWdub3JlZC4gIEFuIGV4YW1wbGU6IGlmIHdlIG1hdGNoZWQgc2F5IHRoZSAzcmQgcmVnZXggaW4gYSBsYXJnZSBncm91cCBidXRcbiAgICBkZWNpZGVkIHRvIGlnbm9yZSBpdCAtIHdlJ2QgbmVlZCB0byBzdGFydGVkIHRlc3RpbmcgYWdhaW4gYXQgdGhlIDR0aFxuICAgIHJlZ2V4Li4uIGJ1dCBNdWx0aVJlZ2V4IGl0c2VsZiBnaXZlcyB1cyBubyByZWFsIHdheSB0byBkbyB0aGF0LlxuXG4gICAgU28gd2hhdCB0aGlzIGNsYXNzIGNyZWF0ZXMgTXVsdGlSZWdleHMgb24gdGhlIGZseSBmb3Igd2hhdGV2ZXIgc2VhcmNoXG4gICAgcG9zaXRpb24gdGhleSBhcmUgbmVlZGVkLlxuXG4gICAgTk9URTogVGhlc2UgYWRkaXRpb25hbCBNdWx0aVJlZ2V4IG9iamVjdHMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHkuICBGb3IgbW9zdFxuICAgIGdyYW1tYXJzIG1vc3Qgb2YgdGhlIHRpbWUgd2Ugd2lsbCBuZXZlciBhY3R1YWxseSBuZWVkIGFueXRoaW5nIG1vcmUgdGhhbiB0aGVcbiAgICBmaXJzdCBNdWx0aVJlZ2V4IC0gc28gdGhpcyBzaG91bGRuJ3QgaGF2ZSB0b28gbXVjaCBvdmVyaGVhZC5cblxuICAgIFNheSB0aGlzIGlzIG91ciBzZWFyY2ggZ3JvdXAsIGFuZCB3ZSBtYXRjaCByZWdleDMsIGJ1dCB3aXNoIHRvIGlnbm9yZSBpdC5cblxuICAgICAgcmVnZXgxIHwgcmVnZXgyIHwgcmVnZXgzIHwgcmVnZXg0IHwgcmVnZXg1ICAgICcgaWUsIHN0YXJ0QXQgPSAwXG5cbiAgICBXaGF0IHdlIG5lZWQgaXMgYSBuZXcgTXVsdGlSZWdleCB0aGF0IG9ubHkgaW5jbHVkZXMgdGhlIHJlbWFpbmluZ1xuICAgIHBvc3NpYmlsaXRpZXM6XG5cbiAgICAgIHJlZ2V4NCB8IHJlZ2V4NSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnIGllLCBzdGFydEF0ID0gM1xuXG4gICAgVGhpcyBjbGFzcyB3cmFwcyBhbGwgdGhhdCBjb21wbGV4aXR5IHVwIGluIGEgc2ltcGxlIEFQSS4uLiBgc3RhcnRBdGAgZGVjaWRlc1xuICAgIHdoZXJlIGluIHRoZSBhcnJheSBvZiBleHByZXNzaW9ucyB0byBzdGFydCBkb2luZyB0aGUgbWF0Y2hpbmcuIEl0XG4gICAgYXV0by1pbmNyZW1lbnRzLCBzbyBpZiBhIG1hdGNoIGlzIGZvdW5kIGF0IHBvc2l0aW9uIDIsIHRoZW4gc3RhcnRBdCB3aWxsIGJlXG4gICAgc2V0IHRvIDMuICBJZiB0aGUgZW5kIGlzIHJlYWNoZWQgc3RhcnRBdCB3aWxsIHJldHVybiB0byAwLlxuXG4gICAgTU9TVCBvZiB0aGUgdGltZSB0aGUgcGFyc2VyIHdpbGwgYmUgc2V0dGluZyBzdGFydEF0IG1hbnVhbGx5IHRvIDAuXG4gICovXG4gIGNsYXNzIFJlc3VtYWJsZU11bHRpUmVnZXgge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgdGhpcy5ydWxlcyA9IFtdO1xuICAgICAgdGhpcy5tdWx0aVJlZ2V4ZXMgPSBbXTtcbiAgICAgIHRoaXMuY291bnQgPSAwO1xuXG4gICAgICB0aGlzLmxhc3RJbmRleCA9IDA7XG4gICAgICB0aGlzLnJlZ2V4SW5kZXggPSAwO1xuICAgIH1cblxuICAgIGdldE1hdGNoZXIoaW5kZXgpIHtcbiAgICAgIGlmICh0aGlzLm11bHRpUmVnZXhlc1tpbmRleF0pIHJldHVybiB0aGlzLm11bHRpUmVnZXhlc1tpbmRleF07XG5cbiAgICAgIGxldCBtYXRjaGVyID0gbmV3IE11bHRpUmVnZXgoKTtcbiAgICAgIHRoaXMucnVsZXMuc2xpY2UoaW5kZXgpLmZvckVhY2goKFtyZSwgb3B0c10pPT4gbWF0Y2hlci5hZGRSdWxlKHJlLG9wdHMpKTtcbiAgICAgIG1hdGNoZXIuY29tcGlsZSgpO1xuICAgICAgdGhpcy5tdWx0aVJlZ2V4ZXNbaW5kZXhdID0gbWF0Y2hlcjtcbiAgICAgIHJldHVybiBtYXRjaGVyO1xuICAgIH1cblxuICAgIGNvbnNpZGVyQWxsKCkge1xuICAgICAgdGhpcy5yZWdleEluZGV4ID0gMDtcbiAgICB9XG5cbiAgICBhZGRSdWxlKHJlLCBvcHRzKSB7XG4gICAgICB0aGlzLnJ1bGVzLnB1c2goW3JlLCBvcHRzXSk7XG4gICAgICBpZiAob3B0cy50eXBlPT09XCJiZWdpblwiKSB0aGlzLmNvdW50Kys7XG4gICAgfVxuXG4gICAgZXhlYyhzKSB7XG4gICAgICBsZXQgbSA9IHRoaXMuZ2V0TWF0Y2hlcih0aGlzLnJlZ2V4SW5kZXgpO1xuICAgICAgbS5sYXN0SW5kZXggPSB0aGlzLmxhc3RJbmRleDtcbiAgICAgIGxldCByZXN1bHQgPSBtLmV4ZWMocyk7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIHRoaXMucmVnZXhJbmRleCArPSByZXN1bHQucG9zaXRpb24gKyAxO1xuICAgICAgICBpZiAodGhpcy5yZWdleEluZGV4ID09PSB0aGlzLmNvdW50KSAvLyB3cmFwLWFyb3VuZFxuICAgICAgICAgIHRoaXMucmVnZXhJbmRleCA9IDA7XG4gICAgICB9XG5cbiAgICAgIC8vIHRoaXMucmVnZXhJbmRleCA9IDA7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1aWxkTW9kZVJlZ2V4KG1vZGUpIHtcblxuICAgIGxldCBtbSA9IG5ldyBSZXN1bWFibGVNdWx0aVJlZ2V4KCk7XG5cbiAgICBtb2RlLmNvbnRhaW5zLmZvckVhY2godGVybSA9PiBtbS5hZGRSdWxlKHRlcm0uYmVnaW4sIHtydWxlOiB0ZXJtLCB0eXBlOiBcImJlZ2luXCIgfSkpO1xuXG4gICAgaWYgKG1vZGUudGVybWluYXRvcl9lbmQpXG4gICAgICBtbS5hZGRSdWxlKG1vZGUudGVybWluYXRvcl9lbmQsIHt0eXBlOiBcImVuZFwifSApO1xuICAgIGlmIChtb2RlLmlsbGVnYWwpXG4gICAgICBtbS5hZGRSdWxlKG1vZGUuaWxsZWdhbCwge3R5cGU6IFwiaWxsZWdhbFwifSApO1xuXG4gICAgcmV0dXJuIG1tO1xuICB9XG5cbiAgLy8gVE9ETzogV2UgbmVlZCBuZWdhdGl2ZSBsb29rLWJlaGluZCBzdXBwb3J0IHRvIGRvIHRoaXMgcHJvcGVybHlcbiAgZnVuY3Rpb24gc2tpcElmaGFzUHJlY2VkaW5nT3JUcmFpbGluZ0RvdChtYXRjaCkge1xuICAgIGxldCBiZWZvcmUgPSBtYXRjaC5pbnB1dFttYXRjaC5pbmRleC0xXTtcbiAgICBsZXQgYWZ0ZXIgPSBtYXRjaC5pbnB1dFttYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aF07XG4gICAgaWYgKGJlZm9yZSA9PT0gXCIuXCIgfHwgYWZ0ZXIgPT09IFwiLlwiKSB7XG4gICAgICByZXR1cm4ge2lnbm9yZU1hdGNoOiB0cnVlIH07XG4gICAgfVxuICB9XG5cbiAgLyoqIHNraXAgdnMgYWJvcnQgdnMgaWdub3JlXG4gICAqXG4gICAqIEBza2lwICAgLSBUaGUgbW9kZSBpcyBzdGlsbCBlbnRlcmVkIGFuZCBleGl0ZWQgbm9ybWFsbHkgKGFuZCBjb250YWlucyBydWxlcyBhcHBseSksXG4gICAqICAgICAgICAgICBidXQgYWxsIGNvbnRlbnQgaXMgaGVsZCBhbmQgYWRkZWQgdG8gdGhlIHBhcmVudCBidWZmZXIgcmF0aGVyIHRoYW4gYmVpbmdcbiAgICogICAgICAgICAgIG91dHB1dCB3aGVuIHRoZSBtb2RlIGVuZHMuICBNb3N0bHkgdXNlZCB3aXRoIGBzdWJsYW5ndWFnZWAgdG8gYnVpbGQgdXBcbiAgICogICAgICAgICAgIGEgc2luZ2xlIGxhcmdlIGJ1ZmZlciB0aGFuIGNhbiBiZSBwYXJzZWQgYnkgc3VibGFuZ3VhZ2UuXG4gICAqXG4gICAqICAgICAgICAgICAgIC0gVGhlIG1vZGUgYmVnaW4gYW5kcyBlbmRzIG5vcm1hbGx5LlxuICAgKiAgICAgICAgICAgICAtIENvbnRlbnQgbWF0Y2hlZCBpcyBhZGRlZCB0byB0aGUgcGFyZW50IG1vZGUgYnVmZmVyLlxuICAgKiAgICAgICAgICAgICAtIFRoZSBwYXJzZXIgY3Vyc29yIGlzIG1vdmVkIGZvcndhcmQgbm9ybWFsbHkuXG4gICAqXG4gICAqIEBhYm9ydCAgLSBBIGhhY2sgcGxhY2Vob2xkZXIgdW50aWwgd2UgaGF2ZSBpZ25vcmUuICBBYm9ydHMgdGhlIG1vZGUgKGFzIGlmIGl0XG4gICAqICAgICAgICAgICBuZXZlciBtYXRjaGVkKSBidXQgRE9FUyBOT1QgY29udGludWUgdG8gbWF0Y2ggc3Vic2VxdWVudCBgY29udGFpbnNgXG4gICAqICAgICAgICAgICBtb2Rlcy4gIEFib3J0IGlzIGJhZC9zdWJvcHRpbWFsIGJlY2F1c2UgaXQgY2FuIHJlc3VsdCBpbiBtb2Rlc1xuICAgKiAgICAgICAgICAgZmFydGhlciBkb3duIG5vdCBnZXR0aW5nIGFwcGxpZWQgYmVjYXVzZSBhbiBlYXJsaWVyIHJ1bGUgZWF0cyB0aGVcbiAgICogICAgICAgICAgIGNvbnRlbnQgYnV0IHRoZW4gYWJvcnRzLlxuICAgKlxuICAgKiAgICAgICAgICAgICAtIFRoZSBtb2RlIGRvZXMgbm90IGJlZ2luLlxuICAgKiAgICAgICAgICAgICAtIENvbnRlbnQgbWF0Y2hlZCBieSBgYmVnaW5gIGlzIGFkZGVkIHRvIHRoZSBtb2RlIGJ1ZmZlci5cbiAgICogICAgICAgICAgICAgLSBUaGUgcGFyc2VyIGN1cnNvciBpcyBtb3ZlZCBmb3J3YXJkIGFjY29yZGluZ2x5LlxuICAgKlxuICAgKiBAaWdub3JlIC0gSWdub3JlcyB0aGUgbW9kZSAoYXMgaWYgaXQgbmV2ZXIgbWF0Y2hlZCkgYW5kIGNvbnRpbnVlcyB0byBtYXRjaCBhbnlcbiAgICogICAgICAgICAgIHN1YnNlcXVlbnQgYGNvbnRhaW5zYCBtb2Rlcy4gIElnbm9yZSBpc24ndCB0ZWNobmljYWxseSBwb3NzaWJsZSB3aXRoXG4gICAqICAgICAgICAgICB0aGUgY3VycmVudCBwYXJzZXIgaW1wbGVtZW50YXRpb24uXG4gICAqXG4gICAqICAgICAgICAgICAgIC0gVGhlIG1vZGUgZG9lcyBub3QgYmVnaW4uXG4gICAqICAgICAgICAgICAgIC0gQ29udGVudCBtYXRjaGVkIGJ5IGBiZWdpbmAgaXMgaWdub3JlZC5cbiAgICogICAgICAgICAgICAgLSBUaGUgcGFyc2VyIGN1cnNvciBpcyBub3QgbW92ZWQgZm9yd2FyZC5cbiAgICovXG5cbiAgZnVuY3Rpb24gY29tcGlsZU1vZGUobW9kZSwgcGFyZW50KSB7XG4gICAgaWYgKG1vZGUuY29tcGlsZWQpXG4gICAgICByZXR1cm47XG4gICAgbW9kZS5jb21waWxlZCA9IHRydWU7XG5cbiAgICAvLyBfX29uQmVnaW4gaXMgY29uc2lkZXJlZCBwcml2YXRlIEFQSSwgaW50ZXJuYWwgdXNlIG9ubHlcbiAgICBtb2RlLl9fb25CZWdpbiA9IG51bGw7XG5cbiAgICBtb2RlLmtleXdvcmRzID0gbW9kZS5rZXl3b3JkcyB8fCBtb2RlLmJlZ2luS2V5d29yZHM7XG4gICAgaWYgKG1vZGUua2V5d29yZHMpXG4gICAgICBtb2RlLmtleXdvcmRzID0gY29tcGlsZUtleXdvcmRzKG1vZGUua2V5d29yZHMsIGxhbmd1YWdlLmNhc2VfaW5zZW5zaXRpdmUpO1xuXG4gICAgbW9kZS5sZXhlbWVzUmUgPSBsYW5nUmUobW9kZS5sZXhlbWVzIHx8IC9cXHcrLywgdHJ1ZSk7XG5cbiAgICBpZiAocGFyZW50KSB7XG4gICAgICBpZiAobW9kZS5iZWdpbktleXdvcmRzKSB7XG4gICAgICAgIC8vIGZvciBsYW5ndWFnZXMgd2l0aCBrZXl3b3JkcyB0aGF0IGluY2x1ZGUgbm9uLXdvcmQgY2hhcmFjdGVycyBjaGVja2luZyBmb3JcbiAgICAgICAgLy8gYSB3b3JkIGJvdW5kYXJ5IGlzIG5vdCBzdWZmaWNpZW50LCBzbyBpbnN0ZWFkIHdlIGNoZWNrIGZvciBhIHdvcmQgYm91bmRhcnlcbiAgICAgICAgLy8gb3Igd2hpdGVzcGFjZSAtIHRoaXMgZG9lcyBubyBoYXJtIGluIGFueSBjYXNlIHNpbmNlIG91ciBrZXl3b3JkIGVuZ2luZVxuICAgICAgICAvLyBkb2Vzbid0IGFsbG93IHNwYWNlcyBpbiBrZXl3b3JkcyBhbnl3YXlzIGFuZCB3ZSBzdGlsbCBjaGVjayBmb3IgdGhlIGJvdW5kYXJ5XG4gICAgICAgIC8vIGZpcnN0XG4gICAgICAgIG1vZGUuYmVnaW4gPSAnXFxcXGIoJyArIG1vZGUuYmVnaW5LZXl3b3Jkcy5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcpKD89XFxcXGJ8XFxcXHMpJztcbiAgICAgICAgbW9kZS5fX29uQmVnaW4gPSBza2lwSWZoYXNQcmVjZWRpbmdPclRyYWlsaW5nRG90O1xuICAgICAgfVxuICAgICAgaWYgKCFtb2RlLmJlZ2luKVxuICAgICAgICBtb2RlLmJlZ2luID0gL1xcQnxcXGIvO1xuICAgICAgbW9kZS5iZWdpblJlID0gbGFuZ1JlKG1vZGUuYmVnaW4pO1xuICAgICAgaWYgKG1vZGUuZW5kU2FtZUFzQmVnaW4pXG4gICAgICAgIG1vZGUuZW5kID0gbW9kZS5iZWdpbjtcbiAgICAgIGlmICghbW9kZS5lbmQgJiYgIW1vZGUuZW5kc1dpdGhQYXJlbnQpXG4gICAgICAgIG1vZGUuZW5kID0gL1xcQnxcXGIvO1xuICAgICAgaWYgKG1vZGUuZW5kKVxuICAgICAgICBtb2RlLmVuZFJlID0gbGFuZ1JlKG1vZGUuZW5kKTtcbiAgICAgIG1vZGUudGVybWluYXRvcl9lbmQgPSBzb3VyY2UobW9kZS5lbmQpIHx8ICcnO1xuICAgICAgaWYgKG1vZGUuZW5kc1dpdGhQYXJlbnQgJiYgcGFyZW50LnRlcm1pbmF0b3JfZW5kKVxuICAgICAgICBtb2RlLnRlcm1pbmF0b3JfZW5kICs9IChtb2RlLmVuZCA/ICd8JyA6ICcnKSArIHBhcmVudC50ZXJtaW5hdG9yX2VuZDtcbiAgICB9XG4gICAgaWYgKG1vZGUuaWxsZWdhbClcbiAgICAgIG1vZGUuaWxsZWdhbFJlID0gbGFuZ1JlKG1vZGUuaWxsZWdhbCk7XG4gICAgaWYgKG1vZGUucmVsZXZhbmNlID09IG51bGwpXG4gICAgICBtb2RlLnJlbGV2YW5jZSA9IDE7XG4gICAgaWYgKCFtb2RlLmNvbnRhaW5zKSB7XG4gICAgICBtb2RlLmNvbnRhaW5zID0gW107XG4gICAgfVxuICAgIG1vZGUuY29udGFpbnMgPSBbXS5jb25jYXQoLi4ubW9kZS5jb250YWlucy5tYXAoZnVuY3Rpb24oYykge1xuICAgICAgcmV0dXJuIGV4cGFuZF9vcl9jbG9uZV9tb2RlKGMgPT09ICdzZWxmJyA/IG1vZGUgOiBjKTtcbiAgICB9KSk7XG4gICAgbW9kZS5jb250YWlucy5mb3JFYWNoKGZ1bmN0aW9uKGMpIHtjb21waWxlTW9kZShjLCBtb2RlKTt9KTtcblxuICAgIGlmIChtb2RlLnN0YXJ0cykge1xuICAgICAgY29tcGlsZU1vZGUobW9kZS5zdGFydHMsIHBhcmVudCk7XG4gICAgfVxuXG4gICAgbW9kZS5tYXRjaGVyID0gYnVpbGRNb2RlUmVnZXgobW9kZSk7XG4gIH1cblxuICAvLyBzZWxmIGlzIG5vdCB2YWxpZCBhdCB0aGUgdG9wLWxldmVsXG4gIGlmIChsYW5ndWFnZS5jb250YWlucyAmJiBsYW5ndWFnZS5jb250YWlucy5pbmNsdWRlcygnc2VsZicpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRVJSOiBjb250YWlucyBgc2VsZmAgaXMgbm90IHN1cHBvcnRlZCBhdCB0aGUgdG9wLWxldmVsIG9mIGEgbGFuZ3VhZ2UuICBTZWUgZG9jdW1lbnRhdGlvbi5cIilcbiAgfVxuICBjb21waWxlTW9kZShsYW5ndWFnZSk7XG59XG5cbmZ1bmN0aW9uIGRlcGVuZGVuY3lPblBhcmVudChtb2RlKSB7XG4gIGlmICghbW9kZSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBtb2RlLmVuZHNXaXRoUGFyZW50IHx8IGRlcGVuZGVuY3lPblBhcmVudChtb2RlLnN0YXJ0cyk7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZF9vcl9jbG9uZV9tb2RlKG1vZGUpIHtcbiAgaWYgKG1vZGUudmFyaWFudHMgJiYgIW1vZGUuY2FjaGVkX3ZhcmlhbnRzKSB7XG4gICAgbW9kZS5jYWNoZWRfdmFyaWFudHMgPSBtb2RlLnZhcmlhbnRzLm1hcChmdW5jdGlvbih2YXJpYW50KSB7XG4gICAgICByZXR1cm4gaW5oZXJpdChtb2RlLCB7dmFyaWFudHM6IG51bGx9LCB2YXJpYW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEVYUEFORFxuICAvLyBpZiB3ZSBoYXZlIHZhcmlhbnRzIHRoZW4gZXNzZW50aWFsbHkgXCJyZXBsYWNlXCIgdGhlIG1vZGUgd2l0aCB0aGUgdmFyaWFudHNcbiAgLy8gdGhpcyBoYXBwZW5zIGluIGNvbXBpbGVNb2RlLCB3aGVyZSB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBmcm9tXG4gIGlmIChtb2RlLmNhY2hlZF92YXJpYW50cylcbiAgICByZXR1cm4gbW9kZS5jYWNoZWRfdmFyaWFudHM7XG5cbiAgLy8gQ0xPTkVcbiAgLy8gaWYgd2UgaGF2ZSBkZXBlbmRlbmNpZXMgb24gcGFyZW50cyB0aGVuIHdlIG5lZWQgYSB1bmlxdWVcbiAgLy8gaW5zdGFuY2Ugb2Ygb3Vyc2VsdmVzLCBzbyB3ZSBjYW4gYmUgcmV1c2VkIHdpdGggbWFueVxuICAvLyBkaWZmZXJlbnQgcGFyZW50cyB3aXRob3V0IGlzc3VlXG4gIGlmIChkZXBlbmRlbmN5T25QYXJlbnQobW9kZSkpXG4gICAgcmV0dXJuIGluaGVyaXQobW9kZSwgeyBzdGFydHM6IG1vZGUuc3RhcnRzID8gaW5oZXJpdChtb2RlLnN0YXJ0cykgOiBudWxsIH0pO1xuXG4gIGlmIChPYmplY3QuaXNGcm96ZW4obW9kZSkpXG4gICAgcmV0dXJuIGluaGVyaXQobW9kZSk7XG5cbiAgLy8gbm8gc3BlY2lhbCBkZXBlbmRlbmN5IGlzc3VlcywganVzdCByZXR1cm4gb3Vyc2VsdmVzXG4gIHJldHVybiBtb2RlO1xufVxuXG5cbi8vIGtleXdvcmRzXG5cbmZ1bmN0aW9uIGNvbXBpbGVLZXl3b3JkcyhyYXdLZXl3b3JkcywgY2FzZV9pbnNlbnNpdGl2ZSkge1xuICB2YXIgY29tcGlsZWRfa2V5d29yZHMgPSB7fTtcblxuICBpZiAodHlwZW9mIHJhd0tleXdvcmRzID09PSAnc3RyaW5nJykgeyAvLyBzdHJpbmdcbiAgICBzcGxpdEFuZENvbXBpbGUoJ2tleXdvcmQnLCByYXdLZXl3b3Jkcyk7XG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmtleXMocmF3S2V5d29yZHMpLmZvckVhY2goZnVuY3Rpb24gKGNsYXNzTmFtZSkge1xuICAgICAgc3BsaXRBbmRDb21waWxlKGNsYXNzTmFtZSwgcmF3S2V5d29yZHNbY2xhc3NOYW1lXSk7XG4gICAgfSk7XG4gIH1cbnJldHVybiBjb21waWxlZF9rZXl3b3JkcztcblxuLy8gLS0tXG5cbmZ1bmN0aW9uIHNwbGl0QW5kQ29tcGlsZShjbGFzc05hbWUsIHN0cikge1xuICBpZiAoY2FzZV9pbnNlbnNpdGl2ZSkge1xuICAgIHN0ciA9IHN0ci50b0xvd2VyQ2FzZSgpO1xuICB9XG4gIHN0ci5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24oa2V5d29yZCkge1xuICAgIHZhciBwYWlyID0ga2V5d29yZC5zcGxpdCgnfCcpO1xuICAgIGNvbXBpbGVkX2tleXdvcmRzW3BhaXJbMF1dID0gW2NsYXNzTmFtZSwgc2NvcmVGb3JLZXl3b3JkKHBhaXJbMF0sIHBhaXJbMV0pXTtcbiAgfSk7XG59XG59XG5cbmZ1bmN0aW9uIHNjb3JlRm9yS2V5d29yZChrZXl3b3JkLCBwcm92aWRlZFNjb3JlKSB7XG4vLyBtYW51YWwgc2NvcmVzIGFsd2F5cyB3aW4gb3ZlciBjb21tb24ga2V5d29yZHNcbi8vIHNvIHlvdSBjYW4gZm9yY2UgYSBzY29yZSBvZiAxIGlmIHlvdSByZWFsbHkgaW5zaXN0XG5pZiAocHJvdmlkZWRTY29yZSlcbiAgcmV0dXJuIE51bWJlcihwcm92aWRlZFNjb3JlKTtcblxucmV0dXJuIGNvbW1vbktleXdvcmQoa2V5d29yZCkgPyAwIDogMTtcbn1cblxuZnVuY3Rpb24gY29tbW9uS2V5d29yZCh3b3JkKSB7XG5yZXR1cm4gQ09NTU9OX0tFWVdPUkRTLmluY2x1ZGVzKHdvcmQudG9Mb3dlckNhc2UoKSk7XG59XG5cbnZhciB2ZXJzaW9uID0gXCIxMC4wLjFcIjtcblxuLypcblN5bnRheCBoaWdobGlnaHRpbmcgd2l0aCBsYW5ndWFnZSBhdXRvZGV0ZWN0aW9uLlxuaHR0cHM6Ly9oaWdobGlnaHRqcy5vcmcvXG4qL1xuXG5jb25zdCBlc2NhcGUkMSA9IGVzY2FwZUhUTUw7XG5jb25zdCBpbmhlcml0JDEgPSBpbmhlcml0O1xuXG5jb25zdCB7IG5vZGVTdHJlYW06IG5vZGVTdHJlYW0kMSwgbWVyZ2VTdHJlYW1zOiBtZXJnZVN0cmVhbXMkMSB9ID0gdXRpbHM7XG5cblxuY29uc3QgSExKUyA9IGZ1bmN0aW9uKGhsanMpIHtcblxuICAvLyBDb252ZW5pZW5jZSB2YXJpYWJsZXMgZm9yIGJ1aWxkLWluIG9iamVjdHNcbiAgdmFyIEFycmF5UHJvdG8gPSBbXTtcblxuICAvLyBHbG9iYWwgaW50ZXJuYWwgdmFyaWFibGVzIHVzZWQgd2l0aGluIHRoZSBoaWdobGlnaHQuanMgbGlicmFyeS5cbiAgdmFyIGxhbmd1YWdlcyA9IHt9LFxuICAgICAgYWxpYXNlcyAgID0ge30sXG4gICAgICBwbHVnaW5zICAgPSBbXTtcblxuICAvLyBzYWZlL3Byb2R1Y3Rpb24gbW9kZSAtIHN3YWxsb3dzIG1vcmUgZXJyb3JzLCB0cmllcyB0byBrZWVwIHJ1bm5pbmdcbiAgLy8gZXZlbiBpZiBhIHNpbmdsZSBzeW50YXggb3IgcGFyc2UgaGl0cyBhIGZhdGFsIGVycm9yXG4gIHZhciBTQUZFX01PREUgPSB0cnVlO1xuXG4gIC8vIFJlZ3VsYXIgZXhwcmVzc2lvbnMgdXNlZCB0aHJvdWdob3V0IHRoZSBoaWdobGlnaHQuanMgbGlicmFyeS5cbiAgdmFyIGZpeE1hcmt1cFJlICAgICAgPSAvKCheKDxbXj5dKz58XFx0fCkrfCg/OlxcbikpKS9nbTtcblxuICB2YXIgTEFOR1VBR0VfTk9UX0ZPVU5EID0gXCJDb3VsZCBub3QgZmluZCB0aGUgbGFuZ3VhZ2UgJ3t9JywgZGlkIHlvdSBmb3JnZXQgdG8gbG9hZC9pbmNsdWRlIGEgbGFuZ3VhZ2UgbW9kdWxlP1wiO1xuXG4gIC8vIEdsb2JhbCBvcHRpb25zIHVzZWQgd2hlbiB3aXRoaW4gZXh0ZXJuYWwgQVBJcy4gVGhpcyBpcyBtb2RpZmllZCB3aGVuXG4gIC8vIGNhbGxpbmcgdGhlIGBobGpzLmNvbmZpZ3VyZWAgZnVuY3Rpb24uXG4gIHZhciBvcHRpb25zID0ge1xuICAgIG5vSGlnaGxpZ2h0UmU6IC9eKG5vLT9oaWdobGlnaHQpJC9pLFxuICAgIGxhbmd1YWdlRGV0ZWN0UmU6IC9cXGJsYW5nKD86dWFnZSk/LShbXFx3LV0rKVxcYi9pLFxuICAgIGNsYXNzUHJlZml4OiAnaGxqcy0nLFxuICAgIHRhYlJlcGxhY2U6IG51bGwsXG4gICAgdXNlQlI6IGZhbHNlLFxuICAgIGxhbmd1YWdlczogdW5kZWZpbmVkLFxuICAgIC8vIGJldGEgY29uZmlndXJhdGlvbiBvcHRpb25zLCBzdWJqZWN0IHRvIGNoYW5nZSwgd2VsY29tZSB0byBkaXNjdXNzXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2hpZ2hsaWdodGpzL2hpZ2hsaWdodC5qcy9pc3N1ZXMvMTA4NlxuICAgIF9fZW1pdHRlcjogVG9rZW5UcmVlRW1pdHRlclxuICB9O1xuXG4gIC8qIFV0aWxpdHkgZnVuY3Rpb25zICovXG5cbiAgZnVuY3Rpb24gc2hvdWxkTm90SGlnaGxpZ2h0KGxhbmd1YWdlKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMubm9IaWdobGlnaHRSZS50ZXN0KGxhbmd1YWdlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJsb2NrTGFuZ3VhZ2UoYmxvY2spIHtcbiAgICB2YXIgbWF0Y2g7XG4gICAgdmFyIGNsYXNzZXMgPSBibG9jay5jbGFzc05hbWUgKyAnICc7XG5cbiAgICBjbGFzc2VzICs9IGJsb2NrLnBhcmVudE5vZGUgPyBibG9jay5wYXJlbnROb2RlLmNsYXNzTmFtZSA6ICcnO1xuXG4gICAgLy8gbGFuZ3VhZ2UtKiB0YWtlcyBwcmVjZWRlbmNlIG92ZXIgbm9uLXByZWZpeGVkIGNsYXNzIG5hbWVzLlxuICAgIG1hdGNoID0gb3B0aW9ucy5sYW5ndWFnZURldGVjdFJlLmV4ZWMoY2xhc3Nlcyk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICB2YXIgbGFuZ3VhZ2UgPSBnZXRMYW5ndWFnZShtYXRjaFsxXSk7XG4gICAgICBpZiAoIWxhbmd1YWdlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihMQU5HVUFHRV9OT1RfRk9VTkQucmVwbGFjZShcInt9XCIsIG1hdGNoWzFdKSk7XG4gICAgICAgIGNvbnNvbGUud2FybihcIkZhbGxpbmcgYmFjayB0byBuby1oaWdobGlnaHQgbW9kZSBmb3IgdGhpcyBibG9jay5cIiwgYmxvY2spO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxhbmd1YWdlID8gbWF0Y2hbMV0gOiAnbm8taGlnaGxpZ2h0JztcbiAgICB9XG5cbiAgICByZXR1cm4gY2xhc3Nlc1xuICAgICAgLnNwbGl0KC9cXHMrLylcbiAgICAgIC5maW5kKChfY2xhc3MpID0+IHNob3VsZE5vdEhpZ2hsaWdodChfY2xhc3MpIHx8IGdldExhbmd1YWdlKF9jbGFzcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvcmUgaGlnaGxpZ2h0aW5nIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbGFuZ3VhZ2VOYW1lIC0gdGhlIGxhbmd1YWdlIHRvIHVzZSBmb3IgaGlnaGxpZ2h0aW5nXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBjb2RlIC0gdGhlIGNvZGUgdG8gaGlnaGxpZ2h0XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gaWdub3JlX2lsbGVnYWxzIC0gd2hldGhlciB0byBpZ25vcmUgaWxsZWdhbCBtYXRjaGVzLCBkZWZhdWx0IGlzIHRvIGJhaWxcbiAgICogQHBhcmFtIHthcnJheTxtb2RlPn0gY29udGludWF0aW9uIC0gYXJyYXkgb2YgY29udGludWF0aW9uIG1vZGVzXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgdGhlIHJlc3VsdFxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gbGFuZ3VhZ2UgLSB0aGUgbGFuZ3VhZ2UgbmFtZVxuICAgKiBAcHJvcGVydHkge251bWJlcn0gcmVsZXZhbmNlIC0gdGhlIHJlbGV2YW5jZSBzY29yZVxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gdmFsdWUgLSB0aGUgaGlnaGxpZ2h0ZWQgSFRNTCBjb2RlXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBjb2RlIC0gdGhlIG9yaWdpbmFsIHJhdyBjb2RlXG4gICAqIEBwcm9wZXJ0eSB7bW9kZX0gdG9wIC0gdG9wIG9mIHRoZSBjdXJyZW50IG1vZGUgc3RhY2tcbiAgICogQHByb3BlcnR5IHtib29sZWFufSBpbGxlZ2FsIC0gaW5kaWNhdGVzIHdoZXRoZXIgYW55IGlsbGVnYWwgbWF0Y2hlcyB3ZXJlIGZvdW5kXG4gICovXG4gIGZ1bmN0aW9uIGhpZ2hsaWdodChsYW5ndWFnZU5hbWUsIGNvZGUsIGlnbm9yZV9pbGxlZ2FscywgY29udGludWF0aW9uKSB7XG4gICAgdmFyIGNvbnRleHQgPSB7XG4gICAgICBjb2RlLFxuICAgICAgbGFuZ3VhZ2U6IGxhbmd1YWdlTmFtZVxuICAgIH07XG4gICAgLy8gdGhlIHBsdWdpbiBjYW4gY2hhbmdlIHRoZSBkZXNpcmVkIGxhbmd1YWdlIG9yIHRoZSBjb2RlIHRvIGJlIGhpZ2hsaWdodGVkXG4gICAgLy8ganVzdCBiZSBjaGFuZ2luZyB0aGUgb2JqZWN0IGl0IHdhcyBwYXNzZWRcbiAgICBmaXJlKFwiYmVmb3JlOmhpZ2hsaWdodFwiLCBjb250ZXh0KTtcblxuICAgIC8vIGEgYmVmb3JlIHBsdWdpbiBjYW4gdXN1cnAgdGhlIHJlc3VsdCBjb21wbGV0ZWx5IGJ5IHByb3ZpZGluZyBpdCdzIG93blxuICAgIC8vIGluIHdoaWNoIGNhc2Ugd2UgZG9uJ3QgZXZlbiBuZWVkIHRvIGNhbGwgaGlnaGxpZ2h0XG4gICAgdmFyIHJlc3VsdCA9IGNvbnRleHQucmVzdWx0ID9cbiAgICAgIGNvbnRleHQucmVzdWx0IDpcbiAgICAgIF9oaWdobGlnaHQoY29udGV4dC5sYW5ndWFnZSwgY29udGV4dC5jb2RlLCBpZ25vcmVfaWxsZWdhbHMsIGNvbnRpbnVhdGlvbik7XG5cbiAgICByZXN1bHQuY29kZSA9IGNvbnRleHQuY29kZTtcbiAgICAvLyB0aGUgcGx1Z2luIGNhbiBjaGFuZ2UgYW55dGhpbmcgaW4gcmVzdWx0IHRvIHN1aXRlIGl0XG4gICAgZmlyZShcImFmdGVyOmhpZ2hsaWdodFwiLCByZXN1bHQpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIHByaXZhdGUgaGlnaGxpZ2h0IHRoYXQncyB1c2VkIGludGVybmFsbHkgYW5kIGRvZXMgbm90IGZpcmUgY2FsbGJhY2tzXG4gIGZ1bmN0aW9uIF9oaWdobGlnaHQobGFuZ3VhZ2VOYW1lLCBjb2RlLCBpZ25vcmVfaWxsZWdhbHMsIGNvbnRpbnVhdGlvbikge1xuICAgIHZhciBjb2RlVG9IaWdobGlnaHQgPSBjb2RlO1xuXG4gICAgZnVuY3Rpb24gZW5kT2ZNb2RlKG1vZGUsIGxleGVtZSkge1xuICAgICAgaWYgKHN0YXJ0c1dpdGgobW9kZS5lbmRSZSwgbGV4ZW1lKSkge1xuICAgICAgICB3aGlsZSAobW9kZS5lbmRzUGFyZW50ICYmIG1vZGUucGFyZW50KSB7XG4gICAgICAgICAgbW9kZSA9IG1vZGUucGFyZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtb2RlO1xuICAgICAgfVxuICAgICAgaWYgKG1vZGUuZW5kc1dpdGhQYXJlbnQpIHtcbiAgICAgICAgcmV0dXJuIGVuZE9mTW9kZShtb2RlLnBhcmVudCwgbGV4ZW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBrZXl3b3JkTWF0Y2gobW9kZSwgbWF0Y2gpIHtcbiAgICAgIHZhciBtYXRjaF9zdHIgPSBsYW5ndWFnZS5jYXNlX2luc2Vuc2l0aXZlID8gbWF0Y2hbMF0udG9Mb3dlckNhc2UoKSA6IG1hdGNoWzBdO1xuICAgICAgcmV0dXJuIG1vZGUua2V5d29yZHMuaGFzT3duUHJvcGVydHkobWF0Y2hfc3RyKSAmJiBtb2RlLmtleXdvcmRzW21hdGNoX3N0cl07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc0tleXdvcmRzKCkge1xuICAgICAgdmFyIGtleXdvcmRfbWF0Y2gsIGxhc3RfaW5kZXgsIG1hdGNoLCBidWY7XG5cbiAgICAgIGlmICghdG9wLmtleXdvcmRzKSB7XG4gICAgICAgIGVtaXR0ZXIuYWRkVGV4dChtb2RlX2J1ZmZlcik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbGFzdF9pbmRleCA9IDA7XG4gICAgICB0b3AubGV4ZW1lc1JlLmxhc3RJbmRleCA9IDA7XG4gICAgICBtYXRjaCA9IHRvcC5sZXhlbWVzUmUuZXhlYyhtb2RlX2J1ZmZlcik7XG4gICAgICBidWYgPSBcIlwiO1xuXG4gICAgICB3aGlsZSAobWF0Y2gpIHtcbiAgICAgICAgYnVmICs9IG1vZGVfYnVmZmVyLnN1YnN0cmluZyhsYXN0X2luZGV4LCBtYXRjaC5pbmRleCk7XG4gICAgICAgIGtleXdvcmRfbWF0Y2ggPSBrZXl3b3JkTWF0Y2godG9wLCBtYXRjaCk7XG4gICAgICAgIHZhciBraW5kID0gbnVsbDtcbiAgICAgICAgaWYgKGtleXdvcmRfbWF0Y2gpIHtcbiAgICAgICAgICBlbWl0dGVyLmFkZFRleHQoYnVmKTtcbiAgICAgICAgICBidWYgPSBcIlwiO1xuXG4gICAgICAgICAgcmVsZXZhbmNlICs9IGtleXdvcmRfbWF0Y2hbMV07XG4gICAgICAgICAga2luZCA9IGtleXdvcmRfbWF0Y2hbMF07XG4gICAgICAgICAgZW1pdHRlci5hZGRLZXl3b3JkKG1hdGNoWzBdLCBraW5kKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBidWYgKz0gbWF0Y2hbMF07XG4gICAgICAgIH1cbiAgICAgICAgbGFzdF9pbmRleCA9IHRvcC5sZXhlbWVzUmUubGFzdEluZGV4O1xuICAgICAgICBtYXRjaCA9IHRvcC5sZXhlbWVzUmUuZXhlYyhtb2RlX2J1ZmZlcik7XG4gICAgICB9XG4gICAgICBidWYgKz0gbW9kZV9idWZmZXIuc3Vic3RyKGxhc3RfaW5kZXgpO1xuICAgICAgZW1pdHRlci5hZGRUZXh0KGJ1Zik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc1N1Ykxhbmd1YWdlKCkge1xuICAgICAgaWYgKG1vZGVfYnVmZmVyID09PSBcIlwiKSByZXR1cm47XG5cbiAgICAgIHZhciBleHBsaWNpdCA9IHR5cGVvZiB0b3Auc3ViTGFuZ3VhZ2UgPT09ICdzdHJpbmcnO1xuXG4gICAgICBpZiAoZXhwbGljaXQgJiYgIWxhbmd1YWdlc1t0b3Auc3ViTGFuZ3VhZ2VdKSB7XG4gICAgICAgIGVtaXR0ZXIuYWRkVGV4dChtb2RlX2J1ZmZlcik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHJlc3VsdCA9IGV4cGxpY2l0ID9cbiAgICAgICAgICAgICAgICAgICBfaGlnaGxpZ2h0KHRvcC5zdWJMYW5ndWFnZSwgbW9kZV9idWZmZXIsIHRydWUsIGNvbnRpbnVhdGlvbnNbdG9wLnN1Ykxhbmd1YWdlXSkgOlxuICAgICAgICAgICAgICAgICAgIGhpZ2hsaWdodEF1dG8obW9kZV9idWZmZXIsIHRvcC5zdWJMYW5ndWFnZS5sZW5ndGggPyB0b3Auc3ViTGFuZ3VhZ2UgOiB1bmRlZmluZWQpO1xuXG4gICAgICAvLyBDb3VudGluZyBlbWJlZGRlZCBsYW5ndWFnZSBzY29yZSB0b3dhcmRzIHRoZSBob3N0IGxhbmd1YWdlIG1heSBiZSBkaXNhYmxlZFxuICAgICAgLy8gd2l0aCB6ZXJvaW5nIHRoZSBjb250YWluaW5nIG1vZGUgcmVsZXZhbmNlLiBVc2UgY2FzZSBpbiBwb2ludCBpcyBNYXJrZG93biB0aGF0XG4gICAgICAvLyBhbGxvd3MgWE1MIGV2ZXJ5d2hlcmUgYW5kIG1ha2VzIGV2ZXJ5IFhNTCBzbmlwcGV0IHRvIGhhdmUgYSBtdWNoIGxhcmdlciBNYXJrZG93blxuICAgICAgLy8gc2NvcmUuXG4gICAgICBpZiAodG9wLnJlbGV2YW5jZSA+IDApIHtcbiAgICAgICAgcmVsZXZhbmNlICs9IHJlc3VsdC5yZWxldmFuY2U7XG4gICAgICB9XG4gICAgICBpZiAoZXhwbGljaXQpIHtcbiAgICAgICAgY29udGludWF0aW9uc1t0b3Auc3ViTGFuZ3VhZ2VdID0gcmVzdWx0LnRvcDtcbiAgICAgIH1cbiAgICAgIGVtaXR0ZXIuYWRkU3VibGFuZ3VhZ2UocmVzdWx0LmVtaXR0ZXIsIHJlc3VsdC5sYW5ndWFnZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc0J1ZmZlcigpIHtcbiAgICAgIGlmICh0b3Auc3ViTGFuZ3VhZ2UgIT0gbnVsbClcbiAgICAgICAgcHJvY2Vzc1N1Ykxhbmd1YWdlKCk7XG4gICAgICBlbHNlXG4gICAgICAgIHByb2Nlc3NLZXl3b3JkcygpO1xuICAgICAgbW9kZV9idWZmZXIgPSAnJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdGFydE5ld01vZGUobW9kZSkge1xuICAgICAgaWYgKG1vZGUuY2xhc3NOYW1lKSB7XG4gICAgICAgIGVtaXR0ZXIub3Blbk5vZGUobW9kZS5jbGFzc05hbWUpO1xuICAgICAgfVxuICAgICAgdG9wID0gT2JqZWN0LmNyZWF0ZShtb2RlLCB7cGFyZW50OiB7dmFsdWU6IHRvcH19KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkb0lnbm9yZShsZXhlbWUpIHtcbiAgICAgIGlmICh0b3AubWF0Y2hlci5yZWdleEluZGV4ID09PSAwKSB7XG4gICAgICAgIC8vIG5vIG1vcmUgcmVnZXhzIHRvIHBvdGVudGlhbGx5IG1hdGNoIGhlcmUsIHNvIHdlIG1vdmUgdGhlIGN1cnNvciBmb3J3YXJkIG9uZVxuICAgICAgICAvLyBzcGFjZVxuICAgICAgICBtb2RlX2J1ZmZlciArPSBsZXhlbWVbMF07XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbm8gbmVlZCB0byBtb3ZlIHRoZSBjdXJzb3IsIHdlIHN0aWxsIGhhdmUgYWRkaXRpb25hbCByZWdleGVzIHRvIHRyeSBhbmRcbiAgICAgICAgLy8gbWF0Y2ggYXQgdGhpcyB2ZXJ5IHNwb3RcbiAgICAgICAgY29udGludWVTY2FuQXRTYW1lUG9zaXRpb24gPSB0cnVlO1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkb0JlZ2luTWF0Y2gobWF0Y2gpIHtcbiAgICAgIHZhciBsZXhlbWUgPSBtYXRjaFswXTtcbiAgICAgIHZhciBuZXdfbW9kZSA9IG1hdGNoLnJ1bGU7XG5cbiAgICAgIGlmIChuZXdfbW9kZS5fX29uQmVnaW4pIHtcbiAgICAgICAgbGV0IHJlcyA9IG5ld19tb2RlLl9fb25CZWdpbihtYXRjaCkgfHwge307XG4gICAgICAgIGlmIChyZXMuaWdub3JlTWF0Y2gpXG4gICAgICAgICAgcmV0dXJuIGRvSWdub3JlKGxleGVtZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChuZXdfbW9kZSAmJiBuZXdfbW9kZS5lbmRTYW1lQXNCZWdpbikge1xuICAgICAgICBuZXdfbW9kZS5lbmRSZSA9IGVzY2FwZSggbGV4ZW1lICk7XG4gICAgICB9XG5cbiAgICAgIGlmIChuZXdfbW9kZS5za2lwKSB7XG4gICAgICAgIG1vZGVfYnVmZmVyICs9IGxleGVtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChuZXdfbW9kZS5leGNsdWRlQmVnaW4pIHtcbiAgICAgICAgICBtb2RlX2J1ZmZlciArPSBsZXhlbWU7XG4gICAgICAgIH1cbiAgICAgICAgcHJvY2Vzc0J1ZmZlcigpO1xuICAgICAgICBpZiAoIW5ld19tb2RlLnJldHVybkJlZ2luICYmICFuZXdfbW9kZS5leGNsdWRlQmVnaW4pIHtcbiAgICAgICAgICBtb2RlX2J1ZmZlciA9IGxleGVtZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3RhcnROZXdNb2RlKG5ld19tb2RlKTtcbiAgICAgIHJldHVybiBuZXdfbW9kZS5yZXR1cm5CZWdpbiA/IDAgOiBsZXhlbWUubGVuZ3RoO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRvRW5kTWF0Y2gobWF0Y2gpIHtcbiAgICAgIHZhciBsZXhlbWUgPSBtYXRjaFswXTtcbiAgICAgIHZhciBtYXRjaFBsdXNSZW1haW5kZXIgPSBjb2RlVG9IaWdobGlnaHQuc3Vic3RyKG1hdGNoLmluZGV4KTtcbiAgICAgIHZhciBlbmRfbW9kZSA9IGVuZE9mTW9kZSh0b3AsIG1hdGNoUGx1c1JlbWFpbmRlcik7XG4gICAgICBpZiAoIWVuZF9tb2RlKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgb3JpZ2luID0gdG9wO1xuICAgICAgaWYgKG9yaWdpbi5za2lwKSB7XG4gICAgICAgIG1vZGVfYnVmZmVyICs9IGxleGVtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghKG9yaWdpbi5yZXR1cm5FbmQgfHwgb3JpZ2luLmV4Y2x1ZGVFbmQpKSB7XG4gICAgICAgICAgbW9kZV9idWZmZXIgKz0gbGV4ZW1lO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3NCdWZmZXIoKTtcbiAgICAgICAgaWYgKG9yaWdpbi5leGNsdWRlRW5kKSB7XG4gICAgICAgICAgbW9kZV9idWZmZXIgPSBsZXhlbWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRvIHtcbiAgICAgICAgaWYgKHRvcC5jbGFzc05hbWUpIHtcbiAgICAgICAgICBlbWl0dGVyLmNsb3NlTm9kZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdG9wLnNraXAgJiYgIXRvcC5zdWJMYW5ndWFnZSkge1xuICAgICAgICAgIHJlbGV2YW5jZSArPSB0b3AucmVsZXZhbmNlO1xuICAgICAgICB9XG4gICAgICAgIHRvcCA9IHRvcC5wYXJlbnQ7XG4gICAgICB9IHdoaWxlICh0b3AgIT09IGVuZF9tb2RlLnBhcmVudCk7XG4gICAgICBpZiAoZW5kX21vZGUuc3RhcnRzKSB7XG4gICAgICAgIGlmIChlbmRfbW9kZS5lbmRTYW1lQXNCZWdpbikge1xuICAgICAgICAgIGVuZF9tb2RlLnN0YXJ0cy5lbmRSZSA9IGVuZF9tb2RlLmVuZFJlO1xuICAgICAgICB9XG4gICAgICAgIHN0YXJ0TmV3TW9kZShlbmRfbW9kZS5zdGFydHMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9yaWdpbi5yZXR1cm5FbmQgPyAwIDogbGV4ZW1lLmxlbmd0aDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzQ29udGludWF0aW9ucygpIHtcbiAgICAgIHZhciBsaXN0ID0gW107XG4gICAgICBmb3IodmFyIGN1cnJlbnQgPSB0b3A7IGN1cnJlbnQgIT09IGxhbmd1YWdlOyBjdXJyZW50ID0gY3VycmVudC5wYXJlbnQpIHtcbiAgICAgICAgaWYgKGN1cnJlbnQuY2xhc3NOYW1lKSB7XG4gICAgICAgICAgbGlzdC51bnNoaWZ0KGN1cnJlbnQuY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGlzdC5mb3JFYWNoKGl0ZW0gPT4gZW1pdHRlci5vcGVuTm9kZShpdGVtKSk7XG4gICAgfVxuXG4gICAgdmFyIGxhc3RNYXRjaCA9IHt9O1xuICAgIGZ1bmN0aW9uIHByb2Nlc3NMZXhlbWUodGV4dF9iZWZvcmVfbWF0Y2gsIG1hdGNoKSB7XG5cbiAgICAgIHZhciBlcnI7XG4gICAgICB2YXIgbGV4ZW1lID0gbWF0Y2ggJiYgbWF0Y2hbMF07XG5cbiAgICAgIC8vIGFkZCBub24tbWF0Y2hlZCB0ZXh0IHRvIHRoZSBjdXJyZW50IG1vZGUgYnVmZmVyXG4gICAgICBtb2RlX2J1ZmZlciArPSB0ZXh0X2JlZm9yZV9tYXRjaDtcblxuICAgICAgaWYgKGxleGVtZSA9PSBudWxsKSB7XG4gICAgICAgIHByb2Nlc3NCdWZmZXIoKTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9XG5cblxuXG4gICAgICAvLyB3ZSd2ZSBmb3VuZCBhIDAgd2lkdGggbWF0Y2ggYW5kIHdlJ3JlIHN0dWNrLCBzbyB3ZSBuZWVkIHRvIGFkdmFuY2VcbiAgICAgIC8vIHRoaXMgaGFwcGVucyB3aGVuIHdlIGhhdmUgYmFkbHkgYmVoYXZlZCBydWxlcyB0aGF0IGhhdmUgb3B0aW9uYWwgbWF0Y2hlcnMgdG8gdGhlIGRlZ3JlZSB0aGF0XG4gICAgICAvLyBzb21ldGltZXMgdGhleSBjYW4gZW5kIHVwIG1hdGNoaW5nIG5vdGhpbmcgYXQgYWxsXG4gICAgICAvLyBSZWY6IGh0dHBzOi8vZ2l0aHViLmNvbS9oaWdobGlnaHRqcy9oaWdobGlnaHQuanMvaXNzdWVzLzIxNDBcbiAgICAgIGlmIChsYXN0TWF0Y2gudHlwZT09XCJiZWdpblwiICYmIG1hdGNoLnR5cGU9PVwiZW5kXCIgJiYgbGFzdE1hdGNoLmluZGV4ID09IG1hdGNoLmluZGV4ICYmIGxleGVtZSA9PT0gXCJcIikge1xuICAgICAgICAvLyBzcGl0IHRoZSBcInNraXBwZWRcIiBjaGFyYWN0ZXIgdGhhdCBvdXIgcmVnZXggY2hva2VkIG9uIGJhY2sgaW50byB0aGUgb3V0cHV0IHNlcXVlbmNlXG4gICAgICAgIG1vZGVfYnVmZmVyICs9IGNvZGVUb0hpZ2hsaWdodC5zbGljZShtYXRjaC5pbmRleCwgbWF0Y2guaW5kZXggKyAxKTtcbiAgICAgICAgaWYgKCFTQUZFX01PREUpIHtcbiAgICAgICAgICBlcnIgPSBuZXcgRXJyb3IoJzAgd2lkdGggbWF0Y2ggcmVnZXgnKTtcbiAgICAgICAgICBlcnIubGFuZ3VhZ2VOYW1lID0gbGFuZ3VhZ2VOYW1lO1xuICAgICAgICAgIGVyci5iYWRSdWxlID0gbGFzdE1hdGNoLnJ1bGU7XG4gICAgICAgICAgdGhyb3coZXJyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICAgIGxhc3RNYXRjaCA9IG1hdGNoO1xuXG4gICAgICBpZiAobWF0Y2gudHlwZT09PVwiYmVnaW5cIikge1xuICAgICAgICByZXR1cm4gZG9CZWdpbk1hdGNoKG1hdGNoKTtcbiAgICAgIH0gZWxzZSBpZiAobWF0Y2gudHlwZT09PVwiaWxsZWdhbFwiICYmICFpZ25vcmVfaWxsZWdhbHMpIHtcbiAgICAgICAgLy8gaWxsZWdhbCBtYXRjaCwgd2UgZG8gbm90IGNvbnRpbnVlIHByb2Nlc3NpbmdcbiAgICAgICAgZXJyID0gbmV3IEVycm9yKCdJbGxlZ2FsIGxleGVtZSBcIicgKyBsZXhlbWUgKyAnXCIgZm9yIG1vZGUgXCInICsgKHRvcC5jbGFzc05hbWUgfHwgJzx1bm5hbWVkPicpICsgJ1wiJyk7XG4gICAgICAgIGVyci5tb2RlID0gdG9wO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9IGVsc2UgaWYgKG1hdGNoLnR5cGU9PT1cImVuZFwiKSB7XG4gICAgICAgIHZhciBwcm9jZXNzZWQgPSBkb0VuZE1hdGNoKG1hdGNoKTtcbiAgICAgICAgaWYgKHByb2Nlc3NlZCAhPSB1bmRlZmluZWQpXG4gICAgICAgICAgcmV0dXJuIHByb2Nlc3NlZDtcbiAgICAgIH1cblxuICAgICAgLypcbiAgICAgIFdoeSBtaWdodCBiZSBmaW5kIG91cnNlbHZlcyBoZXJlPyAgT25seSBvbmUgb2NjYXNpb24gbm93LiAgQW4gZW5kIG1hdGNoIHRoYXQgd2FzXG4gICAgICB0cmlnZ2VyZWQgYnV0IGNvdWxkIG5vdCBiZSBjb21wbGV0ZWQuICBXaGVuIG1pZ2h0IHRoaXMgaGFwcGVuPyAgV2hlbiBhbiBgZW5kU2FtZWFzQmVnaW5gXG4gICAgICBydWxlIHNldHMgdGhlIGVuZCBydWxlIHRvIGEgc3BlY2lmaWMgbWF0Y2guICBTaW5jZSB0aGUgb3ZlcmFsbCBtb2RlIHRlcm1pbmF0aW9uIHJ1bGUgdGhhdCdzXG4gICAgICBiZWluZyB1c2VkIHRvIHNjYW4gdGhlIHRleHQgaXNuJ3QgcmVjb21waWxlZCB0aGF0IG1lYW5zIHRoYXQgYW55IG1hdGNoIHRoYXQgTE9PS1MgbGlrZVxuICAgICAgdGhlIGVuZCAoYnV0IGlzIG5vdCwgYmVjYXVzZSBpdCBpcyBub3QgYW4gZXhhY3QgbWF0Y2ggdG8gdGhlIGJlZ2lubmluZykgd2lsbFxuICAgICAgZW5kIHVwIGhlcmUuICBBIGRlZmluaXRlIGVuZCBtYXRjaCwgYnV0IHdoZW4gYGRvRW5kTWF0Y2hgIHRyaWVzIHRvIFwicmVhcHBseVwiXG4gICAgICB0aGUgZW5kIHJ1bGUgYW5kIGZhaWxzIHRvIG1hdGNoLCB3ZSB3aW5kIHVwIGhlcmUsIGFuZCBqdXN0IHNpbGVudGx5IGlnbm9yZSB0aGUgZW5kLlxuXG4gICAgICBUaGlzIGNhdXNlcyBubyByZWFsIGhhcm0gb3RoZXIgdGhhbiBzdG9wcGluZyBhIGZldyB0aW1lcyB0b28gbWFueS5cbiAgICAgICovXG5cbiAgICAgIG1vZGVfYnVmZmVyICs9IGxleGVtZTtcbiAgICAgIHJldHVybiBsZXhlbWUubGVuZ3RoO1xuICAgIH1cblxuICAgIHZhciBsYW5ndWFnZSA9IGdldExhbmd1YWdlKGxhbmd1YWdlTmFtZSk7XG4gICAgaWYgKCFsYW5ndWFnZSkge1xuICAgICAgY29uc29sZS5lcnJvcihMQU5HVUFHRV9OT1RfRk9VTkQucmVwbGFjZShcInt9XCIsIGxhbmd1YWdlTmFtZSkpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGxhbmd1YWdlOiBcIicgKyBsYW5ndWFnZU5hbWUgKyAnXCInKTtcbiAgICB9XG5cbiAgICBjb21waWxlTGFuZ3VhZ2UobGFuZ3VhZ2UpO1xuICAgIHZhciB0b3AgPSBjb250aW51YXRpb24gfHwgbGFuZ3VhZ2U7XG4gICAgdmFyIGNvbnRpbnVhdGlvbnMgPSB7fTsgLy8ga2VlcCBjb250aW51YXRpb25zIGZvciBzdWItbGFuZ3VhZ2VzXG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgZW1pdHRlciA9IG5ldyBvcHRpb25zLl9fZW1pdHRlcihvcHRpb25zKTtcbiAgICBwcm9jZXNzQ29udGludWF0aW9ucygpO1xuICAgIHZhciBtb2RlX2J1ZmZlciA9ICcnO1xuICAgIHZhciByZWxldmFuY2UgPSAwO1xuICAgIHZhciBtYXRjaCwgcHJvY2Vzc2VkQ291bnQsIGluZGV4ID0gMDtcblxuICAgIHRyeSB7XG4gICAgICB2YXIgY29udGludWVTY2FuQXRTYW1lUG9zaXRpb24gPSBmYWxzZTtcbiAgICAgIHRvcC5tYXRjaGVyLmNvbnNpZGVyQWxsKCk7XG5cbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGlmIChjb250aW51ZVNjYW5BdFNhbWVQb3NpdGlvbikge1xuICAgICAgICAgIGNvbnRpbnVlU2NhbkF0U2FtZVBvc2l0aW9uID0gZmFsc2U7XG4gICAgICAgICAgLy8gb25seSByZWdleGVzIG5vdCBtYXRjaGVkIHByZXZpb3VzbHkgd2lsbCBub3cgYmVcbiAgICAgICAgICAvLyBjb25zaWRlcmVkIGZvciBhIHBvdGVudGlhbCBtYXRjaFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRvcC5tYXRjaGVyLmxhc3RJbmRleCA9IGluZGV4O1xuICAgICAgICAgIHRvcC5tYXRjaGVyLmNvbnNpZGVyQWxsKCk7XG4gICAgICAgIH1cbiAgICAgICAgbWF0Y2ggPSB0b3AubWF0Y2hlci5leGVjKGNvZGVUb0hpZ2hsaWdodCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwibWF0Y2hcIiwgbWF0Y2hbMF0sIG1hdGNoLnJ1bGUgJiYgbWF0Y2gucnVsZS5iZWdpbilcbiAgICAgICAgaWYgKCFtYXRjaClcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgbGV0IGJlZm9yZU1hdGNoID0gY29kZVRvSGlnaGxpZ2h0LnN1YnN0cmluZyhpbmRleCwgbWF0Y2guaW5kZXgpO1xuICAgICAgICBwcm9jZXNzZWRDb3VudCA9IHByb2Nlc3NMZXhlbWUoYmVmb3JlTWF0Y2gsIG1hdGNoKTtcbiAgICAgICAgaW5kZXggPSBtYXRjaC5pbmRleCArIHByb2Nlc3NlZENvdW50O1xuICAgICAgfVxuICAgICAgcHJvY2Vzc0xleGVtZShjb2RlVG9IaWdobGlnaHQuc3Vic3RyKGluZGV4KSk7XG4gICAgICBlbWl0dGVyLmNsb3NlQWxsTm9kZXMoKTtcbiAgICAgIGVtaXR0ZXIuZmluYWxpemUoKTtcbiAgICAgIHJlc3VsdCA9IGVtaXR0ZXIudG9IVE1MKCk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlbGV2YW5jZTogcmVsZXZhbmNlLFxuICAgICAgICB2YWx1ZTogcmVzdWx0LFxuICAgICAgICBsYW5ndWFnZTogbGFuZ3VhZ2VOYW1lLFxuICAgICAgICBpbGxlZ2FsOiBmYWxzZSxcbiAgICAgICAgZW1pdHRlcjogZW1pdHRlcixcbiAgICAgICAgdG9wOiB0b3BcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyLm1lc3NhZ2UgJiYgZXJyLm1lc3NhZ2UuaW5jbHVkZXMoJ0lsbGVnYWwnKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGlsbGVnYWw6IHRydWUsXG4gICAgICAgICAgaWxsZWdhbEJ5OiB7XG4gICAgICAgICAgICBtc2c6IGVyci5tZXNzYWdlLFxuICAgICAgICAgICAgY29udGV4dDogY29kZVRvSGlnaGxpZ2h0LnNsaWNlKGluZGV4LTEwMCxpbmRleCsxMDApLFxuICAgICAgICAgICAgbW9kZTogZXJyLm1vZGVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNvZmFyOiByZXN1bHQsXG4gICAgICAgICAgcmVsZXZhbmNlOiAwLFxuICAgICAgICAgIHZhbHVlOiBlc2NhcGUkMShjb2RlVG9IaWdobGlnaHQpLFxuICAgICAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKFNBRkVfTU9ERSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHJlbGV2YW5jZTogMCxcbiAgICAgICAgICB2YWx1ZTogZXNjYXBlJDEoY29kZVRvSGlnaGxpZ2h0KSxcbiAgICAgICAgICBlbWl0dGVyOiBlbWl0dGVyLFxuICAgICAgICAgIGxhbmd1YWdlOiBsYW5ndWFnZU5hbWUsXG4gICAgICAgICAgdG9wOiB0b3AsXG4gICAgICAgICAgZXJyb3JSYWlzZWQ6IGVyclxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIHJldHVybnMgYSB2YWxpZCBoaWdobGlnaHQgcmVzdWx0LCB3aXRob3V0IGFjdHVhbGx5XG4gIC8vIGRvaW5nIGFueSBhY3R1YWwgd29yaywgYXV0byBoaWdobGlnaHQgc3RhcnRzIHdpdGhcbiAgLy8gdGhpcyBhbmQgaXQncyBwb3NzaWJsZSBmb3Igc21hbGwgc25pcHBldHMgdGhhdFxuICAvLyBhdXRvLWRldGVjdGlvbiBtYXkgbm90IGZpbmQgYSBiZXR0ZXIgbWF0Y2hcbiAgZnVuY3Rpb24ganVzdFRleHRIaWdobGlnaHRSZXN1bHQoY29kZSkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgIHJlbGV2YW5jZTogMCxcbiAgICAgIGVtaXR0ZXI6IG5ldyBvcHRpb25zLl9fZW1pdHRlcihvcHRpb25zKSxcbiAgICAgIHZhbHVlOiBlc2NhcGUkMShjb2RlKSxcbiAgICAgIGlsbGVnYWw6IGZhbHNlLFxuICAgICAgdG9wOiBQTEFJTlRFWFRfTEFOR1VBR0VcbiAgICB9O1xuICAgIHJlc3VsdC5lbWl0dGVyLmFkZFRleHQoY29kZSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qXG4gIEhpZ2hsaWdodGluZyB3aXRoIGxhbmd1YWdlIGRldGVjdGlvbi4gQWNjZXB0cyBhIHN0cmluZyB3aXRoIHRoZSBjb2RlIHRvXG4gIGhpZ2hsaWdodC4gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG5cbiAgLSBsYW5ndWFnZSAoZGV0ZWN0ZWQgbGFuZ3VhZ2UpXG4gIC0gcmVsZXZhbmNlIChpbnQpXG4gIC0gdmFsdWUgKGFuIEhUTUwgc3RyaW5nIHdpdGggaGlnaGxpZ2h0aW5nIG1hcmt1cClcbiAgLSBzZWNvbmRfYmVzdCAob2JqZWN0IHdpdGggdGhlIHNhbWUgc3RydWN0dXJlIGZvciBzZWNvbmQtYmVzdCBoZXVyaXN0aWNhbGx5XG4gICAgZGV0ZWN0ZWQgbGFuZ3VhZ2UsIG1heSBiZSBhYnNlbnQpXG5cbiAgKi9cbiAgZnVuY3Rpb24gaGlnaGxpZ2h0QXV0byhjb2RlLCBsYW5ndWFnZVN1YnNldCkge1xuICAgIGxhbmd1YWdlU3Vic2V0ID0gbGFuZ3VhZ2VTdWJzZXQgfHwgb3B0aW9ucy5sYW5ndWFnZXMgfHwgT2JqZWN0LmtleXMobGFuZ3VhZ2VzKTtcbiAgICB2YXIgcmVzdWx0ID0ganVzdFRleHRIaWdobGlnaHRSZXN1bHQoY29kZSk7XG4gICAgdmFyIHNlY29uZF9iZXN0ID0gcmVzdWx0O1xuICAgIGxhbmd1YWdlU3Vic2V0LmZpbHRlcihnZXRMYW5ndWFnZSkuZmlsdGVyKGF1dG9EZXRlY3Rpb24pLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGN1cnJlbnQgPSBfaGlnaGxpZ2h0KG5hbWUsIGNvZGUsIGZhbHNlKTtcbiAgICAgIGN1cnJlbnQubGFuZ3VhZ2UgPSBuYW1lO1xuICAgICAgaWYgKGN1cnJlbnQucmVsZXZhbmNlID4gc2Vjb25kX2Jlc3QucmVsZXZhbmNlKSB7XG4gICAgICAgIHNlY29uZF9iZXN0ID0gY3VycmVudDtcbiAgICAgIH1cbiAgICAgIGlmIChjdXJyZW50LnJlbGV2YW5jZSA+IHJlc3VsdC5yZWxldmFuY2UpIHtcbiAgICAgICAgc2Vjb25kX2Jlc3QgPSByZXN1bHQ7XG4gICAgICAgIHJlc3VsdCA9IGN1cnJlbnQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHNlY29uZF9iZXN0Lmxhbmd1YWdlKSB7XG4gICAgICByZXN1bHQuc2Vjb25kX2Jlc3QgPSBzZWNvbmRfYmVzdDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qXG4gIFBvc3QtcHJvY2Vzc2luZyBvZiB0aGUgaGlnaGxpZ2h0ZWQgbWFya3VwOlxuXG4gIC0gcmVwbGFjZSBUQUJzIHdpdGggc29tZXRoaW5nIG1vcmUgdXNlZnVsXG4gIC0gcmVwbGFjZSByZWFsIGxpbmUtYnJlYWtzIHdpdGggJzxicj4nIGZvciBub24tcHJlIGNvbnRhaW5lcnNcblxuICAqL1xuICBmdW5jdGlvbiBmaXhNYXJrdXAodmFsdWUpIHtcbiAgICBpZiAoIShvcHRpb25zLnRhYlJlcGxhY2UgfHwgb3B0aW9ucy51c2VCUikpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWUucmVwbGFjZShmaXhNYXJrdXBSZSwgZnVuY3Rpb24obWF0Y2gsIHAxKSB7XG4gICAgICAgIGlmIChvcHRpb25zLnVzZUJSICYmIG1hdGNoID09PSAnXFxuJykge1xuICAgICAgICAgIHJldHVybiAnPGJyPic7XG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy50YWJSZXBsYWNlKSB7XG4gICAgICAgICAgcmV0dXJuIHAxLnJlcGxhY2UoL1xcdC9nLCBvcHRpb25zLnRhYlJlcGxhY2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1aWxkQ2xhc3NOYW1lKHByZXZDbGFzc05hbWUsIGN1cnJlbnRMYW5nLCByZXN1bHRMYW5nKSB7XG4gICAgdmFyIGxhbmd1YWdlID0gY3VycmVudExhbmcgPyBhbGlhc2VzW2N1cnJlbnRMYW5nXSA6IHJlc3VsdExhbmcsXG4gICAgICAgIHJlc3VsdCAgID0gW3ByZXZDbGFzc05hbWUudHJpbSgpXTtcblxuICAgIGlmICghcHJldkNsYXNzTmFtZS5tYXRjaCgvXFxiaGxqc1xcYi8pKSB7XG4gICAgICByZXN1bHQucHVzaCgnaGxqcycpO1xuICAgIH1cblxuICAgIGlmICghcHJldkNsYXNzTmFtZS5pbmNsdWRlcyhsYW5ndWFnZSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGxhbmd1YWdlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0LmpvaW4oJyAnKS50cmltKCk7XG4gIH1cblxuICAvKlxuICBBcHBsaWVzIGhpZ2hsaWdodGluZyB0byBhIERPTSBub2RlIGNvbnRhaW5pbmcgY29kZS4gQWNjZXB0cyBhIERPTSBub2RlIGFuZFxuICB0d28gb3B0aW9uYWwgcGFyYW1ldGVycyBmb3IgZml4TWFya3VwLlxuICAqL1xuICBmdW5jdGlvbiBoaWdobGlnaHRCbG9jayhibG9jaykge1xuICAgIHZhciBub2RlLCBvcmlnaW5hbFN0cmVhbSwgcmVzdWx0LCByZXN1bHROb2RlLCB0ZXh0O1xuICAgIHZhciBsYW5ndWFnZSA9IGJsb2NrTGFuZ3VhZ2UoYmxvY2spO1xuXG4gICAgaWYgKHNob3VsZE5vdEhpZ2hsaWdodChsYW5ndWFnZSkpXG4gICAgICAgIHJldHVybjtcblxuICAgIGZpcmUoXCJiZWZvcmU6aGlnaGxpZ2h0QmxvY2tcIixcbiAgICAgIHsgYmxvY2s6IGJsb2NrLCBsYW5ndWFnZTogbGFuZ3VhZ2V9KTtcblxuICAgIGlmIChvcHRpb25zLnVzZUJSKSB7XG4gICAgICBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBub2RlLmlubmVySFRNTCA9IGJsb2NrLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJycpLnJlcGxhY2UoLzxiclsgXFwvXSo+L2csICdcXG4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZSA9IGJsb2NrO1xuICAgIH1cbiAgICB0ZXh0ID0gbm9kZS50ZXh0Q29udGVudDtcbiAgICByZXN1bHQgPSBsYW5ndWFnZSA/IGhpZ2hsaWdodChsYW5ndWFnZSwgdGV4dCwgdHJ1ZSkgOiBoaWdobGlnaHRBdXRvKHRleHQpO1xuXG4gICAgb3JpZ2luYWxTdHJlYW0gPSBub2RlU3RyZWFtJDEobm9kZSk7XG4gICAgaWYgKG9yaWdpbmFsU3RyZWFtLmxlbmd0aCkge1xuICAgICAgcmVzdWx0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgcmVzdWx0Tm9kZS5pbm5lckhUTUwgPSByZXN1bHQudmFsdWU7XG4gICAgICByZXN1bHQudmFsdWUgPSBtZXJnZVN0cmVhbXMkMShvcmlnaW5hbFN0cmVhbSwgbm9kZVN0cmVhbSQxKHJlc3VsdE5vZGUpLCB0ZXh0KTtcbiAgICB9XG4gICAgcmVzdWx0LnZhbHVlID0gZml4TWFya3VwKHJlc3VsdC52YWx1ZSk7XG5cbiAgICBmaXJlKFwiYWZ0ZXI6aGlnaGxpZ2h0QmxvY2tcIiwgeyBibG9jazogYmxvY2ssIHJlc3VsdDogcmVzdWx0fSk7XG5cbiAgICBibG9jay5pbm5lckhUTUwgPSByZXN1bHQudmFsdWU7XG4gICAgYmxvY2suY2xhc3NOYW1lID0gYnVpbGRDbGFzc05hbWUoYmxvY2suY2xhc3NOYW1lLCBsYW5ndWFnZSwgcmVzdWx0Lmxhbmd1YWdlKTtcbiAgICBibG9jay5yZXN1bHQgPSB7XG4gICAgICBsYW5ndWFnZTogcmVzdWx0Lmxhbmd1YWdlLFxuICAgICAgcmU6IHJlc3VsdC5yZWxldmFuY2VcbiAgICB9O1xuICAgIGlmIChyZXN1bHQuc2Vjb25kX2Jlc3QpIHtcbiAgICAgIGJsb2NrLnNlY29uZF9iZXN0ID0ge1xuICAgICAgICBsYW5ndWFnZTogcmVzdWx0LnNlY29uZF9iZXN0Lmxhbmd1YWdlLFxuICAgICAgICByZTogcmVzdWx0LnNlY29uZF9iZXN0LnJlbGV2YW5jZVxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKlxuICBVcGRhdGVzIGhpZ2hsaWdodC5qcyBnbG9iYWwgb3B0aW9ucyB3aXRoIHZhbHVlcyBwYXNzZWQgaW4gdGhlIGZvcm0gb2YgYW4gb2JqZWN0LlxuICAqL1xuICBmdW5jdGlvbiBjb25maWd1cmUodXNlcl9vcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IGluaGVyaXQkMShvcHRpb25zLCB1c2VyX29wdGlvbnMpO1xuICB9XG5cbiAgLypcbiAgQXBwbGllcyBoaWdobGlnaHRpbmcgdG8gYWxsIDxwcmU+PGNvZGU+Li48L2NvZGU+PC9wcmU+IGJsb2NrcyBvbiBhIHBhZ2UuXG4gICovXG4gIGZ1bmN0aW9uIGluaXRIaWdobGlnaHRpbmcoKSB7XG4gICAgaWYgKGluaXRIaWdobGlnaHRpbmcuY2FsbGVkKVxuICAgICAgcmV0dXJuO1xuICAgIGluaXRIaWdobGlnaHRpbmcuY2FsbGVkID0gdHJ1ZTtcblxuICAgIHZhciBibG9ja3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdwcmUgY29kZScpO1xuICAgIEFycmF5UHJvdG8uZm9yRWFjaC5jYWxsKGJsb2NrcywgaGlnaGxpZ2h0QmxvY2spO1xuICB9XG5cbiAgLypcbiAgQXR0YWNoZXMgaGlnaGxpZ2h0aW5nIHRvIHRoZSBwYWdlIGxvYWQgZXZlbnQuXG4gICovXG4gIGZ1bmN0aW9uIGluaXRIaWdobGlnaHRpbmdPbkxvYWQoKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBpbml0SGlnaGxpZ2h0aW5nLCBmYWxzZSk7XG4gIH1cblxuICBjb25zdCBQTEFJTlRFWFRfTEFOR1VBR0UgPSB7IGRpc2FibGVBdXRvZGV0ZWN0OiB0cnVlLCBuYW1lOiAnUGxhaW4gdGV4dCcgfTtcblxuICBmdW5jdGlvbiByZWdpc3Rlckxhbmd1YWdlKG5hbWUsIGxhbmd1YWdlKSB7XG4gICAgdmFyIGxhbmc7XG4gICAgdHJ5IHsgbGFuZyA9IGxhbmd1YWdlKGhsanMpOyB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiTGFuZ3VhZ2UgZGVmaW5pdGlvbiBmb3IgJ3t9JyBjb3VsZCBub3QgYmUgcmVnaXN0ZXJlZC5cIi5yZXBsYWNlKFwie31cIiwgbmFtZSkpO1xuICAgICAgLy8gaGFyZCBvciBzb2Z0IGVycm9yXG4gICAgICBpZiAoIVNBRkVfTU9ERSkgeyB0aHJvdyBlcnJvcjsgfSBlbHNlIHsgY29uc29sZS5lcnJvcihlcnJvcik7IH1cbiAgICAgIC8vIGxhbmd1YWdlcyB0aGF0IGhhdmUgc2VyaW91cyBlcnJvcnMgYXJlIHJlcGxhY2VkIHdpdGggZXNzZW50aWFsbHkgYVxuICAgICAgLy8gXCJwbGFpbnRleHRcIiBzdGFuZC1pbiBzbyB0aGF0IHRoZSBjb2RlIGJsb2NrcyB3aWxsIHN0aWxsIGdldCBub3JtYWxcbiAgICAgIC8vIGNzcyBjbGFzc2VzIGFwcGxpZWQgdG8gdGhlbSAtIGFuZCBvbmUgYmFkIGxhbmd1YWdlIHdvbid0IGJyZWFrIHRoZVxuICAgICAgLy8gZW50aXJlIGhpZ2hsaWdodGVyXG4gICAgICBsYW5nID0gUExBSU5URVhUX0xBTkdVQUdFO1xuICAgIH1cbiAgICAvLyBnaXZlIGl0IGEgdGVtcG9yYXJ5IG5hbWUgaWYgaXQgZG9lc24ndCBoYXZlIG9uZSBpbiB0aGUgbWV0YS1kYXRhXG4gICAgaWYgKCFsYW5nLm5hbWUpXG4gICAgICBsYW5nLm5hbWUgPSBuYW1lO1xuICAgIGxhbmd1YWdlc1tuYW1lXSA9IGxhbmc7XG4gICAgbGFuZy5yYXdEZWZpbml0aW9uID0gbGFuZ3VhZ2UuYmluZChudWxsLGhsanMpO1xuXG4gICAgaWYgKGxhbmcuYWxpYXNlcykge1xuICAgICAgbGFuZy5hbGlhc2VzLmZvckVhY2goZnVuY3Rpb24oYWxpYXMpIHthbGlhc2VzW2FsaWFzXSA9IG5hbWU7fSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbGlzdExhbmd1YWdlcygpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMobGFuZ3VhZ2VzKTtcbiAgfVxuXG4gIC8qXG4gICAgaW50ZW5kZWQgdXNhZ2U6IFdoZW4gb25lIGxhbmd1YWdlIHRydWx5IHJlcXVpcmVzIGFub3RoZXJcblxuICAgIFVubGlrZSBgZ2V0TGFuZ3VhZ2VgLCB0aGlzIHdpbGwgdGhyb3cgd2hlbiB0aGUgcmVxdWVzdGVkIGxhbmd1YWdlXG4gICAgaXMgbm90IGF2YWlsYWJsZS5cbiAgKi9cbiAgZnVuY3Rpb24gcmVxdWlyZUxhbmd1YWdlKG5hbWUpIHtcbiAgICB2YXIgbGFuZyA9IGdldExhbmd1YWdlKG5hbWUpO1xuICAgIGlmIChsYW5nKSB7IHJldHVybiBsYW5nOyB9XG5cbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdUaGUgXFwne31cXCcgbGFuZ3VhZ2UgaXMgcmVxdWlyZWQsIGJ1dCBub3QgbG9hZGVkLicucmVwbGFjZSgne30nLG5hbWUpKTtcbiAgICB0aHJvdyBlcnI7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRMYW5ndWFnZShuYW1lKSB7XG4gICAgbmFtZSA9IChuYW1lIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiBsYW5ndWFnZXNbbmFtZV0gfHwgbGFuZ3VhZ2VzW2FsaWFzZXNbbmFtZV1dO1xuICB9XG5cbiAgZnVuY3Rpb24gYXV0b0RldGVjdGlvbihuYW1lKSB7XG4gICAgdmFyIGxhbmcgPSBnZXRMYW5ndWFnZShuYW1lKTtcbiAgICByZXR1cm4gbGFuZyAmJiAhbGFuZy5kaXNhYmxlQXV0b2RldGVjdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZFBsdWdpbihwbHVnaW4sIG9wdGlvbnMpIHtcbiAgICBwbHVnaW5zLnB1c2gocGx1Z2luKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpcmUoZXZlbnQsIGFyZ3MpIHtcbiAgICB2YXIgY2IgPSBldmVudDtcbiAgICBwbHVnaW5zLmZvckVhY2goZnVuY3Rpb24gKHBsdWdpbikge1xuICAgICAgaWYgKHBsdWdpbltjYl0pIHtcbiAgICAgICAgcGx1Z2luW2NiXShhcmdzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qIEludGVyZmFjZSBkZWZpbml0aW9uICovXG5cbiAgT2JqZWN0LmFzc2lnbihobGpzLHtcbiAgICBoaWdobGlnaHQsXG4gICAgaGlnaGxpZ2h0QXV0byxcbiAgICBmaXhNYXJrdXAsXG4gICAgaGlnaGxpZ2h0QmxvY2ssXG4gICAgY29uZmlndXJlLFxuICAgIGluaXRIaWdobGlnaHRpbmcsXG4gICAgaW5pdEhpZ2hsaWdodGluZ09uTG9hZCxcbiAgICByZWdpc3Rlckxhbmd1YWdlLFxuICAgIGxpc3RMYW5ndWFnZXMsXG4gICAgZ2V0TGFuZ3VhZ2UsXG4gICAgcmVxdWlyZUxhbmd1YWdlLFxuICAgIGF1dG9EZXRlY3Rpb24sXG4gICAgaW5oZXJpdDogaW5oZXJpdCQxLFxuICAgIGFkZFBsdWdpblxuICB9KTtcblxuICBobGpzLmRlYnVnTW9kZSA9IGZ1bmN0aW9uKCkgeyBTQUZFX01PREUgPSBmYWxzZTsgfTtcbiAgaGxqcy5zYWZlTW9kZSA9IGZ1bmN0aW9uKCkgeyBTQUZFX01PREUgPSB0cnVlOyB9O1xuICBobGpzLnZlcnNpb25TdHJpbmcgPSB2ZXJzaW9uO1xuXG4gIGZvciAoY29uc3Qga2V5IGluIE1PREVTKSB7XG4gICAgaWYgKHR5cGVvZiBNT0RFU1trZXldID09PSBcIm9iamVjdFwiKVxuICAgICAgZGVlcEZyZWV6ZShNT0RFU1trZXldKTtcbiAgfVxuXG4gIC8vIG1lcmdlIGFsbCB0aGUgbW9kZXMvcmVnZXhzIGludG8gb3VyIG1haW4gb2JqZWN0XG4gIE9iamVjdC5hc3NpZ24oaGxqcywgTU9ERVMpO1xuXG4gIHJldHVybiBobGpzO1xufTtcblxuLy8gZXhwb3J0IGFuIFwiaW5zdGFuY2VcIiBvZiB0aGUgaGlnaGxpZ2h0ZXJcbnZhciBoaWdobGlnaHQgPSBITEpTKHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBoaWdobGlnaHQ7XG4iLCIvKlxuTGFuZ3VhZ2U6IEphdmFTY3JpcHRcbkRlc2NyaXB0aW9uOiBKYXZhU2NyaXB0IChKUykgaXMgYSBsaWdodHdlaWdodCwgaW50ZXJwcmV0ZWQsIG9yIGp1c3QtaW4tdGltZSBjb21waWxlZCBwcm9ncmFtbWluZyBsYW5ndWFnZSB3aXRoIGZpcnN0LWNsYXNzIGZ1bmN0aW9ucy5cbkNhdGVnb3J5OiBjb21tb24sIHNjcmlwdGluZ1xuV2Vic2l0ZTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdFxuKi9cblxuZnVuY3Rpb24gamF2YXNjcmlwdChobGpzKSB7XG4gIHZhciBGUkFHTUVOVCA9IHtcbiAgICBiZWdpbjogJzw+JyxcbiAgICBlbmQ6ICc8Lz4nXG4gIH07XG4gIHZhciBYTUxfVEFHID0ge1xuICAgIGJlZ2luOiAvPFtBLVphLXowLTlcXFxcLl86LV0rLyxcbiAgICBlbmQ6IC9cXC9bQS1aYS16MC05XFxcXC5fOi1dKz58XFwvPi9cbiAgfTtcbiAgdmFyIElERU5UX1JFID0gJ1tBLVphLXokX11bMC05QS1aYS16JF9dKic7XG4gIHZhciBLRVlXT1JEUyA9IHtcbiAgICBrZXl3b3JkOlxuICAgICAgJ2luIG9mIGlmIGZvciB3aGlsZSBmaW5hbGx5IHZhciBuZXcgZnVuY3Rpb24gZG8gcmV0dXJuIHZvaWQgZWxzZSBicmVhayBjYXRjaCAnICtcbiAgICAgICdpbnN0YW5jZW9mIHdpdGggdGhyb3cgY2FzZSBkZWZhdWx0IHRyeSB0aGlzIHN3aXRjaCBjb250aW51ZSB0eXBlb2YgZGVsZXRlICcgK1xuICAgICAgJ2xldCB5aWVsZCBjb25zdCBleHBvcnQgc3VwZXIgZGVidWdnZXIgYXMgYXN5bmMgYXdhaXQgc3RhdGljICcgK1xuICAgICAgLy8gRUNNQVNjcmlwdCA2IG1vZHVsZXMgaW1wb3J0XG4gICAgICAnaW1wb3J0IGZyb20gYXMnXG4gICAgLFxuICAgIGxpdGVyYWw6XG4gICAgICAndHJ1ZSBmYWxzZSBudWxsIHVuZGVmaW5lZCBOYU4gSW5maW5pdHknLFxuICAgIGJ1aWx0X2luOlxuICAgICAgJ2V2YWwgaXNGaW5pdGUgaXNOYU4gcGFyc2VGbG9hdCBwYXJzZUludCBkZWNvZGVVUkkgZGVjb2RlVVJJQ29tcG9uZW50ICcgK1xuICAgICAgJ2VuY29kZVVSSSBlbmNvZGVVUklDb21wb25lbnQgZXNjYXBlIHVuZXNjYXBlIE9iamVjdCBGdW5jdGlvbiBCb29sZWFuIEVycm9yICcgK1xuICAgICAgJ0V2YWxFcnJvciBJbnRlcm5hbEVycm9yIFJhbmdlRXJyb3IgUmVmZXJlbmNlRXJyb3IgU3RvcEl0ZXJhdGlvbiBTeW50YXhFcnJvciAnICtcbiAgICAgICdUeXBlRXJyb3IgVVJJRXJyb3IgTnVtYmVyIE1hdGggRGF0ZSBTdHJpbmcgUmVnRXhwIEFycmF5IEZsb2F0MzJBcnJheSAnICtcbiAgICAgICdGbG9hdDY0QXJyYXkgSW50MTZBcnJheSBJbnQzMkFycmF5IEludDhBcnJheSBVaW50MTZBcnJheSBVaW50MzJBcnJheSAnICtcbiAgICAgICdVaW50OEFycmF5IFVpbnQ4Q2xhbXBlZEFycmF5IEFycmF5QnVmZmVyIERhdGFWaWV3IEpTT04gSW50bCBhcmd1bWVudHMgcmVxdWlyZSAnICtcbiAgICAgICdtb2R1bGUgY29uc29sZSB3aW5kb3cgZG9jdW1lbnQgU3ltYm9sIFNldCBNYXAgV2Vha1NldCBXZWFrTWFwIFByb3h5IFJlZmxlY3QgJyArXG4gICAgICAnUHJvbWlzZSdcbiAgfTtcbiAgdmFyIE5VTUJFUiA9IHtcbiAgICBjbGFzc05hbWU6ICdudW1iZXInLFxuICAgIHZhcmlhbnRzOiBbXG4gICAgICB7IGJlZ2luOiAnXFxcXGIoMFtiQl1bMDFdKyluPycgfSxcbiAgICAgIHsgYmVnaW46ICdcXFxcYigwW29PXVswLTddKyluPycgfSxcbiAgICAgIHsgYmVnaW46IGhsanMuQ19OVU1CRVJfUkUgKyAnbj8nIH1cbiAgICBdLFxuICAgIHJlbGV2YW5jZTogMFxuICB9O1xuICB2YXIgU1VCU1QgPSB7XG4gICAgY2xhc3NOYW1lOiAnc3Vic3QnLFxuICAgIGJlZ2luOiAnXFxcXCRcXFxceycsIGVuZDogJ1xcXFx9JyxcbiAgICBrZXl3b3JkczogS0VZV09SRFMsXG4gICAgY29udGFpbnM6IFtdICAvLyBkZWZpbmVkIGxhdGVyXG4gIH07XG4gIHZhciBIVE1MX1RFTVBMQVRFID0ge1xuICAgIGJlZ2luOiAnaHRtbGAnLCBlbmQ6ICcnLFxuICAgIHN0YXJ0czoge1xuICAgICAgZW5kOiAnYCcsIHJldHVybkVuZDogZmFsc2UsXG4gICAgICBjb250YWluczogW1xuICAgICAgICBobGpzLkJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICAgIFNVQlNUXG4gICAgICBdLFxuICAgICAgc3ViTGFuZ3VhZ2U6ICd4bWwnLFxuICAgIH1cbiAgfTtcbiAgdmFyIENTU19URU1QTEFURSA9IHtcbiAgICBiZWdpbjogJ2Nzc2AnLCBlbmQ6ICcnLFxuICAgIHN0YXJ0czoge1xuICAgICAgZW5kOiAnYCcsIHJldHVybkVuZDogZmFsc2UsXG4gICAgICBjb250YWluczogW1xuICAgICAgICBobGpzLkJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICAgIFNVQlNUXG4gICAgICBdLFxuICAgICAgc3ViTGFuZ3VhZ2U6ICdjc3MnLFxuICAgIH1cbiAgfTtcbiAgdmFyIFRFTVBMQVRFX1NUUklORyA9IHtcbiAgICBjbGFzc05hbWU6ICdzdHJpbmcnLFxuICAgIGJlZ2luOiAnYCcsIGVuZDogJ2AnLFxuICAgIGNvbnRhaW5zOiBbXG4gICAgICBobGpzLkJBQ0tTTEFTSF9FU0NBUEUsXG4gICAgICBTVUJTVFxuICAgIF1cbiAgfTtcbiAgU1VCU1QuY29udGFpbnMgPSBbXG4gICAgaGxqcy5BUE9TX1NUUklOR19NT0RFLFxuICAgIGhsanMuUVVPVEVfU1RSSU5HX01PREUsXG4gICAgSFRNTF9URU1QTEFURSxcbiAgICBDU1NfVEVNUExBVEUsXG4gICAgVEVNUExBVEVfU1RSSU5HLFxuICAgIE5VTUJFUixcbiAgICBobGpzLlJFR0VYUF9NT0RFXG4gIF07XG4gIHZhciBQQVJBTVNfQ09OVEFJTlMgPSBTVUJTVC5jb250YWlucy5jb25jYXQoW1xuICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgaGxqcy5DX0xJTkVfQ09NTUVOVF9NT0RFXG4gIF0pO1xuICB2YXIgUEFSQU1TID0ge1xuICAgIGNsYXNzTmFtZTogJ3BhcmFtcycsXG4gICAgYmVnaW46IC9cXCgvLCBlbmQ6IC9cXCkvLFxuICAgIGV4Y2x1ZGVCZWdpbjogdHJ1ZSxcbiAgICBleGNsdWRlRW5kOiB0cnVlLFxuICAgIGNvbnRhaW5zOiBQQVJBTVNfQ09OVEFJTlNcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdKYXZhU2NyaXB0JyxcbiAgICBhbGlhc2VzOiBbJ2pzJywgJ2pzeCcsICdtanMnLCAnY2pzJ10sXG4gICAga2V5d29yZHM6IEtFWVdPUkRTLFxuICAgIGNvbnRhaW5zOiBbXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ21ldGEnLFxuICAgICAgICByZWxldmFuY2U6IDEwLFxuICAgICAgICBiZWdpbjogL15cXHMqWydcIl11c2UgKHN0cmljdHxhc20pWydcIl0vXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBjbGFzc05hbWU6ICdtZXRhJyxcbiAgICAgICAgYmVnaW46IC9eIyEvLCBlbmQ6IC8kL1xuICAgICAgfSxcbiAgICAgIGhsanMuQVBPU19TVFJJTkdfTU9ERSxcbiAgICAgIGhsanMuUVVPVEVfU1RSSU5HX01PREUsXG4gICAgICBIVE1MX1RFTVBMQVRFLFxuICAgICAgQ1NTX1RFTVBMQVRFLFxuICAgICAgVEVNUExBVEVfU1RSSU5HLFxuICAgICAgaGxqcy5DX0xJTkVfQ09NTUVOVF9NT0RFLFxuICAgICAgaGxqcy5DT01NRU5UKFxuICAgICAgICAnL1xcXFwqXFxcXConLFxuICAgICAgICAnXFxcXCovJyxcbiAgICAgICAge1xuICAgICAgICAgIHJlbGV2YW5jZSA6IDAsXG4gICAgICAgICAgY29udGFpbnMgOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNsYXNzTmFtZSA6ICdkb2N0YWcnLFxuICAgICAgICAgICAgICBiZWdpbiA6ICdAW0EtWmEtel0rJyxcbiAgICAgICAgICAgICAgY29udGFpbnMgOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAndHlwZScsXG4gICAgICAgICAgICAgICAgICBiZWdpbjogJ1xcXFx7JyxcbiAgICAgICAgICAgICAgICAgIGVuZDogJ1xcXFx9JyxcbiAgICAgICAgICAgICAgICAgIHJlbGV2YW5jZTogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAndmFyaWFibGUnLFxuICAgICAgICAgICAgICAgICAgYmVnaW46IElERU5UX1JFICsgJyg/PVxcXFxzKigtKXwkKScsXG4gICAgICAgICAgICAgICAgICBlbmRzUGFyZW50OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgcmVsZXZhbmNlOiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBlYXQgc3BhY2VzIChub3QgbmV3bGluZXMpIHNvIHdlIGNhbiBmaW5kXG4gICAgICAgICAgICAgICAgLy8gdHlwZXMgb3IgdmFyaWFibGVzXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYmVnaW46IC8oPz1bXlxcbl0pXFxzLyxcbiAgICAgICAgICAgICAgICAgIHJlbGV2YW5jZTogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICksXG4gICAgICBobGpzLkNfQkxPQ0tfQ09NTUVOVF9NT0RFLFxuICAgICAgTlVNQkVSLFxuICAgICAgeyAvLyBvYmplY3QgYXR0ciBjb250YWluZXJcbiAgICAgICAgYmVnaW46IC9beyxcXG5dXFxzKi8sIHJlbGV2YW5jZTogMCxcbiAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBiZWdpbjogSURFTlRfUkUgKyAnXFxcXHMqOicsIHJldHVybkJlZ2luOiB0cnVlLFxuICAgICAgICAgICAgcmVsZXZhbmNlOiAwLFxuICAgICAgICAgICAgY29udGFpbnM6IFt7Y2xhc3NOYW1lOiAnYXR0cicsIGJlZ2luOiBJREVOVF9SRSwgcmVsZXZhbmNlOiAwfV1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB7IC8vIFwidmFsdWVcIiBjb250YWluZXJcbiAgICAgICAgYmVnaW46ICcoJyArIGhsanMuUkVfU1RBUlRFUlNfUkUgKyAnfFxcXFxiKGNhc2V8cmV0dXJufHRocm93KVxcXFxiKVxcXFxzKicsXG4gICAgICAgIGtleXdvcmRzOiAncmV0dXJuIHRocm93IGNhc2UnLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIGhsanMuQ19MSU5FX0NPTU1FTlRfTU9ERSxcbiAgICAgICAgICBobGpzLkNfQkxPQ0tfQ09NTUVOVF9NT0RFLFxuICAgICAgICAgIGhsanMuUkVHRVhQX01PREUsXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgYmVnaW46ICcoXFxcXCguKj9cXFxcKXwnICsgSURFTlRfUkUgKyAnKVxcXFxzKj0+JywgcmV0dXJuQmVnaW46IHRydWUsXG4gICAgICAgICAgICBlbmQ6ICdcXFxccyo9PicsXG4gICAgICAgICAgICBjb250YWluczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAncGFyYW1zJyxcbiAgICAgICAgICAgICAgICB2YXJpYW50czogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBiZWdpbjogSURFTlRfUkVcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGJlZ2luOiAvXFwoXFxzKlxcKS8sXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBiZWdpbjogL1xcKC8sIGVuZDogL1xcKS8sXG4gICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVCZWdpbjogdHJ1ZSwgZXhjbHVkZUVuZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAga2V5d29yZHM6IEtFWVdPUkRTLFxuICAgICAgICAgICAgICAgICAgICBjb250YWluczogUEFSQU1TX0NPTlRBSU5TXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7IC8vIGNvdWxkIGJlIGEgY29tbWEgZGVsaW1pdGVkIGxpc3Qgb2YgcGFyYW1zIHRvIGEgZnVuY3Rpb24gY2FsbFxuICAgICAgICAgICAgYmVnaW46IC8sLywgcmVsZXZhbmNlOiAwLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiAnJyxcbiAgICAgICAgICAgIGJlZ2luOiAvXFxzLyxcbiAgICAgICAgICAgIGVuZDogL1xccyovLFxuICAgICAgICAgICAgc2tpcDogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHsgLy8gSlNYXG4gICAgICAgICAgICB2YXJpYW50czogW1xuICAgICAgICAgICAgICB7IGJlZ2luOiBGUkFHTUVOVC5iZWdpbiwgZW5kOiBGUkFHTUVOVC5lbmQgfSxcbiAgICAgICAgICAgICAgeyBiZWdpbjogWE1MX1RBRy5iZWdpbiwgZW5kOiBYTUxfVEFHLmVuZCB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgc3ViTGFuZ3VhZ2U6ICd4bWwnLFxuICAgICAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGJlZ2luOiBYTUxfVEFHLmJlZ2luLCBlbmQ6IFhNTF9UQUcuZW5kLCBza2lwOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbnRhaW5zOiBbJ3NlbGYnXVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgcmVsZXZhbmNlOiAwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBjbGFzc05hbWU6ICdmdW5jdGlvbicsXG4gICAgICAgIGJlZ2luS2V5d29yZHM6ICdmdW5jdGlvbicsIGVuZDogL1xcey8sIGV4Y2x1ZGVFbmQ6IHRydWUsXG4gICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAgaGxqcy5pbmhlcml0KGhsanMuVElUTEVfTU9ERSwge2JlZ2luOiBJREVOVF9SRX0pLFxuICAgICAgICAgIFBBUkFNU1xuICAgICAgICBdLFxuICAgICAgICBpbGxlZ2FsOiAvXFxbfCUvXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBiZWdpbjogL1xcJFsoLl0vIC8vIHJlbGV2YW5jZSBib29zdGVyIGZvciBhIHBhdHRlcm4gY29tbW9uIHRvIEpTIGxpYnM6IGAkKHNvbWV0aGluZylgIGFuZCBgJC5zb21ldGhpbmdgXG4gICAgICB9LFxuXG4gICAgICBobGpzLk1FVEhPRF9HVUFSRCxcbiAgICAgIHsgLy8gRVM2IGNsYXNzXG4gICAgICAgIGNsYXNzTmFtZTogJ2NsYXNzJyxcbiAgICAgICAgYmVnaW5LZXl3b3JkczogJ2NsYXNzJywgZW5kOiAvW3s7PV0vLCBleGNsdWRlRW5kOiB0cnVlLFxuICAgICAgICBpbGxlZ2FsOiAvWzpcIlxcW1xcXV0vLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIHtiZWdpbktleXdvcmRzOiAnZXh0ZW5kcyd9LFxuICAgICAgICAgIGhsanMuVU5ERVJTQ09SRV9USVRMRV9NT0RFXG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGJlZ2luS2V5d29yZHM6ICdjb25zdHJ1Y3RvcicsIGVuZDogL1xcey8sIGV4Y2x1ZGVFbmQ6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGJlZ2luOicoZ2V0fHNldClcXFxccyooPz0nICsgSURFTlRfUkUrICdcXFxcKCknLFxuICAgICAgICBlbmQ6IC97LyxcbiAgICAgICAga2V5d29yZHM6IFwiZ2V0IHNldFwiLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIGhsanMuaW5oZXJpdChobGpzLlRJVExFX01PREUsIHtiZWdpbjogSURFTlRfUkV9KSxcbiAgICAgICAgICB7IGJlZ2luOiAvXFwoXFwpLyB9LCAvLyBlYXQgdG8gYXZvaWQgZW1wdHkgcGFyYW1zXG4gICAgICAgICAgUEFSQU1TXG4gICAgICAgIF1cblxuICAgICAgfVxuICAgIF0sXG4gICAgaWxsZWdhbDogLyMoPyEhKS9cbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBqYXZhc2NyaXB0O1xuIiwiLypcbkxhbmd1YWdlOiBCYXNoXG5BdXRob3I6IHZhaCA8dmFodGVuYmVyZ0BnbWFpbC5jb20+XG5Db250cmlidXRyb3JzOiBCZW5qYW1pbiBQYW5uZWxsIDxjb250YWN0QHNpZXJyYXNvZnR3b3Jrcy5jb20+XG5XZWJzaXRlOiBodHRwczovL3d3dy5nbnUub3JnL3NvZnR3YXJlL2Jhc2gvXG5DYXRlZ29yeTogY29tbW9uXG4qL1xuXG5mdW5jdGlvbiBiYXNoKGhsanMpIHtcbiAgY29uc3QgVkFSID0ge307XG4gIGNvbnN0IEJSQUNFRF9WQVIgPSB7XG4gICAgYmVnaW46IC9cXCRcXHsvLCBlbmQ6L1xcfS8sXG4gICAgY29udGFpbnM6IFtcbiAgICAgIHsgYmVnaW46IC86LS8sIGNvbnRhaW5zOiBbVkFSXSB9IC8vIGRlZmF1bHQgdmFsdWVzXG4gICAgXVxuICB9O1xuICBPYmplY3QuYXNzaWduKFZBUix7XG4gICAgY2xhc3NOYW1lOiAndmFyaWFibGUnLFxuICAgIHZhcmlhbnRzOiBbXG4gICAgICB7YmVnaW46IC9cXCRbXFx3XFxkI0BdW1xcd1xcZF9dKi99LFxuICAgICAgQlJBQ0VEX1ZBUlxuICAgIF1cbiAgfSk7XG5cbiAgY29uc3QgU1VCU1QgPSB7XG4gICAgY2xhc3NOYW1lOiAnc3Vic3QnLFxuICAgIGJlZ2luOiAvXFwkXFwoLywgZW5kOiAvXFwpLyxcbiAgICBjb250YWluczogW2hsanMuQkFDS1NMQVNIX0VTQ0FQRV1cbiAgfTtcbiAgY29uc3QgUVVPVEVfU1RSSU5HID0ge1xuICAgIGNsYXNzTmFtZTogJ3N0cmluZycsXG4gICAgYmVnaW46IC9cIi8sIGVuZDogL1wiLyxcbiAgICBjb250YWluczogW1xuICAgICAgaGxqcy5CQUNLU0xBU0hfRVNDQVBFLFxuICAgICAgVkFSLFxuICAgICAgU1VCU1RcbiAgICBdXG4gIH07XG4gIFNVQlNULmNvbnRhaW5zLnB1c2goUVVPVEVfU1RSSU5HKTtcbiAgY29uc3QgRVNDQVBFRF9RVU9URSA9IHtcbiAgICBjbGFzc05hbWU6ICcnLFxuICAgIGJlZ2luOiAvXFxcXFwiL1xuXG4gIH07XG4gIGNvbnN0IEFQT1NfU1RSSU5HID0ge1xuICAgIGNsYXNzTmFtZTogJ3N0cmluZycsXG4gICAgYmVnaW46IC8nLywgZW5kOiAvJy9cbiAgfTtcbiAgY29uc3QgQVJJVEhNRVRJQyA9IHtcbiAgICBiZWdpbjogL1xcJFxcKFxcKC8sXG4gICAgZW5kOiAvXFwpXFwpLyxcbiAgICBjb250YWluczogW1xuICAgICAgeyBiZWdpbjogL1xcZCsjWzAtOWEtZl0rLywgY2xhc3NOYW1lOiBcIm51bWJlclwiIH0sXG4gICAgICBobGpzLk5VTUJFUl9NT0RFLFxuICAgICAgVkFSXG4gICAgXVxuICB9O1xuICBjb25zdCBTSEVCQU5HID0ge1xuICAgIGNsYXNzTmFtZTogJ21ldGEnLFxuICAgIGJlZ2luOiAvXiMhW15cXG5dK3NoXFxzKiQvLFxuICAgIHJlbGV2YW5jZTogMTBcbiAgfTtcbiAgY29uc3QgRlVOQ1RJT04gPSB7XG4gICAgY2xhc3NOYW1lOiAnZnVuY3Rpb24nLFxuICAgIGJlZ2luOiAvXFx3W1xcd1xcZF9dKlxccypcXChcXHMqXFwpXFxzKlxcey8sXG4gICAgcmV0dXJuQmVnaW46IHRydWUsXG4gICAgY29udGFpbnM6IFtobGpzLmluaGVyaXQoaGxqcy5USVRMRV9NT0RFLCB7YmVnaW46IC9cXHdbXFx3XFxkX10qL30pXSxcbiAgICByZWxldmFuY2U6IDBcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdCYXNoJyxcbiAgICBhbGlhc2VzOiBbJ3NoJywgJ3pzaCddLFxuICAgIGxleGVtZXM6IC9cXGItP1thLXpcXC5fXStcXGIvLFxuICAgIGtleXdvcmRzOiB7XG4gICAgICBrZXl3b3JkOlxuICAgICAgICAnaWYgdGhlbiBlbHNlIGVsaWYgZmkgZm9yIHdoaWxlIGluIGRvIGRvbmUgY2FzZSBlc2FjIGZ1bmN0aW9uJyxcbiAgICAgIGxpdGVyYWw6XG4gICAgICAgICd0cnVlIGZhbHNlJyxcbiAgICAgIGJ1aWx0X2luOlxuICAgICAgICAvLyBTaGVsbCBidWlsdC1pbnNcbiAgICAgICAgLy8gaHR0cDovL3d3dy5nbnUub3JnL3NvZnR3YXJlL2Jhc2gvbWFudWFsL2h0bWxfbm9kZS9TaGVsbC1CdWlsdGluLUNvbW1hbmRzLmh0bWxcbiAgICAgICAgJ2JyZWFrIGNkIGNvbnRpbnVlIGV2YWwgZXhlYyBleGl0IGV4cG9ydCBnZXRvcHRzIGhhc2ggcHdkIHJlYWRvbmx5IHJldHVybiBzaGlmdCB0ZXN0IHRpbWVzICcgK1xuICAgICAgICAndHJhcCB1bWFzayB1bnNldCAnICtcbiAgICAgICAgLy8gQmFzaCBidWlsdC1pbnNcbiAgICAgICAgJ2FsaWFzIGJpbmQgYnVpbHRpbiBjYWxsZXIgY29tbWFuZCBkZWNsYXJlIGVjaG8gZW5hYmxlIGhlbHAgbGV0IGxvY2FsIGxvZ291dCBtYXBmaWxlIHByaW50ZiAnICtcbiAgICAgICAgJ3JlYWQgcmVhZGFycmF5IHNvdXJjZSB0eXBlIHR5cGVzZXQgdWxpbWl0IHVuYWxpYXMgJyArXG4gICAgICAgIC8vIFNoZWxsIG1vZGlmaWVyc1xuICAgICAgICAnc2V0IHNob3B0ICcgK1xuICAgICAgICAvLyBac2ggYnVpbHQtaW5zXG4gICAgICAgICdhdXRvbG9hZCBiZyBiaW5ka2V5IGJ5ZSBjYXAgY2hkaXIgY2xvbmUgY29tcGFyZ3VtZW50cyBjb21wY2FsbCBjb21wY3RsIGNvbXBkZXNjcmliZSBjb21wZmlsZXMgJyArXG4gICAgICAgICdjb21wZ3JvdXBzIGNvbXBxdW90ZSBjb21wdGFncyBjb21wdHJ5IGNvbXB2YWx1ZXMgZGlycyBkaXNhYmxlIGRpc293biBlY2hvdGMgZWNob3RpIGVtdWxhdGUgJyArXG4gICAgICAgICdmYyBmZyBmbG9hdCBmdW5jdGlvbnMgZ2V0Y2FwIGdldGxuIGhpc3RvcnkgaW50ZWdlciBqb2JzIGtpbGwgbGltaXQgbG9nIG5vZ2xvYiBwb3BkIHByaW50ICcgK1xuICAgICAgICAncHVzaGQgcHVzaGxuIHJlaGFzaCBzY2hlZCBzZXRjYXAgc2V0b3B0IHN0YXQgc3VzcGVuZCB0dHljdGwgdW5mdW5jdGlvbiB1bmhhc2ggdW5saW1pdCAnICtcbiAgICAgICAgJ3Vuc2V0b3B0IHZhcmVkIHdhaXQgd2hlbmNlIHdoZXJlIHdoaWNoIHpjb21waWxlIHpmb3JtYXQgemZ0cCB6bGUgem1vZGxvYWQgenBhcnNlb3B0cyB6cHJvZiAnICtcbiAgICAgICAgJ3pwdHkgenJlZ2V4cGFyc2UgenNvY2tldCB6c3R5bGUgenRjcCcsXG4gICAgICBfOlxuICAgICAgICAnLW5lIC1lcSAtbHQgLWd0IC1mIC1kIC1lIC1zIC1sIC1hJyAvLyByZWxldmFuY2UgYm9vc3RlclxuICAgIH0sXG4gICAgY29udGFpbnM6IFtcbiAgICAgIFNIRUJBTkcsXG4gICAgICBGVU5DVElPTixcbiAgICAgIEFSSVRITUVUSUMsXG4gICAgICBobGpzLkhBU0hfQ09NTUVOVF9NT0RFLFxuICAgICAgUVVPVEVfU1RSSU5HLFxuICAgICAgRVNDQVBFRF9RVU9URSxcbiAgICAgIEFQT1NfU1RSSU5HLFxuICAgICAgVkFSXG4gICAgXVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2g7XG4iLCIvKlxuIExhbmd1YWdlOiBTUUxcbiBDb250cmlidXRvcnM6IE5pa29sYXkgTGlzaWVua28gPGluZm9AbmVvci5ydT4sIEhlaWtvIEF1Z3VzdCA8cG9zdEBhdWdlODQ3Mi5kZT4sIFRyYXZpcyBPZG9tIDx0cmF2aXMuYS5vZG9tQGdtYWlsLmNvbT4sIFZhZGltdHJvIDx2YWRpbXRyb0B5YWhvby5jb20+LCBCZW5qYW1pbiBBdWRlciA8YmVuamFtaW4uYXVkZXJAZ21haWwuY29tPlxuIFdlYnNpdGU6IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1NRTFxuIENhdGVnb3J5OiBjb21tb25cbiAqL1xuXG5mdW5jdGlvbiBzcWwoaGxqcykge1xuICB2YXIgQ09NTUVOVF9NT0RFID0gaGxqcy5DT01NRU5UKCctLScsICckJyk7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ1NRTCcsXG4gICAgY2FzZV9pbnNlbnNpdGl2ZTogdHJ1ZSxcbiAgICBpbGxlZ2FsOiAvWzw+e30qXS8sXG4gICAgY29udGFpbnM6IFtcbiAgICAgIHtcbiAgICAgICAgYmVnaW5LZXl3b3JkczpcbiAgICAgICAgICAnYmVnaW4gZW5kIHN0YXJ0IGNvbW1pdCByb2xsYmFjayBzYXZlcG9pbnQgbG9jayBhbHRlciBjcmVhdGUgZHJvcCByZW5hbWUgY2FsbCAnICtcbiAgICAgICAgICAnZGVsZXRlIGRvIGhhbmRsZXIgaW5zZXJ0IGxvYWQgcmVwbGFjZSBzZWxlY3QgdHJ1bmNhdGUgdXBkYXRlIHNldCBzaG93IHByYWdtYSBncmFudCAnICtcbiAgICAgICAgICAnbWVyZ2UgZGVzY3JpYmUgdXNlIGV4cGxhaW4gaGVscCBkZWNsYXJlIHByZXBhcmUgZXhlY3V0ZSBkZWFsbG9jYXRlIHJlbGVhc2UgJyArXG4gICAgICAgICAgJ3VubG9jayBwdXJnZSByZXNldCBjaGFuZ2Ugc3RvcCBhbmFseXplIGNhY2hlIGZsdXNoIG9wdGltaXplIHJlcGFpciBraWxsICcgK1xuICAgICAgICAgICdpbnN0YWxsIHVuaW5zdGFsbCBjaGVja3N1bSByZXN0b3JlIGNoZWNrIGJhY2t1cCByZXZva2UgY29tbWVudCB2YWx1ZXMgd2l0aCcsXG4gICAgICAgIGVuZDogLzsvLCBlbmRzV2l0aFBhcmVudDogdHJ1ZSxcbiAgICAgICAgbGV4ZW1lczogL1tcXHdcXC5dKy8sXG4gICAgICAgIGtleXdvcmRzOiB7XG4gICAgICAgICAga2V5d29yZDpcbiAgICAgICAgICAgICdhcyBhYm9ydCBhYnMgYWJzb2x1dGUgYWNjIGFjY2UgYWNjZXAgYWNjZXB0IGFjY2VzcyBhY2Nlc3NlZCBhY2Nlc3NpYmxlIGFjY291bnQgYWNvcyBhY3Rpb24gYWN0aXZhdGUgYWRkICcgK1xuICAgICAgICAgICAgJ2FkZHRpbWUgYWRtaW4gYWRtaW5pc3RlciBhZHZhbmNlZCBhZHZpc2UgYWVzX2RlY3J5cHQgYWVzX2VuY3J5cHQgYWZ0ZXIgYWdlbnQgYWdncmVnYXRlIGFsaSBhbGlhIGFsaWFzICcgK1xuICAgICAgICAgICAgJ2FsbCBhbGxvY2F0ZSBhbGxvdyBhbHRlciBhbHdheXMgYW5hbHl6ZSBhbmNpbGxhcnkgYW5kIGFudGkgYW55IGFueWRhdGEgYW55ZGF0YXNldCBhbnlzY2hlbWEgYW55dHlwZSBhcHBseSAnICtcbiAgICAgICAgICAgICdhcmNoaXZlIGFyY2hpdmVkIGFyY2hpdmVsb2cgYXJlIGFzIGFzYyBhc2NpaSBhc2luIGFzc2VtYmx5IGFzc2VydGlvbiBhc3NvY2lhdGUgYXN5bmNocm9ub3VzIGF0IGF0YW4gJyArXG4gICAgICAgICAgICAnYXRuMiBhdHRyIGF0dHJpIGF0dHJpYiBhdHRyaWJ1IGF0dHJpYnV0IGF0dHJpYnV0ZSBhdHRyaWJ1dGVzIGF1ZGl0IGF1dGhlbnRpY2F0ZWQgYXV0aGVudGljYXRpb24gYXV0aGlkICcgK1xuICAgICAgICAgICAgJ2F1dGhvcnMgYXV0byBhdXRvYWxsb2NhdGUgYXV0b2RibGluayBhdXRvZXh0ZW5kIGF1dG9tYXRpYyBhdmFpbGFiaWxpdHkgYXZnIGJhY2t1cCBiYWRmaWxlIGJhc2ljZmlsZSAnICtcbiAgICAgICAgICAgICdiZWZvcmUgYmVnaW4gYmVnaW5uaW5nIGJlbmNobWFyayBiZXR3ZWVuIGJmaWxlIGJmaWxlX2Jhc2UgYmlnIGJpZ2ZpbGUgYmluIGJpbmFyeV9kb3VibGUgYmluYXJ5X2Zsb2F0ICcgK1xuICAgICAgICAgICAgJ2JpbmxvZyBiaXRfYW5kIGJpdF9jb3VudCBiaXRfbGVuZ3RoIGJpdF9vciBiaXRfeG9yIGJpdG1hcCBibG9iX2Jhc2UgYmxvY2sgYmxvY2tzaXplIGJvZHkgYm90aCBib3VuZCAnICtcbiAgICAgICAgICAgICdidWNrZXQgYnVmZmVyX2NhY2hlIGJ1ZmZlcl9wb29sIGJ1aWxkIGJ1bGsgYnkgYnl0ZSBieXRlb3JkZXJtYXJrIGJ5dGVzIGNhY2hlIGNhY2hpbmcgY2FsbCBjYWxsaW5nIGNhbmNlbCAnICtcbiAgICAgICAgICAgICdjYXBhY2l0eSBjYXNjYWRlIGNhc2NhZGVkIGNhc2UgY2FzdCBjYXRhbG9nIGNhdGVnb3J5IGNlaWwgY2VpbGluZyBjaGFpbiBjaGFuZ2UgY2hhbmdlZCBjaGFyX2Jhc2UgJyArXG4gICAgICAgICAgICAnY2hhcl9sZW5ndGggY2hhcmFjdGVyX2xlbmd0aCBjaGFyYWN0ZXJzIGNoYXJhY3RlcnNldCBjaGFyaW5kZXggY2hhcnNldCBjaGFyc2V0Zm9ybSBjaGFyc2V0aWQgY2hlY2sgJyArXG4gICAgICAgICAgICAnY2hlY2tzdW0gY2hlY2tzdW1fYWdnIGNoaWxkIGNob29zZSBjaHIgY2h1bmsgY2xhc3MgY2xlYW51cCBjbGVhciBjbGllbnQgY2xvYiBjbG9iX2Jhc2UgY2xvbmUgY2xvc2UgJyArXG4gICAgICAgICAgICAnY2x1c3Rlcl9pZCBjbHVzdGVyX3Byb2JhYmlsaXR5IGNsdXN0ZXJfc2V0IGNsdXN0ZXJpbmcgY29hbGVzY2UgY29lcmNpYmlsaXR5IGNvbCBjb2xsYXRlIGNvbGxhdGlvbiAnICtcbiAgICAgICAgICAgICdjb2xsZWN0IGNvbHUgY29sdW0gY29sdW1uIGNvbHVtbl92YWx1ZSBjb2x1bW5zIGNvbHVtbnNfdXBkYXRlZCBjb21tZW50IGNvbW1pdCBjb21wYWN0IGNvbXBhdGliaWxpdHkgJyArXG4gICAgICAgICAgICAnY29tcGlsZWQgY29tcGxldGUgY29tcG9zaXRlX2xpbWl0IGNvbXBvdW5kIGNvbXByZXNzIGNvbXB1dGUgY29uY2F0IGNvbmNhdF93cyBjb25jdXJyZW50IGNvbmZpcm0gY29ubiAnICtcbiAgICAgICAgICAgICdjb25uZWMgY29ubmVjdCBjb25uZWN0X2J5X2lzY3ljbGUgY29ubmVjdF9ieV9pc2xlYWYgY29ubmVjdF9ieV9yb290IGNvbm5lY3RfdGltZSBjb25uZWN0aW9uICcgK1xuICAgICAgICAgICAgJ2NvbnNpZGVyIGNvbnNpc3RlbnQgY29uc3RhbnQgY29uc3RyYWludCBjb25zdHJhaW50cyBjb25zdHJ1Y3RvciBjb250YWluZXIgY29udGVudCBjb250ZW50cyBjb250ZXh0ICcgK1xuICAgICAgICAgICAgJ2NvbnRyaWJ1dG9ycyBjb250cm9sZmlsZSBjb252IGNvbnZlcnQgY29udmVydF90eiBjb3JyIGNvcnJfayBjb3JyX3MgY29ycmVzcG9uZGluZyBjb3JydXB0aW9uIGNvcyBjb3N0ICcgK1xuICAgICAgICAgICAgJ2NvdW50IGNvdW50X2JpZyBjb3VudGVkIGNvdmFyX3BvcCBjb3Zhcl9zYW1wIGNwdV9wZXJfY2FsbCBjcHVfcGVyX3Nlc3Npb24gY3JjMzIgY3JlYXRlIGNyZWF0aW9uICcgK1xuICAgICAgICAgICAgJ2NyaXRpY2FsIGNyb3NzIGN1YmUgY3VtZV9kaXN0IGN1cmRhdGUgY3VycmVudCBjdXJyZW50X2RhdGUgY3VycmVudF90aW1lIGN1cnJlbnRfdGltZXN0YW1wIGN1cnJlbnRfdXNlciAnICtcbiAgICAgICAgICAgICdjdXJzb3IgY3VydGltZSBjdXN0b21kYXR1bSBjeWNsZSBkYXRhIGRhdGFiYXNlIGRhdGFiYXNlcyBkYXRhZmlsZSBkYXRhZmlsZXMgZGF0YWxlbmd0aCBkYXRlX2FkZCAnICtcbiAgICAgICAgICAgICdkYXRlX2NhY2hlIGRhdGVfZm9ybWF0IGRhdGVfc3ViIGRhdGVhZGQgZGF0ZWRpZmYgZGF0ZWZyb21wYXJ0cyBkYXRlbmFtZSBkYXRlcGFydCBkYXRldGltZTJmcm9tcGFydHMgJyArXG4gICAgICAgICAgICAnZGF5IGRheV90b19zZWNvbmQgZGF5bmFtZSBkYXlvZm1vbnRoIGRheW9md2VlayBkYXlvZnllYXIgZGF5cyBkYl9yb2xlX2NoYW5nZSBkYnRpbWV6b25lIGRkbCBkZWFsbG9jYXRlICcgK1xuICAgICAgICAgICAgJ2RlY2xhcmUgZGVjb2RlIGRlY29tcG9zZSBkZWNyZW1lbnQgZGVjcnlwdCBkZWR1cGxpY2F0ZSBkZWYgZGVmYSBkZWZhdSBkZWZhdWwgZGVmYXVsdCBkZWZhdWx0cyAnICtcbiAgICAgICAgICAgICdkZWZlcnJlZCBkZWZpIGRlZmluIGRlZmluZSBkZWdyZWVzIGRlbGF5ZWQgZGVsZWdhdGUgZGVsZXRlIGRlbGV0ZV9hbGwgZGVsaW1pdGVkIGRlbWFuZCBkZW5zZV9yYW5rICcgK1xuICAgICAgICAgICAgJ2RlcHRoIGRlcXVldWUgZGVzX2RlY3J5cHQgZGVzX2VuY3J5cHQgZGVzX2tleV9maWxlIGRlc2MgZGVzY3IgZGVzY3JpIGRlc2NyaWIgZGVzY3JpYmUgZGVzY3JpcHRvciAnICtcbiAgICAgICAgICAgICdkZXRlcm1pbmlzdGljIGRpYWdub3N0aWNzIGRpZmZlcmVuY2UgZGltZW5zaW9uIGRpcmVjdF9sb2FkIGRpcmVjdG9yeSBkaXNhYmxlIGRpc2FibGVfYWxsICcgK1xuICAgICAgICAgICAgJ2Rpc2FsbG93IGRpc2Fzc29jaWF0ZSBkaXNjYXJkZmlsZSBkaXNjb25uZWN0IGRpc2tncm91cCBkaXN0aW5jdCBkaXN0aW5jdHJvdyBkaXN0cmlidXRlIGRpc3RyaWJ1dGVkIGRpdiAnICtcbiAgICAgICAgICAgICdkbyBkb2N1bWVudCBkb21haW4gZG90bmV0IGRvdWJsZSBkb3duZ3JhZGUgZHJvcCBkdW1wZmlsZSBkdXBsaWNhdGUgZHVyYXRpb24gZWFjaCBlZGl0aW9uIGVkaXRpb25hYmxlICcgK1xuICAgICAgICAgICAgJ2VkaXRpb25zIGVsZW1lbnQgZWxsaXBzaXMgZWxzZSBlbHNpZiBlbHQgZW1wdHkgZW5hYmxlIGVuYWJsZV9hbGwgZW5jbG9zZWQgZW5jb2RlIGVuY29kaW5nIGVuY3J5cHQgJyArXG4gICAgICAgICAgICAnZW5kIGVuZC1leGVjIGVuZGlhbiBlbmZvcmNlZCBlbmdpbmUgZW5naW5lcyBlbnF1ZXVlIGVudGVycHJpc2UgZW50aXR5ZXNjYXBpbmcgZW9tb250aCBlcnJvciBlcnJvcnMgJyArXG4gICAgICAgICAgICAnZXNjYXBlZCBldmFsbmFtZSBldmFsdWF0ZSBldmVudCBldmVudGRhdGEgZXZlbnRzIGV4Y2VwdCBleGNlcHRpb24gZXhjZXB0aW9ucyBleGNoYW5nZSBleGNsdWRlIGV4Y2x1ZGluZyAnICtcbiAgICAgICAgICAgICdleGVjdSBleGVjdXQgZXhlY3V0ZSBleGVtcHQgZXhpc3RzIGV4aXQgZXhwIGV4cGlyZSBleHBsYWluIGV4cGxvZGUgZXhwb3J0IGV4cG9ydF9zZXQgZXh0ZW5kZWQgZXh0ZW50IGV4dGVybmFsICcgK1xuICAgICAgICAgICAgJ2V4dGVybmFsXzEgZXh0ZXJuYWxfMiBleHRlcm5hbGx5IGV4dHJhY3QgZmFpbGVkIGZhaWxlZF9sb2dpbl9hdHRlbXB0cyBmYWlsb3ZlciBmYWlsdXJlIGZhciBmYXN0ICcgK1xuICAgICAgICAgICAgJ2ZlYXR1cmVfc2V0IGZlYXR1cmVfdmFsdWUgZmV0Y2ggZmllbGQgZmllbGRzIGZpbGUgZmlsZV9uYW1lX2NvbnZlcnQgZmlsZXN5c3RlbV9saWtlX2xvZ2dpbmcgZmluYWwgJyArXG4gICAgICAgICAgICAnZmluaXNoIGZpcnN0IGZpcnN0X3ZhbHVlIGZpeGVkIGZsYXNoX2NhY2hlIGZsYXNoYmFjayBmbG9vciBmbHVzaCBmb2xsb3dpbmcgZm9sbG93cyBmb3IgZm9yYWxsIGZvcmNlIGZvcmVpZ24gJyArXG4gICAgICAgICAgICAnZm9ybSBmb3JtYSBmb3JtYXQgZm91bmQgZm91bmRfcm93cyBmcmVlbGlzdCBmcmVlbGlzdHMgZnJlZXBvb2xzIGZyZXNoIGZyb20gZnJvbV9iYXNlNjQgZnJvbV9kYXlzICcgK1xuICAgICAgICAgICAgJ2Z0cCBmdWxsIGZ1bmN0aW9uIGdlbmVyYWwgZ2VuZXJhdGVkIGdldCBnZXRfZm9ybWF0IGdldF9sb2NrIGdldGRhdGUgZ2V0dXRjZGF0ZSBnbG9iYWwgZ2xvYmFsX25hbWUgJyArXG4gICAgICAgICAgICAnZ2xvYmFsbHkgZ28gZ290byBncmFudCBncmFudHMgZ3JlYXRlc3QgZ3JvdXAgZ3JvdXBfY29uY2F0IGdyb3VwX2lkIGdyb3VwaW5nIGdyb3VwaW5nX2lkIGdyb3VwcyAnICtcbiAgICAgICAgICAgICdndGlkX3N1YnRyYWN0IGd1YXJhbnRlZSBndWFyZCBoYW5kbGVyIGhhc2ggaGFzaGtleXMgaGF2aW5nIGhlYSBoZWFkIGhlYWRpIGhlYWRpbiBoZWFkaW5nIGhlYXAgaGVscCBoZXggJyArXG4gICAgICAgICAgICAnaGllcmFyY2h5IGhpZ2ggaGlnaF9wcmlvcml0eSBob3N0cyBob3VyIGhvdXJzIGh0dHAgaWQgaWRlbnRfY3VycmVudCBpZGVudF9pbmNyIGlkZW50X3NlZWQgaWRlbnRpZmllZCAnICtcbiAgICAgICAgICAgICdpZGVudGl0eSBpZGxlX3RpbWUgaWYgaWZudWxsIGlnbm9yZSBpaWYgaWxpa2UgaWxtIGltbWVkaWF0ZSBpbXBvcnQgaW4gaW5jbHVkZSBpbmNsdWRpbmcgaW5jcmVtZW50ICcgK1xuICAgICAgICAgICAgJ2luZGV4IGluZGV4ZXMgaW5kZXhpbmcgaW5kZXh0eXBlIGluZGljYXRvciBpbmRpY2VzIGluZXQ2X2F0b24gaW5ldDZfbnRvYSBpbmV0X2F0b24gaW5ldF9udG9hIGluZmlsZSAnICtcbiAgICAgICAgICAgICdpbml0aWFsIGluaXRpYWxpemVkIGluaXRpYWxseSBpbml0cmFucyBpbm1lbW9yeSBpbm5lciBpbm5vZGIgaW5wdXQgaW5zZXJ0IGluc3RhbGwgaW5zdGFuY2UgaW5zdGFudGlhYmxlICcgK1xuICAgICAgICAgICAgJ2luc3RyIGludGVyZmFjZSBpbnRlcmxlYXZlZCBpbnRlcnNlY3QgaW50byBpbnZhbGlkYXRlIGludmlzaWJsZSBpcyBpc19mcmVlX2xvY2sgaXNfaXB2NCBpc19pcHY0X2NvbXBhdCAnICtcbiAgICAgICAgICAgICdpc19ub3QgaXNfbm90X251bGwgaXNfdXNlZF9sb2NrIGlzZGF0ZSBpc251bGwgaXNvbGF0aW9uIGl0ZXJhdGUgamF2YSBqb2luIGpzb24ganNvbl9leGlzdHMgJyArXG4gICAgICAgICAgICAna2VlcCBrZWVwX2R1cGxpY2F0ZXMga2V5IGtleXMga2lsbCBsYW5ndWFnZSBsYXJnZSBsYXN0IGxhc3RfZGF5IGxhc3RfaW5zZXJ0X2lkIGxhc3RfdmFsdWUgbGF0ZXJhbCBsYXggbGNhc2UgJyArXG4gICAgICAgICAgICAnbGVhZCBsZWFkaW5nIGxlYXN0IGxlYXZlcyBsZWZ0IGxlbiBsZW5naHQgbGVuZ3RoIGxlc3MgbGV2ZWwgbGV2ZWxzIGxpYnJhcnkgbGlrZSBsaWtlMiBsaWtlNCBsaWtlYyBsaW1pdCAnICtcbiAgICAgICAgICAgICdsaW5lcyBsaW5rIGxpc3QgbGlzdGFnZyBsaXR0bGUgbG4gbG9hZCBsb2FkX2ZpbGUgbG9iIGxvYnMgbG9jYWwgbG9jYWx0aW1lIGxvY2FsdGltZXN0YW1wIGxvY2F0ZSAnICtcbiAgICAgICAgICAgICdsb2NhdG9yIGxvY2sgbG9ja2VkIGxvZyBsb2cxMCBsb2cyIGxvZ2ZpbGUgbG9nZmlsZXMgbG9nZ2luZyBsb2dpY2FsIGxvZ2ljYWxfcmVhZHNfcGVyX2NhbGwgJyArXG4gICAgICAgICAgICAnbG9nb2ZmIGxvZ29uIGxvZ3MgbG9uZyBsb29wIGxvdyBsb3dfcHJpb3JpdHkgbG93ZXIgbHBhZCBscnRyaW0gbHRyaW0gbWFpbiBtYWtlX3NldCBtYWtlZGF0ZSBtYWtldGltZSAnICtcbiAgICAgICAgICAgICdtYW5hZ2VkIG1hbmFnZW1lbnQgbWFudWFsIG1hcCBtYXBwaW5nIG1hc2sgbWFzdGVyIG1hc3Rlcl9wb3Nfd2FpdCBtYXRjaCBtYXRjaGVkIG1hdGVyaWFsaXplZCBtYXggJyArXG4gICAgICAgICAgICAnbWF4ZXh0ZW50cyBtYXhpbWl6ZSBtYXhpbnN0YW5jZXMgbWF4bGVuIG1heGxvZ2ZpbGVzIG1heGxvZ2hpc3RvcnkgbWF4bG9nbWVtYmVycyBtYXhzaXplIG1heHRyYW5zICcgK1xuICAgICAgICAgICAgJ21kNSBtZWFzdXJlcyBtZWRpYW4gbWVkaXVtIG1lbWJlciBtZW1jb21wcmVzcyBtZW1vcnkgbWVyZ2UgbWljcm9zZWNvbmQgbWlkIG1pZ3JhdGlvbiBtaW4gbWluZXh0ZW50cyAnICtcbiAgICAgICAgICAgICdtaW5pbXVtIG1pbmluZyBtaW51cyBtaW51dGUgbWludXRlcyBtaW52YWx1ZSBtaXNzaW5nIG1vZCBtb2RlIG1vZGVsIG1vZGlmaWNhdGlvbiBtb2RpZnkgbW9kdWxlIG1vbml0b3JpbmcgbW9udGggJyArXG4gICAgICAgICAgICAnbW9udGhzIG1vdW50IG1vdmUgbW92ZW1lbnQgbXVsdGlzZXQgbXV0ZXggbmFtZSBuYW1lX2NvbnN0IG5hbWVzIG5hbiBuYXRpb25hbCBuYXRpdmUgbmF0dXJhbCBuYXYgbmNoYXIgJyArXG4gICAgICAgICAgICAnbmNsb2IgbmVzdGVkIG5ldmVyIG5ldyBuZXdsaW5lIG5leHQgbmV4dHZhbCBubyBub193cml0ZV90b19iaW5sb2cgbm9hcmNoaXZlbG9nIG5vYXVkaXQgbm9iYWRmaWxlICcgK1xuICAgICAgICAgICAgJ25vY2hlY2sgbm9jb21wcmVzcyBub2NvcHkgbm9jeWNsZSBub2RlbGF5IG5vZGlzY2FyZGZpbGUgbm9lbnRpdHllc2NhcGluZyBub2d1YXJhbnRlZSBub2tlZXAgbm9sb2dmaWxlICcgK1xuICAgICAgICAgICAgJ25vbWFwcGluZyBub21heHZhbHVlIG5vbWluaW1pemUgbm9taW52YWx1ZSBub21vbml0b3Jpbmcgbm9uZSBub25lZGl0aW9uYWJsZSBub25zY2hlbWEgbm9vcmRlciAnICtcbiAgICAgICAgICAgICdub3ByIG5vcHJvIG5vcHJvbSBub3Byb21wIG5vcHJvbXB0IG5vcmVseSBub3Jlc2V0bG9ncyBub3JldmVyc2Ugbm9ybWFsIG5vcm93ZGVwZW5kZW5jaWVzIG5vc2NoZW1hY2hlY2sgJyArXG4gICAgICAgICAgICAnbm9zd2l0Y2ggbm90IG5vdGhpbmcgbm90aWNlIG5vdG51bGwgbm90cmltIG5vdmFsaWRhdGUgbm93IG5vd2FpdCBudGhfdmFsdWUgbnVsbGlmIG51bGxzIG51bSBudW1iIG51bWJlICcgK1xuICAgICAgICAgICAgJ252YXJjaGFyIG52YXJjaGFyMiBvYmplY3Qgb2NpY29sbCBvY2lkYXRlIG9jaWRhdGV0aW1lIG9jaWR1cmF0aW9uIG9jaWludGVydmFsIG9jaWxvYmxvY2F0b3Igb2NpbnVtYmVyICcgK1xuICAgICAgICAgICAgJ29jaXJlZiBvY2lyZWZjdXJzb3Igb2Npcm93aWQgb2Npc3RyaW5nIG9jaXR5cGUgb2N0IG9jdGV0X2xlbmd0aCBvZiBvZmYgb2ZmbGluZSBvZmZzZXQgb2lkIG9pZGluZGV4IG9sZCAnICtcbiAgICAgICAgICAgICdvbiBvbmxpbmUgb25seSBvcGFxdWUgb3BlbiBvcGVyYXRpb25zIG9wZXJhdG9yIG9wdGltYWwgb3B0aW1pemUgb3B0aW9uIG9wdGlvbmFsbHkgb3Igb3JhY2xlIG9yYWNsZV9kYXRlICcgK1xuICAgICAgICAgICAgJ29yYWRhdGEgb3JkIG9yZGF1ZGlvIG9yZGRpY29tIG9yZGRvYyBvcmRlciBvcmRpbWFnZSBvcmRpbmFsaXR5IG9yZHZpZGVvIG9yZ2FuaXphdGlvbiBvcmxhbnkgb3JsdmFyeSAnICtcbiAgICAgICAgICAgICdvdXQgb3V0ZXIgb3V0ZmlsZSBvdXRsaW5lIG91dHB1dCBvdmVyIG92ZXJmbG93IG92ZXJyaWRpbmcgcGFja2FnZSBwYWQgcGFyYWxsZWwgcGFyYWxsZWxfZW5hYmxlICcgK1xuICAgICAgICAgICAgJ3BhcmFtZXRlcnMgcGFyZW50IHBhcnNlIHBhcnRpYWwgcGFydGl0aW9uIHBhcnRpdGlvbnMgcGFzY2FsIHBhc3NpbmcgcGFzc3dvcmQgcGFzc3dvcmRfZ3JhY2VfdGltZSAnICtcbiAgICAgICAgICAgICdwYXNzd29yZF9sb2NrX3RpbWUgcGFzc3dvcmRfcmV1c2VfbWF4IHBhc3N3b3JkX3JldXNlX3RpbWUgcGFzc3dvcmRfdmVyaWZ5X2Z1bmN0aW9uIHBhdGNoIHBhdGggcGF0aW5kZXggJyArXG4gICAgICAgICAgICAncGN0aW5jcmVhc2UgcGN0dGhyZXNob2xkIHBjdHVzZWQgcGN0dmVyc2lvbiBwZXJjZW50IHBlcmNlbnRfcmFuayBwZXJjZW50aWxlX2NvbnQgcGVyY2VudGlsZV9kaXNjICcgK1xuICAgICAgICAgICAgJ3BlcmZvcm1hbmNlIHBlcmlvZCBwZXJpb2RfYWRkIHBlcmlvZF9kaWZmIHBlcm1hbmVudCBwaHlzaWNhbCBwaSBwaXBlIHBpcGVsaW5lZCBwaXZvdCBwbHVnZ2FibGUgcGx1Z2luICcgK1xuICAgICAgICAgICAgJ3BvbGljeSBwb3NpdGlvbiBwb3N0X3RyYW5zYWN0aW9uIHBvdyBwb3dlciBwcmFnbWEgcHJlYnVpbHQgcHJlY2VkZXMgcHJlY2VkaW5nIHByZWNpc2lvbiBwcmVkaWN0aW9uICcgK1xuICAgICAgICAgICAgJ3ByZWRpY3Rpb25fY29zdCBwcmVkaWN0aW9uX2RldGFpbHMgcHJlZGljdGlvbl9wcm9iYWJpbGl0eSBwcmVkaWN0aW9uX3NldCBwcmVwYXJlIHByZXNlbnQgcHJlc2VydmUgJyArXG4gICAgICAgICAgICAncHJpb3IgcHJpb3JpdHkgcHJpdmF0ZSBwcml2YXRlX3NnYSBwcml2aWxlZ2VzIHByb2NlZHVyYWwgcHJvY2VkdXJlIHByb2NlZHVyZV9hbmFseXplIHByb2Nlc3NsaXN0ICcgK1xuICAgICAgICAgICAgJ3Byb2ZpbGVzIHByb2plY3QgcHJvbXB0IHByb3RlY3Rpb24gcHVibGljIHB1Ymxpc2hpbmdzZXJ2ZXJuYW1lIHB1cmdlIHF1YXJ0ZXIgcXVlcnkgcXVpY2sgcXVpZXNjZSBxdW90YSAnICtcbiAgICAgICAgICAgICdxdW90ZW5hbWUgcmFkaWFucyByYWlzZSByYW5kIHJhbmdlIHJhbmsgcmF3IHJlYWQgcmVhZHMgcmVhZHNpemUgcmVidWlsZCByZWNvcmQgcmVjb3JkcyAnICtcbiAgICAgICAgICAgICdyZWNvdmVyIHJlY292ZXJ5IHJlY3Vyc2l2ZSByZWN5Y2xlIHJlZG8gcmVkdWNlZCByZWYgcmVmZXJlbmNlIHJlZmVyZW5jZWQgcmVmZXJlbmNlcyByZWZlcmVuY2luZyByZWZyZXNoICcgK1xuICAgICAgICAgICAgJ3JlZ2V4cF9saWtlIHJlZ2lzdGVyIHJlZ3JfYXZneCByZWdyX2F2Z3kgcmVncl9jb3VudCByZWdyX2ludGVyY2VwdCByZWdyX3IyIHJlZ3Jfc2xvcGUgcmVncl9zeHggcmVncl9zeHkgJyArXG4gICAgICAgICAgICAncmVqZWN0IHJla2V5IHJlbGF0aW9uYWwgcmVsYXRpdmUgcmVsYXlsb2cgcmVsZWFzZSByZWxlYXNlX2xvY2sgcmVsaWVzX29uIHJlbG9jYXRlIHJlbHkgcmVtIHJlbWFpbmRlciByZW5hbWUgJyArXG4gICAgICAgICAgICAncmVwYWlyIHJlcGVhdCByZXBsYWNlIHJlcGxpY2F0ZSByZXBsaWNhdGlvbiByZXF1aXJlZCByZXNldCByZXNldGxvZ3MgcmVzaXplIHJlc291cmNlIHJlc3BlY3QgcmVzdG9yZSAnICtcbiAgICAgICAgICAgICdyZXN0cmljdGVkIHJlc3VsdCByZXN1bHRfY2FjaGUgcmVzdW1hYmxlIHJlc3VtZSByZXRlbnRpb24gcmV0dXJuIHJldHVybmluZyByZXR1cm5zIHJldXNlIHJldmVyc2UgcmV2b2tlICcgK1xuICAgICAgICAgICAgJ3JpZ2h0IHJsaWtlIHJvbGUgcm9sZXMgcm9sbGJhY2sgcm9sbGluZyByb2xsdXAgcm91bmQgcm93IHJvd19jb3VudCByb3dkZXBlbmRlbmNpZXMgcm93aWQgcm93bnVtIHJvd3MgJyArXG4gICAgICAgICAgICAncnRyaW0gcnVsZXMgc2FmZSBzYWx0IHNhbXBsZSBzYXZlIHNhdmVwb2ludCBzYjEgc2IyIHNiNCBzY2FuIHNjaGVtYSBzY2hlbWFjaGVjayBzY24gc2NvcGUgc2Nyb2xsICcgK1xuICAgICAgICAgICAgJ3Nkb19nZW9yYXN0ZXIgc2RvX3RvcG9fZ2VvbWV0cnkgc2VhcmNoIHNlY190b190aW1lIHNlY29uZCBzZWNvbmRzIHNlY3Rpb24gc2VjdXJlZmlsZSBzZWN1cml0eSBzZWVkIHNlZ21lbnQgc2VsZWN0ICcgK1xuICAgICAgICAgICAgJ3NlbGYgc2VtaSBzZXF1ZW5jZSBzZXF1ZW50aWFsIHNlcmlhbGl6YWJsZSBzZXJ2ZXIgc2VydmVyZXJyb3Igc2Vzc2lvbiBzZXNzaW9uX3VzZXIgc2Vzc2lvbnNfcGVyX3VzZXIgc2V0ICcgK1xuICAgICAgICAgICAgJ3NldHMgc2V0dGluZ3Mgc2hhIHNoYTEgc2hhMiBzaGFyZSBzaGFyZWQgc2hhcmVkX3Bvb2wgc2hvcnQgc2hvdyBzaHJpbmsgc2h1dGRvd24gc2lfYXZlcmFnZWNvbG9yICcgK1xuICAgICAgICAgICAgJ3NpX2NvbG9yaGlzdG9ncmFtIHNpX2ZlYXR1cmVsaXN0IHNpX3Bvc2l0aW9uYWxjb2xvciBzaV9zdGlsbGltYWdlIHNpX3RleHR1cmUgc2libGluZ3Mgc2lkIHNpZ24gc2luICcgK1xuICAgICAgICAgICAgJ3NpemUgc2l6ZV90IHNpemVzIHNraXAgc2xhdmUgc2xlZXAgc21hbGxkYXRldGltZWZyb21wYXJ0cyBzbWFsbGZpbGUgc25hcHNob3Qgc29tZSBzb25hbWUgc29ydCBzb3VuZGV4ICcgK1xuICAgICAgICAgICAgJ3NvdXJjZSBzcGFjZSBzcGFyc2Ugc3BmaWxlIHNwbGl0IHNxbCBzcWxfYmlnX3Jlc3VsdCBzcWxfYnVmZmVyX3Jlc3VsdCBzcWxfY2FjaGUgc3FsX2NhbGNfZm91bmRfcm93cyAnICtcbiAgICAgICAgICAgICdzcWxfc21hbGxfcmVzdWx0IHNxbF92YXJpYW50X3Byb3BlcnR5IHNxbGNvZGUgc3FsZGF0YSBzcWxlcnJvciBzcWxuYW1lIHNxbHN0YXRlIHNxcnQgc3F1YXJlIHN0YW5kYWxvbmUgJyArXG4gICAgICAgICAgICAnc3RhbmRieSBzdGFydCBzdGFydGluZyBzdGFydHVwIHN0YXRlbWVudCBzdGF0aWMgc3RhdGlzdGljcyBzdGF0c19iaW5vbWlhbF90ZXN0IHN0YXRzX2Nyb3NzdGFiICcgK1xuICAgICAgICAgICAgJ3N0YXRzX2tzX3Rlc3Qgc3RhdHNfbW9kZSBzdGF0c19td190ZXN0IHN0YXRzX29uZV93YXlfYW5vdmEgc3RhdHNfdF90ZXN0XyBzdGF0c190X3Rlc3RfaW5kZXAgJyArXG4gICAgICAgICAgICAnc3RhdHNfdF90ZXN0X29uZSBzdGF0c190X3Rlc3RfcGFpcmVkIHN0YXRzX3dzcl90ZXN0IHN0YXR1cyBzdGQgc3RkZGV2IHN0ZGRldl9wb3Agc3RkZGV2X3NhbXAgc3RkZXYgJyArXG4gICAgICAgICAgICAnc3RvcCBzdG9yYWdlIHN0b3JlIHN0b3JlZCBzdHIgc3RyX3RvX2RhdGUgc3RyYWlnaHRfam9pbiBzdHJjbXAgc3RyaWN0IHN0cmluZyBzdHJ1Y3Qgc3R1ZmYgc3R5bGUgc3ViZGF0ZSAnICtcbiAgICAgICAgICAgICdzdWJwYXJ0aXRpb24gc3VicGFydGl0aW9ucyBzdWJzdGl0dXRhYmxlIHN1YnN0ciBzdWJzdHJpbmcgc3VidGltZSBzdWJ0cmluZ19pbmRleCBzdWJ0eXBlIHN1Y2Nlc3Mgc3VtICcgK1xuICAgICAgICAgICAgJ3N1c3BlbmQgc3dpdGNoIHN3aXRjaG9mZnNldCBzd2l0Y2hvdmVyIHN5bmMgc3luY2hyb25vdXMgc3lub255bSBzeXMgc3lzX3htbGFnZyBzeXNhc20gc3lzYXV4IHN5c2RhdGUgJyArXG4gICAgICAgICAgICAnc3lzZGF0ZXRpbWVvZmZzZXQgc3lzZGJhIHN5c29wZXIgc3lzdGVtIHN5c3RlbV91c2VyIHN5c3V0Y2RhdGV0aW1lIHRhYmxlIHRhYmxlcyB0YWJsZXNwYWNlIHRhYmxlc2FtcGxlIHRhbiB0ZG8gJyArXG4gICAgICAgICAgICAndGVtcGxhdGUgdGVtcG9yYXJ5IHRlcm1pbmF0ZWQgdGVydGlhcnlfd2VpZ2h0cyB0ZXN0IHRoYW4gdGhlbiB0aHJlYWQgdGhyb3VnaCB0aWVyIHRpZXMgdGltZSB0aW1lX2Zvcm1hdCAnICtcbiAgICAgICAgICAgICd0aW1lX3pvbmUgdGltZWRpZmYgdGltZWZyb21wYXJ0cyB0aW1lb3V0IHRpbWVzdGFtcCB0aW1lc3RhbXBhZGQgdGltZXN0YW1wZGlmZiB0aW1lem9uZV9hYmJyICcgK1xuICAgICAgICAgICAgJ3RpbWV6b25lX21pbnV0ZSB0aW1lem9uZV9yZWdpb24gdG8gdG9fYmFzZTY0IHRvX2RhdGUgdG9fZGF5cyB0b19zZWNvbmRzIHRvZGF0ZXRpbWVvZmZzZXQgdHJhY2UgdHJhY2tpbmcgJyArXG4gICAgICAgICAgICAndHJhbnNhY3Rpb24gdHJhbnNhY3Rpb25hbCB0cmFuc2xhdGUgdHJhbnNsYXRpb24gdHJlYXQgdHJpZ2dlciB0cmlnZ2VyX25lc3RsZXZlbCB0cmlnZ2VycyB0cmltIHRydW5jYXRlICcgK1xuICAgICAgICAgICAgJ3RyeV9jYXN0IHRyeV9jb252ZXJ0IHRyeV9wYXJzZSB0eXBlIHViMSB1YjIgdWI0IHVjYXNlIHVuYXJjaGl2ZWQgdW5ib3VuZGVkIHVuY29tcHJlc3MgJyArXG4gICAgICAgICAgICAndW5kZXIgdW5kbyB1bmhleCB1bmljb2RlIHVuaWZvcm0gdW5pbnN0YWxsIHVuaW9uIHVuaXF1ZSB1bml4X3RpbWVzdGFtcCB1bmtub3duIHVubGltaXRlZCB1bmxvY2sgdW5uZXN0IHVucGl2b3QgJyArXG4gICAgICAgICAgICAndW5yZWNvdmVyYWJsZSB1bnNhZmUgdW5zaWduZWQgdW50aWwgdW50cnVzdGVkIHVudXNhYmxlIHVudXNlZCB1cGRhdGUgdXBkYXRlZCB1cGdyYWRlIHVwcGVkIHVwcGVyIHVwc2VydCAnICtcbiAgICAgICAgICAgICd1cmwgdXJvd2lkIHVzYWJsZSB1c2FnZSB1c2UgdXNlX3N0b3JlZF9vdXRsaW5lcyB1c2VyIHVzZXJfZGF0YSB1c2VyX3Jlc291cmNlcyB1c2VycyB1c2luZyB1dGNfZGF0ZSAnICtcbiAgICAgICAgICAgICd1dGNfdGltZXN0YW1wIHV1aWQgdXVpZF9zaG9ydCB2YWxpZGF0ZSB2YWxpZGF0ZV9wYXNzd29yZF9zdHJlbmd0aCB2YWxpZGF0aW9uIHZhbGlzdCB2YWx1ZSB2YWx1ZXMgdmFyICcgK1xuICAgICAgICAgICAgJ3Zhcl9zYW1wIHZhcmNoYXJjIHZhcmkgdmFyaWEgdmFyaWFiIHZhcmlhYmwgdmFyaWFibGUgdmFyaWFibGVzIHZhcmlhbmNlIHZhcnAgdmFycmF3IHZhcnJhd2MgdmFycmF5ICcgK1xuICAgICAgICAgICAgJ3ZlcmlmeSB2ZXJzaW9uIHZlcnNpb25zIHZpZXcgdmlydHVhbCB2aXNpYmxlIHZvaWQgd2FpdCB3YWxsZXQgd2FybmluZyB3YXJuaW5ncyB3ZWVrIHdlZWtkYXkgd2Vla29meWVhciAnICtcbiAgICAgICAgICAgICd3ZWxsZm9ybWVkIHdoZW4gd2hlbmUgd2hlbmV2IHdoZW5ldmUgd2hlbmV2ZXIgd2hlcmUgd2hpbGUgd2hpdGVzcGFjZSB3aW5kb3cgd2l0aCB3aXRoaW4gd2l0aG91dCB3b3JrIHdyYXBwZWQgJyArXG4gICAgICAgICAgICAneGRiIHhtbCB4bWxhZ2cgeG1sYXR0cmlidXRlcyB4bWxjYXN0IHhtbGNvbGF0dHZhbCB4bWxlbGVtZW50IHhtbGV4aXN0cyB4bWxmb3Jlc3QgeG1saW5kZXggeG1sbmFtZXNwYWNlcyAnICtcbiAgICAgICAgICAgICd4bWxwaSB4bWxxdWVyeSB4bWxyb290IHhtbHNjaGVtYSB4bWxzZXJpYWxpemUgeG1sdGFibGUgeG1sdHlwZSB4b3IgeWVhciB5ZWFyX3RvX21vbnRoIHllYXJzIHllYXJ3ZWVrJyxcbiAgICAgICAgICBsaXRlcmFsOlxuICAgICAgICAgICAgJ3RydWUgZmFsc2UgbnVsbCB1bmtub3duJyxcbiAgICAgICAgICBidWlsdF9pbjpcbiAgICAgICAgICAgICdhcnJheSBiaWdpbnQgYmluYXJ5IGJpdCBibG9iIGJvb2wgYm9vbGVhbiBjaGFyIGNoYXJhY3RlciBkYXRlIGRlYyBkZWNpbWFsIGZsb2F0IGludCBpbnQ4IGludGVnZXIgaW50ZXJ2YWwgbnVtYmVyICcgK1xuICAgICAgICAgICAgJ251bWVyaWMgcmVhbCByZWNvcmQgc2VyaWFsIHNlcmlhbDggc21hbGxpbnQgdGV4dCB0aW1lIHRpbWVzdGFtcCB0aW55aW50IHZhcmNoYXIgdmFyY2hhcjIgdmFyeWluZyB2b2lkJ1xuICAgICAgICB9LFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZTogJ3N0cmluZycsXG4gICAgICAgICAgICBiZWdpbjogJ1xcJycsIGVuZDogJ1xcJycsXG4gICAgICAgICAgICBjb250YWluczogW3tiZWdpbjogJ1xcJ1xcJyd9XVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIGJlZ2luOiAnXCInLCBlbmQ6ICdcIicsXG4gICAgICAgICAgICBjb250YWluczogW3tiZWdpbjogJ1wiXCInfV1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZTogJ3N0cmluZycsXG4gICAgICAgICAgICBiZWdpbjogJ2AnLCBlbmQ6ICdgJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgaGxqcy5DX05VTUJFUl9NT0RFLFxuICAgICAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICAgICAgQ09NTUVOVF9NT0RFLFxuICAgICAgICAgIGhsanMuSEFTSF9DT01NRU5UX01PREVcbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICBDT01NRU5UX01PREUsXG4gICAgICBobGpzLkhBU0hfQ09NTUVOVF9NT0RFXG4gICAgXVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNxbDtcbiIsIi8qXG5MYW5ndWFnZTogU0NTU1xuRGVzY3JpcHRpb246IFNjc3MgaXMgYW4gZXh0ZW5zaW9uIG9mIHRoZSBzeW50YXggb2YgQ1NTLlxuQXV0aG9yOiBLdXJ0IEVtY2ggPGt1cnRAa3VydGVtY2guY29tPlxuV2Vic2l0ZTogaHR0cHM6Ly9zYXNzLWxhbmcuY29tXG5DYXRlZ29yeTogY29tbW9uLCBjc3NcbiovXG5mdW5jdGlvbiBzY3NzKGhsanMpIHtcbiAgdmFyIEFUX0lERU5USUZJRVIgPSAnQFthLXotXSsnOyAvLyBAZm9udC1mYWNlXG4gIHZhciBBVF9NT0RJRklFUlMgPSBcImFuZCBvciBub3Qgb25seVwiO1xuICB2YXIgSURFTlRfUkUgPSAnW2EtekEtWi1dW2EtekEtWjAtOV8tXSonO1xuICB2YXIgVkFSSUFCTEUgPSB7XG4gICAgY2xhc3NOYW1lOiAndmFyaWFibGUnLFxuICAgIGJlZ2luOiAnKFxcXFwkJyArIElERU5UX1JFICsgJylcXFxcYidcbiAgfTtcbiAgdmFyIEhFWENPTE9SID0ge1xuICAgIGNsYXNzTmFtZTogJ251bWJlcicsIGJlZ2luOiAnI1swLTlBLUZhLWZdKydcbiAgfTtcbiAgdmFyIERFRl9JTlRFUk5BTFMgPSB7XG4gICAgY2xhc3NOYW1lOiAnYXR0cmlidXRlJyxcbiAgICBiZWdpbjogJ1tBLVpcXFxcX1xcXFwuXFxcXC1dKycsIGVuZDogJzonLFxuICAgIGV4Y2x1ZGVFbmQ6IHRydWUsXG4gICAgaWxsZWdhbDogJ1teXFxcXHNdJyxcbiAgICBzdGFydHM6IHtcbiAgICAgIGVuZHNXaXRoUGFyZW50OiB0cnVlLCBleGNsdWRlRW5kOiB0cnVlLFxuICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgSEVYQ09MT1IsXG4gICAgICAgIGhsanMuQ1NTX05VTUJFUl9NT0RFLFxuICAgICAgICBobGpzLlFVT1RFX1NUUklOR19NT0RFLFxuICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICAgIHtcbiAgICAgICAgICBjbGFzc05hbWU6ICdtZXRhJywgYmVnaW46ICchaW1wb3J0YW50J1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9O1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdTQ1NTJyxcbiAgICBjYXNlX2luc2Vuc2l0aXZlOiB0cnVlLFxuICAgIGlsbGVnYWw6ICdbPS98XFwnXScsXG4gICAgY29udGFpbnM6IFtcbiAgICAgIGhsanMuQ19MSU5FX0NPTU1FTlRfTU9ERSxcbiAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLWlkJywgYmVnaW46ICdcXFxcI1tBLVphLXowLTlfLV0rJyxcbiAgICAgICAgcmVsZXZhbmNlOiAwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBjbGFzc05hbWU6ICdzZWxlY3Rvci1jbGFzcycsIGJlZ2luOiAnXFxcXC5bQS1aYS16MC05Xy1dKycsXG4gICAgICAgIHJlbGV2YW5jZTogMFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnc2VsZWN0b3ItYXR0cicsIGJlZ2luOiAnXFxcXFsnLCBlbmQ6ICdcXFxcXScsXG4gICAgICAgIGlsbGVnYWw6ICckJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnc2VsZWN0b3ItdGFnJywgLy8gYmVnaW46IElERU5UX1JFLCBlbmQ6ICdbLHxcXFxcc10nXG4gICAgICAgIGJlZ2luOiAnXFxcXGIoYXxhYmJyfGFjcm9ueW18YWRkcmVzc3xhcmVhfGFydGljbGV8YXNpZGV8YXVkaW98YnxiYXNlfGJpZ3xibG9ja3F1b3RlfGJvZHl8YnJ8YnV0dG9ufGNhbnZhc3xjYXB0aW9ufGNpdGV8Y29kZXxjb2x8Y29sZ3JvdXB8Y29tbWFuZHxkYXRhbGlzdHxkZHxkZWx8ZGV0YWlsc3xkZm58ZGl2fGRsfGR0fGVtfGVtYmVkfGZpZWxkc2V0fGZpZ2NhcHRpb258ZmlndXJlfGZvb3Rlcnxmb3JtfGZyYW1lfGZyYW1lc2V0fChoWzEtNl0pfGhlYWR8aGVhZGVyfGhncm91cHxocnxodG1sfGl8aWZyYW1lfGltZ3xpbnB1dHxpbnN8a2JkfGtleWdlbnxsYWJlbHxsZWdlbmR8bGl8bGlua3xtYXB8bWFya3xtZXRhfG1ldGVyfG5hdnxub2ZyYW1lc3xub3NjcmlwdHxvYmplY3R8b2x8b3B0Z3JvdXB8b3B0aW9ufG91dHB1dHxwfHBhcmFtfHByZXxwcm9ncmVzc3xxfHJwfHJ0fHJ1Ynl8c2FtcHxzY3JpcHR8c2VjdGlvbnxzZWxlY3R8c21hbGx8c3BhbnxzdHJpa2V8c3Ryb25nfHN0eWxlfHN1YnxzdXB8dGFibGV8dGJvZHl8dGR8dGV4dGFyZWF8dGZvb3R8dGh8dGhlYWR8dGltZXx0aXRsZXx0cnx0dHx1bHx2YXJ8dmlkZW8pXFxcXGInLFxuICAgICAgICByZWxldmFuY2U6IDBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLXBzZXVkbycsXG4gICAgICAgIGJlZ2luOiAnOih2aXNpdGVkfHZhbGlkfHJvb3R8cmlnaHR8cmVxdWlyZWR8cmVhZC13cml0ZXxyZWFkLW9ubHl8b3V0LXJhbmdlfG9wdGlvbmFsfG9ubHktb2YtdHlwZXxvbmx5LWNoaWxkfG50aC1vZi10eXBlfG50aC1sYXN0LW9mLXR5cGV8bnRoLWxhc3QtY2hpbGR8bnRoLWNoaWxkfG5vdHxsaW5rfGxlZnR8bGFzdC1vZi10eXBlfGxhc3QtY2hpbGR8bGFuZ3xpbnZhbGlkfGluZGV0ZXJtaW5hdGV8aW4tcmFuZ2V8aG92ZXJ8Zm9jdXN8Zmlyc3Qtb2YtdHlwZXxmaXJzdC1saW5lfGZpcnN0LWxldHRlcnxmaXJzdC1jaGlsZHxmaXJzdHxlbmFibGVkfGVtcHR5fGRpc2FibGVkfGRlZmF1bHR8Y2hlY2tlZHxiZWZvcmV8YWZ0ZXJ8YWN0aXZlKSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLXBzZXVkbycsXG4gICAgICAgIGJlZ2luOiAnOjooYWZ0ZXJ8YmVmb3JlfGNob2ljZXN8Zmlyc3QtbGV0dGVyfGZpcnN0LWxpbmV8cmVwZWF0LWluZGV4fHJlcGVhdC1pdGVtfHNlbGVjdGlvbnx2YWx1ZSknXG4gICAgICB9LFxuICAgICAgVkFSSUFCTEUsXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ2F0dHJpYnV0ZScsXG4gICAgICAgIGJlZ2luOiAnXFxcXGIoc3JjfHotaW5kZXh8d29yZC13cmFwfHdvcmQtc3BhY2luZ3x3b3JkLWJyZWFrfHdpZHRofHdpZG93c3x3aGl0ZS1zcGFjZXx2aXNpYmlsaXR5fHZlcnRpY2FsLWFsaWdufHVuaWNvZGUtYmlkaXx0cmFuc2l0aW9uLXRpbWluZy1mdW5jdGlvbnx0cmFuc2l0aW9uLXByb3BlcnR5fHRyYW5zaXRpb24tZHVyYXRpb258dHJhbnNpdGlvbi1kZWxheXx0cmFuc2l0aW9ufHRyYW5zZm9ybS1zdHlsZXx0cmFuc2Zvcm0tb3JpZ2lufHRyYW5zZm9ybXx0b3B8dGV4dC11bmRlcmxpbmUtcG9zaXRpb258dGV4dC10cmFuc2Zvcm18dGV4dC1zaGFkb3d8dGV4dC1yZW5kZXJpbmd8dGV4dC1vdmVyZmxvd3x0ZXh0LWluZGVudHx0ZXh0LWRlY29yYXRpb24tc3R5bGV8dGV4dC1kZWNvcmF0aW9uLWxpbmV8dGV4dC1kZWNvcmF0aW9uLWNvbG9yfHRleHQtZGVjb3JhdGlvbnx0ZXh0LWFsaWduLWxhc3R8dGV4dC1hbGlnbnx0YWItc2l6ZXx0YWJsZS1sYXlvdXR8cmlnaHR8cmVzaXplfHF1b3Rlc3xwb3NpdGlvbnxwb2ludGVyLWV2ZW50c3xwZXJzcGVjdGl2ZS1vcmlnaW58cGVyc3BlY3RpdmV8cGFnZS1icmVhay1pbnNpZGV8cGFnZS1icmVhay1iZWZvcmV8cGFnZS1icmVhay1hZnRlcnxwYWRkaW5nLXRvcHxwYWRkaW5nLXJpZ2h0fHBhZGRpbmctbGVmdHxwYWRkaW5nLWJvdHRvbXxwYWRkaW5nfG92ZXJmbG93LXl8b3ZlcmZsb3cteHxvdmVyZmxvdy13cmFwfG92ZXJmbG93fG91dGxpbmUtd2lkdGh8b3V0bGluZS1zdHlsZXxvdXRsaW5lLW9mZnNldHxvdXRsaW5lLWNvbG9yfG91dGxpbmV8b3JwaGFuc3xvcmRlcnxvcGFjaXR5fG9iamVjdC1wb3NpdGlvbnxvYmplY3QtZml0fG5vcm1hbHxub25lfG5hdi11cHxuYXYtcmlnaHR8bmF2LWxlZnR8bmF2LWluZGV4fG5hdi1kb3dufG1pbi13aWR0aHxtaW4taGVpZ2h0fG1heC13aWR0aHxtYXgtaGVpZ2h0fG1hc2t8bWFya3N8bWFyZ2luLXRvcHxtYXJnaW4tcmlnaHR8bWFyZ2luLWxlZnR8bWFyZ2luLWJvdHRvbXxtYXJnaW58bGlzdC1zdHlsZS10eXBlfGxpc3Qtc3R5bGUtcG9zaXRpb258bGlzdC1zdHlsZS1pbWFnZXxsaXN0LXN0eWxlfGxpbmUtaGVpZ2h0fGxldHRlci1zcGFjaW5nfGxlZnR8anVzdGlmeS1jb250ZW50fGluaXRpYWx8aW5oZXJpdHxpbWUtbW9kZXxpbWFnZS1vcmllbnRhdGlvbnxpbWFnZS1yZXNvbHV0aW9ufGltYWdlLXJlbmRlcmluZ3xpY29ufGh5cGhlbnN8aGVpZ2h0fGZvbnQtd2VpZ2h0fGZvbnQtdmFyaWFudC1saWdhdHVyZXN8Zm9udC12YXJpYW50fGZvbnQtc3R5bGV8Zm9udC1zdHJldGNofGZvbnQtc2l6ZS1hZGp1c3R8Zm9udC1zaXplfGZvbnQtbGFuZ3VhZ2Utb3ZlcnJpZGV8Zm9udC1rZXJuaW5nfGZvbnQtZmVhdHVyZS1zZXR0aW5nc3xmb250LWZhbWlseXxmb250fGZsb2F0fGZsZXgtd3JhcHxmbGV4LXNocmlua3xmbGV4LWdyb3d8ZmxleC1mbG93fGZsZXgtZGlyZWN0aW9ufGZsZXgtYmFzaXN8ZmxleHxmaWx0ZXJ8ZW1wdHktY2VsbHN8ZGlzcGxheXxkaXJlY3Rpb258Y3Vyc29yfGNvdW50ZXItcmVzZXR8Y291bnRlci1pbmNyZW1lbnR8Y29udGVudHxjb2x1bW4td2lkdGh8Y29sdW1uLXNwYW58Y29sdW1uLXJ1bGUtd2lkdGh8Y29sdW1uLXJ1bGUtc3R5bGV8Y29sdW1uLXJ1bGUtY29sb3J8Y29sdW1uLXJ1bGV8Y29sdW1uLWdhcHxjb2x1bW4tZmlsbHxjb2x1bW4tY291bnR8Y29sdW1uc3xjb2xvcnxjbGlwLXBhdGh8Y2xpcHxjbGVhcnxjYXB0aW9uLXNpZGV8YnJlYWstaW5zaWRlfGJyZWFrLWJlZm9yZXxicmVhay1hZnRlcnxib3gtc2l6aW5nfGJveC1zaGFkb3d8Ym94LWRlY29yYXRpb24tYnJlYWt8Ym90dG9tfGJvcmRlci13aWR0aHxib3JkZXItdG9wLXdpZHRofGJvcmRlci10b3Atc3R5bGV8Ym9yZGVyLXRvcC1yaWdodC1yYWRpdXN8Ym9yZGVyLXRvcC1sZWZ0LXJhZGl1c3xib3JkZXItdG9wLWNvbG9yfGJvcmRlci10b3B8Ym9yZGVyLXN0eWxlfGJvcmRlci1zcGFjaW5nfGJvcmRlci1yaWdodC13aWR0aHxib3JkZXItcmlnaHQtc3R5bGV8Ym9yZGVyLXJpZ2h0LWNvbG9yfGJvcmRlci1yaWdodHxib3JkZXItcmFkaXVzfGJvcmRlci1sZWZ0LXdpZHRofGJvcmRlci1sZWZ0LXN0eWxlfGJvcmRlci1sZWZ0LWNvbG9yfGJvcmRlci1sZWZ0fGJvcmRlci1pbWFnZS13aWR0aHxib3JkZXItaW1hZ2Utc291cmNlfGJvcmRlci1pbWFnZS1zbGljZXxib3JkZXItaW1hZ2UtcmVwZWF0fGJvcmRlci1pbWFnZS1vdXRzZXR8Ym9yZGVyLWltYWdlfGJvcmRlci1jb2xvcnxib3JkZXItY29sbGFwc2V8Ym9yZGVyLWJvdHRvbS13aWR0aHxib3JkZXItYm90dG9tLXN0eWxlfGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzfGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXN8Ym9yZGVyLWJvdHRvbS1jb2xvcnxib3JkZXItYm90dG9tfGJvcmRlcnxiYWNrZ3JvdW5kLXNpemV8YmFja2dyb3VuZC1yZXBlYXR8YmFja2dyb3VuZC1wb3NpdGlvbnxiYWNrZ3JvdW5kLW9yaWdpbnxiYWNrZ3JvdW5kLWltYWdlfGJhY2tncm91bmQtY29sb3J8YmFja2dyb3VuZC1jbGlwfGJhY2tncm91bmQtYXR0YWNobWVudHxiYWNrZ3JvdW5kLWJsZW5kLW1vZGV8YmFja2dyb3VuZHxiYWNrZmFjZS12aXNpYmlsaXR5fGF1dG98YW5pbWF0aW9uLXRpbWluZy1mdW5jdGlvbnxhbmltYXRpb24tcGxheS1zdGF0ZXxhbmltYXRpb24tbmFtZXxhbmltYXRpb24taXRlcmF0aW9uLWNvdW50fGFuaW1hdGlvbi1maWxsLW1vZGV8YW5pbWF0aW9uLWR1cmF0aW9ufGFuaW1hdGlvbi1kaXJlY3Rpb258YW5pbWF0aW9uLWRlbGF5fGFuaW1hdGlvbnxhbGlnbi1zZWxmfGFsaWduLWl0ZW1zfGFsaWduLWNvbnRlbnQpXFxcXGInLFxuICAgICAgICBpbGxlZ2FsOiAnW15cXFxcc10nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBiZWdpbjogJ1xcXFxiKHdoaXRlc3BhY2V8d2FpdHx3LXJlc2l6ZXx2aXNpYmxlfHZlcnRpY2FsLXRleHR8dmVydGljYWwtaWRlb2dyYXBoaWN8dXBwZXJjYXNlfHVwcGVyLXJvbWFufHVwcGVyLWFscGhhfHVuZGVybGluZXx0cmFuc3BhcmVudHx0b3B8dGhpbnx0aGlja3x0ZXh0fHRleHQtdG9wfHRleHQtYm90dG9tfHRiLXJsfHRhYmxlLWhlYWRlci1ncm91cHx0YWJsZS1mb290ZXItZ3JvdXB8c3ctcmVzaXplfHN1cGVyfHN0cmljdHxzdGF0aWN8c3F1YXJlfHNvbGlkfHNtYWxsLWNhcHN8c2VwYXJhdGV8c2UtcmVzaXplfHNjcm9sbHxzLXJlc2l6ZXxydGx8cm93LXJlc2l6ZXxyaWRnZXxyaWdodHxyZXBlYXR8cmVwZWF0LXl8cmVwZWF0LXh8cmVsYXRpdmV8cHJvZ3Jlc3N8cG9pbnRlcnxvdmVybGluZXxvdXRzaWRlfG91dHNldHxvYmxpcXVlfG5vd3JhcHxub3QtYWxsb3dlZHxub3JtYWx8bm9uZXxudy1yZXNpemV8bm8tcmVwZWF0fG5vLWRyb3B8bmV3c3BhcGVyfG5lLXJlc2l6ZXxuLXJlc2l6ZXxtb3ZlfG1pZGRsZXxtZWRpdW18bHRyfGxyLXRifGxvd2VyY2FzZXxsb3dlci1yb21hbnxsb3dlci1hbHBoYXxsb29zZXxsaXN0LWl0ZW18bGluZXxsaW5lLXRocm91Z2h8bGluZS1lZGdlfGxpZ2h0ZXJ8bGVmdHxrZWVwLWFsbHxqdXN0aWZ5fGl0YWxpY3xpbnRlci13b3JkfGludGVyLWlkZW9ncmFwaHxpbnNpZGV8aW5zZXR8aW5saW5lfGlubGluZS1ibG9ja3xpbmhlcml0fGluYWN0aXZlfGlkZW9ncmFwaC1zcGFjZXxpZGVvZ3JhcGgtcGFyZW50aGVzaXN8aWRlb2dyYXBoLW51bWVyaWN8aWRlb2dyYXBoLWFscGhhfGhvcml6b250YWx8aGlkZGVufGhlbHB8aGFuZHxncm9vdmV8Zml4ZWR8ZWxsaXBzaXN8ZS1yZXNpemV8ZG91YmxlfGRvdHRlZHxkaXN0cmlidXRlfGRpc3RyaWJ1dGUtc3BhY2V8ZGlzdHJpYnV0ZS1sZXR0ZXJ8ZGlzdHJpYnV0ZS1hbGwtbGluZXN8ZGlzY3xkaXNhYmxlZHxkZWZhdWx0fGRlY2ltYWx8ZGFzaGVkfGNyb3NzaGFpcnxjb2xsYXBzZXxjb2wtcmVzaXplfGNpcmNsZXxjaGFyfGNlbnRlcnxjYXBpdGFsaXplfGJyZWFrLXdvcmR8YnJlYWstYWxsfGJvdHRvbXxib3RofGJvbGRlcnxib2xkfGJsb2NrfGJpZGktb3ZlcnJpZGV8YmVsb3d8YmFzZWxpbmV8YXV0b3xhbHdheXN8YWxsLXNjcm9sbHxhYnNvbHV0ZXx0YWJsZXx0YWJsZS1jZWxsKVxcXFxiJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgYmVnaW46ICc6JywgZW5kOiAnOycsXG4gICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAgVkFSSUFCTEUsXG4gICAgICAgICAgSEVYQ09MT1IsXG4gICAgICAgICAgaGxqcy5DU1NfTlVNQkVSX01PREUsXG4gICAgICAgICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiAnbWV0YScsIGJlZ2luOiAnIWltcG9ydGFudCdcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICAvLyBtYXRjaGluZyB0aGVzZSBoZXJlIGFsbG93cyB1cyB0byB0cmVhdCB0aGVtIG1vcmUgbGlrZSByZWd1bGFyIENTU1xuICAgICAgLy8gcnVsZXMgc28gZXZlcnl0aGluZyBiZXR3ZWVuIHRoZSB7fSBnZXRzIHJlZ3VsYXIgcnVsZSBoaWdobGlnaHRpbmcsXG4gICAgICAvLyB3aGljaCBpcyB3aGF0IHdlIHdhbnQgZm9yIHBhZ2UgYW5kIGZvbnQtZmFjZVxuICAgICAge1xuICAgICAgICBiZWdpbjogJ0AocGFnZXxmb250LWZhY2UpJyxcbiAgICAgICAgbGV4ZW1lczogQVRfSURFTlRJRklFUixcbiAgICAgICAga2V5d29yZHM6ICdAcGFnZSBAZm9udC1mYWNlJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgYmVnaW46ICdAJywgZW5kOiAnW3s7XScsXG4gICAgICAgIHJldHVybkJlZ2luOiB0cnVlLFxuICAgICAgICBrZXl3b3JkczogQVRfTU9ESUZJRVJTLFxuICAgICAgICBjb250YWluczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGJlZ2luOiBBVF9JREVOVElGSUVSLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiBcImtleXdvcmRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgVkFSSUFCTEUsXG4gICAgICAgICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgICAgSEVYQ09MT1IsXG4gICAgICAgICAgaGxqcy5DU1NfTlVNQkVSX01PREUsXG4gICAgICAgICAgLy8ge1xuICAgICAgICAgIC8vICAgYmVnaW46ICdcXFxcc1tBLVphLXowLTlfLi1dKycsXG4gICAgICAgICAgLy8gICByZWxldmFuY2U6IDBcbiAgICAgICAgICAvLyB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2NzcztcbiIsIi8qXG5MYW5ndWFnZTogSlNPTlxuRGVzY3JpcHRpb246IEpTT04gKEphdmFTY3JpcHQgT2JqZWN0IE5vdGF0aW9uKSBpcyBhIGxpZ2h0d2VpZ2h0IGRhdGEtaW50ZXJjaGFuZ2UgZm9ybWF0LlxuQXV0aG9yOiBJdmFuIFNhZ2FsYWV2IDxtYW5pYWNAc29mdHdhcmVtYW5pYWNzLm9yZz5cbldlYnNpdGU6IGh0dHA6Ly93d3cuanNvbi5vcmdcbkNhdGVnb3J5OiBjb21tb24sIHByb3RvY29sc1xuKi9cblxuZnVuY3Rpb24ganNvbihobGpzKSB7XG4gIHZhciBMSVRFUkFMUyA9IHtsaXRlcmFsOiAndHJ1ZSBmYWxzZSBudWxsJ307XG4gIHZhciBBTExPV0VEX0NPTU1FTlRTID0gW1xuICAgIGhsanMuQ19MSU5FX0NPTU1FTlRfTU9ERSxcbiAgICBobGpzLkNfQkxPQ0tfQ09NTUVOVF9NT0RFXG4gIF07XG4gIHZhciBUWVBFUyA9IFtcbiAgICBobGpzLlFVT1RFX1NUUklOR19NT0RFLFxuICAgIGhsanMuQ19OVU1CRVJfTU9ERVxuICBdO1xuICB2YXIgVkFMVUVfQ09OVEFJTkVSID0ge1xuICAgIGVuZDogJywnLCBlbmRzV2l0aFBhcmVudDogdHJ1ZSwgZXhjbHVkZUVuZDogdHJ1ZSxcbiAgICBjb250YWluczogVFlQRVMsXG4gICAga2V5d29yZHM6IExJVEVSQUxTXG4gIH07XG4gIHZhciBPQkpFQ1QgPSB7XG4gICAgYmVnaW46ICd7JywgZW5kOiAnfScsXG4gICAgY29udGFpbnM6IFtcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnYXR0cicsXG4gICAgICAgIGJlZ2luOiAvXCIvLCBlbmQ6IC9cIi8sXG4gICAgICAgIGNvbnRhaW5zOiBbaGxqcy5CQUNLU0xBU0hfRVNDQVBFXSxcbiAgICAgICAgaWxsZWdhbDogJ1xcXFxuJyxcbiAgICAgIH0sXG4gICAgICBobGpzLmluaGVyaXQoVkFMVUVfQ09OVEFJTkVSLCB7YmVnaW46IC86L30pXG4gICAgXS5jb25jYXQoQUxMT1dFRF9DT01NRU5UUyksXG4gICAgaWxsZWdhbDogJ1xcXFxTJ1xuICB9O1xuICB2YXIgQVJSQVkgPSB7XG4gICAgYmVnaW46ICdcXFxcWycsIGVuZDogJ1xcXFxdJyxcbiAgICBjb250YWluczogW2hsanMuaW5oZXJpdChWQUxVRV9DT05UQUlORVIpXSwgLy8gaW5oZXJpdCBpcyBhIHdvcmthcm91bmQgZm9yIGEgYnVnIHRoYXQgbWFrZXMgc2hhcmVkIG1vZGVzIHdpdGggZW5kc1dpdGhQYXJlbnQgY29tcGlsZSBvbmx5IHRoZSBlbmRpbmcgb2Ygb25lIG9mIHRoZSBwYXJlbnRzXG4gICAgaWxsZWdhbDogJ1xcXFxTJ1xuICB9O1xuICBUWVBFUy5wdXNoKE9CSkVDVCwgQVJSQVkpO1xuICBBTExPV0VEX0NPTU1FTlRTLmZvckVhY2goZnVuY3Rpb24ocnVsZSkge1xuICAgIFRZUEVTLnB1c2gocnVsZSk7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdKU09OJyxcbiAgICBjb250YWluczogVFlQRVMsXG4gICAga2V5d29yZHM6IExJVEVSQUxTLFxuICAgIGlsbGVnYWw6ICdcXFxcUydcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBqc29uO1xuIiwiLypcbkxhbmd1YWdlOiBDU1NcbkNhdGVnb3J5OiBjb21tb24sIGNzc1xuV2Vic2l0ZTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQ1NTXG4qL1xuXG5mdW5jdGlvbiBjc3MoaGxqcykge1xuICB2YXIgRlVOQ1RJT05fTElLRSA9IHtcbiAgICBiZWdpbjogL1tcXHctXStcXCgvLCByZXR1cm5CZWdpbjogdHJ1ZSxcbiAgICBjb250YWluczogW1xuICAgICAge1xuICAgICAgICBjbGFzc05hbWU6ICdidWlsdF9pbicsXG4gICAgICAgIGJlZ2luOiAvW1xcdy1dKy9cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGJlZ2luOiAvXFwoLywgZW5kOiAvXFwpLyxcbiAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICAgICAgICBobGpzLkNTU19OVU1CRVJfTU9ERSxcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfTtcbiAgdmFyIEFUVFJJQlVURSA9IHtcbiAgICBjbGFzc05hbWU6ICdhdHRyaWJ1dGUnLFxuICAgIGJlZ2luOiAvXFxTLywgZW5kOiAnOicsIGV4Y2x1ZGVFbmQ6IHRydWUsXG4gICAgc3RhcnRzOiB7XG4gICAgICBlbmRzV2l0aFBhcmVudDogdHJ1ZSwgZXhjbHVkZUVuZDogdHJ1ZSxcbiAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgIEZVTkNUSU9OX0xJS0UsXG4gICAgICAgIGhsanMuQ1NTX05VTUJFUl9NT0RFLFxuICAgICAgICBobGpzLlFVT1RFX1NUUklOR19NT0RFLFxuICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgIGhsanMuQ19CTE9DS19DT01NRU5UX01PREUsXG4gICAgICAgIHtcbiAgICAgICAgICBjbGFzc05hbWU6ICdudW1iZXInLCBiZWdpbjogJyNbMC05QS1GYS1mXSsnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBjbGFzc05hbWU6ICdtZXRhJywgYmVnaW46ICchaW1wb3J0YW50J1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9O1xuICB2YXIgQVRfSURFTlRJRklFUiA9ICdAW2Etei1dKyc7IC8vIEBmb250LWZhY2VcbiAgdmFyIEFUX01PRElGSUVSUyA9IFwiYW5kIG9yIG5vdCBvbmx5XCI7XG4gIHZhciBBVF9QUk9QRVJUWV9SRSA9IC9AXFwtP1xcd1tcXHddKihcXC1cXHcrKSovOyAvLyBALXdlYmtpdC1rZXlmcmFtZXNcbiAgdmFyIElERU5UX1JFID0gJ1thLXpBLVotXVthLXpBLVowLTlfLV0qJztcbiAgdmFyIFJVTEUgPSB7XG4gICAgYmVnaW46IC8oPzpbQS1aXFxfXFwuXFwtXSt8LS1bYS16QS1aMC05Xy1dKylcXHMqOi8sIHJldHVybkJlZ2luOiB0cnVlLCBlbmQ6ICc7JywgZW5kc1dpdGhQYXJlbnQ6IHRydWUsXG4gICAgY29udGFpbnM6IFtcbiAgICAgIEFUVFJJQlVURVxuICAgIF1cbiAgfTtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdDU1MnLFxuICAgIGNhc2VfaW5zZW5zaXRpdmU6IHRydWUsXG4gICAgaWxsZWdhbDogL1s9XFwvfCdcXCRdLyxcbiAgICBjb250YWluczogW1xuICAgICAgaGxqcy5DX0JMT0NLX0NPTU1FTlRfTU9ERSxcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnc2VsZWN0b3ItaWQnLCBiZWdpbjogLyNbQS1aYS16MC05Xy1dKy9cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLWNsYXNzJywgYmVnaW46IC9cXC5bQS1aYS16MC05Xy1dKy9cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLWF0dHInLFxuICAgICAgICBiZWdpbjogL1xcWy8sIGVuZDogL1xcXS8sXG4gICAgICAgIGlsbGVnYWw6ICckJyxcbiAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICBobGpzLkFQT1NfU1RSSU5HX01PREUsXG4gICAgICAgICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgY2xhc3NOYW1lOiAnc2VsZWN0b3ItcHNldWRvJyxcbiAgICAgICAgYmVnaW46IC86KDopP1thLXpBLVowLTlcXF9cXC1cXCtcXChcXClcIicuXSsvXG4gICAgICB9LFxuICAgICAgLy8gbWF0Y2hpbmcgdGhlc2UgaGVyZSBhbGxvd3MgdXMgdG8gdHJlYXQgdGhlbSBtb3JlIGxpa2UgcmVndWxhciBDU1NcbiAgICAgIC8vIHJ1bGVzIHNvIGV2ZXJ5dGhpbmcgYmV0d2VlbiB0aGUge30gZ2V0cyByZWd1bGFyIHJ1bGUgaGlnaGxpZ2h0aW5nLFxuICAgICAgLy8gd2hpY2ggaXMgd2hhdCB3ZSB3YW50IGZvciBwYWdlIGFuZCBmb250LWZhY2VcbiAgICAgIHtcbiAgICAgICAgYmVnaW46ICdAKHBhZ2V8Zm9udC1mYWNlKScsXG4gICAgICAgIGxleGVtZXM6IEFUX0lERU5USUZJRVIsXG4gICAgICAgIGtleXdvcmRzOiAnQHBhZ2UgQGZvbnQtZmFjZSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGJlZ2luOiAnQCcsIGVuZDogJ1t7O10nLCAvLyBhdF9ydWxlIGVhdGluZyBmaXJzdCBcIntcIiBpcyBhIGdvb2QgdGhpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJlY2F1c2UgaXQgZG9lc27igJl0IGxldCBpdCB0byBiZSBwYXJzZWQgYXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGEgcnVsZSBzZXQgYnV0IGluc3RlYWQgZHJvcHMgcGFyc2VyIGludG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBkZWZhdWx0IG1vZGUgd2hpY2ggaXMgaG93IGl0IHNob3VsZCBiZS5cbiAgICAgICAgaWxsZWdhbDogLzovLCAvLyBicmVhayBvbiBMZXNzIHZhcmlhYmxlcyBAdmFyOiAuLi5cbiAgICAgICAgcmV0dXJuQmVnaW46IHRydWUsXG4gICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2xhc3NOYW1lOiAna2V5d29yZCcsXG4gICAgICAgICAgICBiZWdpbjogQVRfUFJPUEVSVFlfUkVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGJlZ2luOiAvXFxzLywgZW5kc1dpdGhQYXJlbnQ6IHRydWUsIGV4Y2x1ZGVFbmQ6IHRydWUsXG4gICAgICAgICAgICByZWxldmFuY2U6IDAsXG4gICAgICAgICAgICBrZXl3b3JkczogQVRfTU9ESUZJRVJTLFxuICAgICAgICAgICAgY29udGFpbnM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGJlZ2luOiAvW2Etei1dKzovLFxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZTpcImF0dHJpYnV0ZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGhsanMuQVBPU19TVFJJTkdfTU9ERSxcbiAgICAgICAgICAgICAgaGxqcy5RVU9URV9TVFJJTkdfTU9ERSxcbiAgICAgICAgICAgICAgaGxqcy5DU1NfTlVNQkVSX01PREVcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGNsYXNzTmFtZTogJ3NlbGVjdG9yLXRhZycsIGJlZ2luOiBJREVOVF9SRSxcbiAgICAgICAgcmVsZXZhbmNlOiAwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBiZWdpbjogJ3snLCBlbmQ6ICd9JyxcbiAgICAgICAgaWxsZWdhbDogL1xcUy8sXG4gICAgICAgIGNvbnRhaW5zOiBbXG4gICAgICAgICAgaGxqcy5DX0JMT0NLX0NPTU1FTlRfTU9ERSxcbiAgICAgICAgICBSVUxFLFxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNzcztcbiIsIjxzY3JpcHQgY29udGV4dD1cIm1vZHVsZVwiPlxuICBpbXBvcnQgeyBhdXRob3JzIH0gZnJvbSBcIi4uLy4uL19oZWxwZXJzL3N0b3JlLmpzXCI7XG4gIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcmVsb2FkKHsgcGFyYW1zLCBxdWVyeSB9KSB7XG4gICAgLy8gdGhlIGBzbHVnYCBwYXJhbWV0ZXIgaXMgYXZhaWxhYmxlIGJlY2F1c2VcbiAgICAvLyB0aGlzIGZpbGUgaXMgY2FsbGVkIFtzbHVnXS5zdmVsdGVcbiAgICBsZXQgYXV0aG9yTWFwID0gbmV3IE1hcCgpO1xuICAgIGF1dGhvcnMuc3Vic2NyaWJlKHZhbHVlID0+IHtcbiAgICAgIGF1dGhvck1hcCA9IHZhbHVlO1xuICAgIH0pO1xuXG4gICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5mZXRjaChgQkFTRV9QQVRIL3Bvc3RzL3JvdXRlLyR7cGFyYW1zLnNsdWd9YCk7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcy5qc29uKCk7XG5cbiAgICBpZiAocmVzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICBsZXQgYXV0aG9yTWFwID0gbmV3IE1hcCgpO1xuICAgICAgbGV0IGF1dGhvckRhdGEgPSBbXTtcblxuICAgICAgY29uc3QgdW5zdWJzY3JpYmUgPSBhdXRob3JzLnN1YnNjcmliZSh2YWx1ZSA9PiB7XG4gICAgICAgIGF1dGhvck1hcCA9IHZhbHVlO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIGNyZWF0aW5nIHVuaXF1ZSBhdXRob3IgaWRzIGZyb20gdGhlIHBvc3RzXG5cbiAgICAgIGlmICghYXV0aG9yTWFwLmdldChkYXRhLmF1dGhvcklkKSkge1xuICAgICAgICAvLyBnZXR0aW5nIGF1dGhvciBkYXRhIGZvciBhbGwgdW5pcXVlIGF1dGhvcnMgdG8gYXZvaWQgbXVsdGkgZmV0Y2hcbiAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5mZXRjaChgQkFTRV9QQVRIL3VzZXJzLyR7ZGF0YS5hdXRob3JJZH1gKTtcbiAgICAgICAgYXV0aG9yRGF0YSA9IGF3YWl0IHJlcy5qc29uKCk7XG5cbiAgICAgICAgYXV0aG9ycy51cGRhdGUobWFwID0+IHtcbiAgICAgICAgICByZXR1cm4gbWFwLnNldChhdXRob3JEYXRhLl9pZCwgYXV0aG9yRGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXV0aG9yRGF0YSA9IGF1dGhvck1hcC5nZXQoZGF0YS5hdXRob3JJZCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHBvc3Q6IGRhdGEsIGF1dGhvckRhdGEgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lcnJvcihyZXMuc3RhdHVzLCBkYXRhLm1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuPC9zY3JpcHQ+XG5cbjxzY3JpcHQ+XG4gIGltcG9ydCBBdXRob3IgZnJvbSBcIi4uLy4uL2NvbXBvbmVudHMvQXV0aG9yLnN2ZWx0ZVwiO1xuICBpbXBvcnQgaGxqcyBmcm9tIFwiaGlnaGxpZ2h0LmpzL2xpYi9jb3JlXCI7XG4gIGltcG9ydCBqYXZhc2NyaXB0IGZyb20gXCJoaWdobGlnaHQuanMvbGliL2xhbmd1YWdlcy9qYXZhc2NyaXB0XCI7XG4gIGltcG9ydCBiYXNoIGZyb20gXCJoaWdobGlnaHQuanMvbGliL2xhbmd1YWdlcy9iYXNoXCI7XG4gIGltcG9ydCBzcWwgZnJvbSBcImhpZ2hsaWdodC5qcy9saWIvbGFuZ3VhZ2VzL3NxbFwiO1xuICBpbXBvcnQgc2NzcyBmcm9tIFwiaGlnaGxpZ2h0LmpzL2xpYi9sYW5ndWFnZXMvc2Nzc1wiO1xuICBpbXBvcnQganNvbiBmcm9tIFwiaGlnaGxpZ2h0LmpzL2xpYi9sYW5ndWFnZXMvanNvblwiO1xuICBpbXBvcnQgY3NzIGZyb20gXCJoaWdobGlnaHQuanMvbGliL2xhbmd1YWdlcy9jc3NcIjtcbiAgaGxqcy5yZWdpc3Rlckxhbmd1YWdlKFwiamF2YXNjcmlwdFwiLCBqYXZhc2NyaXB0KTtcbiAgaGxqcy5yZWdpc3Rlckxhbmd1YWdlKFwiYmFzaFwiLCBiYXNoKTtcbiAgaGxqcy5yZWdpc3Rlckxhbmd1YWdlKFwic3FsXCIsIHNxbCk7XG4gIGhsanMucmVnaXN0ZXJMYW5ndWFnZShcInNjc3NcIiwgc2Nzcyk7XG4gIGhsanMucmVnaXN0ZXJMYW5ndWFnZShcImpzb25cIiwganNvbik7XG4gIGhsanMucmVnaXN0ZXJMYW5ndWFnZShcImNzc1wiLCBjc3MpO1xuXG4gIGV4cG9ydCBsZXQgcG9zdDtcbiAgZXhwb3J0IGxldCBhdXRob3JEYXRhO1xuXG4gIGNvbnN0IGhpZ2hsaWdodCA9IHNvdXJjZSA9PiB7XG4gICAgY29uc3QgeyB2YWx1ZTogaGlnaGxpZ2h0ZWQgfSA9IGhsanMuaGlnaGxpZ2h0QXV0byhzb3VyY2UpO1xuICAgIHJldHVybiBoaWdobGlnaHRlZDtcbiAgfTtcblxuICBsZXQgcGFnZVZpZXdzID0gMDtcbiAgaWYgKHR5cGVvZiBmZXRjaCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgZ2xvYmFsLmZldGNoID0gcmVxdWlyZShcIm5vZGUtZmV0Y2hcIik7XG4gIH1cbiAgZmV0Y2goYEJBU0VfUEFUSC9wb3N0cy1tZXRhLWRhdGEvJHtwb3N0Ll9pZH1gKVxuICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcbiAgICAudGhlbigoeyBjb3VudCB9KSA9PiB7XG4gICAgICBwYWdlVmlld3MgPSBjb3VudDtcbiAgICB9KTtcbjwvc2NyaXB0PlxuXG48c3R5bGU+XG4gIC8qXG5cdFx0QnkgZGVmYXVsdCwgQ1NTIGlzIGxvY2FsbHkgc2NvcGVkIHRvIHRoZSBjb21wb25lbnQsXG5cdFx0YW5kIGFueSB1bnVzZWQgc3R5bGVzIGFyZSBkZWFkLWNvZGUtZWxpbWluYXRlZC5cblx0XHRJbiB0aGlzIHBhZ2UsIFN2ZWx0ZSBjYW4ndCBrbm93IHdoaWNoIGVsZW1lbnRzIGFyZVxuXHRcdGdvaW5nIHRvIGFwcGVhciBpbnNpZGUgdGhlIHt7e3Bvc3QuaHRtbH19fSBibG9jayxcblx0XHRzbyB3ZSBoYXZlIHRvIHVzZSB0aGUgOmdsb2JhbCguLi4pIG1vZGlmaWVyIHRvIHRhcmdldFxuXHRcdGFsbCBlbGVtZW50cyBpbnNpZGUgLmNvbnRlbnRcblx0Ki9cbiAgLyogLmNvbnRlbnQgOmdsb2JhbChoMikge1xuICAgIGZvbnQtc2l6ZTogMS40ZW07XG4gICAgZm9udC13ZWlnaHQ6IDUwMDtcbiAgfSAqL1xuXG4gIC8qIC5jb250ZW50IDpnbG9iYWwocHJlKSB7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogI2Y5ZjlmOTtcbiAgICBib3gtc2hhZG93OiBpbnNldCAxcHggMXB4IDVweCByZ2JhKDAsIDAsIDAsIDAuMDUpO1xuICAgIHBhZGRpbmc6IDAuNWVtO1xuICAgIGJvcmRlci1yYWRpdXM6IDJweDtcbiAgICBvdmVyZmxvdy14OiBhdXRvO1xuICB9ICovXG5cbiAgLyogLmNvbnRlbnQgOmdsb2JhbChwcmUpIDpnbG9iYWwoY29kZSkge1xuICAgIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xuICAgIHBhZGRpbmc6IDA7XG4gIH1cblxuICAuY29udGVudCA6Z2xvYmFsKHVsKSB7XG4gICAgbGluZS1oZWlnaHQ6IDEuNTtcbiAgfVxuXG4gIC5jb250ZW50IDpnbG9iYWwobGkpIHtcbiAgICBtYXJnaW46IDAgMCAwLjVlbSAwO1xuICB9ICovXG5cbiAgQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWluLXdpZHRoOiA4MDBweCkge1xuICAgIC5wb3N0LS1tZXRhZGF0YSB7XG4gICAgICBkaXNwbGF5OiBncmlkO1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAwLjhmciAyLjJmciAwLjRmciAxZnI7XG4gICAgICAtd2Via2l0LWJveC1hbGlnbjogY2VudGVyO1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICB9XG4gIH1cblxuICAucG9zdF9fdGFnIHtcbiAgICBwYWRkaW5nOiAzcHggNXB4O1xuICAgIGJhY2tncm91bmQtY29sb3I6ICNkY2RjZGM7XG4gICAgbWFyZ2luOiAycHggM3B4O1xuICAgIGJvcmRlci1yYWRpdXM6IDNweDtcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XG4gIH1cbiAgLnBvc3QtLWJvZHkge1xuICAgIG1hcmdpbjogMHB4IDEwcHg7XG4gIH1cblxuICBwcmUge1xuICAgIG1hcmdpbi1ib3R0b206IDFlbTtcbiAgICBwYWRkaW5nOiAyJSA0JTtcbiAgICB3aWR0aDogYXV0bztcbiAgICBtYXgtaGVpZ2h0OiA5MDBweDtcbiAgICBvdmVyZmxvdzogYXV0bztcbiAgICBmb250LXNpemU6IDEuNGVtO1xuICAgIGxpbmUtaGVpZ2h0OiAxLjNlbTtcbiAgfVxuXG4gIGltZyB7XG4gICAgbWF4LXdpZHRoOiAxMDAlO1xuICB9XG4gIC5jZW50ZXIge1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIG1hcmdpbjogMCBhdXRvO1xuICAgIGJveC1zaGFkb3c6IC0zcHggOHB4IDEwcHggI2Q4ZDhkODtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBtYXgtd2lkdGg6IC13ZWJraXQtbWF4LWNvbnRlbnQ7XG4gICAgbWF4LXdpZHRoOiAtbW96LW1heC1jb250ZW50O1xuICAgIG1heC13aWR0aDogbWF4LWNvbnRlbnQ7XG4gICAgYm9yZGVyLXJhZGl1czogMnB4O1xuICB9XG5cbiAgLnBvc3QtLXRpdGxlIHtcbiAgICBmb250LXNpemU6IDM2cHg7XG4gICAgbWFyZ2luOiAxNXB4IDAgNXB4O1xuICAgIGZvbnQtd2VpZ2h0OiBsaWdodGVyO1xuICB9XG4gIC5wb3N0LS1zdWItdGl0bGUge1xuICAgIGZvbnQtd2VpZ2h0OiBsaWdodGVyO1xuICAgIGZvbnQtc2l6ZTogMjJweDtcbiAgICBtYXJnaW4tdG9wOiAxMHB4O1xuICB9XG5cbiAgLnBvc3QtLW1ldGFkYXRhIHtcbiAgICBtYXJnaW4tdG9wOiAxMHB4O1xuICB9XG48L3N0eWxlPlxuXG48c3ZlbHRlOmhlYWQ+XG4gIDx0aXRsZT57cG9zdC50aXRsZX08L3RpdGxlPlxuICA8bWV0YSBuYW1lPVwia2V5d29yZHNcIiBjb250ZW50PXtwb3N0LnN1YlRpdGxlfSAvPlxuICA8bWV0YSBuYW1lPVwiZGVzY3JpcHRpb25cIiBjb250ZW50PXtwb3N0LnRhZ3Muam9pbignLCAnKX0gLz5cbiAgPG1ldGEgbmFtZT1cInR3aXR0ZXI6Y2FyZFwiIGNvbnRlbnQ9XCJzdW1tYXJ5X2xhcmdlX2ltYWdlXCIgLz5cbiAgPG1ldGEgbmFtZT1cInR3aXR0ZXI6c2l0ZVwiIGNvbnRlbnQ9XCJAX2hlY3RhbmVcIiAvPlxuICA8bWV0YSBuYW1lPVwidHdpdHRlcjpjcmVhdG9yXCIgY29udGVudD1cIkB2ZWx1c2dhdXRhbVwiIC8+XG4gIDxtZXRhIG5hbWU9XCJ0d2l0dGVyOnRpdGxlXCIgY29udGVudD17cG9zdC50aXRsZX0gLz5cbiAgPG1ldGEgbmFtZT1cInR3aXR0ZXI6ZGVzY3JpcHRpb25cIiBjb250ZW50PXtwb3N0LnN1YlRpdGxlfSAvPlxuICA8bWV0YSBuYW1lPVwidHdpdHRlcjppbWFnZVwiIGNvbnRlbnQ9e2BBU1NFVF9CQVNFLyR7cG9zdC5yb3V0ZX0vdGl0bGUuanBnYH0gLz5cblxuICA8bWV0YSBwcm9wZXJ0eT1cIm9nOnVybFwiIGNvbnRlbnQ9e2BodHRwczovL2hlY3RhbmUuY29tL2Jsb2cvJHtwb3N0LnJvdXRlfWB9IC8+XG4gIDxtZXRhIHByb3BlcnR5PVwib2c6dHlwZVwiIGNvbnRlbnQ9XCJhcnRpY2xlXCIgLz5cbiAgPG1ldGEgcHJvcGVydHk9XCJvZzp0aXRsZVwiIGNvbnRlbnQ9e3Bvc3QudGl0bGV9IC8+XG4gIDxtZXRhIHByb3BlcnR5PVwib2c6ZGVzY3JpcHRpb25cIiBjb250ZW50PXtwb3N0LnN1YlRpdGxlfSAvPlxuICA8bWV0YSBwcm9wZXJ0eT1cIm9nOmltYWdlXCIgY29udGVudD17YEFTU0VUX0JBU0UvJHtwb3N0LnJvdXRlfS90aXRsZS5qcGdgfSAvPlxuPC9zdmVsdGU6aGVhZD5cblxuPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgPGgxIGNsYXNzPVwicG9zdC0tdGl0bGVcIj57cG9zdC50aXRsZX08L2gxPlxuICA8aDQgY2xhc3M9XCJwb3N0LS1zdWItdGl0bGVcIj57cG9zdC5zdWJUaXRsZX08L2g0PlxuICA8cGljdHVyZT5cbiAgICA8c291cmNlXG4gICAgICBzcmNzZXQ9e2BBU1NFVF9CQVNFLyR7cG9zdC5yb3V0ZX0vbW9iaWxlLndlYnBgfVxuICAgICAgbWVkaWE9XCIobWF4LXdpZHRoOiA0MjBweClcIlxuICAgICAgdHlwZT1cImltYWdlL3dlYnBcIiAvPlxuICAgIDxzb3VyY2VcbiAgICAgIHNyY3NldD17YEFTU0VUX0JBU0UvJHtwb3N0LnJvdXRlfS9tb2JpbGUuanBnYH1cbiAgICAgIG1lZGlhPVwiKG1heC13aWR0aDogNDIwcHgpXCJcbiAgICAgIHR5cGU9XCJpbWFnZS9qcGdcIiAvPlxuICAgIDxzb3VyY2VcbiAgICAgIHNyY3NldD17YEFTU0VUX0JBU0UvJHtwb3N0LnJvdXRlfS9saXN0aW5nLndlYnBgfVxuICAgICAgbWVkaWE9XCIoIG1heC13aWR0aDo3OTlweClcIlxuICAgICAgdHlwZT1cImltYWdlL3dlYnBcIiAvPlxuICAgIDxzb3VyY2VcbiAgICAgIHNyY3NldD17YEFTU0VUX0JBU0UvJHtwb3N0LnJvdXRlfS9saXN0aW5nLmpwZ2B9XG4gICAgICBtZWRpYT1cIihtYXgtd2lkdGg6Nzk5cHgpXCJcbiAgICAgIHR5cGU9XCJpbWFnZS9qcGdcIiAvPlxuICAgIDxzb3VyY2VcbiAgICAgIHNyY3NldD17YEFTU0VUX0JBU0UvJHtwb3N0LnJvdXRlfS90aXRsZS53ZWJwYH1cbiAgICAgIG1lZGlhPVwiKG1pbi13aWR0aDogODAwcHgpXCJcbiAgICAgIHR5cGU9XCJpbWFnZS93ZWJwXCIgLz5cbiAgICA8c291cmNlXG4gICAgICBzcmNzZXQ9e2BBU1NFVF9CQVNFLyR7cG9zdC5yb3V0ZX0vdGl0bGUuanBnYH1cbiAgICAgIG1lZGlhPVwiKG1pbi13aWR0aDogODAwcHgpXCJcbiAgICAgIHR5cGU9XCJpbWFnZS9qcGdcIiAvPlxuICAgIDxpbWdcbiAgICAgIGNsYXNzPVwicG9zdC10aXRsZS1pbWFnZVwiXG4gICAgICBzcmM9e2BBU1NFVF9CQVNFLyR7cG9zdC5yb3V0ZX0vdGl0bGUuanBnYH1cbiAgICAgIGFsdD17cG9zdC50aXRsZX0gLz5cbiAgPC9waWN0dXJlPlxuICA8ZGl2IGNsYXNzPVwicG9zdC0tbWV0YWRhdGFcIj5cbiAgICA8QXV0aG9yXG4gICAgICBuYW1lPXthdXRob3JEYXRhLm5hbWV9XG4gICAgICBhdmF0aGFyPXthdXRob3JEYXRhLmF2YXRoYXJ9XG4gICAgICBjcmVhdGVkRGF0ZT17cG9zdC5jcmVhdGVkRGF0ZX0gLz5cbiAgICA8ZGl2IGNsYXNzPVwicG9zdF9fdGFnc1wiPlxuICAgICAgeyNlYWNoIHBvc3QudGFncyBhcyB0YWd9XG4gICAgICAgIDxzcGFuIGNsYXNzPVwicG9zdF9fdGFnXCI+e3RhZ308L3NwYW4+XG4gICAgICB7L2VhY2h9XG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cInBvc3RfX3ZpZXdzXCI+e3BhZ2VWaWV3c30gdmlld3M8L2Rpdj5cbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJwb3N0LS1ib2R5XCI+XG4gICAgeyNlYWNoIHBvc3QuYm9keSBhcyB7IHR5cGUsIGRhdGEgfX1cbiAgICAgIHsjaWYgdHlwZSA9PT0gJ2ltYWdlJ31cbiAgICAgICAgPHBpY3R1cmU+XG4gICAgICAgICAgPGltZ1xuICAgICAgICAgICAgYWx0PXtkYXRhLmNhcHRpb259XG4gICAgICAgICAgICBjbGFzcz17YCR7ZGF0YS53aXRoQm9yZGVyID8gJ2JvcmRlciAnIDogJyd9JHtkYXRhLndpdGhCYWNrZ3JvdW5kID8gJ2JhY2tncm91bmQgJyA6ICcnfSR7ZGF0YS5zdHJldGNoZWQgPyAnc3RyZXRjaGVkJyA6ICdjZW50ZXInfWB9XG4gICAgICAgICAgICBzcmM9e2Ake2RhdGEudXJsLnJlcGxhY2UoL1xcLlteLy5dKyQvLCAnJyl9LmpwZ2B9IC8+XG4gICAgICAgIDwvcGljdHVyZT5cbiAgICAgIHsvaWZ9XG4gICAgICB7I2lmIHR5cGUgPT09ICdoZWFkZXInfVxuICAgICAgICB7I2lmIGRhdGEubGV2ZWwgPT09IDF9XG4gICAgICAgICAgPGgxPntkYXRhLnRleHR9PC9oMT5cbiAgICAgICAgey9pZn1cbiAgICAgICAgeyNpZiBkYXRhLmxldmVsID09PSAyfVxuICAgICAgICAgIDxoMj57ZGF0YS50ZXh0fTwvaDI+XG4gICAgICAgIHsvaWZ9XG4gICAgICAgIHsjaWYgZGF0YS5sZXZlbCA9PT0gM31cbiAgICAgICAgICA8aDM+e2RhdGEudGV4dH08L2gzPlxuICAgICAgICB7L2lmfVxuICAgICAgICB7I2lmIGRhdGEubGV2ZWwgPT09IDR9XG4gICAgICAgICAgPGg0PntkYXRhLnRleHR9PC9oND5cbiAgICAgICAgey9pZn1cbiAgICAgIHsvaWZ9XG4gICAgICB7I2lmIHR5cGUgPT09ICdjb2RlJ31cbiAgICAgICAgPHByZSBjbGFzcz1cImhsanNcIj5cbiAgICAgICAgICA8Y29kZT5cbiAgICAgICAgICAgIHtAaHRtbCBgJHtoaWdobGlnaHQoZGF0YS5jb2RlKX1gfVxuICAgICAgICAgIDwvY29kZT5cbiAgICAgICAgPC9wcmU+XG4gICAgICB7L2lmfVxuICAgICAgeyNpZiB0eXBlID09PSAncGFyYWdyYXBoJ31cbiAgICAgICAgPHA+XG4gICAgICAgICAge0BodG1sIGRhdGEudGV4dH1cbiAgICAgICAgPC9wPlxuICAgICAgey9pZn1cbiAgICB7L2VhY2h9XG4gIDwvZGl2PlxuPC9kaXY+XG4iXSwibmFtZXMiOlsiaGxqcyIsImJhc2giLCJzcWwiLCJjc3MiXSwibWFwcGluZ3MiOiI7OztBQUFBO0FBQ0EsU0FBUyxVQUFVLEVBQUUsQ0FBQyxFQUFFO0FBQ3hCLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQjtBQUNBLEVBQUUsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLEtBQUssVUFBVSxDQUFDO0FBQzlDO0FBQ0EsRUFBRSxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsSUFBSSxFQUFFO0FBQ3hELElBQUksSUFBSSxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQztBQUM5QixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJO0FBQ3ZCLFFBQVEsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLFVBQVUsQ0FBQztBQUNyRTtBQUNBO0FBQ0EsUUFBUSxhQUFhLEdBQUcsSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLEtBQUssUUFBUSxJQUFJLElBQUksS0FBSyxXQUFXLEdBQUcsSUFBSSxDQUFDO0FBQzlGLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO0FBQ2xDLE1BQU0sVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzFCLEtBQUs7QUFDTCxHQUFHLENBQUMsQ0FBQztBQUNMO0FBQ0EsRUFBRSxPQUFP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WUFBWSw2RkFBNkY7QUFDekcsWUFBWSx1R0FBdUc7QUFDbkgsWUFBWSxtR0FBbUc7QUFDL0csWUFBWSxtR0FBbUc7QUFDL0csWUFBWSxzR0FBc0c7QUFDbEgsWUFBWSxrSEFBa0g7QUFDOUgsWUFBWSx3R0FBd0c7QUFDcEgsWUFBWSxtR0FBbUc7QUFDL0csWUFBWSx3R0FBd0c7QUFDcEgsWUFBWSxnR0FBZ0c7QUFDNUcsWUFBWSx5R0FBeUc7QUFDckgsWUFBWSx5R0FBeUc7QUFDckgsWUFBWSx3R0FBd0c7QUFDcEgsWUFBWSx5R0FBeUc7QUFDckgsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSxzR0FBc0c7QUFDbEgsWUFBWSxpR0FBaUc7QUFDN0csWUFBWSxtR0FBbUc7QUFDL0csWUFBWSx5R0FBeUc7QUFDckgsWUFBWSxtR0FBbUc7QUFDL0csWUFBWSx3R0FBd0c7QUFDcEgsWUFBWSxxR0FBcUc7QUFDakgsWUFBWSxvR0FBb0c7QUFDaEgsWUFBWSxtR0FBbUc7QUFDL0csWUFBWSx5R0FBeUc7QUFDckgsWUFBWSx5RkFBeUY7QUFDckcsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSw4R0FBOEc7QUFDMUgsWUFBWSx1R0FBdUc7QUFDbkgsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSx1R0FBdUc7QUFDbkgsWUFBWSxtR0FBbUc7QUFDL0csWUFBWSxvSEFBb0g7QUFDaEksWUFBWSwyR0FBMkc7QUFDdkgsWUFBWSxrR0FBa0c7QUFDOUcsWUFBWSxxR0FBcUc7QUFDakgsWUFBWSx3R0FBd0c7QUFDcEgsWUFBWSxzR0FBc0c7QUFDbEgsWUFBWSx5R0FBeUc7QUFDckgsWUFBWSxnR0FBZ0c7QUFDNUcsWUFBWSw4RkFBOEY7QUFDMUcsWUFBWSxxR0FBcUc7QUFDakgsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSx1R0FBdUc7QUFDbkgsWUFBWSx1R0FBdUc7QUFDbkgsWUFBWSxpSEFBaUg7QUFDN0gsWUFBWSwwR0FBMEc7QUFDdEgsWUFBWSw4RkFBOEY7QUFDMUcsWUFBWSwwR0FBMEc7QUFDdEgs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
