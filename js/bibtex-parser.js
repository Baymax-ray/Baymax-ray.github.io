'use strict';

// Local BibTeX parser for static-site use. It supports common Zotero exports,
// including @string macros, quoted/braced values, and simple concatenation.
(function (global) {
  function BibTeXParser(text) {
    this.text = text || '';
    this.index = 0;
    this.length = this.text.length;
    this.strings = {
      jan: 'January',
      feb: 'February',
      mar: 'March',
      apr: 'April',
      may: 'May',
      jun: 'June',
      jul: 'July',
      aug: 'August',
      sep: 'September',
      oct: 'October',
      nov: 'November',
      dec: 'December'
    };
  }

  BibTeXParser.prototype.parse = function () {
    var entries = [];

    while (this.index < this.length) {
      var atIndex = this.text.indexOf('@', this.index);

      if (atIndex === -1) {
        break;
      }

      this.index = atIndex + 1;
      var entryType = this.readIdentifier().toLowerCase();

      this.skipSpaceAndComments();

      if (this.currentChar() !== '{' && this.currentChar() !== '(') {
        continue;
      }

      var openChar = this.currentChar();
      var closeChar = openChar === '{' ? '}' : ')';
      this.index += 1;

      if (entryType === 'comment' || entryType === 'preamble') {
        this.skipEnclosed(openChar, closeChar);
        continue;
      }

      if (entryType === 'string') {
        this.parseStringDeclaration(closeChar);
        continue;
      }

      var entry = this.parseEntry(entryType, closeChar);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  };

  BibTeXParser.prototype.parseEntry = function (entryType, closeChar) {
    this.skipSpaceAndComments();
    var citationKey = this.readUntil([',', closeChar]).trim();
    var fields = {};

    if (this.currentChar() === closeChar) {
      this.index += 1;
      return {
        entryType: entryType,
        citationKey: citationKey,
        entryTags: fields
      };
    }

    if (this.currentChar() === ',') {
      this.index += 1;
    }

    while (this.index < this.length) {
      this.skipSpaceAndComments();

      if (this.currentChar() === closeChar) {
        this.index += 1;
        break;
      }

      var fieldName = this.readIdentifier().toLowerCase();
      this.skipSpaceAndComments();

      if (this.currentChar() !== '=') {
        this.skipUntilDelimiter(closeChar);
        continue;
      }

      this.index += 1;
      this.skipSpaceAndComments();

      fields[fieldName] = this.readValue(closeChar);

      this.skipSpaceAndComments();
      if (this.currentChar() === ',') {
        this.index += 1;
      }
    }

    return {
      entryType: entryType,
      citationKey: citationKey,
      entryTags: fields
    };
  };

  BibTeXParser.prototype.parseStringDeclaration = function (closeChar) {
    this.skipSpaceAndComments();
    var name = this.readIdentifier().toLowerCase();

    this.skipSpaceAndComments();
    if (this.currentChar() === '=') {
      this.index += 1;
      this.skipSpaceAndComments();
      this.strings[name] = this.readValue(closeChar);
    }

    while (this.index < this.length && this.currentChar() !== closeChar) {
      this.index += 1;
    }

    if (this.currentChar() === closeChar) {
      this.index += 1;
    }
  };

  BibTeXParser.prototype.readValue = function (closeChar) {
    var parts = [];

    while (this.index < this.length) {
      this.skipSpaceAndComments();
      parts.push(this.readValuePart(closeChar));
      this.skipSpaceAndComments();

      if (this.currentChar() !== '#') {
        break;
      }

      this.index += 1;
    }

    return parts.join('');
  };

  BibTeXParser.prototype.readValuePart = function (closeChar) {
    var char = this.currentChar();

    if (char === '{') {
      return this.readBracedValue();
    }

    if (char === '"') {
      return this.readQuotedValue();
    }

    var token = this.readUntil([',', '#', closeChar]).trim();
    if (!token) {
      return '';
    }

    var lookup = token.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(this.strings, lookup)) {
      return this.strings[lookup];
    }

    return token;
  };

  BibTeXParser.prototype.readBracedValue = function () {
    var depth = 0;
    var buffer = '';

    while (this.index < this.length) {
      var char = this.text[this.index];

      if (char === '{') {
        if (depth > 0) {
          buffer += char;
        }
        depth += 1;
        this.index += 1;
        continue;
      }

      if (char === '}') {
        depth -= 1;
        this.index += 1;

        if (depth === 0) {
          break;
        }

        buffer += char;
        continue;
      }

      if (char === '\\' && this.index + 1 < this.length) {
        buffer += char + this.text[this.index + 1];
        this.index += 2;
        continue;
      }

      buffer += char;
      this.index += 1;
    }

    return buffer;
  };

  BibTeXParser.prototype.readQuotedValue = function () {
    var depth = 0;
    var buffer = '';

    this.index += 1;

    while (this.index < this.length) {
      var char = this.text[this.index];

      if (char === '\\' && this.index + 1 < this.length) {
        buffer += char + this.text[this.index + 1];
        this.index += 2;
        continue;
      }

      if (char === '{') {
        depth += 1;
        buffer += char;
        this.index += 1;
        continue;
      }

      if (char === '}') {
        if (depth > 0) {
          depth -= 1;
        }
        buffer += char;
        this.index += 1;
        continue;
      }

      if (char === '"' && depth === 0) {
        this.index += 1;
        break;
      }

      buffer += char;
      this.index += 1;
    }

    return buffer;
  };

  BibTeXParser.prototype.readIdentifier = function () {
    var start = this.index;

    while (this.index < this.length) {
      var char = this.text[this.index];
      if (!/[A-Za-z0-9_\-:]/.test(char)) {
        break;
      }
      this.index += 1;
    }

    return this.text.slice(start, this.index);
  };

  BibTeXParser.prototype.readUntil = function (delimiters) {
    var start = this.index;

    while (this.index < this.length) {
      if (delimiters.indexOf(this.text[this.index]) !== -1) {
        break;
      }
      this.index += 1;
    }

    return this.text.slice(start, this.index);
  };

  BibTeXParser.prototype.skipUntilDelimiter = function (closeChar) {
    while (this.index < this.length) {
      var char = this.currentChar();
      if (char === ',' || char === closeChar) {
        break;
      }
      this.index += 1;
    }
  };

  BibTeXParser.prototype.skipEnclosed = function (openChar, closeChar) {
    var depth = 1;

    while (this.index < this.length && depth > 0) {
      var char = this.text[this.index];

      if (char === openChar) {
        depth += 1;
      } else if (char === closeChar) {
        depth -= 1;
      }

      this.index += 1;
    }
  };

  BibTeXParser.prototype.skipSpaceAndComments = function () {
    while (this.index < this.length) {
      var char = this.currentChar();

      if (/\s/.test(char)) {
        this.index += 1;
        continue;
      }

      if (char === '%') {
        while (this.index < this.length && this.currentChar() !== '\n') {
          this.index += 1;
        }
        continue;
      }

      break;
    }
  };

  BibTeXParser.prototype.currentChar = function () {
    return this.text[this.index];
  };

  global.BibtexParser = {
    parse: function (text) {
      return new BibTeXParser(text).parse();
    }
  };
})(window);
