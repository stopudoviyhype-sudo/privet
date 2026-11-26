// Pinyin -> Cyrillic (Palladius system)
const PALL = (() => {
  const INI = {b:'б',p:'п',m:'м',f:'ф',d:'д',t:'т',n:'н',l:'л',g:'г',k:'к',h:'х',
    j:'цз',q:'ц',x:'с',zh:'чж',ch:'ч',sh:'ш',r:'ж',z:'цз',c:'ц',s:'с'};
  // finals after a consonant
  const FIN = {a:'а',o:'о',e:'э',ai:'ай',ei:'эй',ao:'ао',ou:'оу',an:'ань',en:'энь',ang:'ан',eng:'эн',
    ong:'ун',er:'эр',i:'и',ia:'я',ie:'е',iao:'яо',iu:'ю',ian:'янь',in:'инь',iang:'ян',ing:'ин',
    iong:'юн',u:'у',ua:'уа',uo:'о',uai:'уай',ui:'уй',uan:'уань',un:'унь',uang:'уан',
    'ü':'юй','üe':'юэ','üan':'юань','ün':'юнь',ue:'юэ'};
  // syllables without an initial
  const ZERO = {a:'а',o:'о',e:'э',ai:'ай',ei:'эй',ao:'ао',ou:'оу',an:'ань',en:'энь',ang:'ан',eng:'эн',er:'эр',
    yi:'и',ya:'я',yo:'ё',ye:'е',yao:'яо',you:'ю',yan:'янь',yin:'инь',yang:'ян',ying:'ин',yong:'юн',
    yu:'юй',yue:'юэ',yuan:'юань',yun:'юнь',
    wu:'у',wa:'ва',wo:'во',wai:'вай',wei:'вэй',wan:'вань',wen:'вэнь',wang:'ван',weng:'вэн',
    n:'нь',ng:'н',m:'м',hm:'хм'};

  const SPECIAL = {zi:'цзы',ci:'цы',si:'сы',hui:'хуэй',
    jue:'цзюэ',que:'цюэ',xue:'сюэ',ju:'цзюй',qu:'цюй',xu:'сюй',
    juan:'цзюань',quan:'цюань',xuan:'сюань',jun:'цзюнь',qun:'цюнь',xun:'сюнь'};

  function syl(s) { // s: lowercase, toneless, ü normalised
    if (SPECIAL[s]) return SPECIAL[s];
    if (ZERO[s] !== undefined) return ZERO[s];
    let ini = s.slice(0,2);
    if (!INI[ini] || !['zh','ch','sh'].includes(ini)) ini = s[0];
    const fin = s.slice(ini.length);
    if (!INI[ini] || FIN[fin] === undefined) return null;
    return INI[ini] + FIN[fin];
  }

  // All valid syllables, for splitting joined words like "jianghu"
  const VALID = new Set();
  'a ai an ang ao e ei en eng er o ou'.split(' ').forEach(x => VALID.add(x));
  Object.keys(ZERO).forEach(x => VALID.add(x));
  Object.keys(SPECIAL).forEach(x => VALID.add(x));
  const TABLE = {
    '':'',
    b:'a o ai ei ao an en ang eng i ie iao ian in ing u',
    p:'a o ai ei ao ou an en ang eng i ie iao ian in ing u',
    m:'a o e ai ei ao ou an en ang eng i ie iao iu ian in ing u',
    f:'a o ei ou an en ang eng u',
    d:'a e ai ei ao ou an en ang eng ong i ia ie iao iu ian ing u uo ui uan un',
    t:'a e ai ao ou an ang eng ong i ie iao ian ing u uo ui uan un',
    n:'a e ai ei ao ou an en ang eng ong i ie iao iu ian in iang ing u uo uan ü üe',
    l:'a e ai ei ao ou an ang eng ong i ia ie iao iu ian in iang ing u uo uan un ü üe',
    g:'a e ai ei ao ou an en ang eng ong u ua uo uai ui uan un uang',
    k:'a e ai ei ao ou an en ang eng ong u ua uo uai ui uan un uang',
    h:'a e ai ei ao ou an en ang eng ong u ua uo uai uan un uang',
    j:'i ia ie iao iu ian in iang ing iong',
    q:'i ia ie iao iu ian in iang ing iong',
    x:'i ia ie iao iu ian in iang ing iong',
    zh:'a e i ai ei ao ou an en ang eng ong u ua uo uai ui uan un uang',
    ch:'a e i ai ao ou an en ang eng ong u ua uo uai ui uan un uang',
    sh:'a e i ai ei ao ou an en ang eng u ua uo uai ui uan un uang',
    r:'e i ao ou an en ang eng ong u ua uo ui uan un',
    z:'a e ai ei ao ou an en ang eng ong u uo ui uan un',
    c:'a e ai ao ou an en ang eng ong u uo ui uan un',
    s:'a e ai ao ou an en ang eng ong u uo ui uan un',
  };
  for (const [i, fs] of Object.entries(TABLE)) if (i) fs.split(' ').forEach(f => VALID.add(i + f));

  const TONED = {};
  [['ā','á','ǎ','à','a'],['ē','é','ě','è','e'],['ī','í','ǐ','ì','i'],['ō','ó','ǒ','ò','o'],['ū','ú','ǔ','ù','u'],
   ['ǖ','ǘ','ǚ','ǜ','ü'],['','ń','ň','ǹ','n'],['','ḿ','','','m']].forEach(r => r.slice(0,4).forEach((c,k) => { if (c) TONED[c] = [r[4], k+1]; }));

  // Split a toneless word into syllables (longest match with backtracking)
  function split(w) {
    const memo = {};
    function go(i) {
      if (i === w.length) return [];
      if (i in memo) return memo[i];
      for (let len = Math.min(6, w.length - i); len >= 1; len--) {
        const part = w.slice(i, i + len);
        if (!VALID.has(part)) continue;
        const rest = go(i + len);
        if (rest) return (memo[i] = [part, ...rest]);
      }
      return (memo[i] = null);
    }
    return go(0);
  }

  // Pinyin word -> [{s: 'jiang', t: 1..5}] or null. Accepts tone marks or numbers (ni3hao3, le0/le5).
  function analyze(orig) {
    const low = orig.normalize('NFC').toLowerCase().replace(/u:/g,'ü').replace(/v/g,'ü');
    const res = [];
    for (const seg of low.split(/['’]/)) {
      if (!seg) continue;
      let base = '', tone = [];
      for (const ch of seg) {
        if (TONED[ch]) { base += TONED[ch][0]; tone.push(TONED[ch][1]); }
        else if (/[0-5]/.test(ch)) { if (!tone.length) return null; tone[tone.length-1] = +ch || 5; }
        else { base += ch; tone.push(0); }
      }
      const parts = split(base);
      if (!parts) return null;
      let p = 0;
      for (const s of parts) {
        const t = Math.max(...tone.slice(p, p + s.length)); p += s.length;
        res.push({ s, t: t || 5 });
      }
    }
    return res.length ? res : null;
  }

  // Tone sandhi inside one word: 3+3 -> 2+3
  function sandhi3(sy) {
    for (let k = sy.length - 2; k >= 0; k--) if (sy[k].t === 3 && sy[k+1].t === 3) sy[k].t = 2;
    return sy;
  }

  // [{s,t}] -> [{c: cyrillic, t}] with Palladius joining rules; cap = capitalise first letter
  function cyr(sy, cap) {
    const out = [];
    for (const {s, t} of sy) {
      let c = syl(s);
      if (c == null) return null;
      const prev = out[out.length-1];
      if (prev && /н$/.test(prev.c) && /^[аеёиоуэюя]/.test(c)) c = 'ъ' + c; // Chang'e -> Чанъэ
      out.push({ c, t, s });
    }
    if (cap && out.length) out[0].c = out[0].c[0].toUpperCase() + out[0].c.slice(1);
    return out;
  }

  const isCap = w => /^[A-ZÀ-ÞĀĒĪŌŪǍǏǑǓǕǗǙǛ]/.test(w.normalize('NFC'));
  function word(orig) { const a = analyze(orig); return a ? cyr(a, isCap(orig)) : null; }

  // Text -> tokens: strings (kept as is) and {c, t} syllables
  function tokens(t, opts = {}) {
    const out = [];
    let last = 0;
    t.replace(/[A-Za-zÀ-ɏḀ-ỿüÜ:'’0-5]+/g, (m, idx) => {
      const core = m.replace(/^['’0-5]+/, ''), lead = m.slice(0, m.length - core.length);
      let a = core && /[a-zü]/i.test(core) ? analyze(core) : null;
      if (!a) return m;
      if (opts.sandhi !== false) sandhi3(a);
      const sy = cyr(a, isCap(core));
      if (!sy) return m;
      out.push(t.slice(last, idx) + lead);
      out.push(...sy);
      last = idx + m.length;
      return m;
    });
    out.push(t.slice(last));
    return out.filter(x => x !== '');
  }

  // Put a tone on a Cyrillic syllable. mode: 'marks' | 'nums' | 'none'
  const MARK = {1:'\u0304', 2:'\u0301', 3:'\u030C', 4:'\u0300'};
  const SUP = {1:'¹', 2:'²', 3:'³', 4:'⁴'};
  function toned(c, t, mode) {
    if (mode === 'nums') return c + (SUP[t] || '');
    if (mode !== 'marks' || !MARK[t]) return c;
    let i = c.search(/[аАяЯaA]/);
    if (i < 0) i = c.search(/[оОэЭеЕёЁoOeEöÖ]/);
    if (i < 0) i = c.search(/[уУюЮиИыЫuUiIüÜ]/);
    return i < 0 ? c : c.slice(0, i+1) + MARK[t] + c.slice(i+1);
  }
  function text(t) { return tokens(t).map(x => typeof x === 'string' ? x : x.c).join(''); }

  return { syl, word, text, tokens, analyze, sandhi3, cyr, toned, split };
})();
// Hangul -> Cyrillic (Kontsevich system, main sound rules)
const KOR = (() => {
  const L = ['к','кк','н','т','тт','р','м','п','пп','с','сс','','ч','чч','чх','кх','тх','пх','х']; // initials (word start / after voiceless)
  const LV = ['г','кк','н','д','тт','р','м','б','пп','с','сс','','дж','чч','чх','кх','тх','пх','х']; // between voiced sounds
  const V = ['а','э','я','йе','о','е','ё','е','о','ва','вэ','ве','ё','у','во','ве','ви','ю','ы','ый','и'];
  // vowel at syllable start (no consonant before): ㅔ -> э, ㅖ -> йе, ㅢ -> ый, ㅕ -> ё
  // final consonants (index 0 = none): [as final, moved before a vowel]
  const F = [null,['к','г'],['к','кк'],['к','кс'],['н','н'],['н','ндж'],['н','н'],['т','д'],['ль','р'],['к','льг'],['м','льм'],
    ['ль','льб'],['ль','льс'],['ль','льтх'],['п','льпх'],['ль','р'],['м','м'],['п','б'],['п','пс'],['т','с'],['т','сс'],['н','н'],
    ['т','дж'],['т','чх'],['к','кх'],['т','тх'],['п','пх'],['т','']];

  function word(w) {
    const sy = [];
    for (const c of w) { const n = c.codePointAt(0) - 0xAC00; sy.push({ l: Math.floor(n / 588), v: Math.floor(n % 588 / 28), f: n % 28 }); }
    let out = '';
    for (let k = 0; k < sy.length; k++) {
      const s = sy[k], prev = sy[k-1], next = sy[k+1];
      // initial
      let ini;
      if (k === 0) ini = s.l === 5 ? 'р' : L[s.l];
      else if (s.l === 11) ini = ''; // silent ㅇ; the previous final moves here (liaison)
      else if (prev.f === 0) ini = LV[s.l];                                   // after a vowel: voiced
      else if ([4,8,16,21].includes(prev.f)) ini = s.l === 5 ? (prev.f === 8 ? 'л' : 'н') : LV[s.l]; // after н/ль/м/н(ㅇ)
      else ini = L[s.l];                                                      // after voiceless final
      if (k > 0 && s.l === 5 && prev.f === 8) ini = 'л';                       // ㄹㄹ -> лл
      if (k > 0 && s.l === 2 && prev.f === 8) ini = 'л';                       // ㄹㄴ -> лл
      if (k > 0 && s.l === 5 && prev.f === 4) ini = 'л';                       // ㄴㄹ -> лл
      // vowel
      let vow = V[s.v];
      if (ini === '' && (k === 0 || s.l === 11) && s.v === 5) vow = 'э';
      if (ini !== '' && s.v === 7) vow = 'е';
      if (ini !== '' && s.v === 19) vow = 'и';
      out += ini + vow;
      // final
      if (s.f) {
        if (next && next.l === 11) out += F[s.f][1];                          // liaison: final moves to next syllable
        else if (next && (next.l === 2 || next.l === 6) && [1,2,24,7,19,20,22,23,25,17,26].includes(s.f))
          out += ({1:'н',2:'н',24:'н',7:'н',19:'н',20:'н',22:'н',23:'н',25:'н',17:'м',26:'м'})[s.f]; // nasalisation
        else if (next && next.l === 5 && s.f === 4) out += 'л';               // ㄴㄹ -> лл
        else if (s.f === 8 && next && next.l === 5) out += 'л';
        else if (s.f === 8 && next && next.l === 18) out += 'р';                // ㄹㅎ -> рх
        else out += F[s.f][0];
      }
    }
    return out;
  }

  function text(t) {
    return t.replace(/[가-힣]+/g, w => word(w));
  }
  const has = t => /[가-힣]/.test(t);
  return { text, word, has };
})();
// Japanese: kana -> Russian letters (Polivanov system) and Hepburn romaji; romaji -> kana; kanji via kuromoji when loaded
const JA = (() => {
  const KANA = /[぀-ヿㇰ-ㇿｦ-ﾟ]/;
  const T = {};   // katakana -> [cyrillic, hepburn]
  const add = (k, c, h) => { T[k] = [c, h]; };
  const rows = [
    ['アイウエオ', ['а','и','у','э','о'], ['a','i','u','e','o']],
    ['カキクケコ', ['ка','ки','ку','кэ','ко'], ['ka','ki','ku','ke','ko']],
    ['サシスセソ', ['са','си','су','сэ','со'], ['sa','shi','su','se','so']],
    ['タチツテト', ['та','ти','цу','тэ','то'], ['ta','chi','tsu','te','to']],
    ['ナニヌネノ', ['на','ни','ну','нэ','но'], ['na','ni','nu','ne','no']],
    ['ハヒフヘホ', ['ха','хи','фу','хэ','хо'], ['ha','hi','fu','he','ho']],
    ['マミムメモ', ['ма','ми','му','мэ','мо'], ['ma','mi','mu','me','mo']],
    ['ヤユヨ', ['я','ю','ё'], ['ya','yu','yo']],
    ['ラリルレロ', ['ра','ри','ру','рэ','ро'], ['ra','ri','ru','re','ro']],
    ['ワヰヱヲ', ['ва','и','э','о'], ['wa','i','e','o']],
    ['ガギグゲゴ', ['га','ги','гу','гэ','го'], ['ga','gi','gu','ge','go']],
    ['ザジズゼゾ', ['дза','дзи','дзу','дзэ','дзо'], ['za','ji','zu','ze','zo']],
    ['ダヂヅデド', ['да','дзи','дзу','дэ','до'], ['da','ji','zu','de','do']],
    ['バビブベボ', ['ба','би','бу','бэ','бо'], ['ba','bi','bu','be','bo']],
    ['パピプペポ', ['па','пи','пу','пэ','по'], ['pa','pi','pu','pe','po']],
  ];
  for (const [ks, cs, hs] of rows) [...ks].forEach((k, i) => add(k, cs[i], hs[i]));
  add('ン', 'н', 'n'); add('ヴ', 'ву', 'vu');
  const SMALLY = { 'ャ': ['я', 'a'], 'ュ': ['ю', 'u'], 'ョ': ['ё', 'o'] };
  const SMALLV = { 'ァ': ['а', 'a'], 'ィ': ['и', 'i'], 'ゥ': ['у', 'u'], 'ェ': ['э', 'e'], 'ォ': ['о', 'o'] };
  const MACRON = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' };
  const CV = 'аиуэояюё';
  const toKata = s => s.replace(/[ぁ-ゖゝゞ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));

  // Katakana word -> { c: Russian letters, h: Hepburn }
  function kana(word) {
    const s = toKata(word);
    const syl = [];            // [cyr, hep]
    let gem = false, bnd = false;
    for (const ch of s) {
      if (ch === '|') { bnd = true; continue; }
      if (ch === 'ッ') { gem = true; continue; }
      if (ch === 'ー') { const p = syl[syl.length - 1]; if (p) { p[0] += ':'; p[1] = p[1].replace(/[aiueo]$/, v => MACRON[v]); } continue; }
      if (SMALLY[ch] && syl.length) {
        const p = syl[syl.length - 1];
        p[0] = p[0].replace(/и$/, '') + SMALLY[ch][0];
        const b = p[1].replace(/i$/, '');
        p[1] = /(sh|ch|j)$/.test(b) ? b + SMALLY[ch][1] : b + 'y' + SMALLY[ch][1];
        continue;
      }
      if (SMALLV[ch] && syl.length) {
        const p = syl[syl.length - 1];
        p[0] = (p[0].length > 1 ? p[0].replace(/[аиуэо]$/, '') : p[0]) + SMALLV[ch][0];
        p[1] = (p[1].length > 1 ? p[1].replace(/[aiueo]$/, '') : p[1]) + SMALLV[ch][1];
        continue;
      }
      const t = T[ch];
      if (!t) { syl.push([ch, ch]); gem = false; continue; }
      let [c, h] = t;
      if (gem) { c = c[0] + c; h = (h.startsWith('ch') ? 't' : h[0]) + h; gem = false; }
      syl.push([c, h, bnd]); bnd = false;
    }
    let c = '', h = '';
    syl.forEach(([sc, sh, b], i) => {
      // イ after a vowel is "й" (Polivanov); ン before a vowel gets a hard sign / apostrophe
      if (sc === 'и' && !b && /[аоуэ]$/.test(c)) sc = 'й';
      if (/н$/.test(c) && syl[i - 1] && syl[i - 1][0] === 'н' && CV.includes(sc[0])) c += 'ъ';
      if (/n$/.test(h) && syl[i - 1] && syl[i - 1][1] === 'n' && /^[aiueoy]/.test(sh)) h += "'";
      c += sc; h += sh;
    });
    return { c, h };
  }

  // ---------- romaji -> katakana ----------
  const R2K = {};
  for (const k in T) if (T[k][1].length && !'ヰヱヲヂヅ'.includes(k)) R2K[T[k][1]] = k;
  Object.assign(R2K, { si:'シ', ti:'チ', tu:'ツ', hu:'フ', zi:'ジ', di:'ヂ', du:'ヅ', wo:'ヲ', wa:'ワ', n:'ン',
    fa:'ファ', fi:'フィ', fe:'フェ', fo:'フォ', va:'ヴァ', vi:'ヴィ', ve:'ヴェ', vo:'ヴォ', ti_:'ティ', she:'シェ', che:'チェ', je:'ジェ', ye:'イェ', wi:'ウィ', we:'ウェ' });
  for (const [c, i] of [['k','キ'],['g','ギ'],['n','ニ'],['h','ヒ'],['m','ミ'],['r','リ'],['b','ビ'],['p','ピ']])
    for (const [v, s] of [['a','ャ'],['u','ュ'],['o','ョ']]) R2K[c + 'y' + v] = i + s;
  for (const [c, i] of [['sh','シ'],['ch','チ'],['j','ジ']]) for (const [v, s] of [['a','ャ'],['u','ュ'],['o','ョ']]) R2K[c + v] = i + s;
  for (const [c, i] of [['sy','シ'],['ty','チ'],['zy','ジ'],['jy','ジ']]) for (const [v, s] of [['a','ャ'],['u','ュ'],['o','ョ']]) R2K[c + v] = i + s;
  const LONG = { 'ā':'a', 'ī':'i', 'ū':'u', 'ē':'e', 'ō':'o', 'â':'a', 'î':'i', 'û':'u', 'ê':'e', 'ô':'o' };
  function romajiToKana(w) {
    w = w.toLowerCase().replace(/[āīūēōâîûêô]/g, c => LONG[c] + '-');
    let out = '', i = 0;
    while (i < w.length) {
      const ch = w[i];
      if (ch === '-') { out += 'ー'; i++; continue; }
      if (ch === "'" || ch === '’') { i++; continue; }
      if (ch === 'n' && (i + 1 >= w.length || !/[aiueoy]/.test(w[i + 1]))) { out += 'ン'; i++; continue; }
      if (/[bcdfghjkmprstvwz]/.test(ch) && w[i + 1] === ch) { out += 'ッ'; i++; continue; }
      if (ch === 't' && w.slice(i + 1, i + 3) === 'ch') { out += 'ッ'; i++; continue; }
      let hit = null;
      for (let len = 3; len >= 1; len--) { const p = w.slice(i, i + len); if (R2K[p]) { hit = p; break; } }
      if (!hit) return null;
      out += R2K[hit]; i += hit.length;
    }
    return out;
  }
  function romaji(w) { const k = romajiToKana(w); return k ? kana(k).c : null; }

  // ---------- whole line ----------
  // tok: kuromoji tokenizer or null. Returns { c, h, kana, missing } (missing = kanji left unread)
  function line(l, tok) {
    const parts = [];   // { c, h, k } or string
    let missing = false;
    if (tok) {
      for (const t of tok.tokenize(l)) {
        const sf = t.surface_form;
        const pr = t.pronunciation && t.pronunciation !== '*' ? t.pronunciation : (KANA.test(sf) && !/[一-鿿]/.test(sf) ? sf : null);
        if (pr && t.pos !== '記号') {
          // auxiliaries and suffixes stay glued to the word before them (楽しかった -> таносикатта)
          const glue = t.pos === '助動詞' || t.pos_detail_1 === '接尾' || (t.pos_detail_1 === '接続助詞' && /^[てで]$/.test(sf)) || (t.pos_detail_1 === '非自立' && t.pos === '動詞');
          const prev = parts[parts.length - 1];
          if (glue && prev && typeof prev !== 'string') prev.k += '|' + toKata(pr);
          else parts.push({ k: toKata(pr) });
        }
        else { if (/[一-鿿]/.test(sf)) missing = true; parts.push(sf); }
      }
      for (const p of parts) if (typeof p !== 'string') { Object.assign(p, kana(p.k)); p.k = p.k.replace(/\|/g, ''); }
    } else {
      // no dictionary: read kana runs, keep kanji as they are
      l.split(/([぀-ヿ]+)/).forEach(seg => {
        if (!seg) return;
        if (KANA.test(seg)) { const r = kana(seg); parts.push({ c: r.c, h: r.h, k: toKata(seg) }); }
        else { if (/[一-鿿]/.test(seg)) missing = true; parts.push(seg); }
      });
    }
    // join: words separated by spaces, punctuation glued
    const PUNCT = { '、':', ', '。':'. ', '！':'! ', '？':'? ', '「':'«', '」':'»', '『':'«', '』':'»', '（':' (', '）':') ', '・':' ', '　':' ', '〜':'~', '～':'~' };
    let c = '', h = '', k = '';
    for (const p of parts) {
      if (typeof p === 'string') {
        const s = p.replace(/[、。！？「」『』（）・　〜～]/g, m => PUNCT[m]);
        const gap = /[\u4e00-\u9fff]/.test(p) ? ' ' : '';
        c += (c && gap && !/\s$/.test(c) ? gap : '') + s; h += (h && gap && !/\s$/.test(h) ? gap : '') + s; k += p; continue;
      }
      const sp = c && !/[\s(«~]$/.test(c) ? ' ' : '';
      c += sp + p.c; h += (h && !/[\s(«~]$/.test(h) ? ' ' : '') + p.h; k += p.k;
    }
    const tidy = s => s.replace(/ {2,}/g, ' ').replace(/ ([,.!?»)])/g, '$1').trim();
    const cap = s => s.replace(/^\p{Ll}/u, x => x.toUpperCase());
    return { c: cap(tidy(c)), h: cap(tidy(h)), kana: k, missing };
  }

  return { KANA, kana, line, romaji, romajiToKana, toKata };
})();
// European languages -> Russian letters (practical transcription), plus language detection
const LAT = (() => {
  const VL = 'aeiouyäöüéèêëàâîïôûùœæåáíóú';          // Latin vowels
  const VC = 'аеёиоуыэюя';                             // Cyrillic vowels
  const V = VL + VC;
  const isV = c => !!c && V.includes(c);
  const SOFT = { a:'я', ä:'я', e:'е', u:'ю', y:'ю', o:'ё', ö:'ё', i:'и', ë:'е' };
  const BASE = { a:'а', b:'б', c:'к', d:'д', f:'ф', g:'г', h:'х', i:'и', j:'й', k:'к', l:'л', m:'м', n:'н', o:'о', p:'п',
    q:'к', r:'р', s:'с', t:'т', u:'у', v:'в', w:'в', x:'кс', y:'ю', z:'з', č:'ч', ć:'ч', š:'ш', ž:'ж', đ:'дж', ç:'с' };

  // e -> э at word start or after a vowel, е after a consonant
  const eRule = w => w.replace(/e/g, (m, i, s) => (i === 0 || isV(s[i-1]) || s[i-1] === 'й') ? 'э' : 'е');
  // j + vowel -> я/е/ю/йо…; after a consonant a soft sign goes first
  const jRule = (w, soft = SOFT) => w.replace(/j([aäeiouyöë])?/g, (m, v, i, s) => {
    if (!v) return 'й';
    const prevC = i > 0 && !isV(s[i-1]);
    const sv = { a:'я', ä:'я', e:'е', ë:'е', u:'ю', y:'ю', o:'йо', ö:'йё', i:'и' }[v];
    return (prevC ? 'ь' : '') + (prevC && v === 'o' ? 'о' : sv);
  });
  // a consonant that is soft before a vowel (lj, nj, gj, q): л + я, else ль
  const softCons = (w, re, cyr) => w.replace(re, (m, v) => v ? cyr + (SOFT[v] || v) : cyr + 'ь');
  const rest = w => w.replace(/[a-zčćšžđç]/g, c => BASE[c] ?? c);

  // ---------- Serbian ----------
  const SR_CYR = { а:'a',б:'b',в:'v',г:'g',д:'d',ђ:'đ',е:'e',ж:'ž',з:'z',и:'i',ј:'j',к:'k',л:'l',љ:'lj',м:'m',н:'n',њ:'nj',
    о:'o',п:'p',р:'r',с:'s',т:'t',ћ:'ć',у:'u',ф:'f',х:'h',ц:'c',ч:'č',џ:'dž',ш:'š' };
  function sr(w) {
    w = w.replace(/[а-шђјљњћџ]/g, c => SR_CYR[c] ?? c);
    w = w.replace(/dž/g, 'дж').replace(/đ/g, 'дж');
    w = softCons(w, /lj([aeiou])?/g, 'л');
    w = softCons(w, /nj([aeiou])?/g, 'н');
    w = jRule(w);
    w = w.replace(/c/g, 'ц').replace(/h/g, 'х');
    w = eRule(w);
    return rest(w);
  }

  // ---------- Finnish ----------
  function fi(w) {
    w = jRule(w);
    w = w.replace(/i/g, (m, i, s) => isV(s[i-1]) && s[i-1] !== 'i' && !isV(s[i+1]) ? 'й' : m);
    w = w.replace(/ä/g, (m, i, s) => (i === 0 || (isV(s[i-1]) && s[i-1] !== 'ä' && s[i-1] !== 'я')) ? 'э' : 'я');
    w = w.replace(/ö/g, (m, i) => i === 0 ? 'э' : 'ё');
    w = w.replace(/y/g, 'ю');
    w = eRule(w);
    w = w.replace(/l(?![aeiouyäöаеёиоуыэюяl])/g, 'ль');
    w = w.replace(/z/g, 'ц').replace(/h/g, 'х').replace(/c/g, 'к').replace(/q/g, 'к').replace(/w/g, 'в');
    return rest(w);
  }

  // ---------- Albanian ----------
  function sq(w) {
    w = w.replace(/xh/g, 'дж').replace(/zh/g, 'ж').replace(/sh/g, 'ш').replace(/dh/g, 'д').replace(/th/g, 'т');
    w = softCons(w, /gj([aeiouyë])?/g, 'г');
    w = softCons(w, /nj([aeiouyë])?/g, 'н');
    w = softCons(w, /q([aeiouyë])?/g, 'к');
    w = w.replace(/ll/g, 'л').replace(/ç/g, 'ч').replace(/c/g, 'ц').replace(/x/g, 'дз').replace(/h/g, 'х');
    w = jRule(w);
    w = w.replace(/ë/g, 'э').replace(/y/g, 'ю');
    w = eRule(w);
    return rest(w);
  }

  // ---------- German ----------
  function de(w) {
    w = w.replace(/tsch/g, 'ч').replace(/sch/g, 'ш').replace(/^sp/, 'шп').replace(/^st/, 'шт');
    w = w.replace(/chs/g, 'кс').replace(/^ch/, 'к').replace(/ch/g, 'х').replace(/ck/g, 'к');
    w = w.replace(/ph/g, 'ф').replace(/th/g, 'т').replace(/qu/g, 'кв').replace(/tz/g, 'ц').replace(/z/g, 'ц').replace(/ß/g, 'сс');
    w = w.replace(/(ei|ai|ey|ay)/g, 'ай').replace(/(eu|äu)/g, 'ой').replace(/ie/g, 'и');
    w = w.replace(/([aeiouäöüy])h(?![aeiouäöüy])/g, '$1');
    w = w.replace(/dt$/, 'т').replace(/d$/, 'т').replace(/b$/, 'п').replace(/g$/, 'к');
    w = w.replace(/s(?=[aeiouäöüy])/g, (m, i, s) => (i === 0 || isV(s[i-1]) || 'йлмнр'.includes(s[i-1]) || 'lmnr'.includes(s[i-1])) ? 'з' : 'с');
    w = w.replace(/x/g, 'кс').replace(/v/g, 'ф').replace(/w/g, 'в').replace(/c(?=[eiyäö])/g, 'ц').replace(/c/g, 'к');
    w = jRule(w);
    w = w.replace(/l(?![aeiouäöüyаеёиоуыэюяl])/g, 'ль');
    w = w.replace(/ä/g, (m, i, s) => (i === 0 || isV(s[i-1])) ? 'э' : 'е');
    w = w.replace(/ö/g, (m, i) => i === 0 ? 'э' : 'ё').replace(/[üy]/g, 'ю');
    w = eRule(w);
    w = w.replace(/h/g, 'х');
    return rest(w);
  }

  // ---------- French ----------
  // A silent final vowel is kept as '·' while rules run (it still blocks nasal vowels and keeps consonants voiced), then dropped.
  const FR_ENT = new Set('moment souvent vent dent lent cent sent comment parent argent content présent absent violent différent accent talent serpent torrent adolescent président évident prudent patient client orient gent innocent urgent excellent silent'.split(' '));
  const FR_ER = new Set('mer fer hier cher fier hiver amer super enfer ver'.split(' '));
  const FR_SHORT = { le:'лё', je:'жё', ne:'нё', me:'мё', te:'тё', se:'сё', de:'дё', que:'кё', ce:'сё', les:'ле', des:'де', mes:'ме', tes:'те', ses:'се', ces:'се',
    est:'э', et:'э', es:'э', aux:'о', eux:'ё', yeux:'йё', oui:'уи', monsieur:'мёсьё', femme:'фам', fils:'фис', ville:'виль', mille:'миль',
    tranquille:'транкиль', village:'виляж', un:'эн', une:'юн', plus:'плю', tous:'тус', six:'сис', dix:'дис', fait:'фэ', faire:'фэр', avec:'авэк' };
  const FR_ELI = { l:'л', j:'ж', c:'с', d:'д', qu:'к', n:'н', m:'м', s:'с', t:'т', jusqu:'жюск', lorsqu:'лорск', puisqu:'пюиск' };
  const FV = 'aeiouyéèêëàâîïôûùœ·' + VC;
  const nas = (re) => new RegExp('(' + re + ')(?![' + FV + 'nm])', 'g');
  function fr(w) {
    if (FR_SHORT[w]) return FR_SHORT[w];
    if (/aient$/.test(w)) w = w.replace(/aient$/, 'è');
    else if (/ent$/.test(w) && w.length > 4 && !FR_ENT.has(w) && (!/ment$/.test(w) || /[aeiouéèy]ment$/.test(w) && w.length < 8)) w = w.replace(/ent$/, '·');
    if (/er$/.test(w) && w.length > 3 && !FR_ER.has(w)) w = w.replace(/er$/, 'é');
    w = w.replace(/ez$/, 'é').replace(/et$/, 'è');
    w = w.replace(/es$/, '·').replace(/e$/, '·');
    for (let k = 0; k < 2; k++) w = w.replace(/(?<=.)[sxztdpg]$/, '');
    w = w.replace(/eau/g, 'о').replace(/au/g, 'о');
    w = w.replace(nas('oin'), 'уэн').replace(/oi/g, 'уа').replace(/ou/g, 'у');
    w = w.replace(/tion/g, 'сьон').replace(nas('ien'), 'ьен');
    w = w.replace(nas('ain|aim|ein|eim'), 'эн');
    w = w.replace(nas('an|am|en|em'), 'ан');
    w = w.replace(nas('in|im|yn|ym|un|um'), 'эн');
    w = w.replace(nas('on|om'), 'он');
    w = w.replace(/ouill/g, 'уй').replace(/euill?/g, 'ёй').replace(/aill?/g, 'ай').replace(/eill?/g, 'эй');
    w = w.replace(new RegExp('(?<=[' + FV + '])ill', 'g'), 'й').replace(/ill/g, 'ий');
    w = w.replace(/(ai|ei|ê|è|ë)/g, 'э').replace(/(œu|eu|œ)/g, 'ё');
    w = w.replace(/gn/g, 'нь').replace(/ch/g, 'ш').replace(/ph/g, 'ф').replace(/th/g, 'т').replace(/qu/g, 'к').replace(/gu(?=[eiéèêyэ·])/g, 'г');
    w = w.replace(/ç/g, 'с').replace(/c(?=[eiéèêyэ])/g, 'с').replace(/c/g, 'к').replace(/g(?=[eiéèêyэ])/g, 'ж').replace(/g/g, 'г').replace(/j/g, 'ж').replace(/h/g, '');
    w = w.replace(/ss/g, 'с').replace(new RegExp('(?<=[' + FV + 'й])s(?=[' + FV + '])', 'g'), 'з');
    w = w.replace(/x/g, 'кс').replace(/w/g, 'в').replace(/y(?=[aeiouéèêаеиоуэ])/g, 'й').replace(/y/g, 'и');
    w = w.replace(/ll/g, 'л').replace(/l(?![aeiouyéèêâàîôûùаеёиоуыэюя])/g, 'ль');
    w = w.replace(/[ûùu]/g, 'ю').replace(/[àâ]/g, 'а').replace(/[îï]/g, 'и').replace(/ô/g, 'о');
    w = w.replace(/é/g, (m, i, s) => (i === 0 || isV(s[i-1])) ? 'э' : 'е');
    w = eRule(w).replace(/·/g, '');
    return rest(w);
  }

  // ---------- Spanish ----------
  const ACC = s => s.replace(/[áàâ]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íìî]/g, 'i').replace(/[óòô]/g, 'o').replace(/[úùû]/g, 'u');
  // consonant + iotated vowel: "нь" + a -> ня
  const iot = (w, re, cyr) => w.replace(re, (m, v) => v ? cyr + ({ a:'я', e:'е', u:'ю', o:'ьо', i:'и' }[v] || v) : cyr + 'ь');
  function es(w) {
    w = ACC(w).replace(/ü/g, 'u');
    if (w === 'y') return 'и';
    w = w.replace(/ch/g, 'ч').replace(/qu/g, 'к').replace(/gu(?=[ei])/g, 'г').replace(/c(?=[ei])/g, 'с').replace(/z/g, 'с');
    w = w.replace(/g(?=[ei])/g, 'х').replace(/j/g, 'х').replace(/h/g, '').replace(/x/g, 'кс');
    w = iot(w, /ñ([aeiou])?/g, 'н');
    w = w.replace(/ll/g, 'y');
    w = w.replace(/y(?![aeiou])/g, 'й');
    w = w.replace(/y([aeiou])/g, (m, v) => ({ a:'я', e:'е', u:'ю', o:'йо', i:'и' }[v]));
    w = w.replace(/(?<=[^aeiouаеёиоуыэюяй])ie/g, 'ье');
    w = w.replace(/l(?![aeiouаеёиоуыэюяl])/g, 'ль');
    w = w.replace(/rr/g, 'рр').replace(/c/g, 'к').replace(/v/g, 'в');
    w = eRule(w);
    return rest(w);
  }

  // ---------- Italian ----------
  function it(w) {
    w = ACC(w);
    w = w.replace(/sch/g, 'ск').replace(/sci(?=[aou])/g, 'ш').replace(/sc(?=[ei])/g, 'ш');
    w = w.replace(/cch/g, 'кк').replace(/ch/g, 'к').replace(/cci(?=[aou])/g, 'ччь').replace(/cc(?=[ei])/g, 'чч');
    w = w.replace(/ci(?=[aoue])/g, 'ч').replace(/c(?=[ei])/g, 'ч').replace(/c/g, 'к');
    w = w.replace(/ggi(?=[aou])/g, 'ддж').replace(/gg(?=[ei])/g, 'ддж').replace(/gh/g, 'г');
    w = w.replace(/gli(?=[aeou])/g, 'ль').replace(/gli/g, 'льи');
    w = iot(w, /gn([aeiou])?/g, 'н');
    w = w.replace(/gi(?=[aou])/g, 'дж').replace(/g(?=[ei])/g, 'дж');
    w = w.replace(/ччь/g, 'чч').replace(/qu/g, 'кв').replace(/zz/g, 'цц').replace(/z/g, 'ц').replace(/h/g, '');
    w = w.replace(/(?<=[aeiouаеиоуэ])s(?=[aeiou])/g, 'з');
    w = w.replace(/ль([aeou])/g, (m, v) => 'л' + ({ a:'ья', e:'ье', o:'ьо', u:'ью' }[v]));
    w = w.replace(/l(?![aeiouаеёиоуыэюяl])/g, 'ль');
    w = w.replace(/j/g, 'й').replace(/(?<=[^aeiouаеёиоуыэюяй])ie/g, 'ье');
    w = eRule(w);
    return rest(w);
  }

  // ---------- Portuguese (pt = Portugal, br = Brazil) ----------
  function ptx(w, br) {
    w = w.replace(/ç/g, 's');
    // nasal vowels
    w = w.replace(/ão/g, br ? 'аун' : 'аун').replace(/ãe/g, 'айн').replace(/õe/g, 'ойн').replace(/ã/g, 'ан').replace(/õ/g, 'он');
    w = w.replace(/am$/, 'аун').replace(/em$/, br ? 'ейн' : 'айн').replace(/ens$/, 'ейнс');
    const accented = /[áéíóúâêô]/.test(w);
    w = ACC(w);
    w = w.replace(/lh/g, 'Λ').replace(/nh/g, 'Ν');
    w = w.replace(/ch/g, 'ш').replace(/qu(?=[ei])/g, 'к').replace(/qu/g, 'кв').replace(/gu(?=[ei])/g, 'г');
    w = w.replace(/c(?=[ei])/g, 'с').replace(/c/g, 'к').replace(/g(?=[ei])/g, 'ж').replace(/j/g, 'ж');
    w = w.replace(/h/g, '').replace(/ss/g, 'с').replace(/(?<=[aeiouаеиоуэяю])s(?=[aeiou])/g, 'з');
    w = w.replace(/^x/, 'ш').replace(/x/g, 'ш');
    w = w.replace(/rr/g, br ? 'х' : 'рр').replace(/^r/, br ? 'х' : 'р');
    // final reductions (unstressed endings)
    if (!accented || w.length > 4) {
      w = w.replace(/o$/, 'у').replace(/os$/, br ? 'ус' : 'уш');
      w = w.replace(/e$/, br ? 'и' : 'ы').replace(/es$/, br ? 'ис' : 'ыш');
    }
    const SV = { a:'я', e:'е', u:'ю', o:'о', i:'и', у:'ю', ы:'ы', и:'и' };
    w = w.replace(/([ΛΝ])([aeiouуыи])?/g, (m, c, v) => (c === 'Λ' ? 'ль' : 'нь') + (v ? SV[v] : ''));
    w = w.replace(/([aeou])i(?![aeiouаеёиоуыэюя])/g, '$1й');
    if (br) {
      w = w.replace(/l$/, 'у').replace(/l(?=[bcdfgkmnpqrstvxzбвгджзклмнпрстфхцчш])/g, 'у');
      w = w.replace(/t(?=[iи])/g, 'ч').replace(/d(?=[iи])/g, 'дж');
    } else {
      w = w.replace(/s(?=[bcdfgkpqtчшкптф]|$)/g, 'ш').replace(/l(?![aeiouаеёиоуыэюя])/g, 'ль');
    }
    w = w.replace(/(an|en|in|on|un|am|em|im|om|um)(?=[bcdfgjklpqstvxzбвгджзклпстфхцчш])/g, m => m[0] + 'н');
    w = eRule(w);
    return rest(w).replace(/ыы/g, 'ы');
  }
  const pt = w => ptx(w, false), brz = w => ptx(w, true);

  // ---------- English (dictionary) ----------
  let EN = null;
  function loadEN(txt) {
    EN = new Map();
    for (const line of txt.split('\n')) { const sp = line.indexOf(' '); if (sp > 0) EN.set(line.slice(0, sp), line.slice(sp + 1)); }
  }
  function en(w) {
    if (!EN) return null;
    let r = EN.get(w);
    if (r == null && /in'?$/.test(w)) { const b = EN.get(w.replace(/in'?$/, 'ing')); if (b) r = b.replace(/нг$/, 'н'); }
    if (r == null && /'s$/.test(w)) { const b = EN.get(w.slice(0, -2)); if (b) r = b + 'з'; }
    if (r == null && /s$/.test(w)) { const b = EN.get(w.slice(0, -1)); if (b) r = b + (/[птфкс]$/.test(b) ? 'с' : 'з'); }
    return r == null ? null : r;
  }

  const ENGINES = { sr, fi, sq, de, fr, en, es, it, pt, br: brz, ja: w => (typeof JA !== 'undefined' ? JA.romaji(w) : null) };

  // Word -> tokens: [text] or [text, {c: stressed vowel, stress: true}, text]
  function word(orig, lang) {
    const low = orig.normalize('NFC').toLowerCase().replace(/’/g, "'");
    let r;
    if (lang === 'fr' && /^(l|j|c|d|qu|n|m|s|t|jusqu|lorsqu|puisqu)'/.test(low)) {
      const [a, b] = low.split("'");
      r = FR_ELI[a] + (b ? fr(b) : '');
    } else if (lang === 'en') {
      r = en(low.replace(/^'+|'+$/g, '')) ?? en(low);
      if (r == null) return null;
    } else r = ENGINES[lang](low.replace(/'/g, ''));
    if (r == null || /[a-z]/.test(r)) r = r == null ? null : r.replace(/[a-z]/g, '');
    if (!r) return null;
    const cap = /^\p{Lu}/u.test(orig);
    const toks = [];
    const si = r.indexOf('`');
    let txt = r.replace('`', '');
    if (cap) txt = txt[0].toUpperCase() + txt.slice(1);
    if (si > 0) toks.push({ pre: txt.slice(0, si - 1), c: txt[si - 1], post: txt.slice(si), stress: true });
    else toks.push(txt);
    return toks;
  }

  // ---------- detection ----------
  const SW = {
    ja: 'wa no ga wo o ni de to mo ka yo ne desu da watashi boku ore kimi anata kokoro ai yume sora naze kitto zutto mada tte kara made dake shite iru suki koi namida sekai hikari itsumo nai kono sono ano',
    es: 'el la los las que de y en un una por para con no te mi tu yo es se me lo como más pero amor corazón quiero todo nada porque cuando bailar contigo siempre vida eres está',
    it: 'il la le lo gli di che e è un una per con non ti mi io tu sei sono come ma più amore cuore questo quando perché voglio ancora vita sempre della nel nella del dei sei così molto tutto niente mai felice stare essere',
    pt: 'o a os as que de e em um uma não você eu meu minha com para por mais mas coração amor te me se quero tudo nada quando porque vida sempre está estou pra',
    en: 'the and you i to is it my me of on your we be all that in i\'m don\'t love baby oh yeah with what this can just like know for are was but not so get got never want feel night heart',
    fr: 'le la les je tu et de des un une que pas mon ma est dans pour qui il elle nous vous moi toi ne mais plus sur au du c\'est j\'ai ton ta sans avec comme tout amour non rien bonjour merci toujours jamais coeur cœur nuit oui',
    de: 'der die das und ich du nicht ist ein eine mein mit zu auf es wir sie dich mich dir mir wie was noch nur auch wenn bin hab habe kein liebe tag guten morgen nacht danke bitte nein ja herz immer heute leben welt',
    fi: 'ja on ei minä mä sinä sä se että kun niin olen oon mun sun mut nyt vaan kaikki tää jos mitä oli ole sua mua mulle sulle oot rakkaus kiitos moi hei terve päivää yö',
    sq: 'dhe të në një që nuk unë është jam për kam ke ka zemër zemra ty mua ime im shumë do po si më pa çdo mirë faleminderit natën ditën',
    sr: 'i je da se ne u na sa ti ja mi ali što šta kao sam si bez to ljubav tebe mene moja moj sve nisam samo kad zdravo hvala noć dan srce volim ljubavi tebi',
  };
  const SWS = Object.fromEntries(Object.entries(SW).map(([k, v]) => [k, new Set(v.split(' '))]));
  const MARKS = { ja: /\b(sh|ch|ts)[aiueo]|[ōū]|\b\w+(masu|mashita|tte|nai|teru)\b|\bkya|\bryo/g, es: /[ñ¿¡]|ción\b|ll/g, it: /gli|zz|cch|[òìù]|zione\b/g, pt: /[ãõ]|ção\b|nh|lh|ç/g, sr: /[čćšžđјљњђћџ]|lj|dj/g, sq: /[ëç]|xh|\bdh|gj/g, fi: /[äö]|yy|ää|ii|uu|aa|oo/g, de: /[ßüöä]|sch|tz/g, fr: /[éèêàçœùâîô]|eau|oi/g, en: /\b(th|wh)|w|ing\b/g };
  function scores(line) {
    const low = line.toLowerCase().replace(/’/g, "'");
    const words = [...new Set(low.match(/[\p{L}']+/gu) || [])];   // repeated "na na na" counts once
    const s = {};
    for (const l of Object.keys(SW)) {
      s[l] = words.filter(w => SWS[l].has(w)).length * 1.5 + ((low.match(MARKS[l]) || []).length) * 0.7;
    }
    s.en *= 1; s.fi -= (low.match(/[ß]/g) || []).length * 2;
    return s;
  }
  function best(s) {
    const e = Object.entries(s).sort((a, b) => b[1] - a[1]);
    return { lang: e[0][0], score: e[0][1], margin: e[0][1] - (e[1] ? e[1][1] : 0) };
  }
  const isCyr = l => /[а-яё]/i.test(l);
  const isSerbCyr = l => /[јљњђћџ]/i.test(l);

  // Whole line -> tokens (strings and stress tokens)
  function line(l, lang) {
    const out = [];
    let last = 0;
    l.replace(/[\p{L}'’]+/gu, (m, idx) => {
      const core = m.replace(/^['’]+|['’]+$/g, '');
      if (!core || (lang !== 'sr' && isCyr(core))) return m;
      const t = word(core, lang);
      if (!t) return m;
      out.push(l.slice(last, idx + m.indexOf(core)));
      out.push(...t);
      last = idx + m.indexOf(core) + core.length;
      return m;
    });
    out.push(l.slice(last));
    return out.filter(x => x !== '');
  }

  return { line, word, scores, best, loadEN, hasEN: () => !!EN, isCyr, isSerbCyr, engines: ENGINES };
})();
// Russian-letter transcription -> spelling for English, German or French readers.
// Every source is first transcribed into Russian letters (close to the sound), then respelled here.
const TGT = (() => {
  const VOW = 'аеёиоуыэюяʌüöɨä';
  const T = {
    en: { C: { б:'b',в:'v',г:'g',д:'d',ж:'zh',з:'z',к:'k',л:'l',м:'m',н:'n',п:'p',р:'r',с:'s',т:'t',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',
            J:'j', R:'r', Ŋ:'ng', η:'h', W:'w' },
          V: { а:'a',э:'e',и:'i',о:'o',у:'oo',ы:'eu',ʌ:'uh',ü:'ü',ö:'ö',ɨ:'ih',ä:'ä' },
          IOT: { я:'ya',е:'ye',ё:'yo',ю:'yu' }, SOFT: { я:'ya',е:'e',ё:'yo',ю:'yu' },
          Y: 'y', DIPH: { а:'i', э:'y', о:'y', у:'y', и:'y', ы:'y', ʌ:'y' },
          PAIRS: [['ао','ow'],['ау','ow'],['оу','oh'],['уо','uo'],['уа','ua'],['уэ','ue'],['уи','ui']],
          fin: w => w.replace(/e$/, 'eh').replace(/(?<=[^aeiou])i$/, 'ee') },
    de: { C: { б:'b',в:'w',г:'g',д:'d',ж:'sch',з:'s',к:'k',л:'l',м:'m',н:'n',п:'p',р:'r',с:'s',т:'t',ф:'f',х:'ch',ц:'z',ч:'tsch',ш:'sch',щ:'schtsch',
            J:'dsch', R:'r', Ŋ:'ng', η:'h', W:'u' },
          V: { а:'a',э:'e',и:'i',о:'o',у:'u',ы:'eu',ʌ:'ö',ü:'ü',ö:'ö',ɨ:'i',ä:'ä' },
          IOT: { я:'ja',е:'je',ё:'jo',ю:'ju' }, SOFT: { я:'ja',е:'e',ё:'jo',ю:'ju' },
          Y: 'j', DIPH: { а:'i', о:'i', э:'j', у:'j', и:'j', ы:'j', ʌ:'j' },
          PAIRS: [['эй','ej']],
          fin: w => w.replace(/(?<=[aeiouöü])s(?=[aeiouöü])/g, 'ss') },
    fr: { C: { б:'b',в:'v',г:'g',д:'d',ж:'j',з:'z',к:'k',л:'l',м:'m',н:'n',п:'p',р:'r',с:'s',т:'t',ф:'f',х:'kh',ц:'ts',ч:'tch',ш:'ch',щ:'chtch',
            J:'dj', R:'r', Ŋ:'ng', η:'h', W:'ou' },
          V: { а:'a',э:'è',и:'i',о:'o',у:'ou',ы:'eu',ʌ:'eu',ü:'u',ö:'eu',ɨ:'i',ä:'è' },
          IOT: { я:'ia',е:'ié',ё:'io',ю:'iou' }, SOFT: { я:'ia',е:'é',ё:'io',ю:'iou' },
          Y: 'y', DIPH: { а:'ï', э:'ï', о:'ï', у:'ï', и:'', ы:'ï', ʌ:'ï' },
          PAIRS: [['оу','o']],
          fin: w => w.replace(/(?<=[aeiouyèéï])s(?=[aeiouyèéï])/g, 'ss').replace(/g(?=[eiéèy])/g, 'gu').replace(/è$/, 'é') },
    es: { C: { б:'b',в:'v',г:'G',д:'d',ж:'y',з:'s',к:'k',л:'l',м:'m',н:'n',п:'p',р:'r',с:'s',т:'t',ф:'f',х:'j',ц:'ts',ч:'ch',ш:'sh',щ:'shch',
            J:'y', R:'r', Ŋ:'ng', η:'j', W:'u' },
          V: { а:'a',э:'e',и:'i',о:'o',у:'u',ы:'e',ʌ:'e',ü:'iu',ö:'e',ɨ:'i',ä:'e' },
          IOT: { я:'ya',е:'ye',ё:'yo',ю:'yu' }, SOFT: { я:'ia',е:'e',ё:'io',ю:'iu' },
          Y: 'y', DIPH: { а:'i', э:'i', о:'i', у:'i', и:'', ы:'i', ʌ:'i' },
          PAIRS: [],
          fin: w => w.replace(/G(?=[eiéí])/g, 'gu').replace(/G/g, 'g') },
    it: { C: { б:'b',в:'v',г:'G',д:'d',ж:'j',з:'s',к:'K',л:'l',м:'m',н:'n',п:'p',р:'r',с:'s',т:'t',ф:'f',х:'kh',ц:'z',ч:'Č',ш:'Š',щ:'ŠČ',
            J:'Ǧ', R:'r', Ŋ:'ng', η:'h', W:'u' },
          V: { а:'a',э:'e',и:'i',о:'o',у:'u',ы:'e',ʌ:'e',ü:'iu',ö:'e',ɨ:'i',ä:'e' },
          IOT: { я:'ia',е:'ie',ё:'io',ю:'iu' }, SOFT: { я:'ia',е:'e',ё:'io',ю:'iu' },
          Y: 'i', DIPH: { а:'i', э:'i', о:'i', у:'i', и:'', ы:'i', ʌ:'i' },
          PAIRS: [],
          fin: w => w.replace(/Č(?=i?[aou])/g, 'ci').replace(/Č(?=[ei])/g, 'c').replace(/Č/g, 'ci')
            .replace(/Š(?=i?[aou])/g, 'sci').replace(/Š(?=[ei])/g, 'sc').replace(/Š/g, 'sh')
            .replace(/Ǧ(?=i?[aou])/g, 'gi').replace(/Ǧ(?=[ei])/g, 'g').replace(/Ǧ/g, 'dj')
            .replace(/K(?=[ei])/g, 'ch').replace(/K/g, 'c').replace(/G(?=[ei])/g, 'gh').replace(/G/g, 'g')
            .replace(/cii/g, 'ci').replace(/gii/g, 'gi').replace(/scii/g, 'sci') },
    pt: { C: { б:'b',в:'v',г:'G',д:'d',ж:'j',з:'z',к:'K',л:'l',м:'m',н:'n',п:'p',р:'r',с:'s',т:'t',ф:'f',х:'rr',ц:'ts',ч:'tch',ш:'ch',щ:'chtch',
            J:'dj', R:'r', Ŋ:'ng', η:'rr', W:'u' },
          V: { а:'a',э:'é',и:'i',о:'ó',у:'u',ы:'i',ʌ:'â',ü:'iu',ö:'ê',ɨ:'i',ä:'é' },
          IOT: { я:'ia',е:'ie',ё:'io',ю:'iu' }, SOFT: { я:'ia',е:'e',ё:'io',ю:'iu' },
          Y: 'i', DIPH: { а:'i', э:'i', о:'i', у:'i', и:'', ы:'i', ʌ:'i' },
          PAIRS: [],
          fin: w => w.replace(/^rr/, 'r').replace(/(?<=[aeiouéóâêí])s(?=[aeiouéóâêí])/g, 'ss')
            .replace(/G(?=[eiéê])/g, 'gu').replace(/G/g, 'g').replace(/K(?=[eiéê])/g, 'qu').replace(/K/g, 'c')
            .replace(/(?<=.)é(?=[^aeiouéóâêí]|$)/g, 'e').replace(/(?<=.)ó(?=[^aeiouéóâêí]|$)/g, 'o').replace(/e$/, 'ê').replace(/o$/, 'ô') },
  };
  T.br = T.pt;

  // ---------- Russian letters -> katakana for Japanese readers ----------
  const KJ = {   // consonant -> kana for vowels a i u e o; ".": consonant alone
    '':  ['ア','イ','ウ','エ','オ','ウ'],
    б: ['バ','ビ','ブ','ベ','ボ','ブ'], в: ['ヴァ','ヴィ','ヴ','ヴェ','ヴォ','ヴ'], г: ['ガ','ギ','グ','ゲ','ゴ','グ'],
    д: ['ダ','ディ','ドゥ','デ','ド','ド'], ж: ['ジャ','ジ','ジュ','ジェ','ジョ','ジュ'], з: ['ザ','ズィ','ズ','ゼ','ゾ','ズ'],
    к: ['カ','キ','ク','ケ','コ','ク'], л: ['ラ','リ','ル','レ','ロ','ル'], р: ['ラ','リ','ル','レ','ロ','ル'],
    м: ['マ','ミ','ム','メ','モ','ム'], н: ['ナ','ニ','ヌ','ネ','ノ','ン'], п: ['パ','ピ','プ','ペ','ポ','プ'],
    с: ['サ','スィ','ス','セ','ソ','ス'], т: ['タ','ティ','トゥ','テ','ト','ト'], ф: ['ファ','フィ','フ','フェ','フォ','フ'],
    х: ['ハ','ヒ','フ','ヘ','ホ','フ'], η: ['ハ','ヒ','フ','ヘ','ホ','フ'], ц: ['ツァ','ツィ','ツ','ツェ','ツォ','ツ'],
    ч: ['チャ','チ','チュ','チェ','チョ','チ'], ш: ['シャ','シ','シュ','シェ','ショ','シュ'], щ: ['シチャ','シチ','シチュ','シチェ','シチョ','シチ'],
    Ŋ: ['ンガ','ンギ','ング','ンゲ','ンゴ','ン'], J: ['ジャ','ジ','ジュ','ジェ','ジョ','ジ'], R: ['ラ','リ','ル','レ','ロ','ル'], W: ['ワ','ウィ','ウ','ウェ','ウォ','ウ'],
  };
  const KJ_I = { б:'ビ', в:'ヴィ', г:'ギ', д:'ヂ', з:'ジ', к:'キ', л:'リ', р:'リ', м:'ミ', н:'ニ', п:'ピ', с:'シ', т:'チ', ф:'フィ', х:'ヒ', η:'ヒ', ц:'チ' };
  const VI = { а:0, и:1, ы:1, ɨ:1, у:2, э:3, ʌ:2, о:4, ä:3, ö:3, ü:2 };
  const SOFT_V = { я:[0,'ャ'], ю:[2,'ュ'], ё:[4,'ョ'], е:[3,'ェ'] };
  function toKatakana(w) {
    let s = w.replace(/[А-ЯЁΗ]/g, c => c.toLowerCase()).replace(/дж/g, 'J').replace(/[ьъ:]/g, m => m === 'ь' ? 'ь' : m === ':' ? 'ー' : '');
    const ch = Array.from(s); let out = '';
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i], nx = ch[i + 1];
      if (c === 'ー') { out += 'ー'; continue; }
      if (c === 'ь') continue;
      if (c === 'й') { out += 'イ'; continue; }
      if (VI[c] !== undefined) { out += KJ[''][VI[c]]; continue; }
      if (SOFT_V[c]) { const [vi, sm] = SOFT_V[c]; out += c === 'е' ? 'イェ' : ['ヤ','','ユ','','ヨ'][vi]; continue; }
      if (KJ[c]) {
        if (nx === c && c !== 'н' && c !== 'м') { if (out && !/[ッン・]$/.test(out)) out += 'ッ'; continue; }
        if (nx && VI[nx] !== undefined) { out += KJ[c][VI[nx]]; i++; continue; }
        const nx2 = nx === 'ь' ? ch[i + 2] : nx;
        if (nx2 && SOFT_V[nx2]) {
          const [vi, sm] = SOFT_V[nx2];
          if (nx2 === 'е') out += KJ[c][3];
          else if ('жчшщJ'.includes(c)) out += KJ[c][vi];
          else out += (KJ_I[c] || KJ[c][1]) + sm;
          i += nx === 'ь' ? 2 : 1; continue;
        }
        out += KJ[c][5]; continue;
      }
      out += c;
    }
    return out;
  }

  // Palladius (Chinese) digraphs mean other sounds for a Western reader
  function zhPre(s) {
    return s.replace(/юй/g, 'ü').replace(/ю(?=э|ань|нь)/g, 'ü')
      .replace(/^(ш|ч|чж|ж)и$/, '$1ɨ').replace(/х/g, 'η')
      .replace(/у(?=[аэ])/g, 'W').replace(/уй$/, 'Wэй')
      .replace(/цз(?=[иеяюü])/g, 'J').replace(/цз/g, 'дз').replace(/чж/g, 'J')
      .replace(/ц(?=[иеяюü])/g, 'ч').replace(/с(?=[иеяюü])/g, 'ш').replace(/ж/g, 'R')
      .replace(/(?<=[бвгджзклмнпрстфхцчшщJRη])э$/, 'ʌ').replace(/ы$/, 'ʌ').replace(/нь$/, 'n_').replace(/н$/, 'Ŋ').replace(/n_$/, 'н');
  }

  function word(w, tg, cap) {
    const t = T[tg];
    if (cap == null) cap = /[А-ЯЁΗ]/.test(w[0]);
    let s = w.replace(/[А-ЯЁΗ]/g, c => c.toLowerCase()).replace(/дж/g, 'J');
    for (const [a, b] of t.PAIRS) s = s.split(a).join('\u0000' + b + '\u0000');
    let out = '', prev = 'start';
    const chars = s.split(/(\u0000[^\u0000]*\u0000)/).flatMap(p => p.startsWith('\u0000') ? [p] : Array.from(p));
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (c.startsWith('\u0000')) { out += c.slice(1, -1); prev = 'v'; continue; }
      if (c === 'ь' || c === 'ъ') { prev = 'sign'; continue; }
      if (c === 'й') {
        const nx = chars[i+1];
        if (prev === 'v' && !(nx && VOW.includes(nx))) out += t.DIPH[chars[i-1]] ?? t.Y;
        else out += t.Y;
        prev = 'c'; continue;
      }
      if (t.IOT[c]) { out += (prev === 'c') ? t.SOFT[c] : t.IOT[c]; prev = 'v'; continue; }
      if (t.V[c] !== undefined) { out += t.V[c]; prev = 'v'; continue; }
      if (t.C[c] !== undefined) { out += t.C[c]; prev = 'c'; continue; }
      out += c; prev = 'start';
    }
    out = t.fin(out);
    return cap ? out[0].toUpperCase() + out.slice(1) : out;
  }

  // ö / ü written as ё / ю after consonants in German, Finnish and French sources
  const ROUND = { de: ['ö', 'ü'], fi: ['ö', 'ü'], fr: ['ʌ', 'ü'] };
  // Convert a string of Russian letters; src 'zh' treats each word as one Palladius syllable
  function conv(s, tg, src) {
    if (tg === 'ru' || !s) return s;
    if (tg === 'ja') {
      if (src === 'zh') return s.replace(/[а-яёА-ЯЁ]+/g, w => toKatakana(zhPre(w.toLowerCase())));
      return s.replace(/[а-яёА-ЯЁ:]+/g, w => toKatakana(w)).replace(/ /g, '・').replace(/・(?=[,.!?)»])|(?<=[,.!?(«])・/g, ' ').replace(/・{2,}/g, '・');
    }
    const C = '[бвгджзклмнпрстфхцчшщηΗБВГДЖЗКЛМНПРСТФХЦЧШЩ]';
    if (['ko', 'fi', 'sq', 'en'].includes(src)) s = s.replace(/х/g, 'η').replace(/Х/g, 'Η');
    if (src === 'de') s = s.replace(/(^|(?<=[^а-яё]))х|х(?=[аеёиоуыэюя])/gi, m => m === 'Х' ? 'Η' : 'η');
    if (src === 'fi') s = s.replace(new RegExp('(?<=' + C + '|я|ä)я', 'gi'), 'ä').replace(new RegExp('(?<=' + C + '|я|ä)я', 'gi'), 'ä');
    if (ROUND[src]) s = s.replace(new RegExp('(?<=' + C + ')ё', 'g'), ROUND[src][0]).replace(new RegExp('(?<=' + C + ')ю', 'g'), ROUND[src][1]);
    return s.replace(/[а-яёА-ЯЁʌüöäηΗ]+/g, w => {
      if (src === 'zh') {
        return word(zhPre(w.toLowerCase()), tg, /[А-ЯЁ]/.test(w[0]));
      }
      return word(w, tg);
    });
  }
  return { conv };
})();
// ---------- Flags (inline SVG: flag emoji do not render on Windows) ----------
const FLAGS = (() => {
  const h3 = (a, b, c) => `<rect width="30" height="20" fill="${a}"/><rect y="6.67" width="30" height="6.67" fill="${b}"/><rect y="13.33" width="30" height="6.67" fill="${c}"/>`;
  const v3 = (a, b, c) => `<rect width="10" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`;
  const star = (cx, cy, r, rot = 0) => {
    let p = '';
    for (let i = 0; i < 10; i++) {
      const a = rot + Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * 0.4 : r;
      p += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2);
    }
    return `<path d="${p}Z" fill="#ffde00"/>`;
  };
  const S = {
    ru: h3('#fff', '#0039a6', '#d52b1e'),
    de: h3('#000', '#dd0000', '#ffce00'),
    rs: h3('#c6363c', '#0c4076', '#fff'),
    fr: v3('#0055a4', '#fff', '#ef4135'),
    it: v3('#009246', '#fff', '#ce2b37'),
    es: '<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/>',
    pt: '<rect width="30" height="20" fill="#da291c"/><rect width="12" height="20" fill="#046a38"/><circle cx="12" cy="10" r="4" fill="#ffe900"/><circle cx="12" cy="10" r="2.4" fill="#da291c"/><rect x="11" y="8.6" width="2" height="2.8" rx=".4" fill="#fff"/>',
    br: '<rect width="30" height="20" fill="#009c3b"/><path d="M15 2.5L27 10 15 17.5 3 10Z" fill="#ffdf00"/><circle cx="15" cy="10" r="4.4" fill="#002776"/><path d="M10.8 9.2Q15 8 19.2 10.6" stroke="#fff" stroke-width=".9" fill="none"/>',
    fi: '<rect width="30" height="20" fill="#fff"/><rect x="8" width="5" height="20" fill="#002f6c"/><rect y="7.5" width="30" height="5" fill="#002f6c"/>',
    gb: '<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.6"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/><path d="M15 0V20M0 10H30" stroke="#c8102e" stroke-width="3.4"/>',
    al: '<rect width="30" height="20" fill="#e41e20"/><path fill="#000" d="M15 4.2l1.2 1.6 2.6-1.4-.6 2 3-.4-1.6 1.8 2.6.6-2.6 1.2 1.4 1.8-2.6-.4.2 2-2.2-1.2-.6 2.6 1.2 1.6H14l1.2-1.6-.6-2.6-2.2 1.2.2-2-2.6.4 1.4-1.8-2.6-1.2 2.6-.6-1.6-1.8 3 .4-.6-2 2.6 1.4z"/>',
    cn: '<rect width="30" height="20" fill="#de2910"/>' + star(5, 5, 3) + star(10, 2, 1) + star(12, 4, 1) + star(12, 7, 1) + star(10, 9, 1),
    jp: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>',
    kr: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="4.5" fill="#0047a0"/><path d="M10.5 10a4.5 4.5 0 0 1 9 0a2.25 2.25 0 0 1-4.5 0a2.25 2.25 0 0 0-4.5 0Z" fill="#cd2e3a"/>'
      + '<g stroke="#000" stroke-width="1"><path d="M4 4.5l3-2.2M4.6 5.3l3-2.2M5.2 6.1l3-2.2"/><path d="M22.8 15.9l3-2.2M23.4 16.7l3-2.2M24 17.5l3-2.2"/><path d="M22.8 4.1l3 2.2M23.4 3.3l3 2.2M24 2.5l3 2.2"/><path d="M4 15.5l3 2.2M4.6 14.7l3 2.2M5.2 13.9l3 2.2"/></g>',
    auto: '<rect width="30" height="20" rx="3" fill="var(--soft)"/><path d="M9 15l6-10 6 10M11.4 11h7.2" stroke="var(--accent)" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    off: '<rect width="30" height="20" rx="3" fill="var(--soft)"/><path d="M10 10h10" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"/>',
  };
  const BY_LANG = { ru:'ru', en:'gb', de:'de', fr:'fr', es:'es', it:'it', pt:'pt', br:'br', fi:'fi', sq:'al', sr:'rs', zh:'cn', ko:'kr', ja:'jp', auto:'auto', off:'off' };
  return code => `<svg class="flag" viewBox="0 0 30 20" aria-hidden="true">${S[BY_LANG[code] || code] || ''}</svg>`;
})();

// ---------- Interface languages ----------
const UI_LANGS = ['ru', 'en', 'de', 'fr', 'es', 'it', 'pt', 'br', 'ja'];
const BCP = { br: 'pt-BR', pt: 'pt-PT', sq: 'sq', sr: 'sr-Latn' };
const LANG_FALLBACK = { ru:'Русский', en:'English', de:'Deutsch', fr:'Français', es:'Español', it:'Italiano', pt:'Português (Portugal)', br:'Português (Brasil)',
  fi:'Suomi', sq:'Shqip', sr:'Srpski', zh:'中文', ko:'한국어', ja:'日本語' };
// Name of language `code` written in interface language `ui`
function langName(code, ui) {
  try {
    const n = new Intl.DisplayNames([BCP[ui] || ui], { type: 'language' }).of(BCP[code] || code);
    if (n && n !== code) return n[0].toLocaleUpperCase(BCP[ui] || ui) + n.slice(1);
  } catch (e) {}
  return LANG_FALLBACK[code];
}

const I18N = {
  ru: {
    jaLoading: ' Загружаю японский словарь…', jaFailed: ' Японский словарь не загрузился: кандзи останутся как есть, кана и ромадзи работают.',
    install: 'Установить приложение', iosHint: 'На iPhone: нажми «Поделиться», затем «На экран Домой», и конвертер появится как приложение.',
    title: 'Как звучит текст песни', uiLabel: 'Язык страницы',
    lead: 'Вставь текст как на Genius: китайский (иероглифы или пиньинь), японский, корейский, английский, французский, немецкий, испанский, итальянский, португальский, финский, албанский или сербский. Получишь, как это звучит, теми буквами, которые выберешь.',
    textLabel: 'Текст', go: 'Транскрибировать', copy: 'Копировать результат', clear: 'Очистить', showSrc: 'Показывать оригинал', colors: 'Цвета тонов',
    targetLabel: 'Транскрипция для:', langLabel: 'Язык текста:', cyr: 'Русский (кириллица)', auto: 'Определять сам', off: 'Не трогать',
    styleLabel: 'Запись:', std: 'по правилам', snd: 'ближе к звучанию', toneLabel: 'Тоны и ударения:', marks: 'значки', nums: 'цифры', none: 'без тонов',
    t1: 'Высоко и ровно, как протяжное «а-а-а» у врача', t2: 'Вверх, как удивлённое «Да?»', t3: 'Низко, голос проседает, как задумчивое «ну-у»', t4: 'Резко вниз, как приказ «Стой!»', t5: 'Коротко и безударно (лэ, дэ, цзы)', light: 'лёгкий',
    empty: 'Здесь появится транскрипция.', done: n => `Готово: ${n} строк.`, nothing: 'Нечего транскрибировать: вставь текст песни.',
    langsUsed: l => ` Язык текста: ${l}.`, writtenFor: l => ` Записано для: ${l}.`, enLoading: ' Английский словарь ещё загружается…',
    enFailed: ' Английский словарь не загрузился, английские строки останутся как есть.', missingDict: ' Строки только из иероглифов не обработаны: нет связи со словарём, добавь к ним пиньинь.',
    copied: 'Скопировано.', nothingToCopy: 'Копировать пока нечего.', selected: 'Текст выделен, нажми Ctrl+C (или «Копировать» в меню).',
    guide: 'Как читать транскрипцию',
    guideOther: 'Таблицы ниже описывают запись русскими буквами. При записи для других языков буквы другие, но звуки те же, так что подсказки «звучит примерно» по-прежнему верны.',
    wrongH: 'Если язык угадан неверно', wrongP: 'Язык латинских строк определяется по каждой строке, а короткие непонятные строки берут язык всей песни. Если вышло не то, выбери язык в списке «Язык текста». Латиница, записанная на слух («czyanshan» вместо «jiāngshān»), не разберётся ни в каком режиме.',
    sec: { intro:'Вступление', verse:'Куплет', prechorus:'Предприпев', chorus:'Припев', bridge:'Бридж', interlude:'Проигрыш', outro:'Концовка', rap:'Рэп', spoken:'Речитатив', choir:'Хор' },
  },
  en: {
    jaLoading: ' Loading the Japanese dictionary…', jaFailed: ' The Japanese dictionary did not load, so kanji stay as they are; kana and romaji still work.',
    install: 'Install app', iosHint: 'On iPhone: tap Share, then Add to Home Screen, and it opens like an app.',
    title: 'How the lyrics sound', uiLabel: 'Page language',
    lead: 'Paste lyrics the way Genius shows them: Chinese (characters or pinyin), Japanese, Korean, English, French, German, Spanish, Italian, Portuguese, Finnish, Albanian or Serbian. You get how they sound, spelled the way your chosen readers would say them.',
    textLabel: 'Lyrics', go: 'Transcribe', copy: 'Copy result', clear: 'Clear', showSrc: 'Show original', colors: 'Tone colours',
    targetLabel: 'Transcribe for:', langLabel: 'Lyrics language:', cyr: 'Russian (Cyrillic)', auto: 'Detect automatically', off: 'Leave as is',
    styleLabel: 'Spelling:', std: 'standard', snd: 'closer to the sound', toneLabel: 'Tones and stress:', marks: 'marks', nums: 'numbers', none: 'no tones',
    t1: 'High and level, like a long “ahh” at the doctor', t2: 'Rising, like a surprised “Yeah?”', t3: 'Low and dipping, like a thoughtful “hmm”', t4: 'Sharp fall, like the command “Stop!”', t5: 'Short and unstressed (le, de, zi)', light: 'neutral',
    empty: 'The transcription will appear here.', done: n => `Done: ${n} lines.`, nothing: 'Nothing to transcribe yet: paste some lyrics.',
    langsUsed: l => ` Lyrics language: ${l}.`, writtenFor: l => ` Written for: ${l}.`, enLoading: ' The English dictionary is still loading…',
    enFailed: ' The English dictionary did not load, so English lines stay as they are.', missingDict: ' Lines with characters only were skipped because the dictionary did not load. Add pinyin to them.',
    copied: 'Copied.', nothingToCopy: 'Nothing to copy yet.', selected: 'The text is selected. Press Ctrl+C (or Copy in the menu).',
    guide: 'How to read the transcription',
    guideP: ['<b>Chinese tones.</b> Each syllable has a tone, shown by the mark above it. The grey, smaller syllables are neutral and unstressed. Two third tones in a row are sung as second + third, and 一 and 不 change tone before other syllables; the converter does this for you.',
      '<b>In songs</b> the melody largely replaces the tones, so rhythm and clean sounds matter more.',
      '<b>Other languages.</b> English comes from a pronunciation dictionary (125,000 words), with the stressed vowel marked. French, German, Spanish, Italian, Portuguese, Finnish, Albanian, Serbian and Korean follow spelling rules, so rare French words can come out slightly off.',
      'The detailed letter-by-letter tables are written for the Russian-letter transcription; switch the page to Russian to see them.'],
    wrongH: 'If the language is guessed wrong', wrongP: 'The language is detected line by line, and short unclear lines take the language of the whole song. If it is wrong, pick it in “Lyrics language”. Romanization written by ear (“czyanshan” instead of “jiāngshān”) cannot be read in any mode.',
    sec: { intro:'Intro', verse:'Verse', prechorus:'Pre-chorus', chorus:'Chorus', bridge:'Bridge', interlude:'Interlude', outro:'Outro', rap:'Rap', spoken:'Spoken', choir:'Choir' },
  },
  de: {
    jaLoading: ' Das japanische Wörterbuch lädt…', jaFailed: ' Das japanische Wörterbuch wurde nicht geladen; Kanji bleiben unverändert, Kana und Romaji funktionieren.',
    install: 'App installieren', iosHint: 'Auf dem iPhone: Teilen antippen, dann „Zum Home-Bildschirm“ – danach öffnet es sich wie eine App.',
    title: 'Wie der Songtext klingt', uiLabel: 'Sprache der Seite',
    lead: 'Füge den Songtext so ein, wie Genius ihn zeigt: Chinesisch (Schriftzeichen oder Pinyin), Japanisch, Koreanisch, Englisch, Französisch, Deutsch, Spanisch, Italienisch, Portugiesisch, Finnisch, Albanisch oder Serbisch. Du bekommst, wie er klingt, in der Schreibweise deiner Wahl.',
    textLabel: 'Songtext', go: 'Umschreiben', copy: 'Ergebnis kopieren', clear: 'Leeren', showSrc: 'Original anzeigen', colors: 'Tonfarben',
    targetLabel: 'Umschrift für:', langLabel: 'Sprache des Textes:', cyr: 'Russisch (kyrillisch)', auto: 'Automatisch erkennen', off: 'Nicht ändern',
    styleLabel: 'Schreibweise:', std: 'nach Regeln', snd: 'näher am Klang', toneLabel: 'Töne und Betonung:', marks: 'Zeichen', nums: 'Ziffern', none: 'ohne Töne',
    t1: 'Hoch und gleichbleibend, wie ein langes „Aaah“ beim Arzt', t2: 'Steigend, wie ein erstauntes „Ja?“', t3: 'Tief und absinkend, wie ein nachdenkliches „hmm“', t4: 'Scharf fallend, wie der Befehl „Stopp!“', t5: 'Kurz und unbetont (le, de, zi)', light: 'neutral',
    empty: 'Hier erscheint die Umschrift.', done: n => `Fertig: ${n} Zeilen.`, nothing: 'Noch nichts zu umschreiben: Füge einen Songtext ein.',
    langsUsed: l => ` Sprache des Textes: ${l}.`, writtenFor: l => ` Geschrieben für: ${l}.`, enLoading: ' Das englische Wörterbuch lädt noch…',
    enFailed: ' Das englische Wörterbuch wurde nicht geladen, englische Zeilen bleiben unverändert.', missingDict: ' Zeilen nur aus Schriftzeichen wurden übersprungen, weil das Wörterbuch nicht geladen wurde. Füge Pinyin hinzu.',
    copied: 'Kopiert.', nothingToCopy: 'Noch nichts zu kopieren.', selected: 'Der Text ist markiert. Drücke Strg+C (oder Kopieren im Menü).',
    guide: 'So liest du die Umschrift',
    guideP: ['<b>Chinesische Töne.</b> Jede Silbe hat einen Ton, das Zeichen darüber zeigt ihn. Graue, kleinere Silben sind neutral und unbetont. Zwei dritte Töne hintereinander werden als zweiter + dritter gesprochen, und 一 und 不 ändern ihren Ton vor anderen Silben; das erledigt der Konverter.',
      '<b>In Liedern</b> überdeckt die Melodie die Töne weitgehend, Rhythmus und saubere Laute sind wichtiger.',
      '<b>Andere Sprachen.</b> Englisch kommt aus einem Aussprachewörterbuch (125.000 Wörter), die betonte Silbe ist markiert. Französisch, Deutsch, Spanisch, Italienisch, Portugiesisch, Finnisch, Albanisch, Serbisch und Koreanisch folgen Schreibregeln, seltene französische Wörter können daher leicht danebenliegen.',
      'Die ausführlichen Tabellen Buchstabe für Buchstabe gibt es für die russische Umschrift; stelle die Seite auf Russisch, um sie zu sehen.'],
    wrongH: 'Falls die Sprache falsch erkannt wurde', wrongP: 'Die Sprache wird Zeile für Zeile erkannt, kurze unklare Zeilen übernehmen die Sprache des ganzen Liedes. Stimmt sie nicht, wähle sie unter „Sprache des Textes“. Nach Gehör geschriebene Umschrift („czyanshan“ statt „jiāngshān“) lässt sich in keinem Modus lesen.',
    sec: { intro:'Intro', verse:'Strophe', prechorus:'Pre-Chorus', chorus:'Refrain', bridge:'Bridge', interlude:'Zwischenspiel', outro:'Outro', rap:'Rap', spoken:'Gesprochen', choir:'Chor' },
  },
  fr: {
    jaLoading: ' Chargement du dictionnaire japonais…', jaFailed: ' Le dictionnaire japonais n’a pas pu se charger : les kanji restent tels quels, les kana et le rōmaji fonctionnent.',
    install: 'Installer l’application', iosHint: 'Sur iPhone : touche Partager, puis « Sur l’écran d’accueil », et elle s’ouvre comme une application.',
    title: 'Comment sonnent les paroles', uiLabel: 'Langue de la page',
    lead: 'Colle les paroles comme sur Genius : chinois (caractères ou pinyin), japonais, coréen, anglais, français, allemand, espagnol, italien, portugais, finnois, albanais ou serbe. Tu obtiens leur prononciation, écrite comme tu le choisis.',
    textLabel: 'Paroles', go: 'Transcrire', copy: 'Copier le résultat', clear: 'Effacer', showSrc: 'Afficher l’original', colors: 'Couleurs des tons',
    targetLabel: 'Transcrire pour :', langLabel: 'Langue des paroles :', cyr: 'Russe (cyrillique)', auto: 'Détection automatique', off: 'Ne pas toucher',
    styleLabel: 'Écriture :', std: 'selon les règles', snd: 'plus proche du son', toneLabel: 'Tons et accent :', marks: 'signes', nums: 'chiffres', none: 'sans tons',
    t1: 'Haut et plat, comme un long « aaah » chez le médecin', t2: 'Montant, comme un « Ah bon ? » étonné', t3: 'Bas et plongeant, comme un « hmm » pensif', t4: 'Chute nette, comme l’ordre « Stop ! »', t5: 'Court et atone (le, de, zi)', light: 'neutre',
    empty: 'La transcription apparaîtra ici.', done: n => `Terminé : ${n} lignes.`, nothing: 'Rien à transcrire : colle des paroles.',
    langsUsed: l => ` Langue des paroles : ${l}.`, writtenFor: l => ` Écrit pour : ${l}.`, enLoading: ' Le dictionnaire anglais se charge encore…',
    enFailed: ' Le dictionnaire anglais n’a pas pu se charger, les lignes en anglais restent telles quelles.', missingDict: ' Les lignes composées uniquement de caractères ont été ignorées, car le dictionnaire n’a pas pu se charger. Ajoute-leur le pinyin.',
    copied: 'Copié.', nothingToCopy: 'Rien à copier pour l’instant.', selected: 'Le texte est sélectionné. Appuie sur Ctrl+C (ou Copier dans le menu).',
    guide: 'Comment lire la transcription',
    guideP: ['<b>Tons du chinois.</b> Chaque syllabe a un ton, indiqué par le signe au-dessus. Les syllabes grises et plus petites sont neutres et atones. Deux troisièmes tons de suite se disent deuxième + troisième, et 一 et 不 changent de ton devant d’autres syllabes ; le convertisseur s’en charge.',
      '<b>Dans les chansons</b>, la mélodie remplace en grande partie les tons : le rythme et des sons nets comptent davantage.',
      '<b>Autres langues.</b> L’anglais vient d’un dictionnaire de prononciation (125 000 mots), avec la syllabe accentuée marquée. Le français, l’allemand, l’espagnol, l’italien, le portugais, le finnois, l’albanais, le serbe et le coréen suivent des règles d’orthographe : les mots français rares peuvent être un peu approximatifs.',
      'Les tableaux détaillés lettre par lettre existent pour la transcription en lettres russes ; passe la page en russe pour les voir.'],
    wrongH: 'Si la langue est mal devinée', wrongP: 'La langue est détectée ligne par ligne, et les lignes courtes ou ambiguës prennent la langue de la chanson. Si elle est fausse, choisis-la dans « Langue des paroles ». Une romanisation écrite à l’oreille (« czyanshan » au lieu de « jiāngshān ») ne peut être lue dans aucun mode.',
    sec: { intro:'Intro', verse:'Couplet', prechorus:'Pré-refrain', chorus:'Refrain', bridge:'Pont', interlude:'Interlude', outro:'Outro', rap:'Rap', spoken:'Parlé', choir:'Chœur' },
  },
  es: {
    jaLoading: ' Cargando el diccionario japonés…', jaFailed: ' El diccionario japonés no se cargó: los kanji quedan como están; kana y romaji funcionan.',
    install: 'Instalar la app', iosHint: 'En iPhone: toca Compartir y luego «Añadir a pantalla de inicio», y se abrirá como una app.',
    title: 'Cómo suena la letra', uiLabel: 'Idioma de la página',
    lead: 'Pega la letra como aparece en Genius: chino (caracteres o pinyin), japonés, coreano, inglés, francés, alemán, español, italiano, portugués, finés, albanés o serbio. Obtendrás cómo suena, escrita como tú elijas.',
    textLabel: 'Letra', go: 'Transcribir', copy: 'Copiar resultado', clear: 'Borrar', showSrc: 'Mostrar original', colors: 'Colores de tonos',
    targetLabel: 'Transcribir para:', langLabel: 'Idioma de la letra:', cyr: 'Ruso (cirílico)', auto: 'Detectar automáticamente', off: 'No tocar',
    styleLabel: 'Escritura:', std: 'según las reglas', snd: 'más cerca del sonido', toneLabel: 'Tonos y acento:', marks: 'signos', nums: 'números', none: 'sin tonos',
    t1: 'Alto y plano, como un largo «aaa» en el médico', t2: 'Subiendo, como un «¿Sí?» sorprendido', t3: 'Bajo y hundido, como un «mmm» pensativo', t4: 'Caída brusca, como la orden «¡Alto!»', t5: 'Corto y átono (le, de, zi)', light: 'neutro',
    empty: 'Aquí aparecerá la transcripción.', done: n => `Listo: ${n} líneas.`, nothing: 'Nada que transcribir: pega una letra.',
    langsUsed: l => ` Idioma de la letra: ${l}.`, writtenFor: l => ` Escrito para: ${l}.`, enLoading: ' El diccionario inglés todavía se está cargando…',
    enFailed: ' El diccionario inglés no se cargó; las líneas en inglés quedan como están.', missingDict: ' Las líneas solo con caracteres se omitieron porque el diccionario no se cargó. Añádeles el pinyin.',
    copied: 'Copiado.', nothingToCopy: 'Todavía no hay nada que copiar.', selected: 'El texto está seleccionado. Pulsa Ctrl+C (o Copiar en el menú).',
    guide: 'Cómo leer la transcripción',
    guideP: ['<b>Tonos del chino.</b> Cada sílaba tiene un tono, indicado por el signo encima. Las sílabas grises y más pequeñas son neutras y átonas. Dos terceros tonos seguidos se dicen como segundo + tercero, y 一 y 不 cambian de tono ante otras sílabas; el conversor lo hace por ti.',
      '<b>En las canciones</b> la melodía sustituye en gran parte a los tonos, así que importan más el ritmo y los sonidos limpios.',
      '<b>Otros idiomas.</b> El inglés sale de un diccionario de pronunciación (125 000 palabras), con la sílaba tónica marcada. Francés, alemán, español, italiano, portugués, finés, albanés, serbio y coreano siguen reglas de ortografía, así que las palabras francesas raras pueden salir algo aproximadas.',
      'Las tablas detalladas letra por letra están escritas para la transcripción en letras rusas; cambia la página a ruso para verlas.'],
    wrongH: 'Si el idioma se detecta mal', wrongP: 'El idioma se detecta línea por línea, y las líneas cortas o dudosas toman el idioma de toda la canción. Si no acierta, elígelo en «Idioma de la letra». Una romanización escrita de oído («czyanshan» en vez de «jiāngshān») no se puede leer en ningún modo.',
    sec: { intro:'Intro', verse:'Verso', prechorus:'Pre-estribillo', chorus:'Estribillo', bridge:'Puente', interlude:'Interludio', outro:'Outro', rap:'Rap', spoken:'Hablado', choir:'Coro' },
  },
  it: {
    jaLoading: ' Caricamento del dizionario giapponese…', jaFailed: ' Il dizionario giapponese non si è caricato: i kanji restano come sono, kana e rōmaji funzionano.',
    install: 'Installa l’app', iosHint: 'Su iPhone: tocca Condividi, poi «Aggiungi alla schermata Home», e si apre come un’app.',
    title: 'Come suona il testo', uiLabel: 'Lingua della pagina',
    lead: 'Incolla il testo come appare su Genius: cinese (caratteri o pinyin), giapponese, coreano, inglese, francese, tedesco, spagnolo, italiano, portoghese, finlandese, albanese o serbo. Ottieni come suona, scritto nel modo che scegli.',
    textLabel: 'Testo', go: 'Trascrivi', copy: 'Copia risultato', clear: 'Cancella', showSrc: 'Mostra originale', colors: 'Colori dei toni',
    targetLabel: 'Trascrivi per:', langLabel: 'Lingua del testo:', cyr: 'Russo (cirillico)', auto: 'Rileva automaticamente', off: 'Non toccare',
    styleLabel: 'Scrittura:', std: 'secondo le regole', snd: 'più vicina al suono', toneLabel: 'Toni e accento:', marks: 'segni', nums: 'numeri', none: 'senza toni',
    t1: 'Alto e piatto, come un lungo «aaa» dal medico', t2: 'In salita, come un «Sì?» sorpreso', t3: 'Basso e calante, come un «mmm» pensieroso', t4: 'Discesa netta, come l’ordine «Stop!»', t5: 'Breve e atono (le, de, zi)', light: 'neutro',
    empty: 'Qui comparirà la trascrizione.', done: n => `Fatto: ${n} righe.`, nothing: 'Niente da trascrivere: incolla un testo.',
    langsUsed: l => ` Lingua del testo: ${l}.`, writtenFor: l => ` Scritto per: ${l}.`, enLoading: ' Il dizionario inglese si sta ancora caricando…',
    enFailed: ' Il dizionario inglese non si è caricato, le righe in inglese restano come sono.', missingDict: ' Le righe solo con caratteri sono state saltate perché il dizionario non si è caricato. Aggiungi il pinyin.',
    copied: 'Copiato.', nothingToCopy: 'Ancora niente da copiare.', selected: 'Il testo è selezionato. Premi Ctrl+C (o Copia nel menu).',
    guide: 'Come leggere la trascrizione',
    guideP: ['<b>Toni del cinese.</b> Ogni sillaba ha un tono, indicato dal segno sopra. Le sillabe grigie e più piccole sono neutre e atone. Due terzi toni di fila si dicono secondo + terzo, e 一 e 不 cambiano tono davanti ad altre sillabe; ci pensa il convertitore.',
      '<b>Nelle canzoni</b> la melodia sostituisce in gran parte i toni, quindi contano di più il ritmo e i suoni puliti.',
      '<b>Altre lingue.</b> L’inglese viene da un dizionario di pronuncia (125.000 parole), con la sillaba accentata segnata. Francese, tedesco, spagnolo, italiano, portoghese, finlandese, albanese, serbo e coreano seguono regole di scrittura, quindi le parole francesi rare possono uscire un po’ approssimative.',
      'Le tabelle dettagliate lettera per lettera sono scritte per la trascrizione in lettere russe; passa la pagina al russo per vederle.'],
    wrongH: 'Se la lingua è riconosciuta male', wrongP: 'La lingua viene riconosciuta riga per riga, e le righe brevi o incerte prendono la lingua di tutta la canzone. Se è sbagliata, sceglila in «Lingua del testo». Una traslitterazione scritta a orecchio («czyanshan» invece di «jiāngshān») non si può leggere in nessuna modalità.',
    sec: { intro:'Intro', verse:'Strofa', prechorus:'Pre-ritornello', chorus:'Ritornello', bridge:'Ponte', interlude:'Interludio', outro:'Outro', rap:'Rap', spoken:'Parlato', choir:'Coro' },
  },
  pt: {
    jaLoading: ' A carregar o dicionário japonês…', jaFailed: ' O dicionário japonês não carregou: os kanji ficam como estão; kana e romaji funcionam.',
    install: 'Instalar a app', iosHint: 'No iPhone: toca em Partilhar e depois em «Adicionar ao ecrã principal», e abre como uma app.',
    title: 'Como soa a letra', uiLabel: 'Idioma da página',
    lead: 'Cola a letra como aparece no Genius: chinês (caracteres ou pinyin), japonês, coreano, inglês, francês, alemão, espanhol, italiano, português, finlandês, albanês ou sérvio. Obténs a forma como soa, escrita como escolheres.',
    textLabel: 'Letra', go: 'Transcrever', copy: 'Copiar resultado', clear: 'Limpar', showSrc: 'Mostrar original', colors: 'Cores dos tons',
    targetLabel: 'Transcrever para:', langLabel: 'Idioma da letra:', cyr: 'Russo (cirílico)', auto: 'Detetar automaticamente', off: 'Não mexer',
    styleLabel: 'Escrita:', std: 'segundo as regras', snd: 'mais perto do som', toneLabel: 'Tons e acento:', marks: 'sinais', nums: 'números', none: 'sem tons',
    t1: 'Alto e plano, como um «aaa» longo no médico', t2: 'A subir, como um «Sim?» surpreendido', t3: 'Baixo e a descer, como um «hmm» pensativo', t4: 'Queda brusca, como a ordem «Para!»', t5: 'Curto e átono (le, de, zi)', light: 'neutro',
    empty: 'A transcrição vai aparecer aqui.', done: n => `Pronto: ${n} linhas.`, nothing: 'Nada para transcrever: cola uma letra.',
    langsUsed: l => ` Idioma da letra: ${l}.`, writtenFor: l => ` Escrito para: ${l}.`, enLoading: ' O dicionário inglês ainda está a carregar…',
    enFailed: ' O dicionário inglês não carregou; as linhas em inglês ficam como estão.', missingDict: ' As linhas só com caracteres foram ignoradas porque o dicionário não carregou. Junta-lhes o pinyin.',
    copied: 'Copiado.', nothingToCopy: 'Ainda não há nada para copiar.', selected: 'O texto está selecionado. Carrega em Ctrl+C (ou Copiar no menu).',
    guide: 'Como ler a transcrição',
    guideP: ['<b>Tons do chinês.</b> Cada sílaba tem um tom, indicado pelo sinal por cima. As sílabas cinzentas e mais pequenas são neutras e átonas. Dois terceiros tons seguidos dizem-se como segundo + terceiro, e 一 e 不 mudam de tom antes de outras sílabas; o conversor trata disso.',
      '<b>Nas canções</b> a melodia substitui em grande parte os tons, por isso o ritmo e os sons limpos contam mais.',
      '<b>Outras línguas.</b> O inglês vem de um dicionário de pronúncia (125 000 palavras), com a sílaba tónica marcada. Francês, alemão, espanhol, italiano, português, finlandês, albanês, sérvio e coreano seguem regras de escrita, por isso palavras francesas raras podem sair um pouco aproximadas.',
      'As tabelas detalhadas letra a letra estão escritas para a transcrição em letras russas; muda a página para russo para as ver.'],
    wrongH: 'Se o idioma for mal detetado', wrongP: 'O idioma é detetado linha a linha, e as linhas curtas ou duvidosas ficam com o idioma da canção toda. Se estiver errado, escolhe-o em «Idioma da letra». Uma romanização escrita de ouvido («czyanshan» em vez de «jiāngshān») não se consegue ler em nenhum modo.',
    sec: { intro:'Introdução', verse:'Verso', prechorus:'Pré-refrão', chorus:'Refrão', bridge:'Ponte', interlude:'Interlúdio', outro:'Final', rap:'Rap', spoken:'Falado', choir:'Coro' },
  },
  ja: {
    install: 'アプリをインストール', iosHint: 'iPhoneでは「共有」→「ホーム画面に追加」で、アプリのように開けます。',
    title: '歌詞の発音', uiLabel: 'ページの言語',
    lead: 'Geniusの歌詞をそのまま貼り付けてください。中国語（漢字またはピンイン）、日本語、韓国語、英語、フランス語、ドイツ語、スペイン語、イタリア語、ポルトガル語、フィンランド語、アルバニア語、セルビア語に対応。選んだ読み手向けの文字で、どう聞こえるかを書き出します。',
    textLabel: '歌詞', go: '変換する', copy: '結果をコピー', clear: 'クリア', showSrc: '原文を表示', colors: '声調の色分け',
    targetLabel: '表記の対象：', langLabel: '歌詞の言語：', cyr: 'ロシア語（キリル文字）', auto: '自動判定', off: '変換しない',
    styleLabel: '表記：', std: '規則どおり', snd: '発音に近く', toneLabel: '声調とアクセント：', marks: '記号', nums: '数字', none: '表示しない',
    t1: '高く平らに。病院で言う長い「あー」のように', t2: '上がる。驚いた「え？」のように', t3: '低く沈んでから上がる。考え込む「うーん」のように', t4: '鋭く下がる。命令の「止まれ！」のように', t5: '短く軽く、強調しない（le, de, zi）', light: '軽声',
    empty: 'ここに変換結果が表示されます。', done: n => `完了：${n}行。`, nothing: 'まだ変換するものがありません。歌詞を貼り付けてください。',
    langsUsed: l => ` 歌詞の言語：${l}。`, writtenFor: l => ` 表記の対象：${l}。`, enLoading: ' 英語の辞書を読み込み中…',
    enFailed: ' 英語の辞書を読み込めなかったため、英語の行はそのままです。', missingDict: ' 辞書を読み込めなかったため、漢字だけの行は変換していません。ピンインを添えてください。',
    jaLoading: ' 日本語の辞書を読み込み中…', jaFailed: ' 日本語の辞書を読み込めなかったため、漢字はそのまま残ります。かなかローマ字を使ってください。',
    copied: 'コピーしました。', nothingToCopy: 'まだコピーするものがありません。', selected: 'テキストを選択しました。Ctrl+C（またはメニューの「コピー」）を押してください。',
    guide: '変換結果の読み方',
    guideP: ['<b>中国語の声調。</b> 各音節の上の記号が声調です。灰色の小さい音節は軽声で、強く読みません。第3声が2つ続くと前が第2声になり、一と不も後ろの音節によって声調が変わります。変換ツールが自動で処理します。',
      '<b>歌では</b> メロディーが声調をほぼ置き換えるので、リズムと正確な音のほうが大切です。',
      '<b>日本語</b> は漢字を辞書で読みます（辞書は日本語の歌詞があるときだけ読み込みます）。助詞の「は・へ・を」は発音どおり「ワ・エ・オ」になります。',
      '<b>ほかの言語。</b> 英語は発音辞書（12万5千語）から読み、強く読む母音に印を付けます。そのほかの言語は綴りの規則で読むため、珍しいフランス語の単語は少しずれることがあります。',
      '文字ごとの詳しい表は、ロシア文字での表記向けにロシア語で書かれています。見るにはページをロシア語に切り替えてください。'],
    wrongH: '言語の判定が違うとき', wrongP: '言語は行ごとに判定し、短くてはっきりしない行は歌全体の言語に合わせます。違っていたら「歌詞の言語」で選んでください。耳で聞いて書いたローマ字（jiāngshān の代わりに czyanshan など）は、どのモードでも読めません。',
    sec: { intro:'イントロ', verse:'Aメロ', prechorus:'Bメロ', chorus:'サビ', bridge:'ブリッジ', interlude:'間奏', outro:'アウトロ', rap:'ラップ', spoken:'語り', choir:'コーラス' },
  },
};
// Brazilian Portuguese: same as Portugal with Brazilian wording
I18N.br = Object.assign({}, I18N.pt, {
  jaLoading: ' Carregando o dicionário japonês…',
  install: 'Instalar o app', iosHint: 'No iPhone: toque em Compartilhar e depois em «Adicionar à Tela de Início», e ele abre como um app.',
  lead: 'Cole a letra como aparece no Genius: chinês (caracteres ou pinyin), japonês, coreano, inglês, francês, alemão, espanhol, italiano, português, finlandês, albanês ou sérvio. Você recebe como ela soa, escrita do jeito que escolher.',
  auto: 'Detectar automaticamente', t2: 'Subindo, como um «Sério?» surpreso', t3: 'Baixo e descendo, como um «hmm» pensativo', t4: 'Queda brusca, como a ordem «Pare!»',
  enLoading: ' O dicionário de inglês ainda está carregando…', missingDict: ' As linhas só com caracteres foram ignoradas porque o dicionário não carregou. Adicione o pinyin a elas.',
  nothing: 'Nada para transcrever: cole uma letra.', selected: 'O texto está selecionado. Aperte Ctrl+C (ou Copiar no menu).',
  guideP: I18N.pt.guideP.map(p => p.replace('cinzentas', 'cinzas').replace('dizem-se como', 'são ditos como').replace('trata disso', 'cuida disso').replace('muda a página para russo para as ver', 'mude a página para russo para vê-las')),
  wrongH: 'Se o idioma for detectado errado', wrongP: 'O idioma é detectado linha por linha, e as linhas curtas ou duvidosas ficam com o idioma da música toda. Se errar, escolha em «Idioma da letra». Uma romanização escrita de ouvido («czyanshan» em vez de «jiāngshān») não pode ser lida em nenhum modo.',
  sec: Object.assign({}, I18N.pt.sec, { outro: 'Final' }),
});

// ---------- Dropdown with flags (keeps a hidden <select> as the source of truth) ----------
function makeDropdown(select) {
  const wrap = document.createElement('div'); wrap.className = 'dd';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn';
  btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
  const list = document.createElement('ul'); list.className = 'dd-list'; list.setAttribute('role', 'listbox'); list.hidden = true; list.tabIndex = -1;
  select.classList.add('sr-only'); select.tabIndex = -1; select.setAttribute('aria-hidden', 'true');
  select.after(wrap); wrap.append(btn, list);
  const lbl = select.closest('label');
  if (lbl) { const txt = lbl.querySelector('.lbl'); if (txt) { txt.id = txt.id || select.id + '-lbl'; btn.setAttribute('aria-labelledby', txt.id + ' ' + select.id + '-btn'); } lbl.addEventListener('click', e => { if (e.target === lbl || e.target.classList.contains('lbl')) { e.preventDefault(); btn.focus(); } }); }
  btn.id = select.id + '-btn';
  let active = 0;
  function render() {
    const o = select.options[select.selectedIndex];
    btn.innerHTML = FLAGS(o.dataset.flag || o.value) + `<span class="dd-txt">${o.textContent}</span><svg class="dd-chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
    list.innerHTML = '';
    [...select.options].forEach((op, i) => {
      const li = document.createElement('li'); li.setAttribute('role', 'option'); li.id = select.id + '-o' + i;
      li.setAttribute('aria-selected', String(i === select.selectedIndex));
      li.innerHTML = FLAGS(op.dataset.flag || op.value) + `<span>${op.textContent}</span>`;
      li.addEventListener('click', () => choose(i));
      li.addEventListener('mousemove', () => setActive(i));
      list.appendChild(li);
    });
  }
  function setActive(i) {
    active = Math.max(0, Math.min(select.options.length - 1, i));
    [...list.children].forEach((li, k) => li.classList.toggle('on', k === active));
    list.setAttribute('aria-activedescendant', select.id + '-o' + active);
    list.children[active]?.scrollIntoView({ block: 'nearest' });
  }
  function open() { list.hidden = false; btn.setAttribute('aria-expanded', 'true'); setActive(select.selectedIndex); list.focus(); }
  function close(focusBtn = true) { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (focusBtn) btn.focus(); }
  function choose(i) {
    if (select.selectedIndex !== i) { select.selectedIndex = i; select.dispatchEvent(new Event('change', { bubbles: true })); }
    render(); close();
  }
  btn.addEventListener('click', () => list.hidden ? open() : close());
  btn.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); } });
  list.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(select.options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape' || e.key === 'Tab') { close(e.key === 'Escape'); }
  });
  document.addEventListener('click', e => { if (!wrap.contains(e.target) && !list.hidden) close(false); });
  select.addEventListener('change', render);
  render();
  return { render };
}
(function(){
  let uiLang = (() => {
    try { const s = localStorage.getItem('ui-lang'); if (UI_LANGS.includes(s)) return s; } catch (e) {}
    const nav = (navigator.language || 'ru').toLowerCase();
    if (nav === 'pt-br') return 'br';
    const base = nav.split('-')[0];
    return UI_LANGS.includes(base) ? base : 'ru';
  })();
  const tr = k => (I18N[uiLang] && I18N[uiLang][k] !== undefined) ? I18N[uiLang][k] : I18N.ru[k];
  const HAN = /[㐀-䶿一-鿿豈-﫿]/;
  const $ = id => document.getElementById(id);
  const inp = $('inp'), out = $('out'), status = $('status');
  const SAMPLE = `江湖一笑 浪滔滔 紅塵盡忘了
Jiānghú yīxiào làng tāotāo hóngchén jǐn wàngliao

俱往矣 何足言道
Jù wǎng yǐ hé zú yán dào

蒼天一笑 笑不老 豪情卻會了
Cāngtiān yīxiào xiào bùlǎo háoqíng què huìle

對月飲 一杯寂寥
Duì yuè yǐn yībēi jìliáo
You might also like
劍起江湖恩怨 拂袖罩明月
西風葉落花謝 枕刀劍難眠`;

  function pinyinScore(line){
    const words = line.match(/[A-Za-zÀ-ɏḀ-ỿüÜ'’]+/g) || [];
    if (!words.length) return 0;
    const ok = words.filter(w => PALL.word(w.replace(/^['’]+/,'')) != null).length;
    return ok / words.length;
  }
  // Without hanzi anywhere in the text, plain Latin counts as pinyin only with tone marks or numbers
  let docHan = true, docJa = false, needJa = false, jaMissing = false, jaTok = null, jaState = 'idle';
  const TONEMARK = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]|[a-zü][1-5]\b/i;
  const isPinyin = l => !HAN.test(l) && pinyinScore(l) >= 0.8 && (docHan || TONEMARK.test(l));

  // Full-width punctuation -> normal, so spacing looks right in Cyrillic
  const PUNCT = {'，':', ','。':'. ','、':', ','？':'? ','！':'! ','：':': ','；':'; ','（':' (','）':') ','「':'«','」':'»','『':'«','』':'»','…':'…','　':' '};
  const normPunct = s => s.replace(/[，。、？！：；（）「」『』　]/g, c => PUNCT[c]);
  const tidy = toks => {
    // collapse double spaces and spaces before punctuation inside string tokens
    const outT = [];
    for (const x of toks){
      if (typeof x === 'string' && typeof outT[outT.length-1] === 'string') outT[outT.length-1] += x; else outT.push(x);
    }
    return outT.map((x, i) => typeof x !== 'string' ? x : x.replace(/ {2,}/g, ' ').replace(/ ([,.?!;:)»])/g, '$1').replace(/([(«]) /g, '$1')
      .replace(i === 0 ? /^ +/ : /$^/, '').replace(i === outT.length - 1 ? / +$/ : /$^/, '')).filter(x => x !== '');
  };

  // Hanzi line -> tokens (library picks readings and applies 一/不 tone changes).
  // Latin words inside such a line are English or names and stay as they are; Korean is transcribed.
  function hanToks(line){
    if (!window.pinyinPro) return null;
    const out = []; const chars = Array.from(normPunct(line)); let i = 0;
    while (i < chars.length){
      let j = i; const han = HAN.test(chars[i]);
      while (j < chars.length && HAN.test(chars[j]) === han) j++;
      const run = chars.slice(i, j).join('');
      if (han){
        if (i > 0 && /[\p{L}\p{N}]$/u.test(chars[i-1])) out.push(' ');
        pinyinPro.pinyin(run, {toneType:'num', type:'array', v:false}).forEach((p, k) => {
          const a = PALL.analyze(p.replace(/0$/, '5'));
          const sy = a && PALL.cyr(a, false);
          if (k) out.push(' ');
          if (sy) out.push(...sy); else out.push(p);
        });
        if (j < chars.length && /[\p{L}\p{N}]/u.test(chars[j])) out.push(' ');
      } else out.push(styleMode() === 'snd' ? soundStr(KOR.text(run), 'ko') : KOR.text(run));
      i = j;
    }
    const f = out.find(x => typeof x !== 'string');
    if (f && out.indexOf(f) === 0) f.c = f.c[0].toUpperCase() + f.c.slice(1);
    return tidy(out);
  }

  // Genius section headers like [副歌], [主歌 2: …], [Chorus]
  const SECTIONS = [
    [/^(前奏|引子|イントロ|intro|인트로|uvod|introducija|johdanto|hyrje|introducción|introduzione|introdução|einleitung)/i, 'intro'],
    [/^(预副歌|預副歌|导歌|導歌|Bメロ|pre-?chorus|프리코러스|pre-?estribillo|pre-?ritornello|pré-?refrão|pré-?refrain)/i, 'prechorus'],
    [/^(副歌|サビ|chorus|hook|후렴|코러스|pripev|kertosäe|refren|refreni|refrain|estribillo|ritornello|refrão|coro)/i, 'chorus'],
    [/^(主歌|Aメロ|verse|벌스|절|strofa|strofë|säkeistö|couplet|strophe|verso|estrofa)/i, 'verse'],
    [/^(桥段|橋段|过渡|過渡|ブリッジ|Cメロ|bridge|브릿지|bridž|most|pont|puente|ponte)/i, 'bridge'], [/^(间奏|間奏|interlude|간주|interludio|interlúdio|zwischenspiel)/i, 'interlude'],
    [/^(尾奏|结尾|結尾|アウトロ|outro|아웃트로|kraj|završetak|loppu|fund|final|finale)/i, 'outro'], [/^(说唱|說唱|rap|랩)/i, 'rap'], [/^(念白|独白|獨白|口白|spoken)/i, 'spoken'],
    [/^(合唱|和声|和聲|choir|chœur|chor)/i, 'choir']];
  function header(l){
    const m = l.match(/^\[(.+)\]$/); if (!m) return null;
    let [label, ...rest] = m[1].split(/[:：]/); rest = rest.join(':').trim(); label = label.trim();
    const num = (label.match(/\d+/) || [''])[0];
    const hit = SECTIONS.find(([re]) => re.test(label));
    return (hit ? tr('sec')[hit[1]] + (num ? ' ' + num : '') : label) + (rest ? ' · ' + rest : '');
  }

  // Genius page junk: recommendations, translation links, counters
  const JUNK = /^\[?(tekst pesme|tekst pjesme|songtext|paroles de|sanoitukset|teksti i këngës)\b|^(you might also like|\d+\s*contributors|.*\bembed$|.*\blyrics$|genius\b.*)|\((english )?translation\)|\(romanized\)|\(русский перевод\)/i;

  // Pinyin under a hanzi line: also apply 一/不 tone changes when syllables line up with characters
  function pairToks(han, py){
    const toks = PALL.tokens(py);
    const sy = toks.filter(x => typeof x !== 'string');
    const hz = Array.from(han).filter(c => HAN.test(c));
    if (hz.length === sy.length){
      for (let k = 0; k < sy.length - 1; k++){
        const nx = sy[k+1].t;
        if (hz[k] === '一' && sy[k].s === 'yi' && sy[k].t === 1 && hz[k+1] !== '一') sy[k].t = nx === 4 ? 2 : (nx < 4 ? 4 : 1);
        if (hz[k] === '不' && sy[k].s === 'bu' && nx === 4) sy[k].t = 2;
      }
    }
    return toks;
  }

  function splitGlued(l){
    const chars = Array.from(l);
    let last = -1; chars.forEach((c, i) => { if (HAN.test(c)) last = i; });
    const tail = chars.slice(last + 1).join('');
    const at = tail.search(/[A-Za-zÀ-ɏḀ-ỿüÜ]/);
    if (at < 0) return null;
    const py = tail.slice(at).trim(), han = (chars.slice(0, last + 1).join('') + tail.slice(0, at)).trim();
    return isPinyin(py) && py.split(/\s+/).length >= 1 && /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(py + ' ') ? { han, py } : null;
  }

  // ---------- "closer to the sound" mode and per-language reading guide ----------
  const styleMode = () => document.querySelector('input[name="style"]:checked').value;
  const HARD = 'бвгджзклмнпрстфхцчшщ';
  const eHard = s => s.replace(new RegExp('(?<=[' + HARD + '])е', 'g'), 'э').replace(new RegExp('(?<=[' + HARD.toUpperCase() + '])е', 'g'), 'э');
  function soundStr(s, lang){
    if (lang === 'de') s = s.replace(/(?<=[а-яё]{3,})[еэ]р(?![а-яё])/gi, 'а');               // Vater -> фата
    if (lang === 'fi') s = s.replace(new RegExp('ль(?=[' + HARD + 'й])', 'g'), 'л');      // polkka -> полкка
    return eHard(s);
  }
  function soundify(toks, lang){
    return toks.map(x => {
      if (typeof x === 'string') return soundStr(x, lang);
      if (!x.stress) return x;
      const parts = soundStr(x.pre + x.c + '\u0001' + x.post, lang).split('\u0001');
      return { ...x, pre: parts[0].slice(0, -1), c: parts[0].slice(-1), post: parts[1] };
    });
  }

  const GUIDES = {
    zh: { name: 'Китайский', head: ['Пиньинь', 'Пишется'], rows: [
      ['j, z', 'цз', 'мягкое «дз» / «дзь»'], ['zh', 'чж', 'твёрдое «дж»'], ['q / x', 'ц / с', '«ць» / мягкое «сь»'],
      ['r', 'ж', 'между «ж» и «р»'], ['-n / -ng', 'нь / н', '«н» / носовое «н», как в англ. -ng'],
      ['e', 'э', 'что-то между «э» и «ы»'], ['ü (yu)', 'юй', 'немецкое «ü», губы трубочкой']],
      tips: [
        '<b>Ударения как в русском нет:</b> каждый слог звучит со своим тоном (значки над слогами). Безударные только слоги с лёгким тоном, они серые и мельче.',
        '<b>Тоны меняются в речи.</b> Два третьих тона подряд: первый звучит как второй (ни³ хао³ → ни² хао³). 一 (и) и 不 (бу) тоже меняются перед другими слогами. Конвертер это учитывает.',
        '<b>В песнях</b> мелодия во многом перекрывает тоны, так что важнее ритм и чистые звуки.',
        'Если вставлены только иероглифы, у многозначных знаков (了: le / liao) чтение иногда угадывается неверно. Если рядом есть пиньинь, берётся он.',
        'Режим «ближе к звучанию» китайский не меняет: система Палладия и так близка к произношению.'] },
    ko: { name: 'Корейский', head: ['Хангыль', 'Пишется'], rows: [
      ['ㅓ', 'о', 'открытое «о», рот шире, губы не округлять'], ['ㅡ', 'ы', '«ы» с растянутыми губами'],
      ['ㄲ ㄸ ㅃ ㅆ ㅉ', 'кк тт пп сс чч', 'напряжённые, резкие, без выдоха'], ['ㅋ ㅌ ㅍ ㅊ', 'кх тх пх чх', 'с сильным выдохом'],
      ['ㄹ', 'р / ль', 'между гласными «р», в конце слога «ль»'], ['ㅇ на конце', 'н', 'носовое «н», как англ. -ng']],
      tips: ['<b>Ударения нет:</b> слоги звучат ровно, по-русски выделять ни один не надо.',
        'Согласные на стыках слогов меняются (꿈을 → ккумыль, 신라 → силла), конвертер это учитывает.',
        '«Ближе к звучанию»: «е» после согласной пишется как «э», потому что согласные в корейском не смягчаются.'] },
    en: { name: 'Английский', head: ['Буквы', 'Пишется'], rows: [
      ['th (think)', 'с', 'кончик языка между зубами, глухо'], ['th (this)', 'з', 'то же, но звонко'],
      ['w', 'у', 'быстрое «у», губы трубочкой'], ['r', 'р', 'не раскатывать, язык не касается нёба'],
      ['a (cat)', 'э', 'открытое, между «э» и «а»'], ['-ng', 'нг', 'носовое «н», «г» почти не слышно'], ['h', 'х', 'лёгкий выдох, мягче русского «х»']],
      tips: ['<b>Ударение</b> отмечено значком над гласной (берётся из словаря произношения).',
        'Слова, которых нет в словаре (имена, сленг), остаются латиницей.',
        '«Ближе к звучанию»: «е» после согласной пишется как «э» (бэд, а не бед).'] },
    fr: { name: 'Французский', head: ['Буквы', 'Пишется'], rows: [
      ['an, en / on / in, ain', 'ан / он / эн', 'носовые: «н» не произносится, гласная идёт в нос'],
      ['r', 'р', 'картавое, горлом'], ['u', 'ю', '«и» с губами трубочкой, без «й»'],
      ['eu, œu', 'ё', 'между «ё» и «о», без «й»'], ['j, g (je, rouge)', 'ж', 'мягче русского «ж»'], ['gn', 'нь', 'как «нь» в «коньяк»']],
      tips: ['<b>Ударение</b> всегда на последний слог слова или фразы.',
        'Немые буквы на конце слов убраны (chantent → шант). Во французском много исключений, так что редкие слова могут выйти неточно.',
        '«Ближе к звучанию»: «е» после согласной пишется как «э» (кафэ).'] },
    de: { name: 'Немецкий', head: ['Буквы', 'Пишется'], rows: [
      ['ch после e, i, ä, ü', 'х', 'мягкое, почти «щ» шёпотом (ich)'], ['ch после a, o, u', 'х', 'твёрдое, горлом (Bach)'],
      ['r', 'р', 'картавое; на конце слова почти «а»'], ['ü / ö', 'ю / ё', 'без «й», губы трубочкой'],
      ['ei / eu, äu', 'ай / ой', ''], ['z', 'ц', ''], ['s перед гласной', 'з', '']],
      tips: ['<b>Ударение</b> обычно на первый слог корня. Долгие гласные тянутся.',
        '«Ближе к звучанию»: «е» после согласной пишется как «э» (либэ), безударное -er на конце как «а» (Vater → фата).'] },
    fi: { name: 'Финский', head: ['Буквы', 'Пишется'], rows: [
      ['e', 'е', 'всегда твёрдое «э»: «се» звучит «сэ»'], ['ä', 'я / э', 'широкое «э», согласная перед ним не смягчается'],
      ['y', 'ю', '«и» с губами трубочкой, без «й»'], ['ö', 'ё', '«э» с губами трубочкой, без «й»'],
      ['aa, kk, ll…', 'аа, кк, лл', 'двойные тянутся дольше: «маа», «полкка» с паузой на «кк»'], ['r', 'р', 'раскатистое']],
      tips: ['<b>Ударение</b> всегда на первый слог: ПОлкка, СЯккиярвен.',
        'Длина звуков меняет смысл слова, так что двойные буквы важно тянуть.',
        '«Ближе к звучанию»: «е» после согласной пишется как «э», «ль» перед согласной как «л» (полкка).'] },
    sq: { name: 'Албанский', head: ['Буквы', 'Пишется'], rows: [
      ['ë', 'э', 'короткий глухой звук, на конце слова часто почти не слышен'], ['q', 'кь', 'между «кь» и «ть»'],
      ['gj', 'гь', 'между «гь» и «дь»'], ['x / xh', 'дз / дж', 'слитно'], ['dh', 'д', 'как англ. th в «this»'],
      ['th', 'т', 'как англ. th в «think»'], ['rr / r', 'рр / р', 'раскатистое / одноударное']],
      tips: ['<b>Ударение</b> обычно на предпоследний слог.',
        '«Ближе к звучанию»: «е» после согласной пишется как «э», согласные в албанском не смягчаются.'] },
    sr: { name: 'Сербский', head: ['Буквы', 'Пишется'], rows: [
      ['č / ч', 'ч', 'твёрдое «ч»'], ['ć / ћ', 'ч', 'мягкое, почти «ть»'], ['dž / џ', 'дж', 'твёрдое'], ['đ / ђ', 'дж', 'мягкое, почти «дь»'],
      ['lj, nj', 'ль, нь', 'как в русском «люблю», «няня»'], ['e', 'е', 'твёрдое «э»: «те» звучит «тэ»'], ['r между согласными', 'р', 'слоговое: srce звучит «срьце»']],
      tips: ['<b>Ударение</b> никогда не падает на последний слог. В сербском есть и музыкальные тоны, но в песнях их почти не слышно.',
        '«Ближе к звучанию»: «е» после согласной пишется как «э».'] },
    ja: { name: 'Японский', head: ['Кана', 'Пишется'], rows: [
      ['し / ち / つ', 'си / ти / цу', 'между «си» и «щи», между «ти» и «чи»; в английской записи shi, chi, tsu'],
      ['じ / ざ, ず, ぜ, ぞ', 'дзи / дза…', 'между «дзи» и «джи», в начале слова почти «з»'],
      ['ら り る れ ろ', 'ра ри ру рэ ро', 'один удар языком, между «р» и «л»'], ['ふ', 'фу', 'лёгкий выдох, губы не смыкаются'],
      ['ん', 'н (нъ перед гласной)', 'перед м, б, п звучит как «м»'], ['ー, おう, えい', ':, о:, эй', 'двоеточие = гласная тянется вдвое дольше'],
      ['っ', 'удвоенная согласная', 'короткая пауза перед согласной: маттэ'], ['は / を / へ как частицы', 'ва / о / э', '']],
      tips: ['Запись по системе Поливанова: так японские слова пишут в русских словарях (поэтому «суси», а не «суши»).',
        '<b>Ударение</b> в японском музыкальное (высота голоса), в песнях его не слышно, так что ни один слог не выделяй.',
        '«у» и «и» между глухими согласными и в конце после «с» часто почти не слышны: «дэсу» звучит как «дэс».',
        'Кандзи читаются по словарю: он загружается, только когда в тексте есть японский. Без словаря читаются кана и ромадзи.'] },
    es: { name: 'Испанский', head: ['Буквы', 'Пишется'], rows: [
      ['j, g перед e/i', 'х', 'горловое «х», чуть мягче русского'], ['ll, y', 'й', 'как «й» (в Аргентине ближе к «ш» / «ж»)'],
      ['ñ', 'нь', 'как в «няня»'], ['r / rr', 'р / рр', 'одноударное / раскатистое'], ['c перед e/i, z', 'с', 'в Испании шепелявое, как англ. th'],
      ['b, v', 'б / в', 'обе звучат почти как мягкое «б»'], ['h', '—', 'не читается']],
      tips: ['<b>Ударение</b> на предпоследний слог, если слово кончается на гласную, n или s; иначе на последний. Знак ´ (á, é…) показывает исключения.',
        '«Ближе к звучанию»: «е» после согласной пишется как «э», согласные в испанском не смягчаются.'] },
    it: { name: 'Итальянский', head: ['Буквы', 'Пишется'], rows: [
      ['c, ci перед a/o/u', 'ч', 'ciao → чао'], ['ch', 'к', 'chiesa → кьеза'], ['g, gi перед a/o/u', 'дж', 'giorno → джорно'],
      ['gn', 'нь', 'sogno → соньо'], ['gli', 'ль', 'figlio → фильо'], ['sc перед e/i', 'ш', 'scena → шена'],
      ['z, zz', 'ц', 'иногда звонко, как «дз»'], ['двойные согласные', 'кк, тт…', 'тянутся дольше: «окки», «белла»']],
      tips: ['<b>Ударение</b> чаще всего на предпоследний слог; знак ` (città, perché) ставит его на последний.',
        '«Ближе к звучанию»: «е» после согласной пишется как «э».'] },
    pt: { name: 'Португальский (Португалия)', head: ['Буквы', 'Пишется'], rows: [
      ['ão, ã / õe', 'аун, ан / ойн', 'носовые: «н» почти не слышно, гласная идёт в нос'], ['nh / lh', 'нь / ль', 'minha → минья, filho → филью'],
      ['s перед согласной и на конце', 'ш', 'mais → майш'], ['o / e без ударения на конце', 'у / ы', 'часто почти проглатываются'],
      ['x, ch', 'ш', ''], ['j, g перед e/i', 'ж', ''], ['rr, r в начале', 'рр / р', 'горловое, картавое']],
      tips: ['<b>Ударение</b> обычно на предпоследний слог; знаки á, ê, ó показывают исключения.',
        'Безударные гласные в португальском варианте сильно сокращаются, так что на слух слова короче, чем написаны.'] },
    br: { name: 'Португальский (Бразилия)', head: ['Буквы', 'Пишется'], rows: [
      ['ão, ã / em', 'аун, ан / ейн', 'носовые: «н» почти не слышно, гласная идёт в нос'], ['nh / lh', 'нь / ль', 'minha → минья, filho → филью'],
      ['t, d перед i и e на конце', 'ч, дж', 'noite → нойчи, cidade → сидаджи'], ['o / e без ударения на конце', 'у / и', 'obrigado → обригаду'],
      ['rr, r в начале', 'х', 'Rio → Хиу, carro → каху'], ['l на конце слога', 'у', 'Brasil → Бразиу'], ['x, ch / j', 'ш / ж', '']],
      tips: ['<b>Ударение</b> обычно на предпоследний слог; знаки á, ê, ó показывают исключения.',
        '«Ближе к звучанию»: «е» после согласной пишется как «э».'] },
  };
  const esc = s => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  function renderGuide(rows){
    const present = [];
    for (const r of rows){
      const l = (r.t === 'zh' || r.t === 'py') ? 'zh' : r.t === 'ko' ? 'ko' : r.t === 'ja' ? 'ja' : r.t === 'lat' ? r.lang : null;
      if (l && !present.includes(l)) present.push(l);
      if (r.src && KOR.has(r.src) && !present.includes('ko')) present.push('ko');
    }
    if (!present.length) present.push('zh');
    $('tones').hidden = !present.includes('zh');
    const wrong = `<section><h3>${tr('wrongH')}</h3><p>${tr('wrongP')}</p></section>`;
    if (uiLang !== 'ru'){
      $('guide').innerHTML = '<section>' + tr('guideP').map(p => `<p>${p}</p>`).join('') + '</section>' + wrong;
      return;
    }
    const ruT = $('target').value === 'ru';
    $('guide').innerHTML = (ruT ? '' : `<section><p>${tr('guideOther')}</p></section>`) + present.map(l => {
      const g = GUIDES[l];
      return `<section><h3>${g.name}</h3><div class="tw"><table><tr><th>${g.head[0]}</th><th>${g.head[1]}</th><th>Звучит примерно</th></tr>`
        + g.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')
        + `</table></div>${g.tips.map(t => `<p>${t}</p>`).join('')}</section>`;
    }).join('')
      + wrong;
  }

  // Spelling for English / German / French readers instead of Russian letters
  function retarget(rows){
    const tg = $('target').value;
    if (tg === 'ru') return;
    for (const r of rows){
      if (r.t === 'zh' || r.t === 'py'){
        r.ru = r.ru.map(x => typeof x === 'string' ? TGT.conv(x, tg) : { ...x, c: TGT.conv(x.c, tg, 'zh') });
      } else if (r.t === 'ja'){
        r.ru = tg === 'ja' ? [r.src] : [r.hep];
      } else if (r.t === 'ko'){
        r.ru = r.ru.map(x => TGT.conv(x, tg));
      } else if (r.t === 'lat'){
        if (r.lang === 'ja'){
          // romaji: Latin readers get it as it is, Japanese readers get katakana
          r.ru = tg === 'ja' ? [r.src.replace(/[A-Za-zāīūēōÂâ'’]+/g, w => JA.romajiToKana(w) || w).replace(/ /g, '・')] : [r.src];
          continue;
        }
        r.ru = (r.lang === tg || (['pt','br'].includes(r.lang) && ['pt','br'].includes(tg))) ? [r.src] : r.ru.map(x => typeof x === 'string' ? TGT.conv(x, tg, r.lang)
          : TGT.conv(x.pre + x.c + x.post, tg, r.lang));
      } else if (r.t === 'plain'){
        r.src = r.ru[0]; r.ru = [TGT.conv(r.ru[0], tg)];
      }
    }
  }

  // Japanese dictionary (kuromoji): loaded only when the lyrics contain Japanese
  function loadJa(){
    if (jaState !== 'idle') return;
    jaState = 'loading';
    const base = window.JA_BASE || '';
    const go = () => kuromoji.builder({ dicPath: base + 'dict/' }).build((err, t) => {
      if (err || !t){ jaState = 'failed'; convert(); return; }
      jaTok = t; jaState = 'ready'; convert();
    });
    if (window.kuromoji) return go();
    const sc = document.createElement('script');
    sc.src = window.KUROMOJI_SRC || 'vendor/kuromoji.js';
    sc.onload = go; sc.onerror = () => { jaState = 'failed'; convert(); };
    document.head.appendChild(sc);
  }

  // Other languages: pick a language per line (or the one chosen in the list) and transcribe
  let docLang = null;
  function latin(rows){
    const sel = $('lang').value;
    const cand = rows.filter(r => r.t === 'other' && r.src);
    docLang = null;
    if (sel === 'off' || !cand.length) return;
    const total = {};
    const sc = cand.map(r => { const s = LAT.scores(r.src); for (const k in s) total[k] = (total[k] || 0) + s[k]; return s; });
    const tb = LAT.best(total);
    // Portuguese: Brazilian unless the text looks European (tu, estás, a fazer…)
    const ptText = cand.filter((r, i) => LAT.best(sc[i]).lang === 'pt').map(r => r.src).join(' ');
    const ptVar = !/\b(você|vocês|pra|a gente|tá)\b/i.test(ptText) && /\b(tu|estás|vós|tens|a (fazer|cantar|dançar|ver)|connosco|fixe)\b/i.test(ptText) ? 'pt' : 'br';
    docLang = sel !== 'auto' ? sel : (tb.score > 0 ? tb.lang : 'en');
    if (docLang === 'pt' && sel === 'auto') docLang = ptVar;
    cand.forEach((r, i) => {
      const l = r.src;
      let lang = docLang;
      if (sel === 'auto'){
        const b = LAT.best(sc[i]);
        if (b.score >= 2 && b.margin >= 0.7) lang = b.lang;
        else if (b.score >= 2){
          // a tie inside the line (je/ne are French and Serbian): take the tied language that dominates the song
          const tied = Object.keys(sc[i]).filter(k => sc[i][k] >= b.score - 0.7);
          lang = tied.includes(docLang) ? docLang : tied.sort((x, y) => total[y] - total[x])[0];
        }
        if (LAT.isSerbCyr(l)) lang = 'sr';
        if (lang === 'pt') lang = ptVar;
      }
      if (LAT.isCyr(l) && lang !== 'sr'){ r.t = 'plain'; r.src = null; return; }   // Russian stays as it is
      if (lang === 'en' && !LAT.hasEN()){ r.pending = true; return; }
      let toks = LAT.line(l, lang);
      if (styleMode() === 'snd') toks = soundify(toks, lang);
      r.t = 'lat'; r.lang = lang; r.ru = toks;
    });
  }

  function convert(){
    const lines = inp.value.replace(/\r/g,'').split('\n');
    docHan = HAN.test(inp.value);
    docJa = JA.KANA.test(inp.value);
    needJa = false; jaMissing = false;
    const rows = []; let missingDict = false, skip = 0;
    for (let k = 0; k < lines.length; k++){
      const l = lines[k].trim();
      if (!l){ if (rows.length && rows[rows.length-1].t !== 'gap') rows.push({t:'gap'}); continue; }
      if (/^you might also like/i.test(l)){ skip = 6; continue; }   // Genius lists 3 songs (title + artist) after it
      if (skip > 0){ skip--; continue; }
      if (JUNK.test(l)) continue;
      const h = header(l);
      if (h != null){ rows.push({t:'head', ru:[h]}); continue; }
      if (JA.KANA.test(l) || (docJa && HAN.test(l))){
        // Japanese: kanji through the dictionary when it is loaded; a romaji line right after is used if there is no dictionary
        if (!jaTok) needJa = true;
        let n = k + 1;
        const nextRomaji = n < lines.length && lines[n].trim() && !JA.KANA.test(lines[n]) && !HAN.test(lines[n]) && LAT.best(LAT.scores(lines[n])).lang === 'ja';
        const r = JA.line(l, jaTok);
        if (r.missing && nextRomaji){
          const toks = LAT.line(lines[n].trim(), 'ja');
          rows.push({t:'ja', src:l, ru:[toks.map(x => typeof x === 'string' ? x : x.pre + x.c + x.post).join('')], hep:lines[n].trim(), kana:null}); k = n; continue;
        }
        if (nextRomaji) k = n;
        rows.push({t:'ja', src:l, ru:[r.c], hep:r.h, kana:r.kana});
        if (r.missing) jaMissing = true;
        continue;
      }
      if (HAN.test(l)){
        // hanzi and pinyin glued in one line: "天上太阳红 唉Tiānshàng tàiyang …"
        const g = splitGlued(l);
        if (g){ rows.push({t:'zh', src:g.han, ru:pairToks(g.han, g.py)}); continue; }
        let n = k + 1; while (n < lines.length && !lines[n].trim()) n++;
        if (n < lines.length && n === k + 1 && isPinyin(lines[n].trim())){
          rows.push({t:'zh', src:l, ru:pairToks(l, lines[n].trim())}); k = n; continue;
        }
        const ru = hanToks(l);
        if (ru == null){ missingDict = true; rows.push({t:'zh', src:l, ru:['(иероглифы без пиньиня: словарь не загрузился)']}); }
        else rows.push({t:'zh', src:l, ru});
      } else if (KOR.has(l)){
        let ru = KOR.text(l);
        if (styleMode() === 'snd') ru = soundStr(ru, 'ko');
        rows.push({t:'ko', src:l, ru:[ru.replace(/\p{L}/u, c => c.toUpperCase())]});
      } else if (isPinyin(l)){
        rows.push({t:'py', src:l, ru:PALL.tokens(l)});
      } else if (/\p{L}/u.test(l)){
        rows.push({t:'other', src:l, ru:[l]});
      } else rows.push({t:'other', ru:[l]});
    }
    if (needJa) loadJa();
    latin(rows);
    retarget(rows);
    renderGuide(rows);
    while (rows.length && rows[rows.length-1].t === 'gap') rows.pop();
    render(rows);
    const n = rows.filter(r => ['zh','py','ko','lat','ja'].includes(r.t)).length;
    const langs = [...new Set(rows.filter(r => r.t === 'lat').map(r => langName(r.lang, uiLang)))];
    status.textContent = (n ? tr('done')(n) : tr('nothing'))
      + (langs.length ? tr('langsUsed')(langs.join(', ')) : '')
      + ($('target').value !== 'ru' ? tr('writtenFor')(langName($('target').value, uiLang)) : '')
      + (rows.some(r => r.pending) ? tr('enLoading') : '')
      + (jaState === 'loading' && needJa ? tr('jaLoading') : '')
      + (jaState === 'failed' && jaMissing ? tr('jaFailed') : '')
      + (missingDict ? tr('missingDict') : '');
    lastRows = rows;
  }

  let lastRows = [];
  const TONE_SIGN = {1:'ˉ', 2:'ˊ', 3:'ˇ', 4:'ˋ'};
  const mode = () => document.querySelector('input[name="mode"]:checked').value;
  const flat = toks => toks.map(x => typeof x === 'string' ? x
    : x.stress ? x.pre + x.c + (mode() === 'none' ? '' : '\u0301') + x.post
    : PALL.toned(x.c, x.t, mode())).join('');
  function fill(el, toks){
    const m = mode();
    let word = null;
    for (const x of toks){
      if (typeof x === 'string'){ word = null; el.appendChild(document.createTextNode(x)); continue; }
      if (x.stress){
        // stressed vowel (English): same mark-above-letter layout as Chinese tones
        word = null;
        const w = document.createElement('span'); w.className = 'w';
        w.append(x.pre);
        if (m === 'marks'){
          const s = document.createElement('span'); s.className = 'sy st';
          const mk = document.createElement('span'); mk.className = 'mk'; mk.setAttribute('aria-hidden', 'true'); mk.textContent = 'ˊ';
          s.append(mk, x.c); w.append(s);
        } else w.append(x.c);
        w.append(x.post); el.appendChild(w); continue;
      }
      if (!word){ word = document.createElement('span'); word.className = 'w'; el.appendChild(word); }
      const s = document.createElement('span'); s.className = 't' + x.t;
      if (m === 'marks'){
        s.classList.add('sy');
        const mk = document.createElement('span'); mk.className = 'mk'; mk.setAttribute('aria-hidden', 'true');
        mk.textContent = TONE_SIGN[x.t] || '';
        s.append(mk, x.c);
      } else {
        s.textContent = x.c;
        if (m === 'nums' && x.t < 5){ const sup = document.createElement('sup'); sup.textContent = x.t; s.appendChild(sup); }
      }
      word.appendChild(s);
    }
  }

  function render(rows){
    out.classList.toggle('marks', mode() === 'marks');
    const showSrc = $('showSrc').checked;
    out.innerHTML = '';
    const vis = rows;
    if (!vis.length){ out.innerHTML = `<p class="empty">${tr('empty')}</p>`; return; }
    for (const r of vis){
      if (r.t === 'gap'){ const g = document.createElement('div'); g.className = 'gap'; out.appendChild(g); continue; }
      const d = document.createElement('div'); d.className = 'ln' + (r.t === 'other' ? ' other' : '') + (r.t === 'head' ? ' head' : '');
      if (r.t === 'lat' || r.t === 'plain') d.lang = r.t === 'lat' ? r.lang : 'ru';
      if (showSrc && r.src && r.t !== 'other'){ const s = document.createElement('div'); s.className = r.t === 'py' ? 'py' : 'src'; s.textContent = r.src; d.appendChild(s); }
      const ru = document.createElement('div'); ru.className = 'ru'; fill(ru, r.ru); d.appendChild(ru);
      out.appendChild(d);
    }
  }

  function plain(){
    return lastRows.map(r => r.t === 'gap' ? '' : r.t === 'head' ? '[' + r.ru[0] + ']' : flat(r.ru)).join('\n');
  }

  $('go').addEventListener('click', convert);
  inp.addEventListener('input', () => { clearTimeout(inp._t); inp._t = setTimeout(convert, 250); });
  $('showSrc').addEventListener('change', () => render(lastRows));
  $('lang').addEventListener('change', convert);
  $('target').addEventListener('change', convert);
  document.querySelectorAll('input[name="style"]').forEach(r => r.addEventListener('change', convert));
  // English pronunciation dictionary: inlined in the offline file, a separate file on the web page
  function enReady(txt){ LAT.loadEN(txt); convert(); }
  if (window.EN_DICT_TXT) LAT.loadEN(window.EN_DICT_TXT);
  else fetch('en-dict.txt').then(r => r.ok ? r.text() : Promise.reject()).then(enReady)
    .catch(() => { status.textContent += tr('enFailed'); });
  const applyColors = () => out.classList.toggle('colors', $('colors').checked);
  $('colors').addEventListener('change', applyColors); applyColors();
  document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', () => render(lastRows)));
  $('clear').addEventListener('click', () => { inp.value = ''; convert(); inp.focus(); });
  $('copy').addEventListener('click', () => {
    const t = plain();
    if (!t){ status.textContent = tr('nothingToCopy'); return; }
    navigator.clipboard.writeText(t).then(() => { status.textContent = tr('copied'); })
      .catch(() => {
        const r = document.createRange(); r.selectNodeContents(out);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        status.textContent = tr('selected');
      });
  });
  // ---------- interface language ----------
  function applyUI(){
    document.documentElement.lang = BCP[uiLang] || uiLang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', tr(el.dataset.i18nAria)));
    for (const o of $('lang').options) o.textContent = o.value === 'auto' ? tr('auto') : o.value === 'off' ? tr('off') : langName(o.value, uiLang);
    for (const o of $('target').options) o.textContent = o.value === 'ru' ? tr('cyr') : langName(o.value, uiLang);
    for (const o of $('ui').options) o.textContent = LANG_FALLBACK[o.value];
    $('tones').setAttribute('aria-label', tr('toneLabel'));
    document.querySelectorAll('#tones .tl').forEach(el => { el.textContent = uiLang === 'ru' ? 'а' : 'a'; });
    dds.forEach(d => d.render());
  }
  $('ui').value = uiLang;
  $('target').value = uiLang;   // by default, transcribe for readers of the page language
  const dds = ['ui', 'lang', 'target'].map(id => makeDropdown($(id)));
  $('ui').addEventListener('change', () => {
    if ($('target').value === uiLang) $('target').value = $('ui').value;
    uiLang = $('ui').value;
    try { localStorage.setItem('ui-lang', uiLang); } catch (e) {}
    applyUI(); convert();
  });
  applyUI();

  // "sound" in the supported languages, cycling next to the logo
  const WORDS = [['звук','ru'],['音','zh'],['소리','ko'],['sound','en'],['Klang','de'],['son','fr'],['sonido','es'],['suono','it'],['som','pt'],['ääni','fi'],['tingull','sq'],['zvuk','sr']];
  let wi = 0; const wEl = $('word');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => {
    wEl.classList.add('out');
    setTimeout(() => { wi = (wi + 1) % WORDS.length; wEl.textContent = WORDS[wi][0]; wEl.lang = WORDS[wi][1]; wEl.classList.remove('out'); }, 350);
  }, 2200);

  // App install (PWA): Chrome / Edge / Android show a button, iPhone gets a hint
  let installEvt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('install').hidden = false; });
  $('install').addEventListener('click', async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('install').hidden = true; });
  addEventListener('appinstalled', () => { $('install').hidden = true; });
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone && 'serviceWorker' in navigator && location.protocol === 'https:') $('iosHint').hidden = false;
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !location.hostname.endsWith('claude.ai')) navigator.serviceWorker.register('sw.js').catch(() => {});

  inp.value = SAMPLE;
  convert();
})();
