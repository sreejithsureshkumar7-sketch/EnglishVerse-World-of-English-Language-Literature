/**
 * @license
 * EnglishVerse 3D – The World of English Language & Literature
 * Core Vanilla JavaScript Engine
 */

// ==========================================================================
// 1. Web Audio API Synthesizer (Realistic Page Flips & Ambient Library)
// ==========================================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.soundEffectsEnabled = false;
    this.ambientEnabled = false;
    this.ambientNodes = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPageTurn() {
    if (!this.soundEffectsEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Synthesize realistic paper rustle with bandpass-filtered noise
      const bufferSize = this.ctx.sampleRate * 0.22;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.2);
      filter.Q.setValueAtTime(2.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.22);
    } catch {
      // Audio fallback silent
    }
  }

  toggleAmbient(enable) {
    this.ambientEnabled = enable;
    this.init();
    if (!this.ctx) return;

    if (this.ambientEnabled) {
      if (this.ambientNodes) return;
      try {
        const now = this.ctx.currentTime;
        // Warm resonant library drone
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(55, now); // A1
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(110, now); // A2

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.035, now + 2);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();

        this.ambientNodes = { osc1, osc2, gain };
      } catch {
        // Fallback
      }
    } else {
      if (this.ambientNodes) {
        try {
          const now = this.ctx.currentTime;
          this.ambientNodes.gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
          setTimeout(() => {
            if (this.ambientNodes) {
              this.ambientNodes.osc1.stop();
              this.ambientNodes.osc2.stop();
              this.ambientNodes.osc1.disconnect();
              this.ambientNodes.osc2.disconnect();
              this.ambientNodes = null;
            }
          }, 550);
        } catch {
          this.ambientNodes = null;
        }
      }
    }
  }
}

const audio = new SoundEngine();

function showAudioToast(message, icon = '🔊') {
  const toast = document.getElementById('audio-toast');
  const msgEl = document.getElementById('audio-toast-msg');
  const iconEl = document.getElementById('audio-toast-icon');
  if (toast && msgEl) {
    msgEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }
}

// ==========================================================================
// 2. Realistic 3D Interactive Book Engine
// ==========================================================================
class InteractiveBook {
  constructor() {
    this.totalLeaves = 6;
    this.currentLeaf = 0; // 0 = closed/showing page 1, 1 = leaf 1 flipped showing p2/p3, etc.
    this.isTurning = false;
    this.leaves = [];
    this.prevBtn = document.getElementById('book-prev-btn');
    this.nextBtn = document.getElementById('book-next-btn');
    this.pageText = document.getElementById('current-page-text');
    this.tocSelect = document.getElementById('book-toc-select');

    for (let i = 1; i <= this.totalLeaves; i++) {
      const el = document.getElementById(`leaf-${i}`);
      if (el) this.leaves.push(el);
    }

    this.init();
  }

  init() {
    this.updateZIndices();
    this.updateControls();

    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.turnBackward());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.turnForward());
    }
    if (this.tocSelect) {
      this.tocSelect.addEventListener('change', (e) => {
        const target = parseInt(e.target.value, 10);
        this.goToLeaf(target);
      });
    }

    // Attach click listeners to individual leaves & dog-ear corners
    this.leaves.forEach((leaf, idx) => {
      leaf.addEventListener('click', (e) => {
        if (this.isTurning) return;
        // If clicking right side of open book (unflipped leaf)
        if (!leaf.classList.contains('flipped')) {
          this.turnForward();
        } else {
          // If clicking left side of book (already flipped leaf)
          this.turnBackward();
        }
      });
    });

    // Keyboard navigation (Arrow keys)
    window.addEventListener('keydown', (e) => {
      // Don't intercept if typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        this.turnForward();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        this.turnBackward();
      }
    });

    // Touch swipe support on book stage
    const stage = document.getElementById('book-stage');
    if (stage) {
      let touchStartX = 0;
      stage.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      stage.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 40) {
          if (diff < 0) this.turnForward();
          else this.turnBackward();
        }
      }, { passive: true });
    }
  }

  updateZIndices() {
    this.leaves.forEach((leaf, i) => {
      if (i < this.currentLeaf) {
        // Left stack: leaves that are flipped (layering higher as more pages turn)
        leaf.style.zIndex = 10 + i;
      } else {
        // Right stack: leaves waiting to turn (top-most leaf has highest z-index)
        leaf.style.zIndex = 20 + (this.totalLeaves - i);
      }
    });
  }

  turnForward() {
    if (this.isTurning || this.currentLeaf >= this.totalLeaves) return;
    this.isTurning = true;
    audio.playPageTurn();

    const targetLeaf = this.leaves[this.currentLeaf];
    targetLeaf.classList.add('turning');
    targetLeaf.classList.add('flipped');

    // Elevate leaf above both stacks during 3D arc
    targetLeaf.style.zIndex = 50;

    setTimeout(() => {
      this.currentLeaf++;
      this.updateZIndices();
      this.updateControls();
      targetLeaf.classList.remove('turning');
      this.isTurning = false;
    }, 700);
  }

  turnBackward() {
    if (this.isTurning || this.currentLeaf <= 0) return;
    this.isTurning = true;
    audio.playPageTurn();

    this.currentLeaf--;
    const targetLeaf = this.leaves[this.currentLeaf];
    targetLeaf.classList.add('turning');
    targetLeaf.style.zIndex = 50;
    targetLeaf.classList.remove('flipped');

    setTimeout(() => {
      this.updateZIndices();
      this.updateControls();
      targetLeaf.classList.remove('turning');
      this.isTurning = false;
    }, 700);
  }

  goToLeaf(leafIdx) {
    if (this.isTurning || leafIdx === this.currentLeaf) return;
    if (leafIdx < 0 || leafIdx > this.totalLeaves) return;

    const step = () => {
      if (this.currentLeaf < leafIdx) {
        this.turnForward();
        setTimeout(step, 400);
      } else if (this.currentLeaf > leafIdx) {
        this.turnBackward();
        setTimeout(step, 400);
      }
    };
    step();
  }

  updateControls() {
    if (this.prevBtn) this.prevBtn.disabled = this.currentLeaf === 0;
    if (this.nextBtn) this.nextBtn.disabled = this.currentLeaf === this.totalLeaves;

    // Display current open pages
    let pageStr = 'Pages 1 – 2';
    if (this.currentLeaf === 0) pageStr = 'Pages 1 – 2';
    else if (this.currentLeaf === this.totalLeaves) pageStr = 'Pages 11 – 12';
    else {
      const leftPage = this.currentLeaf * 2;
      const rightPage = leftPage + 1;
      pageStr = `Pages ${leftPage} – ${rightPage}`;
    }

    if (this.pageText) this.pageText.textContent = pageStr;
    if (this.tocSelect) {
      const val = Math.min(this.currentLeaf, this.totalLeaves - 1);
      this.tocSelect.value = String(val);
    }
  }
}

// ==========================================================================
// 3. Floating 3D Hero Book Perspective Tilt
// ==========================================================================
function initHeroBookTilt() {
  const container = document.getElementById('hero-book-container');
  const book = document.getElementById('hero-floating-book');
  if (!container || !book) return;

  // Check if reduced motion is requested
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotX = 18 - (y / rect.height) * 16;
    const rotY = -20 + (x / rect.width) * 20;

    book.style.transform = `translateY(-6px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(1deg)`;
  });

  container.addEventListener('mouseleave', () => {
    book.style.transform = '';
  });
}

// ==========================================================================
// 4. Background Literary Particles Canvas
// ==========================================================================
function initParticlesCanvas() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const glyphs = ['A', 'B', 'C', 'D', 'E', '§', '¶', '𝔈', '𝔏', '𝔖', 'Ω', 'α', 'β', 'λ', '✦', '·', '✧'];
  const particles = [];
  const count = window.innerWidth < 768 ? 20 : 45;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
      size: Math.random() * 14 + 10,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -Math.random() * 0.45 - 0.15,
      opacity: Math.random() * 0.35 + 0.1,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.01,
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    const isLight = document.body.classList.contains('light-theme');
    const colorBase = isLight ? '155, 119, 54' : '197, 160, 89';

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vRot;

      if (p.y < -30) p.y = height + 30;
      if (p.x < -30) p.x = width + 30;
      if (p.x > width + 30) p.x = -30;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = `rgba(${colorBase}, ${p.opacity})`;
      ctx.font = `italic ${p.size}px 'Cormorant Garamond', Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.glyph, 0, 0);
      ctx.restore();
    });

    requestAnimationFrame(render);
  }

  render();
}

// ==========================================================================
// 5. Interactive Digital Library
// ==========================================================================
const libraryBooksData = [
  {
    id: 'hamlet',
    title: 'Hamlet, Prince of Denmark',
    author: 'William Shakespeare',
    year: '1601',
    category: 'Drama',
    themeClass: 'cover-navy',
    synopsis: 'Shakespeare’s supreme tragedy of existential doubt, filial duty, vengeance, and madness in the castle of Elsinore.',
    quote: '“There are more things in heaven and earth, Horatio, Than are dreamt of in your philosophy.”',
    targetLeaf: 1,
  },
  {
    id: 'pride-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: '1813',
    category: 'Novels',
    themeClass: 'cover-burgundy',
    synopsis: 'An incomparable masterpiece of irony, social satire, and psychological realism tracing Elizabeth Bennet and Mr. Darcy.',
    quote: '“I must learn to be contented with being happier than I deserve.”',
    targetLeaf: 1,
  },
  {
    id: 'paradise-lost',
    title: 'Paradise Lost',
    author: 'John Milton',
    year: '1667',
    category: 'Poetry',
    themeClass: 'cover-emerald',
    synopsis: 'Monumental epic poem in grand blank verse justifying the ways of God to men and depicting Lucifer’s celestial rebellion.',
    quote: '“The mind is its own place, and in itself can make a heaven of hell, a hell of heaven.”',
    targetLeaf: 5,
  },
  {
    id: 'great-expectations',
    title: 'Great Expectations',
    author: 'Charles Dickens',
    year: '1861',
    category: 'Novels',
    themeClass: 'cover-cognac',
    synopsis: 'Pip’s transformative journey through poverty, mysterious benefactor patronage, and moral redemption in Victorian England.',
    quote: '“Pause you who read this, and think for a moment of the long chain of iron or gold, of thorns or flowers, that would never have bound you, but for the formation of the first link on one memorable day.”',
    targetLeaf: 5,
  },
  {
    id: 'lyrical-ballads',
    title: 'Lyrical Ballads',
    author: 'Wordsworth & Coleridge',
    year: '1798',
    category: 'Poetry',
    themeClass: 'cover-sapphire',
    synopsis: 'The catalyst of English Romanticism, proposing that poetry is the spontaneous overflow of powerful feelings recollected in tranquility.',
    quote: '“Come forth into the light of things, let Nature be your teacher.”',
    targetLeaf: 2,
  },
  {
    id: 'elements-style',
    title: 'The Principles of Rhetoric & Style',
    author: 'Department Faculty Canon',
    year: '1918',
    category: 'Grammar',
    themeClass: 'cover-charcoal',
    synopsis: 'Essential guide to syntactic economy, periodic sentences, active verbs, and rhetorical cadence.',
    quote: '“Vigorous writing is concise. A sentence should contain no unnecessary words, a paragraph no unnecessary sentences.”',
    targetLeaf: 4,
  },
  {
    id: 'beowulf',
    title: 'Beowulf & The Anglo-Saxon Elegies',
    author: 'Anonymous Oral Tradition',
    year: 'c. 8th Century',
    category: 'Literature',
    themeClass: 'cover-navy',
    synopsis: 'Old English heroic alliterative poem depicting the Geatish hero Beowulf’s battles against Grendel, his mother, and the dragon.',
    quote: '“Fate goes ever as it must.” (Gæð a wyrd swa hio scel.)',
    targetLeaf: 2,
  },
  {
    id: 'waste-land',
    title: 'The Waste Land & Modernist Verse',
    author: 'T.S. Eliot',
    year: '1922',
    category: 'Poetry',
    themeClass: 'cover-burgundy',
    synopsis: 'High Modernist landmark portraying spiritual disintegration and rebirth in post-WWI Western culture using mythic resonance.',
    quote: '“These fragments I have shored against my ruins.”',
    targetLeaf: 2,
  },
  {
    id: 'to-the-lighthouse',
    title: 'To the Lighthouse',
    author: 'Virginia Woolf',
    year: '1927',
    category: 'Novels',
    themeClass: 'cover-emerald',
    synopsis: 'Pioneering stream-of-consciousness exploration of the Ramsay family, artistic vision, and the inexorable passage of time.',
    quote: '“What is the meaning of life? That was all—a simple question; one that tended to close in on one with years.”',
    targetLeaf: 5,
  },
  {
    id: 'creative-writing',
    title: 'The Architecture of Fiction',
    author: 'Department M.F.A. Atelier',
    year: '2025',
    category: 'Writing',
    themeClass: 'cover-cognac',
    synopsis: 'Mastering narrative viewpoint, character agency, rhythmic dialogue, and thematic subtext in prose.',
    quote: '“The story begins the moment character choice encounters irrevocable consequence.”',
    targetLeaf: 3,
  },
  {
    id: 'canterbury-tales',
    title: 'The Canterbury Tales',
    author: 'Geoffrey Chaucer',
    year: 'c. 1387',
    category: 'Literature',
    themeClass: 'cover-sapphire',
    synopsis: 'Vibrant Middle English panoramic framework narrative detailing pilgrims on their journey to Saint Thomas Becket’s shrine.',
    quote: '“Whan that Aprille with his shoures soote, The droghte of March hath perced to the roote...”',
    targetLeaf: 2,
  },
  {
    id: 'english-grammar-syntax',
    title: 'Modern English Syntax & Usage',
    author: 'Academic Scholars',
    year: '2024',
    category: 'Grammar',
    themeClass: 'cover-charcoal',
    synopsis: 'Comprehensive structural handbook analyzing subordinate clauses, participle modifiers, and rhetorical cadence.',
    quote: '“Clarity in syntax is the foundational courtesy the writer extends to the reader’s mind.”',
    targetLeaf: 4,
  },
];

function initDigitalLibrary(bookEngine) {
  const shelfRow1 = document.getElementById('shelf-row-1');
  const shelfRow2 = document.getElementById('shelf-row-2');
  const filterBtns = document.querySelectorAll('.filter-tab-btn');
  const searchInput = document.getElementById('library-search-input');

  let activeCategory = 'all';
  let searchQuery = '';

  function renderBooks() {
    const filtered = libraryBooksData.filter((b) => {
      const matchCat = activeCategory === 'all' || b.category.toLowerCase() === activeCategory.toLowerCase();
      const matchSearch =
        searchQuery === '' ||
        b.title.toLowerCase().includes(searchQuery) ||
        b.author.toLowerCase().includes(searchQuery) ||
        b.synopsis.toLowerCase().includes(searchQuery);
      return matchCat && matchSearch;
    });

    if (!shelfRow1 || !shelfRow2) return;

    shelfRow1.innerHTML = '';
    shelfRow2.innerHTML = '';

    if (filtered.length === 0) {
      shelfRow1.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--ink-muted);">
          No academic volumes found matching "${searchQuery}". Try another keyword or filter.
        </div>`;
      return;
    }

    const mid = Math.ceil(filtered.length / 2);
    const row1Items = filtered.slice(0, mid);
    const row2Items = filtered.slice(mid);

    const createBookHtml = (b) => `
      <div class="shelf-book" data-id="${b.id}" tabindex="0" role="button" aria-label="${b.title} by ${b.author}">
        <div class="shelf-book-card ${b.themeClass}">
          <div>
            <div class="shelf-book-genre">${b.category}</div>
            <h4 class="shelf-book-title">${b.title}</h4>
          </div>
          <div>
            <div class="shelf-book-author">${b.author}</div>
          </div>
        </div>
      </div>
    `;

    shelfRow1.innerHTML = row1Items.map(createBookHtml).join('');
    shelfRow2.innerHTML = row2Items.map(createBookHtml).join('');

    // Attach click listeners
    document.querySelectorAll('.shelf-book').forEach((el) => {
      el.addEventListener('click', () => {
        const bookId = el.getAttribute('data-id');
        openBookModal(bookId, bookEngine);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const bookId = el.getAttribute('data-id');
          openBookModal(bookId, bookEngine);
        }
      });
    });
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeCategory = btn.getAttribute('data-category') || 'all';
      renderBooks();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderBooks();
    });
  }

  renderBooks();
}

// Book Modal handler
function openBookModal(bookId, bookEngine) {
  const book = libraryBooksData.find((b) => b.id === bookId);
  if (!book) return;

  const modal = document.getElementById('book-modal');
  const coverWrap = document.getElementById('modal-book-cover-wrap');
  const title = document.getElementById('modal-book-title');
  const author = document.getElementById('modal-book-author');
  const year = document.getElementById('modal-book-year');
  const genre = document.getElementById('modal-book-genre');
  const synopsis = document.getElementById('modal-book-synopsis');
  const quote = document.getElementById('modal-book-quote');
  const readInTomeBtn = document.getElementById('modal-read-in-tome-btn');

  if (coverWrap) {
    coverWrap.innerHTML = `
      <div class="shelf-book-card ${book.themeClass}" style="height: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
        <div>
          <div class="shelf-book-genre">${book.category}</div>
          <h3 class="shelf-book-title" style="font-size: 1.45rem; margin-top: 0.5rem;">${book.title}</h3>
        </div>
        <div>
          <div class="shelf-book-author">${book.author} (${book.year})</div>
        </div>
      </div>
    `;
  }

  if (title) title.textContent = book.title;
  if (author) author.textContent = book.author;
  if (year) year.textContent = book.year;
  if (genre) genre.textContent = book.category;
  if (synopsis) synopsis.textContent = book.synopsis;
  if (quote) quote.textContent = book.quote;

  if (readInTomeBtn) {
    readInTomeBtn.onclick = () => {
      closeBookModal();
      const bookSec = document.getElementById('book-section');
      if (bookSec) bookSec.scrollIntoView({ behavior: 'smooth' });
      if (bookEngine && typeof book.targetLeaf === 'number') {
        setTimeout(() => {
          bookEngine.goToLeaf(book.targetLeaf);
        }, 600);
      }
    };
  }

  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeBookModal() {
  const modal = document.getElementById('book-modal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ==========================================================================
// 6. English Literature Explorer (Eras & Authors)
// ==========================================================================
const eraData = {
  medieval: {
    period: '450 – 1500 CE',
    title: 'Old & Middle English Literature',
    img: '/images/hero-library.jpg',
    desc: 'The genesis of English expression, shifting from heroic Anglo-Saxon oral alliteration (Beowulf) to Anglo-Norman romance and Geoffrey Chaucer’s landmark Canterbury Tales in Middle English.',
    luminaries: 'Beowulf-poet, Geoffrey Chaucer, The Pearl Poet, Sir Thomas Malory (Le Morte d’Arthur).',
  },
  renaissance: {
    period: '1500 – 1660 CE',
    title: 'Renaissance & Elizabethan Drama',
    img: '/images/shakespeare.jpg',
    desc: 'The flowering of humanism, Marlowe’s mighty line, Shakespearean psychological interiority, and the emergence of Jacobean tragedy and metaphysical poetry.',
    luminaries: 'William Shakespeare, Christopher Marlowe, Edmund Spenser, John Donne, Ben Jonson.',
  },
  neoclassical: {
    period: '1660 – 1798 CE',
    title: 'The Neoclassical & Enlightenment Era',
    img: '/images/victorian.jpg',
    desc: 'Marked by the Restoration of the Monarchy, the Enlightenment’s faith in human reason, heroic couplets, political satire, and the birth of the English novel.',
    luminaries: 'John Milton, Alexander Pope, Jonathan Swift, Daniel Defoe, Dr. Samuel Johnson.',
  },
  romantic: {
    period: '1798 – 1837 CE',
    title: 'The Romantic Poetry Revolution',
    img: '/images/romanticism.jpg',
    desc: 'A transcendent revolt against industrial mechanization and rationalism, elevating the sublime power of the natural world, subjective passion, and imagination.',
    luminaries: 'William Wordsworth, Samuel Taylor Coleridge, John Keats, Percy Bysshe Shelley, Lord Byron.',
  },
  victorian: {
    period: '1837 – 1901 CE',
    title: 'The Victorian Social Novel',
    img: '/images/victorian.jpg',
    desc: 'The pinnacle of serialized print culture, examining industrial inequality, domestic morality, imperial expansion, and existential religious re-evaluation.',
    luminaries: 'Charles Dickens, Jane Eyre (Charlotte Brontë), George Eliot, Thomas Hardy, Alfred Lord Tennyson.',
  },
  modern: {
    period: '1901 – Present',
    title: 'Modernism & Contemporary Letters',
    img: '/images/hero-library.jpg',
    desc: 'Radical formal disruption following the World Wars. Stream of consciousness, fragmented narrative, post-colonial voices, and contemporary world literatures in English.',
    luminaries: 'Virginia Woolf, James Joyce, T.S. Eliot, George Orwell, Salman Rushdie, Zadie Smith.',
  },
};

const authorCardsData = [
  {
    name: 'William Shakespeare',
    dates: '1564 – 1616',
    era: 'Renaissance',
    quote: '“All the world’s a stage, and all the men and women merely players.”',
    works: ['Hamlet', 'Macbeth', 'King Lear', 'Sonnets'],
  },
  {
    name: 'William Wordsworth',
    dates: '1770 – 1850',
    era: 'Romanticism',
    quote: '“Poetry is the spontaneous overflow of powerful feelings.”',
    works: ['The Prelude', 'Lyrical Ballads', 'Tintern Abbey'],
  },
  {
    name: 'Jane Austen',
    dates: '1775 – 1817',
    era: 'Regency',
    quote: '“There is no charm equal to tenderness of heart.”',
    works: ['Pride and Prejudice', 'Emma', 'Persuasion'],
  },
  {
    name: 'Charles Dickens',
    dates: '1812 – 1870',
    era: 'Victorian',
    quote: '“It was the best of times, it was the worst of times...”',
    works: ['Bleak House', 'Great Expectations', 'Oliver Twist'],
  },
  {
    name: 'Virginia Woolf',
    dates: '1882 – 1941',
    era: 'Modernism',
    quote: '“A woman must have money and a room of her own if she is to write fiction.”',
    works: ['Mrs Dalloway', 'To the Lighthouse', 'Orlando'],
  },
  {
    name: 'Oscar Wilde',
    dates: '1854 – 1900',
    era: 'Aestheticism',
    quote: '“We are all in the gutter, but some of us are looking at the stars.”',
    works: ['The Picture of Dorian Gray', 'The Importance of Being Earnest'],
  },
];

function initExplorer() {
  const eraBtns = document.querySelectorAll('.era-node-btn');
  const imgEl = document.getElementById('era-spotlight-img');
  const periodEl = document.getElementById('era-spotlight-period');
  const titleEl = document.getElementById('era-spotlight-title');
  const descEl = document.getElementById('era-spotlight-desc');
  const luminariesEl = document.getElementById('era-spotlight-luminaries');
  const authorsContainer = document.getElementById('authors-grid-container');

  eraBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      eraBtns.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const eraKey = btn.getAttribute('data-era');
      const data = eraData[eraKey];
      if (data) {
        if (imgEl) imgEl.src = data.img;
        if (periodEl) periodEl.textContent = data.period;
        if (titleEl) titleEl.textContent = data.title;
        if (descEl) descEl.textContent = data.desc;
        if (luminariesEl) luminariesEl.innerHTML = data.luminaries;
      }
    });
  });

  if (authorsContainer) {
    authorsContainer.innerHTML = authorCardsData
      .map(
        (a) => `
        <div class="author-card">
          <div>
            <div class="author-meta-header">
              <span class="author-era-tag">${a.era}</span>
              <span class="author-dates">${a.dates}</span>
            </div>
            <h4 class="author-name">${a.name}</h4>
            <div class="author-quote-box">${a.quote}</div>
          </div>
          <div>
            <div class="author-works-list">
              ${a.works.map((w) => `<span class="work-badge">${w}</span>`).join('')}
            </div>
          </div>
        </div>
      `
      )
      .join('');
  }
}

// ==========================================================================
// 7. Poetry Studio & Creative Writing Lab
// ==========================================================================
const poetryPresentationData = [
  {
    title: 'Sonnet 18',
    author: 'William Shakespeare (1609)',
    lines: [
      { text: 'Shall I compare thee to a summer’s day?', analysis: 'Opening interrogative opening in iambic pentameter with trochaic inversion on the opening foot.' },
      { text: 'Thou art more lovely and more temperate:', analysis: 'Direct response establishing the beloved’s constancy over the tempestuous seasons.' },
      { text: 'Rough winds do shake the darling buds of May,', analysis: 'Alliteration of “d” sounds; personification of summer foliage as vulnerable infants.' },
      { text: 'And summer’s lease hath all too short a date;', analysis: 'Legalistic metaphor comparing season duration to a temporary tenant lease.' },
      { text: 'Sometime too hot the eye of heaven shines,', analysis: 'Metonymy and celestial personification of the sun as the “eye of heaven”.' },
      { text: 'And often is his gold complexion dimm’d;', analysis: 'Visual chromatic imagery contrasting brilliance with passing shadow.' },
      { text: 'And every fair from fair sometime declines,', analysis: 'Polyptoton (“fair from fair”); acknowledgment of universal mortal decay.' },
      { text: 'By chance or nature’s changing course untrimm’d;', analysis: 'Antithesis between arbitrary accident and cosmic biological order.' },
      { text: 'But thy eternal summer shall not fade,', analysis: 'The volta (thematic turn) beginning with the coordinating conjunction “But”.' },
      { text: 'Nor lose possession of that fair thou ow’st;', analysis: 'Continuation of estate ownership imagery applied to eternal spiritual beauty.' },
      { text: 'Nor shall death brag thou wander’st in his shade,', analysis: 'Personification of Death as a boastful captor thwarted by immortal verse.' },
      { text: 'When in eternal lines to time thou grow’st:', analysis: 'Self-reflexive tribute to poetic artifice as an instrument of temporal transcendence.' },
      { text: 'So long as men can breathe or eyes can see,', analysis: 'Heroic concluding rhyming couplet; universal sensory condition.' },
      { text: 'So long lives this, and this gives life to thee.', analysis: 'Climactic chiasmus and affirmation: the poem itself breathes eternal life.' },
    ],
  },
  {
    title: 'I Wandered Lonely as a Cloud',
    author: 'William Wordsworth (1807)',
    lines: [
      { text: 'I wandered lonely as a cloud', analysis: 'Celebrated Romantic simile identifying human consciousness with airy natural wandering.' },
      { text: 'That floats on high o’er vales and hills,', analysis: 'Spatial elevation providing a panoramic vista of the British landscape.' },
      { text: 'When all at once I saw a crowd,', analysis: 'Sudden sensory interruption; humanizing floral multitude.' },
      { text: 'A host, of golden daffodils;', analysis: 'Celestial metallic imagery elevating common wild flora to sacred company.' },
      { text: 'Beside the lake, beneath the trees,', analysis: 'Balanced spatial prepositions anchoring the earthly geography.' },
      { text: 'Fluttering and dancing in the breeze.', analysis: 'Kinaesthetic imagery and personification attributing joyous choreography to nature.' },
    ],
  },
];

function initPoetryStudio() {
  let poemIndex = 0;
  let activeLineIndex = 0;

  const titleEl = document.getElementById('active-poem-title');
  const authorEl = document.getElementById('active-poem-author');
  const linesBox = document.getElementById('poem-lines-box');
  const calloutEl = document.getElementById('poem-analysis-callout');
  const prevBtn = document.getElementById('poem-prev-line-btn');
  const nextBtn = document.getElementById('poem-next-line-btn');
  const switchBtn = document.getElementById('poem-switch-btn');

  function renderPoem() {
    const cur = poetryPresentationData[poemIndex];
    if (titleEl) titleEl.textContent = cur.title;
    if (authorEl) authorEl.textContent = cur.author;

    if (linesBox) {
      linesBox.innerHTML = cur.lines
        .map(
          (line, i) => `
          <div class="poem-line ${i === activeLineIndex ? 'active' : ''}" data-idx="${i}">
            ${line.text}
          </div>
        `
        )
        .join('');

      linesBox.querySelectorAll('.poem-line').forEach((el) => {
        el.addEventListener('click', () => {
          activeLineIndex = parseInt(el.getAttribute('data-idx') || '0', 10);
          updateActiveLine();
        });
      });
    }

    updateActiveLine();
  }

  function updateActiveLine() {
    const cur = poetryPresentationData[poemIndex];
    const lineObj = cur.lines[activeLineIndex];
    if (linesBox) {
      linesBox.querySelectorAll('.poem-line').forEach((el, i) => {
        el.classList.toggle('active', i === activeLineIndex);
      });
    }

    if (calloutEl && lineObj) {
      calloutEl.innerHTML = `
        <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-crimson); font-weight: 700; margin-bottom: 0.25rem;">
          Line ${activeLineIndex + 1} Poetic Anatomy:
        </div>
        <div>${lineObj.analysis}</div>
      `;
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const cur = poetryPresentationData[poemIndex];
      if (activeLineIndex > 0) {
        activeLineIndex--;
        updateActiveLine();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const cur = poetryPresentationData[poemIndex];
      if (activeLineIndex < cur.lines.length - 1) {
        activeLineIndex++;
        updateActiveLine();
      }
    });
  }

  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      poemIndex = (poemIndex + 1) % poetryPresentationData.length;
      activeLineIndex = 0;
      renderPoem();
    });
  }

  renderPoem();

  // Creative Prompt Generator
  const promptPrompts = [
    {
      category: 'Gothic Realism & Unreliable Narration',
      prompt: 'An archivist discovers an unsent letter tucked inside an 1840 edition of Paradise Lost, revealing that an esteemed poet’s most celebrated masterpiece was penned by his sister.',
      constraint: 'Write in first person; feature an extended metaphor comparing memory to water damaged ink.',
    },
    {
      category: 'Renaissance Soliloquy & Political Intrigue',
      prompt: 'A royal prompter at the Globe Theatre realizes that the tragedy currently being performed on stage contains coded instructions for an imminent coup d’état.',
      constraint: 'Incorporate at least three lines of unrhymed iambic pentameter and a dramatic monologue.',
    },
    {
      category: 'Victorian Social Irony & Domestic Manners',
      prompt: 'Two rival governesses at an isolated Yorkshire estate discover they have both been corresponding with the same elusive London publisher under the exact same male pseudonym.',
      constraint: 'Use free indirect discourse and employ subtle Austenian dramatic irony.',
    },
    {
      category: 'Modernist Stream of Consciousness',
      prompt: 'A clockmaker walking across London Bridge on a foggy November morning experiences thirty years of personal history between consecutive strikes of Big Ben.',
      constraint: 'Write in continuous present tense with sensory polyphony.',
    },
  ];

  let curPromptIdx = 0;
  const promptBtn = document.getElementById('generate-prompt-btn');
  const catTag = document.getElementById('prompt-category-tag');
  const textTag = document.getElementById('prompt-narrative-text');
  const constraintTag = document.getElementById('prompt-constraint-text');
  const scratchpad = document.getElementById('writing-scratchpad');
  const wordCount = document.getElementById('scratchpad-word-count');

  if (promptBtn) {
    promptBtn.addEventListener('click', () => {
      curPromptIdx = (curPromptIdx + 1) % promptPrompts.length;
      const p = promptPrompts[curPromptIdx];
      if (catTag) catTag.textContent = p.category;
      if (textTag) textTag.textContent = `“${p.prompt}”`;
      if (constraintTag) constraintTag.innerHTML = `<em>Stylistic Constraint:</em> ${p.constraint}`;
    });
  }

  // Scratchpad persistence & word count
  if (scratchpad) {
    const saved = localStorage.getItem('englishverse_scratchpad_draft');
    if (saved) scratchpad.value = saved;

    const updateWords = () => {
      const val = scratchpad.value.trim();
      const count = val === '' ? 0 : val.split(/\s+/).length;
      if (wordCount) wordCount.textContent = `${count} ${count === 1 ? 'word' : 'words'}`;
      localStorage.setItem('englishverse_scratchpad_draft', val);
    };

    scratchpad.addEventListener('input', updateWords);
    updateWords();
  }
}

// ==========================================================================
// 8. Grammar Learning Lab & Word of the Day
// ==========================================================================
const wotdList = [
  {
    word: 'Verisimilitude',
    ipa: '/ˌver.ɪ.sɪˈmɪl.ɪ.tʃuːd/',
    pos: 'Noun',
    def: 'The appearance or semblance of being true or real; the quality in literature that creates convincing believability.',
    example: '“Defoe’s minute descriptions of survival tools lend Robinson Crusoe extraordinary verisimilitude.”',
    etymology: 'Latin verisimilitudo, from verus (true) + similis (like/similar).',
    synonyms: 'Plausibility, realism, authenticity',
    antonyms: 'Improbability, falsehood',
  },
  {
    word: 'Sesquipedalian',
    ipa: '/ˌses.kwɪ.pɪˈdeɪ.li.ən/',
    pos: 'Adjective',
    def: 'Having many syllables; given to using long, obscure words in literary prose.',
    example: '“Dr. Johnson’s critics occasionally mocked his sesquipedalian vocabulary, yet admired his precision.”',
    etymology: 'Latin sesquipedalis (a foot and a half long).',
    synonyms: 'Polysyllabic, grandiloquent',
    antonyms: 'Monosyllabic, concise',
  },
  {
    word: 'Petrichor',
    ipa: '/ˈpet.rɪ.kɔːr/',
    pos: 'Noun',
    def: 'A pleasant, distinctive earthy smell that frequently accompanies the first rain after a long period of warm, dry weather.',
    example: '“Wordsworth walked through the Grasmere orchard, inhaling the damp petrichor of the awakened soil.”',
    etymology: 'Greek petra (stone) + ichor (ethereal fluid in the veins of gods).',
    synonyms: 'Earth scent, rain musk',
    antonyms: 'Aridity',
  },
  {
    word: 'Mellifluous',
    ipa: '/məˈlɪf.lu.əs/',
    pos: 'Adjective',
    def: 'Sweet or musical; pleasant to hear, flowing like honey.',
    example: '“Keats composed with a mellifluous lyricism that dissolved mortal melancholy into pure song.”',
    etymology: 'Latin mel (honey) + fluere (to flow).',
    synonyms: 'Dulcet, euphonious, lyrical',
    antonyms: 'Cacophonous, jarring',
  },
];

const grammarModulesContent = {
  speech: `
    <h3 style="font-family: var(--font-display); font-size: 1.45rem; margin-bottom: 0.5rem; color: #fff;">The Eight Fundamental Parts of Speech</h3>
    <p style="font-size: 0.95rem; color: var(--ink-secondary); margin-bottom: 1.5rem; line-height: 1.6;">
      Every word in the English language performs one of eight syntactic functions. Click any part to inspect its mechanics and literary examples.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.25rem;">
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); padding: 1.25rem; border-radius: 8px;">
        <strong style="color: var(--gold-light); display: block; margin-bottom: 0.35rem;">1. Noun</strong>
        <p style="font-size: 0.85rem; color: var(--ink-secondary); margin-bottom: 0.5rem;">Names a person, place, entity, or abstract idea.</p>
        <div style="font-size: 0.8rem; font-style: italic; color: var(--ink-muted);">e.g., “Knowledge is solitary.”</div>
      </div>
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); padding: 1.25rem; border-radius: 8px;">
        <strong style="color: var(--gold-light); display: block; margin-bottom: 0.35rem;">2. Verb</strong>
        <p style="font-size: 0.85rem; color: var(--ink-secondary); margin-bottom: 0.5rem;">Expresses action, occurrence, or state of being.</p>
        <div style="font-size: 0.8rem; font-style: italic; color: var(--ink-muted);">e.g., “The bells toll for thee.”</div>
      </div>
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); padding: 1.25rem; border-radius: 8px;">
        <strong style="color: var(--gold-light); display: block; margin-bottom: 0.35rem;">3. Adjective</strong>
        <p style="font-size: 0.85rem; color: var(--ink-secondary); margin-bottom: 0.5rem;">Modifies or quantifies a noun or pronoun.</p>
        <div style="font-size: 0.8rem; font-style: italic; color: var(--ink-muted);">e.g., “A radiant and tempestuous dawn.”</div>
      </div>
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); padding: 1.25rem; border-radius: 8px;">
        <strong style="color: var(--gold-light); display: block; margin-bottom: 0.35rem;">4. Adverb</strong>
        <p style="font-size: 0.85rem; color: var(--ink-secondary); margin-bottom: 0.5rem;">Modifies a verb, adjective, or another adverb.</p>
        <div style="font-size: 0.8rem; font-style: italic; color: var(--ink-muted);">e.g., “She read deeply and discerningly.”</div>
      </div>
    </div>
  `,
  tenses: `
    <h3 style="font-family: var(--font-display); font-size: 1.45rem; margin-bottom: 0.5rem; color: #fff;">English Tenses Matrix</h3>
    <p style="font-size: 0.95rem; color: var(--ink-secondary); margin-bottom: 1.5rem;">Master the 12 temporal aspects across Present, Past, and Future.</p>
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; text-align: left;">
        <thead>
          <tr style="border-bottom: 2px solid var(--gold-primary); color: var(--gold-light);">
            <th style="padding: 0.75rem;">Aspect</th>
            <th style="padding: 0.75rem;">Past</th>
            <th style="padding: 0.75rem;">Present</th>
            <th style="padding: 0.75rem;">Future</th>
          </tr>
        </thead>
        <tbody style="color: var(--ink-secondary);">
          <tr style="border-bottom: 1px solid var(--border-subtle);">
            <td style="padding: 0.75rem; font-weight: 600; color: #fff;">Simple</td>
            <td style="padding: 0.75rem;">I wrote</td>
            <td style="padding: 0.75rem;">I write</td>
            <td style="padding: 0.75rem;">I will write</td>
          </tr>
          <tr style="border-bottom: 1px solid var(--border-subtle);">
            <td style="padding: 0.75rem; font-weight: 600; color: #fff;">Continuous</td>
            <td style="padding: 0.75rem;">I was writing</td>
            <td style="padding: 0.75rem;">I am writing</td>
            <td style="padding: 0.75rem;">I will be writing</td>
          </tr>
          <tr style="border-bottom: 1px solid var(--border-subtle);">
            <td style="padding: 0.75rem; font-weight: 600; color: #fff;">Perfect</td>
            <td style="padding: 0.75rem;">I had written</td>
            <td style="padding: 0.75rem;">I have written</td>
            <td style="padding: 0.75rem;">I will have written</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  voice: `
    <h3 style="font-family: var(--font-display); font-size: 1.45rem; margin-bottom: 0.5rem; color: #fff;">Active vs. Passive Voice Nuance</h3>
    <p style="font-size: 0.95rem; color: var(--ink-secondary); margin-bottom: 1.5rem; line-height: 1.6;">
      Active voice places the agent performing the action as the subject. Passive voice foregrounds the recipient or result.
    </p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
      <div style="background: rgba(28, 82, 61, 0.15); border: 1px solid #2ecc71; border-radius: 8px; padding: 1.5rem;">
        <div style="font-size: 0.75rem; text-transform: uppercase; color: #2ecc71; font-weight: 700; margin-bottom: 0.5rem;">Active Voice (Direct &amp; Energetic)</div>
        <p style="font-size: 1.1rem; color: #fff; margin-bottom: 0.5rem;">“Jane Austen revised the manuscript in Chawton.”</p>
        <span style="font-size: 0.8rem; color: var(--ink-secondary);">Subject (Austen) explicitly drives the verb (revised).</span>
      </div>
      <div style="background: rgba(29, 62, 109, 0.15); border: 1px solid #3498db; border-radius: 8px; padding: 1.5rem;">
        <div style="font-size: 0.75rem; text-transform: uppercase; color: #3498db; font-weight: 700; margin-bottom: 0.5rem;">Passive Voice (Object-Focused)</div>
        <p style="font-size: 1.1rem; color: #fff; margin-bottom: 0.5rem;">“The manuscript was revised by Jane Austen in Chawton.”</p>
        <span style="font-size: 0.8rem; color: var(--ink-secondary);">Recipient (manuscript) becomes grammatical subject.</span>
      </div>
    </div>
  `,
  'speech-direct': `
    <h3 style="font-family: var(--font-display); font-size: 1.45rem; margin-bottom: 0.5rem; color: #fff;">Direct vs. Indirect Speech Rules</h3>
    <p style="font-size: 0.95rem; color: var(--ink-secondary); margin-bottom: 1.5rem; line-height: 1.6;">
      When converting reported speech, tenses shift backward (Backshifting) and deictic markers (here/there, now/then) adjust accordingly.
    </p>
    <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1.5rem;">
      <div style="margin-bottom: 1rem;">
        <strong style="color: var(--gold-light);">• Direct Speech:</strong>
        <div style="font-family: var(--font-editorial); font-size: 1.15rem; color: #fff; margin-top: 0.2rem;">He declared, “I shall complete the sonnet tomorrow.”</div>
      </div>
      <div>
        <strong style="color: var(--gold-light);">• Indirect (Reported) Speech:</strong>
        <div style="font-family: var(--font-editorial); font-size: 1.15rem; color: #fff; margin-top: 0.2rem;">He declared that he should complete the sonnet the following day.</div>
      </div>
    </div>
  `,
  punctuation: `
    <h3 style="font-family: var(--font-display); font-size: 1.45rem; margin-bottom: 0.5rem; color: #fff;">Punctuation Mastery</h3>
    <p style="font-size: 0.95rem; color: var(--ink-secondary); margin-bottom: 1.5rem;">
      Punctuation directs the tempo and logic of thought.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); padding: 1rem; border-radius: 6px;">
        <strong style="color: var(--gold-light);">The Semicolon (;)</strong>
        <p style="font-size: 0.82rem; color: var(--ink-secondary); margin-top: 0.3rem;">Bridges two complete independent clauses with close thematic resonance.</p>
      </div>
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); padding: 1rem; border-radius: 6px;">
        <strong style="color: var(--gold-light);">The Em-Dash (—)</strong>
        <p style="font-size: 0.82rem; color: var(--ink-secondary); margin-top: 0.3rem;">Creates an abrupt rhetorical parenthesis or climactic emphasis.</p>
      </div>
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); padding: 1rem; border-radius: 6px;">
        <strong style="color: var(--gold-light);">The Oxford Comma</strong>
        <p style="font-size: 0.82rem; color: var(--ink-secondary); margin-top: 0.3rem;">Serial comma before the coordinating conjunction, eliminating ambiguity.</p>
      </div>
    </div>
  `,
};

function initGrammarLab() {
  let wotdIdx = 0;
  const wordEl = document.getElementById('wotd-word');
  const ipaEl = document.getElementById('wotd-ipa');
  const posEl = document.getElementById('wotd-pos');
  const defEl = document.getElementById('wotd-def');
  const exampleEl = document.getElementById('wotd-example');
  const etymEl = document.getElementById('wotd-etymology');
  const synEl = document.getElementById('wotd-synonyms');
  const antEl = document.getElementById('wotd-antonyms');
  const nextBtn = document.getElementById('next-wotd-btn');

  function renderWotd() {
    const item = wotdList[wotdIdx];
    if (wordEl) wordEl.textContent = item.word;
    if (ipaEl) ipaEl.textContent = item.ipa;
    if (posEl) posEl.textContent = item.pos;
    if (defEl) defEl.textContent = item.def;
    if (exampleEl) exampleEl.innerHTML = `<em>Example:</em> ${item.example}`;
    if (etymEl) etymEl.innerHTML = `<em>Etymology:</em> ${item.etymology}`;
    if (synEl) synEl.textContent = item.synonyms;
    if (antEl) antEl.textContent = item.antonyms;
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      wotdIdx = (wotdIdx + 1) % wotdList.length;
      renderWotd();
    });
  }
  renderWotd();

  // Grammar Tab Switching
  const tabs = document.querySelectorAll('.grammar-tab-btn');
  const contentDisplay = document.getElementById('grammar-content-display');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const modKey = tab.getAttribute('data-mod') || 'speech';
      if (contentDisplay && grammarModulesContent[modKey]) {
        contentDisplay.innerHTML = grammarModulesContent[modKey];
      }
    });
  });

  if (contentDisplay) {
    contentDisplay.innerHTML = grammarModulesContent['speech'];
  }
}

// ==========================================================================
// 9. Interactive English Scholarly Quiz
// ==========================================================================
const quizQuestionsPool = [
  {
    id: 1,
    category: 'literature',
    difficulty: 'easy',
    question: 'Which literary movement reacted directly against Enlightenment rationalism by exalting sublime nature and emotional intensity?',
    options: ['The Neoclassical Period', 'Romanticism', 'The Victorian Era', 'Modernism'],
    correctIndex: 1,
    explanation: 'Romanticism (c. 1798–1837), spearheaded by Wordsworth, Keats, and Shelley, rejected mechanistic Enlightenment rationalism in favor of subjective feeling and the awe-inspiring sublime in nature.',
  },
  {
    id: 2,
    category: 'literature',
    difficulty: 'medium',
    question: 'What metrical verse form did Christopher Marlowe and William Shakespeare elevate into the standard medium of Elizabethan drama?',
    options: ['Rhymed Ballad Meter', 'Blank Verse (Unrhymed Iambic Pentameter)', 'Anapestic Tetrameter', 'Trochaic Hexameter'],
    correctIndex: 1,
    explanation: 'Blank verse (unrhymed iambic pentameter) provided the rhythmic flexibility and majestic cadence needed for psychological drama and soliloquy.',
  },
  {
    id: 3,
    category: 'grammar',
    difficulty: 'medium',
    question: 'In the sentence “Having finished the dissertation, the library doors were locked,” what grammatical error is present?',
    options: ['Split Infinitive', 'Dangling Participle Modifier', 'Comma Splice', 'Faulty Parallelism'],
    correctIndex: 1,
    explanation: 'The participial phrase “Having finished the dissertation” modifies “the library doors,” illogically implying the doors completed the academic work.',
  },
  {
    id: 4,
    category: 'poetry',
    difficulty: 'easy',
    question: 'What is the technical term for the thematic turning point or shift in emotion within a 14-line sonnet?',
    options: ['Volta', 'Caesura', 'Enjambment', 'Refrain'],
    correctIndex: 0,
    explanation: 'The “volta” (Italian for “turn”) signifies the crucial rhetorical or psychological pivot between the problem set forth and its resolution.',
  },
  {
    id: 5,
    category: 'vocabulary',
    difficulty: 'hard',
    question: 'The word “verisimilitude” most closely designates which literary virtue?',
    options: ['Poetic brevity', 'The appearance or illusion of truth and reality', 'Satirical mockery', 'Tragic catharsis'],
    correctIndex: 1,
    explanation: 'Derived from Latin verus (true) and similis (like), verisimilitude is the quality of realism that encourages the reader’s willing suspension of disbelief.',
  },
  {
    id: 6,
    category: 'literature',
    difficulty: 'hard',
    question: 'Which of the following Victorian novels famously employs multiple nested narrators, including Mr. Lockwood and Nelly Dean?',
    options: ['Middlemarch', 'Wuthering Heights', 'Bleak House', 'Vanity Fair'],
    correctIndex: 1,
    explanation: 'Emily Brontë’s Wuthering Heights (1847) features a complex nested frame narrative structure primarily recounted by Mr. Lockwood and the housekeeper Nelly Dean.',
  },
  {
    id: 7,
    category: 'grammar',
    difficulty: 'easy',
    question: 'Which part of speech serves to connect words, phrases, or clauses, such as “and”, “but”, “or”, and “although”?',
    options: ['Preposition', 'Conjunction', 'Interjection', 'Pronoun'],
    correctIndex: 1,
    explanation: 'Conjunctions join grammatical elements together, categorized as coordinating, subordinating, or correlative.',
  },
  {
    id: 8,
    category: 'poetry',
    difficulty: 'medium',
    question: 'What poetic device is exemplified in Coleridge’s line: “As idle as a painted ship / Upon a painted ocean”?',
    options: ['Metaphor', 'Simile', 'Onomatopoeia', 'Synecdoche'],
    correctIndex: 1,
    explanation: 'A simile uses “as” or “like” to compare the stranded vessel to a static artwork.',
  },
];

class ScholarlyQuiz {
  constructor() {
    this.questions = [...quizQuestionsPool];
    this.currentIndex = 0;
    this.score = 0;
    this.selectedOption = null;

    this.catFilter = document.getElementById('quiz-cat-filter');
    this.diffFilter = document.getElementById('quiz-diff-filter');
    this.qNumEl = document.getElementById('quiz-current-q-num');
    this.totalQNumEl = document.getElementById('quiz-total-q-num');
    this.highScoreEl = document.getElementById('quiz-highscore-val');
    this.progressFill = document.getElementById('quiz-progress-fill');
    this.categoryTag = document.getElementById('quiz-q-category');
    this.diffTag = document.getElementById('quiz-q-difficulty');
    this.questionTitle = document.getElementById('quiz-question-title');
    this.optionsContainer = document.getElementById('quiz-options-container');
    this.explanationBox = document.getElementById('quiz-explanation-box');
    this.explanationText = document.getElementById('quiz-explanation-text');
    this.submitBtn = document.getElementById('quiz-submit-btn');
    this.nextBtn = document.getElementById('quiz-next-btn');

    this.resultsCard = document.getElementById('quiz-results-card');
    this.questionContainer = document.getElementById('quiz-question-container');
    this.restartBtn = document.getElementById('quiz-restart-btn');

    this.init();
  }

  init() {
    const savedHighScore = localStorage.getItem('englishverse_quiz_highscore') || '0';
    if (this.highScoreEl) this.highScoreEl.textContent = `${savedHighScore}%`;

    if (this.catFilter) this.catFilter.addEventListener('change', () => this.filterAndReset());
    if (this.diffFilter) this.diffFilter.addEventListener('change', () => this.filterAndReset());

    if (this.submitBtn) this.submitBtn.addEventListener('click', () => this.submitAnswer());
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.nextQuestion());
    if (this.restartBtn) this.restartBtn.addEventListener('click', () => this.resetQuiz());

    this.renderQuestion();
  }

  filterAndReset() {
    const cat = this.catFilter ? this.catFilter.value : 'all';
    const diff = this.diffFilter ? this.diffFilter.value : 'all';

    this.questions = quizQuestionsPool.filter((q) => {
      const matchCat = cat === 'all' || q.category === cat;
      const matchDiff = diff === 'all' || q.difficulty === diff;
      return matchCat && matchDiff;
    });

    if (this.questions.length === 0) {
      this.questions = [...quizQuestionsPool];
    }

    this.resetQuiz();
  }

  resetQuiz() {
    this.currentIndex = 0;
    this.score = 0;
    this.selectedOption = null;

    if (this.resultsCard) this.resultsCard.classList.remove('show');
    if (this.questionContainer) this.questionContainer.style.display = 'block';

    this.renderQuestion();
  }

  renderQuestion() {
    if (this.currentIndex >= this.questions.length) {
      this.showResults();
      return;
    }

    const q = this.questions[this.currentIndex];
    this.selectedOption = null;

    if (this.qNumEl) this.qNumEl.textContent = String(this.currentIndex + 1);
    if (this.totalQNumEl) this.totalQNumEl.textContent = String(this.questions.length);

    const progressPct = ((this.currentIndex) / this.questions.length) * 100;
    if (this.progressFill) this.progressFill.style.width = `${progressPct}%`;

    if (this.categoryTag) this.categoryTag.textContent = q.category;
    if (this.diffTag) this.diffTag.textContent = q.difficulty;
    if (this.questionTitle) this.questionTitle.textContent = q.question;

    if (this.explanationBox) this.explanationBox.classList.remove('show');
    if (this.submitBtn) {
      this.submitBtn.style.display = 'inline-block';
      this.submitBtn.disabled = true;
    }
    if (this.nextBtn) this.nextBtn.style.display = 'none';

    if (this.optionsContainer) {
      this.optionsContainer.innerHTML = q.options
        .map(
          (opt, i) => `
          <button class="quiz-option-btn" data-index="${i}">
            <span>${opt}</span>
            <span class="option-check-indicator" style="opacity: 0.5;">○</span>
          </button>
        `
        )
        .join('');

      this.optionsContainer.querySelectorAll('.quiz-option-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.optionsContainer.querySelectorAll('.quiz-option-btn').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.selectedOption = parseInt(btn.getAttribute('data-index') || '0', 10);
          if (this.submitBtn) this.submitBtn.disabled = false;
        });
      });
    }
  }

  submitAnswer() {
    if (this.selectedOption === null) return;
    const q = this.questions[this.currentIndex];
    const isCorrect = this.selectedOption === q.correctIndex;

    if (isCorrect) this.score++;

    // Highlight options
    if (this.optionsContainer) {
      const btns = this.optionsContainer.querySelectorAll('.quiz-option-btn');
      btns.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === q.correctIndex) {
          btn.classList.add('correct');
        } else if (idx === this.selectedOption && !isCorrect) {
          btn.classList.add('incorrect');
        }
      });
    }

    if (this.explanationBox && this.explanationText) {
      this.explanationText.textContent = q.explanation;
      this.explanationBox.classList.add('show');
    }

    if (this.submitBtn) this.submitBtn.style.display = 'none';
    if (this.nextBtn) this.nextBtn.style.display = 'inline-block';
  }

  nextQuestion() {
    this.currentIndex++;
    this.renderQuestion();
  }

  showResults() {
    if (this.questionContainer) this.questionContainer.style.display = 'none';
    if (this.resultsCard) this.resultsCard.classList.add('show');

    const pct = Math.round((this.score / this.questions.length) * 100);
    const scoreCircle = document.getElementById('quiz-result-score-circle');
    const gradeEl = document.getElementById('quiz-result-grade');
    const badgeEl = document.getElementById('quiz-result-badge');
    const commentEl = document.getElementById('quiz-result-comment');

    if (scoreCircle) scoreCircle.textContent = `${pct}%`;

    let grade = 'Distinction with Merit';
    let badge = 'Gold Scholar';
    let comment = 'Exceptional literary mastery! You possess a scholar-level command of English language and literature.';

    if (pct < 60) {
      grade = 'Developing Scholar';
      badge = 'Apprentice Reader';
      comment = 'A promising start. Explore the 3D Tome and Digital Library shelves to enrich your literary knowledge.';
    } else if (pct < 80) {
      grade = 'Academic Merit';
      badge = 'Silver Scholar';
      comment = 'Strong foundational command. You understand major canons, syntactic structures, and poetic forms well.';
    }

    if (gradeEl) gradeEl.textContent = grade;
    if (badgeEl) badgeEl.textContent = badge;
    if (commentEl) commentEl.textContent = comment;

    // Check & save persistent high score
    const prevHigh = parseInt(localStorage.getItem('englishverse_quiz_highscore') || '0', 10);
    if (pct > prevHigh) {
      localStorage.setItem('englishverse_quiz_highscore', String(pct));
      if (this.highScoreEl) this.highScoreEl.textContent = `${pct}%`;
    }
  }
}

// ==========================================================================
// 10. Top Bar, Theme & Atmospheric Controls
// ==========================================================================
function initHeaderAndTheme() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  const soundBtn = document.getElementById('sound-toggle-btn');
  const ambientBtn = document.getElementById('ambient-toggle-btn');
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const drawer = document.getElementById('mobile-drawer');
  const scrollTopBtn = document.getElementById('scroll-top-btn');

  // Theme persistence
  const savedTheme = localStorage.getItem('englishverse_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('englishverse_theme', isLight ? 'light' : 'dark');
      showAudioToast(isLight ? 'Ivory Parchment theme applied' : 'Midnight Dark Academy theme applied', '🎨');
    });
  }

  // Sound FX toggle
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      audio.soundEffectsEnabled = !audio.soundEffectsEnabled;
      soundBtn.classList.toggle('active', audio.soundEffectsEnabled);
      if (audio.soundEffectsEnabled) {
        audio.playPageTurn();
        showAudioToast('Page-turn sound enabled', '📖');
      } else {
        showAudioToast('Page-turn sound muted', '🔇');
      }
    });
  }

  // Ambient Library toggle
  if (ambientBtn) {
    ambientBtn.addEventListener('click', () => {
      const nextState = !audio.ambientEnabled;
      audio.toggleAmbient(nextState);
      ambientBtn.classList.toggle('active', nextState);
      if (nextState) {
        showAudioToast('Library atmosphere ambient enabled', '🏛️');
      } else {
        showAudioToast('Library atmosphere muted', '🔇');
      }
    });
  }

  // Mobile menu
  if (mobileBtn && drawer) {
    mobileBtn.addEventListener('click', () => {
      drawer.classList.toggle('open');
      const isOpen = drawer.classList.contains('open');
      drawer.setAttribute('aria-hidden', (!isOpen).toString());
    });

    drawer.querySelectorAll('.mobile-link').forEach((link) => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
      });
    });
  }

  // Scroll to top button
  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Book Modal close handlers
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalDismissBtn = document.getElementById('modal-dismiss-btn');
  const modal = document.getElementById('book-modal');

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeBookModal);
  if (modalDismissBtn) modalDismissBtn.addEventListener('click', closeBookModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeBookModal();
    });
  }

  // Department Inquiry form submission handler
  window.handleInquirySubmit = (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('inq-name');
    const emailInput = document.getElementById('inq-email');
    const msgInput = document.getElementById('inq-message');

    if (nameInput && emailInput && msgInput) {
      showAudioToast(`Inquiry received from ${nameInput.value}! Office will respond within 48h.`, '✉️');
      nameInput.value = '';
      emailInput.value = '';
      msgInput.value = '';
    }
  };
}

// ==========================================================================
// Initialization on DOMContentLoaded
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const book = new InteractiveBook();
  initHeroBookTilt();
  initParticlesCanvas();
  initDigitalLibrary(book);
  initExplorer();
  initPoetryStudio();
  initGrammarLab();
  new ScholarlyQuiz();
  initHeaderAndTheme();
});
