/* 舊標櫃示範站。表單與 LINE 都停在這頁，不發出任何請求。 */
(function () {
  const GRADES = {
    N: "全新",
    S: "近新",
    A: "良好",
    B: "有痕跡",
    C: "明顯瑕疵"
  };
  const GRADE_RANK = { N: 0, S: 1, A: 2, B: 3, C: 4 };
  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "F", "42", "46"];
  const PRICE_BANDS = {
    "": function () { return true; },
    "lt1": function (p) { return p.price < 1000; },
    "1to25": function (p) { return p.price >= 1000 && p.price < 2500; },
    "25to40": function (p) { return p.price >= 2500 && p.price < 4000; },
    "gt4": function (p) { return p.price >= 4000; }
  };

  const views = {
    home: document.getElementById("view-home"),
    product: document.getElementById("view-product"),
    auth: document.getElementById("view-auth"),
    consign: document.getElementById("view-consign"),
    order: document.getElementById("view-order")
  };
  const grid = document.getElementById("grid");
  const countEl = document.getElementById("count");
  const productEl = document.getElementById("product");
  const header = document.querySelector("header.nav");
  const navToggle = document.querySelector(".nav-toggle");
  const toastEl = document.getElementById("toast");
  let toastTimer = 0;
  let listScroll = 0;
  let currentView = "home";

  const filters = {
    brand: document.getElementById("f-brand"),
    cat: document.getElementById("f-cat"),
    size: document.getElementById("f-size"),
    grade: document.getElementById("f-grade"),
    price: document.getElementById("f-price"),
    sort: document.getElementById("f-sort")
  };

  function ntd(n) {
    return "NT$" + n.toLocaleString("zh-Hant-TW");
  }

  function fillSelect(select, values, allLabel) {
    const current = select.value;
    select.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = allLabel;
    select.appendChild(all);
    values.forEach(function (v) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
    if (values.indexOf(current) !== -1) select.value = current;
  }

  function initFilters() {
    const brands = Array.from(new Set(PRODUCTS.map(function (p) { return p.brand; })));
    brands.sort(function (a, b) {
      if (a === "未標示") return 1;
      if (b === "未標示") return -1;
      return a.localeCompare(b, "zh-Hant");
    });
    fillSelect(filters.brand, brands, "全部品牌");
    const sizes = SIZE_ORDER.filter(function (s) {
      return PRODUCTS.some(function (p) { return p.size === s; });
    });
    fillSelect(filters.size, sizes, "全部尺寸");
    Object.keys(filters).forEach(function (key) {
      filters[key].addEventListener("change", renderGrid);
    });
    document.getElementById("reset").addEventListener("click", function () {
      Object.keys(filters).forEach(function (key) { filters[key].value = ""; });
      filters.sort.value = "shelf";
      renderGrid();
    });
  }

  function filtered() {
    const list = PRODUCTS.filter(function (p) {
      if (filters.brand.value && p.brand !== filters.brand.value) return false;
      if (filters.cat.value && p.cat !== filters.cat.value) return false;
      if (filters.size.value && p.size !== filters.size.value) return false;
      if (filters.grade.value && p.grade !== filters.grade.value) return false;
      if (!PRICE_BANDS[filters.price.value](p)) return false;
      return true;
    });
    const sort = filters.sort.value;
    list.sort(function (a, b) {
      if (sort === "price-asc") return a.price - b.price || a.id.localeCompare(b.id);
      if (sort === "price-desc") return b.price - a.price || a.id.localeCompare(b.id);
      if (sort === "grade-best") return GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || a.id.localeCompare(b.id);
      if (sort === "grade-worn") return GRADE_RANK[b.grade] - GRADE_RANK[a.grade] || a.id.localeCompare(b.id);
      return a.id.localeCompare(b.id);
    });
    return list;
  }

  function renderGrid() {
    const list = filtered();
    const sold = list.filter(function (p) { return p.sold; }).length;
    countEl.textContent = "顯示 " + list.length + " 件（共 " + PRODUCTS.length + " 件）" + (sold ? "，其中 " + sold + " 件已售出" : "");
    grid.replaceChildren();
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "沒有符合的商品。清掉篩選就可以看到全部。";
      grid.appendChild(p);
      return;
    }
    list.forEach(function (item, index) {
      const a = document.createElement("a");
      a.className = "card" + (item.sold ? " is-sold" : "");
      a.href = "#/p/" + item.id;
      const photo = document.createElement("div");
      photo.className = "photo";
      const img = document.createElement("img");
      img.src = "img/thumbs/" + item.id + ".jpg";
      img.alt = item.alts[0];
      img.decoding = "async";
      if (index < 4) img.fetchPriority = "high";
      else img.loading = "lazy";
      photo.appendChild(img);
      if (item.sold) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "已售出";
        photo.appendChild(badge);
      }
      const body = document.createElement("div");
      body.className = "card-body";
      const brand = document.createElement("p");
      brand.className = "brand-name";
      brand.textContent = item.brand;
      const h3 = document.createElement("h3");
      h3.textContent = item.name;
      const meta = document.createElement("p");
      meta.className = "meta";
      const size = document.createElement("span");
      size.textContent = "尺寸 " + item.size;
      const grade = document.createElement("span");
      grade.innerHTML = '<b class="g g-' + item.grade + '">' + item.grade + "</b>" + GRADES[item.grade];
      meta.append(size, grade);
      const price = document.createElement("p");
      price.className = "price";
      price.textContent = ntd(item.price);
      body.append(brand, h3, meta, price);
      a.append(photo, body);
      grid.appendChild(a);
    });
  }

  function shotsFor(item) {
    return [0, 1, 2].map(function (i) {
      const src = i === 0 ? "img/" + item.id + ".jpg" : "img/d/" + item.id + String.fromCharCode(96 + i) + ".jpg";
      return { src: src, alt: item.alts[i] || item.name };
    });
  }

  function renderProduct(id) {
    const item = PRODUCTS.find(function (p) { return p.id === id; });
    productEl.replaceChildren();
    if (!item) {
      const p = document.createElement("p");
      p.textContent = "找不到這件商品。";
      const a = document.createElement("a");
      a.href = "#/";
      a.textContent = "回商品列表";
      productEl.append(p, a);
      document.title = "找不到商品｜舊標櫃（虛構示範站）";
      return;
    }
    document.title = item.name + "｜舊標櫃（虛構示範站）";
    const shots = shotsFor(item);
    const gallery = document.createElement("div");
    const stage = document.createElement("div");
    stage.className = "stage";
    const main = document.createElement("img");
    main.src = shots[0].src;
    main.alt = shots[0].alt;
    main.id = "stage-img";
    stage.appendChild(main);
    const thumbs = document.createElement("div");
    thumbs.className = "thumbs";
    shots.forEach(function (shot, i) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-current", i === 0 ? "true" : "false");
      b.setAttribute("aria-label", "看圖 " + (i + 1) + "：" + shot.alt);
      const img = document.createElement("img");
      img.src = i === 0 ? "img/thumbs/" + item.id + ".jpg" : shot.src;
      img.alt = "";
      img.decoding = "async";
      if (i > 0) img.loading = "lazy";
      b.appendChild(img);
      b.addEventListener("click", function () {
        main.src = shot.src;
        main.alt = shot.alt;
        thumbs.querySelectorAll("button").forEach(function (btn) {
          btn.setAttribute("aria-current", btn === b ? "true" : "false");
        });
      });
      thumbs.appendChild(b);
    });
    const note = document.createElement("p");
    note.className = "shot-note";
    note.textContent = "細節圖是同一張照片裁出來的，不是另外拍攝的角度。";
    gallery.append(stage, thumbs, note);

    const info = document.createElement("div");
    const kicker = document.createElement("p");
    kicker.className = "kicker";
    kicker.textContent = item.cat + " · " + item.brand;
    const h1 = document.createElement("h1");
    h1.textContent = item.name;
    if (item.sold) {
      const badge = document.createElement("p");
      badge.className = "badge";
      badge.style.position = "static";
      badge.style.display = "inline-block";
      badge.textContent = "已售出";
      info.appendChild(badge);
    }
    const price = document.createElement("p");
    price.className = "price";
    price.innerHTML = ntd(item.price) + '<small>示範價格 · 虛構</small>';
    const kv = document.createElement("dl");
    kv.className = "kv";
    [
      ["品牌", item.brand === "未標示" ? "未標示（照片無法確認）" : item.brand],
      ["分類", item.cat],
      ["尺寸", item.size + "（示意）"],
      ["成色", item.grade + " " + GRADES[item.grade]],
      ["版型", item.fit]
    ].forEach(function (row) {
      const dt = document.createElement("dt");
      dt.textContent = row[0];
      const dd = document.createElement("dd");
      dd.textContent = row[1];
      dd.style.margin = "0";
      kv.append(dt, dd);
    });
    const blurb = document.createElement("p");
    blurb.textContent = item.blurb;

    const cond = document.createElement("div");
    cond.className = "panel";
    cond.innerHTML = "<h2>成色說明</h2>";
    const condP = document.createElement("p");
    condP.style.margin = "0";
    condP.textContent = item.cond;
    cond.appendChild(condP);

    const measure = document.createElement("div");
    measure.className = "panel";
    const mh = document.createElement("h2");
    mh.textContent = "尺寸平量";
    const table = document.createElement("table");
    table.className = "measures";
    const caption = document.createElement("caption");
    caption.className = "fine";
    caption.style.captionSide = "bottom";
    caption.textContent = "單位公分。標示為示意：照片上看不到尺碼標，數字是為了示範版面編的，不是實量。";
    item.measure.forEach(function (row) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = row[0];
      const td = document.createElement("td");
      td.textContent = row[1] + "（示意）";
      tr.append(th, td);
      table.appendChild(tr);
    });
    table.appendChild(caption);
    measure.append(mh, table);

    const actions = document.createElement("div");
    actions.className = "cta";
    if (item.sold) {
      const span = document.createElement("span");
      span.className = "btn is-disabled";
      span.textContent = "已售出";
      actions.appendChild(span);
    } else {
      const threads = document.createElement("a");
      threads.href = "#";
      threads.className = "btn btn-threads";
      threads.setAttribute("data-demo", "threads");
      threads.textContent = "看 Threads 貼文";
      threads.addEventListener("click", function (e) { e.preventDefault(); });
      const line = document.createElement("a");
      line.href = "#";
      line.className = "btn btn-line";
      line.setAttribute("data-demo", "line");
      line.textContent = "傳 LINE 私訊";
      line.addEventListener("click", function (e) { e.preventDefault(); });
      actions.append(threads, line);
    }
    const back = document.createElement("a");
    back.href = "#/";
    back.className = "btn btn-ghost";
    back.textContent = "繼續看其他件";
    actions.appendChild(back);

    info.append(kicker, h1, price, kv, blurb, cond, measure, actions);
    productEl.append(gallery, info);
  }

  function show(name) {
    Object.keys(views).forEach(function (key) {
      views[key].hidden = key !== name;
    });
    document.querySelectorAll("nav a[data-nav]").forEach(function (a) {
      const on = a.getAttribute("data-nav") === name || (name === "product" && a.getAttribute("data-nav") === "home");
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (name !== "product") {
      document.title = "舊標櫃 OLD TAG｜二手潮牌選品（虛構示範站）";
    }
  }

  function route() {
    const raw = (location.hash || "#/").replace(/^#/, "");
    const parts = raw.split("/").filter(Boolean);
    const next = parts[0] === "p" ? "product"
      : parts[0] === "auth" ? "auth"
      : parts[0] === "consign" ? "consign"
      : parts[0] === "order" ? "order"
      : "home";
    if (currentView === "home" && next !== "home") listScroll = window.scrollY;
    currentView = next;
    header.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    show(next);
    if (next === "product") renderProduct(parts[1] || "");
    window.scrollTo(0, next === "home" ? listScroll : 0);
  }

  function toast(message) {
    toastEl.hidden = false;
    toastEl.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3200);
  }

  document.addEventListener("click", function (e) {
    const demo = e.target.closest("[data-demo]");
    if (demo) {
      e.preventDefault();
      const kind = demo.getAttribute("data-demo");
      toast(kind === "threads"
        ? "示範：不會送出（也不會開啟 Threads，沒有連到任何帳號）"
        : "示範：不會送出（也不會開啟 LINE，沒有連到任何帳號）");
      return;
    }
    const rack = e.target.closest("[data-rack]");
    if (rack) {
      e.preventDefault();
      const go = function () {
        const el = document.getElementById("rack");
        if (el) el.scrollIntoView();
      };
      if ((location.hash || "#/") !== "#/" && location.hash !== "#" && location.hash !== "") {
        location.hash = "#/";
        setTimeout(go, 30);
      } else {
        go();
      }
    }
  });

  navToggle.addEventListener("click", function () {
    const open = !header.classList.contains("is-open");
    header.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  document.getElementById("site-nav").addEventListener("click", function (e) {
    if (e.target.closest("a")) {
      header.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  const form = document.getElementById("consign-form");
  const result = document.getElementById("form-result");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    result.hidden = false;
    result.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = "示範：不會送出";
    const p = document.createElement("p");
    p.textContent = "欄位已在這台裝置上檢查過。沒有連線、沒有寄信，也沒有把內容送到任何地方。";
    result.append(strong, p);
    result.scrollIntoView({ block: "nearest" });
  });

  window.addEventListener("hashchange", route);
  initFilters();
  renderGrid();
  route();
})();
