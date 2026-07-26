/* =========================================================
   IKS ŚĀSTRA — RULE PRECEDENCE CONFLICT DETECTION SYSTEM
   Vanilla JS application logic
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------
     CONSTANTS
  --------------------------------------------------- */
  const PRECEDENCE_ORDER = ["Emergency", "Exception", "Specific", "General", "Default"];
  const PRECEDENCE_RANK = { Emergency: 1, Exception: 2, Specific: 3, General: 4, Default: 5 };
  const PRECEDENCE_MAXIM = {
    Emergency: "Āpatkālika precedence — emergency provisions override all other rules to protect life, safety, or dharma.",
    Exception: "Apavāda precedence — an exception rule always defeats the general rule (utsarga) it qualifies.",
    Specific: "Viśeṣa precedence (viśeṣo vidhīyate) — a specific rule prevails over a general rule covering the same case.",
    General: "Sāmānya precedence — the general rule governs when no specific or exception rule intervenes.",
    Default: "Anuvāda precedence — the baseline/default rule applies only when nothing else is triggered."
  };
  const STORAGE_KEY = "iks_sastra_rules_v1";
  const META_KEY = "iks_sastra_meta_v1";

  /* ---------------------------------------------------
     STATE
  --------------------------------------------------- */
  let rules = [];
  let meta = { activities: [], conflictsFound: 0, conflictsResolved: 0, reportsGenerated: 0, conflictHistory: [] };
  let lastExplanation = null;
  let pendingHighlightId = null;

  /* ---------------------------------------------------
     SEED DATA (only used the very first time)
  --------------------------------------------------- */
  const SEED_RULES = [
    {
      name: "Postpone Ritual During Eclipse",
      description: "Rituals scheduled during a solar or lunar eclipse must be postponed to protect participants and preserve ritual sanctity.",
      condition: "IF eclipse_occurs = true",
      action: "THEN postpone_ritual = true",
      priority: "Emergency",
      category: "Kalpa",
      status: "Active"
    },
    {
      name: "Fasting Exception for Illness",
      description: "A person suffering from illness is exempted from the general Ekādaśī fasting rule.",
      condition: "IF day = Ekadashi AND person_ill = true",
      action: "THEN fasting_required = false",
      priority: "Exception",
      category: "Dharma Śāstra",
      status: "Active"
    },
    {
      name: "General Ekādaśī Fasting",
      description: "All practitioners are expected to observe fasting on Ekādaśī as a general dharmic obligation.",
      condition: "IF day = Ekadashi",
      action: "THEN fasting_required = true",
      priority: "General",
      category: "Dharma Śāstra",
      status: "Active"
    },
    {
      name: "Specific Muhūrta for Marriage",
      description: "Marriage ceremonies within the Rohiṇī nakṣatra window must use the specific auspicious muhūrta table.",
      condition: "IF ceremony_type = marriage AND nakshatra = Rohini",
      action: "THEN use_specific_muhurta = true",
      priority: "Specific",
      category: "Jyotiṣa",
      status: "Active"
    },
    {
      name: "Default Auspicious Timing",
      description: "When no specific nakṣatra rule applies, the default general muhūrta table is used for any ceremony.",
      condition: "IF ceremony_type = marriage",
      action: "THEN use_default_muhurta = true",
      priority: "Default",
      category: "Jyotiṣa",
      status: "Active"
    },
    {
      name: "Sandhi Rule for Vowel Coalescence",
      description: "General sandhi rule applied whenever two vowels meet across word boundaries.",
      condition: "IF word_boundary = true AND sound_type = vowel",
      action: "THEN apply_general_sandhi = true",
      priority: "General",
      category: "Vyākaraṇa",
      status: "Active"
    },
    {
      name: "Exception Sandhi for Pragṛhya Words",
      description: "Pragṛhya (protected) words are exempt from regular vowel sandhi.",
      condition: "IF word_boundary = true AND word_class = pragrhya",
      action: "THEN apply_general_sandhi = false",
      priority: "Exception",
      category: "Vyākaraṇa",
      status: "Active"
    },
    {
      name: "Emergency Āyurvedic Intervention",
      description: "In case of acute poisoning, emergency detoxification protocol overrides standard dosha-balancing treatment.",
      condition: "IF condition = acute_poisoning",
      action: "THEN apply_emergency_detox_protocol = true",
      priority: "Emergency",
      category: "Āyurveda",
      status: "Active"
    }
  ];

  /* ---------------------------------------------------
     PERSISTENCE
  --------------------------------------------------- */
  function loadState() {
    try {
      const storedRules = localStorage.getItem(STORAGE_KEY);
      const storedMeta = localStorage.getItem(META_KEY);
      if (storedRules) {
        rules = JSON.parse(storedRules);
      } else {
        rules = SEED_RULES.map((r, i) => ({ id: makeId(i), ...r, createdAt: Date.now() - (SEED_RULES.length - i) * 60000 }));
        saveRules();
      }
      if (storedMeta) {
        meta = JSON.parse(storedMeta);
      } else {
        meta = { activities: [], conflictsFound: 0, conflictsResolved: 0, reportsGenerated: 0, conflictHistory: [] };
        logActivity("System initialized with sample Śāstra rule base.");
      }
    } catch (e) {
      rules = SEED_RULES.map((r, i) => ({ id: makeId(i), ...r, createdAt: Date.now() }));
      meta = { activities: [], conflictsFound: 0, conflictsResolved: 0, reportsGenerated: 0, conflictHistory: [] };
    }
  }

  function saveRules() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rules)); } catch (e) { /* ignore quota errors */ }
  }
  function saveMeta() {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) { /* ignore quota errors */ }
  }

  function makeId(seed) {
    return "R" + String(1000 + (seed !== undefined ? seed : rules.length) + Math.floor(Math.random() * 90)).slice(-4);
  }
  function nextRuleId() {
    let n = rules.length + 1;
    let id;
    do { id = "R" + String(1000 + n).slice(-4); n++; } while (rules.some(r => r.id === id));
    return id;
  }

  /* ---------------------------------------------------
     ACTIVITY LOG
  --------------------------------------------------- */
  function logActivity(text) {
    meta.activities.unshift({ text, time: Date.now() });
    meta.activities = meta.activities.slice(0, 12);
    saveMeta();
  }

  function timeAgo(ts) {
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " min ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + " hr ago";
    const days = Math.floor(hrs / 24);
    return days + " day" + (days > 1 ? "s" : "") + " ago";
  }

  /* ---------------------------------------------------
     NAVIGATION
  --------------------------------------------------- */
  function showView(name) {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.dataset.view === name));
    document.querySelectorAll(".nav-link").forEach(l => l.classList.toggle("active", l.dataset.nav === name));
    document.getElementById("navLinks").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "reports") renderReports();
    if (name === "rule-manager") { renderRuleTable(pendingHighlightId); pendingHighlightId = null; }
    if (name === "conflict-detection") populateCompareSelects();
    if (name === "dashboard") renderDashboard();
    if (name === "add-rule") renderRecentlySaved(null);
    triggerReveal();
  }

  function initNav() {
    document.querySelectorAll("[data-nav]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        showView(el.dataset.nav);
      });
    });
    document.getElementById("navToggle").addEventListener("click", () => {
      document.getElementById("navLinks").classList.toggle("open");
    });
  }

  /* ---------------------------------------------------
     REVEAL ON SCROLL
  --------------------------------------------------- */
  let revealObserver;
  function triggerReveal() {
    const items = document.querySelectorAll(".view.active .reveal:not(.in-view)");
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
    }
    items.forEach(el => revealObserver.observe(el));
  }

  /* ---------------------------------------------------
     TOAST
  --------------------------------------------------- */
  let toastTimer;
  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  /* ---------------------------------------------------
     RULE FORM (ADD / EDIT)
  --------------------------------------------------- */
  function initRuleForm() {
    const form = document.getElementById("ruleForm");

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      // --- STEP 1: the actual save. This is the only part that determines
      // success/failure messaging. Nothing cosmetic can interfere with it. ---
      let savedRule = null;
      let isUpdate = false;
      try {
        const id = document.getElementById("ruleId").value;
        const data = {
          name: document.getElementById("ruleName").value.trim(),
          description: document.getElementById("ruleDescription").value.trim(),
          condition: document.getElementById("ruleCondition").value.trim(),
          action: document.getElementById("ruleAction").value.trim(),
          priority: document.getElementById("rulePriority").value,
          category: document.getElementById("ruleCategory").value,
          status: document.getElementById("ruleStatus").value
        };

        if (!data.name || !data.description || !data.condition || !data.action || !data.priority || !data.category) {
          showToast("Please complete all required fields.");
          return;
        }

        if (id) {
          const rule = rules.find(r => r.id === id);
          if (rule) {
            Object.assign(rule, data);
            savedRule = rule;
            isUpdate = true;
          }
        } else {
          savedRule = { id: nextRuleId(), ...data, createdAt: Date.now() };
          rules.push(savedRule);
        }

        saveRules();
      } catch (err) {
        console.error("Rule save error (data was NOT saved):", err);
        showToast("Something went wrong while saving — please try again.");
        return;
      }

      if (!savedRule) {
        showToast("Could not find that rule to update — it may have been deleted.");
        return;
      }

      // Save succeeded — confirm it immediately, before touching any UI.
      logActivity(isUpdate
        ? `Rule <strong>${escapeHtml(savedRule.name)}</strong> was updated.`
        : `New rule <strong>${escapeHtml(savedRule.name)}</strong> added (${savedRule.priority}).`);
      showToast(isUpdate ? "Rule updated successfully." : "Rule saved successfully.");

      // --- STEP 2: cosmetic follow-up UI refreshes. Each is independently
      // guarded so a failure here can NEVER be mistaken for a failed save —
      // the toast above has already told the truth. ---
      safe("resetForm", resetForm);
      safe("clearRuleManagerFilters", () => {
        document.getElementById("searchRules").value = "";
        document.getElementById("filterPriority").value = "";
        document.getElementById("filterCategory").value = "";
      });
      safe("renderDashboard", renderDashboard);
      safe("populateCompareSelects", populateCompareSelects);
      safe("renderRecentlySaved", () => renderRecentlySaved(savedRule.id));

      // Take the user straight to Rule Manager so they can see their
      // rule sitting there, saved — the clearest possible confirmation.
      pendingHighlightId = savedRule.id;
      safe("navigateToRuleManager", () => showView("rule-manager"));
    });

    document.getElementById("resetRuleBtn").addEventListener("click", () => {
      setTimeout(resetForm, 0);
    });
  }

  function renderRecentlySaved(highlightId) {
    const list = document.getElementById("recentlySavedList");
    const countLabel = document.getElementById("totalRuleCountLabel");
    if (!list) return;

    countLabel.textContent = rules.length ? `(${rules.length} total rule${rules.length === 1 ? "" : "s"} in system)` : "";

    const recent = [...rules].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
    list.innerHTML = recent.length
      ? recent.map(r => `
          <li class="${r.id === highlightId ? "just-saved" : ""}">
            <strong>${escapeHtml(r.name)}</strong>
            <span class="activity-time">${r.id} · <span class="badge badge-${r.priority}">${r.priority}</span> · ${escapeHtml(r.category)} · ${timeAgo(r.createdAt)}</span>
          </li>
        `).join("")
      : '<p class="empty-row">Nothing saved yet in this session — fill the form above and click Save Rule.</p>';
  }
  function resetForm() {
    document.getElementById("ruleForm").reset();
    document.getElementById("ruleId").value = "";
    document.getElementById("saveRuleBtn").textContent = "Save Rule";
  }

  function loadRuleIntoForm(id) {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    document.getElementById("ruleId").value = rule.id;
    document.getElementById("ruleName").value = rule.name;
    document.getElementById("ruleDescription").value = rule.description;
    document.getElementById("ruleCondition").value = rule.condition;
    document.getElementById("ruleAction").value = rule.action;
    document.getElementById("rulePriority").value = rule.priority;
    document.getElementById("ruleCategory").value = rule.category;
    document.getElementById("ruleStatus").value = rule.status;
    document.getElementById("saveRuleBtn").textContent = "Update Rule";
    showView("add-rule");
  }

  function deleteRule(id) {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    if (!confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return;
    rules = rules.filter(r => r.id !== id);
    saveRules();
    logActivity(`Rule <strong>${escapeHtml(rule.name)}</strong> was deleted.`);
    renderRuleTable();
    renderDashboard();
    showToast("Rule deleted.");
  }

  /* ---------------------------------------------------
     RULE MANAGER TABLE
  --------------------------------------------------- */
  function renderRuleTable(highlightId) {
    const tbody = document.getElementById("ruleTableBody");
    const empty = document.getElementById("ruleTableEmpty");
    const search = document.getElementById("searchRules").value.toLowerCase();
    const priorityFilter = document.getElementById("filterPriority").value;
    const categoryFilter = document.getElementById("filterCategory").value;

    const filtered = rules.filter(r => {
      const matchesSearch = !search || r.name.toLowerCase().includes(search) || r.condition.toLowerCase().includes(search);
      const matchesPriority = !priorityFilter || r.priority === priorityFilter;
      const matchesCategory = !categoryFilter || r.category === categoryFilter;
      return matchesSearch && matchesPriority && matchesCategory;
    });

    tbody.innerHTML = filtered.map(r => `
      <tr class="${r.id === highlightId ? "just-saved-row" : ""}">
        <td>${r.id}</td>
        <td><strong>${escapeHtml(r.name)}</strong></td>
        <td>${escapeHtml(r.condition)}</td>
        <td>${escapeHtml(r.action)}</td>
        <td><span class="badge badge-${r.priority}">${r.priority}</span></td>
        <td>${escapeHtml(r.category)}</td>
        <td><span class="badge badge-${r.status}">${r.status}</span></td>
        <td>
          <div class="row-ops">
            <button class="btn btn-sm btn-ghost" data-view-id="${r.id}">View</button>
            <button class="btn btn-sm btn-outline" data-edit-id="${r.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-delete-id="${r.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");

    empty.style.display = filtered.length ? "none" : "block";

    tbody.querySelectorAll("[data-edit-id]").forEach(btn => btn.addEventListener("click", () => loadRuleIntoForm(btn.dataset.editId)));
    tbody.querySelectorAll("[data-delete-id]").forEach(btn => btn.addEventListener("click", () => deleteRule(btn.dataset.deleteId)));
    tbody.querySelectorAll("[data-view-id]").forEach(btn => btn.addEventListener("click", () => {
      const rule = rules.find(r => r.id === btn.dataset.viewId);
      if (rule) alert(
        `${rule.name}\n\nCondition: ${rule.condition}\nAction: ${rule.action}\nPriority: ${rule.priority}\nCategory: ${rule.category}\nStatus: ${rule.status}\n\n${rule.description}`
      );
    }));
  }

  function initRuleManagerControls() {
    ["searchRules", "filterPriority", "filterCategory"].forEach(id => {
      document.getElementById(id).addEventListener("input", renderRuleTable);
      document.getElementById(id).addEventListener("change", renderRuleTable);
    });
  }

  /* ---------------------------------------------------
     CONFLICT DETECTION
  --------------------------------------------------- */
  function populateCompareSelects() {
    ["prefillA", "prefillB"].forEach(id => {
      const sel = document.getElementById(id);
      const current = sel.value;
      sel.innerHTML = '<option value="">Load from saved rule…</option>' +
        rules.map(r => `<option value="${r.id}">${r.id} — ${escapeHtml(r.name)} (${r.priority})</option>`).join("");
      if (rules.some(r => r.id === current)) sel.value = current;
    });
  }

  function fillRuleCard(letter, rule) {
    document.getElementById(`rule${letter}Name`).value = rule.name;
    document.getElementById(`rule${letter}Condition`).value = rule.condition;
    document.getElementById(`rule${letter}Action`).value = rule.action;
    document.getElementById(`rule${letter}Priority`).value = rule.priority;
    document.getElementById(`rule${letter}Category`).value = rule.category;
  }

  function clearCompareFields() {
    ["A", "B"].forEach(letter => {
      document.getElementById(`rule${letter}Name`).value = "";
      document.getElementById(`rule${letter}Condition`).value = "";
      document.getElementById(`rule${letter}Action`).value = "";
      document.getElementById(`rule${letter}Priority`).value = "";
      document.getElementById(`rule${letter}Category`).value = "";
    });
    document.getElementById("prefillA").value = "";
    document.getElementById("prefillB").value = "";
    document.getElementById("conflictResultArea").innerHTML = "";
  }

  function readRuleInput(letter) {
    return {
      id: "Rule " + letter,
      name: document.getElementById(`rule${letter}Name`).value.trim(),
      condition: document.getElementById(`rule${letter}Condition`).value.trim(),
      action: document.getElementById(`rule${letter}Action`).value.trim(),
      priority: document.getElementById(`rule${letter}Priority`).value,
      category: document.getElementById(`rule${letter}Category`).value || "Custom",
      status: "Active"
    };
  }

  /* ---- Parse a condition/action string like
     "IF day = Ekadashi AND person_ill = true" or
     "THEN fasting_required = false"
     into a list of { variable, value } clauses. ---- */
  function parseClauses(str) {
    if (!str) return [];
    const cleaned = str.replace(/^\s*(if|then)\s*/i, "").trim();
    if (!cleaned) return [];
    const parts = cleaned.split(/\s+(?:and|or)\s+|[,;]/i).map(s => s.trim()).filter(Boolean);
    return parts.map(p => {
      const idx = p.indexOf("=");
      if (idx === -1) {
        return { variable: p.toLowerCase().replace(/\s+/g, "_"), value: null, raw: p };
      }
      return {
        variable: p.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "_"),
        value: p.slice(idx + 1).trim().toLowerCase(),
        raw: p
      };
    });
  }

  /* STEP 1 — Are conditions overlapping?
     Overlap = the two rules share at least one condition variable,
     and every shared variable requires the same value (so both rules
     can genuinely fire on the same input). If a shared variable needs
     two different values, the rules are mutually exclusive (no overlap).
     If the rules mention no common variable at all, they govern
     unrelated situations (no overlap). */
  function checkConditionOverlap(condA, condB) {
    const mapA = new Map(condA.map(c => [c.variable, c.value]));
    const mapB = new Map(condB.map(c => [c.variable, c.value]));
    const sharedVars = [...mapA.keys()].filter(v => mapB.has(v));

    if (!sharedVars.length) {
      return { overlap: false, sharedVars: [], reason: "The two conditions don't reference any of the same variables." };
    }
    const mismatched = sharedVars.filter(v => mapA.get(v) !== mapB.get(v));
    if (mismatched.length) {
      return { overlap: false, sharedVars: [], reason: `Shared variable "${mismatched[0]}" requires different values in each rule, so the conditions are mutually exclusive.` };
    }
    return { overlap: true, sharedVars, reason: `Both rules trigger on the same condition: ${sharedVars.map(v => `${v} = ${mapA.get(v)}`).join(", ")}.` };
  }

  /* STEP 2 — Do the actions affect the same variable? */
  function checkSameActionVariable(actA, actB) {
    const mapA = new Map(actA.map(c => [c.variable, c.value]));
    const mapB = new Map(actB.map(c => [c.variable, c.value]));
    const sharedVars = [...mapA.keys()].filter(v => mapB.has(v));
    return { sharedVars, mapA, mapB };
  }

  /* STEP 3 — Are the action values contradictory? */
  function analyzePair(ruleA, ruleB) {
    const condA = parseClauses(ruleA.condition);
    const condB = parseClauses(ruleB.condition);
    const actA = parseClauses(ruleA.action);
    const actB = parseClauses(ruleB.action);

    const step1 = checkConditionOverlap(condA, condB);
    if (!step1.overlap) {
      return {
        conflictType: "No Conflict",
        severity: null,
        overlappingConditions: false,
        sameActionVariable: false,
        contradictingActions: false,
        detail: step1.reason
      };
    }

    const step2 = checkSameActionVariable(actA, actB);
    if (!step2.sharedVars.length) {
      return {
        conflictType: "No Conflict",
        severity: null,
        overlappingConditions: true,
        sameActionVariable: false,
        contradictingActions: false,
        detail: `Conditions overlap (${step1.reason}) but the two rules' actions affect different variables, so they can coexist safely.`
      };
    }

    const contradictoryVars = step2.sharedVars.filter(v => step2.mapA.get(v) !== step2.mapB.get(v));
    const rankGap = Math.abs(PRECEDENCE_RANK[ruleA.priority] - PRECEDENCE_RANK[ruleB.priority]);

    if (contradictoryVars.length) {
      const severity = rankGap <= 1 ? "High" : "Medium";
      return {
        conflictType: "Contradicting Actions on Overlapping Conditions",
        severity,
        overlappingConditions: true,
        sameActionVariable: true,
        contradictingActions: true,
        detail: `Both rules fire on the same condition, but demand different values for "${contradictoryVars[0]}" — this is a genuine conflict that must be resolved by precedence.`
      };
    }

    return {
      conflictType: "Redundant / Duplicate Rule",
      severity: "Low",
      overlappingConditions: true,
      sameActionVariable: true,
      contradictingActions: false,
      detail: "Both rules trigger on the same condition and prescribe the exact same action — this is a redundant/duplicate rule pair, not a conflict."
    };
  }

  function resolveWinner(candidateRules) {
    return candidateRules.reduce((best, r) => (PRECEDENCE_RANK[r.priority] < PRECEDENCE_RANK[best.priority] ? r : best));
  }

  function initConflictDetection() {
    document.getElementById("detectConflictBtn").addEventListener("click", runConflictDetection);
    document.getElementById("clearCompareBtn").addEventListener("click", clearCompareFields);

    document.getElementById("prefillA").addEventListener("change", (e) => {
      const rule = rules.find(r => r.id === e.target.value);
      if (rule) fillRuleCard("A", rule);
    });
    document.getElementById("prefillB").addEventListener("change", (e) => {
      const rule = rules.find(r => r.id === e.target.value);
      if (rule) fillRuleCard("B", rule);
    });
  }

  function runConflictDetection() {
    const ruleA = readRuleInput("A");
    const ruleB = readRuleInput("B");

    for (const [label, r] of [["Rule A", ruleA], ["Rule B", ruleB]]) {
      if (!r.name || !r.condition || !r.action || !r.priority) {
        showToast(`Please fill in Name, Condition, Action, and Priority for ${label}.`);
        return;
      }
    }

    const selected = [ruleA, ruleB];
    const result = analyzePair(ruleA, ruleB);

    const isConflict = result.conflictType === "Contradicting Actions on Overlapping Conditions";
    const isRedundant = result.conflictType === "Redundant / Duplicate Rule";

    let winner = null;
    if (isConflict) winner = resolveWinner(selected);

    meta.conflictsFound += isConflict ? 1 : 0;
    if (isConflict) meta.conflictsResolved += 1;

    meta.conflictHistory.push({
      time: Date.now(),
      ruleIds: selected.map(r => r.name || r.id),
      hasConflict: isConflict,
      severity: isConflict ? result.severity : null,
      winnerId: winner ? winner.id : null
    });
    meta.conflictHistory = meta.conflictHistory.slice(-40);

    let activityMsg;
    if (isConflict) {
      activityMsg = `Conflict detected between <strong>${escapeHtml(ruleA.name)}</strong> and <strong>${escapeHtml(ruleB.name)}</strong> — resolved in favor of <strong>${escapeHtml(winner.name)}</strong>.`;
    } else if (isRedundant) {
      activityMsg = `<strong>${escapeHtml(ruleA.name)}</strong> and <strong>${escapeHtml(ruleB.name)}</strong> flagged as redundant/duplicate rules.`;
    } else {
      activityMsg = `Comparison run on <strong>${escapeHtml(ruleA.name)}</strong> and <strong>${escapeHtml(ruleB.name)}</strong> — no conflict found.`;
    }
    logActivity(activityMsg);

    saveMeta();
    renderConflictResult(selected, result, isConflict, isRedundant, winner);
    renderDashboard();

    if (isConflict) {
      lastExplanation = buildExplanation(selected, result, winner);
      renderExplanation();
    }
  }

  function renderConflictResult(selected, result, isConflict, isRedundant, winner) {
    const area = document.getElementById("conflictResultArea");

    const foundLabel = isConflict ? "Yes" : (isRedundant ? "Redundant" : "No");
    const severityDisplay = isConflict ? result.severity : "—";

    const summaryHtml = `
      <div class="conflict-summary">
        <div class="conflict-pill reveal in-view">
          <h5>Conflict Found</h5>
          <strong>${foundLabel}</strong>
        </div>
        <div class="conflict-pill reveal in-view">
          <h5>Conflict Type</h5>
          <strong>${result.conflictType}</strong>
        </div>
        <div class="conflict-pill reveal in-view">
          <h5>Severity</h5>
          <strong class="severity-${isConflict ? result.severity : ""}">${severityDisplay}</strong>
        </div>
      </div>
      <p class="conflict-detail-note">${escapeHtml(result.detail)}</p>
    `;

    const cardsHtml = `
      <div class="compare-grid">
        ${selected.map(r => {
          const isWinner = winner && r.id === winner.id;
          const isRejected = isConflict && winner && r.id !== winner.id;
          return `
            <div class="compare-card ${isWinner ? "winner" : ""} ${isRejected ? "rejected" : ""}">
              <h4>${escapeHtml(r.name)}</h4>
              <div class="rule-meta">${r.id} · <span class="badge badge-${r.priority}">${r.priority}</span> · ${escapeHtml(r.category)}</div>
              <dl>
                <dt>Condition</dt><dd>${escapeHtml(r.condition)}</dd>
                <dt>Action</dt><dd>${escapeHtml(r.action)}</dd>
              </dl>
              ${isWinner ? '<span class="winner-tag">✓ Selected Rule</span>' : ""}
              ${isRejected ? '<span class="winner-tag" style="background:#F1F1F1;color:#8a8a8a;">Rejected</span>' : ""}
            </div>
          `;
        }).join("")}
      </div>
    `;

    const buttonsHtml = isConflict ? `
      <div class="form-actions">
        <button class="btn btn-primary" id="viewExplanationBtn">View Explanation</button>
      </div>
    ` : "";

    area.innerHTML = summaryHtml + cardsHtml + buttonsHtml;

    if (isConflict) {
      document.getElementById("viewExplanationBtn").addEventListener("click", () => showView("explain"));
    }

    triggerReveal();
  }

  /* ---------------------------------------------------
     EXPLAIN RESULT
  --------------------------------------------------- */
  function buildExplanation(selected, result, winner) {
    const rejected = selected.filter(r => r.id !== winner.id);
    return {
      time: Date.now(),
      selected,
      winner,
      rejected,
      conflictType: result.conflictType,
      severity: result.severity,
      detail: result.detail,
      maxim: PRECEDENCE_MAXIM[winner.priority]
    };
  }

  function renderExplanation() {
    const area = document.getElementById("explainArea");
    if (!lastExplanation) {
      area.innerHTML = `
        <div class="card explain-empty reveal in-view">
          <p>No decision has been explained yet. Run a <strong>Conflict Detection</strong> analysis first — its resolution will appear here automatically.</p>
          <button class="btn btn-primary" data-nav="conflict-detection">Go to Conflict Detection</button>
        </div>`;
      area.querySelector("[data-nav]").addEventListener("click", () => showView("conflict-detection"));
      return;
    }

    const ex = lastExplanation;
    const rejectedNames = ex.rejected.map(r => `${escapeHtml(r.name)} (${r.priority})`).join(", ");

    area.innerHTML = `
      <div class="card explain-card reveal in-view">
        <div class="explain-step" style="animation-delay:.05s">
          <span class="step-num">1</span>
          <div><h5>Detected Conflict</h5><p>${escapeHtml(ex.conflictType)} between ${ex.selected.map(r => r.id).join(", ")}, severity <strong class="severity-${ex.severity}">${ex.severity}</strong>.</p></div>
        </div>
        <div class="explain-step" style="animation-delay:.2s">
          <span class="step-num">2</span>
          <div><h5>Selected Rule</h5><p><strong>${escapeHtml(ex.winner.name)}</strong> (${ex.winner.id}) — precedence tier <strong>${ex.winner.priority}</strong>.</p></div>
        </div>
        <div class="explain-step" style="animation-delay:.35s">
          <span class="step-num">3</span>
          <div><h5>Rejected Rule(s)</h5><p>${rejectedNames}</p></div>
        </div>
        <div class="explain-step" style="animation-delay:.5s">
          <span class="step-num">4</span>
          <div><h5>Applied Śāstra Principle</h5><p>${ex.winner.priority} precedence</p></div>
        </div>
        <div class="explain-step" style="animation-delay:.65s">
          <span class="step-num">5</span>
          <div><h5>Reason</h5><p>${ex.maxim}</p></div>
        </div>
        <div class="explain-step" style="animation-delay:.8s">
          <span class="step-num">6</span>
          <div><h5>Decision Path</h5><p>Rules compared → overlapping condition scope identified → precedence tiers ranked (${PRECEDENCE_ORDER.join(" → ")}) → highest-ranking tier selected.</p></div>
        </div>
        <div class="final-resolution">
          <strong>Final Resolution:</strong> <strong>${ex.winner.id} — ${escapeHtml(ex.winner.name)}</strong> is applied. Action taken: <em>${escapeHtml(ex.winner.action)}</em>.
        </div>
      </div>
    `;
    triggerReveal();
  }

  /* ---------------------------------------------------
     DASHBOARD
  --------------------------------------------------- */
  function renderDashboard() {
    const total = rules.length;
    const active = rules.filter(r => r.status === "Active").length;

    document.getElementById("statTotalRules").textContent = total;
    document.getElementById("statActiveRules").textContent = active;
    document.getElementById("statConflicts").textContent = meta.conflictsFound;
    document.getElementById("statResolved").textContent = meta.conflictsResolved;
    document.getElementById("statReports").textContent = meta.reportsGenerated;

    document.getElementById("heroRuleCount").textContent = total;
    document.getElementById("heroConflictCount").textContent = meta.conflictsFound;

    const activityList = document.getElementById("activityList");
    activityList.innerHTML = meta.activities.length
      ? meta.activities.map(a => `<li>${a.text}<span class="activity-time">${timeAgo(a.time)}</span></li>`).join("")
      : '<li class="empty-row">No activity recorded yet. Add a rule to begin.</li>';

    const updateList = document.getElementById("ruleUpdateList");
    const recentRules = [...rules].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
    updateList.innerHTML = recentRules.length
      ? recentRules.map(r => `<li><strong>${escapeHtml(r.name)}</strong><span class="activity-time">${r.id} · ${r.priority} · ${timeAgo(r.createdAt)}</span></li>`).join("")
      : '<li class="empty-row">No rules created yet.</li>';
  }

  /* ---------------------------------------------------
     REPORTS
  --------------------------------------------------- */
  function renderReports() {
    document.getElementById("reportTotalRules").textContent = rules.length;
    document.getElementById("reportConflicts").textContent = meta.conflictsFound;
    document.getElementById("reportResolved").textContent = meta.conflictsResolved;
    document.getElementById("reportPending").textContent = Math.max(0, meta.conflictsFound - meta.conflictsResolved);

    // Conflict history chart (last 8 checks)
    const history = meta.conflictHistory.slice(-8);
    const historyEl = document.getElementById("conflictHistoryChart");
    if (!history.length) {
      historyEl.innerHTML = '<p class="empty-row">Run a conflict detection to populate this chart.</p>';
    } else {
      historyEl.innerHTML = history.map((h, i) => {
        const val = h.hasConflict ? ({ Low: 33, Medium: 66, High: 100 }[h.severity] || 50) : 8;
        return `
          <div class="bar-row">
            <span class="bar-label">Check ${i + 1}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${val}%"></span></span>
            <span class="bar-value">${h.hasConflict ? h.severity[0] : "–"}</span>
          </div>`;
      }).join("");
    }

    // Rule distribution by priority
    const distEl = document.getElementById("ruleDistributionChart");
    const counts = PRECEDENCE_ORDER.map(p => ({ p, n: rules.filter(r => r.priority === p).length }));
    const max = Math.max(1, ...counts.map(c => c.n));
    distEl.innerHTML = counts.map(c => `
      <div class="bar-row">
        <span class="bar-label">${c.p}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(c.n / max) * 100}%"></span></span>
        <span class="bar-value">${c.n}</span>
      </div>
    `).join("");

    setTimeout(() => {
      document.querySelectorAll(".bar-fill").forEach(el => { el.style.width = el.style.width; });
    }, 30);
  }

  function initReportExports() {
    document.getElementById("quickReportBtn").addEventListener("click", () => {
      meta.reportsGenerated += 1;
      logActivity("A new report was generated from the Dashboard.");
      saveMeta();
      renderDashboard();
      showView("reports");
    });

    document.getElementById("exportPdfBtn").addEventListener("click", () => {
      meta.reportsGenerated += 1;
      saveMeta();
      renderDashboard();
      window.print();
    });
    document.getElementById("printReportBtn").addEventListener("click", () => window.print());

    document.getElementById("exportCsvBtn").addEventListener("click", () => {
      const header = "Rule ID,Rule Name,Condition,Action,Priority,Category,Status\n";
      const rows = rules.map(r => [r.id, r.name, r.condition, r.action, r.priority, r.category, r.status]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([header + rows], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "iks_sastra_rules_report.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      meta.reportsGenerated += 1;
      logActivity("Rule base exported as CSV report.");
      saveMeta();
      renderDashboard();
    });
  }

  /* ---------------------------------------------------
     PRECEDENCE TIER HOVER SYNC (light interactivity)
  --------------------------------------------------- */
  function initPrecedenceHighlight() {
    document.querySelectorAll(".tier").forEach(tier => {
      tier.addEventListener("mouseenter", () => tier.classList.add("active-tier"));
      tier.addEventListener("mouseleave", () => tier.classList.remove("active-tier"));
    });
  }

  /* ---------------------------------------------------
     UTIL
  --------------------------------------------------- */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------------------------------------------------
     INIT
  --------------------------------------------------- */
  function safe(label, fn) {
    try { fn(); return true; } catch (err) { console.error(`Init step failed (${label}):`, err); return false; }
  }

  function showStartupBanner(message) {
    const banner = document.createElement("div");
    banner.setAttribute("style",
      "position:fixed;top:0;left:0;right:0;z-index:99999;background:#B91C1C;color:#fff;" +
      "padding:14px 20px;font-family:sans-serif;font-size:14px;text-align:center;" +
      "box-shadow:0 4px 14px rgba(0,0,0,.25);"
    );
    banner.textContent = message;
    document.body.insertBefore(banner, document.body.firstChild);
  }

  function init() {
    // Startup integrity check: if these core elements aren't found, the page
    // likely didn't load correctly (incomplete file, wrong file opened,
    // or a stale cached copy) — surface that immediately, visibly, instead
    // of failing silently.
    const criticalIds = ["ruleForm", "saveRuleBtn", "ruleName", "ruleTableBody", "navLinks"];
    const missing = criticalIds.filter(id => !document.getElementById(id));
    if (missing.length) {
      showStartupBanner(
        "⚠ This page did not load correctly (missing: " + missing.join(", ") +
        "). Please re-download the file fresh and make sure it opens completely " +
        "— a partial/cached copy will not work."
      );
      console.error("Startup integrity check failed. Missing elements:", missing);
      return; // don't attempt further init against a broken page
    }

    const results = {};
    results.loadState = safe("loadState", loadState);
    results.initNav = safe("initNav", initNav);
    results.initRuleForm = safe("initRuleForm", initRuleForm);
    results.initRuleManagerControls = safe("initRuleManagerControls", initRuleManagerControls);
    results.initConflictDetection = safe("initConflictDetection", initConflictDetection);
    results.initReportExports = safe("initReportExports", initReportExports);
    results.initPrecedenceHighlight = safe("initPrecedenceHighlight", initPrecedenceHighlight);

    results.renderDashboard = safe("renderDashboard", renderDashboard);
    results.renderRuleTable = safe("renderRuleTable", renderRuleTable);
    results.populateCompareSelects = safe("populateCompareSelects", populateCompareSelects);
    results.renderExplanation = safe("renderExplanation", renderExplanation);
    results.renderRecentlySaved = safe("renderRecentlySaved", () => renderRecentlySaved(null));

    safe("showView", () => showView("home"));

    // If the single most important step (wiring the Save Rule button) failed,
    // make that unmissable rather than a console-only error.
    if (!results.initRuleForm) {
      showStartupBanner("⚠ The Add Rule form failed to initialize — the Save button will not work. Open your browser console (F12) and share the red error message so this can be fixed precisely.");
    }

    window.addEventListener("scroll", () => {
      const nav = document.getElementById("navbar");
      nav.style.boxShadow = window.scrollY > 10 ? "var(--shadow-sm)" : "none";
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
