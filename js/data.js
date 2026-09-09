/* =============================================================
   ChicoSol Elections Dashboard — RACE DATA
   =============================================================
   This is the only file you need to edit.

   QUICK REFERENCE
   ---------------
   live_election : false  -> cards show names only (before Election Day)
                   true   -> cards also show vote counts + the results bar
   last_updated  : shown under the map ONLY when live_election is true.
                   Type it exactly as you want readers to see it.
   contested     : false  -> district drawn muted, card says no race
                   true   -> district highlighted, card shows candidates
   votes         : raw numbers. The bar splits by each candidate's share
                   of all votes entered on that card. Ignored (and hidden)
                   while live_election is false.
   image         : path to the headshot. Drop files into images/ and
                   change "images/candidate.png" to the real filename.
   read_more     : the coverage link for that race. "#" until you have one.
   ============================================================= */

window.DASHBOARD_CONFIG = {

  live_election: false,
  last_updated: "Nov. 3, 2026, 8:00 p.m.",

  title: "Chico's 2026 city council & school board elections.",
  subtitle: "Hover or click on a district to see more info about the race. Read more button will link to relevant/recent coverage. School Board map needs more work, will be fixed soon. Elias S. Myers/ChicoSol. Last Updated: 12:16 AM Wed., Sept. 9., 2026.",

  layers: {
    council: { label: "City Council",  source: "City of Chico council district map, 2024" },
    school:  { label: "School Board",  source: "Chico Unified trustee areas, Res. 1570-22" }
  },

  races: {

    /* ---------------- CITY COUNCIL ---------------- */
    council: {
      d1: { title: "District 1", contested: false, read_more: "#", candidates: [] },

      d2: { title: "District 2", contested: true, read_more: "#",
        candidates: [
          { name: "Kasey Reynolds", role: "Incumbent",  image: "images/candidate.png", votes: 0 },
          { name: "Shelby Hebert",  role: "Challenger", image: "images/candidate.png", votes: 0 }
        ]},

      d3: { title: "District 3", contested: false, read_more: "#", candidates: [] },

      d4: { title: "District 4", contested: true, read_more: "#",
        candidates: [
          { name: "Addison Winslow", role: "Incumbent",  image: "images/candidate.png", votes: 0 },
          { name: "Tracy Vincent",   role: "Challenger", image: "images/candidate.png", votes: 0 }
        ]},

      d5: { title: "District 5", contested: false, read_more: "#", candidates: [] },

      d6: { title: "District 6", contested: true, read_more: "#",
        candidates: [
          { name: "Tom van Overbeek",   role: "Incumbent",  image: "images/candidate.png", votes: 0 },
          { name: "Megan Thomas Petty", role: "Challenger", image: "images/candidate.png", votes: 0 }
        ]},

      d7: { title: "District 7", contested: false, read_more: "#", candidates: [] }
    },

    /* ---------------- CUSD SCHOOL BOARD ----------------
       Blank cards, ready to fill. When a trustee-area race is set:
       1) flip contested to true
       2) add candidate objects (copy a council example above)      */
    school: {
      t1: { title: "Trustee Area 1", contested: false, read_more: "#", candidates: [] },
      t2: { title: "Trustee Area 2", contested: false, read_more: "#", candidates: [] },
      t3: { title: "Trustee Area 3", contested: false, read_more: "#", candidates: [] },
      t4: { title: "Trustee Area 4", contested: false, read_more: "#", candidates: [] },
      t5: { title: "Trustee Area 5", contested: false, read_more: "#", candidates: [] }
    }
  }
};