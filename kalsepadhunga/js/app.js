/* ============================================================
    DERAGLE — STUDY / PYQ FINDER
============================================================ */


/* ------------------------------------------------------------
    API CONFIGURATION
------------------------------------------------------------ */

const API_BASE = "https://deragle.onrender.com";

const PYQ_ENDPOINT = `${API_BASE}/study/pyqs`;


/* ------------------------------------------------------------
    DOM ELEMENTS
------------------------------------------------------------ */

const pyqForm = document.getElementById("pyqForm");

const classFilter = document.getElementById("classFilter");
const subjectFilter = document.getElementById("subjectFilter");
const yearFilter = document.getElementById("yearFilter");

const searchButton = document.getElementById("searchButton");
const searchButtonText = document.querySelector(".search-button-text");

const resultsContainer = document.getElementById("resultsContainer");
const resultsCount = document.getElementById("resultsCount");
const resultsSubtitle = document.getElementById("resultsSubtitle");


/* ------------------------------------------------------------
    SUBJECTS OPTIONS
------------------------------------------------------------ */

async function populateSubjects() {

    while (subjectFilter.firstChild) {
        subjectFilter.removeChild(subjectFilter.firstChild);
    }

    const className = classFilter.value;

    const response = await fetch(
        `${API_BASE}/study/pyqs/sublist?class=${className}`
    );

    if (!response.ok) {
        throw new Error(`Subject list request failed: ${response.status}`);
    }

    const subjects = await response.json();

    // Keep the All option available.
    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = "All";
    subjectFilter.appendChild(allOption);

    subjects.forEach(subject => {

        const option = document.createElement("option");

        option.value = subject;
        option.textContent = subject;

        subjectFilter.appendChild(option);

    });

}


populateSubjects().catch(error => {
    console.error("Unable to load subjects:", error);
});


/* ------------------------------------------------------------
    YEAR OPTIONS
------------------------------------------------------------ */

function populateYears() {

    const currentYear = new Date().getFullYear();

    for (let year = currentYear; year >= 2008; year--) {

        const option = document.createElement("option");

        option.value = String(year);
        option.textContent = String(year);

        yearFilter.appendChild(option);

    }

}

populateYears();


/* ------------------------------------------------------------
    UI HELPERS
------------------------------------------------------------ */

function showLoading() {

    resultsContainer.innerHTML = `
        <div class="loading-indicator">
            <div class="loading-spinner"></div>
            Finding available papers...
        </div>
    `;

    resultsCount.textContent = "Loading...";
    resultsSubtitle.textContent = "Searching the database";

    searchButton.disabled = true;
    searchButtonText.textContent = "Searching...";

}


function showEmptyState(title, message, isError = false) {

    resultsContainer.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = `empty-state${isError ? " error" : ""}`;

    const icon = document.createElement("div");
    icon.className = "empty-icon";
    icon.textContent = isError ? "!" : "⌕";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const description = document.createElement("p");
    description.textContent = message;

    wrapper.append(icon, heading, description);

    resultsContainer.appendChild(wrapper);

    resultsCount.textContent = "0 papers";

}


function updateSearchButton() {

    searchButton.disabled = false;
    searchButtonText.textContent = "Find Papers";

}


/* ------------------------------------------------------------
    RESULT CARD
------------------------------------------------------------ */

function createPaperCard(paper) {

    const card = document.createElement("article");
    card.className = "paper-card";


    // Information section
    const info = document.createElement("div");
    info.className = "paper-info";

    const subject = document.createElement("h3");
    subject.className = "paper-subject";
    subject.textContent = paper.subject || "Question Paper";


    // Metadata
    const meta = document.createElement("div");
    meta.className = "paper-meta";

    const board = document.createElement("span");
    board.textContent = paper.board || "JKBOSE";

    const className = document.createElement("span");
    className.textContent = `Class ${paper.class}`;

    const year = document.createElement("span");
    year.className = "paper-year";
    year.textContent = paper.year;

    meta.append(board, className, year);
    info.append(subject, meta);


    // Original source page link
    const link = document.createElement("a");

    link.className = "view-paper-button";
    link.textContent = "View Paper →";

    link.href = paper.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";


    // Only allow valid HTTP(S) URLs
    try {

        const parsedURL = new URL(paper.url);

        if (!["http:", "https:"].includes(parsedURL.protocol)) {
            throw new Error("Invalid URL");
        }

        link.href = parsedURL.href;

    } catch {

        link.removeAttribute("href");
        link.removeAttribute("target");
        link.textContent = "Link unavailable";
        link.style.opacity = "0.6";
        link.style.pointerEvents = "none";

    }


    card.append(info, link);

    return card;

}


/* ------------------------------------------------------------
    DISPLAY RESULTS
------------------------------------------------------------ */

function displayResults(papers) {

    resultsContainer.innerHTML = "";

    if (!Array.isArray(papers) || papers.length === 0) {

        showEmptyState(
            "No papers found",
            "We couldn't find papers matching these filters. Try another subject or year."
        );

        resultsSubtitle.textContent = "Try changing your search filters.";

        return;
    }


    // Sort newest year first
    papers.sort((a, b) => Number(b.year) - Number(a.year));


    const fragment = document.createDocumentFragment();

    papers.forEach(paper => {

        const card = createPaperCard(paper);

        fragment.appendChild(card);

    });

    resultsContainer.appendChild(fragment);


    resultsCount.textContent =
        `${papers.length} ${papers.length === 1 ? "paper" : "papers"}`;

    resultsSubtitle.textContent =
        "Question papers matching your search.";

}


/* ------------------------------------------------------------
    SEARCH PAPERS
------------------------------------------------------------ */

async function searchPapers(event) {

    event.preventDefault();

    const selectedClass = classFilter.value;
    const selectedSubject = subjectFilter.value.trim().toUpperCase();
    const selectedYear = yearFilter.value;


    showLoading();


    try {

        const params = new URLSearchParams({

            class: selectedClass,
            subject: selectedSubject

        });


        // If All is selected, remove subject parameter.
        if (selectedSubject === "ALL") {
            params.delete("subject");
        }


        if (selectedYear) {
            params.set("year", selectedYear);
        }


        const response = await fetch(
            `${PYQ_ENDPOINT}?${params.toString()}`
        );


        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }


        const data = await response.json();


        // Supports either a direct array or common wrapped responses.
        const papers = Array.isArray(data)
            ? data
            : Array.isArray(data.results)
                ? data.results
                : Array.isArray(data.data)
                    ? data.data
                    : [];


        displayResults(papers);

    } catch (error) {

        console.error("PYQ search error:", error);

        showEmptyState(
            "Unable to load papers",
            "Something went wrong while connecting to Deragle. Please try again.",
            true
        );

        resultsSubtitle.textContent = "Connection problem";

    } finally {

        updateSearchButton();

    }

}


/* ------------------------------------------------------------
    EVENTS
------------------------------------------------------------ */

pyqForm.addEventListener("submit", searchPapers);
