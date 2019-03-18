// minimal Trie implementation for efficient auto-complete, (c) Alex Yu 2019
// adapted from https://gist.githubusercontent.com/tpae/72e1c54471e88b689f85ad2b3940a8f0/raw/b3078a1755537142a42b0ec6505d0c39c42abfeb/Trie.js
function AutoCompleteTrieNode(key) {
  this.key = key;
  this.children = {};
  this.ids = [];
}
// construct a new AutoCompleteTrie
function AutoCompleteTrie() {
  this.root = new AutoCompleteTrieNode(null);
}

// inserts a single word with the given ID into the AutoCompleteTrie.
AutoCompleteTrie.prototype._insert = function(word, id) {
  var node = this.root;
  
  for(var i = 0; i < word.length; i++) {
    var c = word[i];
    if (c == '-' || c == '_') c = ' ';
    if (!node.children[c]) {
      node.children[c] = new AutoCompleteTrieNode(c);
    }
    node = node.children[c];
    node.ids.push(id);
  }
};

/* inserts a string with the given ID into the AutoCompleteTrie,
 * so that the substring starting at each word may be queried. */
AutoCompleteTrie.prototype.insert = function(str, id) {
  str = str.toLowerCase();
  var spl = str.split(/[- _]/);
  for (var i = 0; i < spl.length; i++) {
      this._insert(spl.slice(i).join(" "), id);
  }
};

/* returns ID's of all strings with given prefix */
AutoCompleteTrie.prototype.query = function(prefix) {
  var node = this.root;
  prefix = prefix.toLowerCase();
  for(var i = 0; i < prefix.length; i++) {
    var c = prefix[i];
    if (c == '-' || c == '_') c = ' ';
    if (node.children[c]) {
      node = node.children[c];
    } else {
      return [];
    }
  }
  node.ids.sort();
  var i = 0;
  for (var j = 0; j < node.ids.length; ++j) {
      if (j > 0 && node.ids[j] == node.ids[j-1]) {
          continue;
      }
      node.ids[i] = node.ids[j];
      i++;
  }
  while (node.ids.length > i) node.ids.pop();
  return node.ids;
};
