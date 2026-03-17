'use strict';

(function () {
  var BIB_PATH = 'assets/data/publications.bib';
  var PREPRINT_TOKENS = ['arxiv', 'biorxiv', 'medrxiv', 'ssrn', 'openreview'];
  var PREPRINT_HOSTS = ['arxiv.org', 'biorxiv.org', 'medrxiv.org', 'ssrn.com', 'openreview.net'];

  var publicationsRoot = document.querySelector('.publications');
  if (!publicationsRoot) {
    return;
  }

  var statusElement = publicationsRoot.querySelector('[data-publications-status]');
  var groupElements = {
    published: publicationsRoot.querySelector('[data-publications-group="published"]'),
    preprint: publicationsRoot.querySelector('[data-publications-group="preprint"]')
  };

  loadPublications();

  function loadPublications() {
    if (window.location.protocol === 'file:') {
      renderGroups({ published: [], preprint: [] });
      setStatus('Local preview from file:// cannot load publications.bib. Please run a local server or use GitHub Pages.');
      return;
    }

    setStatus('Loading publications...');

    fetch(BIB_PATH, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Unable to load ' + BIB_PATH + '.');
        }
        return response.text();
      })
      .then(function (text) {
        var entries;

        if (!text.trim()) {
          renderGroups({ published: [], preprint: [] });
          setStatus('No publications found yet.');
          return;
        }

        entries = window.BibtexParser.parse(text);

        var normalizedEntries = entries.map(normalizeEntry).filter(Boolean);
        renderGroups(splitGroups(normalizedEntries));

        if (!normalizedEntries.length) {
          setStatus('No publications found yet.');
          return;
        }

        clearStatus();
      })
      .catch(function () {
        renderGroups({ published: [], preprint: [] });
        setStatus('Could not load publications right now. Please check the BibTeX file format or serve the site over http.');
      });
  }

  function normalizeEntry(entry, index) {
    var fields = entry.entryTags || {};
    var title = cleanText(fields.title) || entry.citationKey || 'Untitled publication';
    var authors = formatAuthors(fields.author);
    var year = getYear(fields);
    var source = getSource(fields);
    var primaryLink = getPrimaryLink(fields);
    var links = getLinks(fields, primaryLink);

    return {
      id: entry.citationKey || ('entry-' + index),
      title: title,
      authors: authors,
      year: year,
      source: source,
      primaryLink: primaryLink,
      links: links,
      category: classifyEntry(fields, source, primaryLink),
      sortValue: getSortValue(fields),
      titleSort: title.toLowerCase()
    };
  }

  function renderGroups(groups) {
    renderGroup(groupElements.published, groups.published, 'No published papers to show yet.');
    renderGroup(groupElements.preprint, groups.preprint, 'No preprints to show yet.');
  }

  function renderGroup(container, items, emptyMessage) {
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!items.length) {
      var emptyItem = document.createElement('li');
      emptyItem.className = 'publication-empty-state';
      emptyItem.textContent = emptyMessage;
      container.appendChild(emptyItem);
      return;
    }

    items.forEach(function (item) {
      container.appendChild(buildPublicationItem(item));
    });
  }

  function buildPublicationItem(item) {
    var listItem = document.createElement('li');
    listItem.className = 'publication-item';

    var card = document.createElement('div');
    card.className = 'publication-card';

    var meta = document.createElement('div');
    meta.className = 'publication-meta';

    var source = document.createElement('p');
    source.className = 'publication-source';
    source.textContent = item.source || (item.category === 'preprint' ? 'Preprint' : 'Publication');

    var dot = document.createElement('span');
    dot.className = 'dot';

    var year = document.createElement('time');
    year.className = 'publication-year';
    year.textContent = item.year || 'n.d.';
    if (item.year) {
      year.setAttribute('datetime', String(item.year));
    }

    meta.appendChild(source);
    meta.appendChild(dot);
    meta.appendChild(year);

    var titleHeading = document.createElement('h3');
    titleHeading.className = 'h3 publication-title';

    if (item.primaryLink) {
      var titleLink = document.createElement('a');
      titleLink.className = 'publication-title-link';
      titleLink.href = item.primaryLink;
      titleLink.target = '_blank';
      titleLink.rel = 'noreferrer';
      titleLink.textContent = item.title;
      titleHeading.appendChild(titleLink);
    } else {
      titleHeading.textContent = item.title;
    }

    var authorText = document.createElement('p');
    authorText.className = 'publication-authors';
    authorText.textContent = item.authors || 'Authors unavailable';

    card.appendChild(meta);
    card.appendChild(titleHeading);
    card.appendChild(authorText);

    if (item.links.length) {
      card.appendChild(buildLinks(item.links));
    }

    listItem.appendChild(card);
    return listItem;
  }

  function buildLinks(links) {
    var linkList = document.createElement('ul');
    linkList.className = 'publication-links';

    links.forEach(function (link) {
      var item = document.createElement('li');
      item.className = 'publication-link-item';

      var anchor = document.createElement('a');
      anchor.className = 'publication-link';
      anchor.href = link.href;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      anchor.textContent = link.label;

      item.appendChild(anchor);
      linkList.appendChild(item);
    });

    return linkList;
  }

  function splitGroups(items) {
    var groups = {
      published: [],
      preprint: []
    };

    items.sort(function (a, b) {
      if (b.sortValue !== a.sortValue) {
        return b.sortValue - a.sortValue;
      }

      if (a.titleSort < b.titleSort) {
        return -1;
      }

      if (a.titleSort > b.titleSort) {
        return 1;
      }

      return 0;
    });

    items.forEach(function (item) {
      groups[item.category].push(item);
    });

    return groups;
  }

  function classifyEntry(fields, source, primaryLink) {
    var keywords = getKeywords(fields.keywords);
    if (keywords.indexOf('preprint') !== -1) {
      return 'preprint';
    }
    if (keywords.indexOf('published') !== -1) {
      return 'published';
    }

    var archivePrefix = cleanText(fields.archiveprefix || fields.archivePrefix);
    var eprint = cleanText(fields.eprint);
    var eprintType = cleanText(fields.eprinttype || fields.eprintType).toLowerCase();
    var primaryClass = cleanText(fields.primaryclass || fields.primaryClass);
    var pubstate = cleanText(fields.pubstate).toLowerCase();
    var preprintSignal = [
      source,
      primaryLink,
      cleanText(fields.publisher),
      cleanText(fields.journal || fields.journaltitle),
      eprintType
    ].join(' ').toLowerCase();

    if (archivePrefix || eprint || primaryClass || pubstate === 'prepublished' || containsPreprintSignal(preprintSignal)) {
      return 'preprint';
    }

    if (cleanText(fields.journal || fields.journaltitle) || cleanText(fields.booktitle) || cleanText(fields.publisher)) {
      return 'published';
    }

    return 'published';
  }

  function containsPreprintSignal(value) {
    var lowerValue = value.toLowerCase();

    if (PREPRINT_HOSTS.some(function (host) { return lowerValue.indexOf(host) !== -1; })) {
      return true;
    }

    return PREPRINT_TOKENS.some(function (token) {
      return lowerValue.indexOf(token) !== -1;
    });
  }

  function getSource(fields) {
    var journal = cleanText(fields.journal || fields.journaltitle);
    if (journal) {
      return journal;
    }

    var booktitle = cleanText(fields.booktitle);
    if (booktitle) {
      return booktitle;
    }

    var archivePrefix = cleanText(fields.archiveprefix || fields.archivePrefix);
    if (archivePrefix) {
      var eprint = cleanText(fields.eprint);
      return eprint ? archivePrefix + ': ' + eprint : archivePrefix;
    }

    var eprintType = cleanText(fields.eprinttype || fields.eprintType);
    if (eprintType) {
      return eprintType;
    }

    var publisher = cleanText(fields.publisher);
    if (publisher) {
      return publisher;
    }

    var url = cleanText(fields.url);
    if (url) {
      if (url.indexOf('arxiv.org') !== -1) {
        return 'arXiv';
      }
      if (url.indexOf('biorxiv.org') !== -1) {
        return 'bioRxiv';
      }
      if (url.indexOf('medrxiv.org') !== -1) {
        return 'medRxiv';
      }
      if (url.indexOf('openreview.net') !== -1) {
        return 'OpenReview';
      }
      if (url.indexOf('ssrn.com') !== -1) {
        return 'SSRN';
      }
    }

    return '';
  }

  function getPrimaryLink(fields) {
    var url = cleanText(fields.url);
    if (url) {
      return url;
    }

    var doi = cleanText(fields.doi);
    if (doi) {
      return 'https://doi.org/' + doi.replace(/^https?:\/\/doi\.org\//i, '');
    }

    return '';
  }

  function getLinks(fields, primaryLink) {
    var links = [];
    var seen = {};

    addLink('DOI', getDoiLink(fields.doi));
    addLink('URL', cleanText(fields.url));
    addLink('PDF', getPdfLink(fields));

    function addLink(label, href) {
      if (!href || seen[href]) {
        return;
      }

      if (label === 'URL' && href === primaryLink) {
        seen[href] = true;
        return;
      }

      seen[href] = true;
      links.push({ label: label, href: href });
    }

    return links;
  }

  function getDoiLink(doiValue) {
    var doi = cleanText(doiValue);
    if (!doi) {
      return '';
    }

    return 'https://doi.org/' + doi.replace(/^https?:\/\/doi\.org\//i, '');
  }

  function getPdfLink(fields) {
    var pdf = cleanText(fields.pdf);
    if (pdf) {
      return pdf;
    }

    var note = cleanText(fields.note);
    if (note.indexOf('http') !== -1 && note.indexOf('.pdf') !== -1) {
      var noteMatch = note.match(/https?:\/\/\S+\.pdf(?:\?\S*)?/i);
      if (noteMatch) {
        return noteMatch[0];
      }
    }

    var url = cleanText(fields.url);
    if (url && /\.pdf($|\?)/i.test(url)) {
      return url;
    }

    return '';
  }

  function getYear(fields) {
    var year = cleanText(fields.year);
    if (year) {
      var yearMatch = year.match(/\d{4}/);
      if (yearMatch) {
        return yearMatch[0];
      }
    }

    var date = cleanText(fields.date);
    if (date) {
      var dateMatch = date.match(/\d{4}/);
      if (dateMatch) {
        return dateMatch[0];
      }
    }

    return '';
  }

  function getSortValue(fields) {
    var date = cleanText(fields.date);
    if (date) {
      var match = date.match(/(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
      if (match) {
        return Number(match[1] + (match[2] || '00') + (match[3] || '00'));
      }
    }

    var year = getYear(fields);
    if (year) {
      return Number(year + '0000');
    }

    return 0;
  }

  function formatAuthors(authorField) {
    var rawAuthorField = cleanText(authorField, true);
    if (!rawAuthorField) {
      return '';
    }

    var authors = splitAuthors(rawAuthorField).map(formatAuthorName).filter(Boolean);

    if (authors.length <= 1) {
      return authors[0] || '';
    }

    if (authors.length === 2) {
      return authors[0] + ' and ' + authors[1];
    }

    return authors.slice(0, -1).join(', ') + ', and ' + authors[authors.length - 1];
  }

  function splitAuthors(authorField) {
    var authors = [];
    var buffer = '';
    var depth = 0;
    var lowerField = authorField.toLowerCase();
    var index = 0;

    while (index < authorField.length) {
      var char = authorField[index];

      if (char === '{') {
        depth += 1;
        buffer += char;
        index += 1;
        continue;
      }

      if (char === '}') {
        depth = Math.max(depth - 1, 0);
        buffer += char;
        index += 1;
        continue;
      }

      if (depth === 0 && lowerField.slice(index, index + 5) === ' and ') {
        authors.push(buffer.trim());
        buffer = '';
        index += 5;
        continue;
      }

      buffer += char;
      index += 1;
    }

    if (buffer.trim()) {
      authors.push(buffer.trim());
    }

    return authors;
  }

  function formatAuthorName(author) {
    var cleaned = cleanText(author);
    if (!cleaned) {
      return '';
    }

    var parts = cleaned.split(',').map(function (part) {
      return part.trim();
    }).filter(Boolean);

    if (parts.length === 2) {
      return parts[1] + ' ' + parts[0];
    }

    if (parts.length === 3) {
      return parts[2] + ' ' + parts[0] + ', ' + parts[1];
    }

    return cleaned;
  }

  function getKeywords(keywordsField) {
    return cleanText(keywordsField)
      .toLowerCase()
      .split(/[;,]/)
      .map(function (keyword) {
        return keyword.trim();
      })
      .filter(Boolean);
  }

  function cleanText(value, keepDelimiters) {
    if (!value) {
      return '';
    }

    var text = String(value)
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!keepDelimiters) {
      text = text.replace(/[{}]/g, '');
    }

    return text
      .replace(/\\&/g, '&')
      .replace(/\\_/g, '_')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\:/g, ':')
      .trim();
  }

  function setStatus(message) {
    if (!statusElement) {
      return;
    }

    statusElement.textContent = message;
    statusElement.classList.add('active');
  }

  function clearStatus() {
    if (!statusElement) {
      return;
    }

    statusElement.textContent = '';
    statusElement.classList.remove('active');
  }
})();

